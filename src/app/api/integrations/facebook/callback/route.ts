import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || 'facebook'; // 'facebook' or 'instagram'
  const errorParam = searchParams.get('error');

  const safeOrigin = origin.includes('localhost') || origin.includes('127.0.0.1')
    ? origin
    : origin.replace('http://', 'https://');

  if (errorParam) {
    // User cancelled or denied
    return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=no_code`);
  }

  try {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
    const appSecret = process.env.NEXT_PUBLIC_FACEBOOK_APP_SECRET || '';
    const redirectUri = `${safeOrigin}/api/integrations/facebook/callback`;

    // 1. Exchange the code for an access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('FB Token Error:', tokenData.error);
      return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent(tokenData.error.message || 'token_exchange_failed')}`);
    }

    const userAccessToken = tokenData.access_token;

    // 2. Fetch user's pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      console.error('FB Pages Error:', pagesData.error);
      return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent(pagesData.error.message || 'pages_fetch_failed')}`);
    }

    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent('No Facebook Pages found. Make sure you have at least one Facebook Page.')}`);
    }

    // 3. Store pages temporarily in a cookie/session or process them directly
    // We'll encode the pages data into a URL parameter and handle it on the client
    // For security, we'll save directly to Supabase using the cookie-stored user info
    // Since this is a server route, we need the user's companyId. We'll pass it via cookie.

    // For simplicity, encode pages info and redirect to client which will call the save API
    const pagesInfo = pages.map((p: any) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token
    }));

    // Encode as base64 to pass via URL safely
    const pagesPayload = Buffer.from(JSON.stringify(pagesInfo)).toString('base64');

    return NextResponse.redirect(
      `${safeOrigin}/dashboard/integrations?fb_pages=${encodeURIComponent(pagesPayload)}&fb_type=${state}`
    );

  } catch (err: any) {
    console.error('FB Callback Error:', err);
    return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent(err.message || 'unknown_error')}`);
  }
}
