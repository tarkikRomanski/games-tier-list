import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Check, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { newId } from '../util.js';
import { useI18n } from '../i18n/index.jsx';

/** Search the game catalogue and add results (or a custom entry) to the list. */
export default function GameSearch({ onAdd, isAdded }) {
  const { t } = useI18n();
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
      <h3>{t('search.title')}</h3>
      <label className="search-field">
        <MagnifyingGlass size={18} aria-hidden="true" />
        <input
          className="input"
          type="search"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          aria-label={t('search.label')}
        />
      </label>
      {error && <p className="error small">{error}</p>}
      <div className="search-results" aria-busy={loading}>
        {results.map((g) => {
          const added = isAdded(g.id);
          return (
            <button
              key={g.id}
              type="button"
              className="search-result"
              disabled={added}
              onClick={() => onAdd({ id: g.id, name: g.name, image: g.image })}
              title={added ? t('search.alreadyAdded') : t('search.add', { name: g.name })}
            >
              {g.image ? <img src={g.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <div className="tile-placeholder" />}
              <span className="search-result-text">
                <strong>{g.name}</strong>
                <span className="muted small">
                  {[g.released?.slice(0, 4), g.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="search-add" aria-hidden="true">
                {added ? <Check size={18} weight="bold" /> : <Plus size={18} weight="bold" />}
              </span>
            </button>
          );
        })}
        {!loading && !error && results.length === 0 && <p className="muted small">{t('search.noResults')}</p>}
        {loading &&
          Array.from({ length: results.length ? 2 : 6 }, (_, i) => (
            <div className="search-result search-result-skeleton" key={`s${i}`} aria-hidden="true">
              <span className="skeleton" />
              <span className="skeleton skeleton-line" />
            </div>
          ))}
        {hasMore && !loading && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage((p) => p + 1)}>
            {t('common.loadMore')}
          </button>
        )}
      </div>
      <form className="custom-game" onSubmit={addCustom}>
        <input
          className="input"
          placeholder={t('search.customPlaceholder')}
          value={customName}
          maxLength={120}
          onChange={(e) => setCustomName(e.target.value)}
        />
        <button className="btn btn-sm" type="submit" disabled={!customName.trim()}>
          {t('search.customAdd')}
        </button>
      </form>
      {source && (
        <p className="muted tiny">
          {t('search.source', {
            source: (
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            ),
          })}
        </p>
      )}
    </aside>
  );
}
