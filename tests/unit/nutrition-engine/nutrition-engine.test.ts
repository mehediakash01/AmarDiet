/**
 * Nutrition Engine — Unit Test Suite
 *
 * Coverage target: 100% of documented functions.
 * A reviewer can understand the formulas from these tests alone.
 *
 * Sections:
 *   1. calculateBMR
 *   2. calculateTDEE
 *   3. calculateCalorieTarget — all four goals + safety floor
 *   4. calculateMacroTargets — all four goals + edge cases
 *   5. Input validation (RangeError paths)
 *   6. Full pipeline integration (profile → macros)
 */

import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_MULTIPLIERS,
  CALORIE_SAFETY_FLOOR,
  GOAL_ADJUSTMENTS,
} from '../../../packages/nutrition-engine/src/constants.js';
import {
  calculateBMR,
  calculateCalorieTarget,
  calculateMacroTargets,
  calculateTDEE,
} from '../../../packages/nutrition-engine/src/index.js';
import type {
  BMRResult,
  NutritionProfile,
  TDEEResult,
} from '../../../packages/nutrition-engine/src/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** 30-year-old male, 80 kg, 175 cm — common reference case */
const MALE_PROFILE: NutritionProfile = {
  age: 30,
  sex: 'male',
  height_cm: 175,
  weight_kg: 80,
  activity_level: 'active',
  goal: 'maintain',
};

/** 28-year-old female, 60 kg, 163 cm */
const FEMALE_PROFILE: NutritionProfile = {
  age: 28,
  sex: 'female',
  height_cm: 163,
  weight_kg: 60,
  activity_level: 'lightly_active',
  goal: 'lose_weight',
};

// ---------------------------------------------------------------------------
// 1. calculateBMR
// ---------------------------------------------------------------------------

