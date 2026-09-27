import { Link } from 'react-router-dom';
import { VISIBILITY_LABELS, timeAgo } from '../util.js';

export default function ListCard({ list, showVisibility = false }) {
  return (
    <Link to={`/lists/${list.id}`} className="card">
      <div className="card-cover">
        {list.coverImage ? (
          <img src={list.coverImage} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="card-cover-empty">
            <span style={{ background: '#ff7f7f' }}>S</span>
            <span style={{ background: '#ffbf7f' }}>A</span>
            <span style={{ background: '#ffdf7f' }}>B</span>
          </div>
        )}
        {showVisibility && <span className={`badge badge-${list.visibility}`}>{VISIBILITY_LABELS[list.visibility]}</span>}
      </div>
      <div className="card-body">
        <h3>{list.title}</h3>
        <p className="muted small">
          by {list.author.username} · {list.itemCount} games · {timeAgo(list.updatedAt)}
        </p>
        <p className="card-stats small">
          <span>♥ {list.likeCount}</span>
          <span>💬 {list.commentCount}</span>
        </p>
      </div>
    </Link>
  );
}
