import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import ListCard from '../components/ListCard.jsx';

export default function Feed() {
  const { user } = useAuth();
  const [sort, setSort] = useState('recent');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [lists, setLists] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ sort, page: String(page) });
        if (query.trim()) params.set('q', query.trim());
        const r = await api.get(`/lists?${params}`);
        if (cancelled) return;
        setLists((prev) => (page === 1 ? r.lists : [...prev, ...r.lists]));
        setHasMore(r.hasMore);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, page === 1 ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sort, query, page]);

  return (
    <>
      <section className="hero">
        <h1>Rank every game you&apos;ve ever played.</h1>
        <p className="muted">
          Build S‑to‑D tier lists from a catalogue of thousands of games, then share them with the community.
        </p>
        <Link to={user ? '/new' : '/register'} className="btn btn-primary">
          {user ? 'Create a tier list' : 'Sign up to create a tier list'}
        </Link>
      </section>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {[
            ['recent', 'Recent'],
            ['top', 'Most liked'],
          ].map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={sort === key}
              className={`tab ${sort === key ? 'tab-active' : ''}`}
              onClick={() => {
                setSort(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="input toolbar-search"
          type="search"
          placeholder="Search lists or games…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {error && <p className="error">{error}</p>}
      <div className="grid">
        {lists.map((l) => (
          <ListCard key={l.id} list={l} />
        ))}
      </div>
      {!loading && lists.length === 0 && !error && (
        <div className="empty">
          <h3>{query ? 'No tier lists match your search.' : 'No public tier lists yet.'}</h3>
          <p className="muted">Be the first — create one and set it to Public.</p>
        </div>
      )}
      {loading && <p className="muted center">Loading…</p>}
      {hasMore && !loading && (
        <div className="center">
          <button className="btn" onClick={() => setPage((p) => p + 1)}>
            Load more
          </button>
        </div>
      )}
    </>
  );
}
