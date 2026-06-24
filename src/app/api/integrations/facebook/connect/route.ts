import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const type = searchParams.get('type') || 'facebook';
  const companyId = searchParams.get('companyId') || '';
  const userId = searchParams.get('userId') || '';

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
  
  const safeOrigin = origin.includes('localhost') || origin.includes('127.0.0.1')
    ? origin
    : origin.replace('http://', 'https://');
  const redirectUri = `${safeOrigin}/api/integrations/facebook/callback`;

  let scope = 'pages_show_list,pages_messaging,pages_read_engagement,leads_retrieval';
  if (type === 'instagram') {
    scope += ',instagram_basic,instagram_manage_messages';
  }

  // Encode type, companyId, userId into state so callback can save directly to DB
  const state = Buffer.from(JSON.stringify({ type, companyId, userId })).toString('base64url');

  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;

  return NextResponse.redirect(fbAuthUrl);
}
