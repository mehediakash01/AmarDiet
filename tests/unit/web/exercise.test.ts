import { describe, it, expect } from 'vitest';
import type { ExerciseLog } from '@thali/types';
import { EXERCISE_CATALOG } from '@thali/nutrition-engine';
import {
  filterExerciseCatalog,
  groupExerciseByCategory,
  sumCaloriesBurned,
  formatBurnedHint,
  validateMinutesInput,
  stepMinutes,
} from '../../../apps/web/lib/exercise';

function log(calories_burned: number, loggedOn = '2026-10-30'): ExerciseLog {
  return {
    id: `ex_${calories_burned}`,
    subscriberId: 's1',
    loggedOn,
    activityKey: 'jogging',
    activityName: 'Jogging',
    minutes: 30,
    met: 7,
    calories_burned,
    createdAt: '2026-10-30T08:00:00.000Z',
  };
}

describe('filterExerciseCatalog', () => {
  it('returns the whole catalog for an empty or blank query', () => {
    expect(filterExerciseCatalog('')).toHaveLength(EXERCISE_CATALOG.length);
    expect(filterExerciseCatalog('   ')).toHaveLength(EXERCISE_CATALOG.length);
  });

  it('matches name text case-insensitively', () => {
    const keys = filterExerciseCatalog('CRICKET').map((a) => a.key);
    expect(keys).toEqual(['cricket']);
  });

  it('matches category labels (typing "swimming" lists the swimming activities)', () => {
    const result = filterExerciseCatalog('swimming');
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.every((a) => a.category === 'swimming')).toBe(true);
  });

  it('requires every word to match, in any order', () => {
    const keys = filterExerciseCatalog('brisk walking').map((a) => a.key);
    expect(keys).toContain('walk_brisk');
    expect(keys).not.toContain('jogging');
  });

  it('returns nothing for a query that matches no activity', () => {
    expect(filterExerciseCatalog('teleporting')).toEqual([]);
  });
});

describe('groupExerciseByCategory', () => {
  it('groups in category order and skips empty groups', () => {
    const groups = groupExerciseByCategory(filterExerciseCatalog(''));
    expect(groups[0].category).toBe('walking');
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(EXERCISE_CATALOG.length);
    expect(groupExerciseByCategory([])).toEqual([]);
  });

  it('only returns groups that still have items after filtering', () => {
    const groups = groupExerciseByCategory(filterExerciseCatalog('yoga'));
    expect(groups.map((g) => g.category)).toEqual(['mind_body']);
  });
});

describe('sumCaloriesBurned / formatBurnedHint', () => {
  it('adds up whole-kcal entries', () => {
    expect(sumCaloriesBurned([])).toBe(0);
    expect(sumCaloriesBurned([log(343), log(120), log(7)])).toBe(470);
  });

  it('shows a call to action when nothing is burned, else the total', () => {
    expect(formatBurnedHint(0)).toBe('Log activity');
    expect(formatBurnedHint(470)).toBe('470 kcal burned');
  });
});

describe('validateMinutesInput', () => {
  it('accepts whole minutes from 1 to 600', () => {
    for (const ok of ['1', '30', '600']) expect(validateMinutesInput(ok)).toBeNull();
  });

  it('rejects empty, fractional, zero, negative and too-large values', () => {
    for (const bad of ['', '  ', '12.5', '0', '-5', '601', 'abc']) {
      expect(validateMinutesInput(bad)).not.toBeNull();
    }
  });
});

describe('stepMinutes', () => {
  it('adds and subtracts the step', () => {
    expect(stepMinutes('30', 5)).toBe('35');
    expect(stepMinutes('30', -5)).toBe('25');
  });

  it('stays inside 1..600', () => {
    expect(stepMinutes('3', -5)).toBe('1');
    expect(stepMinutes('598', 5)).toBe('600');
  });

  it('recovers from empty or invalid text by starting from the step', () => {
    expect(stepMinutes('', 5)).toBe('5');
    expect(stepMinutes('abc', 5)).toBe('5');
    expect(stepMinutes('', -5)).toBe('1');
  });
});
