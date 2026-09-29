import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Stack } from '@phosphor-icons/react';
import { api } from '../api.js';
import ListCard from '../components/ListCard.jsx';
import { EmptyState, SkeletonGrid } from '../components/ui.jsx';

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
        <Link to="/new" className="btn btn-accent">
          <Plus size={18} weight="bold" aria-hidden="true" />
          New tier list
        </Link>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {lists === null && !error && <SkeletonGrid count={3} />}
      {lists?.length === 0 && (
        <EmptyState
          icon={Stack}
          title="You haven't made any tier lists yet."
          action={
            <Link to="/new" className="btn btn-accent">
              Create your first one
            </Link>
          }
        />
      )}
      <div className="grid">
        {lists?.map((l, i) => (
          <ListCard key={l.id} list={l} index={i} showVisibility />
        ))}
      </div>
    </>
  );
}
