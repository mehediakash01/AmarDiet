import type { ActivityLevel, Goal, Sex } from './constants.js';

// Input profile for BMR / TDEE / target calculations.
export interface NutritionProfile {
  age: number;       // years, integer >= 1
  sex: Sex;
  height_cm: number; // centimetres > 0
  weight_kg: number; // kilograms > 0
  activity_level: ActivityLevel;
  goal: Goal;
  target_weight_kg?: number; // optional, not used in arithmetic here
}

// Output of calculateBMR.
export interface BMRResult {
  bmr_kcal: number; // resting metabolic rate, kcal/day
}

// Output of calculateTDEE.
export interface TDEEResult {
  tdee_kcal: number;          // total daily energy expenditure
  bmr_kcal: number;
  activity_level: ActivityLevel;
  multiplier: number;
}

// Output of calculateCalorieTarget.
export interface CalorieTargetResult {
  calorie_target_kcal: number;
  tdee_kcal: number;
  goal: Goal;
  adjustment_kcal: number;   // the delta applied (negative = deficit)
  floor_applied: boolean;    // true when result was clamped to safety floor
}

// Output of calculateMacroTargets.
export interface MacroTargets {
  calorie_target_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal: Goal;
}
