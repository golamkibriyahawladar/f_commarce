-- ============================================================
-- Developer API: webhook_tokens table
-- Stores API tokens for developer_api integrations
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default Token',
  scopes TEXT[] DEFAULT ARRAY['messages', 'leads', 'customers'],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_tokens_company_isolation" ON webhook_tokens
FOR ALL USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Index for fast token lookups
CREATE INDEX idx_webhook_tokens_token ON webhook_tokens(token);
CREATE INDEX idx_webhook_tokens_company ON webhook_tokens(company_id);
