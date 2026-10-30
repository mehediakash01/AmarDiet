import type { CalculatedNutrition, FoodLogEntry } from '@thali/types';
import type { LocalFoodLogEntry } from './db/db';

const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const;

export function sumNutrition(entries: FoodLogEntry[]): CalculatedNutrition {
  const total: CalculatedNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const entry of entries) {
    for (const key of MACRO_KEYS) {
      total[key] += entry.calculatedNutrition[key];
    }
  }
  for (const key of MACRO_KEYS) {
    total[key] = Math.round(total[key] * 10) / 10;
  }
  return total;
}

export function copyEntriesToDate(
  entries: FoodLogEntry[],
  targetDate: string,
  makeId: (index: number) => string,
  now = new Date().toISOString(),
): LocalFoodLogEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    id: makeId(index),
    loggedOn: targetDate,
    calculatedNutrition: { ...entry.calculatedNutrition },
    createdAt: now,
    updatedAt: now,
    synced: false,
  }));
}
