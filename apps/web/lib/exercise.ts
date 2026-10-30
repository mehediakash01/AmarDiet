import {
  EXERCISE_CATALOG,
  EXERCISE_CATEGORY_LABELS,
  EXERCISE_MAX_MINUTES,
  EXERCISE_MIN_MINUTES,
  type ExerciseActivity,
  type ExerciseCategory,
} from '@thali/nutrition-engine';
import type { ExerciseLog } from '@thali/types';

export const DEFAULT_EXERCISE_MINUTES = 30;
export const MINUTES_STEP = 5;
export const QUICK_MINUTES = [15, 30, 45, 60] as const;

/**
 * Case-insensitive search over activity name and category label.
 * Every word typed must match, so "walk brisk" finds "Walking, brisk (5.6 km/h)".
 * An empty query returns the whole catalog.
 */
export function filterExerciseCatalog(query: string): ExerciseActivity[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...EXERCISE_CATALOG];
  return EXERCISE_CATALOG.filter((a) => {
    const haystack = `${a.name} ${EXERCISE_CATEGORY_LABELS[a.category]}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

export interface ExerciseGroup {
  category: ExerciseCategory;
  label: string;
  items: ExerciseActivity[];
}

/** Groups activities by category, in the catalog's category order, skipping empty groups. */
export function groupExerciseByCategory(activities: ExerciseActivity[]): ExerciseGroup[] {
  return (Object.keys(EXERCISE_CATEGORY_LABELS) as ExerciseCategory[])
    .map((category) => ({
      category,
      label: EXERCISE_CATEGORY_LABELS[category],
      items: activities.filter((a) => a.category === category),
    }))
    .filter((g) => g.items.length > 0);
}

/** Total kcal burned across entries (entries already hold engine-computed whole kcal). */
export function sumCaloriesBurned(logs: ExerciseLog[]): number {
  return logs.reduce((total, l) => total + l.calories_burned, 0);
}

/** Hint line for the Quick Add Exercise tile. */
export function formatBurnedHint(totalKcal: number): string {
  return totalKcal > 0 ? `${totalKcal} kcal burned` : 'Log activity';
}

/** Returns an error message, or null when `raw` is a whole number of minutes in range. */
export function validateMinutesInput(raw: string): string | null {
  if (raw.trim() === '') return 'Enter the minutes.';
  const value = Number(raw);
  if (!Number.isInteger(value)) return 'Use whole minutes.';
  if (value < EXERCISE_MIN_MINUTES || value > EXERCISE_MAX_MINUTES) {
    return `Minutes must be between ${EXERCISE_MIN_MINUTES} and ${EXERCISE_MAX_MINUTES}.`;
  }
  return null;
}

/** Applies a +/- step to the typed minutes, staying inside the valid range. */
export function stepMinutes(raw: string, delta: number): string {
  const current = Number(raw);
  const base = Number.isInteger(current) && current >= EXERCISE_MIN_MINUTES ? current : 0;
  const next = Math.min(EXERCISE_MAX_MINUTES, Math.max(EXERCISE_MIN_MINUTES, base + delta));
  return String(next);
}
