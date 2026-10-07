import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { openDb } from '../server/db.js';

const fakeGames = {
  attribution: { label: 'Fake', url: 'https://example.com' },
  async search(q) {
    return { results: [{ id: 'rawg:1', name: `Result for ${q}`, image: null, genres: [], platforms: [] }], hasMore: false };
  },
  async details(id) {
    if (id === 'rawg:500') throw new Error('upstream down');
    return id === 'rawg:1' ? { id, name: 'Zelda', description: 'Adventure' } : null;
  },
};

let server;
let base;
let db;

before(async () => {
  db = await openDb(':memory:');
  const app = createApp({ db, games: fakeGames });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

/** Minimal cookie-keeping client, one per simulated user. */
function client() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined && { 'content-type': 'application/json' }), ...(cookie && { cookie }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
}

const sampleData = {
  tiers: [
    { id: 's', label: 'S', color: '#ff7f7f', items: [{ id: 'rawg:3498', name: 'GTA V', image: 'https://media.rawg.io/x.jpg' }] },
    { id: 'a', label: 'A', color: '#ffbf7f', items: [] },
  ],
  pool: [{ id: 'custom:abc', name: 'My indie game', image: null }],
};

test('register, me, logout, login', async () => {
  const c = client();
  let r = await c('POST', '/auth/register', { username: 'alice', password: 'password123' });
  assert.equal(r.status, 201);
  r = await c('GET', '/auth/me');
  assert.equal(r.body.user.username, 'alice');
  r = await c('POST', '/auth/register', { username: 'ALICE', password: 'password123' });
  assert.equal(r.status, 409);
  await c('POST', '/auth/logout', {});
  r = await c('GET', '/auth/me');
  assert.equal(r.body.user, null);
  r = await c('POST', '/auth/login', { username: 'alice', password: 'wrong-password' });
  assert.equal(r.status, 401);
  r = await c('POST', '/auth/login', { username: 'alice', password: 'password123' });
  assert.equal(r.status, 200);
});

test('rejects weak credentials and non-JSON writes', async () => {
  const c = client();
  assert.equal((await c('POST', '/auth/register', { username: 'x', password: 'password123' })).status, 400);
  assert.equal((await c('POST', '/auth/register', { username: 'bob_ok', password: 'short' })).status, 400);
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'username=a&password=b',
  });
  assert.equal(res.status, 415);
});

test('game search proxies the provider', async () => {
  const r = await client()('GET', '/games/search?q=zelda');
  assert.equal(r.status, 200);
  assert.equal(r.body.results[0].name, 'Result for zelda');
  assert.equal(r.body.source.label, 'Fake');
});

test('game details come from the catalogue', async () => {
  const get = client();
  let r = await get('GET', '/games/rawg%3A1');
  assert.equal(r.status, 200);
  assert.equal(r.body.game.name, 'Zelda');
  assert.equal((await get('GET', '/games/rawg%3A2')).status, 404);
  assert.equal((await get('GET', '/games/custom%3Aabc')).status, 404);
  assert.equal((await get('GET', '/games/evil%3A1')).status, 404);
  assert.equal((await get('GET', '/games/rawg%3A500')).status, 502);
});

