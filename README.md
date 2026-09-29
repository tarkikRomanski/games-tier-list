# 🎮 Game Tiers

Rank video games in S‑to‑D tier lists and share them with the community.

- **Accounts** – sign up / log in with a username and password (scrypt-hashed, httpOnly session cookie), or with
  Google when it's configured.
- **Tier list editor** – search a catalogue of games, drag them into tiers (or tap a game then tap a tier on touch
  screens), rename/recolour/reorder/add/remove tiers, add games that aren't in the catalogue by name.
- **Sharing** – each list is *Private*, *Unlisted* (anyone with the link) or *Public* (shown in the community feed).
- **Profiles** – edit your profile at `/settings/profile`: upload a profile image (cropped and shrunk to 256px in
  the browser, stored in the database), set a display name, and change your nickname (the unique username used to log
  in and in `/u/<nickname>` links) once every 7 days.
- **Community** – feed of public lists (recent / most liked, searchable by title or game), likes, comments,
  user profiles, and **Remix** to copy someone else's list into your account and make it your own.

- **Languages** – the interface is available in English and Ukrainian. It follows the browser language on the first
  visit; the switcher in the header changes it and remembers the choice.

## Game data (free APIs)

| Provider | Key needed | Catalogue |
| --- | --- | --- |
| [RAWG](https://rawg.io/apidocs) | Free API key | 500,000+ games, all platforms |
| [FreeToGame](https://www.freetogame.com/api-doc) | None | ~400 free-to-play games |

Set `RAWG_API_KEY` to use RAWG (recommended). Without a key the app falls back to FreeToGame so it works out of
the box. Game searches are proxied through the server, so the key is never exposed to browsers. Each list stores a
snapshot of the game name and cover image, so saved lists keep working even if the API is down.

## Sign in with Google (optional)

The **Log in with Google** button appears only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), set up the OAuth consent screen,
   then create an **OAuth client ID** of type *Web application*.
2. Add an **Authorized redirect URI** for every place the app runs:
   - `http://localhost:5173/api/auth/google/callback` for `npm run dev`
   - `http://localhost:3001/api/auth/google/callback` for `npm start`
   - `https://<your-domain>/api/auth/google/callback` in production
3. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

The first Google sign-in creates an account with a username taken from the Google profile name (with a number added
if it's taken). Google accounts have no password, and they are separate from any username/password account.
The redirect URI is built from the request's host. If that doesn't match the public address (for example behind an
unusual proxy), set `PUBLIC_URL`, e.g. `https://tiers.example.com`.

## Running locally

Requires **Node.js 22+**. Locally the data lives in a SQLite file, so there is nothing else to install.

```bash
npm install
cp .env.example .env      # optional: add your RAWG_API_KEY
npm run dev               # API on :3001, web app on http://localhost:5173
```

Production:

```bash
npm run build
npm start                 # serves API + built frontend on http://localhost:3001
```

Set `SECURE_COOKIES=false` if you run the production build over plain `http` (e.g. on localhost); otherwise the
session cookie is only sent over HTTPS.

| Variable | Default | Purpose |
| --- | --- | --- |
| `RAWG_API_KEY` | – | Use RAWG instead of FreeToGame |
| `PORT` | `3001` | HTTP port |
| `DATABASE_URL` | – | libSQL/Turso URL, e.g. `libsql://my-db-me.turso.io` (required on Vercel) |
| `DATABASE_AUTH_TOKEN` | – | Turso auth token |
| `DATABASE_PATH` | `./data/tierlist.db` | Local SQLite file, used when `DATABASE_URL` is empty |
| `SECURE_COOKIES` | `true` in production | Mark the session cookie `Secure` |
| `GOOGLE_CLIENT_ID` | – | OAuth client ID; enables Sign in with Google (with the secret) |
| `GOOGLE_CLIENT_SECRET` | – | OAuth client secret |
| `PUBLIC_URL` | from request | Public origin used to build the Google redirect URI |

## Deploying to Vercel

Vercel functions have no persistent disk, so the database must be hosted. The app uses
[Turso](https://turso.tech) (hosted SQLite, free tier) through the same code as the local file.

1. **Create the database** (once):
   ```bash
   # install the CLI: https://docs.turso.tech/cli/installation
   turso auth signup                      # or: turso auth login
   turso db create games-tier-list
   turso db show games-tier-list --url    # -> DATABASE_URL
   turso db tokens create games-tier-list # -> DATABASE_AUTH_TOKEN
   ```
   Tables are created automatically on the first request.
2. **Import the repo** at [vercel.com/new](https://vercel.com/new) → pick `games-tier-list`. The settings come from
   `vercel.json` (build `npm run build`, output `dist`), so leave the defaults.
3. **Add environment variables** in the import screen (or Project → Settings → Environment Variables):
   `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `RAWG_API_KEY`, and optionally `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET` (add `https://<your-app>.vercel.app/api/auth/google/callback` as a redirect URI).
4. **Deploy.** Every push to the connected branch redeploys automatically.

How it runs on Vercel: the built React app in `dist/` is served from Vercel's CDN, and every `/api/*` request is
rewritten to one serverless function (`api/index.js`) that runs the same Express app as local development.
Login rate limits are kept in memory, so on Vercel they apply per function instance.

## Privacy Policy and Terms of Service

`/privacy` and `/terms` are linked from the site footer and the sign-up page. Before launch, fill in the operator
name, contact email and governing law in `client/src/legal.js`, and update `effectiveDate` whenever either page
changes. If you change what data the app collects or which services it uses, update `client/src/pages/Privacy.jsx`
to match.

## Tests

```bash
npm test
```

## Project layout

```
api/
  index.js      Vercel serverless entry point
server/
  app.js        Express app: auth, games search, tier lists, likes, comments, profiles
  auth.js       password hashing, sessions, rate limiting
  google.js     Sign in with Google (OAuth 2.0 authorization code flow with PKCE)
  config.js     builds the app from environment variables
  db.js         schema + libSQL client (local SQLite file or Turso)
  games.js      RAWG / FreeToGame providers
  validate.js   input validation
client/src/
  pages/        Feed, Auth, MyLists, Editor, ListView, Profile
  components/   TierBoard, GameSearch, GameTile, ListCard
test/           API and provider tests (node:test)
```

## Translations

Interface text lives in `client/src/i18n/`: `en.js` is the reference dictionary and `uk.js` the Ukrainian one (missing
keys fall back to English). Components read text with `const { t } = useI18n()` and `t('key', { name })`; an entry
can be an object of plural forms (`one`, `few`, `many`, `other`) picked by `count`. The API still answers in
English, and `client/src/i18n/errors.js` maps its messages to dictionary keys, so add an entry there when you add a
new server error. The Privacy Policy and Terms keep a full copy per language in their page components.

To add a language, create `client/src/i18n/<code>.js`, register it in `DICTIONARIES` and `LANGUAGES` in
`client/src/i18n/index.jsx`, add the code to the check in `client/index.html`, and add a content entry to the
legal pages.
