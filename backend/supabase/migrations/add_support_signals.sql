-- Support agent: signals for the weekly learning loop, and escalations to a person.
-- Written by the backend service role only. Text is redacted before insert (no emails,
-- keys, card numbers or tokens). See docs/SUPPORT_AGENTS.md.

CREATE TABLE IF NOT EXISTS support_signals (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL,             -- chat_turn | escalation | setup_check | feedback
  source TEXT NOT NULL DEFAULT 'chat',
  topic TEXT NOT NULL DEFAULT 'other',
  category TEXT,                  -- escalation category (refund, account_access, ...)
  escalated BOOLEAN NOT NULL DEFAULT false,
  resolved_by_agent BOOLEAN,
  order_step TEXT,
  tier TEXT,
  text TEXT,                      -- redacted customer words, max 500 chars
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_support_signals_created_at ON support_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_signals_topic ON support_signals (topic, created_at DESC);

CREATE TABLE IF NOT EXISTS support_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open',   -- open | answered | closed
  category TEXT NOT NULL,
  order_id UUID,                          -- set only when the chat carried a valid order link
  summary TEXT,                           -- redacted
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb  -- redacted, last turns only
);

CREATE INDEX IF NOT EXISTS idx_support_escalations_open ON support_escalations (status, created_at DESC);

ALTER TABLE support_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_escalations ENABLE ROW LEVEL SECURITY;

-- Retention: drop the customer's words after 12 months, keep the counts for trends.
-- Run monthly (pg_cron or by hand):
--   UPDATE support_signals SET text = NULL WHERE created_at < now() - interval '12 months' AND text IS NOT NULL;
--   DELETE FROM support_escalations WHERE created_at < now() - interval '12 months' AND status = 'closed';
