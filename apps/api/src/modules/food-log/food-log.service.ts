import { randomUUID } from 'crypto';
import type {
  CalculatedNutrition,
  DailyFoodDiary,
  FoodItem,
  FoodLogEntry,
  MealSlot,
  MealSlotGroup,
} from '@thali/types';
import type { CreateFoodLogInput, PatchFoodLogInput } from '@thali/schemas';
import type { FoodService } from '../food/food.service.js';
import type { IFoodLogRepository } from './food-log.repository.js';

export function calculateNutritionForFood(
  food: FoodItem,
  quantity: number,
  unit: string,
): CalculatedNutrition {
  let totalGrams = quantity;

  const unitLower = unit.toLowerCase().trim();
  if (unitLower !== 'g' && unitLower !== 'grams' && unitLower !== 'gram') {
    // Look for matching common serving
    const matchedServing = food.commonServings.find(
      (s) =>
        s.label.toLowerCase().includes(unitLower) ||
        unitLower.includes(s.label.toLowerCase()),
    );

    if (matchedServing) {
      totalGrams = quantity * matchedServing.grams;
    } else if (food.commonServings.length > 0 && unitLower === 'serving') {
      totalGrams = quantity * food.commonServings[0].grams;
    }
  }

  const factor = totalGrams / 100;

  return {
    calories: Math.round(food.caloriesPer100g * factor * 10) / 10,
    protein: Math.round(food.proteinPer100g * factor * 10) / 10,
    carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
    fat: Math.round(food.fatPer100g * factor * 10) / 10,
    fiber: Math.round(food.fiberPer100g * factor * 10) / 10,
  };
}

export class FoodLogService {
  constructor(
    private repository: IFoodLogRepository,
    private foodService: FoodService,
  ) {}

  async addLogEntry(input: CreateFoodLogInput): Promise<FoodLogEntry> {
    const food = this.foodService.getFoodById(input.foodId);
    if (!food) {
      throw new Error(`Food item with ID "${input.foodId}" not found`);
    }

    const calculatedNutrition = calculateNutritionForFood(
      food,
      input.quantity,
      input.unit,
    );

    const newId = randomUUID();

    return this.repository.create({
      id: newId,
      subscriberId: input.subscriberId,
      loggedOn: input.loggedOn,
      mealSlot: input.mealSlot,
      foodId: input.foodId,
      foodName: food.canonicalName,
      quantity: input.quantity,
      unit: input.unit,
      calculatedNutrition,
    });
  }

  async updateLogEntry(
    id: string,
    updates: PatchFoodLogInput,
  ): Promise<FoodLogEntry | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;

    let calculatedNutrition = existing.calculatedNutrition;
    const newQuantity = updates.quantity ?? existing.quantity;
    const newUnit = updates.unit ?? existing.unit;

    if (updates.quantity !== undefined || updates.unit !== undefined) {
      const food = this.foodService.getFoodById(existing.foodId);
      if (food) {
        calculatedNutrition = calculateNutritionForFood(food, newQuantity, newUnit);
      }
    }

    return this.repository.update(id, {
      quantity: newQuantity,
      unit: newUnit,
      mealSlot: updates.mealSlot ?? existing.mealSlot,
      calculatedNutrition,
    });
  }

  async deleteLogEntry(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  async getDailyDiary(subscriberId: string, date: string): Promise<DailyFoodDiary> {
    const entries = await this.repository.findBySubscriberAndDate(
      subscriberId,
      date,
    );

    const slotNames: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    const meals: Record<MealSlot, MealSlotGroup> = {
      breakfast: {
        mealSlot: 'breakfast',
        items: [],
        subtotal: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      },
      lunch: {
        mealSlot: 'lunch',
        items: [],
        subtotal: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      },
      dinner: {
        mealSlot: 'dinner',
        items: [],
        subtotal: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      },
      snack: {
        mealSlot: 'snack',
        items: [],
        subtotal: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      },
    };

    const totals: CalculatedNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    };

    for (const entry of entries) {
      if (meals[entry.mealSlot]) {
        meals[entry.mealSlot].items.push(entry);

        // Add to meal subtotal
        meals[entry.mealSlot].subtotal.calories += entry.calculatedNutrition.calories;
        meals[entry.mealSlot].subtotal.protein += entry.calculatedNutrition.protein;
        meals[entry.mealSlot].subtotal.carbs += entry.calculatedNutrition.carbs;
        meals[entry.mealSlot].subtotal.fat += entry.calculatedNutrition.fat;
        meals[entry.mealSlot].subtotal.fiber += entry.calculatedNutrition.fiber;

        // Add to daily total
        totals.calories += entry.calculatedNutrition.calories;
        totals.protein += entry.calculatedNutrition.protein;
        totals.carbs += entry.calculatedNutrition.carbs;
        totals.fat += entry.calculatedNutrition.fat;
        totals.fiber += entry.calculatedNutrition.fiber;
      }
    }

    // Round all subtotals and totals to 1 decimal place
    for (const slot of slotNames) {
      meals[slot].subtotal.calories = Math.round(meals[slot].subtotal.calories * 10) / 10;
      meals[slot].subtotal.protein = Math.round(meals[slot].subtotal.protein * 10) / 10;
      meals[slot].subtotal.carbs = Math.round(meals[slot].subtotal.carbs * 10) / 10;
      meals[slot].subtotal.fat = Math.round(meals[slot].subtotal.fat * 10) / 10;
      meals[slot].subtotal.fiber = Math.round(meals[slot].subtotal.fiber * 10) / 10;
    }

    totals.calories = Math.round(totals.calories * 10) / 10;
    totals.protein = Math.round(totals.protein * 10) / 10;
    totals.carbs = Math.round(totals.carbs * 10) / 10;
    totals.fat = Math.round(totals.fat * 10) / 10;
    totals.fiber = Math.round(totals.fiber * 10) / 10;

    return {
      subscriberId,
      date,
      meals,
      totals,
    };
  }
}
