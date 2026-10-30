/**
 * Exercise (MET-based calories burned) — Unit Test Suite
 *
 * Formula under test:  kcal = MET × weight_kg × (minutes / 60), rounded to whole kcal.
 * MET values come from the 2011 Compendium of Physical Activities; the catalog
 * tests below guard against typos and duplicate keys, not against the science.
 */

import { describe, expect, it } from 'vitest';
import {
  EXERCISE_CATALOG,
  EXERCISE_CATEGORY_LABELS,
  EXERCISE_MAX_MET,
  EXERCISE_MAX_MINUTES,
  EXERCISE_MIN_MINUTES,
  calculateExerciseCalories,
  getExerciseActivity,
} from '../../../packages/nutrition-engine/src/index.js';

describe('calculateExerciseCalories — formula', () => {
  it('is MET × kg × hours (running 9.8 METs, 70 kg, 30 min = 343 kcal)', () => {
    expect(calculateExerciseCalories({ met: 9.8, weight_kg: 70, minutes: 30 })).toBe(343);
  });

  it('1 MET for 1 hour is about 1 kcal per kg (the Compendium definition)', () => {
    expect(calculateExerciseCalories({ met: 1, weight_kg: 60, minutes: 60 })).toBe(60);
  });

  it('brisk walking 4.3 METs, 70 kg, 60 min = 301 kcal', () => {
    expect(calculateExerciseCalories({ met: 4.3, weight_kg: 70, minutes: 60 })).toBe(301);
  });

  it('scales linearly with duration', () => {
    const thirty = calculateExerciseCalories({ met: 6, weight_kg: 80, minutes: 30 });
    const sixty = calculateExerciseCalories({ met: 6, weight_kg: 80, minutes: 60 });
    expect(sixty).toBe(thirty * 2);
  });

  it('scales linearly with body weight', () => {
    const light = calculateExerciseCalories({ met: 6, weight_kg: 50, minutes: 60 });
    const heavy = calculateExerciseCalories({ met: 6, weight_kg: 100, minutes: 60 });
    expect(heavy).toBe(light * 2);
  });

  it('rounds to whole kcal (half rounds up)', () => {
    // 2.5 × 70 × (1/60) = 2.9166… -> 3
    expect(calculateExerciseCalories({ met: 2.5, weight_kg: 70, minutes: 1 })).toBe(3);
    // 3.5 × 60 × (30/60) = 105 exactly
    expect(calculateExerciseCalories({ met: 3.5, weight_kg: 60, minutes: 30 })).toBe(105);
  });

  it('works at the minute limits', () => {
    expect(calculateExerciseCalories({ met: 7, weight_kg: 70, minutes: EXERCISE_MIN_MINUTES })).toBe(8);
    expect(calculateExerciseCalories({ met: 7, weight_kg: 70, minutes: EXERCISE_MAX_MINUTES })).toBe(4900);
  });

  it('is deterministic', () => {
    const input = { met: 8, weight_kg: 72.5, minutes: 45 };
    expect(calculateExerciseCalories(input)).toBe(calculateExerciseCalories({ ...input }));
  });
});

describe('calculateExerciseCalories — input validation', () => {
  const ok = { met: 5, weight_kg: 70, minutes: 30 };

  it('rejects minutes outside 1..600', () => {
    expect(() => calculateExerciseCalories({ ...ok, minutes: 0 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, minutes: -5 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, minutes: 601 })).toThrow(RangeError);
  });

  it('rejects fractional or non-finite minutes', () => {
    expect(() => calculateExerciseCalories({ ...ok, minutes: 12.5 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, minutes: Number.NaN })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, minutes: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });

  it('rejects zero, negative or absurd weight', () => {
    expect(() => calculateExerciseCalories({ ...ok, weight_kg: 0 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, weight_kg: -70 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, weight_kg: 501 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, weight_kg: Number.NaN })).toThrow(RangeError);
  });

  it('rejects zero, negative, non-finite or absurd MET', () => {
    expect(() => calculateExerciseCalories({ ...ok, met: 0 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, met: -1 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, met: EXERCISE_MAX_MET + 1 })).toThrow(RangeError);
    expect(() => calculateExerciseCalories({ ...ok, met: Number.NaN })).toThrow(RangeError);
  });
});

describe('EXERCISE_CATALOG', () => {
  it('has around 40 activities', () => {
    expect(EXERCISE_CATALOG.length).toBeGreaterThanOrEqual(30);
    expect(EXERCISE_CATALOG.length).toBeLessThanOrEqual(60);
  });

  it('has unique, lowercase snake_case keys', () => {
    const keys = EXERCISE_CATALOG.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
  });

  it('has unique names', () => {
    const names = EXERCISE_CATALOG.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps every MET inside the valid range, with a Compendium code', () => {
    for (const a of EXERCISE_CATALOG) {
      expect(a.met).toBeGreaterThan(0);
      expect(a.met).toBeLessThanOrEqual(EXERCISE_MAX_MET);
      expect(a.compendiumCode).toMatch(/^\d{5}$/);
      expect(a.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('only uses categories that have a label, and every label is used', () => {
    const used = new Set(EXERCISE_CATALOG.map((a) => a.category));
    for (const c of used) expect(EXERCISE_CATEGORY_LABELS[c]).toBeTruthy();
    for (const c of Object.keys(EXERCISE_CATEGORY_LABELS)) {
      expect(used.has(c as (typeof EXERCISE_CATALOG)[number]['category'])).toBe(true);
    }
  });

  it('covers the activity types the product needs', () => {
    const keys = new Set(EXERCISE_CATALOG.map((a) => a.key));
    for (const required of [
      'walk_slow',
      'walk_brisk',
      'jogging',
      'cycling_leisure',
      'swim_laps_easy',
      'football_casual',
      'cricket',
      'badminton_social',
      'yoga_hatha',
      'weights_general',
      'house_cleaning',
      'stairs_slow',
    ]) {
      expect(keys.has(required)).toBe(true);
    }
  });

  it('orders intensity sensibly (faster = higher MET) within walking and running', () => {
    const met = (k: string) => getExerciseActivity(k)!.met;
    expect(met('walk_slow')).toBeLessThan(met('walk_moderate'));
    expect(met('walk_moderate')).toBeLessThan(met('walk_brisk'));
    expect(met('walk_brisk')).toBeLessThan(met('walk_very_brisk'));
    expect(met('jogging')).toBeLessThan(met('running_8kmh'));
    expect(met('running_8kmh')).toBeLessThan(met('running_10kmh'));
  });

  it('matches known Compendium values for a few spot checks', () => {
    expect(getExerciseActivity('running_10kmh')?.met).toBe(9.8); // code 12050
    expect(getExerciseActivity('walk_brisk')?.met).toBe(4.3); // code 17200
    expect(getExerciseActivity('badminton_social')?.met).toBe(5.5); // code 15030
    expect(getExerciseActivity('cricket')?.met).toBe(4.8); // code 15150
  });
});

describe('getExerciseActivity', () => {
  it('finds an activity by key', () => {
    expect(getExerciseActivity('jogging')?.name).toBe('Jogging');
  });

  it('returns undefined for an unknown key', () => {
    expect(getExerciseActivity('teleporting')).toBeUndefined();
    expect(getExerciseActivity('')).toBeUndefined();
  });
});
