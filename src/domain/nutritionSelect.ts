// Turn a nutrition source (local FoodRow or AI estimate) into display rows,
// applying the curated whitelist + notably-present rule from nutrientDisplay.

import type { FoodRow } from '../data/types';
import type { NutritionEstimate } from '../data/gemini/schema';
import {
  ALWAYS_SHOW,
  NOTABLE,
  OMEGA3_KEYS,
  OMEGA3_LABEL,
  OMEGA3_UNIT,
  type NutrientDef,
} from './nutrientDisplay';

export interface NutrientRow {
  label: string;
  value: number;
  unit: string;
}

export interface NutritionView {
  always: NutrientRow[];
  notable: NutrientRow[]; // empty for AI estimates (micros not estimated)
}

function isPresent(v: number | null | undefined): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function row(def: NutrientDef, value: number): NutrientRow {
  return { label: def.label, value, unit: def.unit };
}

// Local VTN row: full curated set. "Always" keeps 0; "notable" drops null/0.
export function selectLocalNutrition(food: FoodRow): NutritionView {
  const always: NutrientRow[] = [];
  for (const def of ALWAYS_SHOW) {
    const v = food[def.key];
    if (isPresent(v)) always.push(row(def, v));
  }

  const notable: NutrientRow[] = [];
  for (const def of NOTABLE) {
    const v = food[def.key];
    if (isPresent(v) && v !== 0) notable.push(row(def, v));
  }

  // Omega-3: sum EPA + DHA; show only if the total is notably present (> 0).
  const omega = OMEGA3_KEYS.reduce((sum, key) => {
    const v = food[key];
    return isPresent(v) ? sum + v : sum;
  }, 0);
  if (omega > 0) {
    notable.push({ label: OMEGA3_LABEL, value: omega, unit: OMEGA3_UNIT });
  }

  return { always, notable };
}

// AI estimate: only the always-show curated subset exists in the schema.
export function selectAiNutrition(est: NutritionEstimate | undefined): NutritionView {
  const always: NutrientRow[] = [];
  if (est) {
    for (const def of ALWAYS_SHOW) {
      const v = (est as Record<string, number | undefined>)[def.key];
      if (isPresent(v)) always.push(row(def, v));
    }
  }
  return { always, notable: [] };
}
