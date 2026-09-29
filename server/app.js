import express from 'express';
import { randomBytes } from 'node:crypto';
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
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  OAUTH_TTL_MS,
  beginGoogleLogin,
  finishGoogleLogin,
  readOAuthCookie,
  stateMatches,
  usernameBase,
} from './google.js';
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

export function createApp({
  db: dbOrPromise,
  games,
  google = null,
  secureCookies = false,
  staticDir = null,
  trustProxy = 'loopback',
}) {
  // `db` may be a promise so serverless entry points can start handling requests before it is ready.
  let db;
  const dbReady = Promise.resolve(dbOrPromise).then((d) => (db = d));
  dbReady.catch((err) => console.error('Database initialisation failed:', err));

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(express.json({ limit: '512kb' }));

  const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
  const writeLimiter = rateLimiter({ windowMs: 60 * 1000, max: 60 });

  // Resolve the logged-in user from the session cookie.
  app.use('/api', async (req, _res, next) => {
    await dbReady;
    req.sessionToken = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.user = await userForToken(db, req.sessionToken);
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
    if (await db.get('SELECT 1 FROM users WHERE username = ?', [username])) {
      throw new HttpError(409, 'That username is taken');
    }
    const hash = await hashPassword(password);
    const { lastInsertRowid } = await db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    const { token } = await createSession(db, lastInsertRowid);
    setSessionCookie(res, token);
    res.status(201).json({ user: { id: lastInsertRowid, username } });
  });

  api.post('/auth/login', async (req, res) => {
    if (!authLimiter(`login:${req.ip}`)) throw new HttpError(429, 'Too many attempts, try again later');
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const row = await db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      throw new HttpError(401, 'Wrong username or password');
    }
    const { token } = await createSession(db, row.id);
    setSessionCookie(res, token);
    res.json({ user: { id: row.id, username: row.username } });
  });

  api.post('/auth/logout', async (req, res) => {
    await destroySession(db, req.sessionToken);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  api.get('/auth/me', (req, res) => res.json({ user: req.user }));

  // ---------- Sign in with Google ----------
  api.get('/auth/providers', (_req, res) => res.json({ google: Boolean(google) }));

  // Google must be given the exact redirect URI registered in the Google Cloud console.
  const googleRedirectUri = (req) => `${google.publicUrl || `${req.protocol}://${req.get('host')}`}/api/auth/google/callback`;
  const oauthCookieOptions = { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: OAUTH_COOKIE_PATH };

  api.get('/auth/google', (req, res) => {
    if (!google) throw new HttpError(404, 'Google sign-in is not enabled');
    if (!authLimiter(`google:${req.ip}`)) throw new HttpError(429, 'Too many attempts, try again later');
    const { url, cookie } = beginGoogleLogin({ clientId: google.clientId, redirectUri: googleRedirectUri(req), next: req.query.next });
    res.cookie(OAUTH_COOKIE, cookie, { ...oauthCookieOptions, maxAge: OAUTH_TTL_MS });
    res.redirect(302, url);
  });

  api.get('/auth/google/callback', async (req, res) => {
    if (!google) throw new HttpError(404, 'Google sign-in is not enabled');
    const pending = readOAuthCookie(parseCookies(req.headers.cookie)[OAUTH_COOKIE]);
    res.clearCookie(OAUTH_COOKIE, oauthCookieOptions);
    const fail = (reason) => res.redirect(302, `/login?error=${reason}`);

    if (req.query.error) return fail('google_cancelled');
    if (!pending || !stateMatches(pending.state, req.query.state) || typeof req.query.code !== 'string') {
      return fail('google_failed');
    }
    let identity;
    try {
      identity = await finishGoogleLogin({
        clientId: google.clientId,
        clientSecret: google.clientSecret,
        redirectUri: googleRedirectUri(req),
        code: req.query.code,
        verifier: pending.verifier,
        fetchImpl: google.fetchImpl,
      });
    } catch (err) {
      console.error('Google sign-in failed:', err.message);
      return fail('google_failed');
    }

    let row = await db.get('SELECT id FROM users WHERE google_sub = ?', [identity.sub]);
    if (!row) row = { id: await createGoogleUser(identity) };
    const { token } = await createSession(db, row.id);
    setSessionCookie(res, token);
    res.redirect(302, pending.next);
  });

  // Google accounts have no password: the hash is a value no scrypt check can ever match.
  const createGoogleUser = async (identity) => {
    const base = usernameBase(identity);
    for (let attempt = 0; attempt < 8; attempt++) {
      const username = attempt === 0 ? base : `${base}_${randomBytes(2).readUInt16BE() % 10000}`;
      if (await db.get('SELECT 1 FROM users WHERE username = ?', [username])) continue;
      try {
        const { lastInsertRowid } = await db.run('INSERT INTO users (username, password_hash, google_sub) VALUES (?, ?, ?)', [
          username,
          'google',
          identity.sub,
        ]);
        return lastInsertRowid;
      } catch (err) {
        // Lost a race for the same Google account: use the row the other request created.
        const existing = await db.get('SELECT id FROM users WHERE google_sub = ?', [identity.sub]);
        if (existing) return existing.id;
        if (!/UNIQUE/i.test(err.message)) throw err;
      }
    }
    throw new HttpError(500, 'Could not pick a username, please try again');
  };

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
  const loadList = async (id, viewerId) => {
    const listId = Number(id);
    if (!Number.isInteger(listId) || listId < 1) return null;
    return db.get(`${LIST_SELECT} WHERE l.id = :id`, { id: listId, viewer: viewerId ?? 0 });
  };
  const loadViewableList = async (req) => {
    const row = await loadList(req.params.id, req.user?.id);
    if (!row || (row.visibility === 'private' && row.user_id !== req.user?.id)) {
      throw new HttpError(404, 'Tier list not found');
    }
    return row;
  };
  const loadOwnList = async (req) => {
    const row = await loadList(req.params.id, req.user.id);
    if (!row || row.user_id !== req.user.id) throw new HttpError(404, 'Tier list not found');
    return row;
  };
  const listDetail = async (row, viewer) => {
    let forkedFrom = null;
    if (row.forked_from) {
      const src = await loadList(row.forked_from, viewer?.id);
      if (src && (src.visibility === 'public' || src.user_id === viewer?.id)) {
        forkedFrom = { id: src.id, title: src.title, author: { username: src.author } };
      }
    }
    return { ...listSummary(row), data: JSON.parse(row.data), isOwner: row.user_id === viewer?.id, forkedFrom };
  };

  // Community feed: public lists only.
  api.get('/lists', async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    const order = req.query.sort === 'top' ? 'like_count DESC, l.updated_at DESC' : 'l.updated_at DESC';
    const params = { viewer: req.user?.id ?? 0, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE };
    let where = "l.visibility = 'public'";
    if (q) {
      where += " AND (l.title LIKE :q ESCAPE '\\' OR l.description LIKE :q ESCAPE '\\' OR l.data LIKE :q ESCAPE '\\')";
      params.q = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    }
    const rows = await db.all(`${LIST_SELECT} WHERE ${where} ORDER BY ${order} LIMIT :limit OFFSET :offset`, params);
    res.json({ lists: rows.slice(0, PAGE_SIZE).map(listSummary), hasMore: rows.length > PAGE_SIZE });
  });

  api.get('/lists/mine', requireUser, async (req, res) => {
    const rows = await db.all(`${LIST_SELECT} WHERE l.user_id = :owner ORDER BY l.updated_at DESC`, {
      viewer: req.user.id,
      owner: req.user.id,
    });
    res.json({ lists: rows.map(listSummary) });
  });

  api.post('/lists', requireUser, async (req, res) => {
    const input = validateListInput(req.body);
    const { lastInsertRowid } = await db.run(
      `INSERT INTO tier_lists (user_id, title, description, visibility, data, cover_image, item_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        input.title,
        input.description,
        input.visibility,
        JSON.stringify(input.data),
        coverOf(input.data),
        countItems(input.data),
      ],
    );
    res.status(201).json({ list: await listDetail(await loadList(lastInsertRowid, req.user.id), req.user) });
  });

  api.get('/lists/:id', async (req, res) => {
    res.json({ list: await listDetail(await loadViewableList(req), req.user) });
  });

  api.put('/lists/:id', requireUser, async (req, res) => {
    const row = await loadOwnList(req);
    const input = validateListInput(req.body, { partial: true });
    const next = {
      title: input.title ?? row.title,
      description: input.description ?? row.description,
      visibility: input.visibility ?? row.visibility,
      data: input.data ?? JSON.parse(row.data),
    };
    await db.run(
      `UPDATE tier_lists SET title = ?, description = ?, visibility = ?, data = ?, cover_image = ?,
         item_count = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        next.title,
        next.description,
        next.visibility,
        JSON.stringify(next.data),
        coverOf(next.data),
        countItems(next.data),
        row.id,
      ],
    );
    res.json({ list: await listDetail(await loadList(row.id, req.user.id), req.user) });
  });

  api.delete('/lists/:id', requireUser, async (req, res) => {
    const row = await loadOwnList(req);
    // Cascade by hand: hosted libSQL connections don't keep `PRAGMA foreign_keys` between requests.
    await db.transaction([
      ['DELETE FROM likes WHERE list_id = ?', [row.id]],
      ['DELETE FROM comments WHERE list_id = ?', [row.id]],
      ['UPDATE tier_lists SET forked_from = NULL WHERE forked_from = ?', [row.id]],
      ['DELETE FROM tier_lists WHERE id = ?', [row.id]],
    ]);
    res.json({ ok: true });
  });

  // Copy someone's list into your own account as a private draft.
  api.post('/lists/:id/copy', requireUser, async (req, res) => {
    const src = await loadViewableList(req);
    const title = `${src.title} (remix)`.slice(0, LIMITS.title);
    const { lastInsertRowid } = await db.run(
      `INSERT INTO tier_lists (user_id, title, description, visibility, data, cover_image, item_count, forked_from)
       VALUES (?, ?, ?, 'private', ?, ?, ?, ?)`,
      [req.user.id, title, src.description, src.data, src.cover_image, src.item_count, src.id],
    );
    res.status(201).json({ list: await listDetail(await loadList(lastInsertRowid, req.user.id), req.user) });
  });

  // ---------- Likes ----------
  api.post('/lists/:id/like', requireUser, async (req, res) => {
    const row = await loadViewableList(req);
    await db.run('INSERT OR IGNORE INTO likes (user_id, list_id) VALUES (?, ?)', [req.user.id, row.id]);
    const { n } = await db.get('SELECT COUNT(*) AS n FROM likes WHERE list_id = ?', [row.id]);
    res.json({ liked: true, likeCount: n });
  });

  api.delete('/lists/:id/like', requireUser, async (req, res) => {
    const row = await loadViewableList(req);
    await db.run('DELETE FROM likes WHERE user_id = ? AND list_id = ?', [req.user.id, row.id]);
    const { n } = await db.get('SELECT COUNT(*) AS n FROM likes WHERE list_id = ?', [row.id]);
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

  api.get('/lists/:id/comments', async (req, res) => {
    const list = await loadViewableList(req);
    const rows = await db.all(
      `SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.list_id = ? ORDER BY c.created_at ASC, c.id ASC LIMIT 500`,
      [list.id],
    );
    res.json({ comments: rows.map((c) => commentJson(c, list, req.user)) });
  });

  api.post('/lists/:id/comments', requireUser, async (req, res) => {
    const list = await loadViewableList(req);
    const body = cleanText(req.body?.body, { field: 'Comment', min: 1, max: LIMITS.comment });
    const { lastInsertRowid } = await db.run('INSERT INTO comments (list_id, user_id, body) VALUES (?, ?, ?)', [
      list.id,
      req.user.id,
      body,
    ]);
    const c = await db.get('SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?', [
      lastInsertRowid,
    ]);
    res.status(201).json({ comment: commentJson(c, list, req.user) });
  });

  api.delete('/comments/:id', requireUser, async (req, res) => {
    const c = await db.get(
      'SELECT c.id, c.user_id, l.user_id AS owner_id FROM comments c JOIN tier_lists l ON l.id = c.list_id WHERE c.id = ?',
      [Number(req.params.id) || 0],
    );
    if (!c || (c.user_id !== req.user.id && c.owner_id !== req.user.id)) throw new HttpError(404, 'Comment not found');
    await db.run('DELETE FROM comments WHERE id = ?', [c.id]);
    res.json({ ok: true });
  });

  // ---------- Profiles ----------
  api.get('/users/:username', async (req, res) => {
    const user = await db.get('SELECT id, username, created_at FROM users WHERE username = ?', [
      String(req.params.username),
    ]);
    if (!user) throw new HttpError(404, 'User not found');
    const rows = await db.all(
      `${LIST_SELECT} WHERE l.user_id = :owner AND l.visibility = 'public' ORDER BY l.updated_at DESC`,
      { viewer: req.user?.id ?? 0, owner: user.id },
    );
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
