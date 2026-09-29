import { Link } from 'react-router-dom';

/** Initial-letter avatar for a username. */
export function Avatar({ name, size = 'md' }) {
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

/** Placeholder grid shaped like a row of list cards. */
export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading">
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
  return (
    <div className="board" aria-busy="true" aria-label="Loading">
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
  return (
    <EmptyState title="Page not found" action={<Link to="/" className="btn">Back to the community</Link>}>
      That link doesn&apos;t lead anywhere.
    </EmptyState>
  );
}
