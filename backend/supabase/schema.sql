-- =====================================================
-- POSTY DATABASE SCHEMA FOR SUPABASE
-- =====================================================
-- This file contains the complete database schema for Posty
-- Run this in Supabase SQL Editor: https://app.supabase.com
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Note: Supabase Auth creates auth.users automatically
-- We extend it with a public.users table for additional data

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  gmail_address VARCHAR(255), -- Their existing Gmail for forwarding
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),

  -- Stripe integration
  stripe_customer_id VARCHAR(255) UNIQUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe ON public.users(stripe_customer_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DOMAINS TABLE
-- =====================================================

CREATE TABLE public.domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  domain_name VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, failed, cancelled

  -- Cloudflare details
  cloudflare_domain_id VARCHAR(255),
  cloudflare_zone_id VARCHAR(255),

  -- Purchase details
  purchase_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  purchased_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT TRUE,

  -- Email routing setup
  email_routing_enabled BOOLEAN DEFAULT FALSE,
  forwarding_address VARCHAR(255), -- User's Gmail
  mx_records_configured BOOLEAN DEFAULT FALSE,
  dns_configured BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_domains_user ON public.domains(user_id);
CREATE INDEX idx_domains_status ON public.domains(status);
CREATE INDEX idx_domains_expires ON public.domains(expires_at);
CREATE INDEX idx_domains_cloudflare_zone ON public.domains(cloudflare_zone_id);

-- Auto-update trigger
CREATE TRIGGER domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,

  -- Stripe details
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),

  -- Subscription info
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, past_due, trialing, incomplete
  plan_type VARCHAR(50) DEFAULT 'basic', -- basic ($5/month)

  -- Billing
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Auto-update trigger
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- QUESTIONNAIRE SESSIONS TABLE
-- =====================================================

CREATE TABLE public.questionnaire_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- NULL if anonymous

  -- Collected data
  full_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  location VARCHAR(255),
  professions JSONB DEFAULT '[]', -- ["founder", "consultant"]
  interests JSONB DEFAULT '[]', -- ["football", "sailing"]

  -- Conversation
  messages JSONB DEFAULT '[]', -- Array of {role, content, timestamp}
  stage VARCHAR(50) DEFAULT 'welcome', -- welcome, location, profession, interests, recommendations

  -- Recommendations
  recommended_domains JSONB DEFAULT '[]', -- Array of suggested domains
  selected_domain VARCHAR(255),

  -- Conversion tracking
  completed_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN DEFAULT FALSE, -- Did they purchase?

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_session_id ON public.questionnaire_sessions(session_id);
CREATE INDEX idx_sessions_user ON public.questionnaire_sessions(user_id);
CREATE INDEX idx_sessions_converted ON public.questionnaire_sessions(converted);
CREATE INDEX idx_sessions_last_activity ON public.questionnaire_sessions(last_activity);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,

  -- Transaction details
  type VARCHAR(50) NOT NULL, -- domain_purchase, subscription_payment, renewal
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded

  -- Payment processor
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_stripe_payment ON public.transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- Auto-update trigger
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EMAIL FORWARDING RULES TABLE
-- =====================================================

CREATE TABLE public.email_forwarding_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,

  -- Forwarding rule
  source_email VARCHAR(255) NOT NULL, -- firstname@domain.com or *@domain.com (catch-all)
  destination_email VARCHAR(255) NOT NULL, -- user's Gmail

  -- Cloudflare Email Routing IDs
  cloudflare_destination_id VARCHAR(255),
  cloudflare_rule_id VARCHAR(255),

  -- Status
  active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE, -- Has user clicked verification link?

  -- Statistics
  emails_forwarded INTEGER DEFAULT 0,
  last_forwarded_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_forwarding_domain ON public.email_forwarding_rules(domain_id);
CREATE INDEX idx_forwarding_source ON public.email_forwarding_rules(source_email);
CREATE INDEX idx_forwarding_verified ON public.email_forwarding_rules(verified);

-- Auto-update trigger
CREATE TRIGGER email_forwarding_rules_updated_at
  BEFORE UPDATE ON public.email_forwarding_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_forwarding_rules ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS POLICIES
-- =====================================================

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- DOMAINS POLICIES
-- =====================================================

-- Users can only see their own domains
CREATE POLICY "Users can view own domains"
  ON public.domains FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert domains (during purchase)
CREATE POLICY "Users can create domains"
  ON public.domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own domains
CREATE POLICY "Users can update own domains"
  ON public.domains FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything (for backend operations)
CREATE POLICY "Service role full access to domains"
  ON public.domains FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- SUBSCRIPTIONS POLICIES
-- =====================================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage subscriptions (Stripe webhooks)
CREATE POLICY "Service role full access to subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- QUESTIONNAIRE SESSIONS POLICIES
-- =====================================================

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.questionnaire_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Anyone can create anonymous sessions
CREATE POLICY "Anyone can create sessions"
  ON public.questionnaire_sessions FOR INSERT
  WITH CHECK (true);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON public.questionnaire_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Service role full access
CREATE POLICY "Service role full access to sessions"
  ON public.questionnaire_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- TRANSACTIONS POLICIES
-- =====================================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage transactions
CREATE POLICY "Service role full access to transactions"
  ON public.transactions FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- EMAIL FORWARDING RULES POLICIES
-- =====================================================

-- Users can view forwarding rules for their domains
CREATE POLICY "Users can view own forwarding rules"
  ON public.email_forwarding_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.domains
      WHERE domains.id = email_forwarding_rules.domain_id
      AND domains.user_id = auth.uid()
    )
  );

-- Service role can manage forwarding rules
CREATE POLICY "Service role full access to forwarding rules"
  ON public.email_forwarding_rules FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, gmail_address)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'gmail_address'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- UTILITY VIEWS
-- =====================================================

-- View for user dashboard (denormalized data)
CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT
  u.id AS user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.gmail_address,

  -- Domains
  json_agg(
    DISTINCT jsonb_build_object(
      'id', d.id,
      'domain_name', d.domain_name,
      'status', d.status,
      'expires_at', d.expires_at,
      'forwarding_address', d.forwarding_address,
      'email_routing_enabled', d.email_routing_enabled
    )
  ) FILTER (WHERE d.id IS NOT NULL) AS domains,

  -- Active subscription
  (
    SELECT jsonb_build_object(
      'id', s.id,
      'status', s.status,
      'plan_type', s.plan_type,
      'current_period_end', s.current_period_end,
      'cancel_at_period_end', s.cancel_at_period_end
    )
    FROM public.subscriptions s
    WHERE s.user_id = u.id
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1
  ) AS active_subscription

FROM public.users u
LEFT JOIN public.domains d ON d.user_id = u.id
GROUP BY u.id;

-- =====================================================
-- INITIAL DATA / SEEDS (Optional)
-- =====================================================

-- You can add test data here if needed
-- Example:
-- INSERT INTO public.users (id, email, first_name, last_name, gmail_address)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'test@example.com',
--   'Test',
--   'User',
--   'testuser@gmail.com'
-- );

-- =====================================================
-- DONE!
-- =====================================================
-- Schema created successfully.
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Configure Supabase Auth settings (email templates, etc.)
-- 3. Get your SUPABASE_URL and SUPABASE_ANON_KEY
-- 4. Update your .env file
-- =====================================================
