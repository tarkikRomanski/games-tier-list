import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { newId } from '../util.js';

/** Search the game catalogue and add results (or a custom entry) to the list. */
export default function GameSearch({ onAdd, isAdded }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const r = await api.get(`/games/search?q=${encodeURIComponent(query.trim())}&page=${page}`);
        if (cancelled) return;
        setResults((prev) => (page === 1 ? r.results : [...prev, ...r.results]));
        setHasMore(r.hasMore);
        setSource(r.source);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, page === 1 ? 350 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, page]);

  const addCustom = (e) => {
    e.preventDefault();
    const name = customName.trim();
    if (!name) return;
    onAdd({ id: `custom:${newId()}`, name, image: null });
    setCustomName('');
  };

  return (
    <aside className="search-panel">
      <h3>Add games</h3>
      <input
        className="input"
        type="search"
        placeholder="Search games…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        aria-label="Search games"
      />
      {error && <p className="error small">{error}</p>}
      <div className="search-results">
        {results.map((g) => {
          const added = isAdded(g.id);
          return (
            <button
              key={g.id}
              type="button"
              className="search-result"
              disabled={added}
              onClick={() => onAdd({ id: g.id, name: g.name, image: g.image })}
              title={added ? 'Already in your list' : `Add ${g.name}`}
            >
              {g.image ? <img src={g.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <div className="tile-placeholder" />}
              <span className="search-result-text">
                <strong>{g.name}</strong>
                <span className="muted small">
                  {[g.released?.slice(0, 4), g.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="search-add">{added ? '✓' : '+'}</span>
            </button>
          );
        })}
        {!loading && !error && results.length === 0 && <p className="muted small">No games found.</p>}
        {loading && <p className="muted small">Searching…</p>}
        {hasMore && !loading && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage((p) => p + 1)}>
            Load more
          </button>
        )}
      </div>
      <form className="custom-game" onSubmit={addCustom}>
        <input
          className="input"
          placeholder="Can't find it? Add by name"
          value={customName}
          maxLength={120}
          onChange={(e) => setCustomName(e.target.value)}
        />
        <button className="btn btn-sm" type="submit" disabled={!customName.trim()}>
          Add
        </button>
      </form>
      {source && (
        <p className="muted tiny">
          Game data from{' '}
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.label}
          </a>
        </p>
      )}
    </aside>
  );
}
