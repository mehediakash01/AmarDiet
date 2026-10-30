import { describe, it, expect } from 'vitest';
import { getCalorieBalance } from '../../../apps/web/lib/calories';

describe('getCalorieBalance', () => {
  it('returns null when there is no usable budget (no profile)', () => {
    expect(getCalorieBalance(null, 500, 0)).toBeNull();
    expect(getCalorieBalance(undefined, 500, 0)).toBeNull();
    expect(getCalorieBalance(0, 500, 0)).toBeNull();
    expect(getCalorieBalance(-1800, 500, 0)).toBeNull();
    expect(getCalorieBalance(Number.NaN, 500, 0)).toBeNull();
    expect(getCalorieBalance(0.4, 500, 0)).toBeNull();
  });

  it('computes budget - food + exercise through the engine', () => {
    const b = getCalorieBalance(2150, 900, 300)!;
    expect(b.remaining).toBe(1550);
    expect(b.over).toBe(0);
    expect(b.isOver).toBe(false);
    expect(b.allowance).toBe(2450);
    expect(b.percentUsed).toBe(37);
  });

  it('logging food lowers remaining; logging exercise raises it', () => {
    const start = getCalorieBalance(2000, 600, 0)!;
    const ate = getCalorieBalance(2000, 600 + 250, 0)!;
    const moved = getCalorieBalance(2000, 600, 180)!;
    expect(start.remaining - ate.remaining).toBe(250);
    expect(moved.remaining - start.remaining).toBe(180);
  });

  it('flags over budget and reports how far', () => {
    const b = getCalorieBalance(2000, 2250, 100)!;
    expect(b.isOver).toBe(true);
    expect(b.over).toBe(150);
    expect(b.remaining).toBe(0);
  });

  it('exercise can bring an over-budget day back under', () => {
    expect(getCalorieBalance(2000, 2250, 0)!.isOver).toBe(true);
    expect(getCalorieBalance(2000, 2250, 400)!.isOver).toBe(false);
  });

  it('rounds inputs first, so the displayed equation always adds up', () => {
    // raw: 2149.6 - 899.5 + 300.4  ->  shown as 2150 - 900 + 300
    const b = getCalorieBalance(2149.6, 899.5, 300.4)!;
    expect([b.budget, b.food, b.exercise]).toEqual([2150, 900, 300]);
    expect(b.remaining).toBe(b.budget - b.food + b.exercise);
  });

  it('treats missing or invalid food and exercise as 0 instead of throwing', () => {
    const b = getCalorieBalance(2000, Number.NaN, -50)!;
    expect(b.food).toBe(0);
    expect(b.exercise).toBe(0);
    expect(b.remaining).toBe(2000);
  });
});
