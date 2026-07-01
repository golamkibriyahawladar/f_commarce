import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabase();

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.company_id) {
    return { error: 'User profile not found or not associated with a company.', status: 403 };
  }

  return { user, companyId: profile.company_id, supabase };
}

export async function GET(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.supabase || !auth.companyId) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, supabase } = auth;

    const { data: company, error } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: company?.settings || {} });
  } catch (error: any) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.supabase || !auth.companyId) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, supabase } = auth;
    const body = await req.json();

    // Fetch existing settings first
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    const existingSettings = existingCompany?.settings || {};

    // Merge new settings with existing settings
    const updatedSettings = {
      ...existingSettings,
      ...body
    };

    const { error } = await supabase
      .from('companies')
      .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
      .eq('id', companyId);

    if (error) throw error;

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error('Error updating company settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
