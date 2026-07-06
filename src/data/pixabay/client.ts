import { config, hasPixabayKey } from '../../config';

// One photo hit, trimmed to what the UI needs. previewURL is a small thumb
// (~150px), webformatURL a medium size (~640px) suitable for the strip.
export type FoodImage = {
  previewURL: string;
  webformatURL: string;
  pageURL: string;
  tags: string;
};

// Images are decorative: on any failure (no key, network, bad payload) we
// return [] and the UI hides the strip. Never throw past this module.
const REQUEST_TIMEOUT_MS = 15_000;
const PER_PAGE = 6;

// Pixabay wants a focused query. VTN English names carry qualifiers after a
// comma or in parentheses ("Chicken egg, boiled", "Water spinach (raw)") that
// hurt photo relevance — keep only the head noun phrase.
export function cleanImageQuery(nameEn: string): string {
  return nameEn
    .split(/[,(]/)[0]
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export async function searchFoodImages(nameEn: string): Promise<FoodImage[]> {
  const q = cleanImageQuery(nameEn);
  if (!q || !hasPixabayKey()) return [];

  const params = new URLSearchParams({
    key: config.pixabayApiKey,
    q,
    image_type: 'photo',
    category: 'food',
    safesearch: 'true',
    per_page: String(PER_PAGE),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${config.pixabayBaseUrl}?${params}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[pixabay] HTTP ${res.status} for "${q}"`);
      return [];
    }
    const payload = await res.json();
    const hits = Array.isArray(payload?.hits) ? payload.hits : [];
    return hits
      .filter(
        (h: any) =>
          typeof h?.previewURL === 'string' && typeof h?.webformatURL === 'string',
      )
      .map((h: any) => ({
        previewURL: h.previewURL,
        webformatURL: h.webformatURL,
        pageURL: typeof h.pageURL === 'string' ? h.pageURL : '',
        tags: typeof h.tags === 'string' ? h.tags : '',
      }));
  } catch (e: any) {
    console.warn(`[pixabay] ${e?.name === 'AbortError' ? 'timed out' : 'fetch failed'}:`, e?.message ?? e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
