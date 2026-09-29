import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlass, Plus, Stack } from '@phosphor-icons/react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import ListCard from '../components/ListCard.jsx';
import { EmptyState, SkeletonGrid } from '../components/ui.jsx';
import { DEFAULT_TIERS, inkFor } from '../util.js';
import { useI18n } from '../i18n/index.jsx';

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
  const { t } = useI18n();
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
          <h1>{t('feed.heroTitle')}</h1>
          <p>{t('feed.heroText')}</p>
          <Link to={user ? '/new' : '/register'} className="btn btn-accent btn-lg">
            <Plus size={18} weight="bold" aria-hidden="true" />
            {t(user ? 'feed.create' : 'feed.signupToCreate')}
          </Link>
        </div>
        <HeroBoard lists={lists} />
      </section>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {[
            ['recent', t('feed.recent')],
            ['top', t('feed.top')],
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
            placeholder={t('feed.searchPlaceholder')}
            aria-label={t('feed.searchPlaceholder')}
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
        <EmptyState icon={Stack} title={t(query ? 'feed.noMatch' : 'feed.none')}>
          {t('feed.beFirst')}
        </EmptyState>
      )}
      {loading && <SkeletonGrid count={lists.length ? 3 : 6} />}
      {hasMore && !loading && (
        <div className="center">
          <button className="btn" onClick={() => setPage((p) => p + 1)}>
            {t('common.loadMore')}
          </button>
        </div>
      )}
    </>
  );
}
