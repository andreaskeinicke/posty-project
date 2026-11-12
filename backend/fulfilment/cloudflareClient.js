/**
 * Minimal Cloudflare v4 API client. fetch is injectable so tests never touch the network.
 * Never logs the token.
 */
class CloudflareApiError extends Error {
  constructor(message, { status, errors, transient } = {}) {
    super(message);
    this.name = 'CloudflareApiError';
    this.status = status;
    this.errors = errors || [];
    // 429 and 5xx are worth retrying; 4xx are not
    this.transient = transient !== undefined ? transient : (status === 429 || status >= 500 || !status);
  }
}

class CloudflareClient {
  constructor({ apiToken, accountId, fetchImpl = globalThis.fetch, baseUrl = 'https://api.cloudflare.com/client/v4' }) {
    if (!apiToken || !accountId) throw new Error('Cloudflare credentials missing (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID)');
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.fetch = fetchImpl;
    this.baseUrl = baseUrl;
  }

  async request(method, path, { body, headers = {}, allow404 = false } = {}) {
    let res;
    try {
      res = await this.fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (err) {
      throw new CloudflareApiError(`Network error calling Cloudflare ${method} ${path}: ${err.message}`, { transient: true });
    }
    if (allow404 && res.status === 404) return { status: 404, result: null };
    let json = null;
    try { json = await res.json(); } catch (_) { /* empty body */ }
    if (!res.ok || (json && json.success === false)) {
      const errors = json?.errors || [];
      const msg = errors.map(e => `${e.code || ''} ${e.message || ''}`.trim()).join('; ') || `HTTP ${res.status}`;
      throw new CloudflareApiError(`Cloudflare ${method} ${path} failed: ${msg}`, { status: res.status, errors });
    }
    return { status: res.status, result: json?.result ?? null, json };
  }

  account(path) {
    return `/accounts/${this.accountId}${path}`;
  }
}

module.exports = { CloudflareClient, CloudflareApiError };
