import type { NutrientKey } from './nutrientColumns';

// One food row from the local VTN nutrition DB. Nutrient values are per 100g
// edible portion; null means "not reported in the source" (never assume 0).
export type FoodRow = {
  food_code: string;
  food_name_vn: string;
  food_name_en: string;
  food_group: string;
  discard_pct: number | null;
} & {
  [K in NutrientKey]: number | null;
};

// Vietnamese food-group names for the vegetarian group-guard (see SPEC §2).
export const ANIMAL_GROUPS = {
  meat: 'Thịt và sản phẩm chế biến',
  aquatic: 'Thủy sản và sản phẩm chế biến',
  egg: 'Trứng và sản phẩm chế biến',
  dairy: 'Sữa và sản phẩm chế biến',
} as const;
