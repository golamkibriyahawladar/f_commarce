import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const { accessToken, userId, companyId, pagesFromOAuth } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let pages: Array<{ id: string; name: string; access_token: string }> = [];

    // If pages were pre-fetched via OAuth callback, use them directly
    if (pagesFromOAuth && Array.isArray(pagesFromOAuth) && pagesFromOAuth.length > 0) {
      pages = pagesFromOAuth;
    } else if (accessToken) {
      // Fallback: Fetch user's pages from Facebook Graph API
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
      );
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to fetch Facebook pages');
      }

      const data = await res.json();
      pages = data.data || [];
    } else {
      return NextResponse.json({ error: 'Missing access token or pages data' }, { status: 400 });
    }

    // 2. Automatically subscribe the app to webhooks for all returned pages
    // and save them to the integrations table
    const savedIntegrations = [];
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

        // Check if this integration already exists
        const { data: existingInt } = await supabase
          .from('integrations')
          .select('id')
          .eq('company_id', companyId)
          .eq('provider', 'facebook')
          .eq('credentials->>page_id', page.id)
          .maybeSingle();

        let resDb;
        if (existingInt) {
          resDb = await supabase
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
            .eq('id', existingInt.id)
            .select()
            .single();
        } else {
          resDb = await supabase
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
            })
            .select()
            .single();
        }

        const { data: integration, error } = resDb;

        if (error) {
          console.error(`Failed to save integration for page ${page.name}:`, error);
          errors.push(`${page.name}: ${error.message}`);
        } else {
          savedIntegrations.push(integration);
        }
      } catch (err: any) {
        console.error(`Error processing page ${page.id}:`, err);
        errors.push(`${page.id}: ${err.message || err}`);
      }
    }

    if (pages.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Facebook Pages found. Make sure you have created at least one Facebook Page on your profile and selected it during the login popup.'
      }, { status: 200 }); // Keep status 200 so the frontend alert handles it nicely
    }

    if (savedIntegrations.length === 0 && errors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database Error: ' + errors.join('; ')
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true, 
      pagesFound: pages.length,
      pagesSaved: savedIntegrations.length,
      data: savedIntegrations 
    });

  } catch (error: any) {
    console.error('FB Pages API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
