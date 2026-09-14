import { randomUUID } from 'crypto';
import type {
  CalculatedNutrition,
  DietPlan,
  DietPlanDay,
  DietPlanItem,
  DietPlanMeal,
  MealSlot,
  UserProfile,
} from '@thali/types';
import type { AddDietPlanItemInput, RemoveDietPlanItemInput } from '@thali/schemas';
import type { FoodService } from '../food/food.service.js';
import type { ProfileService } from '../profile/profile.service.js';
import type { IDietPlanRepository } from './diet-plan.repository.js';
import { calculateNutritionForFood } from '../food-log/food-log.service.js';

export function getMealDeviation(
  subtotal: CalculatedNutrition,
  target?: CalculatedNutrition,
): string | undefined {
  if (!target || target.calories <= 0) return undefined;

  const kcalDiff = subtotal.calories - target.calories;
  const proteinDiff = subtotal.protein - target.protein;

  const notes: string[] = [];

  if (Math.abs(kcalDiff) >= 75) {
    if (kcalDiff < 0) {
      notes.push(`${Math.round(Math.abs(kcalDiff))} kcal below target for this meal`);
    } else {
      notes.push(`${Math.round(kcalDiff)} kcal above target for this meal`);
    }
  }

  if (proteinDiff <= -6) {
    notes.push(`${Math.round(Math.abs(proteinDiff))}g under your protein target for this meal`);
  }

  return notes.length > 0 ? notes.join(' • ') : undefined;
}

function sumNutrition(items: CalculatedNutrition[]): CalculatedNutrition {
  const result: CalculatedNutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  for (const item of items) {
    result.calories += item.calories;
    result.protein += item.protein;
    result.carbs += item.carbs;
    result.fat += item.fat;
    result.fiber += item.fiber;
  }

  result.calories = Math.round(result.calories * 10) / 10;
  result.protein = Math.round(result.protein * 10) / 10;
  result.carbs = Math.round(result.carbs * 10) / 10;
  result.fat = Math.round(result.fat * 10) / 10;
  result.fiber = Math.round(result.fiber * 10) / 10;

  return result;
}

export class DietPlanService {
  constructor(
    private repository: IDietPlanRepository,
    private profileService: ProfileService,
    private foodService: FoodService,
  ) {}

