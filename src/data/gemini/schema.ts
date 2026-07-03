// Structured JSON contract for the Gemini food-identification call.

export interface SuggestedDish {
  name: string;
  brief_description: string;
}

// Curated per-100g nutrition subset — only used when there is NO local match,
// and always rendered with the "estimated by AI" badge.
export interface NutritionEstimate {
  energy_kcal?: number;
  protein_g?: number;
  fat_g?: number;
  saturated_fat_g?: number;
  carbohydrate_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
}

export interface GeminiFoodResult {
  // food_code of the best-matching row from the local VTN catalog we sent in
  // the prompt, or "" when nothing in the catalog clearly matches the photo.
  matched_food_code: string;
  food_name_vn: string;
  food_name_en: string;
  category: string;
  is_vegetarian: boolean; // pre group-guard
  vegetarian_notes: string; // mentions ngũ vị tân when relevant
  benefits: string[];
  risks: string[];
  suggested_dishes: SuggestedDish[];
  confidence_note: string;
  nutrition_estimate?: NutritionEstimate;
}

// Gemini responseSchema (OpenAPI-ish subset Google accepts). Keeps output parseable.
export const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    matched_food_code: { type: 'string' },
    food_name_vn: { type: 'string' },
    food_name_en: { type: 'string' },
    category: { type: 'string' },
    is_vegetarian: { type: 'boolean' },
    vegetarian_notes: { type: 'string' },
    benefits: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    suggested_dishes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          brief_description: { type: 'string' },
        },
        required: ['name', 'brief_description'],
      },
    },
    confidence_note: { type: 'string' },
    nutrition_estimate: {
      type: 'object',
      properties: {
        energy_kcal: { type: 'number' },
        protein_g: { type: 'number' },
        fat_g: { type: 'number' },
        saturated_fat_g: { type: 'number' },
        carbohydrate_g: { type: 'number' },
        sugar_g: { type: 'number' },
        fiber_g: { type: 'number' },
        sodium_mg: { type: 'number' },
        cholesterol_mg: { type: 'number' },
      },
    },
  },
  required: [
    'matched_food_code',
    'food_name_vn',
    'food_name_en',
    'category',
    'is_vegetarian',
    'vegetarian_notes',
    'benefits',
    'risks',
    'suggested_dishes',
    'confidence_note',
  ],
} as const;
