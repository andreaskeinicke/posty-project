/**
 * Wiring for the support agent. Nothing here runs unless SUPPORT_AGENT_ENABLED=true.
 */
const { loadSupportConfig } = require('./config');
const { SupportAgent } = require('./agent');
const { SupabaseSignalStore, MemorySignalStore } = require('./signals');
const { SupabaseEscalationStore, MemoryEscalationStore } = require('./escalations');

let singleton = null;

function getSupport() {
  if (singleton) return singleton;
  const config = loadSupportConfig();
  if (!config.enabled) return null;

  let signals; let escalations;
  try {
    const { supabaseAdmin } = require('../config/supabase');
    if (!supabaseAdmin) throw new Error('no supabase');
    signals = new SupabaseSignalStore(supabaseAdmin);
    escalations = new SupabaseEscalationStore(supabaseAdmin);
  } catch (_) {
    console.warn('support: Supabase not configured, signals and escalations kept in memory only');
    signals = new MemorySignalStore();
    escalations = new MemoryEscalationStore();
  }

  let client = null;
  if (config.hasApiKey) {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  singleton = { config, signals, escalations, agent: new SupportAgent({ config, client, signals, escalations }) };
  console.log(`💬 Support agent on (model=${config.model}, llm=${Boolean(client)})`);
  return singleton;
}

module.exports = { getSupport };
