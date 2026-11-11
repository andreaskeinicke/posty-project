/**
 * Support and setup-coach flags. Everything defaults to OFF so merging this code changes
 * nothing in production until the flags are set on purpose.
 *
 *   SUPPORT_AGENT_ENABLED=true   turns on /api/support (chat, setup diagnostics) and the
 *                                Help page widget (the widget asks /api/support/status)
 *   SUPPORT_MODEL                Claude model for the support agent (default claude-sonnet-5-5)
 *   SUPPORT_ADMIN_TOKEN          bearer token for the ops endpoints (unset = ops API off)
 *   SUPPORT_ESCALATION_EMAIL     where escalations would be sent once an email provider is
 *                                wired (today they are logged and stored only)
 *   SUPPORT_MAX_TURNS            longest conversation the endpoint accepts (default 12)
 *
 * ANTHROPIC_API_KEY is shared with the finder. Without it the agent answers from the help
 * content with plain search, so the widget still works.
 */
const bool = v => String(v || '').toLowerCase() === 'true';

function loadSupportConfig(env = process.env) {
  return {
    enabled: bool(env.SUPPORT_AGENT_ENABLED),
    model: env.SUPPORT_MODEL || 'claude-sonnet-5-5',
    adminToken: env.SUPPORT_ADMIN_TOKEN || null,
    escalationEmail: env.SUPPORT_ESCALATION_EMAIL || 'hello@posty.club',
    maxTurns: parseInt(env.SUPPORT_MAX_TURNS, 10) || 12,
    maxMessageChars: 1500,
    hasApiKey: Boolean(env.ANTHROPIC_API_KEY)
  };
}

module.exports = { loadSupportConfig };
