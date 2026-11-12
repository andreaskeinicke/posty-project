/**
 * MailBackend interface (duck-typed):
 *
 *   tier                              'workspace' | 'forward'
 *   provision(order, ctx)             -> { ready: true } | { ready: false, action }
 *                                        Does the provider-side setup we can do ourselves and
 *                                        reports the one thing only the customer can do.
 *   records(order)                    -> DNS records to write (see dns/records.js)
 *   verify(order, ctx)                -> { ok, detail }  checks public DNS, read-only
 *
 * ctx = { dns, resolver, config }
 */
const { WorkspaceBackend } = require('./workspaceBackend');
const { ForwardingBackend } = require('./forwardingBackend');

function backendFor(tier) {
  if (tier === 'forward') return new ForwardingBackend();
  if (tier === 'workspace') return new WorkspaceBackend();
  throw new Error(`Unknown mail tier: ${tier}`);
}

module.exports = { backendFor };
