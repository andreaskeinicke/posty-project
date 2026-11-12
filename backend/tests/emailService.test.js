const test = require('node:test');
const assert = require('node:assert');

function loadService(env) {
  for (const key of ['EMAIL_PROVIDER', 'RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_REPLY_TO']) delete process.env[key];
  Object.assign(process.env, env);
  delete require.cache[require.resolve('../services/emailService')];
  return require('../services/emailService');
}

test('emails stay in the log unless Resend is fully configured', async () => {
  assert.strictEqual(loadService({}).emailProvider, 'console');
  assert.strictEqual(loadService({ EMAIL_PROVIDER: 'resend' }).emailProvider, 'console');
  assert.strictEqual(loadService({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'k' }).emailProvider, 'console');

  const realFetch = global.fetch;
  global.fetch = async () => { throw new Error('must not call the network in console mode'); };
  try {
    const result = await loadService({})._sendEmail({ to: 'a@example.com', subject: 's', text: 't', html: null, metadata: { type: 'x' } });
    assert.strictEqual(result.provider, 'console');
  } finally {
    global.fetch = realFetch;
  }
});

test('Resend mode posts the message and surfaces rejections', async () => {
  const service = loadService({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'test-key', EMAIL_FROM: 'Posty <hello@example.com>' });
  assert.strictEqual(service.emailProvider, 'resend');

  const realFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ id: 'email_1' }) };
  };
  try {
    const result = await service._sendEmail({ to: 'a@example.com', subject: 'Hi', text: 'Body', html: null, metadata: { type: 'x' } });
    assert.strictEqual(result.id, 'email_1');
    assert.strictEqual(request.url, 'https://api.resend.com/emails');
    assert.strictEqual(request.options.headers.Authorization, 'Bearer test-key');
    assert.deepStrictEqual(JSON.parse(request.options.body), {
      from: 'Posty <hello@example.com>', to: ['a@example.com'], subject: 'Hi', text: 'Body'
    });

    global.fetch = async () => ({ ok: false, status: 403, json: async () => ({ message: 'domain not verified' }) });
    await assert.rejects(
      service._sendEmail({ to: 'a@example.com', subject: 'Hi', text: 'Body', html: null, metadata: { type: 'x' } }),
      /403.*domain not verified/
    );
  } finally {
    global.fetch = realFetch;
  }
});
