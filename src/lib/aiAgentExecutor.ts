import { createClient } from '@supabase/supabase-js';
import { triggerCompanyWebhooks } from './webhookDispatcher';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Triggers the AI Agent auto-response loop if the conversation has AI Autopilot enabled
 * and an active AI Agent is assigned to the channel integration.
 * 
 * @param companyId Workspace company ID
 * @param conversationId Conversation ID
 * @param integrationId Integration ID representing the incoming channel
 * @param userMessageText Content of the user's incoming message
 */
export async function triggerAiReplyIfNeeded(
  companyId: string,
  conversationId: string,
  integrationId: string,
  userMessageText: string
) {
  try {
    const supabase = getSupabase();

    // 1. Check if AI Autopilot is enabled on this conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) {
      console.error('AI Autopilot check: Conversation not found.', convErr);
      return;
    }

    if (!conv.is_ai_mode) {
      console.log(`AI Autopilot is disabled for conversation ${conversationId}. Skipping reply.`);
      return;
    }

    // 2. Fetch all AI Agent configurations for this company
    const { data: agents, error: agentsErr } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('provider', 'ai_agent')
      .eq('status', 'active');

    if (agentsErr || !agents || agents.length === 0) {
      console.log('No active AI Agents configured for company:', companyId);
      return;
    }

    // Find the AI Agent assigned to this integration ID
    const assignedAgent = agents.find(agent => 
      agent.credentials?.assigned_integrations?.includes(integrationId)
    );

    if (!assignedAgent) {
      console.log(`No active AI Agent is assigned to integration ${integrationId}. Skipping reply.`);
      return;
    }

    const agentName = assignedAgent.credentials?.name || 'AI Assistant';
    const systemPrompt = assignedAgent.credentials?.system_prompt || 'You are a helpful customer support assistant.';
    const apiKey = assignedAgent.credentials?.openai_key || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error(`AI Agent '${agentName}' configuration error: Missing OpenAI API Key.`);
      return;
    }

    console.log(`AI Agent '${agentName}' executing auto-reply for conversation ${conversationId}...`);

    // 3. Fetch the last 10 messages of the conversation for chat context
    const { data: history, error: historyErr } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyErr) {
      console.error('Error fetching conversation history:', historyErr);
      return;
    }

    // Map history to OpenAI message structures
    const openAiMessages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(msg => ({
        role: msg.sender_type === 'customer' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    // 4. Request completion from OpenAI
    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Lightweight, fast, and smart model for customer DMs
        messages: openAiMessages,
        temperature: 0.7
      })
    });

    if (!openAiRes.ok) {
      const openAiError = await openAiRes.json();
      console.error('OpenAI API Error:', openAiError);
      return;
    }

    const openAiData = await openAiRes.json();
    const aiReplyText = openAiData.choices?.[0]?.message?.content?.trim();

    if (!aiReplyText) {
      console.error('OpenAI returned an empty reply.');
      return;
    }

    // 5. Fetch integration details to determine routing back to the user
    const { data: integration, error: intErr } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (intErr || !integration) {
      console.error('Integration details not found for routing:', intErr);
      return;
    }

    // 6. Route reply to the correct channel
    if (integration.provider === 'facebook') {
      const pageAccessToken = integration.credentials?.access_token;
      if (!pageAccessToken) {
        console.error('Meta Send API: Page Access Token is missing.');
        return;
      }

      // Call Meta Send API to reply to the user DM
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: conv.platform_conversation_id },
          message: { text: aiReplyText }
        })
      });

      if (!metaRes.ok) {
        const metaError = await metaRes.json();
        console.error('Meta Send API Error:', metaError);
        return;
      }
      console.log('AI reply sent successfully to Facebook Page DM.');
    } else if (integration.provider === 'webhook') {
      // For custom incoming webhooks, we don't have a direct API back,
      // so we dispatch the AI reply to their registered outgoing webhook URL!
      console.log('AI reply routed for custom webhook source. Triggering outgoing webhook...');
    } else {
      console.log(`Mocking AI reply routing for channel provider: ${integration.provider}`);
    }

    // 7. Save the AI reply message to the database
    const { data: savedMsg, error: saveErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        company_id: companyId,
        sender_type: 'ai',
        message_type: 'text',
        content: aiReplyText,
        metadata: { sent_by_ai_agent: agentName }
      })
      .select()
      .single();

    if (saveErr || !savedMsg) {
      console.error('Failed to save AI reply message:', saveErr);
      return;
    }

    // 8. Update conversation last message status
    await supabase
      .from('conversations')
      .update({
        last_message: aiReplyText,
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    // 9. Trigger company webhooks so external client receives the AI reply event
    await triggerCompanyWebhooks(companyId, 'message.created', savedMsg);

    console.log('AI agent auto-reply loop completed successfully.');
  } catch (error) {
    console.error('triggerAiReplyIfNeeded failed:', error);
  }
}
