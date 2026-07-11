-- ============================================
-- AI Queue - Atomic Pick RPC
-- Run this in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION pick_next_queue_job()
RETURNS SETOF ai_queue
LANGUAGE sql
VOLATILE
AS $$
  UPDATE ai_queue
  SET 
    status = 'processing',
    started_at = now()
  WHERE id = (
    SELECT id
    FROM ai_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
$$;
