import { Link } from 'react-router-dom';
import { ChatCircle, GameController, Heart } from '@phosphor-icons/react';
import { DEFAULT_TIERS, displayNameOf, timeAgo } from '../util.js';
import { useI18n } from '../i18n/index.jsx';

export default function ListCard({ list, showVisibility = false, index = 0 }) {
  const { t } = useI18n();
  return (
    <Link to={`/lists/${list.id}`} className="card" style={{ '--i': Math.min(index, 12) }}>
      <div className="card-cover">
        {list.coverImage ? (
          <img src={list.coverImage} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="card-cover-empty" aria-hidden="true">
            {DEFAULT_TIERS.slice(0, 3).map((t, i) => (
              <span key={t.label} style={{ background: t.color, width: `${88 - i * 22}%` }}>
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="card-body">
        <h3>{list.title}</h3>
        <p className="card-meta">
          <span>{t('card.by', { name: displayNameOf(list.author) })}</span>
          <span>{timeAgo(list.updatedAt)}</span>
        </p>
        <div className="card-stats">
          <span title={t('card.games')}>
            <GameController size={16} aria-hidden="true" />
            {list.itemCount}
            <span className="sr-only"> {t('card.gamesUnit', { count: list.itemCount })}</span>
          </span>
          <span title={t('card.likes')}>
            <Heart size={16} aria-hidden="true" />
            {list.likeCount}
            <span className="sr-only"> {t('card.likesUnit', { count: list.likeCount })}</span>
          </span>
          <span title={t('card.comments')}>
            <ChatCircle size={16} aria-hidden="true" />
            {list.commentCount}
            <span className="sr-only"> {t('card.commentsUnit', { count: list.commentCount })}</span>
          </span>
          {showVisibility && <span className={`badge badge-${list.visibility}`}>{t(`visibility.${list.visibility}`)}</span>}
        </div>
      </div>
    </Link>
  );
}
