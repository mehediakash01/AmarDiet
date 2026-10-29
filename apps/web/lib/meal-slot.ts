import type { MealSlot } from '@thali/types';

/**
 * Picks the meal slot a person most likely wants to log right now, so the
 * Quick Add menu can pre-select it (MyFitnessPal does the same).
 *
 *   05:00–10:59  breakfast
 *   11:00–15:59  lunch
 *   16:00–17:59  snack   (afternoon / tea-time)
 *   18:00–23:59  dinner
 *   00:00–04:59  snack   (late-night)
 *
 * Pure function of the hour (0–23) so it is trivially unit-testable.
 */
export function defaultMealSlotForHour(hour: number): MealSlot {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 18) return 'snack';
  if (hour >= 18) return 'dinner';
  return 'snack';
}