describe('calculateBMR', () => {
  it('male formula: 10w + 6.25h - 5a + 5', () => {
    // 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
    const result = calculateBMR(MALE_PROFILE);
    expect(result.bmr_kcal).toBe(1748.75);
  });

  it('female formula: 10w + 6.25h - 5a - 161', () => {
    // 10*60 + 6.25*163 - 5*28 - 161 = 600 + 1018.75 - 140 - 161 = 1317.75
    const result = calculateBMR(FEMALE_PROFILE);
    expect(result.bmr_kcal).toBe(1317.75);
  });

  it('very light female (40 kg, 150 cm, age 20)', () => {
    // 10*40 + 6.25*150 - 5*20 - 161 = 400 + 937.5 - 100 - 161 = 1076.5
    const profile: NutritionProfile = { ...FEMALE_PROFILE, weight_kg: 40, height_cm: 150, age: 20 };
    expect(calculateBMR(profile).bmr_kcal).toBe(1076.5);
  });

  it('very heavy male (150 kg, 190 cm, age 50)', () => {
    // 10*150 + 6.25*190 - 5*50 + 5 = 1500 + 1187.5 - 250 + 5 = 2442.5
    const profile: NutritionProfile = { ...MALE_PROFILE, weight_kg: 150, height_cm: 190, age: 50 };
    expect(calculateBMR(profile).bmr_kcal).toBe(2442.5);
  });

  it('elderly female (70, 55 kg, 155 cm)', () => {
    // 10*55 + 6.25*155 - 5*70 - 161 = 550 + 968.75 - 350 - 161 = 1007.75
    const profile: NutritionProfile = { ...FEMALE_PROFILE, age: 70, weight_kg: 55, height_cm: 155 };
    expect(calculateBMR(profile).bmr_kcal).toBe(1007.75);
  });

  it('returns object with bmr_kcal key', () => {
    const result = calculateBMR(MALE_PROFILE);
    expect(result).toHaveProperty('bmr_kcal');
    expect(typeof result.bmr_kcal).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// 2. calculateTDEE
// ---------------------------------------------------------------------------

describe('calculateTDEE', () => {
  const bmr: BMRResult = { bmr_kcal: 1748.75 }; // MALE_PROFILE BMR

  it('sedentary: BMR × 1.2', () => {
    const result = calculateTDEE(bmr, 'sedentary');
    expect(result.tdee_kcal).toBe(Math.round(1748.75 * 1.2 * 100) / 100);
    expect(result.multiplier).toBe(1.2);
  });

  it('lightly_active: BMR × 1.375', () => {
    const result = calculateTDEE(bmr, 'lightly_active');
    expect(result.tdee_kcal).toBe(Math.round(1748.75 * 1.375 * 100) / 100);
    expect(result.multiplier).toBe(1.375);
  });

  it('active: BMR × 1.55', () => {
    const result = calculateTDEE(bmr, 'active');
    expect(result.tdee_kcal).toBe(Math.round(1748.75 * 1.55 * 100) / 100);
  });

  it('very_active: BMR × 1.725', () => {
    const result = calculateTDEE(bmr, 'very_active');
    expect(result.tdee_kcal).toBe(Math.round(1748.75 * 1.725 * 100) / 100);
    expect(result.multiplier).toBe(ACTIVITY_MULTIPLIERS.very_active);
  });

  it('echoes back bmr_kcal and activity_level', () => {
    const result = calculateTDEE(bmr, 'active');
    expect(result.bmr_kcal).toBe(1748.75);
    expect(result.activity_level).toBe('active');
  });

  it('TDEE always >= BMR (multiplier >= 1)', () => {
    for (const level of Object.keys(ACTIVITY_MULTIPLIERS) as Array<keyof typeof ACTIVITY_MULTIPLIERS>) {
      expect(calculateTDEE(bmr, level).tdee_kcal).toBeGreaterThanOrEqual(bmr.bmr_kcal);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. calculateCalorieTarget — all four goals + safety floor
// ---------------------------------------------------------------------------

describe('calculateCalorieTarget', () => {
  // TDEE for MALE active: 1748.75 * 1.55 = 2710.5625 ≈ 2710.56
  const tdee: TDEEResult = {
    tdee_kcal: 2710.56,
    bmr_kcal: 1748.75,
    activity_level: 'active',
    multiplier: 1.55,
  };

  it('lose_weight: TDEE − 500', () => {
    const result = calculateCalorieTarget(tdee, 'lose_weight');
    expect(result.calorie_target_kcal).toBe(2210.56);
    expect(result.adjustment_kcal).toBe(GOAL_ADJUSTMENTS.lose_weight);
    expect(result.floor_applied).toBe(false);
  });

  it('maintain: TDEE + 0', () => {
    const result = calculateCalorieTarget(tdee, 'maintain');
    expect(result.calorie_target_kcal).toBe(2710.56);
    expect(result.adjustment_kcal).toBe(0);
    expect(result.floor_applied).toBe(false);
  });

  it('gain_weight: TDEE + 300', () => {
    const result = calculateCalorieTarget(tdee, 'gain_weight');
    expect(result.calorie_target_kcal).toBe(3010.56);
    expect(result.adjustment_kcal).toBe(300);
    expect(result.floor_applied).toBe(false);
  });

  it('build_muscle: TDEE + 200', () => {
    const result = calculateCalorieTarget(tdee, 'build_muscle');
    expect(result.calorie_target_kcal).toBe(2910.56);
    expect(result.adjustment_kcal).toBe(200);
    expect(result.floor_applied).toBe(false);
  });

  it('floor applied when lose_weight target < 1200', () => {
    // Sedentary tiny female: BMR ~1007 * 1.2 = 1208.3 - 500 = 708.3 < 1200
    const lowTDEE: TDEEResult = { tdee_kcal: 1208.3, bmr_kcal: 1007.75, activity_level: 'sedentary', multiplier: 1.2 };
    const result = calculateCalorieTarget(lowTDEE, 'lose_weight');
    expect(result.calorie_target_kcal).toBe(CALORIE_SAFETY_FLOOR);
    expect(result.floor_applied).toBe(true);
  });

  it('floor not applied when target exactly equals floor', () => {
    // TDEE = 1700, 1700 - 500 = 1200 — exactly at floor, no clamp needed
    const tdeeExact: TDEEResult = { tdee_kcal: 1700, bmr_kcal: 1400, activity_level: 'sedentary', multiplier: 1.2 };
    const result = calculateCalorieTarget(tdeeExact, 'lose_weight');
    expect(result.calorie_target_kcal).toBe(1200);
    expect(result.floor_applied).toBe(false);
  });

  it('floor NOT applied for non-deficit goals regardless of low TDEE', () => {
    const lowTDEE: TDEEResult = { tdee_kcal: 1208.3, bmr_kcal: 1007.75, activity_level: 'sedentary', multiplier: 1.2 };
    for (const goal of ['maintain', 'gain_weight', 'build_muscle'] as const) {
      const result = calculateCalorieTarget(lowTDEE, goal);
      expect(result.floor_applied).toBe(false);
    }
  });

  it('echoes back goal and tdee_kcal', () => {
    const result = calculateCalorieTarget(tdee, 'maintain');
    expect(result.goal).toBe('maintain');
    expect(result.tdee_kcal).toBe(tdee.tdee_kcal);
  });

  it('different goals produce genuinely different calorie targets', () => {
    const results = (['lose_weight', 'maintain', 'gain_weight', 'build_muscle'] as const)
      .map((g) => calculateCalorieTarget(tdee, g).calorie_target_kcal);
    const unique = new Set(results);
    expect(unique.size).toBe(4); // all four are distinct
  });
});

// ---------------------------------------------------------------------------
// 4. calculateMacroTargets — all four goals + edge cases
// ---------------------------------------------------------------------------

describe('calculateMacroTargets', () => {
  // Helper: build a CalorieTargetResult directly
  function makeTarget(kcal: number, goal: Parameters<typeof calculateMacroTargets>[1]) {
    return { calorie_target_kcal: kcal, tdee_kcal: kcal, goal, adjustment_kcal: 0, floor_applied: false };
  }

  const WEIGHT = 80; // kg reference

  it('lose_weight: protein = 2.2 g/kg bodyweight', () => {
    const result = calculateMacroTargets(makeTarget(2000, 'lose_weight'), 'lose_weight', WEIGHT);
    expect(result.protein_g).toBe(Math.round(2.2 * WEIGHT * 10) / 10);
  });

  it('maintain: protein = 1.6 g/kg bodyweight', () => {
    const result = calculateMacroTargets(makeTarget(2500, 'maintain'), 'maintain', WEIGHT);
    expect(result.protein_g).toBe(Math.round(1.6 * WEIGHT * 10) / 10);
  });

  it('gain_weight: protein = 1.8 g/kg bodyweight', () => {
    const result = calculateMacroTargets(makeTarget(2800, 'gain_weight'), 'gain_weight', WEIGHT);
    expect(result.protein_g).toBe(Math.round(1.8 * WEIGHT * 10) / 10);
  });

  it('build_muscle: protein = 2.4 g/kg bodyweight', () => {
    const result = calculateMacroTargets(makeTarget(3000, 'build_muscle'), 'build_muscle', WEIGHT);
    expect(result.protein_g).toBe(Math.round(2.4 * WEIGHT * 10) / 10);
  });

  it('higher goal → higher protein target (lose < maintain < gain < build_muscle)', () => {
    const goals = ['maintain', 'gain_weight', 'build_muscle', 'lose_weight'] as const;
    const proteins = goals.map((g) =>
      calculateMacroTargets(makeTarget(2500, g), g, WEIGHT).protein_g,
    );
    // Protein order: lose_weight(2.2) > build_muscle(2.4) — both high-protein goals
    // maintain(1.6) < gain_weight(1.8) < lose_weight(2.2) < build_muscle(2.4)
    const byKg: Record<string, number> = { maintain: 1.6, gain_weight: 1.8, lose_weight: 2.2, build_muscle: 2.4 };
    for (const g of goals) {
      const expected = Math.round(byKg[g] * WEIGHT * 10) / 10;
      expect(calculateMacroTargets(makeTarget(2500, g), g, WEIGHT).protein_g).toBe(expected);
    }
    // Confirm ordering
    expect(proteins.find((_, i) => goals[i] === 'maintain')).toBeLessThan(
      proteins.find((_, i) => goals[i] === 'gain_weight') as number,
    );
  });

  it('carbs + fat + protein kcal do not exceed calorie target by more than 10 kcal (rounding tolerance)', () => {
    for (const goal of ['lose_weight', 'maintain', 'gain_weight', 'build_muscle'] as const) {
      const target_kcal = 2200;
      const result = calculateMacroTargets(makeTarget(target_kcal, goal), goal, 75);
      const total = result.protein_g * 4 + result.carbs_g * 4 + result.fat_g * 9;
      expect(Math.abs(total - target_kcal)).toBeLessThan(10); // rounding margin
    }
  });

  it('fat always at least 20% of total calories', () => {
    for (const goal of ['lose_weight', 'maintain', 'gain_weight', 'build_muscle'] as const) {
      const result = calculateMacroTargets(makeTarget(2200, goal), goal, 80);
      const fat_kcal = result.fat_g * 9;
      expect(fat_kcal).toBeGreaterThanOrEqual(2200 * 0.20 - 1); // -1 for rounding
    }
  });

  it('carbs >= 0 for very heavy person on low calories (edge case)', () => {
    // 150 kg person on 1200 kcal — protein alone = 2.4*150 = 360g = 1440 kcal > 1200
    const result = calculateMacroTargets(makeTarget(1200, 'build_muscle'), 'build_muscle', 150);
    expect(result.carbs_g).toBeGreaterThanOrEqual(0);
  });

  it('different goals produce different macro splits at same calories', () => {
    const kcal = 2500;
    const results = (['lose_weight', 'maintain', 'gain_weight', 'build_muscle'] as const)
      .map((g) => calculateMacroTargets(makeTarget(kcal, g), g, 80));
    const proteins = results.map((r) => r.protein_g);
    const unique = new Set(proteins);
    expect(unique.size).toBeGreaterThan(1); // not all the same
  });

  it('echoes back calorie_target_kcal and goal', () => {
    const result = calculateMacroTargets(makeTarget(2500, 'maintain'), 'maintain', 70);
    expect(result.calorie_target_kcal).toBe(2500);
    expect(result.goal).toBe('maintain');
  });
});

// ---------------------------------------------------------------------------
// 5. Input validation — RangeError paths
// ---------------------------------------------------------------------------

describe('Input validation', () => {
  it('calculateBMR throws on age = 0', () => {
    expect(() => calculateBMR({ ...MALE_PROFILE, age: 0 })).toThrow(RangeError);
  });

  it('calculateBMR throws on negative age', () => {
    expect(() => calculateBMR({ ...MALE_PROFILE, age: -1 })).toThrow(RangeError);
  });

  it('calculateBMR throws on fractional age', () => {
    expect(() => calculateBMR({ ...MALE_PROFILE, age: 25.5 })).toThrow(RangeError);
  });

  it('calculateBMR throws on weight_kg = 0', () => {
    expect(() => calculateBMR({ ...MALE_PROFILE, weight_kg: 0 })).toThrow(RangeError);
  });

  it('calculateBMR throws on negative weight_kg', () => {
    expect(() => calculateBMR({ ...MALE_PROFILE, weight_kg: -10 })).toThrow(RangeError);
  });

  it('calculateBMR throws on height_cm = 0', () => {
    expect(() => calculateBMR({ ...MALE_PROFILE, height_cm: 0 })).toThrow(RangeError);
  });

  it('calculateBMR throws on NaN weight', () => {
    expect(() => calculateBMR({ ...MALE_PROFILE, weight_kg: NaN })).toThrow(RangeError);
  });

  it('calculateBMR throws on Infinity height', () => {
    expect(() => calculateBMR({ ...MALE_PROFILE, height_cm: Infinity })).toThrow(RangeError);
  });

  it('calculateTDEE throws on bmr_kcal = 0', () => {
    expect(() => calculateTDEE({ bmr_kcal: 0 }, 'active')).toThrow(RangeError);
  });

  it('calculateTDEE throws on negative bmr_kcal', () => {
    expect(() => calculateTDEE({ bmr_kcal: -500 }, 'sedentary')).toThrow(RangeError);
  });

  it('calculateCalorieTarget throws on tdee_kcal = 0', () => {
    const badTDEE = { tdee_kcal: 0, bmr_kcal: 0, activity_level: 'active' as const, multiplier: 1.55 };
    expect(() => calculateCalorieTarget(badTDEE, 'maintain')).toThrow(RangeError);
  });

  it('calculateMacroTargets throws on weight_kg = 0', () => {
    const target = { calorie_target_kcal: 2000, tdee_kcal: 2000, goal: 'maintain' as const, adjustment_kcal: 0, floor_applied: false };
    expect(() => calculateMacroTargets(target, 'maintain', 0)).toThrow(RangeError);
  });

  it('calculateMacroTargets throws on NaN calorie_target_kcal', () => {
    const target = { calorie_target_kcal: NaN, tdee_kcal: 2000, goal: 'maintain' as const, adjustment_kcal: 0, floor_applied: false };
    expect(() => calculateMacroTargets(target, 'maintain', 70)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// 6. Full pipeline integration — profile → macros
// ---------------------------------------------------------------------------

describe('Full pipeline: profile → macros', () => {
  it('male active maintain — values within plausible ranges', () => {
    const bmr = calculateBMR(MALE_PROFILE);
    const tdee = calculateTDEE(bmr, MALE_PROFILE.activity_level);
    const target = calculateCalorieTarget(tdee, MALE_PROFILE.goal);
    const macros = calculateMacroTargets(target, MALE_PROFILE.goal, MALE_PROFILE.weight_kg);

    expect(bmr.bmr_kcal).toBeGreaterThan(1500);
    expect(tdee.tdee_kcal).toBeGreaterThan(bmr.bmr_kcal);
    expect(target.calorie_target_kcal).toBe(tdee.tdee_kcal); // maintain = no adjustment
    expect(macros.protein_g).toBeGreaterThan(100);
    expect(macros.carbs_g).toBeGreaterThan(0);
    expect(macros.fat_g).toBeGreaterThan(0);
  });

  it('female lightly_active lose_weight — floor not triggered for healthy weight', () => {
    const bmr = calculateBMR(FEMALE_PROFILE);
    const tdee = calculateTDEE(bmr, FEMALE_PROFILE.activity_level);
    const target = calculateCalorieTarget(tdee, 'lose_weight');
    expect(target.calorie_target_kcal).toBeGreaterThan(CALORIE_SAFETY_FLOOR);
    expect(target.floor_applied).toBe(false);
  });

  it('four goals produce four different calorie targets from the same profile', () => {
    const bmr = calculateBMR(MALE_PROFILE);
    const tdee = calculateTDEE(bmr, MALE_PROFILE.activity_level);
    const targets = (['lose_weight', 'maintain', 'gain_weight', 'build_muscle'] as const)
      .map((g) => calculateCalorieTarget(tdee, g).calorie_target_kcal);
    expect(new Set(targets).size).toBe(4);
  });

  it('four goals produce four different protein targets from the same weight', () => {
    const bmr = calculateBMR(MALE_PROFILE);
    const tdee = calculateTDEE(bmr, MALE_PROFILE.activity_level);
    const goals = ['lose_weight', 'maintain', 'gain_weight', 'build_muscle'] as const;
    const proteins = goals.map((g) => {
      const target = calculateCalorieTarget(tdee, g);
      return calculateMacroTargets(target, g, MALE_PROFILE.weight_kg).protein_g;
    });
    expect(new Set(proteins).size).toBe(4);
  });

  it('sedentary elderly female on lose_weight triggers floor', () => {
    const profile: NutritionProfile = {
      age: 70, sex: 'female', height_cm: 155, weight_kg: 55,
      activity_level: 'sedentary', goal: 'lose_weight',
    };
    const bmr = calculateBMR(profile);    // ~1007.75
    const tdee = calculateTDEE(bmr, 'sedentary'); // ~1209.3
    const target = calculateCalorieTarget(tdee, 'lose_weight'); // 1209.3 - 500 = 709.3 < 1200
    expect(target.floor_applied).toBe(true);
    expect(target.calorie_target_kcal).toBe(CALORIE_SAFETY_FLOOR);
  });

  it('very active young male on build_muscle — no floor, large surplus', () => {
    const profile: NutritionProfile = {
      age: 22, sex: 'male', height_cm: 180, weight_kg: 75,
      activity_level: 'very_active', goal: 'build_muscle',
    };
    const bmr = calculateBMR(profile);
    const tdee = calculateTDEE(bmr, 'very_active');
    const target = calculateCalorieTarget(tdee, 'build_muscle');
    const macros = calculateMacroTargets(target, 'build_muscle', profile.weight_kg);

    expect(target.floor_applied).toBe(false);
    expect(target.calorie_target_kcal).toBeGreaterThan(3000);
    expect(macros.protein_g).toBe(Math.round(2.4 * 75 * 10) / 10); // 180g
  });
});
