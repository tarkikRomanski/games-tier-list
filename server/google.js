import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// "Sign in with Google" via the OAuth 2.0 authorization code flow with PKCE
// (https://developers.google.com/identity/openid-connect/openid-connect).
// No SDK: two redirects and one server-to-server token exchange.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

export const OAUTH_COOKIE = 'gtl_oauth';
export const OAUTH_COOKIE_PATH = '/api/auth/google';
export const OAUTH_TTL_MS = 10 * 60 * 1000;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** Only same-site paths are allowed as post-login destinations. */
export function safeNext(next) {
  // Browsers drop tabs and newlines from URLs, so "/\t/evil.com" would become "//evil.com": reject any
  // whitespace or control character outright.
  return typeof next === 'string' && /^\/(?![/\\])[^\s\x00-\x1f\x7f]*$/.test(next) && next.length <= 200 ? next : '/my';
}

/**
 * Starts a sign-in: returns the Google URL to redirect to and the value for the short-lived
 * cookie that ties the callback to this browser (state + PKCE verifier + where to go afterwards).
 */
export function beginGoogleLogin({ clientId, redirectUri, next }) {
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  const cookie = b64url(JSON.stringify({ state, verifier, next: safeNext(next) }));
  return { url: url.toString(), cookie };
}

export function readOAuthCookie(value) {
  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (typeof parsed?.state === 'string' && typeof parsed?.verifier === 'string') {
      return { state: parsed.state, verifier: parsed.verifier, next: safeNext(parsed.next) };
    }
  } catch {
    // fall through
  }
  return null;
}

export function stateMatches(expected, actual) {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(actual ?? ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Exchanges the authorization code for tokens and returns the verified identity from the ID token.
 * The ID token comes straight from Google's token endpoint over TLS, so per the OpenID Connect spec
 * its signature needn't be re-checked; its audience, issuer and expiry still are.
 */
export async function finishGoogleLogin({ clientId, clientSecret, redirectUri, code, verifier, fetchImpl = fetch }) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token: idToken } = await res.json();
  const payload = decodeJwtPayload(idToken);
  const audOk = Array.isArray(payload.aud) ? payload.aud.includes(clientId) : payload.aud === clientId;
  if (!audOk) throw new Error('Google ID token has the wrong audience');
  if (!ISSUERS.has(payload.iss)) throw new Error('Google ID token has the wrong issuer');
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) throw new Error('Google ID token has expired');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Google ID token has no subject');
  return {
    sub: payload.sub,
    email: payload.email_verified ? payload.email : null,
    name: typeof payload.given_name === 'string' ? payload.given_name : typeof payload.name === 'string' ? payload.name : null,
  };
}

function decodeJwtPayload(jwt) {
  const part = typeof jwt === 'string' ? jwt.split('.')[1] : undefined;
  if (!part) throw new Error('Google returned no ID token');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

/** Username candidate from the Google profile: letters, digits and underscores, 3-24 chars. */
export function usernameBase({ name, email }) {
  const raw = name || (email ? email.split('@')[0] : '') || 'player';
  let base = raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 18);
  if (base.length < 3) base = `player${base}`.slice(0, 18);
  return base;
}