test('tier list lifecycle, visibility, likes, comments, remix', async () => {
  const owner = client();
  const other = client();
  const anon = client();
  await owner('POST', '/auth/register', { username: 'owner1', password: 'password123' });
  await other('POST', '/auth/register', { username: 'other1', password: 'password123' });

  assert.equal((await anon('POST', '/lists', { title: 'x', data: sampleData })).status, 401);

  let r = await owner('POST', '/lists', { title: 'Best RPGs', description: 'mine', data: sampleData });
  assert.equal(r.status, 201);
  const list = r.body.list;
  assert.equal(list.visibility, 'private');
  assert.equal(list.itemCount, 2);
  assert.equal(list.coverImage, 'https://media.rawg.io/x.jpg');
  assert.equal(list.isOwner, true);

  // Private lists are hidden from others and from the feed.
  assert.equal((await other('GET', `/lists/${list.id}`)).status, 404);
  assert.equal((await anon('GET', '/lists')).body.lists.length, 0);
  assert.equal((await other('PUT', `/lists/${list.id}`, { title: 'hacked' })).status, 404);

  // Unlisted: reachable by link, not in the feed.
  await owner('PUT', `/lists/${list.id}`, { visibility: 'unlisted' });
  assert.equal((await anon('GET', `/lists/${list.id}`)).status, 200);
  assert.equal((await anon('GET', '/lists')).body.lists.length, 0);

  // Public: in feed and profile, searchable by game name.
  r = await owner('PUT', `/lists/${list.id}`, { visibility: 'public' });
  assert.equal(r.body.list.title, 'Best RPGs');
  assert.equal((await anon('GET', '/lists')).body.lists.length, 1);
  assert.equal((await anon('GET', '/lists?q=GTA')).body.lists.length, 1);
  assert.equal((await anon('GET', '/lists?q=nomatch')).body.lists.length, 0);
  assert.equal((await anon('GET', '/users/owner1')).body.lists.length, 1);

  // Likes are idempotent.
  await other('POST', `/lists/${list.id}/like`, {});
  r = await other('POST', `/lists/${list.id}/like`, {});
  assert.equal(r.body.likeCount, 1);
  r = await other('GET', `/lists/${list.id}`);
  assert.equal(r.body.list.likedByMe, true);
  r = await other('DELETE', `/lists/${list.id}/like`, {});
  assert.equal(r.body.likeCount, 0);

  // Comments: author or list owner may delete.
  r = await other('POST', `/lists/${list.id}/comments`, { body: '  Great list!  ' });
  assert.equal(r.status, 201);
  assert.equal(r.body.comment.body, 'Great list!');
  const commentId = r.body.comment.id;
  assert.equal((await anon('POST', `/lists/${list.id}/comments`, { body: 'hi' })).status, 401);
  assert.equal((await other('POST', `/lists/${list.id}/comments`, { body: '   ' })).status, 400);
  r = await anon('GET', `/lists/${list.id}/comments`);
  assert.equal(r.body.comments.length, 1);
  assert.equal(r.body.comments[0].canDelete, false);
  assert.equal((await owner('DELETE', `/comments/${commentId}`, {})).status, 200);

  // Remix creates a private copy that links back.
  r = await other('POST', `/lists/${list.id}/copy`, {});
  assert.equal(r.status, 201);
  assert.equal(r.body.list.visibility, 'private');
  assert.equal(r.body.list.forkedFrom.id, list.id);
  assert.equal((await other('GET', '/lists/mine')).body.lists.length, 1);

  // Delete.
  assert.equal((await other('DELETE', `/lists/${list.id}`, {})).status, 404);
  assert.equal((await owner('DELETE', `/lists/${list.id}`, {})).status, 200);
  assert.equal((await anon('GET', `/lists/${list.id}`)).status, 404);
});

