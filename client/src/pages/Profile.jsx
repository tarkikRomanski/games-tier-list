import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import ListCard from '../components/ListCard.jsx';

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

  if (state.loading) return <p className="muted center">Loading…</p>;
  if (state.error) return <div className="empty"><h2>{state.error}</h2></div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{state.user.username}</h1>
          <p className="muted small">
            Joined {new Date(state.user.joinedAt).toLocaleDateString()} · {state.lists.length} public tier lists
          </p>
        </div>
      </div>
      {state.lists.length === 0 && <p className="muted">No public tier lists yet.</p>}
      <div className="grid">
        {state.lists.map((l) => (
          <ListCard key={l.id} list={l} />
        ))}
      </div>
    </>
  );
}
