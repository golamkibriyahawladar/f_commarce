import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'autozy_secure_token';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Webhook Verification (GET request from Meta)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// Receive Webhook Events (POST request from Meta)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object === 'page') {
      // Iterate over each entry
      for (const entry of body.entry) {
        const pageId = entry.id;

        // Iterate over each messaging event
        if (entry.messaging) {
          for (const webhook_event of entry.messaging) {
            const senderId = webhook_event.sender.id;
            const message = webhook_event.message;

            if (message && message.text) {
              // Handle incoming message
              await handleIncomingMessage(pageId, senderId, message.text);
            }
          }
        }
        
        // Handle changes (e.g. leadgen)
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen') {
              await handleLeadGen(pageId, change.value);
            }
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function handleIncomingMessage(pageId: string, senderId: string, text: string) {
  console.log(`Received message for page ${pageId} from ${senderId}: ${text}`);
  const supabase = getSupabase();
  
  // 1. Find the integration to get the company_id and integration_id
  const { data: integration, error: intErr } = await supabase
    .from('integrations')
    .select('id, company_id')
    .eq('credentials->>page_id', pageId)
    .single();

  if (intErr || !integration) {
    console.error('Integration not found for page:', pageId, intErr);
    return;
  }

  // 2. Find or create a customer
  let { data: customer, error: custFindErr } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', integration.company_id)
    .eq('meta_data->>facebook_psid', senderId)
    .single();

  if (!customer) {
    const { data: newCust, error: custErr } = await supabase
      .from('customers')
      .insert({
        company_id: integration.company_id,
        name: 'Facebook User',
        meta_data: { facebook_psid: senderId }
      })
      .select()
      .single();
    
    if (custErr) {
      console.error('Error creating customer:', custErr);
      return;
    }
    customer = newCust;
  }

  // 3. Find or create a conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('company_id', integration.company_id)
    .eq('platform_conversation_id', senderId)
    .single();

  if (!conversation) {
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        company_id: integration.company_id,
        integration_id: integration.id,
        customer_id: customer.id,
        platform_conversation_id: senderId,
        last_message: text,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        status: 'open'
      })
      .select()
      .single();
    
    if (convErr) {
      console.error('Error creating conversation:', convErr);
      return;
    }
    conversation = newConv;
  } else {
    // Update existing conversation
    await supabase
      .from('conversations')
      .update({
        last_message: text,
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1
      })
      .eq('id', conversation.id);
  }

  if (conversation) {
    // 4. Save the message
    const { error: msgErr } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      company_id: integration.company_id,
      sender_type: 'customer',
      message_type: 'text',
      content: text,
      metadata: { page_id: pageId, sender_id: senderId }
    });
    if (msgErr) {
      console.error('Error creating message:', msgErr);
    }
  }
}

async function handleLeadGen(pageId: string, leadData: any) {
  console.log('Received lead gen event', leadData);
  // Extract Lead ID and fetch details using Graph API if needed
  // ... (Insert into leads table)
}
