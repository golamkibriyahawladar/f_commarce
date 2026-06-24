import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { triggerCompanyWebhooks } from '@/lib/webhookDispatcher';
import { triggerAiReplyIfNeeded } from '@/lib/aiAgentExecutor';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing integration ID' }, { status: 400 });
    }

    const body = await req.json();

    // Support extracting verify token from headers, query parameters, or body
    const { searchParams } = new URL(req.url);
    const queryToken = searchParams.get('token') || searchParams.get('verify_token');
    const headerToken = req.headers.get('x-webhook-verify-token');
    const bodyToken = body.verify_token || body.token;
    const verifyToken = headerToken || queryToken || bodyToken;

    const supabase = getSupabase();

    // 1. Fetch the integration details
    const { data: integration, error: intErr } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', id)
      .single();

    if (intErr || !integration) {
      console.error('Integration not found for ID:', id, intErr);
      return NextResponse.json({ error: 'Webhook integration not found.' }, { status: 404 });
    }

    if (integration.provider !== 'webhook') {
      return NextResponse.json({ error: 'Invalid integration type. Expected provider: webhook.' }, { status: 400 });
    }

    // 2. Validate the verify token
    if (!verifyToken || verifyToken !== integration.webhook_secret) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or missing verify token.' }, { status: 401 });
    }

    // 3. Extract message details from payload
    const senderId = body.sender_psid;
    const customerName = body.sender_name || 'Webhook User';
    const text = body.message_text;

    if (!senderId || !text) {
      return NextResponse.json(
        { error: 'Missing parameters. sender_psid and message_text are required.' },
        { status: 400 }
      );
    }

    // 4. Find or create the customer (using senderId as webhook_psid in meta_data)
    let { data: customer, error: custFindErr } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', integration.company_id)
      .eq('meta_data->>webhook_psid', senderId)
      .single();

    if (!customer) {
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({
          company_id: integration.company_id,
          name: customerName,
          meta_data: { webhook_psid: senderId }
        })
        .select()
        .single();
      
      if (custErr || !newCust) {
        console.error('Error creating customer:', custErr);
        return NextResponse.json({ error: 'Failed to create customer profile.' }, { status: 500 });
      }
      customer = newCust;
    }

    // 5. Find or create the conversation
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
      
      if (convErr || !newConv) {
        console.error('Error creating conversation:', convErr);
        return NextResponse.json({ error: 'Failed to create conversation thread.' }, { status: 500 });
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

    // 6. Save the message to messages table
    const { data: newMsg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        company_id: integration.company_id,
        sender_type: 'customer',
        message_type: 'text',
        content: text,
        metadata: { sender_psid: senderId }
      })
      .select()
      .single();

    if (msgErr || !newMsg) {
      console.error('Error creating message:', msgErr);
      return NextResponse.json({ error: 'Failed to save message.' }, { status: 500 });
    }

    // 7. Dispatch event to outgoing webhooks
    await triggerCompanyWebhooks(integration.company_id, 'message.created', newMsg);

    // 8. Trigger AI Auto-reply asynchronously if AI Autopilot is enabled
    triggerAiReplyIfNeeded(
      integration.company_id,
      conversation.id,
      integration.id,
      text
    ).catch(err => console.error('Error invoking AI reply execution loop:', err));

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error: any) {
    console.error('Incoming custom webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
