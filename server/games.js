// Game catalogue providers. Both are free:
//  - RAWG (https://rawg.io/apidocs): 500k+ games, needs a free API key (RAWG_API_KEY).
//  - FreeToGame (https://www.freetogame.com/api-doc): no key, but only free-to-play titles.
// Every provider returns games in the same normalized shape:
//   { id: "<source>:<id>", name, image, released, genres: [], platforms: [] }

const PAGE_SIZE = 24;

async function getJson(fetchImpl, url) {
  const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Upstream ${new URL(url).host} responded ${res.status}`);
  return res.json();
}

export function rawgProvider({ apiKey, fetchImpl = fetch }) {
  const base = 'https://api.rawg.io/api';
  const normalize = (g) => ({
    id: `rawg:${g.id}`,
    name: g.name,
    image: g.background_image || null,
    released: g.released || null,
    genres: (g.genres || []).map((x) => x.name),
    platforms: (g.parent_platforms || g.platforms || []).map((x) => x.platform?.name).filter(Boolean),
  });

  return {
    name: 'rawg',
    attribution: { label: 'RAWG', url: 'https://rawg.io' },
    async search(query, page = 1) {
      const params = new URLSearchParams({ key: apiKey, page_size: String(PAGE_SIZE), page: String(page) });
      if (query) {
        params.set('search', query);
        params.set('search_precise', 'true');
      } else {
        params.set('ordering', '-added');
      }
      const data = await getJson(fetchImpl, `${base}/games?${params}`);
      return { results: (data.results || []).map(normalize), hasMore: Boolean(data.next) };
    },
  };
}

export function freeToGameProvider({ fetchImpl = fetch, ttlMs = 6 * 60 * 60 * 1000 } = {}) {
  const url = 'https://www.freetogame.com/api/games?sort-by=popularity';
  let cache = null;
  let cachedAt = 0;
  let inflight = null;

  const normalize = (g) => ({
    id: `ftg:${g.id}`,
    name: g.title,
    image: g.thumbnail || null,
    released: g.release_date || null,
    genres: g.genre ? [g.genre.trim()] : [],
    platforms: g.platform ? g.platform.split(',').map((p) => p.trim()) : [],
  });

  async function all() {
    if (cache && Date.now() - cachedAt < ttlMs) return cache;
    inflight ??= getJson(fetchImpl, url)
      .then((data) => {
        cache = (Array.isArray(data) ? data : []).map(normalize);
        cachedAt = Date.now();
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  return {
    name: 'freetogame',
    attribution: { label: 'FreeToGame', url: 'https://www.freetogame.com' },
    async search(query, page = 1) {
      const games = await all();
      const q = (query || '').trim().toLowerCase();
      const matches = q ? games.filter((g) => g.name.toLowerCase().includes(q)) : games;
      const start = (page - 1) * PAGE_SIZE;
      return { results: matches.slice(start, start + PAGE_SIZE), hasMore: start + PAGE_SIZE < matches.length };
    },
  };
}

export function createGamesProvider(env = process.env) {
  return env.RAWG_API_KEY ? rawgProvider({ apiKey: env.RAWG_API_KEY }) : freeToGameProvider();
}
