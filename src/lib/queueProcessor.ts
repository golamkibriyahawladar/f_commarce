import { createClient } from '@supabase/supabase-js';
import { triggerAiReplyIfNeeded } from './aiAgentExecutor';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ─── Add to Queue ───────────────────────────────────────────────────────────
export async function addToAiQueue(
  companyId: string,
  conversationId: string,
  integrationId: string,
  userMessage: string,
  priority: number = 0
) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ai_queue')
    .insert({
      company_id: companyId,
      conversation_id: conversationId,
      integration_id: integrationId,
      user_message: userMessage,
      status: 'pending',
      priority,
      retry_count: 0
    })
    .select()
    .single();

  if (error) {
    console.error('[Queue] Failed to enqueue message:', error);
    throw error;
  }

  console.log(`[Queue] Message enqueued: ${data.id} for conversation ${conversationId}`);
  return data;
}

// ─── Pick next job from queue (atomic lock) ─────────────────────────────────
async function pickNextJob(supabase: ReturnType<typeof getSupabase>) {
  // Use a transaction-like approach: find oldest pending, update to processing
  // PostgreSQL's UPDATE ... RETURNING with a subquery ensures atomic pick
  const { data, error } = await supabase
    .rpc('pick_next_queue_job');

  if (error) {
    // If RPC doesn't exist, fallback to manual pick
    console.warn('[Queue] RPC not available, using fallback pick');
    return await fallbackPick(supabase);
  }

  return data;
}

async function fallbackPick(supabase: ReturnType<typeof getSupabase>) {
  // Step 1: Find the oldest pending job
  const { data: pending, error: findErr } = await supabase
    .from('ai_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (findErr || !pending) return null;

  // Step 2: Atomically claim it by updating status
  const { data: claimed, error: claimErr } = await supabase
    .from('ai_queue')
    .update({ 
      status: 'processing', 
      started_at: new Date().toISOString() 
    })
    .eq('id', pending.id)
    .eq('status', 'pending') // Only if still pending (prevents double-pick)
    .select()
    .single();

  if (claimErr || !claimed) return null;

  return claimed;
}

// ─── Process a single job ───────────────────────────────────────────────────
async function processJob(
  job: any,
  supabase: ReturnType<typeof getSupabase>
) {
  try {
    console.log(`[Queue] Processing job ${job.id} (attempt ${job.retry_count + 1}/${job.max_retries})`);

    // Call the actual AI agent executor
    await triggerAiReplyIfNeeded(
      job.company_id,
      job.conversation_id,
      job.integration_id,
      job.user_message
    );

    // Mark as completed
    await supabase
      .from('ai_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`[Queue] Job ${job.id} completed successfully`);
    return { success: true };

  } catch (err: any) {
    const newRetryCount = job.retry_count + 1;
    const isFinalFailure = newRetryCount >= job.max_retries;

    await supabase
      .from('ai_queue')
      .update({
        status: isFinalFailure ? 'failed' : 'pending',
        retry_count: newRetryCount,
        error_message: err.message || 'Unknown error',
        processed_at: isFinalFailure ? new Date().toISOString() : null,
        started_at: null
      })
      .eq('id', job.id);

    if (isFinalFailure) {
      console.error(`[Queue] Job ${job.id} PERMANENTLY FAILED after ${newRetryCount} attempts: ${err.message}`);
    } else {
      console.warn(`[Queue] Job ${job.id} failed (attempt ${newRetryCount}), will retry: ${err.message}`);
    }

    return { success: false, error: err.message };
  }
}

// ─── Main Queue Processor (processes batch of pending jobs) ─────────────────
export async function processQueue(options?: {
  maxJobs?: number;
  delayBetweenMs?: number;
}) {
  const maxJobs = options?.maxJobs || 10;
  const delayBetweenMs = options?.delayBetweenMs || 500;
  const supabase = getSupabase();

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    remaining: 0
  };

  for (let i = 0; i < maxJobs; i++) {
    const job = await fallbackPick(supabase);

    if (!job) {
      // No more pending jobs
      break;
    }

    const result = await processJob(job, supabase);
    results.processed++;

    if (result.success) {
      results.succeeded++;
    } else {
      results.failed++;
    }

    // Rate limiting delay between LLM calls
    if (i < maxJobs - 1 && delayBetweenMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenMs));
    }
  }

  // Count remaining pending jobs
  const { count } = await supabase
    .from('ai_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  results.remaining = count || 0;

  console.log(`[Queue] Batch complete: ${results.processed} processed, ${results.succeeded} succeeded, ${results.failed} failed, ${results.remaining} remaining`);

  return results;
}

// ─── Get Queue Stats ────────────────────────────────────────────────────────
export async function getQueueStats(companyId?: string) {
  const supabase = getSupabase();

  let query = supabase.from('ai_queue').select('status');
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;
  if (error || !data) return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };

  const stats = {
    pending: data.filter(d => d.status === 'pending').length,
    processing: data.filter(d => d.status === 'processing').length,
    completed: data.filter(d => d.status === 'completed').length,
    failed: data.filter(d => d.status === 'failed').length,
    total: data.length
  };

  return stats;
}
