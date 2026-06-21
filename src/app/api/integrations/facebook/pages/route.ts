import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client (needs service role key to bypass RLS for server-side operations if needed)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
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

        // Upsert into Supabase integrations table
        const { data: integration, error } = await supabase
          .from('integrations')
          .upsert({
            company_id: companyId,
            platform: 'facebook',
            page_id: page.id,
            page_name: page.name,
            access_token: page.access_token, // Store the page access token
            status: 'active'
          }, {
            onConflict: 'page_id' // Assuming page_id is unique
          })
          .select()
          .single();

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
