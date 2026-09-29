import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';

/** Profile image, or an initial-letter avatar when the user has none. */
export function Avatar({ name, src, size = 'md' }) {
  if (src) return <img className={`avatar avatar-${size}`} src={src} alt="" aria-hidden="true" />;
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Three-bar tier mark used as the brand logo. */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/** Google's multi-colour "G" mark, as required by its sign-in branding guidelines. */
export function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Placeholder grid shaped like a row of list cards. */
export function SkeletonGrid({ count = 6 }) {
  const { t } = useI18n();
  return (
    <div className="grid" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: count }, (_, i) => (
        <div className="card card-skeleton" key={i}>
          <div className="card-cover skeleton" />
          <div className="card-body">
            <div className="skeleton skeleton-line" style={{ width: '70%' }} />
            <div className="skeleton skeleton-line" style={{ width: '45%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder shaped like a tier board. */
export function SkeletonBoard({ rows = 5 }) {
  const { t } = useI18n();
  return (
    <div className="board" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <div className="tier-row" key={i}>
          <div className="tier-label skeleton" />
          <div className="tier-items" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty-icon">
          <Icon size={28} weight="duotone" />
        </span>
      )}
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <EmptyState title={t('notFound.title')} action={<Link to="/" className="btn">{t('common.backToCommunity')}</Link>}>
      {t('notFound.body')}
    </EmptyState>
  );
}
