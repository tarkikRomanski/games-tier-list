import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ListCard from '../components/ListCard.jsx';

export default function MyLists() {
  const [lists, setLists] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/lists/mine').then(
      (r) => setLists(r.lists),
      (err) => setError(err.message),
    );
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>My tier lists</h1>
        <Link to="/new" className="btn btn-primary">
          + New tier list
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {lists === null && !error && <p className="muted center">Loading…</p>}
      {lists?.length === 0 && (
        <div className="empty">
          <h3>You haven&apos;t made any tier lists yet.</h3>
          <Link to="/new" className="btn btn-primary">
            Create your first one
          </Link>
        </div>
      )}
      <div className="grid">
        {lists?.map((l) => (
          <ListCard key={l.id} list={l} showVisibility />
        ))}
      </div>
    </>
  );
}
