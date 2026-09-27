import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const redirectTo = location.state?.from || '/my';

  if (user) return <Navigate to={redirectTo} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await (isLogin ? login : register)(username, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
      <p className="muted">{isLogin ? 'Log in to build and share tier lists.' : 'Rank your games and share your takes with the community.'}</p>
      <form onSubmit={submit} className="stack">
        <label className="field">
          Username
          <input
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={isLogin ? undefined : 3}
            maxLength={24}
            pattern={isLogin ? undefined : '[A-Za-z0-9_]+'}
            title={isLogin ? undefined : 'Letters, numbers and underscores'}
            required
          />
        </label>
        <label className="field">
          Password
          <input
            className="input"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isLogin ? undefined : 8}
            required
          />
          {!isLogin && <span className="muted tiny">At least 8 characters.</span>}
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
        </button>
      </form>
      <p className="muted small">
        {isLogin ? (
          <>No account yet? <Link to="/register" state={location.state}>Sign up</Link></>
        ) : (
          <>Already have an account? <Link to="/login" state={location.state}>Log in</Link></>
        )}
      </p>
    </div>
  );
}
