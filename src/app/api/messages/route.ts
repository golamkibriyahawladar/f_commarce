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
    const { conversationId, content, companyId } = await req.json();

    if (!conversationId || !content || !companyId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch conversation details to get the platform info and integration details
    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('*, integration:integrations(*)')
      .eq('id', conversationId)
      .eq('company_id', companyId)
      .single();

    if (convErr || !conversation) {
      console.error('Conversation not found:', convErr);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { platform, platform_conversation_id, integration } = conversation;

    if (!integration) {
      return NextResponse.json({ error: 'Associated integration not found' }, { status: 400 });
    }

    // 2. If it is Facebook, call Meta's messaging API
    if (platform === 'facebook') {
      const pageAccessToken = integration.credentials?.access_token;
      if (!pageAccessToken) {
        return NextResponse.json({ error: 'Meta Page Access Token is missing' }, { status: 400 });
      }

      const fbResponse = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: platform_conversation_id },
          message: { text: content }
        })
      });

      if (!fbResponse.ok) {
        const fbError = await fbResponse.json();
        console.error('Facebook Send API Error:', fbError);
        return NextResponse.json({ error: fbError.error?.message || 'Failed to send message to Facebook' }, { status: 500 });
      }
    } else {
      // Mock success for other platforms until implemented
      console.log(`Mocking send message for platform: ${platform}`);
    }

    // 3. Save the message to Supabase
    const { data: newMessage, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        company_id: companyId,
        sender_type: 'agent',
        message_type: 'text',
        content,
        metadata: { sent_via_api: true }
      })
      .select()
      .single();

    if (msgErr) {
      console.error('Save message error:', msgErr);
      return NextResponse.json({ error: 'Failed to save message to database' }, { status: 500 });
    }

    // 4. Update the conversation last message and reset unread count
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count: 0
      })
      .eq('id', conversationId);

    return NextResponse.json({ success: true, message: newMessage });

  } catch (error: any) {
    console.error('Send Message API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
