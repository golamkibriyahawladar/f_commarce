import { createClient } from '@supabase/supabase-js';
import { triggerCompanyWebhooks } from './webhookDispatcher';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Helper to estimate token counts if api returns zero/null (safety fallback)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Triggers the AI Agent auto-response loop if the conversation has AI Autopilot enabled
 * and an active AI Agent is assigned to the channel integration.
 */
export async function triggerAiReplyIfNeeded(
  companyId: string,
  conversationId: string,
  integrationId: string,
  userMessageText: string
) {
  const startTime = Date.now();
  const llmRuns: Array<{
    run_index: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    execution_time_ms: number;
    model: string;
  }> = [];

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

    const credentials = assignedAgent.credentials || {};
    const agentName = credentials.name || 'AI Assistant';
    let systemPrompt = credentials.system_prompt || 'You are a helpful customer support assistant.';
    const llmProvider = credentials.llm_provider || 'openai';
    
    // Fetch company settings
    const { data: userCompany } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .maybeSingle();
    const companySettings = userCompany?.settings || {};

    // Fetch global fallbacks
    const { data: systemCompany } = await supabase
      .from('companies')
      .select('settings')
      .eq('slug', 'system-admin')
      .maybeSingle();
    const globalSettings = systemCompany?.settings || {};

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

    // 4. RAG integration: if "search_knowledge_base" is active, query Pinecone
    const activeTools = credentials.active_tools || [];
    let ragContext = '';

    if (activeTools.includes('search_knowledge_base')) {
      const pineconeApiKey = credentials.pinecone_api_key;
      const pineconeIndex = credentials.pinecone_index;
      const pineconeNamespace = credentials.pinecone_namespace || `${companyId}_${assignedAgent.id}`;
      const embeddingProvider = credentials.embedding_provider || 'openai';

      if (pineconeApiKey && pineconeIndex) {
        try {
          console.log(`AI Agent '${agentName}' performing RAG search on Pinecone (Namespace: ${pineconeNamespace})...`);
          let queryEmbedding: number[] = [];

          // Generate embedding for query
          if (embeddingProvider === 'openai') {
            const openaiKey = credentials.openai_key || companySettings.openai_key || companySettings.openaiKey || globalSettings.global_openai_key;
            if (openaiKey) {
              const embRes = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                  model: 'text-embedding-3-small',
                  input: userMessageText
                })
              });
              if (embRes.ok) {
                const embData = await embRes.json();
                queryEmbedding = embData.data?.[0]?.embedding || [];
              } else {
                console.error('OpenAI query embedding error:', embRes.statusText);
              }
            }
          } else if (embeddingProvider === 'gemini') {
            const geminiKey = credentials.gemini_key || companySettings.gemini_key || companySettings.geminiKey || globalSettings.global_gemini_key || globalSettings.global_openai_key;
            if (geminiKey) {
              const genAI = new GoogleGenerativeAI(geminiKey);
              const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
              // @ts-ignore
              const result = await model.embedContent({
                content: { parts: [{ text: userMessageText }] },
                outputDimensionality: 768
              });
              const rawValues = result.embedding?.values || [];
              queryEmbedding = rawValues.length > 768 ? rawValues.slice(0, 768) : rawValues;
            }
          }

          // Query Pinecone
          if (queryEmbedding.length > 0) {
            const pc = new Pinecone({ apiKey: pineconeApiKey });
            const index = pc.Index(pineconeIndex);
            
            const queryResponse = await index.namespace(pineconeNamespace).query({
              vector: queryEmbedding,
              topK: 4,
              includeMetadata: true
            });

            const matchedTexts = (queryResponse.matches || [])
              .map(match => match.metadata?.text as string)
              .filter(Boolean);

            if (matchedTexts.length > 0) {
              ragContext = matchedTexts.join('\n\n');
              console.log(`RAG Search succeeded. Found ${matchedTexts.length} matching text chunks.`);
            }
          }
        } catch (ragErr) {
          console.error('RAG vector search failed:', ragErr);
        }
      }
    }

    // Inject RAG context into prompt if found
    if (ragContext) {
      systemPrompt = `Use the following knowledge base context to answer the user's questions truthfully. If the context doesn't contain the answer, reply based on your general knowledge but mention the limitations.

=== KNOWLEDGE BASE CONTEXT ===
${ragContext}
==============================

System instructions:
${systemPrompt}`;
    }

    // Enforce strict prompt adherence
    systemPrompt += '\n\nIMPORTANT: You must strictly follow the system instructions, rules, and guidelines provided above. Do not deviate from these instructions under any circumstances. Stay on topic and follow all rules precisely.';

    // 5. Query LLM and calculate token/performance telemetry
    let aiReplyText = '';
    let modelUsed = '';

    if (llmProvider === 'openai') {
      const apiKey = credentials.openai_key || companySettings.openai_key || companySettings.openaiKey || globalSettings.global_openai_key;
      if (!apiKey) {
        console.error(`AI Agent '${agentName}' configuration error: Missing OpenAI API Key.`);
        return;
      }

      modelUsed = credentials.model_name || 'gpt-4o-mini';

      // Map history to OpenAI message structures
      const openAiMessages = [
        { role: 'system', content: systemPrompt },
        ...(history || []).map(msg => ({
          role: msg.sender_type === 'customer' ? 'user' : 'assistant',
          content: msg.content
        }))
      ];

      const runStartTime = Date.now();

      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelUsed,
          messages: openAiMessages,
          temperature: 0.2
        })
      });

      const executionTime = Date.now() - runStartTime;

      if (!openAiRes.ok) {
        const openAiError = await openAiRes.json();
        console.error('OpenAI API Error:', openAiError);
        return;
      }

      const openAiData = await openAiRes.json();
      aiReplyText = openAiData.choices?.[0]?.message?.content?.trim() || '';
      
      const usage = openAiData.usage || {};
      llmRuns.push({
        run_index: 0,
        prompt_tokens: usage.prompt_tokens || estimateTokens(systemPrompt),
        completion_tokens: usage.completion_tokens || estimateTokens(aiReplyText),
        total_tokens: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens),
        execution_time_ms: executionTime,
        model: modelUsed
      });

    } else if (llmProvider === 'gemini') {
      const apiKey = credentials.gemini_key || companySettings.gemini_key || companySettings.geminiKey || globalSettings.global_gemini_key || globalSettings.global_openai_key; // fallback
      if (!apiKey) {
        console.error(`AI Agent '${agentName}' configuration error: Missing Gemini API Key.`);
        return;
      }

      modelUsed = credentials.model_name || 'gemini-1.5-flash';

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: modelUsed,
        systemInstruction: systemPrompt
      });

      // Convert history to Gemini contents format
      // Gemini expects role to be 'user' or 'model'
      const contents = (history || []).map(msg => ({
        role: msg.sender_type === 'customer' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const runStartTime = Date.now();

      const result = await model.generateContent({
        contents,
        generationConfig: { temperature: 0.2 }
      });

      const executionTime = Date.now() - runStartTime;

      aiReplyText = result.response?.text()?.trim() || '';

      const usageMetadata = (result.response?.usageMetadata || {}) as any;
      const promptTokens = usageMetadata.promptTokenCount || estimateTokens(systemPrompt);
      const completionTokens = usageMetadata.candidatesTokenCount || estimateTokens(aiReplyText);
      const totalTokens = usageMetadata.totalTokenCount || (promptTokens + completionTokens);

      llmRuns.push({
        run_index: 0,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        execution_time_ms: executionTime,
        model: modelUsed
      });
    }

    if (!aiReplyText) {
      console.error('LLM returned an empty reply.');
      return;
    }

    // 6. Fetch integration details to determine routing back to the user
    const { data: integration, error: intErr } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (intErr || !integration) {
      console.error('Integration details not found for routing:', intErr);
      return;
    }

    // 7. Route reply to the correct channel
    if (integration.provider === 'facebook') {
      const pageAccessToken = integration.credentials?.access_token;
      if (!pageAccessToken) {
        console.error('Meta Send API: Page Access Token is missing.');
        return;
      }

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
    } else {
      console.log(`Mocking AI reply routing for channel provider: ${integration.provider}`);
    }

    // Compute aggregated usage statistics
    const totalPromptTokens = llmRuns.reduce((sum, run) => sum + run.prompt_tokens, 0);
    const totalCompletionTokens = llmRuns.reduce((sum, run) => sum + run.completion_tokens, 0);
    const totalTokens = llmRuns.reduce((sum, run) => sum + run.total_tokens, 0);
    const totalResponseTime = Date.now() - startTime;

    const executionStats = {
      chat_info: {
        session_id: conversationId
      },
      usage: {
        prompt_tokens: totalPromptTokens,
        completion_tokens: totalCompletionTokens,
        total_tokens: totalTokens
      },
      performance: {
        model_used: modelUsed,
        response_time_ms: totalResponseTime,
        llm_runs: llmRuns
      }
    };

    // 8. Save the AI reply message to the database (including telemetry stats in metadata)
    const { data: savedMsg, error: saveErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        company_id: companyId,
        sender_type: 'ai',
        message_type: 'text',
        content: aiReplyText,
        metadata: { 
          sent_by_ai_agent: agentName,
          execution_stats: executionStats
        }
      })
      .select()
      .single();

    if (saveErr || !savedMsg) {
      console.error('Failed to save AI reply message:', saveErr);
      return;
    }

    // 9. Update conversation last message status
    await supabase
      .from('conversations')
      .update({
        last_message: aiReplyText,
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    // 10. Trigger company webhooks so external client receives the AI reply event
    await triggerCompanyWebhooks(companyId, 'message.created', savedMsg);

    console.log('AI agent auto-reply loop completed successfully with stats:', JSON.stringify(executionStats));
  } catch (error) {
    console.error('triggerAiReplyIfNeeded failed:', error);
  }
}
