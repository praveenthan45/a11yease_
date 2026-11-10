import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync, createHash } from 'node:crypto';

test('HTTP deployment: admin-only login, removal of legacy accounts, preserved keys, persistence and session expiry', { timeout: 60000 }, async () => {
  const workspace = process.env.TEST_APP_ROOT || fileURLToPath(new URL('../', import.meta.url));
  const directory = await mkdtemp(path.join(workspace, '.server-test-'));
  const password = randomBytes(18).toString('hex');
  const salt = randomBytes(16);
  await writeFile(path.join(directory, 'auth.json'), JSON.stringify({ username: 'deployment-test', salt: salt.toString('hex'), hash: scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 67108864 }).toString('hex') }));
  const clientPassword=randomBytes(18).toString('hex'),clientSalt=randomBytes(16);
  const oldToken=`ae_live_${randomBytes(32).toString('hex')}`;
  const legacy={accounts:[{id:'legacy-client',email:'first@example.test',salt:clientSalt.toString('hex'),hash:scryptSync(clientPassword,clientSalt,64,{N:32768,r:8,p:1,maxmem:67108864}).toString('hex')}],sites:[{id:'legacy-site',name:'Existing website',origin:'https://legacy.example',createdAt:Date.now(),paidUntil:0,accountId:'legacy-client'}],keys:[{id:'legacy-key',siteId:'legacy-site',mode:'live',prefix:oldToken.slice(0,17)+'…',hash:createHash('sha256').update(oldToken).digest('hex'),createdAt:Date.now(),revokedAt:null}],orders:[{id:'legacy-order',siteId:'legacy-site',accountId:'legacy-client',amount:100,days:1,mode:'live',status:'created',createdAt:Date.now()}],config:{amount:200000,days:30}};
  await writeFile(path.join(directory,'platform.json'),JSON.stringify(legacy));
  const children = new Set();
  async function start(extra = {}) {
    const child = spawn(process.execPath, [process.env.TEST_SERVER_ENTRY || 'server/admin.mjs'], {
      cwd: workspace,
      env: { ...process.env, PORT: '0', BIND_HOST: '127.0.0.1', ADMIN_CREDENTIAL_FILE: path.join(directory, 'auth.json'), PLATFORM_DATA_DIR: directory, REMOVE_CLIENT_ACCOUNTS: 'true', COOKIE_SECURE: 'true', PUBLIC_ORIGIN: 'https://app.example', RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '', RAZORPAY_WEBHOOK_SECRET: '', ...extra },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.add(child);
    const base = await new Promise((resolve, reject) => {
      let output = '';
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/ready on port (\d+)/);
        if (match) resolve(`http://127.0.0.1:${match[1]}`);
      });
      let errors = '';
      child.stderr.on('data', chunk => { errors += chunk; });
      child.once('exit', code => reject(new Error(`Server exited ${code}: ${errors}`)));
      child.once('error', reject);
    });
    return { child, base };
  }
  async function stop(child) {
    if (child.exitCode === null && child.signalCode === null) {
      const done = new Promise(resolve => child.once('exit', resolve));
      child.kill(); await done;
    }
    children.delete(child);
  }
  let active;
  let cookie = '', csrf = '';
  async function request(route, { method = 'GET', data, headers = {}, authenticated = true } = {}) {
    const response = await fetch(active.base + route, {
      method, redirect: 'manual',
      headers: { ...(authenticated && cookie ? { Cookie: cookie } : {}), ...(data !== undefined ? { 'Content-Type': 'application/json', Origin: 'https://app.example', 'X-CSRF-Token': csrf } : {}), ...headers },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const text = await response.text();
    let value; try { value = JSON.parse(text); } catch { /* Static asset. */ }
    return { status: response.status, headers: response.headers, value, text };
  }
  const post = (route, data, options) => request(route, { method: 'POST', data, ...options });
  async function login(identifier = 'deployment-test', pass = password) {
    const result = await post('/api/auth/login', { identifier, password: pass });
    assert.equal(result.status, 200);
    const setCookie = result.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Secure/); assert.match(setCookie, /SameSite=Strict/);
    cookie = setCookie.split(';')[0];
    csrf = (await request('/api/auth/session')).value.csrf;
    return cookie;
  }
  try {
    active=await start({REMOVE_CLIENT_ACCOUNTS:'false'});
    assert.equal(JSON.parse(await readFile(path.join(directory,'platform.json'),'utf8')).accounts.length,1,'existing account data is not deleted without an explicit cleanup flag');
    assert.equal((await post('/api/auth/login',{identifier:'first@example.test',password:clientPassword})).status,401,'client authentication is disabled even when stored records are retained');
    await stop(active.child);
    active = await start();
    const migrated=JSON.parse(await readFile(path.join(directory,'platform.json'),'utf8'));
    assert.deepEqual(migrated.accounts,[],'legacy account credentials are removed from persistent storage');
    assert.deepEqual(migrated.keys,legacy.keys,'existing installed keys are preserved');
    assert.equal(migrated.sites[0].accountId,null);assert.equal(migrated.orders[0].accountId,null);
    assert.equal((await request('/health')).status, 200);
    assert.equal((await request('/admin', { authenticated: false })).status, 303);
    assert.equal((await request('/api/platform/overview', { authenticated: false })).status, 401);
    const loginPage=await request('/login',{authenticated:false});
    assert.equal(loginPage.status,200);assert.match(loginPage.text,/Admin username/);
    assert.doesNotMatch(loginPage.text,/client-register|auth-mode-switch|Create an account|new-password/);
    assert.equal((await post('/api/auth/register',{email:'new@example.test',password:clientPassword})).status,404);
    assert.equal((await post('/api/auth/login',{identifier:'first@example.test',password:clientPassword})).status,401,'former clients cannot sign in');
    assert.equal((await post('/api/auth/login', { identifier: 'deployment-test', password }, { headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await post('/api/auth/login', { identifier: 'deployment-test', password: 'wrong' })).status, 401);
    await login();
    assert.equal((await request('/admin')).status, 200);
    assert.equal((await request('/')).status, 200);
    assert.equal((await request('/media/silent.mp4', { headers: { Range: 'bytes=0-99' } })).status, 206);
    for (const asset of ['/embed.js', '/widget.js', '/team-features.js', '/accessibility-badge.png', '/pluga11y-icon.svg', '/pluga11y-wordmark.svg', '/pluga11y-logo.jpeg']) {
      const result = await request(asset, { authenticated: false });
      assert.equal(result.status, 200, asset);
      assert.equal(result.headers.get('access-control-allow-origin'), '*');
      if(asset.endsWith('.svg'))assert.match(result.headers.get('content-type'),/^image\/svg\+xml/);
      if(asset.endsWith('.jpeg'))assert.equal(result.headers.get('content-type'),'image/jpeg');
    }
    // Public widget assets compress and revalidate, without caching private pages.
    const rawBundle=await readFile(path.join(workspace,'dist/team-features.js'),'utf8');
    const compressed=await request('/team-features.js',{authenticated:false,headers:{'Accept-Encoding':'gzip'}});
    assert.equal(compressed.headers.get('content-encoding'),'gzip');
    assert.ok(Number(compressed.headers.get('content-length'))<Buffer.byteLength(rawBundle)*0.5);
    assert.equal(compressed.text,rawBundle);
    assert.match(compressed.headers.get('cache-control'),/must-revalidate/);
    assert.match(compressed.headers.get('vary'),/Accept-Encoding/);
    const etag=compressed.headers.get('etag');assert.ok(etag);
    const notModified=await request('/team-features.js',{authenticated:false,headers:{'If-None-Match':etag}});
    assert.equal(notModified.status,304);assert.equal(notModified.text,'');
    const brotli=await request('/team-features.js',{authenticated:false,headers:{'Accept-Encoding':'br'}});
    assert.equal(brotli.headers.get('content-encoding'),'br');assert.equal(brotli.text,rawBundle);
    const identity=await request('/team-features.js',{authenticated:false,headers:{'Accept-Encoding':'gzip;q=0, br;q=0'}});
    assert.equal(identity.headers.get('content-encoding'),null);assert.equal(identity.text,rawBundle);
    const head=await request('/team-features.js',{method:'HEAD',authenticated:false,headers:{'Accept-Encoding':'gzip'}});
    assert.equal(head.status,200);assert.equal(head.text,'');assert.equal(head.headers.get('content-length'),compressed.headers.get('content-length'));
    const fonts=(await readdir(path.join(workspace,'dist/assets'))).filter(name=>/^OpenDyslexic-.+\.woff2$/.test(name));
    assert.equal(fonts.length,4);
    for(const font of fonts){
      const result=await request('/assets/'+font,{authenticated:false});
      assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'font/woff2');
      assert.equal(result.headers.get('access-control-allow-origin'),'*');
      assert.match(result.headers.get('cache-control'),/immutable/);
    }
    assert.equal((await request('/admin')).headers.get('cache-control'),'no-store');
    assert.equal((await request('/api/auth/session')).headers.get('cache-control'),'no-store');
    assert.equal((await request('/api/auth/session')).value.role,'admin');
    assert.equal((await post('/api/auth/register',{email:'second@example.test',password:clientPassword})).status,404);
    assert.equal((await post('/api/platform/config', { amount: 100, days: 1 },{headers:{'X-CSRF-Token':'invalid'}})).status,403);
    const site = await post('/api/platform/sites', { name: 'Live client', origin: 'https://client.example' });
    assert.equal(site.status, 201);
    const generated = await post('/api/platform/keys', { siteId: site.value.site.id, mode: 'live' });
    assert.equal(generated.status, 201);
    const key = generated.value.key;
    const validate = origin => request('/api/widget/validate', { authenticated: false, headers: { Origin: origin, 'X-AccessEase-Key': key.token } });
    const validation=await validate('https://client.example');
    assert.equal(validation.status,200);assert.equal(validation.headers.get('cache-control'),'no-store');
    assert.equal((await validate('https://evil.example')).status, 403);
    const preflight=await request('/api/widget/validate', { method: 'OPTIONS', authenticated: false, headers: { Origin: 'https://client.example', 'Access-Control-Request-Headers': 'x-accessease-key' } });
    assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-max-age'),'600');
    assert.equal((await request('/api/widget/validate',{authenticated:false,headers:{Origin:'https://legacy.example','X-AccessEase-Key':oldToken}})).status,200,'previous client installations keep working');
    const firstCookie = cookie;
    await post('/api/auth/logout', {}); cookie = ''; csrf = '';
    assert.equal((await post('/api/auth/login',{identifier:'first@example.test',password:clientPassword})).status,401);
    assert.equal((await post('/api/platform/keys', { siteId: site.value.site.id, mode: 'live' })).status, 401);
    assert.equal((await request('/api/auth/session', { headers: { Cookie: firstCookie } })).status, 401);
    await assert.rejects(start(), /already in use/);
    await stop(active.child); active = await start();
    assert.equal((await request('/api/auth/session')).status, 401);
    await login();
    assert.equal((await request('/api/platform/overview')).value.keys.length, 2);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory,'platform.json'),'utf8')).accounts,[],'cleanup remains applied after restart');
    assert.equal((await validate('https://client.example')).status, 200);
    assert.equal((await post('/api/platform/keys/revoke', { id: key.id })).status, 200);
    assert.equal((await validate('https://client.example')).status, 403);
    await stop(active.child); active = await start({ SESSION_TTL_MS: '300' });
    await login();
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.equal((await request('/api/auth/session')).status, 401);
  } finally {
    for (const child of children) await stop(child);
    if (path.dirname(directory) === path.resolve(workspace) && path.basename(directory).startsWith('.server-test-')) await rm(directory, { recursive: true, force: true });
  }
});
