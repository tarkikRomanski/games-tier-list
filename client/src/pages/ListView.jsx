import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ChatCircle, GitFork, Heart, Lock, PencilSimple, ShareNetwork, Trash, WarningCircle } from '@phosphor-icons/react';
import TierBoard from '../components/TierBoard.jsx';
import { Avatar, EmptyState, SkeletonBoard } from '../components/ui.jsx';
import { VISIBILITY_LABELS, displayNameOf, timeAgo } from '../util.js';

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
      <h2 className="section-title">
        <ChatCircle size={22} aria-hidden="true" />
        Comments <span className="count">{comments.length}</span>
      </h2>
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <Avatar name={displayNameOf(c.author)} src={c.author.avatarUrl} size="sm" />
          <div className="comment-main">
            <div className="comment-head small">
              <Link to={`/u/${c.author.username}`}>
                <strong>{displayNameOf(c.author)}</strong>
              </Link>
              <span className="muted">{timeAgo(c.createdAt)}</span>
              {c.canDelete && (
                <button type="button" className="icon-btn icon-btn-sm" onClick={() => remove(c.id)} aria-label="Delete comment" title="Delete comment">
                  <Trash size={16} />
                </button>
              )}
            </div>
            <p className="comment-body">{c.body}</p>
          </div>
        </div>
      ))}
      {user ? (
        <form onSubmit={submit} className="stack comment-form">
          <label className="sr-only" htmlFor="comment-body">
            Your comment
          </label>
          <textarea
            id="comment-body"
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
      {error && (
        <p className="error small" role="alert">
          {error}
        </p>
      )}
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

  if (error)
    return (
      <EmptyState icon={WarningCircle} title={error} action={<Link to="/" className="btn">Back to the community</Link>} />
    );
  if (!list)
    return (
      <div className="list-view">
        <div className="skeleton skeleton-title" />
        <SkeletonBoard />
      </div>
    );

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
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
        <div className="list-head-main">
          <h1>{list.title}</h1>
          <p className="list-meta">
            <Link to={`/u/${list.author.username}`} className="author">
              <Avatar name={displayNameOf(list.author)} src={list.author.avatarUrl} size="sm" />
              {displayNameOf(list.author)}
            </Link>
            <span className="muted">updated {timeAgo(list.updatedAt)}</span>
            <span className="muted">{list.itemCount} games</span>
            {list.visibility !== 'public' && (
              <span className={`badge badge-${list.visibility}`}>{VISIBILITY_LABELS[list.visibility]}</span>
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
          <button
            type="button"
            className={`btn ${list.likedByMe ? 'btn-liked' : ''}`}
            onClick={toggleLike}
            aria-pressed={list.likedByMe}
            aria-label={`${list.likedByMe ? 'Unlike' : 'Like'} (${list.likeCount} likes)`}
          >
            <Heart size={18} weight={list.likedByMe ? 'fill' : 'regular'} aria-hidden="true" />
            {list.likeCount}
          </button>
          {list.visibility !== 'private' && (
            <button type="button" className="btn" onClick={share}>
              <ShareNetwork size={18} aria-hidden="true" />
              Share
            </button>
          )}
          {!list.isOwner && (
            <button type="button" className="btn" onClick={remix} title="Copy this list into your account and make it your own">
              <GitFork size={18} aria-hidden="true" />
              Remix
            </button>
          )}
          {list.isOwner && (
            <>
              <Link className="btn btn-primary" to={`/lists/${id}/edit`}>
                <PencilSimple size={18} aria-hidden="true" />
                Edit
              </Link>
              <button type="button" className="icon-btn icon-btn-danger" onClick={remove} aria-label="Delete list" title="Delete list">
                <Trash size={20} />
              </button>
            </>
          )}
        </div>
      </header>
      {list.isOwner && list.visibility === 'private' && (
        <p className="notice">
          <Lock size={18} aria-hidden="true" />
          This list is private. Edit it and set visibility to Public to share it with the community.
        </p>
      )}

      <TierBoard data={list.data} />
      <Comments listId={list.id} user={user} />
      <div className="toast-region" role="status" aria-live="polite">
        {notice && <div className="toast">{notice}</div>}
      </div>
    </article>
  );
}
