import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  google_sub    TEXT,
  display_name  TEXT,
  avatar        TEXT,
  avatar_version INTEGER,
  username_changed_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tier_lists (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  data        TEXT NOT NULL,
  cover_image TEXT,
  item_count  INTEGER NOT NULL DEFAULT 0,
  forked_from INTEGER REFERENCES tier_lists(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tier_lists_user ON tier_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_lists_public ON tier_lists(visibility, updated_at);

CREATE TABLE IF NOT EXISTS likes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id    INTEGER NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, list_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_list ON likes(list_id);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id    INTEGER NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_list ON comments(list_id, created_at);

-- One row per list and viewer, so the count is of unique viewers. \`viewer\` is 'u:<user id>' for a logged-in
-- reader, or 'v:<SHA-256 of the visitor cookie>' for a logged-out one. The list's author is never recorded.
CREATE TABLE IF NOT EXISTS list_views (
  list_id    INTEGER NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  viewer     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (list_id, viewer)
);
`;

/**
 * Opens the database. `url` is a libSQL URL:
 *  - `file:data/tierlist.db` – a local SQLite file (default for local development)
 *  - `libsql://<db>.turso.io` – a hosted Turso database (needed on Vercel, whose disk isn't persistent)
 *  - `:memory:` – throwaway database for tests
 * Returns a small async query helper; rows are plain objects keyed by column name.
 */
export async function openDb(url = ':memory:', authToken) {
  if (url.startsWith('file:')) mkdirSync(dirname(url.slice('file:'.length)), { recursive: true });
  const client = createClient({ url, authToken });
  const normalize = (stmt, args) => (typeof stmt === 'string' ? { sql: stmt, args: args ?? [] } : stmt);

  const db = {
    client,
    async get(sql, args) {
      return (await client.execute(normalize(sql, args))).rows[0];
    },
    async all(sql, args) {
      return (await client.execute(normalize(sql, args))).rows;
    },
    async run(sql, args) {
      const r = await client.execute(normalize(sql, args));
      return { lastInsertRowid: r.lastInsertRowid === undefined ? undefined : Number(r.lastInsertRowid), changes: r.rowsAffected };
    },
    /** Runs several statements in one transaction: [[sql, args], ...]. */
    async transaction(statements) {
      await client.batch(statements.map(([sql, args]) => normalize(sql, args)), 'write');
    },
  };

  if (!url.startsWith('libsql:') && !url.startsWith('https:') && !url.startsWith('wss:')) {
    await client.execute('PRAGMA foreign_keys = ON');
  }
  await client.executeMultiple(SCHEMA);
  await migrate(db);
  return db;
}

/** Upgrades databases created before a column existed. Each step is idempotent. */
async function migrate(db) {
  const userColumns = (await db.all('PRAGMA table_info(users)')).map((c) => c.name);
  if (!userColumns.includes('google_sub')) await db.run('ALTER TABLE users ADD COLUMN google_sub TEXT');
  if (!userColumns.includes('display_name')) await db.run('ALTER TABLE users ADD COLUMN display_name TEXT');
  if (!userColumns.includes('avatar')) await db.run('ALTER TABLE users ADD COLUMN avatar TEXT');
  if (!userColumns.includes('avatar_version')) await db.run('ALTER TABLE users ADD COLUMN avatar_version INTEGER');
  if (!userColumns.includes('username_changed_at')) {
    await db.run('ALTER TABLE users ADD COLUMN username_changed_at INTEGER');
  }
  await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)');
}
