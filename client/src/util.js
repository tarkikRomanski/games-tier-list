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

export function timeAgo(isoDate) {
  const s = Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export const VISIBILITY_LABELS = {
  private: 'Private',
  unlisted: 'Unlisted',
  public: 'Public',
};

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
