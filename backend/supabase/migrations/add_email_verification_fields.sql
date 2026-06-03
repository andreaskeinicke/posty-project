-- =====================================================
-- MIGRATION: Add Email Verification Fields to Domains
-- =====================================================
-- Run this migration in Supabase SQL Editor
-- Purpose: Add fields to track email verification workflow
-- =====================================================

-- Add new fields to domains table for Namecheap and Cloudflare integration
ALTER TABLE public.domains
  -- Namecheap registration details
  ADD COLUMN IF NOT EXISTS namecheap_domain_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS namecheap_order_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS namecheap_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE,

  -- Cloudflare nameservers (array of nameservers)
  ADD COLUMN IF NOT EXISTS cloudflare_nameservers TEXT[],
  ADD COLUMN IF NOT EXISTS nameservers_updated_at TIMESTAMP WITH TIME ZONE,

  -- Email forwarding details
  ADD COLUMN IF NOT EXISTS email_forwarding_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_forwarding_source VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_forwarding_destination VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cloudflare_rule_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cloudflare_destination_verified BOOLEAN DEFAULT FALSE,

  -- Email verification workflow
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verification_token_created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,

  -- Error tracking
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS failed_at_step INTEGER,
  ADD COLUMN IF NOT EXISTS error_timestamp TIMESTAMP WITH TIME ZONE,

  -- Activation timestamp
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_domains_verification_token ON public.domains(verification_token);
CREATE INDEX IF NOT EXISTS idx_domains_namecheap_order ON public.domains(namecheap_order_id);
CREATE INDEX IF NOT EXISTS idx_domains_email_verified ON public.domains(cloudflare_destination_verified);

-- Update status column to support new workflow states
COMMENT ON COLUMN public.domains.status IS 'Status: pending, pending_purchase, registered, cloudflare_zone_created, nameservers_updated, pending_verification, active, namecheap_registration_failed, cloudflare_setup_failed, nameserver_update_failed, email_setup_failed, registration_failed, cancelled';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- New fields added to track:
-- 1. Namecheap domain registration details
-- 2. Cloudflare nameservers and zone setup
-- 3. Email forwarding configuration
-- 4. Email verification workflow
-- 5. Error tracking for troubleshooting
-- =====================================================
