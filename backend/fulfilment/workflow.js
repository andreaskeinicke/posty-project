/**
 * Posty fulfilment workflow: what happens after "Get this email" is paid.
 *
 * Deterministic and idempotent. No LLM anywhere in the money or DNS path. Every step can be
 * repeated after a crash or a duplicate webhook without doing anything twice:
 *
 *   register_domain  check the registry again, guard the price, register in the customer's name
 *   dns_zone         make sure the zone exists (Cloudflare)
 *   mail_setup       provider-side setup; pauses for the one thing only the customer can do
 *   mail_records     write MX / SPF / DMARC / verification (and DKIM when we have it)
 *   verify_mail      wait until public DNS shows the records
 *   complete         tell the customer
 *
 * Order states: active | awaiting_customer | done | needs_human | refunded
 */
const crypto = require('crypto');
const os = require('os');
const { backendFor } = require('./mail');
const { UNAVAILABLE_REASONS } = require('./registrars');

const STEPS = ['register_domain', 'dns_zone', 'mail_setup', 'mail_records', 'verify_mail', 'complete'];
const LEASE_MS = 2 * 60 * 1000;
const MAX_LOOP = 12;

const outcome = {
  next: (patch = {}) => ({ kind: 'next', patch }),
  wait: (ms, patch = {}) => ({ kind: 'wait', ms, patch }),
  customer: (action, pollMs = null, patch = {}) => ({ kind: 'customer', action, pollMs, patch }),
  human: (code, detail, patch = {}) => ({ kind: 'human', code, detail, patch }),
  unavailable: (detail) => ({ kind: 'unavailable', detail })
};

class FulfilmentWorkflow {
  /**
   * @param {object} deps
   * @param {object} deps.store        OrderStore
   * @param {function} deps.providersFor (order) -> { registrar, dns, resolver }
   * @param {object|null} deps.payments  StripePayments or null
   * @param {object} deps.notifier
   * @param {object} deps.config       loadConfig() result
   * @param {function} [deps.clock]
   */
  constructor({ store, providersFor, payments = null, notifier, config, clock = () => new Date() }) {
    this.store = store;
    this.providersFor = providersFor;
    this.payments = payments;
    this.notifier = notifier;
    this.config = config;
    this.clock = clock;
    this.owner = `${os.hostname()}:${process.pid}:${crypto.randomBytes(3).toString('hex')}`;
  }

  /**
   * Turn a paid Stripe Checkout session into an order. Safe to call for every webhook retry.
   */
  async createFromCheckout(session, { livemode, contact = null, contactMissing = [] } = {}) {
    const md = session.metadata || {};
    const tier = ['workspace', 'forward'].includes(md.mailTier) ? md.mailTier : this.config.defaultTier;
    const buyerEmail = session.customer_details?.email || session.customer_email || null;
    const live = Boolean(livemode) && this.config.allowLiveRegistration && this.config.registrar === 'cloudflare';
    const { order, created } = await this.store.createIfAbsent({
      stripe_session_id: session.id,
      status_token: crypto.randomBytes(24).toString('base64url'),
      livemode: Boolean(livemode),
      dry_run: !live,
      stripe_customer_id: str(session.customer),
      stripe_subscription_id: str(session.subscription),
      stripe_payment_intent_id: str(session.payment_intent),
      stripe_invoice_id: str(session.invoice),
      user_id: md.userId && md.userId !== 'guest' ? md.userId : null,
      buyer_email: buyerEmail,
      forward_to: buyerEmail,
      email_address: md.emailAddress || null,
      domain_name: String(md.domainName || '').toLowerCase().trim(),
      domain_price_usd: parseFloat(md.domainPrice) || 0,
      tier,
      state: 'active',
      step: STEPS[0],
      attempts: 0,
      next_attempt_at: null,
      registrant: contact,
      registration: { contact_missing: contactMissing },
      mail: {},
      steps: { payment_received: { at: this.clock().toISOString() } }
    });
    if (created) await this.store.addEvent(order.id, 'order_created', { tier, dry_run: order.dry_run, livemode: order.livemode });
    return { order, created };
  }

