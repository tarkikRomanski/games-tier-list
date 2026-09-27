import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
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
  return db;
}
