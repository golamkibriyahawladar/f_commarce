import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { triggerCompanyWebhooks } from '@/lib/webhookDispatcher';
import { triggerAiReplyIfNeeded } from '@/lib/aiAgentExecutor';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ---------------------------------------------------------------------------
// Developer API: Authenticate via Bearer token from the webhook_tokens table
// ---------------------------------------------------------------------------
async function authenticateDeveloperApiToken(
  req: Request,
  companyId: string,
  supabase: ReturnType<typeof getSupabase>
) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized. Missing or invalid Authorization header.', status: 401 };
  }

  const bearerToken = authHeader.split(' ')[1];

  const { data: tokenRecord, error: tokenErr } = await supabase
    .from('webhook_tokens')
    .select('*')
    .eq('token', bearerToken)
    .single();

  if (tokenErr || !tokenRecord) {
    return { error: 'Unauthorized. Invalid API token.', status: 401 };
  }

  if (!tokenRecord.is_active) {
    return { error: 'Unauthorized. API token is inactive.', status: 401 };
  }

  if (tokenRecord.company_id !== companyId) {
    return { error: 'Unauthorized. Token does not belong to this integration\'s company.', status: 403 };
  }

  // Update last_used_at asynchronously (fire-and-forget)
  supabase
    .from('webhook_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRecord.id)
    .then((res) => {
      if (res.error) console.error('Failed to update token last_used_at:', res.error);
    });

  return { tokenRecord };
}

// ---------------------------------------------------------------------------
// Handlers for each payload type under developer_api
// ---------------------------------------------------------------------------

async function handleMessageType(
  body: any,
  integration: any,
  supabase: ReturnType<typeof getSupabase>
) {
  const senderId = body.sender_psid;
  const customerName = body.sender_name || 'API User';
  const text = body.message_text;

  if (!senderId || !text) {
    return NextResponse.json(
      { error: 'Missing parameters. sender_psid and message_text are required for type "message".' },
      { status: 400 }
    );
  }

  // Find or create customer
  let { data: customer } = await supabase
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

  // Find or create conversation
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
    await supabase
      .from('conversations')
      .update({
        last_message: text,
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1
      })
      .eq('id', conversation.id);
  }

  // Save the message
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

  // Dispatch outgoing webhook
  await triggerCompanyWebhooks(integration.company_id, 'message.created', newMsg);

  // Trigger AI reply (only for message type)
  triggerAiReplyIfNeeded(
    integration.company_id,
    conversation.id,
    integration.id,
    text
  ).catch(err => console.error('Error invoking AI reply execution loop:', err));

  return NextResponse.json({ success: true, message: newMsg });
}

async function handleLeadType(
  body: any,
  integration: any,
  supabase: ReturnType<typeof getSupabase>
) {
  const { name, phone, email, source, campaign_name, customer_id } = body;

  if (!name && !phone && !email) {
    return NextResponse.json(
      { error: 'At least one of name, phone, or email is required for type "lead".' },
      { status: 400 }
    );
  }

  const { data: newLead, error: leadErr } = await supabase
    .from('leads')
    .insert({
      company_id: integration.company_id,
      customer_id: customer_id || null,
      name: name || null,
      phone: phone || null,
      email: email || null,
      source: source || 'developer_api',
      campaign_name: campaign_name || null,
      status: 'new',
      raw_payload: body,
    })
    .select()
    .single();

  if (leadErr || !newLead) {
    console.error('Error creating lead:', leadErr);
    return NextResponse.json({ error: 'Failed to create lead.' }, { status: 500 });
  }

  // Dispatch outgoing webhook
  await triggerCompanyWebhooks(integration.company_id, 'lead.created', newLead);

  return NextResponse.json({ success: true, lead: newLead });
}

