// Shared visual tokens. Warm, food-forward palette; one accent (Vietnamese
// lacquer red) against near-neutral surfaces so data stays readable.

export const colors = {
  bg: '#FBF7F2',
  surface: '#FFFFFF',
  border: '#ECE4DA',
  text: '#231F1C',
  textMuted: '#7A7069',
  accent: '#C0392B', // lacquer red
  accentSoft: '#FBEBE8',
  local: '#2E7D5B', // authoritative local data (green)
  localSoft: '#E3F1EA',
  ai: '#B7791F', // AI estimate (amber)
  aiSoft: '#FBF0DA',
  veg: '#2E7D5B',
  nonVeg: '#C0392B',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;
