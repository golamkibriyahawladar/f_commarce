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
  const stateParam = searchParams.get('state') || '';
  const errorParam = searchParams.get('error');

  const safeOrigin = origin.includes('localhost') || origin.includes('127.0.0.1')
    ? origin
    : origin.replace('http://', 'https://');

  if (errorParam) {
    return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=no_code`);
  }

  // Decode state to get type, companyId, userId
  let type = 'facebook';
  let companyId = '';
  let userId = '';
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
    type = decoded.type || 'facebook';
    companyId = decoded.companyId || '';
    userId = decoded.userId || '';
  } catch {
    return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=invalid_state`);
  }

  if (!companyId) {
    return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=missing_company_id`);
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
      return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent('No Facebook Pages found.')}`);
    }

    // 3. Save pages directly to the database (no URL encoding needed!)
    const supabase = getSupabase();
    let savedCount = 0;
    const errors: string[] = [];

    for (const page of pages) {
      try {
        // Subscribe to webhooks
        const subRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscribed_fields: 'messages,messaging_postbacks,feed,leadgen',
            access_token: page.access_token,
          }),
        });

        if (!subRes.ok) {
          const subErr = await subRes.json();
          console.warn(`Webhook subscription warning for page ${page.name}:`, subErr);
        }

        // Check if integration already exists
        const { data: existingInt } = await supabase
          .from('integrations')
          .select('id')
          .eq('company_id', companyId)
          .eq('provider', 'facebook')
          .eq('credentials->>page_id', page.id)
          .maybeSingle();

        if (existingInt) {
          // Update existing
          const { error } = await supabase
            .from('integrations')
            .update({
              credentials: {
                page_id: page.id,
                page_name: page.name,
                access_token: page.access_token
              },
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingInt.id);

          if (error) {
            errors.push(`${page.name}: ${error.message}`);
          } else {
            savedCount++;
          }
        } else {
          // Insert new
          const { error } = await supabase
            .from('integrations')
            .insert({
              company_id: companyId,
              provider: 'facebook',
              type: 'social',
              credentials: {
                page_id: page.id,
                page_name: page.name,
                access_token: page.access_token
              },
              status: 'active'
            });

          if (error) {
            errors.push(`${page.name}: ${error.message}`);
          } else {
            savedCount++;
          }
        }
      } catch (err: any) {
        errors.push(`${page.id}: ${err.message || err}`);
      }
    }

    if (savedCount > 0) {
      return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_success=${savedCount}`);
    } else {
      return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent('Failed to save pages: ' + errors.join('; '))}`);
    }

  } catch (err: any) {
    console.error('FB Callback Error:', err);
    return NextResponse.redirect(`${safeOrigin}/dashboard/integrations?fb_error=${encodeURIComponent(err.message || 'unknown_error')}`);
  }
}
