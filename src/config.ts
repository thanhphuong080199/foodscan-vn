// App configuration. Secrets come from EXPO_PUBLIC_* env vars (see .env.example).

const DEFAULT_MODELS = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
];

function parseModels(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_MODELS;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : DEFAULT_MODELS;
}

export const config = {
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  // Ordered fallback chain: on rate-limit (429) the client tries the next one.
  geminiModels: parseModels(process.env.EXPO_PUBLIC_GEMINI_MODELS),
  geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',

  // Local-name fuzzy match: token-overlap score below this => fall back to AI estimate.
  foodMatchThreshold: 0.5,
} as const;

export function hasApiKey(): boolean {
  const k = config.geminiApiKey;
  return !!k && k !== 'your_key_here';
}
