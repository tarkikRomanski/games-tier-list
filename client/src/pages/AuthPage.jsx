import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { BrandMark, GoogleMark } from '../components/ui.jsx';

const GOOGLE_ERRORS = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_failed: "Couldn't sign in with Google. Please try again.",
};

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, providers, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => GOOGLE_ERRORS[searchParams.get('error')] || '');
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
      <BrandMark />
      <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
      <p className="muted">{isLogin ? 'Log in to build and share tier lists.' : 'Rank your games and share your takes with the community.'}</p>
      {providers.google && (
        <>
          <a className="btn btn-lg btn-google" href={`/api/auth/google?next=${encodeURIComponent(redirectTo)}`}>
            <GoogleMark />
            {isLogin ? 'Log in with Google' : 'Sign up with Google'}
          </a>
          <p className="divider">
            <span>or use a username</span>
          </p>
        </>
      )}
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
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
        </button>
      </form>
      {!isLogin && (
        <p className="muted small auth-legal">
          By signing up you agree to our <Link to="/terms">Terms of Service</Link> and{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      )}
      <p className="muted small auth-switch">
        {isLogin ? (
          <>No account yet? <Link to="/register" state={location.state}>Sign up</Link></>
        ) : (
          <>Already have an account? <Link to="/login" state={location.state}>Log in</Link></>
        )}
      </p>
    </div>
  );
}
