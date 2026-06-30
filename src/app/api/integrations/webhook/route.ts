import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) return NextResponse.json({ error: 'No company found' }, { status: 400 });

    const { webhook_url, webhook_secret } = await req.json();

    // Upsert integration
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('provider', 'webhook')
      .single();

    if (existing) {
      await supabase
        .from('integrations')
        .update({ webhook_url, webhook_secret, status: webhook_url ? 'active' : 'inactive' })
        .eq('id', existing.id);
    } else if (webhook_url) {
      await supabase.from('integrations').insert({
        company_id: profile.company_id,
        provider: 'webhook',
        name: 'Outgoing Webhook',
        webhook_url,
        webhook_secret,
        status: 'active'
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) return NextResponse.json({ error: 'No company found' }, { status: 400 });

    const { data } = await supabase
      .from('integrations')
      .select('webhook_url, webhook_secret')
      .eq('company_id', profile.company_id)
      .eq('provider', 'webhook')
      .single();

    return NextResponse.json({ webhook: data || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