test('validates tier list data', async () => {
  const c = client();
  await c('POST', '/auth/register', { username: 'validator', password: 'password123' });
  const bad = [
    { title: '', data: sampleData },
    { title: 'x', data: { tiers: [] } },
    { title: 'x', data: { tiers: [{ id: 's', label: 'S', color: 'red', items: [] }] } },
    { title: 'x', data: { tiers: [{ id: 's', label: 'S', color: '#ffffff', items: [{ id: 'evil:1', name: 'x' }] }] } },
    {
      title: 'x',
      data: { tiers: [{ id: 's', label: 'S', color: '#ffffff', items: [{ id: 'rawg:1', name: 'x', image: 'javascript:alert(1)' }] }] },
    },
    {
      title: 'x',
      data: {
        tiers: [{ id: 's', label: 'S', color: '#ffffff', items: [{ id: 'rawg:1', name: 'x' }] }],
        pool: [{ id: 'rawg:1', name: 'dupe' }],
      },
    },
    { title: 'x', visibility: 'everyone', data: sampleData },
  ];
  for (const body of bad) {
    const r = await c('POST', '/lists', body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.ok(r.body.error);
  }
});

// Smallest valid PNG (1x1 transparent pixel).
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('edit profile: name and profile image', async () => {
  const c = client();
  await c('POST', '/auth/register', { username: 'painter', password: 'password123' });
  let r = await c('GET', '/profile');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.profile, { username: 'painter', displayName: null, avatarUrl: null, usernameChangeAvailableAt: null });

  r = await c('PUT', '/profile', { displayName: '  Bob   Ross ', avatar: PNG_1PX });
  assert.equal(r.status, 200);
  assert.equal(r.body.profile.displayName, 'Bob Ross');
  assert.match(r.body.profile.avatarUrl, /^\/api\/users\/\d+\/avatar\?v=\d+$/);

  const img = await fetch(`http://127.0.0.1:${server.address().port}${r.body.profile.avatarUrl}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await img.arrayBuffer()).subarray(1, 4).toString(), 'PNG');

  // Shown on the public profile, on lists and in the logged-in user.
  r = await client()('GET', '/users/painter');
  assert.equal(r.body.user.displayName, 'Bob Ross');
  assert.ok(r.body.user.avatarUrl);
  await c('POST', '/lists', { title: 'Mine', visibility: 'public', data: sampleData });
  r = await c('GET', '/lists/mine');
  assert.equal(r.body.lists[0].author.displayName, 'Bob Ross');
  r = await c('GET', '/auth/me');
  assert.equal(r.body.user.displayName, 'Bob Ross');

  // Clearing both.
  r = await c('PUT', '/profile', { displayName: '', avatar: null });
  assert.equal(r.body.profile.displayName, null);
  assert.equal(r.body.profile.avatarUrl, null);

  for (const avatar of ['https://example.com/a.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,aGVsbG8=', 42]) {
    assert.equal((await c('PUT', '/profile', { avatar })).status, 400, String(avatar));
  }
  assert.equal((await c('PUT', '/profile', { displayName: 'x'.repeat(51) })).status, 400);
  assert.equal((await client()('PUT', '/profile', { displayName: 'anon' })).status, 401);
});

test('edit profile: nickname is unique and changes once per 7 days', async () => {
  const c = client();
  await c('POST', '/auth/register', { username: 'nick_a', password: 'password123' });
  await client()('POST', '/auth/register', { username: 'nick_taken', password: 'password123' });

  assert.equal((await c('PUT', '/profile', { username: 'NICK_TAKEN' })).status, 409);
  assert.equal((await c('PUT', '/profile', { username: 'no spaces' })).status, 400);
  // Saving the current nickname is not a change.
  assert.equal((await c('PUT', '/profile', { username: 'nick_a' })).body.profile.usernameChangeAvailableAt, null);

  let r = await c('PUT', '/profile', { username: 'nick_b' });
  assert.equal(r.status, 200);
  assert.equal(r.body.profile.username, 'nick_b');
  const available = Date.parse(r.body.profile.usernameChangeAvailableAt);
  assert.ok(Math.abs(available - (Date.now() + 7 * 24 * 3600 * 1000)) < 60_000);

  // The new nickname is the login name and the profile URL.
  assert.equal((await client()('GET', '/users/nick_a')).status, 404);
  assert.equal((await client()('GET', '/users/nick_b')).status, 200);
  assert.equal((await client()('POST', '/auth/login', { username: 'nick_b', password: 'password123' })).status, 200);
  // The old nickname is free again.
  assert.equal((await client()('POST', '/auth/register', { username: 'nick_a', password: 'password123' })).status, 201);

  // A second change within 7 days is refused, but other fields can still be edited.
  r = await c('PUT', '/profile', { username: 'nick_c', displayName: 'Nope' });
  assert.equal(r.status, 429);
  r = await c('GET', '/profile');
  assert.equal(r.body.profile.username, 'nick_b');
  assert.equal(r.body.profile.displayName, null);
  assert.equal((await c('PUT', '/profile', { displayName: 'Still fine' })).status, 200);

  // Once 7 days have passed it's allowed again.
  await db.run('UPDATE users SET username_changed_at = ? WHERE username = ?', [Date.now() - 7 * 24 * 3600 * 1000 - 1000, 'nick_b']);
  r = await c('GET', '/profile');
  assert.equal(r.body.profile.usernameChangeAvailableAt, null);
  r = await c('PUT', '/profile', { username: 'nick_c' });
  assert.equal(r.status, 200);
  assert.equal(r.body.profile.username, 'nick_c');
});
