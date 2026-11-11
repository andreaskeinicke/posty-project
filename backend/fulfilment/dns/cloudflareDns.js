const { planUpsert } = require('./records');

/**
 * DNS + Email Routing on Cloudflare. All operations are idempotent: safe to repeat after a crash.
 */
class CloudflareDns {
  constructor(client) {
    this.client = client;
    this.name = 'cloudflare';
  }

  async ensureZone(domain) {
    const found = await this.client.request('GET', `/zones?name=${encodeURIComponent(domain)}&account.id=${this.client.accountId}`);
    let zone = Array.isArray(found.result) ? found.result[0] : null;
    if (!zone) {
      // Registering through Cloudflare Registrar normally creates the zone; this covers the gap.
      const created = await this.client.request('POST', '/zones', {
        body: { name: domain, account: { id: this.client.accountId }, type: 'full' }
      });
      zone = created.result;
    }
    return { zoneId: zone.id, nameservers: zone.name_servers || [], status: zone.status };
  }

  async listRecords(zoneId) {
    const { result } = await this.client.request('GET', `/zones/${zoneId}/dns_records?per_page=500`);
    return (result || []).map(r => ({ id: r.id, type: r.type, name: r.name, content: r.content, priority: r.priority }));
  }

  async upsertRecords(zoneId, records) {
    const existing = await this.listRecords(zoneId);
    const plan = planUpsert(existing, records);
    for (const r of plan.create) {
      await this.client.request('POST', `/zones/${zoneId}/dns_records`, { body: toCf(r) });
    }
    for (const { id, record } of plan.replace) {
      await this.client.request('PATCH', `/zones/${zoneId}/dns_records/${id}`, { body: toCf(record) });
    }
    return { created: plan.create.length, replaced: plan.replace.length, unchanged: plan.unchanged.length };
  }

  /** Turns on Email Routing; Cloudflare adds its own MX + SPF records. */
  async enableEmailRouting(zoneId) {
    await this.client.request('POST', `/zones/${zoneId}/email/routing/enable`, { body: {} });
    return { enabled: true };
  }

  /**
   * Make sure the customer's current inbox is a destination. Cloudflare emails them a
   * verification link the first time; forwarding only works after they click it.
   */
  async ensureDestination(email) {
    const path = this.client.account('/email/routing/addresses');
    const { result } = await this.client.request('GET', `${path}?per_page=50&email=${encodeURIComponent(email)}`);
    let dest = (result || []).find(a => a.email?.toLowerCase() === email.toLowerCase());
    if (!dest) {
      const created = await this.client.request('POST', path, { body: { email } });
      dest = created.result;
    }
    return { verified: Boolean(dest?.verified) };
  }

  async ensureCatchAll(zoneId, destination) {
    await this.client.request('PUT', `/zones/${zoneId}/email/routing/rules/catch_all`, {
      body: {
        enabled: true,
        name: 'Posty: forward everything',
        matchers: [{ type: 'all' }],
        actions: [{ type: 'forward', value: [destination] }]
      }
    });
    return { ok: true };
  }
}

function toCf(r) {
  const body = { type: r.type, name: r.name, content: r.content, ttl: r.ttl || 1, comment: 'managed by Posty' };
  if (r.type === 'MX') body.priority = r.priority;
  return body;
}

module.exports = { CloudflareDns };
