/**
 * Fulfilment flags. Everything defaults to OFF / fake so that merging this
 * code changes nothing in production until the flags are set on purpose.
 *
 *   FULFILMENT_ENABLED=true            webhook creates fulfilment orders and the runner works them
 *   FULFILMENT_REGISTRAR=fake|cloudflare
 *   FULFILMENT_ALLOW_LIVE_REGISTRATION=true
 *                                       required (together with a livemode Stripe event) before
 *                                       an order may register a real domain and write real DNS.
 *                                       Every other order is a dry run on the fake registrar
 *                                       and fake DNS, so Stripe test payments never spend money.
 *   FULFILMENT_AUTO_REFUND=true        refund + cancel automatically when the name turns out to
 *                                       be unavailable. Off: the order goes to needs_human.
 *   FULFILMENT_DEFAULT_TIER=workspace|forward
 *   FULFILMENT_PRICE_TOLERANCE_USD     how much the registry price may exceed what the customer
 *                                       paid for the domain before we stop (default 1.00)
 *   FULFILMENT_REQUIRE_CUSTOMER_REGISTRANT=true|false (default true)
 *   FULFILMENT_ADMIN_TOKEN             bearer token for the ops endpoints (unset = ops API off)
 *   FULFILMENT_POLL_MS                 runner interval (default 30000)
 *   GOOGLE_WORKSPACE_SIGNUP_URL        where "Continue with Google" sends the customer
 */
const bool = (v, d = false) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true');

function loadConfig(env = process.env) {
  return {
    enabled: bool(env.FULFILMENT_ENABLED),
    registrar: env.FULFILMENT_REGISTRAR === 'cloudflare' ? 'cloudflare' : 'fake',
    allowLiveRegistration: bool(env.FULFILMENT_ALLOW_LIVE_REGISTRATION),
    autoRefund: bool(env.FULFILMENT_AUTO_REFUND),
    defaultTier: env.FULFILMENT_DEFAULT_TIER === 'forward' ? 'forward' : 'workspace',
    priceToleranceUsd: Number.isFinite(parseFloat(env.FULFILMENT_PRICE_TOLERANCE_USD))
      ? parseFloat(env.FULFILMENT_PRICE_TOLERANCE_USD) : 1.0,
    requireCustomerRegistrant: bool(env.FULFILMENT_REQUIRE_CUSTOMER_REGISTRANT, true),
    adminToken: env.FULFILMENT_ADMIN_TOKEN || null,
    pollMs: parseInt(env.FULFILMENT_POLL_MS, 10) || 30000,
    maxAttempts: parseInt(env.FULFILMENT_MAX_ATTEMPTS, 10) || 8,
    workspaceSignupUrl: env.GOOGLE_WORKSPACE_SIGNUP_URL || 'https://workspace.google.com/business/signup/welcome',
    frontendUrl: env.FRONTEND_URL || 'http://localhost:3000',
    cloudflare: {
      apiToken: env.CLOUDFLARE_API_TOKEN || null,
      accountId: env.CLOUDFLARE_ACCOUNT_ID || null
    }
  };
}

const TIERS = ['workspace', 'forward'];

module.exports = { loadConfig, TIERS };
