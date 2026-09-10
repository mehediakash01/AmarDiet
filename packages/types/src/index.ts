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
  | 'lightly_active'
  | 'active'
  | 'very_active';

export type Goal =
  | 'lose_weight'
  | 'maintain'
  | 'gain_weight'
  | 'build_muscle';

export type Sex = 'male' | 'female';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type CuisinePreference = 'bengali' | 'mixed' | 'western';

export interface Subscriber {
  id: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  subscriberId: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
  target_weight_kg?: number;
  dietary_preferences?: Record<string, unknown>;
  cuisine_preference: CuisinePreference;
  updated_at: string;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  macros: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  safetyFloorApplied: boolean;
}

export interface ProfileWithNutrition {
  profile: UserProfile;
  nutrition: NutritionTargets;
}

export interface CalculatedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface FoodLogEntry {
  id: string;
  subscriberId: string;
  loggedOn: string; // YYYY-MM-DD
  mealSlot: MealSlot;
  foodId: string;
  foodName?: string;
  quantity: number;
  unit: string;
  calculatedNutrition: CalculatedNutrition;
  createdAt: string;
  updatedAt: string;
}

export interface MealSlotGroup {
  mealSlot: MealSlot;
  items: FoodLogEntry[];
  subtotal: CalculatedNutrition;
}

export interface DailyFoodDiary {
  subscriberId: string;
  date: string;
  meals: Record<MealSlot, MealSlotGroup>;
  totals: CalculatedNutrition;
}

export interface DietPlanItem {
  id?: string;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;
  calculatedNutrition: CalculatedNutrition;
}

export interface DietPlanMeal {
  mealSlot: MealSlot;
  items: DietPlanItem[];
  isCustomized: boolean;
  subtotal: CalculatedNutrition;
  targetNutrition?: CalculatedNutrition;
  deviationNote?: string;
}

export interface DietPlanDay {
  day: string; // "Monday", "Tuesday", etc.
  meals: DietPlanMeal[];
  totals: CalculatedNutrition;
}

export interface DietPlan {
  id: string;
  subscriberId: string;
  version: number;
  calorieTarget: number;
  proteinTarget_g: number;
  carbsTarget_g: number;
  fatTarget_g: number;
  days: DietPlanDay[];
  createdAt: string;
  updatedAt: string;
}

export interface WeightLog {
  id: string;
  subscriberId: string;
  weight_kg: number;
  loggedOn: string; // YYYY-MM-DD
  createdAt: string;
}

export interface WeeklyAdherenceDay {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue", etc.
  isLogged: boolean;
  totalCalories: number;
  targetCalories: number;
  adherent: boolean; // within acceptable range (e.g. ±200 kcal of target or logged)
}

export interface ProgressSummary {
  subscriberId: string;
  currentWeight_kg?: number;
  startingWeight_kg?: number;
  targetWeight_kg?: number;
  weightDelta_kg?: number;
  weightHistory: WeightLog[];
  weeklyAdherence: {
    days: WeeklyAdherenceDay[];
    adherencePercent: number;
    daysLoggedCount: number;
    totalDays: number;
    averageCalories: number;
  };
}



