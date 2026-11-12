/**
 * In-memory registrar for tests and dry runs (test-mode Stripe payments).
 * Spends nothing. Names containing "taken" are unavailable; ".dk" is "not supported via API",
 * which mirrors the real beta for extensions it does not cover.
 */
class FakeRegistrar {
  constructor({ asyncRegistrations = false, priceUsd = 10.44 } = {}) {
    this.name = 'fake';
    this.registrations = new Map();
    this.asyncRegistrations = asyncRegistrations;
    this.priceUsd = priceUsd;
    this.calls = { check: 0, register: 0, getStatus: 0 };
  }

  async check(domain) {
    this.calls.check++;
    if (domain.includes('taken') || this.registrations.has(domain)) return { registrable: false, reason: 'domain_unavailable' };
    if (domain.endsWith('.dk')) return { registrable: false, reason: 'extension_not_supported_via_api' };
    return { registrable: true, priceUsd: this.priceUsd, renewalUsd: this.priceUsd, currency: 'USD', tier: 'standard' };
  }

  async register(domain, { contact } = {}) {
    this.calls.register++;
    if (this.registrations.has(domain)) throw Object.assign(new Error('already registered'), { transient: false });
    const reg = {
      state: this.asyncRegistrations ? 'in_progress' : 'succeeded',
      expiresAt: new Date(Date.now() + 365 * 864e5).toISOString(),
      contact
    };
    this.registrations.set(domain, reg);
    return { state: reg.state, expiresAt: reg.expiresAt, error: null };
  }

  async getStatus(domain) {
    this.calls.getStatus++;
    const reg = this.registrations.get(domain);
    if (!reg) return null;
    return { state: reg.state, expiresAt: reg.expiresAt, error: null };
  }

  /** test helper */
  complete(domain, state = 'succeeded') {
    const reg = this.registrations.get(domain);
    if (reg) reg.state = state;
  }
}

module.exports = { FakeRegistrar };
