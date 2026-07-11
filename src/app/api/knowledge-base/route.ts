export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUPER_ADMIN_EMAILS = [
  'dev@autozy.app',
  'golamkibriya1200@gmail.com',
  'golamkibriyahawladar@gmail.com',
  'admin@aichat.com'
];

function getSupabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

function getSupabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

// Custom simple text splitter to avoid LangChain dependency version issues
function splitTextIntoChunks(text: string, chunkSize = 800, chunkOverlap = 150): string[] {
  const chunks: string[] = [];
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  let i = 0;
  while (i < cleanedText.length) {
    const chunk = cleanedText.slice(i, i + chunkSize);
    chunks.push(chunk);
    i += chunkSize - chunkOverlap;
  }
  return chunks;
}

// Fetch global API settings
async function getGlobalSettings(supabase: any) {
  const { data } = await supabase
    .from('companies')
    .select('settings')
    .eq('slug', 'system-admin')
    .maybeSingle();
  return data?.settings || {};
}

// GET: List files in the knowledge base
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const knowledgeBaseId = searchParams.get('knowledgeBaseId');
    const companyId = searchParams.get('companyId');

    if (!knowledgeBaseId || !companyId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    
    // Verify session
    const supabaseAnon = getSupabaseAnon();
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = getSupabaseService();
    // Fetch profile
    const { data: profile } = await supabaseService.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check tenant boundary
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(profile.email);
    if (!isSuperAdmin && profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch files
    const { data: files, error } = await supabaseService
      .from('knowledge_base_files')
      .select('*')
      .eq('knowledge_base_id', knowledgeBaseId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, files: files || [] });
  } catch (error: any) {
    console.error('KB GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Upload and ingest file (RAG Ingestion)
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    
    // Verify session
    const supabaseAnon = getSupabaseAnon();
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = getSupabaseService();
    // Fetch profile
    const { data: profile } = await supabaseService.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse formData
    const formData = await req.formData();
    const companyId = formData.get('companyId') as string;
    const knowledgeBaseId = formData.get('knowledgeBaseId') as string;
    const file = formData.get('file') as File;

    if (!companyId || !knowledgeBaseId || !file) {
      return NextResponse.json({ error: 'Missing companyId, knowledgeBaseId, or file' }, { status: 400 });
    }

    // Check tenant boundary
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(profile.email);
    if (!isSuperAdmin && profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch Knowledge Base Configuration
    const { data: kb, error: kbErr } = await supabaseService
      .from('knowledge_bases')
      .select('*')
      .eq('id', knowledgeBaseId)
      .eq('company_id', companyId)
      .single();

    if (kbErr || !kb) {
      return NextResponse.json({ error: 'Knowledge Base not found' }, { status: 404 });
    }

    const embeddingProvider = kb.embedding_provider || 'openai';
    
    // Fetch Company Settings
    const { data: companyData } = await supabaseService
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .maybeSingle();
    const companySettings = companyData?.settings || {};
    
    const globalSettings = await getGlobalSettings(supabaseService);

    // Pinecone Credentials
    const pineconeApiKey = companySettings.global_pinecone_key || globalSettings.global_pinecone_key;
    const pineconeIndex = kb.pinecone_index || companySettings.global_pinecone_env || globalSettings.global_pinecone_env;
    const pineconeNamespace = kb.pinecone_namespace || kb.id;

    if (!pineconeApiKey || !pineconeIndex) {
      return NextResponse.json({ 
        error: 'Pinecone details are not configured. Please setup Pinecone API Key & Index.' 
      }, { status: 400 });
    }

    // Clear previous namespace data if overwrite is requested
    const clearNamespace = formData.get('clearNamespace') === 'true';
    if (clearNamespace) {
      try {
        console.log(`Clearing namespace "${pineconeNamespace}" as requested by overwrite option...`);
        const pc = new Pinecone({ apiKey: pineconeApiKey });
        const index = pc.Index(pineconeIndex);
        await index.namespace(pineconeNamespace).deleteAll();

        // Wipe local DB file records as well
        await supabaseService
          .from('knowledge_base_files')
          .delete()
          .eq('knowledge_base_id', knowledgeBaseId)
          .eq('company_id', companyId);
      } catch (pcErr: any) {
        console.error('Pinecone/DB purge exception during overwrite:', pcErr);
        // Continue anyway to avoid blocking upload if Pinecone is empty
      }
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = '';

    // Parse text based on file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension === 'pdf') {
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text || '';
    } else if (fileExtension === 'docx') {
      const mammoth = require('mammoth');
      const docData = await mammoth.extractRawText({ buffer });
      extractedText = docData.value || '';
    } else {
      // Treat as markdown/text
      extractedText = buffer.toString('utf8');
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Failed to extract text from file or file is empty.' }, { status: 400 });
    }

    // Split text into chunks
    const chunks = splitTextIntoChunks(extractedText, 800, 150);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Text content is too small to split.' }, { status: 400 });
    }

    // Create file record in postgres with status = 'processing'
    const { data: kbFile, error: kbFileErr } = await supabaseService
      .from('knowledge_base_files')
      .insert({
        company_id: companyId,
        knowledge_base_id: knowledgeBaseId,
        file_name: file.name,
        size_bytes: file.size,
        chunk_count: chunks.length,
        embedding_provider: embeddingProvider,
        status: 'processing'
      })
      .select()
      .single();

    if (kbFileErr || !kbFile) {
      throw new Error('Failed to create knowledge base file entry: ' + kbFileErr?.message);
    }

    // Generate Embeddings
    const vectors: Array<{ id: string; values: number[]; metadata: { text: string; file_name: string; company_id: string; file_id: string } }> = [];
    
    if (embeddingProvider === 'openai') {
      const openaiKey = companySettings.global_openai_key || globalSettings.global_openai_key;
      if (!openaiKey) {
        throw new Error('OpenAI key missing. Please configure a custom key or set a global fallback key.');
      }

      // Process in batches of 10 chunks to avoid limits
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: batch
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error('OpenAI Embeddings API Error: ' + (err.error?.message || response.statusText));
        }

        const data = await response.json();
        data.data.forEach((item: any, index: number) => {
          vectors.push({
            id: `${kbFile.id}_${i + index}`,
            values: item.embedding,
            metadata: {
              text: batch[index],
              file_name: file.name,
              company_id: companyId,
              file_id: kbFile.id
            }
          });
        });
      }
    } else if (embeddingProvider === 'gemini') {
      const geminiKey = companySettings.global_gemini_key || globalSettings.global_gemini_key || globalSettings.global_openai_key;
      if (!geminiKey) {
        throw new Error('Gemini API key missing. Please configure a custom key or set a global fallback key.');
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      
      // Call Google Gemini API to embed text chunks
      for (let i = 0; i < chunks.length; i++) {
        // @ts-ignore
        const result = await model.embedContent({
          content: { parts: [{ text: chunks[i] }] },
          outputDimensionality: 768
        });

        if (result.embedding?.values) {
          const rawValues = result.embedding.values;
          const finalValues = rawValues.length > 768 ? rawValues.slice(0, 768) : rawValues;
          vectors.push({
            id: `${kbFile.id}_${i}`,
            values: finalValues,
            metadata: {
              text: chunks[i],
              file_name: file.name,
              company_id: companyId,
              file_id: kbFile.id
            }
          });
        }
      }
    }

    if (vectors.length === 0) {
      throw new Error('No embeddings could be generated.');
    }

    // Initialize Pinecone dynamically using custom credentials
    const pc = new Pinecone({ apiKey: pineconeApiKey });
    const index = pc.Index(pineconeIndex);

    // Upsert vectors to Pinecone under custom Namespace
    // Pinecone handles batches up to 100 vectors
    const pcBatchSize = 50;
    for (let i = 0; i < vectors.length; i += pcBatchSize) {
      const pcBatch = vectors.slice(i, i + pcBatchSize);
      await index.namespace(pineconeNamespace).upsert({ records: pcBatch as any });
    }

    // Update DB file status to 'completed'
    await supabaseService
      .from('knowledge_base_files')
      .update({ status: 'completed' })
      .eq('id', kbFile.id);

    return NextResponse.json({
      success: true,
      message: `File '${file.name}' successfully parsed, chunked, and ingested into Pinecone under namespace '${pineconeNamespace}'.`,
      file: { ...kbFile, status: 'completed' }
    });

  } catch (error: any) {
    console.error('KB Ingestion Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove file from RAG (purges PostgreSQL and Pinecone)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const companyId = searchParams.get('companyId');
    const knowledgeBaseId = searchParams.get('knowledgeBaseId');

    if (!fileId || !companyId || !knowledgeBaseId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    
    // Verify session
    const supabaseAnon = getSupabaseAnon();
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseService = getSupabaseService();
    // Fetch profile
    const { data: profile } = await supabaseService.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check tenant boundary
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(profile.email);
    if (!isSuperAdmin && profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch file to get chunks count & name
    const { data: kbFile, error: fileErr } = await supabaseService
      .from('knowledge_base_files')
      .select('*')
      .eq('id', fileId)
      .eq('company_id', companyId)
      .single();

    if (fileErr || !kbFile) {
      return NextResponse.json({ error: 'File metadata not found' }, { status: 404 });
    }

    // 2. Fetch KB config to get Pinecone credentials
    const { data: kb, error: kbErr } = await supabaseService
      .from('knowledge_bases')
      .select('*')
      .eq('id', knowledgeBaseId)
      .eq('company_id', companyId)
      .single();

    if (kbErr || !kb) {
      return NextResponse.json({ error: 'Knowledge Base not found' }, { status: 404 });
    }

    // Fetch Company Settings
    const { data: companyData } = await supabaseService
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .maybeSingle();
    const companySettings = companyData?.settings || {};
    
    const globalSettings = await getGlobalSettings(supabaseService);

    const pineconeApiKey = companySettings.global_pinecone_key || globalSettings.global_pinecone_key;
    const pineconeIndex = kb.pinecone_index || companySettings.global_pinecone_env || globalSettings.global_pinecone_env;
    const pineconeNamespace = kb.pinecone_namespace || kb.id;

    // 3. Purge vectors from Pinecone if details exist
    if (pineconeApiKey && pineconeIndex) {
      try {
        const pc = new Pinecone({ apiKey: pineconeApiKey });
        const index = pc.Index(pineconeIndex);

        // Delete vectors matching this fileId. We name vector IDs as `fileId_chunkIndex`
        const vectorIdsToDelete: string[] = [];
        for (let i = 0; i < kbFile.chunk_count; i++) {
          vectorIdsToDelete.push(`${kbFile.id}_${i}`);
        }

        if (vectorIdsToDelete.length > 0) {
          await index.namespace(pineconeNamespace).deleteMany(vectorIdsToDelete);
        }
      } catch (pcErr) {
        console.error('Pinecone vector delete warning:', pcErr);
        // Continue to database deletion even if Pinecone delete fails, to prevent blocking
      }
    }

    // 4. Delete the database metadata record
    const { error: dbDeleteErr } = await supabaseService
      .from('knowledge_base_files')
      .delete()
      .eq('id', fileId);

    if (dbDeleteErr) throw dbDeleteErr;

    return NextResponse.json({
      success: true,
      message: `File '${kbFile.file_name}' and all associated RAG vectors purged successfully.`
    });

  } catch (error: any) {
    console.error('KB DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
