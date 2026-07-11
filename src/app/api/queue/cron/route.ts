export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Master Orchestrator for the Queue
// Should be called every 1 minute via cron
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cronSecret = searchParams.get('secret');
    const expectedSecret = process.env.QUEUE_CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // 1. Find all integration IDs that have PENDING jobs in the queue
    const { data: pendingJobs, error: queueErr } = await supabase
      .from('ai_queue')
      .select('integration_id')
      .eq('status', 'pending');

    if (queueErr) throw queueErr;

    // Get unique integration IDs
    const integrationIds = [...new Set((pendingJobs || []).map(j => j.integration_id))];

    if (integrationIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending jobs.' });
    }

    // 2. Fetch the agents (integrations) and their queue_settings
    const { data: agents, error: agentErr } = await supabase
      .from('integrations')
      .select('id, credentials')
      .in('id', integrationIds);

    if (agentErr) throw agentErr;

    // We will track the promises to avoid blocking the main thread entirely,
    // but wait for them at the end so the Serverless function doesn't exit early.
    const workerPromises: Promise<any>[] = [];

    // The base URL for calling the process endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3000');
    
    let totalWorkersStarted = 0;

    for (const agent of agents || []) {
      const settings = agent.credentials?.queue_settings || {};
      
      // Default settings if not configured
      const workers = settings.workers || 1;
      const batchSize = settings.batch_size || 10;
      const delayBetweenMs = settings.delay_ms !== undefined ? settings.delay_ms : 1000;

      // Spawn N parallel workers for this agent
      for (let i = 0; i < workers; i++) {
        // Fire & Forget HTTP POST request to the process endpoint
        const promise = fetch(`${baseUrl}/api/queue/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integrationId: agent.id,
            maxJobs: batchSize,
            delayBetweenMs,
            secret: cronSecret || undefined
          })
        }).catch(err => console.error(`Failed to trigger worker for agent ${agent.id}:`, err));
        
        workerPromises.push(promise);
        totalWorkersStarted++;
      }
    }

    // Await all fetch calls to ensure the serverless function doesn't close them abruptly
    await Promise.all(workerPromises);

    return NextResponse.json({ 
      success: true, 
      agents_processing: agents?.length || 0,
      total_workers_started: totalWorkersStarted
    });

  } catch (error: any) {
    console.error('[Queue Cron] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
