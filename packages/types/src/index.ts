/**
 * @thali/types
 * Shared primitive types for the Thali Tracker monorepo.
 */

export interface CommonServing {
  label: string;
  grams: number;
}

export interface FoodItem {
  id: string;
  canonicalName: string;
  localNames: string[];
  aliases: string[];
  cuisineTags: string[];
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  commonServings: CommonServing[];
  source?: string;
  sourceVersion?: string;
  verifiedAt?: string;
}

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extra_active';

export type Goal =
  | 'lose_weight'
  | 'maintain'
  | 'gain_weight'
  | 'build_muscle';

export type Sex = 'male' | 'female';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type CuisinePreference = 'bengali' | 'mixed' | 'western';

