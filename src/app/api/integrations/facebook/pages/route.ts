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
    const { accessToken, userId, companyId } = await req.json();

    if (!accessToken || !userId || !companyId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch user's pages from Facebook Graph API
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
    );
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'Failed to fetch Facebook pages');
    }

    const data = await res.json();

    // 2. Automatically subscribe the app to webhooks for all returned pages
    // and save them to the integrations table
    const pages = data.data || [];
    const savedIntegrations = [];

    for (const page of pages) {
      try {
        // Subscribe to webhooks
        await fetch(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscribed_fields: 'messages,messaging_postbacks,feed,leadgen',
            access_token: page.access_token,
          }),
        });

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
        } else {
          savedIntegrations.push(integration);
        }
      } catch (err) {
        console.error(`Error processing page ${page.id}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      pagesFound: pages.length,
      pagesSaved: savedIntegrations.length,
      data: savedIntegrations 
    });

  } catch (error: any) {
    console.error('FB Pages API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
