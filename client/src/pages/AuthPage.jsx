import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { BrandMark, GoogleMark } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';

const GOOGLE_ERRORS = {
  google_cancelled: 'auth.googleCancelled',
  google_failed: 'auth.googleFailed',
};

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, providers, login, register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const googleError = GOOGLE_ERRORS[searchParams.get('error')];
  const [error, setError] = useState(() => (googleError ? t(googleError) : ''));
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
      <h1>{t(isLogin ? 'auth.welcomeBack' : 'auth.createAccount')}</h1>
      <p className="muted">{t(isLogin ? 'auth.loginSubtitle' : 'auth.registerSubtitle')}</p>
      {providers.google && (
        <>
          <a className="btn btn-lg btn-google" href={`/api/auth/google?next=${encodeURIComponent(redirectTo)}`}>
            <GoogleMark />
            {t(isLogin ? 'auth.loginGoogle' : 'auth.signupGoogle')}
          </a>
          <p className="divider">
            <span>{t('auth.orUsername')}</span>
          </p>
        </>
      )}
      <form onSubmit={submit} className="stack">
        <label className="field">
          {t('auth.username')}
          <input
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={isLogin ? undefined : 3}
            maxLength={24}
            pattern={isLogin ? undefined : '[A-Za-z0-9_]+'}
            title={isLogin ? undefined : t('auth.usernamePattern')}
            required
          />
        </label>
        <label className="field">
          {t('auth.password')}
          <input
            className="input"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isLogin ? undefined : 8}
            required
          />
          {!isLogin && <span className="muted tiny">{t('auth.passwordHint')}</span>}
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? t('common.pleaseWait') : t(isLogin ? 'nav.login' : 'nav.signup')}
        </button>
      </form>
      {!isLogin && (
        <p className="muted small auth-legal">
          {t('auth.agree', {
            terms: <Link to="/terms">{t('auth.agreeTerms')}</Link>,
            privacy: <Link to="/privacy">{t('auth.agreePrivacy')}</Link>,
          })}
        </p>
      )}
      <p className="muted small auth-switch">
        {isLogin
          ? t('auth.noAccount', { link: <Link to="/register" state={location.state}>{t('nav.signup')}</Link> })
          : t('auth.haveAccount', { link: <Link to="/login" state={location.state}>{t('nav.login')}</Link> })}
      </p>
    </div>
  );
}
