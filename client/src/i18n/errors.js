import { formatDate } from '../util.js';
import { t } from './index.jsx';

// The API answers in English. These tables map its messages (server/app.js, server/validate.js) to dictionary keys,
// so errors show in the reader's language. Anything unrecognised is shown as the server sent it.
const EXACT = {
  'Requests must be sent as JSON': 'err.json',
  'You need to log in first': 'err.loginFirst',
  'Slow down a little and try again in a minute': 'err.slowDown',
  'Too many attempts, try again later': 'err.tooManyAttempts',
  'That username is taken': 'err.usernameTaken',
  'Wrong username or password': 'err.wrongCredentials',
  'Google sign-in is not enabled': 'err.googleDisabled',
  'Could not pick a username, please try again': 'err.pickUsername',
  'The game catalogue is unavailable right now. You can still add games manually.': 'err.catalogueDown',
  'Tier list not found': 'err.listNotFound',
  'Comment not found': 'err.commentNotFound',
  'User not found': 'err.userNotFound',
  'No profile image': 'err.noProfileImage',
  'That nickname is taken': 'err.nicknameTaken',
  'You changed your nickname recently, try again later': 'err.nicknameRecent',
  'Not found': 'err.notFound',
  'Invalid JSON body': 'err.invalidJson',
  'Request is too large': 'err.tooLarge',
  'Something went wrong': 'err.generic',
  'Password must be at least 8 characters': 'err.passwordShort',
  'Password is too long': 'err.passwordLong',
  'Invalid image URL': 'err.invalidImageUrl',
  'Image URLs must use https': 'err.imageHttps',
  'Invalid game entry': 'err.invalidGame',
  'Invalid game id': 'err.invalidGameId',
  'A game can only appear once in a tier list': 'err.gameOnce',
  'Tier list data is required': 'err.dataRequired',
  'A tier list needs at least one tier': 'err.needTier',
  'Invalid unranked games': 'err.invalidPool',
  'Invalid tier': 'err.invalidTier',
  'Invalid tier id': 'err.invalidTierId',
  'Duplicate tier id': 'err.duplicateTierId',
  'Invalid tier color': 'err.invalidTierColor',
  'Invalid tier items': 'err.invalidTierItems',
  'Invalid visibility': 'err.invalidVisibility',
  'Invalid profile image': 'err.invalidAvatar',
  'Profile image must be a PNG, JPEG or WebP picture': 'err.avatarType',
  'Profile image is too large': 'err.avatarLarge',
  'Profile image is not a valid picture': 'err.avatarBroken',
};

const field = (name) => {
  const text = t(`field.${name}`);
  return text === `field.${name}` ? name : text;
};

const PATTERNS = [
  [/^A tier list can have at most (\d+) tiers$/, (m) => t('err.maxTiers', { max: m[1] })],
  [/^A tier list can have at most (\d+) games$/, (m) => t('err.maxGames', { max: m[1] })],
  [/^You can change your nickname again on (.+)$/, (m) => t('err.nicknameAgainOn', { date: formatDate(`${m[1]} UTC`, { dateStyle: 'long', timeZone: 'UTC' }) || m[1] })],
  [/^(.+) must be text$/, (m) => t('err.fieldText', { field: field(m[1]) })],
  [/^(.+) is required$/, (m) => t('err.fieldRequired', { field: field(m[1]) })],
  [/^(.+) must be at least (\d+) characters$/, (m) => t('err.fieldMin', { field: field(m[1]), count: Number(m[2]) })],
  [/^(.+) must be at most (\d+) characters$/, (m) => t('err.fieldMax', { field: field(m[1]), count: Number(m[2]) })],
  [/^(.+) may only contain letters, numbers and underscores$/, (m) => t('err.fieldChars', { field: field(m[1]) })],
];

/** The server's error message in the active language. */
export function translateServerError(message) {
  if (!message) return message;
  if (EXACT[message]) return t(EXACT[message]);
  for (const [re, render] of PATTERNS) {
    const m = re.exec(message);
    if (m) return render(m);
  }
  return message;
}

