import { Link } from 'react-router-dom';
import { ChatCircle, GameController, Heart } from '@phosphor-icons/react';
import { DEFAULT_TIERS, VISIBILITY_LABELS, timeAgo } from '../util.js';

export default function ListCard({ list, showVisibility = false, index = 0 }) {
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
          <span>by {list.author.username}</span>
          <span>{timeAgo(list.updatedAt)}</span>
        </p>
        <div className="card-stats">
          <span title="Games">
            <GameController size={16} aria-hidden="true" />
            {list.itemCount}
            <span className="sr-only"> games</span>
          </span>
          <span title="Likes">
            <Heart size={16} aria-hidden="true" />
            {list.likeCount}
            <span className="sr-only"> likes</span>
          </span>
          <span title="Comments">
            <ChatCircle size={16} aria-hidden="true" />
            {list.commentCount}
            <span className="sr-only"> comments</span>
          </span>
          {showVisibility && <span className={`badge badge-${list.visibility}`}>{VISIBILITY_LABELS[list.visibility]}</span>}
        </div>
      </div>
    </Link>
  );
}
