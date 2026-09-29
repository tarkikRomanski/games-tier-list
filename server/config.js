import { createApp } from './app.js';
import { openDb } from './db.js';
import { createGamesProvider } from './games.js';

/** Builds the app from environment variables. Shared by the local server and the Vercel function. */
export function appFromEnv({ root, staticDir = null } = {}) {
  const env = process.env;
  const isProd = env.NODE_ENV === 'production' || Boolean(env.VERCEL);

  let url = env.DATABASE_URL || env.TURSO_DATABASE_URL;
  if (!url) {
    if (env.VERCEL) {
      throw new Error('Set DATABASE_URL (and DATABASE_AUTH_TOKEN) to a Turso database: Vercel has no persistent disk.');
    }
    url = `file:${env.DATABASE_PATH || `${root}data/tierlist.db`}`;
  }
  const authToken = env.DATABASE_AUTH_TOKEN || env.TURSO_AUTH_TOKEN || undefined;

  const dbPromise = openDb(url, authToken).then(async (db) => {
    await db.run('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
    return db;
  });

  const games = createGamesProvider(env);
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, publicUrl: env.PUBLIC_URL || null }
      : null;
  const app = createApp({
    db: dbPromise,
    games,
    google,
    secureCookies: env.SECURE_COOKIES ? env.SECURE_COOKIES === 'true' : isProd,
    // On Vercel the platform's proxy sets the client IP header, so trust it for rate limiting.
    trustProxy: env.VERCEL ? true : 'loopback',
    staticDir,
  });
  return { app, games, dbPromise };
}
