import { config } from '../../config';

// One image hit, trimmed to what the UI needs. previewURL/webformatURL both
// point at a ~480px Commons thumbnail (the strip only renders one size);
// pageURL is the Commons file page, kept for attribution. Field names match
// the old Pixabay shape so cached rows keep rendering across the switch.
export type FoodImage = {
  previewURL: string;
  webformatURL: string;
  pageURL: string;
  tags: string;
};

// Images are decorative: on any failure (network, bad payload) we return []
// and the UI hides the strip. Never throw past this module.
const REQUEST_TIMEOUT_MS = 15_000;
const THUMB_WIDTH = 480;
// Over-fetch so we still have enough after dropping non-photos (svg/pdf).
const SEARCH_LIMIT = 12;
const MAX_RESULTS = 6;

// Wikimedia asks API clients to send a descriptive User-Agent.
const API_USER_AGENT =
  'FoodScanVN/1.0 (https://github.com/thanhphuong080199/foodscan-vn)';

// Only real photos — skip SVG diagrams and PDF book scans that Commons keeps
// in the File namespace alongside photographs.
const PHOTO_MIME = /^image\/(jpeg|png|webp|gif)$/;

// Preparation/state qualifiers in the VTN English names ("Under milled,
// home-pounded rice", "Fresh maize seeds, raw") that describe processing, not
// the food itself — they wreck Commons relevance, so strip them and keep the
// core noun phrase. Order-independent; applied word by word.
const QUALIFIER_WORDS = new Set([
  'under', 'milled', 'home-pounded', 'pounded', 'polished', 'ordinary',
  'raw', 'dried', 'dry', 'boiled', 'fresh', 'hulled', 'cooked', 'uncooked',
  'ground', 'refined', 'unrefined', 'steamed', 'roasted', 'fried', 'canned',
  'salted', 'smoked', 'frozen', 'milky', 'or', 'and', 'type',
]);

// Turn a VTN English name into a focused Commons query: drop parentheticals
// and commas, then remove the preparation qualifiers above. E.g.
// "Under milled, home-pounded rice" -> "rice", "Fresh maize seeds, raw" ->
// "maize seeds".
export function cleanImageQuery(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\- ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !QUALIFIER_WORDS.has(w))
    .join(' ')
    .trim();
}

export async function searchFoodImages(nameEn: string): Promise<FoodImage[]> {
  const q = cleanImageQuery(nameEn);
  if (!q) return [];

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: q,
    gsrnamespace: '6', // File namespace
    gsrlimit: String(SEARCH_LIMIT),
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: String(THUMB_WIDTH),
    origin: '*', // anonymous CORS, needed on web builds
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${config.wikimediaBaseUrl}?${params}`, {
      signal: controller.signal,
      headers: { 'Api-User-Agent': API_USER_AGENT },
    });
    if (!res.ok) {
      console.warn(`[wikimedia] HTTP ${res.status} for "${q}"`);
      return [];
    }
    const payload = await res.json();
    const pages = payload?.query?.pages;
    if (!pages || typeof pages !== 'object') return [];

    return Object.values(pages)
      // generator=search tags each page with a relevance rank in `index`.
      .sort((a: any, b: any) => (a?.index ?? 0) - (b?.index ?? 0))
      .map((page: any) => {
        const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
        if (!info || typeof info.thumburl !== 'string') return null;
        if (typeof info.mime === 'string' && !PHOTO_MIME.test(info.mime)) {
          return null;
        }
        return {
          previewURL: info.thumburl,
          webformatURL: info.thumburl,
          pageURL: typeof info.descriptionurl === 'string' ? info.descriptionurl : '',
          tags: fileTitleToTags(page?.title),
        } as FoodImage;
      })
      .filter((x): x is FoodImage => x !== null)
      .slice(0, MAX_RESULTS);
  } catch (e: any) {
    console.warn(
      `[wikimedia] ${e?.name === 'AbortError' ? 'timed out' : 'fetch failed'}:`,
      e?.message ?? e,
    );
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// "File:Red Maize Seed.jpg" -> "Red Maize Seed" for the image alt text.
function fileTitleToTags(title: unknown): string {
  if (typeof title !== 'string') return '';
  return title
    .replace(/^File:/i, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}
