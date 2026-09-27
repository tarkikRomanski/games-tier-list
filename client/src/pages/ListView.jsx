import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import TierBoard from '../components/TierBoard.jsx';
import { VISIBILITY_LABELS, timeAgo } from '../util.js';

function Comments({ listId, user }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/lists/${listId}/comments`).then(
      (r) => setComments(r.comments),
      (err) => setError(err.message),
    );
  }, [listId]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { comment } = await api.post(`/lists/${listId}/comments`, { body });
      setComments((c) => [...c, comment]);
      setBody('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (commentId) => {
    try {
      await api.del(`/comments/${commentId}`);
      setComments((c) => c.filter((x) => x.id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="comments">
      <h3>Comments ({comments.length})</h3>
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <div className="comment-head small">
            <Link to={`/u/${c.author.username}`}>
              <strong>{c.author.username}</strong>
            </Link>
            <span className="muted">{timeAgo(c.createdAt)}</span>
            {c.canDelete && (
              <button className="link-btn muted" onClick={() => remove(c.id)}>
                delete
              </button>
            )}
          </div>
          <p className="comment-body">{c.body}</p>
        </div>
      ))}
      {user ? (
        <form onSubmit={submit} className="stack">
          <textarea
            className="input"
            rows={3}
            placeholder="Agree? Disagree? Say why…"
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
          />
          <div>
            <button className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>
              Post comment
            </button>
          </div>
        </form>
      ) : (
        <p className="muted small">
          <Link to="/login">Log in</Link> to join the discussion.
        </p>
      )}
      {error && <p className="error small">{error}</p>}
    </section>
  );
}

export default function ListView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setList(null);
    setError('');
    api.get(`/lists/${id}`).then(
      (r) => setList(r.list),
      (err) => setError(err.message),
    );
  }, [id, user?.id]);

  if (error) return <div className="empty"><h2>{error}</h2><Link to="/">Back to the community</Link></div>;
  if (!list) return <p className="muted center">Loading…</p>;

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 2500);
  };
  const requireLogin = () => navigate('/login', { state: { from: `/lists/${id}` } });

  const toggleLike = async () => {
    if (!user) return requireLogin();
    try {
      const r = list.likedByMe ? await api.del(`/lists/${id}/like`) : await api.post(`/lists/${id}/like`);
      setList((l) => ({ ...l, likedByMe: r.liked, likeCount: r.likeCount }));
    } catch (err) {
      flash(err.message);
    }
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: list.title, url });
      else {
        await navigator.clipboard.writeText(url);
        flash('Link copied to clipboard');
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };
  const remix = async () => {
    if (!user) return requireLogin();
    try {
      const r = await api.post(`/lists/${id}/copy`);
      navigate(`/lists/${r.list.id}/edit`);
    } catch (err) {
      flash(err.message);
    }
  };
  const remove = async () => {
    if (!window.confirm(`Delete “${list.title}”? This cannot be undone.`)) return;
    try {
      await api.del(`/lists/${id}`);
      navigate('/my');
    } catch (err) {
      flash(err.message);
    }
  };

  return (
    <article className="list-view">
      <header className="list-head">
        <div>
          <h1>{list.title}</h1>
          <p className="muted small">
            by <Link to={`/u/${list.author.username}`}>{list.author.username}</Link> · updated {timeAgo(list.updatedAt)} ·{' '}
            {list.itemCount} games
            {list.visibility !== 'public' && (
              <span className={`badge badge-inline badge-${list.visibility}`}>{VISIBILITY_LABELS[list.visibility]}</span>
            )}
          </p>
          {list.forkedFrom && (
            <p className="muted small">
              Remixed from <Link to={`/lists/${list.forkedFrom.id}`}>{list.forkedFrom.title}</Link> by{' '}
              {list.forkedFrom.author.username}
            </p>
          )}
          {list.description && <p className="description">{list.description}</p>}
        </div>
        <div className="list-actions">
          <button className={`btn ${list.likedByMe ? 'btn-liked' : ''}`} onClick={toggleLike} aria-pressed={list.likedByMe}>
            ♥ {list.likeCount}
          </button>
          {list.visibility !== 'private' && (
            <button className="btn" onClick={share}>
              Share
            </button>
          )}
          {!list.isOwner && (
            <button className="btn" onClick={remix} title="Copy this list into your account and make it your own">
              Remix
            </button>
          )}
          {list.isOwner && (
            <>
              <Link className="btn btn-primary" to={`/lists/${id}/edit`}>
                Edit
              </Link>
              <button className="btn btn-danger" onClick={remove}>
                Delete
              </button>
            </>
          )}
        </div>
      </header>
      {notice && <p className="notice">{notice}</p>}
      {list.isOwner && list.visibility === 'private' && (
        <p className="notice">This list is private. Edit it and set visibility to Public to share it with the community.</p>
      )}

      <TierBoard data={list.data} />
      <Comments listId={list.id} user={user} />
    </article>
  );
}
