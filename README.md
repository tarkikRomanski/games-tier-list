# 🎮 Game Tiers

Rank video games in S‑to‑D tier lists and share them with the community.

- **Accounts** – sign up / log in with a username and password (scrypt-hashed, httpOnly session cookie).
- **Tier list editor** – search a catalogue of games, drag them into tiers (or tap a game then tap a tier on touch
  screens), rename/recolour/reorder/add/remove tiers, add games that aren't in the catalogue by name.
- **Sharing** – each list is *Private*, *Unlisted* (anyone with the link) or *Public* (shown in the community feed).
- **Community** – feed of public lists (recent / most liked, searchable by title or game), likes, comments,
  user profiles, and **Remix** to copy someone else's list into your account and make it your own.

## Game data (free APIs)

| Provider | Key needed | Catalogue |
| --- | --- | --- |
| [RAWG](https://rawg.io/apidocs) | Free API key | 500,000+ games, all platforms |
| [FreeToGame](https://www.freetogame.com/api-doc) | None | ~400 free-to-play games |

Set `RAWG_API_KEY` to use RAWG (recommended). Without a key the app falls back to FreeToGame so it works out of
the box. Game searches are proxied through the server, so the key is never exposed to browsers. Each list stores a
snapshot of the game name and cover image, so saved lists keep working even if the API is down.

## Running locally

Requires **Node.js 22.13+** (uses the built-in `node:sqlite`, no native modules).

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
| `DATABASE_PATH` | `./data/tierlist.db` | SQLite database file |
| `SECURE_COOKIES` | `true` in production | Mark the session cookie `Secure` |

## Tests

```bash
npm test
```

## Project layout

```
server/
  app.js        Express app: auth, games search, tier lists, likes, comments, profiles
  auth.js       password hashing, sessions, rate limiting
  db.js         SQLite schema
  games.js      RAWG / FreeToGame providers
  validate.js   input validation
client/src/
  pages/        Feed, Auth, MyLists, Editor, ListView, Profile
  components/   TierBoard, GameSearch, GameTile, ListCard
test/           API and provider tests (node:test)
```
