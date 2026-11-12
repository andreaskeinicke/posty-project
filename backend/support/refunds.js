/**
 * Small automatic refunds (Andreas, 2026-11-12: "do what is recommended").
 *
 * The support agent may refund on its own only when ALL of these hold. Everything else goes
 * to Andreas, as before.
 *   - the customer is on their own order page (the private order link is the only proof)
 *   - the whole order cost at most SUPPORT_AUTO_REFUND_MAX_USD (default $10; 0 turns it off)
 *   - the domain is not registered yet (a registered domain cannot be returned)
 *   - the order is under 14 days old and still open
 *   - fewer than SUPPORT_AUTO_REFUND_DAILY_CAP automatic refunds today (default 5)
 * Andreas still gets a note for every automatic refund. Test orders (dry runs) never touch
 * money. Stripe's idempotency key means a retried refund never pays out twice.
 */
const POSTY_FIRST_MONTH_USD = 5;
const MAX_AGE_DAYS = 14;
const OPEN_STATES = new Set(['active', 'awaiting_customer', 'needs_human']);

function orderTotalUsd(order) {
  return Math.round(((Number(order.domain_price_usd) || 0) + POSTY_FIRST_MONTH_USD) * 100) / 100;
}

/** Pure check. Returns { eligible, reason, amountUsd }. */
function refundEligibility(order, { maxUsd, now = new Date(), refundsToday = 0, dailyCap = 5 } = {}) {
  const amountUsd = order ? orderTotalUsd(order) : 0;
  const no = reason => ({ eligible: false, reason, amountUsd });
  if (!order) return no('no_order');
  if (!(maxUsd > 0)) return no('auto_refunds_off');
  if (!OPEN_STATES.has(order.state)) return no(order.state === 'refunded' ? 'already_refunded' : 'order_closed');
  if (order.steps && order.steps.register_domain) return no('domain_registered');
  const created = Date.parse(order.created_at);
  if (!Number.isFinite(created) || now.getTime() - created > MAX_AGE_DAYS * 864e5) return no('too_old');
  if (amountUsd > maxUsd) return no('over_limit');
  if (refundsToday >= dailyCap) return no('daily_cap');
  return { eligible: true, reason: 'ok', amountUsd };
}

class AutoRefunder {
  /** deps: { store (fulfilment order store), payments (StripePayments or null), maxUsd, dailyCap, clock, log } */
  constructor({ store, payments = null, maxUsd = 10, dailyCap = 5, clock = () => new Date(), log = console }) {
    Object.assign(this, { store, payments, maxUsd, dailyCap, clock, log });
    this.day = null;
    this.count = 0;
  }

  _today() {
    const d = this.clock().toISOString().slice(0, 10);
    if (d !== this.day) { this.day = d; this.count = 0; }
    return this.count;
  }

  /** Try to refund this order. Returns { refunded, amountUsd, reason, simulated }. Never throws. */
  async tryRefund(orderId) {
    try {
      // Read again right before acting, so a domain registered a moment ago is caught.
      const order = await this.store.get(orderId);
      const check = refundEligibility(order, { maxUsd: this.maxUsd, now: this.clock(), refundsToday: this._today(), dailyCap: this.dailyCap });
      if (!check.eligible) return { refunded: false, ...check };
      const simulated = Boolean(order.dry_run);
      if (!simulated) {
        if (!this.payments) return { refunded: false, reason: 'no_payments', amountUsd: check.amountUsd };
        await this.payments.refundAndCancel(order, { cause: 'customer_request_auto' });
      }
      this.count += 1;
      await this.store.update(order.id, { state: 'refunded', next_attempt_at: null, last_error: 'refunded on customer request (automatic)' });
      await this.store.addEvent(order.id, 'refunded', { automatic: true, amount_usd: check.amountUsd, dry_run: simulated });
      return { refunded: true, amountUsd: check.amountUsd, reason: 'ok', simulated };
    } catch (err) {
      this.log.error('[support] automatic refund failed, passing to a person:', err.message);
      return { refunded: false, reason: 'error' };
    }
  }
}

function autoRefundReply(amountUsd) {
  return `Done. I have refunded $${amountUsd.toFixed(2)} to the card you paid with and cancelled the order, so nothing more will be charged. Banks usually show it within 5 to 10 days. Andreas gets a note too, in case you want to tell us what went wrong.`;
}

module.exports = { refundEligibility, AutoRefunder, autoRefundReply, orderTotalUsd, POSTY_FIRST_MONTH_USD };
