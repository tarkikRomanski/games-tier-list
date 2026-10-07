import { useEffect, useRef, useState } from 'react';
import { ArrowSquareOut, Globe, Star, WarningCircle, X } from '@phosphor-icons/react';
import { api } from '../api.js';
import { formatDate, inkFor } from '../util.js';
import { translateGenre, useI18n } from '../i18n/index.jsx';

const SOURCES = { rawg: 'RAWG', ftg: 'FreeToGame' };
const DESCRIPTION_PREVIEW = 420;

// One request per game per page view, shared by every board that opens it.
const detailsCache = new Map();
function loadDetails(id) {
  if (!detailsCache.has(id)) {
    const request = api.get(`/games/${encodeURIComponent(id)}`).then(
      (r) => r.game,
      (err) => {
        detailsCache.delete(id);
        throw err;
      },
    );
    detailsCache.set(id, request);
  }
  return detailsCache.get(id);
}

const isCatalogueGame = (id) => !id.startsWith('custom:');

function Facts({ items }) {
  const rows = items.filter(([, value]) => value && (!Array.isArray(value) || value.length));
  if (!rows.length) return null;
  return (
    <dl className="game-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{Array.isArray(value) ? value.join(', ') : value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Description({ text }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const long = text.length > DESCRIPTION_PREVIEW;
  const shown = long && !expanded ? `${text.slice(0, DESCRIPTION_PREVIEW).trimEnd()}…` : text;
  return (
    <section className="game-about">
      <h3>{t('game.about')}</h3>
      <p>{shown}</p>
      {long && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {t(expanded ? 'game.showLess' : 'game.showMore')}
        </button>
      )}
    </section>
  );
}

/**
 * Details for one game of a tier list, in a native modal <dialog> (focus trap, Esc and top-layer for free).
 * `item` is what the list stores ({ id, name, image }); the rest is fetched from the game catalogue.
 */
export default function GameDetailsModal({ item, tier, onClose }) {
  const { lang, t } = useI18n();
  const dialogRef = useRef(null);
  const catalogue = isCatalogueGame(item.id);
  const [state, setState] = useState({ status: catalogue ? 'loading' : 'custom', game: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    return () => dialog.open && dialog.close();
  }, []);

  useEffect(() => {
    if (!catalogue) return;
    let active = true;
    setState({ status: 'loading', game: null });
    loadDetails(item.id).then(
      (game) => active && setState({ status: 'ready', game }),
      (err) => active && setState({ status: err.status === 404 ? 'missing' : 'error', game: null }),
    );
    return () => {
      active = false;
    };
  }, [item.id, catalogue, attempt]);

  // A click that lands on the <dialog> itself, not its content, is a click on the backdrop.
  const onBackdropClick = (e) => {
    if (e.target === dialogRef.current) dialogRef.current.close();
  };

  const { status, game } = state;
  const image = game?.image || item.image;
  const name = game?.name || item.name;
  const source = SOURCES[item.id.split(':')[0]];
  const titleId = `game-title-${item.id.replace(/[^\w-]/g, '-')}`;

  return (
    <dialog ref={dialogRef} className="game-modal" aria-labelledby={titleId} onClose={onClose} onClick={onBackdropClick}>
      <div className="game-modal-body">
        <div className="game-hero">
          {image ? <img src={image} alt="" referrerPolicy="no-referrer" /> : <div className="game-hero-placeholder">{name.slice(0, 2).toUpperCase()}</div>}
          <button type="button" className="icon-btn game-modal-close" onClick={() => dialogRef.current.close()} aria-label={t('game.close')} title={t('game.close')}>
            <X size={22} />
          </button>
        </div>

        <div className="game-content">
          <header className="game-head">
            {tier ? (
              <span className="game-tier" style={{ background: tier.color, color: inkFor(tier.color) }}>
                {t('game.tier', { tier: tier.label })}
              </span>
            ) : (
              <span className="badge">{t('game.notRanked')}</span>
            )}
            <h2 id={titleId}>{name}</h2>
            {game && (game.metacritic != null || game.rating != null) && (
              <div className="game-scores">
                {game.metacritic != null && (
                  <span className={`metascore ${game.metacritic >= 75 ? 'metascore-high' : game.metacritic >= 50 ? 'metascore-mid' : 'metascore-low'}`} title={t('game.metacritic')}>
                    {game.metacritic}
                  </span>
                )}
                {game.rating != null && (
                  <span className="game-rating" aria-label={t('game.rating', { rating: game.rating.toFixed(1) })}>
                    <Star size={16} weight="fill" aria-hidden="true" />
                    {game.rating.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </header>

          {status === 'loading' && (
            <div aria-busy="true" aria-label={t('common.loading')}>
              <div className="skeleton skeleton-line" style={{ width: '55%' }} />
              <div className="skeleton skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton skeleton-line" style={{ width: '70%' }} />
            </div>
          )}

          {status === 'custom' && <p className="muted">{t('game.custom')}</p>}

          {status === 'error' && (
            <div className="game-error" role="alert">
              <WarningCircle size={20} aria-hidden="true" />
              <span>{t('game.unavailable')}</span>
              <button type="button" className="btn btn-sm" onClick={() => setAttempt((n) => n + 1)}>
                {t('game.retry')}
              </button>
            </div>
          )}

          {status === 'missing' && <p className="muted">{t('err.gameNotFound')}</p>}

          {status === 'ready' && (
            <>
              <Facts
                items={[
                  [t('game.released'), game.released && formatDate(game.released)],
                  [t('game.genres'), game.genres.map((g) => translateGenre(lang, g))],
                  [t('game.platforms'), game.platforms],
                  [t('game.developers'), game.developers],
                  [t('game.publishers'), game.publishers],
                ]}
              />
              {game.description && <Description text={game.description} />}
              {game.screenshots.length > 0 && (
                <section>
                  <h3>{t('game.screenshots')}</h3>
                  <div className="game-shots">
                    {game.screenshots.map((src) => (
                      <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      </a>
                    ))}
                  </div>
                </section>
              )}
              {(game.website || game.url) && (
                <div className="game-links">
                  {game.website && (
                    <a className="btn btn-sm" href={game.website} target="_blank" rel="noopener noreferrer">
                      <Globe size={18} aria-hidden="true" />
                      {t('game.website')}
                    </a>
                  )}
                  {game.url && source && (
                    <a className="btn btn-sm btn-ghost" href={game.url} target="_blank" rel="noopener noreferrer">
                      <ArrowSquareOut size={18} aria-hidden="true" />
                      {t('game.moreOn', { source })}
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
