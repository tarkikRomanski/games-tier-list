import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlass, Plus, Stack } from '@phosphor-icons/react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import ListCard from '../components/ListCard.jsx';
import { EmptyState, SkeletonGrid } from '../components/ui.jsx';
import { DEFAULT_TIERS, inkFor } from '../util.js';

const HERO_SLOTS = [4, 3, 2, 2];

/** Hero preview: a small tier board filled with covers from the lists on the page. */
function HeroBoard({ lists }) {
  const covers = [...new Set(lists.map((l) => l.coverImage).filter(Boolean))];
  let next = 0;
  return (
    <div className="hero-board" aria-hidden="true">
      {DEFAULT_TIERS.slice(0, HERO_SLOTS.length).map((tier, r) => (
        <div className="hero-row" key={tier.label}>
          <span className="hero-label" style={{ background: tier.color, color: inkFor(tier.color) }}>
            {tier.label}
          </span>
          <div className="hero-slots">
            {Array.from({ length: HERO_SLOTS[r] }, () => {
              const i = next++;
              return (
                <span className="hero-slot" key={i} style={{ '--i': i }}>
                  {covers[i] && <img src={covers[i]} alt="" referrerPolicy="no-referrer" />}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

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
        <div className="hero-copy">
          <h1>Rank every game you&apos;ve ever played.</h1>
          <p>Build S‑to‑D tier lists from a catalogue of thousands of games, then share them with the community.</p>
          <Link to={user ? '/new' : '/register'} className="btn btn-accent btn-lg">
            <Plus size={18} weight="bold" aria-hidden="true" />
            {user ? 'Create a tier list' : 'Sign up to create a tier list'}
          </Link>
        </div>
        <HeroBoard lists={lists} />
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
        <label className="search-field toolbar-search">
          <MagnifyingGlass size={18} aria-hidden="true" />
          <input
            className="input"
            type="search"
            placeholder="Search lists or games…"
            aria-label="Search lists or games"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      <div className="grid">
        {lists.map((l, i) => (
          <ListCard key={l.id} list={l} index={i} />
        ))}
      </div>
      {!loading && lists.length === 0 && !error && (
        <EmptyState icon={Stack} title={query ? 'No tier lists match your search.' : 'No public tier lists yet.'}>
          Be the first: create one and set it to Public.
        </EmptyState>
      )}
      {loading && <SkeletonGrid count={lists.length ? 3 : 6} />}
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
