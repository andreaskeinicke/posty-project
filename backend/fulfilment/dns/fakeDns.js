const { planUpsert } = require('./records');

/** In-memory DNS + routing provider for tests and dry runs. */
class FakeDns {
  constructor() {
    this.name = 'fake';
    this.zones = new Map(); // domain -> { zoneId, records: [], routing: false, catchAll: null }
    this.zoneById = new Map();
    this.destinations = new Map(); // email -> verified
    this.nextId = 1;
  }

  async ensureZone(domain) {
    if (!this.zones.has(domain)) {
      const zone = { zoneId: `zone_${this.nextId++}`, domain, records: [], routing: false, catchAll: null };
      this.zones.set(domain, zone);
      this.zoneById.set(zone.zoneId, zone);
    }
    const z = this.zones.get(domain);
    return { zoneId: z.zoneId, nameservers: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'], status: 'active' };
  }

  async upsertRecords(zoneId, records) {
    const zone = this.zoneById.get(zoneId);
    if (!zone) throw new Error(`unknown zone ${zoneId}`);
    const plan = planUpsert(zone.records, records);
    for (const r of plan.create) zone.records.push({ ...r, id: `rec_${this.nextId++}` });
    for (const { id, record } of plan.replace) {
      const i = zone.records.findIndex(x => x.id === id);
      zone.records[i] = { ...record, id };
    }
    return { created: plan.create.length, replaced: plan.replace.length, unchanged: plan.unchanged.length };
  }

  async enableEmailRouting(zoneId) {
    const zone = this.zoneById.get(zoneId);
    zone.routing = true;
    await this.upsertRecords(zoneId, [
      { type: 'MX', name: zone.domain, content: 'route1.mx.cloudflare.net', priority: 10 },
      { type: 'TXT', name: zone.domain, content: 'v=spf1 include:_spf.mx.cloudflare.net ~all', exclusivePrefix: 'v=spf1' }
    ]);
    return { enabled: true };
  }

  async ensureDestination(email) {
    if (!this.destinations.has(email)) this.destinations.set(email, false);
    return { verified: this.destinations.get(email) };
  }

  async ensureCatchAll(zoneId, destination) {
    this.zoneById.get(zoneId).catchAll = destination;
    return { ok: true };
  }

  /** test helpers */
  verifyDestination(email) { this.destinations.set(email, true); }
  recordsFor(domain) { return this.zones.get(domain)?.records || []; }
}

module.exports = { FakeDns };