  /** Work one order as far as it can go right now. Returns the latest order row. */
  async advance(orderId) {
    let order = await this.store.claim(orderId, this.owner, LEASE_MS, this.clock());
    if (!order) return this.store.get(orderId); // someone else is on it
    try {
      for (let i = 0; i < MAX_LOOP; i++) {
        if (!['active', 'awaiting_customer'].includes(order.state)) break;
        const result = await this._runStep(order);
        const { order: next, stop } = await this._apply(order, result);
        order = next;
        if (stop) break;
      }
    } finally {
      const released = await this.store.release(orderId, this.owner);
      if (released) order = released;
    }
    return order;
  }

  /** Runner entry point: work every order that is due. */
  async tick(limit = 20) {
    const due = await this.store.listDue(this.clock(), limit);
    const results = [];
    for (const o of due) {
      try { results.push(await this.advance(o.id)); } catch (err) {
        console.error(`fulfilment tick: order ${o.id} crashed: ${err.message}`);
      }
    }
    return results;
  }

  async _runStep(order) {
    const handler = this[`_step_${order.step}`];
    if (!handler) return outcome.human('unknown_step', order.step);
    try {
      return await handler.call(this, order);
    } catch (err) {
      return { kind: 'error', error: err };
    }
  }

  async _apply(order, r) {
    const now = this.clock();
    const nowIso = now.toISOString();
    const stepName = order.step;

    if (r.kind === 'next') {
      const idx = STEPS.indexOf(stepName);
      const steps = { ...(order.steps || {}), [stepName]: { at: nowIso } };
      const nextStep = STEPS[idx + 1];
      const patch = { ...r.patch, steps, attempts: 0, last_error: null, customer_action: null, next_attempt_at: null };
      if (!nextStep) {
        Object.assign(patch, { state: 'done', step: 'complete', completed_at: nowIso });
      } else {
        Object.assign(patch, { state: 'active', step: nextStep });
      }
      const updated = await this.store.update(order.id, patch);
      await this.store.addEvent(order.id, 'step_done', { step: stepName });
      if (stepName === 'register_domain') await this.notifier.customer(updated, 'domain_registered');
      if (!nextStep) await this.notifier.customer(updated, 'ready');
      return { order: updated, stop: false };
    }

    if (r.kind === 'wait') {
      const updated = await this.store.update(order.id, { ...r.patch, state: 'active', next_attempt_at: new Date(now.getTime() + r.ms).toISOString() });
      return { order: updated, stop: true };
    }

    if (r.kind === 'customer') {
      const isNew = order.state !== 'awaiting_customer' || order.customer_action?.type !== r.action.type;
      const updated = await this.store.update(order.id, {
        ...r.patch,
        state: 'awaiting_customer',
        customer_action: { ...r.action, since: isNew ? nowIso : (order.customer_action?.since || nowIso) },
        next_attempt_at: r.pollMs ? new Date(now.getTime() + r.pollMs).toISOString() : null
      });
      if (isNew) {
        await this.store.addEvent(order.id, 'customer_action', { type: r.action.type });
        await this.notifier.customer(updated, 'action_needed');
      }
      return { order: updated, stop: true };
    }

    if (r.kind === 'unavailable') {
      return this._compensate(order, r.detail);
    }

    if (r.kind === 'human') {
      return this._toHuman(order, r.code, r.detail, r.patch);
    }

    // error: transient by default, with backoff; permanent errors go to a person
    const err = r.error;
    const attempts = (order.attempts || 0) + 1;
    await this.store.addEvent(order.id, 'step_error', { step: stepName, attempt: attempts, message: err.message });
    if (err.transient === false || attempts >= this.config.maxAttempts) {
      return this._toHuman(order, err.transient === false ? 'permanent_error' : 'too_many_errors', err.message, { attempts });
    }
    const backoff = Math.min(30000 * 2 ** (attempts - 1), 60 * 60 * 1000);
    const updated = await this.store.update(order.id, {
      attempts, last_error: err.message.slice(0, 500), state: 'active',
      next_attempt_at: new Date(now.getTime() + backoff).toISOString()
    });
    return { order: updated, stop: true };
  }

