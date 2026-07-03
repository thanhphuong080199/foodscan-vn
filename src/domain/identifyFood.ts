// Orchestrates one scan: Gemini identification -> local DB match -> merge.
//
// Data-source priority (SPEC §2): if the AI-identified food matches a local
// VTN entry, the local CSV nutrition wins (authoritative, no "estimated"
// badge). With no confident match we fall back to Gemini's nutrition_estimate,
// which the UI renders with the "ước tính bởi AI" badge. Qualitative fields
// (vegetarian, benefits, risks, dishes) always come from Gemini.

import { identifyWithGemini, type GeminiErrorCode } from '../data/gemini/client';
import { buildIdentifyPrompt } from '../data/gemini/prompt';
import type { GeminiFoodResult } from '../data/gemini/schema';
import { getByCode, getFoodCatalogTsv, matchFood } from '../data/foodRepo';
import type { FoodRow } from '../data/types';
import { resolveVegetarian, type VegStatus } from './vegetarian';

export type { GeminiErrorCode };
export { GeminiError } from '../data/gemini/client';

export type NutritionSource = 'local' | 'ai';

export type IdentifyImage = { base64: string; mimeType: string };

export interface IdentifyResult {
  gemini: GeminiFoodResult;
  // Which Gemini model actually answered (from the fallback chain).
  model: string;
  // Best local VTN match, or null when nothing cleared the threshold.
  matched: FoodRow | null;
  // How the local row was found: 'code' = Gemini returned a catalog food_code,
  // 'fuzzy' = name token-overlap fallback, null = no local match.
  matchVia: 'code' | 'fuzzy' | null;
  matchScore: number | null; // token-overlap score for 'fuzzy'; null otherwise
  veg: VegStatus;
  // 'local' when a DB row backs the nutrition table, otherwise 'ai' (badged).
  source: NutritionSource;
}

export async function identifyFood(
  img: IdentifyImage,
  onModel?: (model: string, attempt: number) => void,
): Promise<IdentifyResult> {
  const catalog = await getFoodCatalogTsv();
  const prompt = buildIdentifyPrompt(catalog);
  const { result, model } = await identifyWithGemini(img, prompt, onModel);

  // Prefer the exact catalog code Gemini picked; fall back to fuzzy name match
  // if the code is empty or (defensively) not a real row.
  let matched: FoodRow | null = null;
  let matchVia: 'code' | 'fuzzy' | null = null;
  let matchScore: number | null = null;

  const code = result.matched_food_code?.trim();
  if (code) {
    matched = await getByCode(code);
    if (matched) matchVia = 'code';
  }
  if (!matched) {
    const match = await matchFood(result.food_name_vn, result.food_name_en);
    if (match) {
      matched = match.food;
      matchVia = 'fuzzy';
      matchScore = match.score;
    }
  }

  const veg = resolveVegetarian(
    result.is_vegetarian,
    result.vegetarian_notes,
    matched,
  );

  return {
    gemini: result,
    model,
    matched,
    matchVia,
    matchScore,
    veg,
    source: matched ? 'local' : 'ai',
  };
}