  /**
   * Generate an initial 7-day adaptive diet plan matching target macros and calories.
   */
  async generatePlan(subscriberId: string): Promise<DietPlan> {
    const profileWithNutrition = await this.profileService.getProfile(subscriberId);
    if (!profileWithNutrition) {
      throw new Error(`Profile not found for subscriber "${subscriberId}"`);
    }

    const { profile, nutrition } = profileWithNutrition;
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const targetCalorie = nutrition.calorieTarget;
    const targetProtein = nutrition.macros.protein_g;
    const targetCarbs = nutrition.macros.carbs_g;
    const targetFat = nutrition.macros.fat_g;

    // Slot distributions
    const slotRatios: Record<MealSlot, number> = {
      breakfast: 0.25,
      lunch: 0.35,
      dinner: 0.30,
      snack: 0.10,
    };

    const days: DietPlanDay[] = daysOfWeek.map((dayName, dayIndex) => {
      const meals: DietPlanMeal[] = (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map(
        (slot) => {
          const ratio = slotRatios[slot];
          const slotTargetKcal = Math.round(targetCalorie * ratio);
          const slotTargetProtein = Math.round(targetProtein * ratio * 10) / 10;
          const slotTargetCarbs = Math.round(targetCarbs * ratio * 10) / 10;
          const slotTargetFat = Math.round(targetFat * ratio * 10) / 10;

          const targetNutrition: CalculatedNutrition = {
            calories: slotTargetKcal,
            protein: slotTargetProtein,
            carbs: slotTargetCarbs,
            fat: slotTargetFat,
            fiber: 0,
          };

          const items = this.buildScaledMeal(slot, profile, dayIndex, targetNutrition);
          const subtotal = sumNutrition(items.map((i) => i.calculatedNutrition));
          const deviationNote = getMealDeviation(subtotal, targetNutrition);

          return {
            mealSlot: slot,
            items,
            isCustomized: false,
            subtotal,
            targetNutrition,
            deviationNote,
          };
        },
      );

      const dayTotals = sumNutrition(meals.map((m) => m.subtotal));

      return {
        day: dayName,
        meals,
        totals: dayTotals,
      };
    });

    const plan: DietPlan = {
      id: `plan_${Date.now()}_${randomUUID().substring(0, 8)}`,
      subscriberId,
      version: 1,
      calorieTarget: targetCalorie,
      proteinTarget_g: targetProtein,
      carbsTarget_g: targetCarbs,
      fatTarget_g: targetFat,
      days,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.repository.save(plan);
  }

  async getPlanBySubscriberId(subscriberId: string): Promise<DietPlan | null> {
    return this.repository.findBySubscriberId(subscriberId);
  }

  async addItemToMeal(input: AddDietPlanItemInput): Promise<DietPlan> {
    let plan = await this.repository.findBySubscriberId(input.subscriberId);
    if (!plan) {
      plan = await this.generatePlan(input.subscriberId);
    }

    const food = this.foodService.getFoodById(input.foodId);
    if (!food) {
      throw new Error(`Food item "${input.foodId}" not found`);
    }

    const unit = input.unit || 'g';
    const calculatedNutrition = calculateNutritionForFood(food, input.quantity, unit);

    const newItem: DietPlanItem = {
      id: `item_${Date.now()}_${randomUUID().substring(0, 6)}`,
      foodId: food.id,
      foodName: food.canonicalName,
      quantity: input.quantity,
      unit,
      calculatedNutrition,
    };

    const targetDay = plan.days.find((d) => d.day.toLowerCase() === input.day.toLowerCase());
    if (!targetDay) {
      throw new Error(`Day "${input.day}" not found in diet plan`);
    }

    const targetMeal = targetDay.meals.find((m) => m.mealSlot === input.mealSlot);
    if (!targetMeal) {
      throw new Error(`Meal slot "${input.mealSlot}" not found for ${input.day}`);
    }

    targetMeal.items.push(newItem);
    targetMeal.isCustomized = true;
    targetMeal.subtotal = sumNutrition(targetMeal.items.map((i) => i.calculatedNutrition));
    targetMeal.deviationNote = getMealDeviation(targetMeal.subtotal, targetMeal.targetNutrition);

    targetDay.totals = sumNutrition(targetDay.meals.map((m) => m.subtotal));

    return this.repository.save(plan);
  }

  async removeItemFromMeal(input: RemoveDietPlanItemInput): Promise<DietPlan> {
    const plan = await this.repository.findBySubscriberId(input.subscriberId);
    if (!plan) {
      throw new Error(`Diet plan not found for subscriber "${input.subscriberId}"`);
    }

    const targetDay = plan.days.find((d) => d.day.toLowerCase() === input.day.toLowerCase());
    if (!targetDay) {
      throw new Error(`Day "${input.day}" not found in diet plan`);
    }

    const targetMeal = targetDay.meals.find((m) => m.mealSlot === input.mealSlot);
    if (!targetMeal) {
      throw new Error(`Meal slot "${input.mealSlot}" not found for ${input.day}`);
    }

    if (input.itemIndex !== undefined && input.itemIndex >= 0 && input.itemIndex < targetMeal.items.length) {
      targetMeal.items.splice(input.itemIndex, 1);
    } else {
      const idx = targetMeal.items.findIndex((i) => i.foodId === input.foodId);
      if (idx !== -1) {
        targetMeal.items.splice(idx, 1);
      }
    }

    targetMeal.isCustomized = true;
    targetMeal.subtotal = sumNutrition(targetMeal.items.map((i) => i.calculatedNutrition));
    targetMeal.deviationNote = getMealDeviation(targetMeal.subtotal, targetMeal.targetNutrition);

    targetDay.totals = sumNutrition(targetDay.meals.map((m) => m.subtotal));

    return this.repository.save(plan);
  }

  /**
   * Builds the food list for a meal AND solves for quantities that actually
   * hit the meal's calorie and protein targets, instead of using fixed
   * hardcoded portions. This is what makes a weight-loss plan and a
   * muscle-gain plan genuinely different in practice, not just in a label.
   *
   * Approach (deterministic, no AI, fully explainable):
   *   1. Pick a realistic food combination for this slot/cuisine (unchanged
   *      logic from before — this decides WHAT is eaten).
   *   2. Scale every item's quantity uniformly so the combination's total
   *      calories match the target (clamped to a sane portion range so an
   *      extreme target doesn't produce an absurd single portion).
   *   3. If protein still falls short after calorie-scaling (common for
   *      high-protein goals like muscle building), boost just the
   *      protein-role item(s) to close the gap, since protein-dense foods
   *      let us add protein without blowing the calorie budget as fast as
   *      scaling everything up would.
   */
  private buildScaledMeal(
    slot: MealSlot,
    profile: UserProfile,
    dayIndex: number,
    target: CalculatedNutrition,
  ): DietPlanItem[] {
    const picks = this.pickCandidateFoods(slot, profile, dayIndex);

    const resolved = picks
      .map((pick) => ({ pick, food: this.foodService.getFoodById(pick.foodId) }))
      .filter((r): r is { pick: FoodPick; food: NonNullable<ReturnType<FoodService['getFoodById']>> } =>
        r.food !== null,
      );

    if (resolved.length === 0) return [];

    const baselineNutrition = resolved.map((r) =>
      calculateNutritionForFood(r.food, r.pick.qty, r.pick.unit),
    );
    const baselineTotal = sumNutrition(baselineNutrition);

    // Step 1: uniform calorie scaling, clamped so portions stay realistic
    // even for very low or very high calorie targets.
    const MIN_SCALE = 0.4;
    const MAX_SCALE = 2.5;
    let scale = baselineTotal.calories > 0 ? target.calories / baselineTotal.calories : 1;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

    const scaledQuantities = resolved.map((r) => roundToNearest(r.pick.qty * scale, 5));

    // Step 2: protein correction. If we're still short on protein after
    // calorie-scaling, add grams specifically to the protein-role item(s)
    // rather than scaling everything (which would overshoot calories).
    let currentNutrition = resolved.map((r, i) =>
      calculateNutritionForFood(r.food, scaledQuantities[i], r.pick.unit),
    );
    let currentTotal = sumNutrition(currentNutrition);

    const PROTEIN_GAP_THRESHOLD_G = 5;
    const proteinGap = target.protein - currentTotal.protein;

    if (proteinGap > PROTEIN_GAP_THRESHOLD_G) {
      const proteinIndices = resolved
        .map((r, i) => ({ i, isProtein: r.pick.role === 'protein', density: r.food.proteinPer100g }))
        .filter((r) => r.isProtein)
        .sort((a, b) => b.density - a.density);

      if (proteinIndices.length > 0) {
        const { i: idx } = proteinIndices[0];
        const food = resolved[idx].food;
        const proteinDensity = Math.max(food.proteinPer100g, 0.5); // avoid divide-by-near-zero
        const extraGramsNeeded = (proteinGap / proteinDensity) * 100;
        // Cap the boost so a single item doesn't balloon into an unrealistic
        // portion — at most double its calorie-scaled quantity.
        const maxBoosted = scaledQuantities[idx] * 2;
        scaledQuantities[idx] = roundToNearest(
          Math.min(scaledQuantities[idx] + extraGramsNeeded, maxBoosted),
          5,
        );
      }
    }

    // Step 3: calorie correction. Boosting protein above adds calories too
    // (protein-dense foods aren't calorie-free) — if that pushed the meal
    // meaningfully over target, trim the base-role item(s) (the starch/carb
    // base, which the meal needs least urgently once protein is covered)
    // to bring the total back toward target rather than leaving it to
    // silently overshoot.
    currentNutrition = resolved.map((r, i) =>
      calculateNutritionForFood(r.food, scaledQuantities[i], r.pick.unit),
    );
    currentTotal = sumNutrition(currentNutrition);

    const CALORIE_OVERSHOOT_THRESHOLD = 1.1; // allow up to 10% over before correcting
    if (target.calories > 0 && currentTotal.calories / target.calories > CALORIE_OVERSHOOT_THRESHOLD) {
      const baseIndices = resolved
        .map((_r, i) => i)
        .filter((i) => resolved[i].pick.role === 'base');

      if (baseIndices.length > 0) {
        const excessCalories = currentTotal.calories - target.calories;
        const baseCaloriesTotal = baseIndices.reduce(
          (sum, i) => sum + currentNutrition[i].calories,
          0,
        );

        if (baseCaloriesTotal > 0) {
          for (const i of baseIndices) {
            const shareOfExcess = currentNutrition[i].calories / baseCaloriesTotal;
            const caloriesToRemove = excessCalories * shareOfExcess;
            const caloriesPerGram = resolved[i].food.caloriesPer100g / 100;
            const gramsToRemove = caloriesPerGram > 0 ? caloriesToRemove / caloriesPerGram : 0;
            // Never trim a base item below 30% of its calorie-scaled amount
            // — it should shrink, not disappear.
            const floor = scaledQuantities[i] * 0.3;
            scaledQuantities[i] = roundToNearest(
              Math.max(scaledQuantities[i] - gramsToRemove, floor),
              5,
            );
          }
        }
      }
    }

    return resolved.map((r, i) => ({
      id: `item_${Date.now()}_${randomUUID().substring(0, 6)}`,
      foodId: r.food.id,
      foodName: r.food.canonicalName,
      quantity: scaledQuantities[i],
      unit: r.pick.unit,
      calculatedNutrition: calculateNutritionForFood(r.food, scaledQuantities[i], r.pick.unit),
    }));
  }

  /**
   * Picks WHICH foods make up a meal for a given slot/cuisine/day. Returns
   * reference quantities (used as a starting ratio between items, not the
   * final served amount) plus a role tag so buildScaledMeal() knows which
   * item to lean on for protein correction.
   */
  private pickCandidateFoods(slot: MealSlot, profile: UserProfile, dayIndex: number): FoodPick[] {
    const pref = profile.cuisine_preference;
    const isBengali = pref === 'bengali';
    const isWestern = pref === 'western';

    const foodPicks: FoodPick[] = [];

    if (slot === 'breakfast') {
      if (isBengali) {
        foodPicks.push(
          { foodId: 'food_bengali_ruti', qty: 80, unit: 'g', role: 'base' },
          { foodId: 'food_bengali_dimer_dalna', qty: 130, unit: 'g', role: 'protein' },
        );
      } else if (isWestern) {
        foodPicks.push(
          { foodId: 'food_western_rolled_oats', qty: 40, unit: 'g', role: 'base' },
          { foodId: 'food_western_whole_milk', qty: 150, unit: 'g', role: 'protein' },
          { foodId: 'food_western_boiled_egg', qty: 50, unit: 'g', role: 'protein' },
        );
      } else {
        // Mixed
        if (dayIndex % 2 === 0) {
          foodPicks.push(
            { foodId: 'food_bengali_ruti', qty: 80, unit: 'g', role: 'base' },
            { foodId: 'food_bengali_dimer_dalna', qty: 130, unit: 'g', role: 'protein' },
          );
        } else {
          foodPicks.push(
            { foodId: 'food_western_rolled_oats', qty: 40, unit: 'g', role: 'base' },
            { foodId: 'food_western_whole_milk', qty: 150, unit: 'g', role: 'protein' },
            { foodId: 'food_generic_banana', qty: 100, unit: 'g', role: 'other' },
          );
        }
      }
    } else if (slot === 'lunch') {
      if (isWestern && dayIndex % 2 === 1) {
        foodPicks.push(
          { foodId: 'food_western_grilled_chicken_breast', qty: 150, unit: 'g', role: 'protein' },
          { foodId: 'food_generic_boiled_potato', qty: 150, unit: 'g', role: 'base' },
          { foodId: 'food_generic_raw_broccoli', qty: 100, unit: 'g', role: 'other' },
        );
      } else {
        // Bengali / Mixed staple lunch
        const fishOrChicken =
          dayIndex % 2 === 0 ? 'food_bengali_rui_macher_jhol' : 'food_bengali_murgir_jhol';
        foodPicks.push(
          { foodId: 'food_bengali_sada_bhat', qty: 200, unit: 'g', role: 'base' },
          { foodId: 'food_bengali_moshur_dal', qty: 150, unit: 'g', role: 'protein' },
          { foodId: fishOrChicken, qty: 120, unit: 'g', role: 'protein' },
          { foodId: 'food_bengali_shobji_bhaji', qty: 100, unit: 'g', role: 'other' },
        );
      }
    } else if (slot === 'dinner') {
      if (isWestern) {
        foodPicks.push(
          { foodId: 'food_western_whole_wheat_bread', qty: 70, unit: 'g', role: 'base' },
          { foodId: 'food_western_canned_tuna', qty: 120, unit: 'g', role: 'protein' },
          { foodId: 'food_generic_cucumber', qty: 100, unit: 'g', role: 'other' },
        );
      } else {
        foodPicks.push(
          { foodId: 'food_bengali_ruti', qty: 80, unit: 'g', role: 'base' },
          { foodId: 'food_bengali_murgir_jhol', qty: 150, unit: 'g', role: 'protein' },
          { foodId: 'food_bengali_shaak_bhaji', qty: 80, unit: 'g', role: 'other' },
        );
      }
    } else {
      // Snack
      if (dayIndex % 2 === 0) {
        foodPicks.push(
          { foodId: 'food_generic_banana', qty: 118, unit: 'g', role: 'other' },
          { foodId: 'food_generic_raw_almonds', qty: 15, unit: 'g', role: 'protein' },
        );
      } else {
        foodPicks.push(
          { foodId: 'food_generic_apple', qty: 140, unit: 'g', role: 'other' },
          { foodId: 'food_brand_aarong_tok_doi', qty: 100, unit: 'g', role: 'protein' },
        );
      }
    }

    return foodPicks;
  }
}

interface FoodPick {
  foodId: string;
  qty: number;
  unit: string;
  role: 'base' | 'protein' | 'other';
}

function roundToNearest(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}
