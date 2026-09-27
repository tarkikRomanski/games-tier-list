import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Feed from './pages/Feed.jsx';
import AuthPage from './pages/AuthPage.jsx';
import MyLists from './pages/MyLists.jsx';
import Editor from './pages/Editor.jsx';
import ListView from './pages/ListView.jsx';
import Profile from './pages/Profile.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="muted center">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">S</span> Game Tiers
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Community
          </NavLink>
          {user && <NavLink to="/my">My lists</NavLink>}
        </nav>
        <div className="nav-right">
          {user ? (
            <>
              <Link to="/new" className="btn btn-primary btn-sm">
                + New list
              </Link>
              <Link to={`/u/${user.username}`} className="user-chip" title="Your profile">
                {user.username}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                Log out
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
          <Route path="*" element={<div className="empty"><h2>Page not found</h2><Link to="/">Back to the community</Link></div>} />
        </Routes>
      </main>
    </>
  );
}
