import { describe, it, expect } from 'vitest';
import { QUICK_CALORIE_FOOD_ID } from '@thali/types';
import type { LocalFoodLogEntry } from '../../../apps/web/lib/db/db';
import { buildFoodLogPayload } from '../../../apps/web/lib/sync/payload';

function entry(overrides: Partial<LocalFoodLogEntry> = {}): LocalFoodLogEntry {
  return {
    id: 'log-1',
    subscriberId: 'sub-1',
    loggedOn: '2026-10-30',
    mealSlot: 'snack',
    foodId: 'food_bengali_sada_bhat',
    foodName: 'Steamed White Rice',
    quantity: 200,
    unit: 'g',
    calculatedNutrition: {
      calories: 260,
      protein: 5.4,
      carbs: 56.4,
      fat: 0.6,
      fiber: 1.2,
    },
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
    synced: false,
    ...overrides,
  };
}

describe('buildFoodLogPayload', () => {
  it('sends calculated nutrition as customNutrition for quick calorie entries', () => {
    const quickEntry = entry({
      foodId: QUICK_CALORIE_FOOD_ID,
      foodName: 'Quick calories',
      quantity: 275,
      unit: 'kcal',
      calculatedNutrition: {
        calories: 275,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
    });

    const payload = buildFoodLogPayload(quickEntry);

    expect(payload.customNutrition).toEqual(quickEntry.calculatedNutrition);
    expect(payload.foodId).toBe(QUICK_CALORIE_FOOD_ID);
    expect(payload.foodName).toBe('Quick calories');
  });

  it('does not send customNutrition for catalog foods', () => {
    const payload = buildFoodLogPayload(entry());

    expect(payload).not.toHaveProperty('customNutrition');
    expect(payload.foodId).toBe('food_bengali_sada_bhat');
  });
});
