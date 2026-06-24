import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const type = searchParams.get('type') || 'facebook'; // 'facebook' or 'instagram'

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
  
  // Build the redirect URI back to our callback handler
  const safeOrigin = origin.includes('localhost') || origin.includes('127.0.0.1')
    ? origin
    : origin.replace('http://', 'https://');
  const redirectUri = `${safeOrigin}/api/integrations/facebook/callback`;

  // Facebook permissions
  let scope = 'pages_show_list,pages_messaging,pages_read_engagement,leads_retrieval';
  if (type === 'instagram') {
    scope += ',instagram_basic,instagram_manage_messages';
  }

  // Build the Facebook OAuth authorization URL
  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${type}`;

  return NextResponse.redirect(fbAuthUrl);
}
