import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Stack } from '@phosphor-icons/react';
import { api } from '../api.js';
import ListCard from '../components/ListCard.jsx';
import { EmptyState, SkeletonGrid } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function MyLists() {
  const { t } = useI18n();
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
        <h1>{t('my.title')}</h1>
        <Link to="/new" className="btn btn-accent">
          <Plus size={18} weight="bold" aria-hidden="true" />
          {t('my.new')}
        </Link>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {lists === null && !error && <SkeletonGrid count={3} />}
      {lists?.length === 0 && (
        <EmptyState
          icon={Stack}
          title={t('my.empty')}
          action={
            <Link to="/new" className="btn btn-accent">
              {t('my.createFirst')}
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
