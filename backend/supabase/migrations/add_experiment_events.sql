-- Headline tests on the home page (docs/HEADLINE_TESTS.md).
-- Anonymous by design: no IP, user agent, user id or cookie id is stored.

CREATE TABLE IF NOT EXISTS experiment_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  experiment TEXT NOT NULL,
  variant TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('view', 'search', 'get', 'checkout'))
);

CREATE INDEX IF NOT EXISTS idx_experiment_events_exp ON experiment_events (experiment, variant, event);

CREATE OR REPLACE VIEW experiment_counts AS
  SELECT experiment, variant, event, count(*)::int AS n
  FROM experiment_events
  GROUP BY experiment, variant, event;

-- Service-role access only.
ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON experiment_counts FROM anon, authenticated;