  async _toHuman(order, code, detail, patch = {}) {
    const updated = await this.store.update(order.id, {
      ...patch, state: 'needs_human', needs_human_reason: code,
      last_error: detail ? String(detail).slice(0, 500) : null, next_attempt_at: null
    });
    await this.store.addEvent(order.id, 'needs_human', { step: order.step, code, detail });
    await this.notifier.ops(updated, code, detail);
    await this.notifier.customer(updated, 'needs_human');
    return { order: updated, stop: true };
  }

  async _compensate(order, detail) {
    if (!this.config.autoRefund || !this.payments || order.dry_run) {
      // Dry runs never touch real money; without auto-refund a person decides.
      if (order.dry_run && this.config.autoRefund) {
        const updated = await this.store.update(order.id, { state: 'refunded', last_error: detail, next_attempt_at: null });
        await this.store.addEvent(order.id, 'refunded', { dry_run: true });
        await this.notifier.customer(updated, 'refunded');
        return { order: updated, stop: true };
      }
      return this._toHuman(order, 'domain_unavailable', detail);
    }
    try {
      const res = await this.payments.refundAndCancel(order);
      const updated = await this.store.update(order.id, { state: 'refunded', last_error: detail, next_attempt_at: null });
      await this.store.addEvent(order.id, 'refunded', res);
      await this.notifier.customer(updated, 'refunded');
      return { order: updated, stop: true };
    } catch (err) {
      return this._toHuman(order, 'refund_failed', err.message);
    }
  }

  // ---------------------------------------------------------------- steps

