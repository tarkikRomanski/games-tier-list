// Game catalogue providers. Both are free:
//  - RAWG (https://rawg.io/apidocs): 500k+ games, needs a free API key (RAWG_API_KEY).
//  - FreeToGame (https://www.freetogame.com/api-doc): no key, but only free-to-play titles.
// Every provider returns games in the same normalized shape:
//   { id: "<source>:<id>", name, image, released, genres: [], platforms: [] }
// and `details(sourceId)` adds { description, developers, publishers, metacritic, rating, website, url, screenshots },
// or resolves to null when the catalogue has no such game.

const PAGE_SIZE = 24;

async function getJson(fetchImpl, url, { allowMissing = false } = {}) {
  const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (allowMissing && res.status === 404) return null;
  if (!res.ok) throw new Error(`Upstream ${new URL(url).host} responded ${res.status}`);
  return res.json();
}

/** Upstream links end up in an href, so only http(s) URLs are passed through. */
function safeUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

const names = (list) => (Array.isArray(list) ? list.map((x) => x?.name).filter(Boolean) : []);
const MAX_SCREENSHOTS = 4;

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
    async details(sourceId) {
      const params = new URLSearchParams({ key: apiKey });
      const g = await getJson(fetchImpl, `${base}/games/${encodeURIComponent(sourceId)}?${params}`, { allowMissing: true });
      if (!g?.id) return null;
      return {
        ...normalize(g),
        description: g.description_raw?.trim() || null,
        developers: names(g.developers),
        publishers: names(g.publishers),
        metacritic: Number.isFinite(g.metacritic) ? g.metacritic : null,
        rating: g.rating > 0 ? g.rating : null,
        website: safeUrl(g.website),
        url: g.slug ? `https://rawg.io/games/${encodeURIComponent(g.slug)}` : null,
        screenshots: [safeUrl(g.background_image_additional)].filter(Boolean),
      };
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
    async details(sourceId) {
      const params = new URLSearchParams({ id: sourceId });
      const g = await getJson(fetchImpl, `https://www.freetogame.com/api/game?${params}`, { allowMissing: true });
      if (!g?.id) return null;
      return {
        ...normalize(g),
        description: (g.description || g.short_description || '').trim() || null,
        developers: g.developer ? [g.developer.trim()] : [],
        publishers: g.publisher ? [g.publisher.trim()] : [],
        metacritic: null,
        rating: null,
        website: safeUrl(g.game_url),
        url: safeUrl(g.freetogame_profile_url),
        screenshots: (g.screenshots || []).map((x) => safeUrl(x?.image)).filter(Boolean).slice(0, MAX_SCREENSHOTS),
      };
    },
  };
}

/**
 * Looks up a stored game id ("rawg:3498", "ftg:540") in the catalogue it came from, whichever one searches use.
 * Answers (including "not found") are cached; failures are not, so a flaky upstream is retried next time.
 */
export function detailsResolver(providers, { ttlMs = 24 * 60 * 60 * 1000, max = 500 } = {}) {
  const cache = new Map();
  return async function details(id) {
    const [source, sourceId] = String(id).split(':');
    const provider = providers[source];
    if (!provider?.details || !sourceId) return null;

    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    cache.delete(id);

    const value = provider.details(sourceId).catch((err) => {
      cache.delete(id);
      throw err;
    });
    cache.set(id, { at: Date.now(), value });
    // Map keeps insertion order, so the first key is the oldest entry.
    if (cache.size > max) cache.delete(cache.keys().next().value);
    return value;
  };
}

export function createGamesProvider(env = process.env) {
  const ftg = freeToGameProvider();
  const rawg = env.RAWG_API_KEY ? rawgProvider({ apiKey: env.RAWG_API_KEY }) : null;
  // Lists may hold games from either catalogue; RAWG ids resolve only while a key is configured.
  return { ...(rawg ?? ftg), details: detailsResolver({ rawg, ftg }) };
}
