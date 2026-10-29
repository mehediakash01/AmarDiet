import { describe, it, expect } from 'vitest';
import { defaultMealSlotForHour } from '../../../apps/web/lib/meal-slot';

describe('defaultMealSlotForHour', () => {
  it('suggests breakfast from 05:00 to 10:59', () => {
    for (const h of [5, 8, 10]) expect(defaultMealSlotForHour(h)).toBe('breakfast');
  });

  it('suggests lunch from 11:00 to 15:59', () => {
    for (const h of [11, 13, 15]) expect(defaultMealSlotForHour(h)).toBe('lunch');
  });

  it('suggests snack in the late afternoon (16:00-17:59)', () => {
    for (const h of [16, 17]) expect(defaultMealSlotForHour(h)).toBe('snack');
  });

  it('suggests dinner from 18:00 to 23:59', () => {
    for (const h of [18, 20, 23]) expect(defaultMealSlotForHour(h)).toBe('dinner');
  });

  it('suggests snack for late-night hours (00:00-04:59)', () => {
    for (const h of [0, 2, 4]) expect(defaultMealSlotForHour(h)).toBe('snack');
  });

  it('returns a valid slot for every hour of the day', () => {
    const valid = ['breakfast', 'lunch', 'dinner', 'snack'];
    for (let h = 0; h < 24; h++) expect(valid).toContain(defaultMealSlotForHour(h));
  });
});
