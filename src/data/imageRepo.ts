import { getDb } from './db';
import { searchFoodImages, type FoodImage } from './wikimedia/client';

// Cache for 24h: makes revisits instant, keeps us offline-friendly, and is
// courteous to Wikimedia's shared API.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheRow = { json: string; fetched_at: number };

// Cached-or-fetched photos for a food. Empty results are cached too, so a
// name with no Commons hits doesn't re-query on every visit. A stale cache
// row is served as a fallback when the refetch fails (offline).
export async function getFoodImages(
  foodCode: string,
  nameEn: string,
): Promise<FoodImage[]> {
  // Without an English name there's nothing to search on.
  if (!nameEn.trim()) return [];

  const db = await getDb();
  const row = await db.getFirstAsync<CacheRow>(
    'SELECT json, fetched_at FROM image_cache WHERE food_code = ?',
    foodCode,
  );

  const cached = row ? parseImages(row.json) : null;
  if (row && cached && Date.now() - row.fetched_at < CACHE_TTL_MS) {
    return cached;
  }

  const fresh = await searchFoodImages(nameEn);
  if (fresh.length === 0 && cached && cached.length > 0) {
    // Fetch failed or dried up — keep showing what we had rather than nothing.
    return cached;
  }

  await db.runAsync(
    'INSERT OR REPLACE INTO image_cache (food_code, json, fetched_at) VALUES (?, ?, ?)',
    foodCode,
    JSON.stringify(fresh),
    Date.now(),
  );
  return fresh;
}

function parseImages(json: string): FoodImage[] | null {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
