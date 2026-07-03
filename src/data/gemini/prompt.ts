// Food-identification prompt.
//
// Prompt-language decision (SPEC §9, resolved 2026-07-03): the instruction
// scaffolding is written in English (current Gemini models follow structural
// rules slightly more reliably in English), but the model is REQUIRED to output
// Vietnamese, and every domain concept stays in Vietnamese — the ngũ vị tân
// list, food-group vocabulary, and "món Việt" dish style — so cultural accuracy
// doesn't regress.
//
// Catalog grounding: we inline the local VTN catalog (526 rows) so Gemini can
// return the exact food_code of the matching entry instead of us fuzzy-matching
// a free-text name afterward. Output must be JSON matching GEMINI_RESPONSE_SCHEMA.

const INSTRUCTIONS = `You are a Vietnamese nutrition and cuisine expert. The user sends one photo of a food item (it may be raw meat, fish, fruit, vegetables, a canned/packaged product, etc.).

Identify the food in the photo and return ONLY JSON (no prose, no markdown) matching the given schema. Rules:

- matched_food_code: You are given a LOCAL FOOD CATALOG below (TSV rows: food_code, name_vn, name_en). If the food in the photo clearly corresponds to ONE catalog entry (same ingredient, ignoring diacritics/spelling), set matched_food_code to that entry's food_code EXACTLY as written. If nothing in the catalog clearly matches, set it to an empty string "". Never invent a code that is not in the catalog. Base this on visual identity, not on wording.
- food_name_vn: the common, short Vietnamese name, preferring the ingredient (e.g. "Cà rốt", "Cá thu", "Thịt ba chỉ"). Fill this even when matched_food_code is "".
- food_name_en: the corresponding English name.
- category: the Vietnamese food group/type (e.g. "rau củ", "trái cây", "thịt", "thủy sản", "ngũ cốc", "đồ hộp").
- is_vegetarian: true only if suitable for a Vietnamese Buddhist vegetarian (ăn chay). That means NO meat/fish/egg AND none of the "ngũ vị tân" — the 5 pungent spices: tỏi (garlic), hành (onion/scallion), hẹ (chives), kiệu (shallot), and the asafoetida/allium group. If the item is one of the ngũ vị tân, set is_vegetarian = false.
- vegetarian_notes: a short Vietnamese explanation; if ngũ vị tân is involved, say so explicitly.
- benefits: 3–5 health benefits / uses, in Vietnamese.
- risks: 2–4 harms or risks from misuse / overuse, in Vietnamese. When relevant, call out conditions common in Vietnam (gút, tăng huyết áp, tiểu đường, mỡ máu, …).
- suggested_dishes: 2–4 Vietnamese dishes or preparations for this ingredient; each has a Vietnamese name and a short Vietnamese brief_description.
- confidence_note: how confident the identification is, in Vietnamese; note if the photo is blurry/ambiguous.
- nutrition_estimate: fill ONLY if matched_food_code is "" AND you are estimating values yourself (per 100g). When a catalog code matches, omit it — the app uses its local database instead.

All human-readable text MUST be in Vietnamese (except food_name_en).`;

// Assemble the full prompt: instructions + the catalog block. `catalogTsv` is
// the newline-joined "code<TAB>name_vn<TAB>name_en" rows from foodRepo.
export function buildIdentifyPrompt(catalogTsv: string): string {
  return `${INSTRUCTIONS}

LOCAL FOOD CATALOG (food_code<TAB>name_vn<TAB>name_en), one per line:
${catalogTsv}`;
}
