export class ValidationError extends Error {
  status = 400;
}

const fail = (msg) => {
  throw new ValidationError(msg);
};

export const LIMITS = {
  title: 100,
  description: 1000,
  tiers: 20,
  tierLabel: 40,
  items: 500,
  itemName: 120,
  comment: 1000,
};

export const VISIBILITIES = ['private', 'unlisted', 'public'];

export function cleanText(value, { field, max, min = 0 }) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') fail(`${field} must be text`);
  // Strip control characters (keeps newlines/tabs) and trim.
  const text = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (text.length < min) fail(min === 1 ? `${field} is required` : `${field} must be at least ${min} characters`);
  if (text.length > max) fail(`${field} must be at most ${max} characters`);
  return text;
}

export function validateCredentials(body) {
  const username = cleanText(body?.username, { field: 'Username', min: 3, max: 24 });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) fail('Username may only contain letters, numbers and underscores');
  const password = body?.password;
  if (typeof password !== 'string' || password.length < 8) fail('Password must be at least 8 characters');
  if (password.length > 200) fail('Password is too long');
  return { username, password };
}

function validateImage(image) {
  if (image === undefined || image === null || image === '') return null;
  if (typeof image !== 'string' || image.length > 500) fail('Invalid image URL');
  let url;
  try {
    url = new URL(image);
  } catch {
    fail('Invalid image URL');
  }
  if (url.protocol !== 'https:') fail('Image URLs must use https');
  return url.href;
}

function validateItem(item, seen) {
  if (!item || typeof item !== 'object') fail('Invalid game entry');
  const id = item.id;
  if (typeof id !== 'string' || !/^(rawg|ftg|custom):[A-Za-z0-9_-]{1,64}$/.test(id)) fail('Invalid game id');
  if (seen.has(id)) fail('A game can only appear once in a tier list');
  seen.add(id);
  return {
    id,
    name: cleanText(item.name, { field: 'Game name', min: 1, max: LIMITS.itemName }),
    image: validateImage(item.image),
  };
}

export function validateTierData(data) {
  if (!data || typeof data !== 'object') fail('Tier list data is required');
  const { tiers, pool = [] } = data;
  if (!Array.isArray(tiers) || tiers.length === 0) fail('A tier list needs at least one tier');
  if (tiers.length > LIMITS.tiers) fail(`A tier list can have at most ${LIMITS.tiers} tiers`);
  if (!Array.isArray(pool)) fail('Invalid unranked games');

  const seenItems = new Set();
  const seenTiers = new Set();
  const cleanTiers = tiers.map((tier) => {
    if (!tier || typeof tier !== 'object') fail('Invalid tier');
    if (typeof tier.id !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(tier.id)) fail('Invalid tier id');
    if (seenTiers.has(tier.id)) fail('Duplicate tier id');
    seenTiers.add(tier.id);
    if (typeof tier.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(tier.color)) fail('Invalid tier color');
    if (!Array.isArray(tier.items)) fail('Invalid tier items');
    return {
      id: tier.id,
      label: cleanText(tier.label, { field: 'Tier label', min: 1, max: LIMITS.tierLabel }),
      color: tier.color.toLowerCase(),
      items: tier.items.map((it) => validateItem(it, seenItems)),
    };
  });
  const cleanPool = pool.map((it) => validateItem(it, seenItems));
  if (seenItems.size > LIMITS.items) fail(`A tier list can have at most ${LIMITS.items} games`);
  return { tiers: cleanTiers, pool: cleanPool };
}

export function validateListInput(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body?.title !== undefined) {
    out.title = cleanText(body?.title, { field: 'Title', min: 1, max: LIMITS.title });
  }
  if (!partial || body?.description !== undefined) {
    out.description = cleanText(body?.description, { field: 'Description', max: LIMITS.description });
  }
  if (!partial || body?.visibility !== undefined) {
    const v = body?.visibility ?? 'private';
    if (!VISIBILITIES.includes(v)) fail('Invalid visibility');
    out.visibility = v;
  }
  if (!partial || body?.data !== undefined) {
    out.data = validateTierData(body?.data);
  }
  return out;
}
