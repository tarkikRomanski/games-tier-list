import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Stack, UserCircle } from '@phosphor-icons/react';
import { api } from '../api.js';
import ListCard from '../components/ListCard.jsx';
import { Avatar, EmptyState, SkeletonGrid } from '../components/ui.jsx';

export default function Profile() {
  const { username } = useParams();
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
  return (
    <>
      <header className="profile-head">
        <Avatar name={state.user.username} size="lg" />
        <div>
          <h1>{state.user.username}</h1>
          <p className="muted small">
            Joined {new Date(state.user.joinedAt).toLocaleDateString()}. {count} public tier {count === 1 ? 'list' : 'lists'}.
          </p>
        </div>
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
