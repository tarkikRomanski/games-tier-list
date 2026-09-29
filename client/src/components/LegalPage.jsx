import { useEffect } from 'react';
import { LEGAL } from '../legal.js';

/** Shared layout for the policy pages: title, intro, table of contents and numbered sections. */
export default function LegalPage({ title, sections, children }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Game Tiers`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <article className="legal">
      <header className="legal-head">
        <h1>{title}</h1>
        <p className="muted small">Effective {LEGAL.effectiveDate}</p>
        <p className="legal-intro">{children}</p>
      </header>
      <nav className="legal-toc" aria-label="On this page">
        <h2 className="legal-toc-title">On this page</h2>
        <ol>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="legal-body">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
            <h2 id={`${s.id}-title`}>
              <span className="legal-num">{i + 1}.</span> {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </div>
    </article>
  );
}
