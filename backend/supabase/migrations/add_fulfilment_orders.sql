-- Automated setup after payment (backend/fulfilment). One row per paid checkout.
-- Written by the backend service role only: RLS on, no public policies.
-- Additive: creates two new tables, touches nothing that exists.

CREATE TABLE IF NOT EXISTS public.fulfilment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- idempotency: Stripe retries webhooks, one order per checkout session
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  livemode BOOLEAN NOT NULL DEFAULT FALSE,
  -- dry runs use the fake registrar and fake DNS: no money spent, no real DNS written
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,

  -- capability token for the customer's "Moving in" page (no login needed)
  status_token TEXT NOT NULL UNIQUE,

  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email TEXT,
  forward_to TEXT,
  email_address TEXT,
  domain_name TEXT NOT NULL,
  domain_price_usd NUMERIC(10,2),
  tier TEXT NOT NULL CHECK (tier IN ('workspace', 'forward')),

  -- workflow
  state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'awaiting_customer', 'done', 'needs_human', 'refunded')),
  step TEXT NOT NULL DEFAULT 'register_domain',
  steps JSONB NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  needs_human_reason TEXT,
  customer_action JSONB,

  -- lease so a webhook retry and the runner never work one order at the same time
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,

  -- provider state
  registrant JSONB,          -- registrant contact from Stripe Checkout (PII; service role only)
  registration JSONB NOT NULL DEFAULT '{}',
  zone_id TEXT,
  nameservers TEXT[],
  mail JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_fulfilment_orders_due
  ON public.fulfilment_orders (state, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_fulfilment_orders_domain
  ON public.fulfilment_orders (domain_name);

-- Append-only log: audit trail and the signal feed for the weekly learning loop
CREATE TABLE IF NOT EXISTS public.fulfilment_events (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.fulfilment_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_fulfilment_events_order
  ON public.fulfilment_events (order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_fulfilment_events_type
  ON public.fulfilment_events (type, created_at DESC);

ALTER TABLE public.fulfilment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfilment_events ENABLE ROW LEVEL SECURITY;
