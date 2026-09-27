import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeToGameProvider, rawgProvider } from '../server/games.js';

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
