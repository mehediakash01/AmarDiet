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

          const items = this.pickCandidateFoods(slot, profile, dayIndex);
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
   * Helper to seed candidate items per slot and cuisine
   */
  private pickCandidateFoods(
    slot: MealSlot,
    profile: UserProfile,
    dayIndex: number,
  ): DietPlanItem[] {
    const pref = profile.cuisine_preference;
    const isBengali = pref === 'bengali';
    const isWestern = pref === 'western';

    const foodPicks: Array<{ foodId: string; qty: number; unit: string }> = [];

    if (slot === 'breakfast') {
      if (isBengali) {
        foodPicks.push(
          { foodId: 'food_bengali_ruti', qty: 80, unit: 'g' },
          { foodId: 'food_bengali_dimer_dalna', qty: 130, unit: 'g' },
        );
      } else if (isWestern) {
        foodPicks.push(
          { foodId: 'food_western_rolled_oats', qty: 40, unit: 'g' },
          { foodId: 'food_western_whole_milk', qty: 150, unit: 'g' },
          { foodId: 'food_western_boiled_egg', qty: 50, unit: 'g' },
        );
      } else {
        // Mixed
        if (dayIndex % 2 === 0) {
          foodPicks.push(
            { foodId: 'food_bengali_ruti', qty: 80, unit: 'g' },
            { foodId: 'food_bengali_dimer_dalna', qty: 130, unit: 'g' },
          );
        } else {
          foodPicks.push(
            { foodId: 'food_western_rolled_oats', qty: 40, unit: 'g' },
            { foodId: 'food_western_whole_milk', qty: 150, unit: 'g' },
            { foodId: 'food_generic_banana', qty: 100, unit: 'g' },
          );
        }
      }
    } else if (slot === 'lunch') {
      if (isWestern && dayIndex % 2 === 1) {
        foodPicks.push(
          { foodId: 'food_western_grilled_chicken_breast', qty: 150, unit: 'g' },
          { foodId: 'food_generic_boiled_potato', qty: 150, unit: 'g' },
          { foodId: 'food_generic_raw_broccoli', qty: 100, unit: 'g' },
        );
      } else {
        // Bengali / Mixed staple lunch
        const fishOrChicken =
          dayIndex % 2 === 0
            ? 'food_bengali_rui_macher_jhol'
            : 'food_bengali_murgir_jhol';
        foodPicks.push(
          { foodId: 'food_bengali_sada_bhat', qty: 200, unit: 'g' },
          { foodId: 'food_bengali_moshur_dal', qty: 150, unit: 'g' },
          { foodId: fishOrChicken, qty: 120, unit: 'g' },
          { foodId: 'food_bengali_shobji_bhaji', qty: 100, unit: 'g' },
        );
      }
    } else if (slot === 'dinner') {
      if (isWestern) {
        foodPicks.push(
          { foodId: 'food_western_whole_wheat_bread', qty: 70, unit: 'g' },
          { foodId: 'food_western_canned_tuna', qty: 120, unit: 'g' },
          { foodId: 'food_generic_cucumber', qty: 100, unit: 'g' },
        );
      } else {
        foodPicks.push(
          { foodId: 'food_bengali_ruti', qty: 80, unit: 'g' },
          { foodId: 'food_bengali_murgir_jhol', qty: 150, unit: 'g' },
          { foodId: 'food_bengali_shaak_bhaji', qty: 80, unit: 'g' },
        );
      }
    } else {
      // Snack
      if (dayIndex % 2 === 0) {
        foodPicks.push(
          { foodId: 'food_generic_banana', qty: 118, unit: 'g' },
          { foodId: 'food_generic_raw_almonds', qty: 15, unit: 'g' },
        );
      } else {
        foodPicks.push(
          { foodId: 'food_generic_apple', qty: 140, unit: 'g' },
          { foodId: 'food_brand_aarong_tok_doi', qty: 100, unit: 'g' },
        );
      }
    }

    const items: DietPlanItem[] = [];
    for (const pick of foodPicks) {
      const food = this.foodService.getFoodById(pick.foodId);
      if (food) {
        items.push({
          id: `item_${Date.now()}_${randomUUID().substring(0, 6)}`,
          foodId: food.id,
          foodName: food.canonicalName,
          quantity: pick.qty,
          unit: pick.unit,
          calculatedNutrition: calculateNutritionForFood(food, pick.qty, pick.unit),
        });
      }
    }

    return items;
  }
}
