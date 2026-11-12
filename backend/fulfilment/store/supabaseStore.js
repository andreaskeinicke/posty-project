/**
 * OrderStore on Supabase (tables from migrations/add_fulfilment_orders.sql).
 * Uses the service-role client; the tables have RLS on and no public policies.
 */
class SupabaseOrderStore {
  constructor(client) { this.db = client; }

  async createIfAbsent(order) {
    // stripe_session_id is UNIQUE: Stripe retries webhooks, so a duplicate insert is normal.
    const { data, error } = await this.db.from('fulfilment_orders')
      .upsert(order, { onConflict: 'stripe_session_id', ignoreDuplicates: true })
      .select();
    if (error) throw new Error(`createIfAbsent failed: ${error.message}`);
    if (data && data.length) return { order: data[0], created: true };
    return { order: await this.getBySession(order.stripe_session_id), created: false };
  }

  async get(id) { return this._one('id', id); }
  async getByToken(token) { return this._one('status_token', token); }
  async getBySession(sessionId) { return this._one('stripe_session_id', sessionId); }

  async _one(col, val) {
    const { data, error } = await this.db.from('fulfilment_orders').select('*').eq(col, val).maybeSingle();
    if (error) throw new Error(`fulfilment_orders lookup failed: ${error.message}`);
    return data;
  }

  async update(id, patch) {
    const { data, error } = await this.db.from('fulfilment_orders')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw new Error(`update failed: ${error.message}`);
    return data;
  }

  /** Lease the order so a webhook retry and the runner never work the same order at once. */
  async claim(id, owner, leaseMs, now = new Date()) {
    const nowIso = now.toISOString();
    const { data, error } = await this.db.from('fulfilment_orders')
      .update({ lease_owner: owner, lease_until: new Date(now.getTime() + leaseMs).toISOString() })
      .eq('id', id)
      .or(`lease_until.is.null,lease_until.lt.${nowIso},lease_owner.eq.${owner}`)
      .select();
    if (error) throw new Error(`claim failed: ${error.message}`);
    return data && data.length ? data[0] : null;
  }

  async release(id, owner, patch = {}) {
    const { data, error } = await this.db.from('fulfilment_orders')
      .update({ ...patch, lease_owner: null, lease_until: null, updated_at: new Date().toISOString() })
      .eq('id', id).eq('lease_owner', owner).select();
    if (error) throw new Error(`release failed: ${error.message}`);
    return data && data.length ? data[0] : null;
  }

  async listDue(now = new Date(), limit = 20) {
    const { data, error } = await this.db.from('fulfilment_orders').select('*')
      // active and due (null = now), or waiting on a customer step we poll (forwarding verification)
      .or(`and(state.eq.active,next_attempt_at.is.null),and(state.in.(active,awaiting_customer),next_attempt_at.lte.${now.toISOString()})`)
      .order('next_attempt_at', { ascending: true, nullsFirst: true })
      .limit(limit);
    if (error) throw new Error(`listDue failed: ${error.message}`);
    return data || [];
  }

  async list({ state, limit = 50 } = {}) {
    let q = this.db.from('fulfilment_orders').select('*').order('created_at', { ascending: false }).limit(limit);
    if (state) q = q.eq('state', state);
    const { data, error } = await q;
    if (error) throw new Error(`list failed: ${error.message}`);
    return data || [];
  }

  async addEvent(orderId, type, data = {}) {
    const { error } = await this.db.from('fulfilment_events').insert({ order_id: orderId, type, data });
    if (error) console.error(`fulfilment_events insert failed (${type}): ${error.message}`);
  }

  async events(orderId) {
    const { data, error } = await this.db.from('fulfilment_events').select('*')
      .eq('order_id', orderId).order('created_at', { ascending: true });
    if (error) throw new Error(`events failed: ${error.message}`);
    return data || [];
  }
}

module.exports = { SupabaseOrderStore };
