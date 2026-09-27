import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSession,
  destroySession,
  hashPassword,
  parseCookies,
  rateLimiter,
  userForToken,
  verifyPassword,
} from './auth.js';
import { LIMITS, ValidationError, cleanText, validateCredentials, validateListInput } from './validate.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const PAGE_SIZE = 20;
const iso = (sqlTime) => (sqlTime ? `${sqlTime.replace(' ', 'T')}Z` : null);

function coverOf(data) {
  for (const tier of data.tiers) for (const item of tier.items) if (item.image) return item.image;
  for (const item of data.pool) if (item.image) return item.image;
  return null;
}
const countItems = (data) => data.pool.length + data.tiers.reduce((n, t) => n + t.items.length, 0);

const LIST_SELECT = `
  SELECT l.*, u.username AS author,
    (SELECT COUNT(*) FROM likes WHERE list_id = l.id) AS like_count,
    (SELECT COUNT(*) FROM comments WHERE list_id = l.id) AS comment_count,
    EXISTS (SELECT 1 FROM likes WHERE list_id = l.id AND user_id = :viewer) AS liked
  FROM tier_lists l JOIN users u ON u.id = l.user_id`;

function listSummary(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    coverImage: row.cover_image,
    itemCount: row.item_count,
    author: { username: row.author },
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: Boolean(row.liked),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function createApp({ db, games, secureCookies = false, staticDir = null }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(express.json({ limit: '512kb' }));

  const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
  const writeLimiter = rateLimiter({ windowMs: 60 * 1000, max: 60 });

  // Resolve the logged-in user from the session cookie.
  app.use((req, _res, next) => {
    req.sessionToken = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.user = userForToken(db, req.sessionToken);
    next();
  });

  // CSRF defence: state-changing API calls must be JSON, which a cross-site HTML form cannot send
  // without a CORS preflight (which we never approve). Combined with SameSite=Lax cookies.
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.is('application/json')) {
      return next(new HttpError(415, 'Requests must be sent as JSON'));
    }
    next();
  });

  const requireUser = (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'You need to log in first'));
    if (req.method !== 'GET' && !writeLimiter(`u${req.user.id}`)) {
      return next(new HttpError(429, 'Slow down a little and try again in a minute'));
    }
    next();
  };

  const setSessionCookie = (res, token) =>
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      maxAge: SESSION_TTL_MS,
      path: '/',
    });

  // ---------- Auth ----------
  const api = express.Router();

  api.post('/auth/register', async (req, res) => {
    if (!authLimiter(`reg:${req.ip}`)) throw new HttpError(429, 'Too many attempts, try again later');
    const { username, password } = validateCredentials(req.body);
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
      throw new HttpError(409, 'That username is taken');
    }
    const hash = await hashPassword(password);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username, hash);
    const { token } = createSession(db, Number(lastInsertRowid));
    setSessionCookie(res, token);
    res.status(201).json({ user: { id: Number(lastInsertRowid), username } });
  });

  api.post('/auth/login', async (req, res) => {
    if (!authLimiter(`login:${req.ip}`)) throw new HttpError(429, 'Too many attempts, try again later');
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      throw new HttpError(401, 'Wrong username or password');
    }
    const { token } = createSession(db, row.id);
    setSessionCookie(res, token);
    res.json({ user: { id: row.id, username: row.username } });
  });

  api.post('/auth/logout', (req, res) => {
    destroySession(db, req.sessionToken);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  api.get('/auth/me', (req, res) => res.json({ user: req.user }));

  // ---------- Games catalogue ----------
  api.get('/games/search', async (req, res) => {
    const q = String(req.query.q ?? '').slice(0, 100);
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 50);
    try {
      const result = await games.search(q, page);
      res.json({ ...result, source: games.attribution });
    } catch (err) {
      console.error('Game search failed:', err.message);
      throw new HttpError(502, 'The game catalogue is unavailable right now. You can still add games manually.');
    }
  });

  // ---------- Tier lists ----------
  const loadList = (id, viewerId) => {
    const listId = Number(id);
    if (!Number.isInteger(listId) || listId < 1) return null;
    return db.prepare(`${LIST_SELECT} WHERE l.id = :id`).get({ id: listId, viewer: viewerId ?? 0 });
  };
  const loadViewableList = (req) => {
    const row = loadList(req.params.id, req.user?.id);
    if (!row || (row.visibility === 'private' && row.user_id !== req.user?.id)) {
      throw new HttpError(404, 'Tier list not found');
    }
    return row;
  };
  const loadOwnList = (req) => {
    const row = loadList(req.params.id, req.user.id);
    if (!row || row.user_id !== req.user.id) throw new HttpError(404, 'Tier list not found');
    return row;
  };
  const listDetail = (row, viewer) => {
    let forkedFrom = null;
    if (row.forked_from) {
      const src = loadList(row.forked_from, viewer?.id);
      if (src && (src.visibility === 'public' || src.user_id === viewer?.id)) {
        forkedFrom = { id: src.id, title: src.title, author: { username: src.author } };
      }
    }
    return { ...listSummary(row), data: JSON.parse(row.data), isOwner: row.user_id === viewer?.id, forkedFrom };
  };

  // Community feed: public lists only.
  api.get('/lists', (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    const order = req.query.sort === 'top' ? 'like_count DESC, l.updated_at DESC' : 'l.updated_at DESC';
    const params = { viewer: req.user?.id ?? 0, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE };
    let where = "l.visibility = 'public'";
    if (q) {
      where += " AND (l.title LIKE :q ESCAPE '\\' OR l.description LIKE :q ESCAPE '\\' OR l.data LIKE :q ESCAPE '\\')";
      params.q = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    }
    const rows = db.prepare(`${LIST_SELECT} WHERE ${where} ORDER BY ${order} LIMIT :limit OFFSET :offset`).all(params);
    res.json({ lists: rows.slice(0, PAGE_SIZE).map(listSummary), hasMore: rows.length > PAGE_SIZE });
  });

  api.get('/lists/mine', requireUser, (req, res) => {
    const rows = db
      .prepare(`${LIST_SELECT} WHERE l.user_id = :owner ORDER BY l.updated_at DESC`)
      .all({ viewer: req.user.id, owner: req.user.id });
    res.json({ lists: rows.map(listSummary) });
  });

  api.post('/lists', requireUser, (req, res) => {
    const input = validateListInput(req.body);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO tier_lists (user_id, title, description, visibility, data, cover_image, item_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        req.user.id,
        input.title,
        input.description,
        input.visibility,
        JSON.stringify(input.data),
        coverOf(input.data),
        countItems(input.data),
      );
    res.status(201).json({ list: listDetail(loadList(lastInsertRowid, req.user.id), req.user) });
  });

  api.get('/lists/:id', (req, res) => {
    res.json({ list: listDetail(loadViewableList(req), req.user) });
  });

  api.put('/lists/:id', requireUser, (req, res) => {
    const row = loadOwnList(req);
    const input = validateListInput(req.body, { partial: true });
    const next = {
      title: input.title ?? row.title,
      description: input.description ?? row.description,
      visibility: input.visibility ?? row.visibility,
      data: input.data ?? JSON.parse(row.data),
    };
    db.prepare(
      `UPDATE tier_lists SET title = ?, description = ?, visibility = ?, data = ?, cover_image = ?,
         item_count = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(
      next.title,
      next.description,
      next.visibility,
      JSON.stringify(next.data),
      coverOf(next.data),
      countItems(next.data),
      row.id,
    );
    res.json({ list: listDetail(loadList(row.id, req.user.id), req.user) });
  });

  api.delete('/lists/:id', requireUser, (req, res) => {
    const row = loadOwnList(req);
    db.prepare('DELETE FROM tier_lists WHERE id = ?').run(row.id);
    res.json({ ok: true });
  });

  // Copy someone's list into your own account as a private draft.
  api.post('/lists/:id/copy', requireUser, (req, res) => {
    const src = loadViewableList(req);
    const title = `${src.title} (remix)`.slice(0, LIMITS.title);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO tier_lists (user_id, title, description, visibility, data, cover_image, item_count, forked_from)
         VALUES (?, ?, ?, 'private', ?, ?, ?, ?)`,
      )
      .run(req.user.id, title, src.description, src.data, src.cover_image, src.item_count, src.id);
    res.status(201).json({ list: listDetail(loadList(lastInsertRowid, req.user.id), req.user) });
  });

  // ---------- Likes ----------
  api.post('/lists/:id/like', requireUser, (req, res) => {
    const row = loadViewableList(req);
    db.prepare('INSERT OR IGNORE INTO likes (user_id, list_id) VALUES (?, ?)').run(req.user.id, row.id);
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE list_id = ?').get(row.id);
    res.json({ liked: true, likeCount: n });
  });

  api.delete('/lists/:id/like', requireUser, (req, res) => {
    const row = loadViewableList(req);
    db.prepare('DELETE FROM likes WHERE user_id = ? AND list_id = ?').run(req.user.id, row.id);
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE list_id = ?').get(row.id);
    res.json({ liked: false, likeCount: n });
  });

  // ---------- Comments ----------
  const commentJson = (c, list, viewer) => ({
    id: c.id,
    body: c.body,
    author: { username: c.username },
    createdAt: iso(c.created_at),
    canDelete: Boolean(viewer) && (c.user_id === viewer.id || list.user_id === viewer.id),
  });

  api.get('/lists/:id/comments', (req, res) => {
    const list = loadViewableList(req);
    const rows = db
      .prepare(
        `SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id
         WHERE c.list_id = ? ORDER BY c.created_at ASC, c.id ASC LIMIT 500`,
      )
      .all(list.id);
    res.json({ comments: rows.map((c) => commentJson(c, list, req.user)) });
  });

  api.post('/lists/:id/comments', requireUser, (req, res) => {
    const list = loadViewableList(req);
    const body = cleanText(req.body?.body, { field: 'Comment', min: 1, max: LIMITS.comment });
    const { lastInsertRowid } = db
      .prepare('INSERT INTO comments (list_id, user_id, body) VALUES (?, ?, ?)')
      .run(list.id, req.user.id, body);
    const c = db
      .prepare('SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?')
      .get(lastInsertRowid);
    res.status(201).json({ comment: commentJson(c, list, req.user) });
  });

  api.delete('/comments/:id', requireUser, (req, res) => {
    const c = db
      .prepare('SELECT c.id, c.user_id, l.user_id AS owner_id FROM comments c JOIN tier_lists l ON l.id = c.list_id WHERE c.id = ?')
      .get(Number(req.params.id) || 0);
    if (!c || (c.user_id !== req.user.id && c.owner_id !== req.user.id)) throw new HttpError(404, 'Comment not found');
    db.prepare('DELETE FROM comments WHERE id = ?').run(c.id);
    res.json({ ok: true });
  });

  // ---------- Profiles ----------
  api.get('/users/:username', (req, res) => {
    const user = db
      .prepare('SELECT id, username, created_at FROM users WHERE username = ?')
      .get(String(req.params.username));
    if (!user) throw new HttpError(404, 'User not found');
    const rows = db
      .prepare(`${LIST_SELECT} WHERE l.user_id = :owner AND l.visibility = 'public' ORDER BY l.updated_at DESC`)
      .all({ viewer: req.user?.id ?? 0, owner: user.id });
    res.json({ user: { username: user.username, joinedAt: iso(user.created_at) }, lists: rows.map(listSummary) });
  });

  api.use((_req, _res, next) => next(new HttpError(404, 'Not found')));
  app.use('/api', api);

  // ---------- Frontend (production build) ----------
  if (staticDir && existsSync(join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.get('/{*path}', (_req, res) => res.sendFile(join(staticDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ValidationError || err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
