/**
 * Nutrition Engine — deterministic BMR / TDEE / calorie / macro calculations.
 *
 * All formulas are documented in-line with their source.
 * No AI, no network, no framework dependencies.
 *
 * Formula: Mifflin-St Jeor (1990)
 *   Male:   BMR = 10 × weight_kg + 6.25 × height_cm − 5 × age + 5
 *   Female: BMR = 10 × weight_kg + 6.25 × height_cm − 5 × age − 161
 *
 * Source: Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.
 *   "A new predictive equation for resting energy expenditure in healthy
 *   individuals." Am J Clin Nutr. 1990 Feb;51(2):241-7.
 */

import {
  ACTIVITY_MULTIPLIERS,
  CALORIE_SAFETY_FLOOR,
  GOAL_ADJUSTMENTS,
  type ActivityLevel,
  type Goal,
} from './constants.js';
import type {
  BMRResult,
  CalorieTargetResult,
  MacroTargets,
  NutritionProfile,
  TDEEResult,
} from './types.js';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite positive number, got ${value}`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`);
  }
}

// ---------------------------------------------------------------------------
// calculateBMR
// ---------------------------------------------------------------------------

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor (1990).
 *
 * @param profile - anthropometric data
 * @returns BMRResult with kcal/day rounded to 2 decimal places
 */
export function calculateBMR(profile: NutritionProfile): BMRResult {
  assertPositiveInteger(profile.age, 'age');
  assertPositive(profile.weight_kg, 'weight_kg');
  assertPositive(profile.height_cm, 'height_cm');

  const base =
    10 * profile.weight_kg +
    6.25 * profile.height_cm -
    5 * profile.age;

  const bmr_kcal =
    profile.sex === 'male'
      ? Math.round((base + 5) * 100) / 100
      : Math.round((base - 161) * 100) / 100;

  return { bmr_kcal };
}

// ---------------------------------------------------------------------------
// calculateTDEE
// ---------------------------------------------------------------------------

/**
 * Calculate Total Daily Energy Expenditure.
 * TDEE = BMR × activity multiplier (Harris-Benedict activity scale).
 *
 * @param bmr - result from calculateBMR
 * @param activity_level - one of the four standardised levels
 * @returns TDEEResult with kcal/day rounded to 2 decimal places
 */
export function calculateTDEE(bmr: BMRResult, activity_level: ActivityLevel): TDEEResult {
  assertPositive(bmr.bmr_kcal, 'bmr_kcal');

  const multiplier = ACTIVITY_MULTIPLIERS[activity_level];
  const tdee_kcal = Math.round(bmr.bmr_kcal * multiplier * 100) / 100;

  return {
    tdee_kcal,
    bmr_kcal: bmr.bmr_kcal,
    activity_level,
    multiplier,
  };
}

// ---------------------------------------------------------------------------
// calculateCalorieTarget
// ---------------------------------------------------------------------------

/**
 * Calculate daily calorie target adjusted for goal.
 *
 * Goal adjustments (kcal/day relative to TDEE):
 *   lose_weight  : −500  (safe 0.45 kg/week deficit)
 *   maintain     :    0
 *   gain_weight  :  +300  (lean bulk)
 *   build_muscle :  +200  (smaller surplus, protein-emphasis)
 *
 * Safety floor: if the calculated target for lose_weight falls below
 * CALORIE_SAFETY_FLOOR (1200 kcal), the floor is applied and
 * floor_applied is set to true. Other goals add to TDEE so the floor
 * is not relevant to them.
 *
 * @param tdee - result from calculateTDEE
 * @param goal - user's dietary goal
 * @returns CalorieTargetResult
 */
export function calculateCalorieTarget(tdee: TDEEResult, goal: Goal): CalorieTargetResult {
  assertPositive(tdee.tdee_kcal, 'tdee_kcal');

  const adjustment_kcal = GOAL_ADJUSTMENTS[goal];
  let calorie_target_kcal = Math.round((tdee.tdee_kcal + adjustment_kcal) * 100) / 100;
  let floor_applied = false;

  if (goal === 'lose_weight' && calorie_target_kcal < CALORIE_SAFETY_FLOOR) {
    calorie_target_kcal = CALORIE_SAFETY_FLOOR;
    floor_applied = true;
  }

  return {
    calorie_target_kcal,
    tdee_kcal: tdee.tdee_kcal,
    goal,
    adjustment_kcal,
    floor_applied,
  };
}

