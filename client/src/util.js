import { getLanguage, t } from './i18n/index.jsx';

export const DEFAULT_TIERS = [
  { label: 'S', color: '#ff7f7f' },
  { label: 'A', color: '#ffbf7f' },
  { label: 'B', color: '#ffdf7f' },
  { label: 'C', color: '#ffff7f' },
  { label: 'D', color: '#bfff7f' },
];

export const TIER_PALETTE = ['#ff7f7f', '#ffbf7f', '#ffdf7f', '#ffff7f', '#bfff7f', '#7fff7f', '#7fffff', '#7fbfff', '#bf7fff', '#ff7fdf'];

export const newId = () => Math.random().toString(36).slice(2, 10);

export const emptyTierData = () => ({
  tiers: DEFAULT_TIERS.map((t) => ({ id: newId(), ...t, items: [] })),
  pool: [],
});

/** The name to show for a user: their chosen name, falling back to the nickname. */
export const displayNameOf = (user) => user.displayName || user.username;

/** How long ago a date was, in the active language: "5 minutes ago", "5 хвилин тому". */
export function timeAgo(isoDate) {
  const s = Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return new Intl.RelativeTimeFormat(getLanguage(), { numeric: 'always' }).format(-n, name);
  }
  return t('time.justNow');
}

/** A localised date, long by default: "29 September 2026", "29 вересня 2026 р.". Empty for an unparseable value. */
export function formatDate(value, options = { dateStyle: 'long' }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(getLanguage(), options);
}

/** Size modifier class for a tier label, so longer names shrink to fit the label box. */
export function tierLabelSize(label = '') {
  const text = label.trim();
  const longestWord = Math.max(0, ...text.split(/\s+/).map((w) => w.length));
  const len = Math.max(text.length / 2, longestWord);
  if (len <= 3) return '';
  if (len <= 6) return 'tier-label-md';
  if (len <= 10) return 'tier-label-sm';
  return 'tier-label-xs';
}

/** Dark or light text colour, whichever reads better on the given hex background. */
export function inkFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#141417';
  const n = parseInt(m[1], 16);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.22 ? '#141417' : '#f4f4f5';
}
