/**
 * Money compensation for orders we cannot fulfil (the name was taken between search and
 * payment). Only used when FULFILMENT_AUTO_REFUND=true; otherwise a person decides.
 *
 * Stripe Checkout in subscription mode captures at once, so a true "authorise, register,
 * capture" is not available there. The equivalent is: check right before checkout, check
 * again right before registering, and refund + cancel if registration is impossible.
 */
class StripePayments {
  constructor(stripe) { this.stripe = stripe; }

  async refundAndCancel(order, { cause = 'domain_unavailable' } = {}) {
    const result = { refunded: false, cancelled: false };
    const pi = order.stripe_payment_intent_id || await this._paymentIntentForInvoice(order.stripe_invoice_id);
    if (pi) {
      // Idempotency key: a retried compensation never refunds twice.
      await this.stripe.refunds.create({ payment_intent: pi, reason: 'requested_by_customer',
        metadata: { posty_order: order.id, cause } },
      { idempotencyKey: `posty-refund-${order.id}` });
      result.refunded = true;
    }
    if (order.stripe_subscription_id) {
      try {
        await this.stripe.subscriptions.cancel(order.stripe_subscription_id);
      } catch (err) {
        if (!/No such subscription|canceled/i.test(err.message)) throw err;
      }
      result.cancelled = true;
    }
    if (!result.refunded) throw Object.assign(new Error('No payment found to refund'), { transient: false });
    return result;
  }

  async _paymentIntentForInvoice(invoiceId) {
    if (!invoiceId) return null;
    // Newer API versions moved the payment intent from invoice.payment_intent to invoice payments.
    const invoice = await this.stripe.invoices.retrieve(invoiceId);
    if (invoice.payment_intent) return typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent.id;
    if (this.stripe.invoicePayments?.list) {
      const payments = await this.stripe.invoicePayments.list({ invoice: invoiceId, limit: 1 });
      const p = payments.data?.[0]?.payment;
      if (p?.payment_intent) return typeof p.payment_intent === 'string' ? p.payment_intent : p.payment_intent.id;
    }
    return null;
  }
}

module.exports = { StripePayments };
