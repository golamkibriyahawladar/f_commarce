export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { processQueue, getQueueStats } from '@/lib/queueProcessor';

// POST: Trigger queue processing (called by cron or manually)
export async function POST(req: Request) {
  try {
    // Optional: verify a secret key for cron security
    const { searchParams } = new URL(req.url);
    const cronSecret = searchParams.get('secret');
    const expectedSecret = process.env.QUEUE_CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const maxJobs = body.maxJobs || 10;
    const delayBetweenMs = body.delayBetweenMs !== undefined ? body.delayBetweenMs : 500;
    const integrationId = body.integrationId;

    const results = await processQueue({ maxJobs, delayBetweenMs, integrationId });

    return NextResponse.json({
      success: true,
      ...results
    });
  } catch (error: any) {
    console.error('[Queue API] Process error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// GET: Get queue stats
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || undefined;

    const stats = await getQueueStats(companyId);

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('[Queue API] Stats error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
