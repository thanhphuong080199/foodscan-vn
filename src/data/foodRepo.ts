import { getDb } from './db';
import type { FoodRow } from './types';
import { normalize, tokenOverlapScore } from '../domain/normalize';
import { config } from '../config';

export type FoodSearchHit = { food: FoodRow; score: number };

// Free-text lookup over the 526-row cache for the manual search screen. Matches
// the query against both Vietnamese and English names, diacritic-insensitively.
// Ranking: whole-query substring (prefix > mid-word) beats loose token overlap,
// so "trung ga" surfaces "Trứng gà" ahead of foods sharing only one token.
export async function searchFoods(
  query: string,
  limit = 40,
): Promise<FoodSearchHit[]> {
  const q = normalize(query);
  if (!q) return [];

  const foods = await getAllFoods();
  const hits: FoodSearchHit[] = [];
  for (const food of foods) {
    const nvn = normalize(food.food_name_vn);
    const nen = normalize(food.food_name_en);
    const score = Math.max(nameScore(q, nvn), nameScore(q, nen) * 0.95);
    if (score > 0) hits.push({ food, score });
  }

  hits.sort((a, b) => b.score - a.score || a.food.food_name_vn.localeCompare(b.food.food_name_vn));
  return hits.slice(0, limit);
}

// Score one normalized name against the normalized query. Substring is the
// strong signal (2 = starts-with, 1.5 = word-boundary, 1 = anywhere); otherwise
// fall back to token overlap in [0,1] so multi-word queries still partial-match.
function nameScore(q: string, name: string): number {
  if (!name) return 0;
  if (name === q) return 3;
  const idx = name.indexOf(q);
  if (idx === 0) return 2;
  if (idx > 0) return name[idx - 1] === ' ' ? 1.5 : 1;
  return tokenOverlapScore(q, name);
}

// 526 rows is tiny — load once and match in JS.
let allFoodsCache: FoodRow[] | null = null;

export async function getAllFoods(): Promise<FoodRow[]> {
  if (allFoodsCache) return allFoodsCache;
  const db = await getDb();
  allFoodsCache = await db.getAllAsync<FoodRow>('SELECT * FROM foods');
  return allFoodsCache;
}

// TSV catalog (food_code<TAB>name_vn<TAB>name_en) inlined into the Gemini prompt
// so it can return an exact food_code. Built once from the in-memory cache.
let catalogCache: string | null = null;

export async function getFoodCatalogTsv(): Promise<string> {
  if (catalogCache) return catalogCache;
  const foods = await getAllFoods();
  catalogCache = foods
    .map((f) => `${f.food_code}\t${f.food_name_vn}\t${f.food_name_en}`)
    .join('\n');
  return catalogCache;
}

export async function getByCode(code: string): Promise<FoodRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FoodRow>(
    'SELECT * FROM foods WHERE food_code = ?',
    code,
  );
  return row ?? null;
}

export type FoodMatch = { food: FoodRow; score: number };

// Best local match for the AI-identified food. Tries the Vietnamese name and
// the English name against each DB row (vn weighted higher). Exact normalized
// match short-circuits to score 1. Returns null if nothing clears the threshold.
export async function matchFood(
  nameVn: string,
  nameEn?: string,
): Promise<FoodMatch | null> {
  const foods = await getAllFoods();
  const qVn = normalize(nameVn);
  const qEn = nameEn ? normalize(nameEn) : '';

  let best: FoodMatch | null = null;
  for (const food of foods) {
    const dbVn = normalize(food.food_name_vn);
    const dbEn = normalize(food.food_name_en);

    let score = 0;
    if (qVn && dbVn && qVn === dbVn) score = 1;
    else {
      const vnScore = qVn ? tokenOverlapScore(qVn, dbVn) : 0;
      const enScore = qEn ? tokenOverlapScore(qEn, dbEn) * 0.9 : 0;
      score = Math.max(vnScore, enScore);
    }

    if (!best || score > best.score) best = { food, score };
    if (score === 1) break;
  }

  if (best && best.score >= config.foodMatchThreshold) return best;
  return null;
}
