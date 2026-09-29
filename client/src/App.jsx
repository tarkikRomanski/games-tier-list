import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { GearSix, Moon, Plus, SignOut, Sun } from '@phosphor-icons/react';
import { useAuth } from './auth.jsx';
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
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
      <Icon size={20} />
    </button>
  );
}

function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="Game Tiers home">
          <BrandMark />
          <span className="brand-name">Game Tiers</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Community
          </NavLink>
          {user && <NavLink to="/my">My lists</NavLink>}
        </nav>
        <div className="nav-right">
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/new" className="btn btn-accent btn-sm">
                <Plus size={16} weight="bold" aria-hidden="true" />
                <span className="hide-sm">New list</span>
              </Link>
              <Link to={`/u/${user.username}`} className="user-chip" title="Your profile">
                <Avatar name={displayNameOf(user)} src={user.avatarUrl} size="sm" />
                <span className="hide-sm">{displayNameOf(user)}</span>
              </Link>
              <Link to="/settings/profile" className="icon-btn" aria-label="Edit profile" title="Edit profile">
                <GearSix size={20} />
              </Link>
              <button type="button" className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
                <SignOut size={20} />
              </button>
            </>
          ) : user === null ? (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default function App() {
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
          <nav aria-label="Legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
