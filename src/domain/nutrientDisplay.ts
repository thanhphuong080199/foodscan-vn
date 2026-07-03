// Curated nutrient whitelist for display (SPEC §5). The DB stores all 87
// fields; we only ever render this subset. label/unit are Vietnamese-facing.

import type { NutrientKey } from '../data/nutrientColumns';

export interface NutrientDef {
  key: NutrientKey;
  label: string;
  unit: string;
}

// Always shown (per 100g) whenever the value is present (non-null, incl. 0).
export const ALWAYS_SHOW: NutrientDef[] = [
  { key: 'energy_kcal', label: 'Năng lượng', unit: 'kcal' },
  { key: 'protein_g', label: 'Chất đạm (Protein)', unit: 'g' },
  { key: 'fat_g', label: 'Chất béo tổng', unit: 'g' },
  { key: 'saturated_fat_g', label: 'Chất béo bão hòa', unit: 'g' },
  { key: 'carbohydrate_g', label: 'Carbohydrate', unit: 'g' },
  { key: 'sugar_g', label: 'Đường', unit: 'g' },
  { key: 'fiber_g', label: 'Chất xơ', unit: 'g' },
  { key: 'sodium_mg', label: 'Natri', unit: 'mg' },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
];

// Shown only if notably present (v1 rule: non-null AND non-zero).
export const NOTABLE: NutrientDef[] = [
  { key: 'vitamin_a_ug', label: 'Vitamin A', unit: 'µg' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_d_ug', label: 'Vitamin D', unit: 'µg' },
  { key: 'calcium_mg', label: 'Canxi', unit: 'mg' },
  { key: 'iron_mg', label: 'Sắt', unit: 'mg' },
  { key: 'potassium_mg', label: 'Kali', unit: 'mg' },
];

// Omega-3 (for fish) is presented as one row = EPA + DHA.
export const OMEGA3_KEYS: NutrientKey[] = ['epa_c20_5n3_g', 'dha_c22_6n3_g'];
export const OMEGA3_LABEL = 'Omega-3 (EPA+DHA)';
export const OMEGA3_UNIT = 'g';