// ---------------------------------------------------------------------------
// calculateMacroTargets
// ---------------------------------------------------------------------------

/**
 * Calculate protein / carbs / fat targets in grams.
 *
 * Protein is scaled by bodyweight AND goal because muscle-building and
 * weight-loss both demand higher protein than maintenance.
 *
 * Protein targets (g/kg bodyweight):
 *   lose_weight  : 2.2  — high protein preserves lean mass during deficit
 *   maintain     : 1.6  — adequate for health and body composition
 *   gain_weight  : 1.8  — supports hypertrophy during surplus
 *   build_muscle : 2.4  — maximal muscle protein synthesis signal
 *
 * Fat minimum: 20% of total calories (floor), never goes below.
 * Fat maximum: 35% of total calories for maintain / gain goals.
 *
 * Carbs: remainder after protein and fat kcal are allocated.
 * If carb allocation goes negative (extreme low-calorie edge case), carbs = 0
 * and fat absorbs the remainder.
 *
 * Caloric densities: protein = 4 kcal/g, carbs = 4 kcal/g, fat = 9 kcal/g.
 *
 * @param calorieTarget - result from calculateCalorieTarget
 * @param goal - user's dietary goal
 * @param weight_kg - current bodyweight in kg
 * @returns MacroTargets (all values rounded to 1 decimal place)
 */
export function calculateMacroTargets(
  calorieTarget: CalorieTargetResult,
  goal: Goal,
  weight_kg: number,
): MacroTargets {
  assertPositive(calorieTarget.calorie_target_kcal, 'calorie_target_kcal');
  assertPositive(weight_kg, 'weight_kg');

  const PROTEIN_KCAL_PER_G = 4;
  const CARB_KCAL_PER_G = 4;
  const FAT_KCAL_PER_G = 9;

  // Protein per-kg targets by goal
  const proteinPerKg: Record<Goal, number> = {
    lose_weight: 2.2,
    maintain: 1.6,
    gain_weight: 1.8,
    build_muscle: 2.4,
  };

  const total_kcal = calorieTarget.calorie_target_kcal;

  // Protein
  const protein_g_raw = proteinPerKg[goal] * weight_kg;
  const protein_kcal = protein_g_raw * PROTEIN_KCAL_PER_G;

  // Fat — 25% of calories for lose/build_muscle, 30% for maintain/gain_weight
  const fatPercent =
    goal === 'lose_weight' || goal === 'build_muscle' ? 0.25 : 0.30;
  let fat_kcal = total_kcal * fatPercent;

  // Apply fat floor (20%) and ceiling (35%)
  const fat_floor_kcal = total_kcal * 0.20;
  const fat_ceiling_kcal = total_kcal * 0.35;
  if (fat_kcal < fat_floor_kcal) fat_kcal = fat_floor_kcal;
  if (fat_kcal > fat_ceiling_kcal) fat_kcal = fat_ceiling_kcal;

  // Carbs: remaining calories after protein + fat
  let carb_kcal = total_kcal - protein_kcal - fat_kcal;

  // Edge case: if protein alone exceeds total calories, carbs = 0, fat = floor
  if (carb_kcal < 0) {
    carb_kcal = 0;
    // Reallocate: fat still at floor, protein fills rest (no carbs)
  }

  const protein_g = Math.round((protein_kcal / PROTEIN_KCAL_PER_G) * 10) / 10;
  const carbs_g = Math.round((carb_kcal / CARB_KCAL_PER_G) * 10) / 10;
  const fat_g = Math.round((fat_kcal / FAT_KCAL_PER_G) * 10) / 10;

  return {
    calorie_target_kcal: total_kcal,
    protein_g,
    carbs_g,
    fat_g,
    goal,
  };
}
