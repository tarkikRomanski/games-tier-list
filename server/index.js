import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDb } from './db.js';
import { createGamesProvider } from './games.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3001;

const db = openDb(process.env.DATABASE_PATH || `${root}data/tierlist.db`);
db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

const games = createGamesProvider();
const app = createApp({
  db,
  games,
  secureCookies: process.env.SECURE_COOKIES ? process.env.SECURE_COOKIES === 'true' : isProd,
  staticDir: isProd ? `${root}dist` : null,
});

app.listen(port, () => {
  console.log(`Games Tier List API on http://localhost:${port} (game data: ${games.attribution.label})`);
});