  async _step_register_domain(order) {
    const { registrar } = this.providersFor(order);
    const domain = order.domain_name;
    const reg = order.registration || {};
    if (!domain || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return outcome.human('bad_domain', domain);

    // 1. Have we (or a crashed earlier attempt) already started a registration?
    const status = await registrar.getStatus(domain);
    if (status) {
      // A registration we did not request (another order, or bought by hand) is never handed
      // to this customer automatically.
      if (!reg.requested_at) return outcome.human('already_in_account', `${domain} already has a registration in our account`);
      const r = this._registrationOutcome(order, status);
      if (r) return r;
    }

    // 2. Check the registry again right before buying (the beta docs insist on this).
    const check = await registrar.check(domain);
    if (!check.registrable) {
      if (UNAVAILABLE_REASONS.includes(check.reason)) return outcome.unavailable(`registry says ${check.reason}`);
      return outcome.human('not_registrable_via_api', check.reason || 'unknown reason');
    }
    if (check.tier && check.tier !== 'standard') return outcome.human('premium_domain', `tier ${check.tier}`);
    if (!(order.domain_price_usd > 0)) return outcome.human('no_domain_payment', 'checkout did not charge for the domain');
    if (check.priceUsd != null && check.priceUsd > order.domain_price_usd + this.config.priceToleranceUsd) {
      return outcome.human('price_above_paid', `registry ${check.priceUsd} > paid ${order.domain_price_usd}`);
    }

    // 3. Customer is the registrant. Without a full contact we stop rather than register it to Posty.
    if (!order.registrant && this.config.requireCustomerRegistrant) {
      return outcome.human('registrant_incomplete', `missing: ${(reg.contact_missing || []).join(', ') || 'contact'}`);
    }

    // 4. Write down that we are about to spend, then register.
    order.registration = { ...reg, requested_at: this.clock().toISOString(), price_usd: check.priceUsd };
    await this.store.update(order.id, { registration: order.registration });
    const res = await registrar.register(domain, { contact: order.registrant || undefined });
    await this.store.addEvent(order.id, 'registration_requested', { state: res.state, dry_run: order.dry_run });
    return this._registrationOutcome(order, res) || outcome.wait(30000);
  }

  _registrationOutcome(order, status) {
    const reg = order.registration || {};
    switch (status.state) {
      case 'succeeded':
        return outcome.next({ registration: { ...reg, state: 'succeeded', expires_at: status.expiresAt || null } });
      case 'in_progress': {
        const since = reg.requested_at ? new Date(reg.requested_at) : this.clock();
        if (this.clock() - since > 2 * 60 * 60 * 1000) return outcome.human('registration_stuck', 'in progress for over 2 hours');
        return outcome.wait(60000, { registration: { ...reg, state: 'in_progress' } });
      }
      case 'action_required':
      case 'blocked':
        return outcome.human(`registrar_${status.state}`, status.error?.message);
      case 'failed':
        // Only a person should decide whether to try again: registrations cost money.
        return outcome.human('registration_failed', status.error ? `${status.error.code}: ${status.error.message}` : null);
      default:
        return null;
    }
  }

  async _step_dns_zone(order) {
    const { dns } = this.providersFor(order);
    const zone = await dns.ensureZone(order.domain_name);
    return outcome.next({ zone_id: zone.zoneId, nameservers: zone.nameservers });
  }

  async _step_mail_setup(order) {
    const { dns, resolver } = this.providersFor(order);
    const backend = backendFor(order.tier);
    const res = await backend.provision(order, { dns, resolver, config: this.config });
    if (res.ready) return outcome.next();
    // Forwarding: Cloudflare has no callback for the click, so poll. Workspace: wait for the paste.
    const pollMs = order.tier === 'forward' ? 5 * 60 * 1000 : null;
    return outcome.customer(res.action, pollMs);
  }

  async _step_mail_records(order) {
    const { dns } = this.providersFor(order);
    const backend = backendFor(order.tier);
    const result = await dns.upsertRecords(order.zone_id, backend.records(order));
    await this.store.addEvent(order.id, 'dns_written', result);
    return outcome.next({ mail: { ...(order.mail || {}), records_written_at: this.clock().toISOString() } });
  }

  async _step_verify_mail(order) {
    const { dns, resolver } = this.providersFor(order);
    const backend = backendFor(order.tier);
    const v = await backend.verify(order, { dns, resolver, config: this.config });
    if (v.ok) return outcome.next();
    const since = order.mail?.records_written_at ? new Date(order.mail.records_written_at) : this.clock();
    if (this.clock() - since > 48 * 60 * 60 * 1000) return outcome.human('dns_not_visible', v.detail);
    return outcome.wait(2 * 60 * 1000);
  }

  async _step_complete() {
    return outcome.next();
  }

  // ---------------------------------------------------------------- customer + ops input

  /**
   * The customer pastes what Google showed them. Validated strictly: this text goes into DNS.
   */
  async submitWorkspaceDetails(token, { verification, dkim }, { normaliseVerification, normaliseDkim }) {
    const order = await this.store.getByToken(token);
    if (!order) return { error: 'not_found' };
    if (order.tier !== 'workspace') return { error: 'wrong_tier' };
    const mail = { ...(order.mail || {}) };
    if (verification !== undefined) {
      const v = normaliseVerification(verification);
      if (!v) return { error: 'invalid_verification' };
      mail.workspaceVerification = v;
    }
    if (dkim !== undefined) {
      const d = normaliseDkim(dkim);
      if (!d) return { error: 'invalid_dkim' };
      mail.dkim = d;
    }
    const patch = { mail };
    if (order.state === 'awaiting_customer' && order.step === 'mail_setup') {
      Object.assign(patch, { state: 'active', next_attempt_at: null });
    } else if (order.state === 'done' && mail.dkim && mail.dkim !== order.mail?.dkim) {
      // DKIM arrived after we finished: write records again.
      Object.assign(patch, { state: 'active', step: 'mail_records', next_attempt_at: null });
    }
    await this.store.update(order.id, patch);
    await this.store.addEvent(order.id, 'customer_input', { verification: verification !== undefined, dkim: dkim !== undefined });
    return { order: await this.advance(order.id) };
  }

  /** Ops: put an order back on the line after a person fixed the cause. */
  async retry(orderId, { step } = {}) {
    const order = await this.store.get(orderId);
    if (!order) return null;
    const patch = { state: 'active', attempts: 0, next_attempt_at: null, needs_human_reason: null };
    if (step && STEPS.includes(step)) patch.step = step;
    await this.store.update(orderId, patch);
    await this.store.addEvent(orderId, 'ops_retry', { step: patch.step || order.step });
    return this.advance(orderId);
  }
}

function str(v) {
  if (!v) return null;
  return typeof v === 'string' ? v : v.id || null;
}

module.exports = { FulfilmentWorkflow, STEPS };
