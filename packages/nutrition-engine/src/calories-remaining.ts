/**
 * Calories remaining — the "energy balance" shown on the Dashboard and Diary.
 *
 *     remaining = budget − food + exercise
 *
 * This is the same model MyFitnessPal uses: the daily budget is your calorie
 * target, food you eat uses it up, and calories burned by logged exercise add
 * back to what you may eat that day.
 *
 * Everything the UI shows for this comes from here, so the ring, the equation
 * and the progress bar can never disagree.
 */

export interface CaloriesRemainingInput {
  /** Daily calorie budget (the calorie target), kcal. Must be above 0. */
  budget: number;
  /** Calories eaten so far, kcal. 0 or more. */
  food: number;
  /** Calories burned by logged exercise, kcal. 0 or more. */
  exercise: number;
}

export interface CaloriesRemainingResult {
  /** kcal still available today. Never below 0 (0 once the budget is used up or exceeded). */
  remaining: number;
  /** kcal eaten beyond budget + exercise. 0 unless you are over. */
  over: number;
  /**
   * Share of the available calories (budget + exercise) already eaten, as a
   * whole percent. It is at least 100 once you are at or over budget and is
   * above 100 only when `over` is above 0. (Because it is a whole percent, it
   * can already read 100 while a few kcal remain.)
   */
  percentUsed: number;
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number of 0 or more, got ${value}`);
  }
}

/**
 * @throws RangeError when budget is not a finite number above 0, or food /
 *   exercise is negative or not finite.
 */
export function calculateCaloriesRemaining(input: CaloriesRemainingInput): CaloriesRemainingResult {
  const { budget, food, exercise } = input;

  if (!Number.isFinite(budget) || budget <= 0) {
    throw new RangeError(`budget must be a finite number above 0, got ${budget}`);
  }
  assertNonNegativeFinite(food, 'food');
  assertNonNegativeFinite(exercise, 'exercise');

  const net = budget - food + exercise;
  const allowance = budget + exercise; // always > 0 because budget > 0

  return {
    remaining: Math.round(Math.max(0, net)),
    over: Math.round(Math.max(0, -net)),
    percentUsed: Math.round((food / allowance) * 100),
  };
}
