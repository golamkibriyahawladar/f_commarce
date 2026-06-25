export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';

function getSupabaseService() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
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

export async function POST(req: Request) {
  try {
    const { action, apiKey, companyId, agentId, indexName, namespace } = await req.json();

    if (!action || !companyId) {
      return NextResponse.json({ error: 'Missing required parameters: action and companyId' }, { status: 400 });
    }

    const supabase = getSupabaseService();
    let resolvedKey = '';

    // If key is provided and not masked, use it
    if (apiKey && apiKey !== '••••••••' && apiKey.trim() !== '') {
      resolvedKey = apiKey.trim();
    } else {
      // 1. If agentId is provided, try loading agent's credentials
      if (agentId) {
        const { data: agent } = await supabase
          .from('integrations')
          .select('credentials')
          .eq('id', agentId)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (agent?.credentials?.pinecone_api_key) {
          resolvedKey = agent.credentials.pinecone_api_key;
        }
      }

      // 2. Fall back to system settings (if stored)
      if (!resolvedKey) {
        const globalSettings = await getGlobalSettings(supabase);
        resolvedKey = globalSettings.global_pinecone_key; // if any
      }
    }

    if (!resolvedKey) {
      return NextResponse.json({ error: 'Pinecone API Key is not configured. Please enter your key.' }, { status: 400 });
    }

    if (action === 'listIndexes') {
      try {
        const response = await fetch('https://api.pinecone.io/indexes', {
          headers: {
            'Api-Key': resolvedKey
          }
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('Pinecone API error response:', errText);
          return NextResponse.json({ error: 'Failed to authenticate or fetch indexes from Pinecone.' }, { status: response.status });
        }

        const data = await response.json();
        // Modern Pinecone returns indexes list as an array of index objects: [{ name: "index1", host: "...", ... }]
        // or sometimes an object with { indexes: [...] }
        const indexesList = Array.isArray(data) ? data : (data.indexes || []);
        const indexNames = indexesList.map((idx: any) => idx.name || idx);
        
        return NextResponse.json({ success: true, indexes: indexNames });
      } catch (err: any) {
        console.error('List indexes fetch exception:', err);
        return NextResponse.json({ error: 'Connection failed. Please check your Pinecone API Key.' }, { status: 500 });
      }
    } else if (action === 'clearNamespace') {
      if (!indexName) {
        return NextResponse.json({ error: 'Missing Pinecone Index Name' }, { status: 400 });
      }
      if (!namespace) {
        return NextResponse.json({ error: 'Missing Pinecone Namespace' }, { status: 400 });
      }

      try {
        const pc = new Pinecone({ apiKey: resolvedKey });
        const index = pc.Index(indexName);
        await index.namespace(namespace).deleteAll();

        return NextResponse.json({ success: true, message: `Successfully cleared all vectors in namespace "${namespace}"` });
      } catch (err: any) {
        console.error('Clear namespace exception:', err);
        return NextResponse.json({ error: err.message || 'Failed to clear namespace in Pinecone.' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported action: ' + action }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Pinecone endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
