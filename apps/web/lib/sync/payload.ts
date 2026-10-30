import { QUICK_CALORIE_FOOD_ID } from '@thali/types';
import type { LocalFoodLogEntry } from '../db/db';

export function buildFoodLogPayload(entry: LocalFoodLogEntry): Record<string, unknown> {
  return {
    ...entry,
    ...(entry.foodId === QUICK_CALORIE_FOOD_ID
      ? { customNutrition: entry.calculatedNutrition }
      : {}),
  };
}
