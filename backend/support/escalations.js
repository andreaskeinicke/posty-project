/**
 * Escalations to a person. The agent hands these over and never acts on them.
 * Today an escalation is stored and logged to the server console. Emailing Andreas is
 * left for when an email provider is wired (SUPPORT_ESCALATION_EMAIL names the inbox).
 */
const { redact } = require('./trust');

const clean = s => redact(s).replace(/[^\s@,;<>()]+@[^\s@,;<>()]+\.[a-z]{2,}/gi, '[email]').slice(0, 1000);

class MemoryEscalationStore {
  constructor() { this.rows = []; }
  async create(row) { const r = { id: `esc_${this.rows.length + 1}`, created_at: new Date().toISOString(), status: 'open', ...row }; this.rows.push(r); return r; }
  async listOpen(limit = 50) { return this.rows.filter(r => r.status === 'open').slice(-limit).reverse(); }
}

class SupabaseEscalationStore {
  constructor(client) { this.db = client; }
  async create(row) {
    const { data, error } = await this.db.from('support_escalations').insert(row).select('id, created_at, status').single();
    if (error) throw new Error(`support_escalations insert: ${error.message}`);
    return data;
  }
  async listOpen(limit = 50) {
    const { data, error } = await this.db.from('support_escalations').select('*')
      .eq('status', 'open').order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error(`support_escalations read: ${error.message}`);
    return data || [];
  }
}

async function escalate(store, { category, orderId = null, summary, messages = [] }, log = console) {
  const row = {
    category,
    order_id: orderId,
    summary: clean(summary || ''),
    transcript: messages.slice(-6).map(m => ({ role: m.role, content: clean(m.content) }))
  };
  log.log(`🙋 support escalation (${category})${orderId ? ` order ${orderId}` : ''}: ${row.summary.slice(0, 160)}`);
  if (!store) return null;
  try { return await store.create(row); } catch (err) { log.error(`escalation not stored: ${err.message}`); return null; }
}

module.exports = { MemoryEscalationStore, SupabaseEscalationStore, escalate };
