/**
 * Wiring for the fulfilment workflow. Nothing here runs unless FULFILMENT_ENABLED=true.
 */
const dnsPromises = require('dns').promises;
const { loadConfig } = require('./config');
const { FulfilmentWorkflow } = require('./workflow');
const { FakeRegistrar } = require('./registrars/fakeRegistrar');
const { CloudflareRegistrar } = require('./registrars/cloudflareRegistrar');
const { FakeDns } = require('./dns/fakeDns');
const { CloudflareDns } = require('./dns/cloudflareDns');
const { CloudflareClient } = require('./cloudflareClient');
const { Notifier } = require('./notifier');
const { StripePayments } = require('./payments');

/** Resolver that reads the fake DNS, so dry runs can finish end to end. */
function fakeResolver(fakeDns) {
  return {
    resolveMx: async domain => fakeDns.recordsFor(domain).filter(r => r.type === 'MX')
      .map(r => ({ exchange: r.content, priority: r.priority }))
  };
}

function buildProviders(config, overrides = {}) {
  const fake = {
    registrar: overrides.fakeRegistrar || new FakeRegistrar(),
    dns: overrides.fakeDns || new FakeDns()
  };
  fake.resolver = overrides.fakeResolver || fakeResolver(fake.dns);

  let live = null;
  if (config.registrar === 'cloudflare' && config.allowLiveRegistration && config.cloudflare.apiToken && config.cloudflare.accountId) {
    const client = new CloudflareClient(config.cloudflare);
    live = { registrar: new CloudflareRegistrar(client), dns: new CloudflareDns(client), resolver: dnsPromises };
  }
  if (overrides.live) live = overrides.live;

  // Every order picks its providers from its own dry_run flag, fixed when the order was created.
  return order => {
    if (order.dry_run) return fake;
    if (!live) throw Object.assign(new Error('Live order but live providers are not configured'), { transient: false });
    return live;
  };
}

let singleton = null;

function getFulfilment() {
  if (singleton) return singleton;
  const config = loadConfig();
  if (!config.enabled) return null;
  const { supabaseAdmin } = require('../config/supabase');
  const { SupabaseOrderStore } = require('./store/supabaseStore');
  const stripeService = require('../services/stripeService');
  let emailService = null;
  try { emailService = require('../services/emailService'); } catch (_) { /* optional */ }
  singleton = {
    config,
    workflow: new FulfilmentWorkflow({
      store: new SupabaseOrderStore(supabaseAdmin),
      providersFor: buildProviders(config),
      payments: stripeService.stripe ? new StripePayments(stripeService.stripe) : null,
      notifier: new Notifier({ emailService, frontendUrl: config.frontendUrl }),
      config
    })
  };
  return singleton;
}

/** Background runner: picks up due orders (retries, polling, webhook hand-offs). */
function startRunner() {
  const f = getFulfilment();
  if (!f) return null;
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await f.workflow.tick(); } catch (err) { console.error(`fulfilment runner: ${err.message}`); } finally { running = false; }
  }, f.config.pollMs);
  timer.unref?.();
  console.log(`📦 Fulfilment runner on (every ${f.config.pollMs / 1000}s, registrar=${f.config.registrar}, live=${f.config.allowLiveRegistration})`);
  return timer;
}

module.exports = { getFulfilment, startRunner, buildProviders, fakeResolver };
