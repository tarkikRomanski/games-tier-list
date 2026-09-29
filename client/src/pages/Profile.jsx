import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PencilSimple, Stack, UserCircle } from '@phosphor-icons/react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import ListCard from '../components/ListCard.jsx';
import { Avatar, EmptyState, SkeletonGrid } from '../components/ui.jsx';
import { displayNameOf } from '../util.js';

export default function Profile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    setState({ loading: true });
    api.get(`/users/${encodeURIComponent(username)}`).then(
      (r) => setState(r),
      (err) => setState({ error: err.message }),
    );
  }, [username]);

  if (state.loading) return <SkeletonGrid count={3} />;
  if (state.error) return <EmptyState icon={UserCircle} title={state.error} />;

  const count = state.lists.length;
  const isMe = me?.username.toLowerCase() === state.user.username.toLowerCase();
  return (
    <>
      <header className="profile-head">
        <Avatar name={displayNameOf(state.user)} src={state.user.avatarUrl} size="lg" />
        <div className="profile-head-main">
          <h1>{displayNameOf(state.user)}</h1>
          {state.user.displayName && <p className="muted">@{state.user.username}</p>}
          <p className="muted small">
            Joined {new Date(state.user.joinedAt).toLocaleDateString()}. {count} public tier {count === 1 ? 'list' : 'lists'}.
          </p>
        </div>
        {isMe && (
          <Link to="/settings/profile" className="btn btn-sm">
            <PencilSimple size={16} aria-hidden="true" />
            Edit profile
          </Link>
        )}
      </header>
      {count === 0 && <EmptyState icon={Stack} title="No public tier lists yet." />}
      <div className="grid">
        {state.lists.map((l, i) => (
          <ListCard key={l.id} list={l} index={i} />
        ))}
      </div>
    </>
  );
}
