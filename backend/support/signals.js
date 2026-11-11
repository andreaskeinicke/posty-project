/**
 * Support signals for the weekly learning loop (see the operating model, "How the system
 * learns from customers"). One row per support turn, setup check or escalation.
 *
 * Rows hold the customer's words only after redaction, cut to 500 characters, with no
 * email address, IP or token. They are kept 12 months, then the text is dropped.
 */
const { redact } = require('./trust');

const TOPICS = [
  ['google_signup', /\b(google|workspace|verif|txt|site-verification|admin console)/i],
  ['dkim', /\bdkim\b/i],
  ['dns', /\b(dns|mx|spf|dmarc|record|propagat|nameserver)/i],
  ['spam_folder', /\b(spam|junk|not arriv|doesn'?t arrive|no mail|not receiv|bounce)/i],
  ['forwarding', /\b(forward|cloudflare|confirm(ation)? (email|link))/i],
  ['billing', /\b(price|cost|bill|invoice|receipt|vat|pay|charge|cancel|refund)/i],
  ['ownership', /\b(own|registrant|transfer|whois)/i],
  ['old_mail', /\b(old mail|import|migrat|hotmail|outlook|contacts)/i],
  ['phone', /\b(phone|iphone|android|mobile|app)\b/i],
  ['family', /\b(family|wife|husband|kids|partner|extra (person|user|address))/i],
  ['finder', /\b(search|available|taken|ending|tld|suggest)/i]
];

function topicOf(text) {
  for (const [topic, re] of TOPICS) if (re.test(text)) return topic;
  return 'other';
}

function cleanText(text) {
  return redact(text).replace(/[^\s@,;<>()]+@[^\s@,;<>()]+\.[a-z]{2,}/gi, '[email]').slice(0, 500);
}

class MemorySignalStore {
  constructor() { this.rows = []; }
  async add(row) { const r = { id: this.rows.length + 1, created_at: new Date().toISOString(), ...row }; this.rows.push(r); return r; }
  async since(date) { return this.rows.filter(r => new Date(r.created_at) >= date); }
}

class SupabaseSignalStore {
  constructor(client) { this.db = client; }
  async add(row) {
    const { data, error } = await this.db.from('support_signals').insert(row).select('id, created_at').single();
    if (error) throw new Error(`support_signals insert: ${error.message}`);
    return data;
  }
  async since(date) {
    const { data, error } = await this.db.from('support_signals').select('*')
      .gte('created_at', date.toISOString()).order('created_at', { ascending: true }).limit(5000);
    if (error) throw new Error(`support_signals read: ${error.message}`);
    return data || [];
  }
}

/** Logging must never break a reply: failures go to the console only. */
async function logSignal(store, { kind, text, topic, escalated = false, category = null, resolvedByAgent = null, orderStep = null, tier = null, source = 'chat', meta = {} }, log = console) {
  if (!store) return null;
  const clean = text ? cleanText(text) : null;
  try {
    return await store.add({
      kind,
      source,
      topic: topic || (clean ? topicOf(clean) : 'other'),
      category,
      escalated,
      resolved_by_agent: resolvedByAgent,
      order_step: orderStep,
      tier,
      text: clean,
      meta
    });
  } catch (err) {
    log.error(`support signal not logged: ${err.message}`);
    return null;
  }
}

/**
 * Weekly report: clusters by topic, ranked by count, with escalation rate and sample
 * questions, plus a proposed fix type for each cluster.
 */
function weeklyReport(rows, { now = new Date(), top = 5 } = {}) {
  const byTopic = new Map();
  for (const r of rows) {
    const t = r.topic || 'other';
    if (!byTopic.has(t)) byTopic.set(t, { topic: t, count: 0, escalated: 0, unresolved: 0, samples: [] });
    const c = byTopic.get(t);
    c.count++;
    if (r.escalated) c.escalated++;
    if (r.resolved_by_agent === false) c.unresolved++;
    if (r.text && c.samples.length < 3 && !c.samples.includes(r.text)) c.samples.push(r.text);
  }
  const FIX = {
    google_signup: 'Clearer copy on the Moving in "your turn" step, or a short screen recording',
    dkim: 'Add DKIM prompts to the day-after email',
    dns: 'Check the fulfilment record template and the setup coach checks',
    spam_folder: 'Push DKIM earlier; add a deliverability note to the welcome email',
    forwarding: 'Resend and explain the Cloudflare confirmation email',
    billing: 'Pricing page and FAQ copy',
    ownership: 'FAQ copy on ownership and transfers',
    finder: 'Finder ranking or TLD coverage',
    other: 'Read the samples and tag by hand'
  };
  const clusters = [...byTopic.values()].sort((a, b) => b.count - a.count || b.escalated - a.escalated);
  const total = rows.length;
  const escalated = rows.filter(r => r.escalated).length;
  const answered = rows.filter(r => r.kind === 'chat_turn');
  const solved = answered.filter(r => r.resolved_by_agent === true).length;
  return {
    generatedAt: now.toISOString(),
    total,
    escalated,
    solvedByAgentRate: answered.length ? Math.round((solved / answered.length) * 100) : null,
    injectionAttempts: rows.filter(r => r.meta && r.meta.injection).length,
    top: clusters.slice(0, top).map(c => ({ ...c, proposedFix: FIX[c.topic] || FIX.other }))
  };
}

function reportMarkdown(rep) {
  const lines = [
    `# Posty support, week to ${rep.generatedAt.slice(0, 10)}`,
    '',
    `${rep.total} signals, ${rep.escalated} escalated to Andreas` +
      (rep.solvedByAgentRate === null ? '.' : `, ${rep.solvedByAgentRate}% of chat turns answered without a person.`),
    rep.injectionAttempts ? `${rep.injectionAttempts} messages tried to change the agent's rules (no action possible; logged).` : '',
    '',
    '| Topic | Count | Escalated | Proposed fix |',
    '|---|---|---|---|',
    ...rep.top.map(c => `| ${c.topic} | ${c.count} | ${c.escalated} | ${c.proposedFix} |`),
    '',
    ...rep.top.flatMap(c => c.samples.length ? [`**${c.topic}**`, ...c.samples.map(s => `- "${s}"`), ''] : [])
  ];
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

module.exports = { MemorySignalStore, SupabaseSignalStore, logSignal, weeklyReport, reportMarkdown, topicOf, cleanText };
