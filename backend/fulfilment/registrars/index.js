/**
 * Registrar interface (duck-typed):
 *
 *   check(domain)                -> { registrable, reason?, priceUsd?, renewalUsd?, tier? }
 *   register(domain, { contact }) -> { state, expiresAt?, error? }
 *   getStatus(domain)            -> { state, expiresAt?, error? } | null (never requested)
 *
 * state is one of: in_progress | succeeded | failed | action_required | blocked
 * (the Cloudflare Registrar API workflow states). Implementations must be safe to call
 * again after a crash: the workflow always calls getStatus() before register().
 */
const REGISTRATION_STATES = ['in_progress', 'succeeded', 'failed', 'action_required', 'blocked'];

/** Reasons a name cannot be registered that mean "someone else has it". Refundable. */
const UNAVAILABLE_REASONS = ['domain_unavailable'];

module.exports = { REGISTRATION_STATES, UNAVAILABLE_REASONS };
