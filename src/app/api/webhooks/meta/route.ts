import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'aichat_suite_secure_token';

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  
  // 1. Find the integration to get the company_id
  const { data: integration } = await supabase
    .from('integrations')
    .select('company_id')
    .eq('page_id', pageId)
    .single();

  if (!integration) return;

  // 2. Find or create a conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('company_id', integration.company_id)
    .eq('customer_identifier', senderId)
    .single();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        company_id: integration.company_id,
        platform: 'facebook',
        customer_name: 'Facebook User', // Ideally fetch from graph API
        customer_identifier: senderId,
        status: 'open'
      })
      .select()
      .single();
    conversation = newConv;
  }

  if (conversation) {
    // 3. Save the message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_type: 'customer',
      content: text,
      metadata: { page_id: pageId, sender_id: senderId }
    });
  }
}

async function handleLeadGen(pageId: string, leadData: any) {
  console.log('Received lead gen event', leadData);
  // Extract Lead ID and fetch details using Graph API if needed
  // ... (Insert into leads table)
}
