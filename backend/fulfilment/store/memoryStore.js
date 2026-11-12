const crypto = require('crypto');

/**
 * In-memory OrderStore. Same contract as SupabaseOrderStore; used by tests.
 */
class MemoryOrderStore {
  constructor() {
    this.orders = new Map();
    this.eventsLog = [];
  }

  async createIfAbsent(order) {
    const existing = [...this.orders.values()].find(o => o.stripe_session_id === order.stripe_session_id);
    if (existing) return { order: clone(existing), created: false };
    const now = new Date().toISOString();
    const row = { id: crypto.randomUUID(), created_at: now, updated_at: now, lease_until: null, lease_owner: null, ...order };
    this.orders.set(row.id, row);
    return { order: clone(row), created: true };
  }

  async get(id) { return clone(this.orders.get(id) || null); }
  async getByToken(token) { return clone([...this.orders.values()].find(o => o.status_token === token) || null); }
  async getBySession(sessionId) { return clone([...this.orders.values()].find(o => o.stripe_session_id === sessionId) || null); }

  async update(id, patch) {
    const row = this.orders.get(id);
    if (!row) throw new Error(`order ${id} not found`);
    Object.assign(row, clone(patch), { updated_at: new Date().toISOString() });
    return clone(row);
  }

  async claim(id, owner, leaseMs, now = new Date()) {
    const row = this.orders.get(id);
    if (!row) return null;
    if (row.lease_until && new Date(row.lease_until) > now && row.lease_owner !== owner) return null;
    row.lease_owner = owner;
    row.lease_until = new Date(now.getTime() + leaseMs).toISOString();
    return clone(row);
  }

  async release(id, owner, patch = {}) {
    const row = this.orders.get(id);
    if (!row || row.lease_owner !== owner) return null;
    Object.assign(row, clone(patch), { lease_owner: null, lease_until: null, updated_at: new Date().toISOString() });
    return clone(row);
  }

  async listDue(now = new Date(), limit = 20) {
    return [...this.orders.values()]
      .filter(o => (o.state === 'active' && (!o.next_attempt_at || new Date(o.next_attempt_at) <= now)) ||
        (o.state === 'awaiting_customer' && o.next_attempt_at && new Date(o.next_attempt_at) <= now))
      .slice(0, limit).map(clone);
  }

  async list({ state, limit = 50 } = {}) {
    return [...this.orders.values()].filter(o => !state || o.state === state).slice(0, limit).map(clone);
  }

  async addEvent(orderId, type, data = {}) {
    this.eventsLog.push({ order_id: orderId, type, data: clone(data), created_at: new Date().toISOString() });
  }

  async events(orderId) { return this.eventsLog.filter(e => e.order_id === orderId).map(clone); }
}

function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

module.exports = { MemoryOrderStore };
