import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { openDb } from '../server/db.js';
import { safeNext, usernameBase } from '../server/google.js';

const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const fakeGames = { attribution: { label: 'Fake', url: 'https://example.com' }, async search() { return { results: [], hasMore: false }; } };

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const idToken = (claims) => `${b64({ alg: 'RS256' })}.${b64(claims)}.sig`;

// Profile that the fake token endpoint will return next, plus the last request it received.
let nextProfile;
let lastTokenRequest;
const fakeFetch = async (url, init) => {
  lastTokenRequest = { url, body: new URLSearchParams(init.body.toString()) };
  if (nextProfile === 'http-error') return new Response('{}', { status: 400 });
  const claims = { iss: 'https://accounts.google.com', aud: CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 300, ...nextProfile };
  return Response.json({ id_token: idToken(claims), access_token: 'x' });
};

let server;
let origin;
before(async () => {
  const app = createApp({
    db: openDb(':memory:'),
    games: fakeGames,
    google: { clientId: CLIENT_ID, clientSecret: 'shh', publicUrl: null, fetchImpl: fakeFetch },
  });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

/** Runs the whole redirect dance for one browser and returns where it ended up plus its session cookie. */
async function signIn(profile, { next = '/lists/7', tamperState = false } = {}) {
  nextProfile = profile;
  const start = await fetch(`${origin}/api/auth/google?next=${encodeURIComponent(next)}`, { redirect: 'manual' });
  assert.equal(start.status, 302);
  const googleUrl = new URL(start.headers.get('location'));
  const oauthCookie = start.headers.get('set-cookie').split(';')[0];
  const state = tamperState ? 'forged' : googleUrl.searchParams.get('state');
  const cb = await fetch(`${origin}/api/auth/google/callback?code=abc&state=${state}`, {
    redirect: 'manual',
    headers: { cookie: oauthCookie },
  });
  const session = cb.headers.getSetCookie().find((c) => c.startsWith('gtl_session='))?.split(';')[0];
  return { googleUrl, location: cb.headers.get('location'), session };
}

const me = async (cookie) => (await (await fetch(`${origin}/api/auth/me`, { headers: { cookie } })).json()).user;

test('providers endpoint reports Google as enabled', async () => {
  const r = await (await fetch(`${origin}/api/auth/providers`)).json();
  assert.deepEqual(r, { google: true });
});

test('start redirects to Google with state and PKCE', async () => {
  const { googleUrl } = await signIn({ sub: 'g-start', given_name: 'Start' });
  assert.equal(googleUrl.origin + googleUrl.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(googleUrl.searchParams.get('client_id'), CLIENT_ID);
  assert.equal(googleUrl.searchParams.get('redirect_uri'), `${origin}/api/auth/google/callback`);
  assert.equal(googleUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(googleUrl.searchParams.get('state'));
  assert.ok(lastTokenRequest.body.get('code_verifier'), 'token exchange sends the PKCE verifier');
});

test('first sign-in creates an account, later sign-ins reuse it', async () => {
  const first = await signIn({ sub: 'g-1', given_name: 'Chloé', email: 'chloe@example.com', email_verified: true });
  assert.equal(first.location, '/lists/7');
  const user = await me(first.session);
  assert.equal(user.username, 'Chloe');

  const again = await signIn({ sub: 'g-1', given_name: 'Someone Else' });
  assert.deepEqual(await me(again.session), user);
});

test('username clashes get a numeric suffix', async () => {
  const reg = await fetch(`${origin}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'taken_name', password: 'password123' }),
  });
  assert.equal(reg.status, 201);
  const { session } = await signIn({ sub: 'g-2', given_name: 'Taken Name' });
  assert.match((await me(session)).username, /^Taken_Name_\d+$/);
});

test('Google accounts cannot be logged into with a password', async () => {
  const { session } = await signIn({ sub: 'g-3', given_name: 'Nopass' });
  const { username } = await me(session);
  for (const password of ['google', '']) {
    const r = await fetch(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    assert.equal(r.status, 401);
  }
});

test('forged state, bad tokens and unsafe redirects are rejected', async () => {
  let r = await signIn({ sub: 'g-4', given_name: 'Forger' }, { tamperState: true });
  assert.equal(r.location, '/login?error=google_failed');
  assert.equal(r.session, undefined);

  r = await signIn({ sub: 'g-5', given_name: 'Wrong', aud: 'someone-else' });
  assert.equal(r.location, '/login?error=google_failed');

  r = await signIn({ sub: 'g-6', given_name: 'Old', exp: 1 });
  assert.equal(r.location, '/login?error=google_failed');

  r = await signIn('http-error');
  assert.equal(r.location, '/login?error=google_failed');

  r = await signIn({ sub: 'g-7', given_name: 'Redirect' }, { next: '//evil.example/steal' });
  assert.equal(r.location, '/my');
});

test('callback without the sign-in cookie fails', async () => {
  const r = await fetch(`${origin}/api/auth/google/callback?code=abc&state=xyz`, { redirect: 'manual' });
  assert.equal(r.headers.get('location'), '/login?error=google_failed');
  const cancelled = await fetch(`${origin}/api/auth/google/callback?error=access_denied`, { redirect: 'manual' });
  assert.equal(cancelled.headers.get('location'), '/login?error=google_cancelled');
});

test('Google routes are off when not configured', async () => {
  const app = createApp({ db: openDb(':memory:'), games: fakeGames });
  const s = app.listen(0);
  await new Promise((r) => s.once('listening', r));
  const base = `http://127.0.0.1:${s.address().port}/api`;
  assert.deepEqual(await (await fetch(`${base}/auth/providers`)).json(), { google: false });
  assert.equal((await fetch(`${base}/auth/google`, { redirect: 'manual' })).status, 404);
  s.close();
});

test('helpers', () => {
  assert.equal(safeNext('/lists/3'), '/lists/3');
  assert.equal(safeNext('https://evil.example'), '/my');
  assert.equal(safeNext('/\\evil.example'), '/my');
  assert.equal(safeNext('/\t/evil.example'), '/my');
  assert.equal(safeNext('/\n/evil.example'), '/my');
  assert.equal(usernameBase({ name: 'Zoë Ann-Marie', email: null }), 'Zoe_Ann_Marie');
  assert.equal(usernameBase({ name: null, email: 'jo@x.com' }), 'playerjo');
  assert.equal(usernameBase({ name: '李', email: null }), 'player');
});
