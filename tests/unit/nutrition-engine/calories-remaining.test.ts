/**
 * Calories remaining — Unit Test Suite
 *
 * Rule under test:  remaining = budget − food + exercise
 *   remaining : kcal left, never below 0
 *   over      : kcal beyond budget + exercise, 0 unless over
 *   percentUsed: food / (budget + exercise), whole percent
 */

import { describe, expect, it } from 'vitest';
import { calculateCaloriesRemaining } from '../../../packages/nutrition-engine/src/index.js';

const calc = (budget: number, food: number, exercise = 0) => calculateCaloriesRemaining({ budget, food, exercise });

describe('calculateCaloriesRemaining — under budget', () => {
  it('nothing eaten: the whole budget remains, 0% used', () => {
    expect(calc(2000, 0)).toEqual({ remaining: 2000, over: 0, percentUsed: 0 });
  });

  it('budget − food: 2000 − 750 = 1250 (38% used)', () => {
    expect(calc(2000, 750)).toEqual({ remaining: 1250, over: 0, percentUsed: 38 });
  });

  it('just under budget still has a little remaining', () => {
    expect(calc(2000, 1999)).toEqual({ remaining: 1, over: 0, percentUsed: 100 });
  });
});

describe('calculateCaloriesRemaining — at budget', () => {
  it('food equal to budget leaves exactly 0, not over, 100% used', () => {
    expect(calc(2000, 2000)).toEqual({ remaining: 0, over: 0, percentUsed: 100 });
  });

  it('food equal to budget + exercise is also exactly 0', () => {
    expect(calc(2000, 2300, 300)).toEqual({ remaining: 0, over: 0, percentUsed: 100 });
  });
});

describe('calculateCaloriesRemaining — over budget', () => {
  it('reports how far over, and remaining is 0 (never negative)', () => {
    expect(calc(2000, 2250)).toEqual({ remaining: 0, over: 250, percentUsed: 113 });
  });

  it('exercise can bring you back under', () => {
    expect(calc(2000, 2250, 400)).toEqual({ remaining: 150, over: 0, percentUsed: 94 });
  });

  it('exercise that does not cover the excess only reduces how far over', () => {
    expect(calc(2000, 2250, 100)).toEqual({ remaining: 0, over: 150, percentUsed: 107 });
  });
});

describe('calculateCaloriesRemaining — the equation (budget − food + exercise)', () => {
  it('adds up: 2150 − 900 + 300 = 1550', () => {
    expect(calc(2150, 900, 300).remaining).toBe(1550);
  });

  it('logging food lowers remaining by exactly that many kcal', () => {
    const before = calc(2000, 600, 200).remaining;
    const after = calc(2000, 600 + 350, 200).remaining;
    expect(before - after).toBe(350);
  });

  it('logging exercise raises remaining by exactly that many kcal', () => {
    const before = calc(2000, 600, 0).remaining;
    const after = calc(2000, 600, 275).remaining;
    expect(after - before).toBe(275);
  });

  it('holds for a spread of whole-number inputs (remaining − over === budget − food + exercise)', () => {
    for (const budget of [1200, 1800, 2000, 2650]) {
      for (const food of [0, 250, 999, 2000, 3100]) {
        for (const exercise of [0, 120, 600]) {
          const r = calc(budget, food, exercise);
          expect(r.remaining - r.over).toBe(budget - food + exercise);
          // exactly one side is non-zero, or both are zero
          expect(r.remaining === 0 || r.over === 0).toBe(true);
        }
      }
    }
  });

  it('percentUsed lines up with remaining and over', () => {
    for (const food of [0, 1000, 2299, 2300, 2301, 2400, 2600, 5000]) {
      const r = calc(2000, food, 300);
      if (r.remaining > 0) expect(r.percentUsed).toBeLessThanOrEqual(100);
      if (r.over > 0) expect(r.percentUsed).toBeGreaterThanOrEqual(100);
      if (r.percentUsed > 100) expect(r.over).toBeGreaterThan(0);
    }
  });
});

describe('calculateCaloriesRemaining — rounding', () => {
  it('rounds results to whole kcal', () => {
    // 2000 − 749.6 + 0 = 1250.4 -> 1250
    expect(calc(2000, 749.6).remaining).toBe(1250);
    // 2000 − 2000.6 = −0.6 -> over rounds to 1
    expect(calc(2000, 2000.6)).toEqual({ remaining: 0, over: 1, percentUsed: 100 });
  });

  it('a fraction of a kcal over rounds to "at budget", not "over"', () => {
    expect(calc(2000, 2000.3)).toEqual({ remaining: 0, over: 0, percentUsed: 100 });
  });

  it('never returns negative zero', () => {
    const r = calc(2000, 2000);
    expect(Object.is(r.remaining, 0)).toBe(true);
    expect(Object.is(r.over, 0)).toBe(true);
    expect(Object.is(calc(2000, 0).percentUsed, 0)).toBe(true);
  });
});

describe('calculateCaloriesRemaining — input guards', () => {
  it('rejects a budget that is zero, negative or not finite (no profile means no budget)', () => {
    expect(() => calc(0, 100)).toThrow(RangeError);
    expect(() => calc(-2000, 100)).toThrow(RangeError);
    expect(() => calc(Number.NaN, 100)).toThrow(RangeError);
    expect(() => calc(Number.POSITIVE_INFINITY, 100)).toThrow(RangeError);
  });

  it('rejects negative or non-finite food', () => {
    expect(() => calc(2000, -1)).toThrow(RangeError);
    expect(() => calc(2000, Number.NaN)).toThrow(RangeError);
    expect(() => calc(2000, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('rejects negative or non-finite exercise', () => {
    expect(() => calc(2000, 500, -1)).toThrow(RangeError);
    expect(() => calc(2000, 500, Number.NaN)).toThrow(RangeError);
  });

  it('is deterministic and does not mutate its input', () => {
    const input = { budget: 2000, food: 1234, exercise: 321 };
    const a = calculateCaloriesRemaining(input);
    const b = calculateCaloriesRemaining(input);
    expect(a).toEqual(b);
    expect(input).toEqual({ budget: 2000, food: 1234, exercise: 321 });
  });
});
