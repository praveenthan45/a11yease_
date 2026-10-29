import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('only the administrator manages live keys while origin and revocation remain enforced', async () => {
  const workspace = fileURLToPath(new URL('../', import.meta.url));
  const directory = await mkdtemp(path.join(workspace, '.platform-test-'));
  const previous = process.env.PLATFORM_DATA_DIR;
  process.env.PLATFORM_DATA_DIR = directory;
  try {
    const { platform } = await import('../server/platform.mjs');
    const owner = { role: 'admin', username: 'deployment-test', csrf: 'test-csrf' };
    const another = { role: 'client', accountId: 'another', csrf: 'test-csrf' };
    async function request(route, { method = 'GET', data, headers = {}, current = owner, sameOrigin = true } = {}) {
      const result = { headers: {} };
      const req = { method, headers: { 'content-type': 'application/json', 'x-csrf-token': 'test-csrf', ...headers } };
      const res = {
        setHeader(name, value) { result.headers[name] = value; },
        writeHead(status) { result.status = status; },
        end() {},
      };
      await platform(req, res, new URL(route, 'https://platform.example'), {
        current, sameOrigin: () => sameOrigin, body: async () => data,
        json: (_res, status, value) => Object.assign(result, { status, value }),
      });
      return result;
    }
    const post = (route, data, options) => request(`/api/platform/${route}`, { method: 'POST', data, ...options });
    const validate = (token, origin = 'https://client.example') => request('/api/widget/validate', {
      headers: { origin, 'x-accessease-key': token },
    });
    assert.equal((await request('/api/platform/overview', { current: null })).status, 401);
    const registered = await post('sites', { name: 'Unpaid website', origin: 'https://client.example' });
    assert.equal(registered.status, 201);
    assert.equal(registered.value.site.paidUntil, 0);
    assert.equal(registered.value.site.active, true);
    const siteId = registered.value.site.id;
    assert.equal((await request('/api/platform/overview',{current:another})).status,403);
    assert.equal((await post('sites',{name:'Blocked',origin:'https://blocked.example'},{current:another})).status,403);
    assert.equal((await post('keys', { siteId, mode: 'live' }, { current: another })).status, 403);
    assert.equal((await post('keys', { siteId, mode: 'live' }, { headers: { 'x-csrf-token': 'invalid' } })).status, 403);
    assert.equal((await post('keys', { siteId, mode: 'live' }, { sameOrigin: false })).status, 403);
    assert.equal((await post('keys', { siteId, mode: 'test' })).status, 400);
    const generated = await post('keys', { siteId, mode: 'live' });
    assert.equal(generated.status, 201);
    const { token, id } = generated.value.key;
    assert.match(token, /^ae_live_[a-f0-9]{64}$/);
    const accepted = await validate(token);
    assert.equal(accepted.status, 200);
    assert.equal(accepted.headers['Access-Control-Allow-Origin'], 'https://client.example');
    assert.equal((await validate(token, 'https://other.example')).status, 403);
    assert.equal((await validate('invalid')).status, 403);
    assert.equal((await validate(token, 'null')).status, 403);
    // Keys have no one-hour or calendar expiry. The hourly lastUsed write is
    // telemetry only; a key remains valid until explicitly revoked.
    const realNow=Date.now;
    try {
      for(const elapsed of [2*3600000,366*86400000,10*366*86400000]) {
        Date.now=()=>realNow()+elapsed;
        assert.equal((await validate(token)).status,200);
      }
    } finally {Date.now=realNow;}
    const preflight = await request('/api/widget/validate', { method: 'OPTIONS', headers: { origin: 'https://client.example' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers['Access-Control-Allow-Headers'], 'X-AccessEase-Key');
    const overview = await request('/api/platform/overview');
    assert.equal(overview.value.orders.length, 0);
    assert.ok(overview.value.keys.every(key => !('token' in key) && !('hash' in key)));
    const stored = JSON.parse(await readFile(path.join(directory, 'platform.json'), 'utf8'));
    assert.ok(stored.keys[0].hash && !JSON.stringify(stored).includes(token));
    // Re-import persisted data with an expired payment to cover existing websites.
    stored.sites[0].paidUntil = Date.now() - 86400000;
    await writeFile(path.join(directory, 'platform.json'), JSON.stringify(stored));
    const reloaded = await import('../server/platform.mjs?expired-payment-test');
    let status;
    await reloaded.platform({ method: 'GET', headers: { origin: 'https://client.example', 'x-accessease-key': token } }, {
      setHeader() {},
    }, new URL('https://platform.example/api/widget/validate'), {
      current: null, json: (_res, code) => { status = code; },
    });
    assert.equal(status, 200);
    for (let i = 0; i < 4; i++) assert.equal((await post('keys', { siteId, mode: 'live' })).status, 201);
    assert.equal((await post('keys', { siteId, mode: 'live' })).status, 400);
    assert.equal((await post('keys/revoke', { id }, { current: another })).status, 403);
    assert.equal((await post('keys/revoke', { id })).status, 200);
    assert.equal((await validate(token)).status, 403);
    assert.equal((await post('keys', { siteId, mode: 'live' })).status, 201);
  } finally {
    if (previous === undefined) delete process.env.PLATFORM_DATA_DIR;
    else process.env.PLATFORM_DATA_DIR = previous;
    if (path.dirname(directory) === path.resolve(workspace) && path.basename(directory).startsWith('.platform-test-')) {
      await rm(directory, { recursive: true, force: true });
    }
  }
});
