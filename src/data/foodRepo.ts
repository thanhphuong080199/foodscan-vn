import { getDb } from './db';
import type { FoodRow } from './types';
import { normalize, tokenOverlapScore } from '../domain/normalize';
import { config } from '../config';

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
