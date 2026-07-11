export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }
  const token = authHeader.split(' ')[1];
  
  const supabaseAnon = getSupabaseAnon();
  const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
  if (authErr || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const supabaseService = getSupabaseService();
  const { data: profile } = await supabaseService.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { user, profile, supabaseService };
}

// GET all knowledge bases for a company
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const auth = await verifyAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(auth.profile.email);
    if (!isSuperAdmin && auth.profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: kbs, error } = await auth.supabaseService!
      .from('knowledge_bases')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: kbs || [] });
  } catch (error: any) {
    console.error('KB GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a new knowledge base
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, name, embedding_provider, pinecone_index, pinecone_namespace } = body;

    if (!companyId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const auth = await verifyAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(auth.profile.email);
    if (!isSuperAdmin && auth.profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: newKb, error } = await auth.supabaseService!
      .from('knowledge_bases')
      .insert({
        company_id: companyId,
        name,
        embedding_provider: embedding_provider || 'openai',
        pinecone_index,
        pinecone_namespace: pinecone_namespace || name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: newKb });
  } catch (error: any) {
    console.error('KB POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a knowledge base
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');

    if (!id || !companyId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const auth = await verifyAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(auth.profile.email);
    if (!isSuperAdmin && auth.profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await auth.supabaseService!
      .from('knowledge_bases')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('KB DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