async function handleCustomerType(
  body: any,
  integration: any,
  supabase: ReturnType<typeof getSupabase>
) {
  const { name, phone, email, shipping_address, meta_data } = body;

  if (!name && !phone && !email) {
    return NextResponse.json(
      { error: 'At least one of name, phone, or email is required for type "customer".' },
      { status: 400 }
    );
  }

  // Build the upsert payload
  const customerPayload: Record<string, any> = {
    company_id: integration.company_id,
    name: name || null,
    phone: phone || null,
    email: email || null,
  };

  if (shipping_address !== undefined) {
    customerPayload.shipping_address = shipping_address;
  }
  if (meta_data !== undefined) {
    customerPayload.meta_data = meta_data;
  }

  // Upsert by company_id + phone (or email as fallback) to avoid duplicates
  // If phone is provided, try to find existing customer by phone
  let existingCustomer = null;

  if (phone) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', integration.company_id)
      .eq('phone', phone)
      .single();
    existingCustomer = data;
  } else if (email) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', integration.company_id)
      .eq('email', email)
      .single();
    existingCustomer = data;
  }

  let customer;
  if (existingCustomer) {
    // Update existing customer
    const { data: updated, error: updateErr } = await supabase
      .from('customers')
      .update(customerPayload)
      .eq('id', existingCustomer.id)
      .select()
      .single();

    if (updateErr || !updated) {
      console.error('Error updating customer:', updateErr);
      return NextResponse.json({ error: 'Failed to update customer.' }, { status: 500 });
    }
    customer = updated;
  } else {
    // Insert new customer
    const { data: created, error: createErr } = await supabase
      .from('customers')
      .insert(customerPayload)
      .select()
      .single();

    if (createErr || !created) {
      console.error('Error creating customer:', createErr);
      return NextResponse.json({ error: 'Failed to create customer.' }, { status: 500 });
    }
    customer = created;
  }

  // Dispatch outgoing webhook
  await triggerCompanyWebhooks(integration.company_id, 'customer.created', customer);

  return NextResponse.json({ success: true, customer });
}

// ---------------------------------------------------------------------------
// Main POST handler
// ---------------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Route A: Legacy webhook provider (backward compatible — unchanged)
    // -----------------------------------------------------------------------
    if (integration.provider === 'webhook') {
      // Support extracting verify token from headers, query parameters, or body
      const { searchParams } = new URL(req.url);
      const queryToken = searchParams.get('token') || searchParams.get('verify_token');
      const headerToken = req.headers.get('x-webhook-verify-token');
      const bodyToken = body.verify_token || body.token;
      const verifyToken = headerToken || queryToken || bodyToken;

      // Validate the verify token
      if (!verifyToken || verifyToken !== integration.webhook_secret) {
        return NextResponse.json({ error: 'Unauthorized. Invalid or missing verify token.' }, { status: 401 });
      }

      // Extract message details from payload
      const senderId = body.sender_psid;
      const customerName = body.sender_name || 'Webhook User';
      const text = body.message_text;

      if (!senderId || !text) {
        return NextResponse.json(
          { error: 'Missing parameters. sender_psid and message_text are required.' },
          { status: 400 }
        );
      }

      // Find or create the customer (using senderId as webhook_psid in meta_data)
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

      // Find or create the conversation
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

      // Save the message to messages table
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

      // Dispatch event to outgoing webhooks
      await triggerCompanyWebhooks(integration.company_id, 'message.created', newMsg);

      // Trigger AI Auto-reply asynchronously if AI Autopilot is enabled
      triggerAiReplyIfNeeded(
        integration.company_id,
        conversation.id,
        integration.id,
        text
      ).catch(err => console.error('Error invoking AI reply execution loop:', err));

      return NextResponse.json({ success: true, message: newMsg });
    }

    // -----------------------------------------------------------------------
    // Route B: Developer API provider (new)
    // -----------------------------------------------------------------------
    if (integration.provider === 'developer_api') {
      // Authenticate via Bearer token from webhook_tokens table
      const authResult = await authenticateDeveloperApiToken(req, integration.company_id, supabase);
      if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }

      // Determine payload type — defaults to 'message'
      const payloadType = body.type || 'message';

      // Check scope permission on the token
      const scopes: string[] = authResult.tokenRecord.scopes || [];
      const scopeMap: Record<string, string> = {
        message: 'messages',
        lead: 'leads',
        customer: 'customers',
      };
      const requiredScope = scopeMap[payloadType];

      if (requiredScope && scopes.length > 0 && !scopes.includes(requiredScope)) {
        return NextResponse.json(
          { error: `Forbidden. Token does not have the "${requiredScope}" scope.` },
          { status: 403 }
        );
      }

      switch (payloadType) {
        case 'message':
          return await handleMessageType(body, integration, supabase);

        case 'lead':
          return await handleLeadType(body, integration, supabase);

        case 'customer':
          return await handleCustomerType(body, integration, supabase);

        default:
          return NextResponse.json(
            { error: `Unsupported payload type: "${payloadType}". Supported types: message, lead, customer.` },
            { status: 400 }
          );
      }
    }

    // -----------------------------------------------------------------------
    // Unsupported provider
    // -----------------------------------------------------------------------
    return NextResponse.json(
      { error: `Invalid integration type. Expected provider: "webhook" or "developer_api", got: "${integration.provider}".` },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Incoming custom webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
