-- ============================================
-- AI Message Queue Table
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS ai_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  error_message TEXT,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
);

-- Indexes for fast queue polling
CREATE INDEX IF NOT EXISTS idx_ai_queue_status_created ON ai_queue (status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_queue_company ON ai_queue (company_id);

-- Enable RLS
ALTER TABLE ai_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their company's queue
CREATE POLICY "Users can view own company queue"
  ON ai_queue FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE id = ai_queue.company_id
  ));

-- Enable Realtime for live updates on dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE ai_queue;
