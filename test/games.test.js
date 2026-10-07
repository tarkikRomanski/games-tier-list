import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detailsResolver, freeToGameProvider, rawgProvider } from '../server/games.js';

const jsonResponse = (data) => ({ ok: true, status: 200, json: async () => data });

test('RAWG provider normalizes results and passes the key', async () => {
  let calledUrl;
  const provider = rawgProvider({
    apiKey: 'k123',
    fetchImpl: async (url) => {
      calledUrl = new URL(url);
      return jsonResponse({
        next: 'https://api.rawg.io/api/games?page=2',
        results: [
          {
            id: 3498,
            name: 'Grand Theft Auto V',
            background_image: 'https://media.rawg.io/gta.jpg',
            released: '2013-09-17',
            genres: [{ name: 'Action' }],
            parent_platforms: [{ platform: { name: 'PC' } }],
          },
        ],
      });
    },
  });
  const r = await provider.search('gta');
  assert.equal(calledUrl.searchParams.get('key'), 'k123');
  assert.equal(calledUrl.searchParams.get('search'), 'gta');
  assert.deepEqual(r.results[0], {
    id: 'rawg:3498',
    name: 'Grand Theft Auto V',
    image: 'https://media.rawg.io/gta.jpg',
    released: '2013-09-17',
    genres: ['Action'],
    platforms: ['PC'],
  });
  assert.equal(r.hasMore, true);
});

test('FreeToGame provider caches the catalogue and filters locally', async () => {
  let calls = 0;
  const provider = freeToGameProvider({
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse([
        { id: 540, title: 'Overwatch 2', thumbnail: 'https://www.freetogame.com/g/540/thumbnail.jpg', genre: 'Shooter', platform: 'PC (Windows)', release_date: '2022-10-04' },
        { id: 516, title: 'PUBG: BATTLEGROUNDS', thumbnail: 'https://www.freetogame.com/g/516/thumbnail.jpg', genre: 'Shooter', platform: 'PC (Windows)', release_date: '2022-01-12' },
      ]);
    },
  });
  const all = await provider.search('');
  assert.equal(all.results.length, 2);
  const r = await provider.search('overwatch');
  assert.equal(r.results.length, 1);
  assert.equal(r.results[0].id, 'ftg:540');
  assert.deepEqual(r.results[0].genres, ['Shooter']);
  assert.equal(calls, 1);
});

test('providers surface upstream errors', async () => {
  const provider = rawgProvider({ apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 401 }) });
  await assert.rejects(provider.search('x'), /401/);
});

test('RAWG details normalize the game page and drop unsafe links', async () => {
  let calledUrl;
  const provider = rawgProvider({
    apiKey: 'k',
    fetchImpl: async (url) => {
      calledUrl = new URL(url);
      return jsonResponse({
        id: 3498,
        slug: 'grand-theft-auto-v',
        name: 'Grand Theft Auto V',
        background_image: 'https://media.rawg.io/gta.jpg',
        background_image_additional: 'https://media.rawg.io/gta2.jpg',
        released: '2013-09-17',
        description_raw: ' Rockstar classic. ',
        metacritic: 92,
        rating: 4.47,
        website: 'javascript:alert(1)',
        genres: [{ name: 'Action' }],
        parent_platforms: [{ platform: { name: 'PC' } }],
        developers: [{ name: 'Rockstar North' }],
        publishers: [{ name: 'Rockstar Games' }],
      });
    },
  });
  const g = await provider.details('3498');
  assert.equal(calledUrl.pathname, '/api/games/3498');
  assert.equal(g.id, 'rawg:3498');
  assert.equal(g.description, 'Rockstar classic.');
  assert.deepEqual(g.developers, ['Rockstar North']);
  assert.equal(g.metacritic, 92);
  assert.equal(g.website, null);
  assert.equal(g.url, 'https://rawg.io/games/grand-theft-auto-v');
  assert.deepEqual(g.screenshots, ['https://media.rawg.io/gta2.jpg']);
});

test('FreeToGame details map screenshots and a missing game to null', async () => {
  const provider = freeToGameProvider({
    fetchImpl: async (url) =>
      new URL(url).searchParams.get('id') === '540'
        ? jsonResponse({
            id: 540,
            title: 'Overwatch 2',
            thumbnail: 'https://www.freetogame.com/g/540/thumbnail.jpg',
            short_description: 'Hero shooter',
            genre: 'Shooter',
            platform: 'Windows',
            developer: 'Blizzard',
            publisher: 'Activision Blizzard',
            game_url: 'https://www.freetogame.com/open/overwatch-2',
            freetogame_profile_url: 'https://www.freetogame.com/overwatch-2',
            screenshots: [{ id: 1, image: 'https://www.freetogame.com/g/540/s1.jpg' }],
          })
        : { ok: false, status: 404, json: async () => ({}) },
  });
  const g = await provider.details('540');
  assert.equal(g.id, 'ftg:540');
  assert.equal(g.description, 'Hero shooter');
  assert.deepEqual(g.publishers, ['Activision Blizzard']);
  assert.deepEqual(g.screenshots, ['https://www.freetogame.com/g/540/s1.jpg']);
  assert.equal(await provider.details('1'), null);
});

test('details resolver routes by id prefix, caches answers and retries failures', async () => {
  let calls = 0;
  let fail = true;
  const details = detailsResolver({
    rawg: {
      async details(id) {
        calls += 1;
        if (fail) throw new Error('boom');
        return { id: `rawg:${id}` };
      },
    },
    ftg: null,
  });
  await assert.rejects(details('rawg:1'), /boom/);
  fail = false;
  assert.deepEqual(await details('rawg:1'), { id: 'rawg:1' });
  await details('rawg:1');
  assert.equal(calls, 2);
  assert.equal(await details('ftg:1'), null);
  assert.equal(await details('custom:x'), null);
});
