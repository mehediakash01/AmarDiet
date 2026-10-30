import { describe, it, expect } from 'vitest';
import type { FoodLogEntry } from '@thali/types';
import { copyEntriesToDate, sumNutrition } from '../../../apps/web/lib/diary';

function entry(overrides: Partial<FoodLogEntry> = {}): FoodLogEntry {
  return {
    id: 'log-source-1',
    subscriberId: 'sub-1',
    loggedOn: '2026-09-10',
    mealSlot: 'lunch',
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
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('sumNutrition', () => {
  it('adds calories and macros and rounds to one decimal', () => {
    const total = sumNutrition([
      entry(),
      entry({
        id: 'log-source-2',
        calculatedNutrition: {
          calories: 89.05,
          protein: 1.15,
          carbs: 22.85,
          fat: 0.35,
          fiber: 2.6,
        },
      }),
    ]);

    expect(total).toEqual({
      calories: 349.1,
      protein: 6.6,
      carbs: 79.3,
      fat: 1,
      fiber: 3.8,
    });
  });

  it('returns zeroes for an empty list', () => {
    expect(sumNutrition([])).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });
});

describe('copyEntriesToDate', () => {
  it('clones entries onto the target date with new ids and unsynced state', () => {
    const source = entry();
    const [copy] = copyEntriesToDate(
      [source],
      '2026-09-11',
      () => 'log-copy-1',
      '2026-09-11T12:00:00.000Z',
    );

    expect(copy.id).toBe('log-copy-1');
    expect(copy.loggedOn).toBe('2026-09-11');
    expect(copy.foodId).toBe(source.foodId);
    expect(copy.foodName).toBe(source.foodName);
    expect(copy.mealSlot).toBe(source.mealSlot);
    expect(copy.quantity).toBe(source.quantity);
    expect(copy.unit).toBe(source.unit);
    expect(copy.calculatedNutrition).toEqual(source.calculatedNutrition);
    expect(copy.calculatedNutrition).not.toBe(source.calculatedNutrition);
    expect(copy.createdAt).toBe('2026-09-11T12:00:00.000Z');
    expect(copy.updatedAt).toBe('2026-09-11T12:00:00.000Z');
    expect(copy.synced).toBe(false);
  });

  it('preserves meal order and creates a unique id for every entry', () => {
    const source = [
      entry({ id: 'breakfast-1', mealSlot: 'breakfast' }),
      entry({ id: 'lunch-1', mealSlot: 'lunch' }),
      entry({ id: 'dinner-1', mealSlot: 'dinner' }),
    ];
    const copies = copyEntriesToDate(source, '2026-09-12', (index) => `copy-${index}`);

    expect(copies.map((copy) => copy.mealSlot)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(copies.map((copy) => copy.id)).toEqual(['copy-0', 'copy-1', 'copy-2']);
    expect(new Set(copies.map((copy) => copy.id)).size).toBe(3);
  });

  it('returns an empty list when the source day has no entries', () => {
    expect(copyEntriesToDate([], '2026-09-12', () => 'copy-0')).toEqual([]);
  });
});
