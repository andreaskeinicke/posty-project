-- Concierge learning loop: one row per recommendation run (a "case").
-- See docs/CONCIERGE_DIRECTION.md. Written by backend service role only.

CREATE TABLE IF NOT EXISTS recommendation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prompt_version TEXT,
  profile JSONB,            -- questionnaire profile as analyzed
  generated JSONB,          -- all candidates incl. availability results
  shown JSONB,              -- the curated shortlist actually revealed first
  pitch TEXT,               -- concierge pitch shown to the user
  pick TEXT,                -- the concierge's recommended email
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  selected_domain TEXT,     -- domain sent to checkout
  stripe_session_id TEXT,
  selected_at TIMESTAMPTZ,
  purchased_domain TEXT,    -- confirmed by payment webhook
  purchased_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recommendation_cases_created_at
  ON recommendation_cases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_cases_stripe_session
  ON recommendation_cases (stripe_session_id);

-- Service-role access only (no anon/user policies): logging is backend-internal.
ALTER TABLE recommendation_cases ENABLE ROW LEVEL SECURITY;
