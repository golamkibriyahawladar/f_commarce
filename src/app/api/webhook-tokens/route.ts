import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Extracts and verifies the authenticated user from the Authorization header,
 * then resolves their company_id from the profiles table.
 */
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

// GET: List all tokens for the authenticated user's company
export async function GET(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { companyId, supabase } = auth;

    const { data: tokens, error } = await supabase
      .from('webhook_tokens')
      .select('id, name, token, scopes, is_active, last_used_at, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhook tokens:', error);
      throw error;
    }

    return NextResponse.json({ success: true, tokens: tokens || [] });
  } catch (error: any) {
    console.error('Webhook tokens GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Generate a new API token for the authenticated user's company
export async function POST(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { companyId, supabase } = auth;
    const body = await req.json().catch(() => ({}));
    const tokenName = body.name || 'Default Token';

    // Generate a secure, prefixed API token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const apiToken = `atk_${rawToken}`;

    const { data: newToken, error } = await supabase
      .from('webhook_tokens')
      .insert({
        company_id: companyId,
        token: apiToken,
        name: tokenName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook token:', error);
      throw error;
    }

    return NextResponse.json({ success: true, token: newToken });
  } catch (error: any) {
    console.error('Webhook tokens POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a specific token belonging to the authenticated user's company
export async function DELETE(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { companyId, supabase } = auth;
    const body = await req.json();
    const tokenId = body.token_id;

    if (!tokenId) {
      return NextResponse.json({ error: 'Missing token_id in request body.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('webhook_tokens')
      .delete()
      .eq('id', tokenId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Token not found or you do not have permission to delete it.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Token deleted successfully.' });
  } catch (error: any) {
    console.error('Webhook tokens DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
