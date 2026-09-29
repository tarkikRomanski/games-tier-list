import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { GearSix, Moon, Plus, SignOut, Sun, Translate } from '@phosphor-icons/react';
import { useAuth } from './auth.jsx';
import { LANGUAGES, useI18n } from './i18n/index.jsx';
import { Avatar, BrandMark, NotFound, SkeletonGrid } from './components/ui.jsx';
import Feed from './pages/Feed.jsx';
import AuthPage from './pages/AuthPage.jsx';
import MyLists from './pages/MyLists.jsx';
import Editor from './pages/Editor.jsx';
import ListView from './pages/ListView.jsx';
import Profile from './pages/Profile.jsx';
import EditProfile from './pages/EditProfile.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import { displayNameOf } from './util.js';

/** Start each new page at the top, unless the link points at a section on it. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SkeletonGrid count={3} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** Light/dark toggle. Follows the system until the user picks a theme. */
function ThemeToggle() {
  const { t } = useI18n();
  const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || (systemDark() ? 'dark' : 'light'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable: the choice lasts for this page view only */
    }
  };

  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}>
      <Icon size={20} />
    </button>
  );
}

/** Interface language picker: a native select laid over a compact icon-and-code button. */
function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <label className="icon-btn lang-switch" title={t('nav.language')}>
      <Translate size={20} aria-hidden="true" />
      <span className="lang-code" aria-hidden="true">
        {current.short}
      </span>
      <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('nav.language')}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label={t('nav.home')}>
          <BrandMark />
          <span className="brand-name">Game Tiers</span>
        </Link>
        <nav className="nav" aria-label={t('nav.main')}>
          <NavLink to="/" end>
            {t('nav.community')}
          </NavLink>
          {user && <NavLink to="/my">{t('nav.myLists')}</NavLink>}
        </nav>
        <div className="nav-right">
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/new" className="btn btn-accent btn-sm">
                <Plus size={16} weight="bold" aria-hidden="true" />
                <span className="hide-sm">{t('nav.newList')}</span>
              </Link>
              <Link to={`/u/${user.username}`} className="user-chip" title={t('nav.yourProfile')}>
                <Avatar name={displayNameOf(user)} src={user.avatarUrl} size="sm" />
                <span className="hide-sm">{displayNameOf(user)}</span>
              </Link>
              <Link to="/settings/profile" className="icon-btn" aria-label={t('nav.editProfile')} title={t('nav.editProfile')}>
                <GearSix size={20} />
              </Link>
              <button type="button" className="icon-btn" onClick={logout} aria-label={t('nav.logout')} title={t('nav.logout')}>
                <SignOut size={20} />
              </button>
            </>
          ) : user === null ? (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                {t('nav.signup')}
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const { t } = useI18n();
  return (
    <>
      <ScrollToTop />
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/my" element={<RequireAuth><MyLists /></RequireAuth>} />
          <Route path="/new" element={<RequireAuth><Editor /></RequireAuth>} />
          <Route path="/lists/:id" element={<ListView />} />
          <Route path="/lists/:id/edit" element={<RequireAuth><Editor /></RequireAuth>} />
          <Route path="/u/:username" element={<Profile />} />
          <Route path="/settings/profile" element={<RequireAuth><EditProfile /></RequireAuth>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <span className="muted">Game Tiers</span>
          <nav aria-label={t('footer.legal')}>
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
