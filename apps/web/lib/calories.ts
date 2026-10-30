import { calculateCaloriesRemaining } from '@thali/nutrition-engine';

export const MAX_QUICK_CALORIES = 10000;
export const QUICK_CALORIE_VALUES = [100, 200, 300, 500] as const;

export function validateCaloriesInput(raw: string): string | null {
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(value)) return 'Enter the calories you ate.';
  if (value <= 0) return 'Calories must be greater than 0.';
  if (value > MAX_QUICK_CALORIES) {
    return `Calories should be ${MAX_QUICK_CALORIES.toLocaleString()} or less.`;
  }
  return null;
}

export interface CalorieBalance {
  /** Whole-kcal inputs, exactly as shown, so the equation on screen always adds up. */
  budget: number;
  food: number;
  exercise: number;
  /** budget + exercise: the calories available today. */
  allowance: number;
  /** From the engine. remaining is never below 0; over is 0 unless you are over. */
  remaining: number;
  over: number;
  percentUsed: number;
  isOver: boolean;
}

function wholeKcal(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/**
 * Turns the day's numbers into the energy balance the UI shows.
 * Inputs are rounded to whole kcal FIRST, so Budget − Food + Exercise visibly
 * equals Remaining. Returns null when there is no usable budget (no profile
 * yet), so callers show an empty state instead of crashing.
 */
export function getCalorieBalance(
  budget: number | null | undefined,
  food: number,
  exercise: number,
): CalorieBalance | null {
  if (budget === null || budget === undefined || !Number.isFinite(budget) || Math.round(budget) <= 0) {
    return null;
  }
  const b = Math.round(budget);
  const f = wholeKcal(food);
  const e = wholeKcal(exercise);
  const result = calculateCaloriesRemaining({ budget: b, food: f, exercise: e });
  return {
    budget: b,
    food: f,
    exercise: e,
    allowance: b + e,
    remaining: result.remaining,
    over: result.over,
    percentUsed: result.percentUsed,
    isOver: result.over > 0,
  };
}
