/**
 * Cloudflare Registrar API (beta, April 2026): check + register + registration status.
 * Docs: https://developers.cloudflare.com/registrar/registrar-api/
 *
 * Registrations are billable to the account's default payment method and NON-REFUNDABLE.
 * The workflow only builds this registrar when FULFILMENT_REGISTRAR=cloudflare,
 * FULFILMENT_ALLOW_LIVE_REGISTRATION=true and the payment was a livemode Stripe event.
 */
class CloudflareRegistrar {
  constructor(client) {
    this.client = client;
    this.name = 'cloudflare';
  }

  async check(domain) {
    const { result } = await this.client.request('POST', this.client.account('/registrar/domain-check'), {
      body: { domains: [domain] }
    });
    const d = (result?.domains || []).find(x => x.name === domain);
    if (!d) return { registrable: false, reason: 'no_result' };
    return {
      registrable: d.registrable === true,
      reason: d.reason || null,
      tier: d.tier || null,
      priceUsd: d.pricing?.registration_cost != null ? parseFloat(d.pricing.registration_cost) : null,
      renewalUsd: d.pricing?.renewal_cost != null ? parseFloat(d.pricing.renewal_cost) : null,
      currency: d.pricing?.currency || 'USD'
    };
  }

  async register(domain, { contact } = {}) {
    const body = { domain_name: domain };
    if (contact) body.contacts = { registrant: contact };
    const { result } = await this.client.request('POST', this.client.account('/registrar/registrations'), {
      body,
      // Return at once; the runner polls registration-status. Never re-POST on 202.
      headers: { Prefer: 'respond-async' }
    });
    return normaliseStatus(result);
  }

  async getStatus(domain) {
    const { status, result } = await this.client.request(
      'GET',
      this.client.account(`/registrar/registrations/${encodeURIComponent(domain)}/registration-status`),
      { allow404: true }
    );
    if (status === 404 || !result) return null;
    return normaliseStatus(result);
  }
}

function normaliseStatus(result) {
  if (!result) return null;
  const reg = result.context?.registration || {};
  return {
    state: result.state || (result.completed ? 'succeeded' : 'in_progress'),
    expiresAt: reg.expires_at || null,
    error: result.error ? { code: result.error.code, message: result.error.message } : null
  };
}

module.exports = { CloudflareRegistrar };
