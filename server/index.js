import { fileURLToPath } from 'node:url';
import { appFromEnv } from './config.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT) || 3001;

const { app, games, dbPromise } = appFromEnv({
  root,
  staticDir: process.env.NODE_ENV === 'production' ? `${root}dist` : null,
});

dbPromise.then(
  () =>
    app.listen(port, () => {
      console.log(`Games Tier List API on http://localhost:${port} (game data: ${games.attribution.label})`);
    }),
  () => process.exit(1),
);
