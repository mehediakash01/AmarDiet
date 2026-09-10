import { create } from 'zustand';
import type {
  CalculatedNutrition,
  DietPlan,
  DietPlanDay,
  DietPlanItem,
  DietPlanMeal,
  FoodItem,
  FoodLogEntry,
  MealSlot,
  NutritionTargets,
  UserProfile,
} from '@thali/types';
import { db, type LocalFoodLogEntry } from '../db/db.js';
import { syncEngine } from '../sync/syncEngine.js';
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
} from '@thali/nutrition-engine';

export function computeLocalNutrition(profile: UserProfile): NutritionTargets {
  const bmrResult = calculateBMR({
    age: profile.age,
    sex: profile.sex,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    activity_level: profile.activity_level,
    goal: profile.goal,
    target_weight_kg: profile.target_weight_kg,
  });
  const tdeeResult = calculateTDEE(bmrResult, profile.activity_level);
  const calorieTargetResult = calculateCalorieTarget(tdeeResult, profile.goal);
  const macroTargets = calculateMacroTargets(
    calorieTargetResult,
    profile.goal,
    profile.weight_kg,
  );

  return {
    bmr: bmrResult.bmr_kcal,
    tdee: tdeeResult.tdee_kcal,
    calorieTarget: calorieTargetResult.calorie_target_kcal,
    macros: {
      protein_g: macroTargets.protein_g,
      carbs_g: macroTargets.carbs_g,
      fat_g: macroTargets.fat_g,
    },
    safetyFloorApplied: calorieTargetResult.floor_applied,
  };
}

export interface NutritionState {
  subscriberId: string;
  profile: UserProfile | null;
  nutrition: NutritionTargets | null;
  selectedDate: string; // YYYY-MM-DD
  isSearchModalOpen: boolean;
  searchContext: 'log' | 'plan';
  activeMealSlot: MealSlot;
  activePlanDay: string | null;
  dailyLogs: LocalFoodLogEntry[];
  activePlan: DietPlan | null;
  isLoading: boolean;

  // Actions
  setSubscriberId: (id: string) => void;
  setProfile: (profile: UserProfile) => Promise<void>;
  setSelectedDate: (date: string) => void;
  openFoodSearch: (slot: MealSlot) => void;
  openPlanFoodSearch: (day: string, slot: MealSlot) => void;
  closeFoodSearch: () => void;
  loadProfile: () => Promise<void>;
  loadLogsForDate: (date?: string) => Promise<void>;
  logFood: (
    food: FoodItem,
    quantity: number,
    unit: string,
    slot?: MealSlot,
  ) => Promise<void>;
  removeFoodLog: (id: string) => Promise<void>;
  updateFoodLog: (id: string, quantity: number, unit?: string) => Promise<void>;

  // Diet Plan Actions
  loadPlan: () => Promise<void>;
  generatePlan: () => Promise<void>;
  addPlanItem: (food: FoodItem, quantity: number, unit?: string) => Promise<void>;
  removePlanItem: (day: string, slot: MealSlot, foodId: string, index?: number) => Promise<void>;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_PROFILE: UserProfile = {
  subscriberId: 'default-user',
  age: 26,
  sex: 'male',
  height_cm: 175,
  weight_kg: 72,
  activity_level: 'lightly_active',
  goal: 'lose_weight',
  target_weight_kg: 68,
  cuisine_preference: 'bengali',
  updated_at: new Date().toISOString(),
};

function calculateNutritionHelper(food: FoodItem, quantity: number, unit: string): CalculatedNutrition {
  let totalGrams = quantity;
  const unitLower = unit.toLowerCase().trim();
  if (unitLower !== 'g' && unitLower !== 'grams') {
    const match = food.commonServings.find((s) => s.label.toLowerCase().includes(unitLower));
    if (match) totalGrams = quantity * match.grams;
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

function sumNutr(items: CalculatedNutrition[]): CalculatedNutrition {
  const res: CalculatedNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const i of items) {
    res.calories += i.calories;
    res.protein += i.protein;
    res.carbs += i.carbs;
    res.fat += i.fat;
    res.fiber += i.fiber;
  }
  res.calories = Math.round(res.calories * 10) / 10;
  res.protein = Math.round(res.protein * 10) / 10;
  res.carbs = Math.round(res.carbs * 10) / 10;
  res.fat = Math.round(res.fat * 10) / 10;
  res.fiber = Math.round(res.fiber * 10) / 10;
  return res;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  subscriberId: 'default-user',
  profile: DEFAULT_PROFILE,
  nutrition: computeLocalNutrition(DEFAULT_PROFILE),
  selectedDate: getTodayString(),
  isSearchModalOpen: false,
  searchContext: 'log',
  activeMealSlot: 'lunch',
  activePlanDay: null,
  dailyLogs: [],
  activePlan: null,
  isLoading: false,

  setSubscriberId: (id: string) => set({ subscriberId: id }),

  setProfile: async (profile: UserProfile) => {
    const nutrition = computeLocalNutrition(profile);
    set({ profile, nutrition });
    if (typeof window !== 'undefined') {
      await db.cachedProfile.put(profile);
    }
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    get().loadLogsForDate(date);
  },

  openFoodSearch: (slot: MealSlot) => {
    set({ activeMealSlot: slot, searchContext: 'log', isSearchModalOpen: true });
  },

  openPlanFoodSearch: (day: string, slot: MealSlot) => {
    set({
      activePlanDay: day,
      activeMealSlot: slot,
      searchContext: 'plan',
      isSearchModalOpen: true,
    });
  },

  closeFoodSearch: () => {
    set({ isSearchModalOpen: false });
  },

  loadProfile: async () => {
    if (typeof window === 'undefined') return;
    try {
      const cached = await db.cachedProfile.get(get().subscriberId);
      if (cached) {
        set({
          profile: cached,
          nutrition: computeLocalNutrition(cached),
        });
      }
    } catch (e) {
      console.error('Failed to load cached profile:', e);
    }
  },

  loadLogsForDate: async (date?: string) => {
    if (typeof window === 'undefined') return;
    const targetDate = date || get().selectedDate;
    const { subscriberId } = get();

    try {
      const allLogs = await db.foodLogs.toArray();
      const filtered = allLogs.filter(
        (l) => l.subscriberId === subscriberId && l.loggedOn === targetDate,
      );
      set({ dailyLogs: filtered });
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
  },

  logFood: async (food: FoodItem, quantity: number, unit: string, slot?: MealSlot) => {
    const state = get();
    if (state.searchContext === 'plan' && state.activePlanDay) {
      await state.addPlanItem(food, quantity, unit);
      return;
    }

    const mealSlot = slot || state.activeMealSlot;
    const loggedOn = state.selectedDate;
    const calculatedNutrition = calculateNutritionHelper(food, quantity, unit);

    const newEntry: LocalFoodLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subscriberId: state.subscriberId,
      loggedOn,
      mealSlot,
      foodId: food.id,
      foodName: food.canonicalName,
      quantity,
      unit,
      calculatedNutrition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    if (typeof window !== 'undefined') {
      await db.foodLogs.add(newEntry);
      await syncEngine.queueFoodLogMutation('create', newEntry);
    }

    set((prev) => ({
      dailyLogs: [...prev.dailyLogs, newEntry],
      isSearchModalOpen: false,
    }));
  },

  removeFoodLog: async (id: string) => {
    const state = get();
    const entry = state.dailyLogs.find((l) => l.id === id);

    if (typeof window !== 'undefined' && entry) {
      await db.foodLogs.delete(id);
      await syncEngine.queueFoodLogMutation('delete', entry);
    }

    set((prev) => ({
      dailyLogs: prev.dailyLogs.filter((l) => l.id !== id),
    }));
  },

  updateFoodLog: async (id: string, quantity: number, unit?: string) => {
    const state = get();
    const existing = state.dailyLogs.find((l) => l.id === id);
    if (!existing) return;

    let food: FoodItem | undefined;
    if (typeof window !== 'undefined') {
      food = await db.foods.get(existing.foodId);
    }

    const finalUnit = unit || existing.unit;
    const calculatedNutrition = food
      ? calculateNutritionHelper(food, quantity, finalUnit)
      : existing.calculatedNutrition;

    const updatedEntry: LocalFoodLogEntry = {
      ...existing,
      quantity,
      unit: finalUnit,
      calculatedNutrition,
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    if (typeof window !== 'undefined') {
      await db.foodLogs.put(updatedEntry);
      await syncEngine.queueFoodLogMutation('update', updatedEntry);
    }

    set((prev) => ({
      dailyLogs: prev.dailyLogs.map((l) => (l.id === id ? updatedEntry : l)),
    }));
  },

  loadPlan: async () => {
    const { subscriberId } = get();
    try {
      const res = await fetch(`http://localhost:3001/api/diet-plan/${subscriberId}`);
      if (res.ok) {
        const plan = await res.json();
        set({ activePlan: plan });
        return;
      }
    } catch {
      // offline / mock fallback
    }

    if (!get().activePlan) {
      await get().generatePlan();
    }
  },

  generatePlan: async () => {
    const { subscriberId } = get();
    try {
      const res = await fetch('http://localhost:3001/api/diet-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId }),
      });
      if (res.ok) {
        const plan = await res.json();
        set({ activePlan: plan });
        return;
      }
    } catch {
      // offline fallback generation
    }

    // Client-side fallback generator
    const profile = get().profile || DEFAULT_PROFILE;
    const nutrition = get().nutrition || computeLocalNutrition(profile);
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const mockPlan: DietPlan = {
      id: `plan_local_${Date.now()}`,
      subscriberId,
      version: 1,
      calorieTarget: nutrition.calorieTarget,
      proteinTarget_g: nutrition.macros.protein_g,
      carbsTarget_g: nutrition.macros.carbs_g,
      fatTarget_g: nutrition.macros.fat_g,
      days: daysOfWeek.map((day) => ({
        day,
        meals: [
          {
            mealSlot: 'breakfast',
            isCustomized: false,
            items: [
              {
                foodId: 'food_bengali_ruti',
                foodName: 'Handmade Whole Wheat Roti',
                quantity: 80,
                unit: 'g',
                calculatedNutrition: { calories: 211.2, protein: 7.3, carbs: 42.8, fat: 1.1, fiber: 5.4 },
              },
              {
                foodId: 'food_bengali_dimer_dalna',
                foodName: 'Bengali Egg Curry',
                quantity: 130,
                unit: 'g',
                calculatedNutrition: { calories: 175.5, protein: 11.1, carbs: 8.1, fat: 10.9, fiber: 1.4 },
              },
            ],
            subtotal: { calories: 386.7, protein: 18.4, carbs: 50.9, fat: 12.0, fiber: 6.8 },
            targetNutrition: { calories: Math.round(nutrition.calorieTarget * 0.25), protein: 30, carbs: 50, fat: 12, fiber: 0 },
          },
          {
            mealSlot: 'lunch',
            isCustomized: false,
            items: [
              {
                foodId: 'food_bengali_sada_bhat',
                foodName: 'Steamed White Rice',
                quantity: 200,
                unit: 'g',
                calculatedNutrition: { calories: 260, protein: 5.4, carbs: 56.4, fat: 0.6, fiber: 0.8 },
              },
              {
                foodId: 'food_bengali_moshur_dal',
                foodName: 'Bengali Red Lentil Dal',
                quantity: 150,
                unit: 'g',
                calculatedNutrition: { calories: 127.5, protein: 8.3, carbs: 18.0, fat: 2.7, fiber: 3.2 },
              },
              {
                foodId: 'food_bengali_rui_macher_jhol',
                foodName: 'Rohu Fish Curry',
                quantity: 120,
                unit: 'g',
                calculatedNutrition: { calories: 150, protein: 17.4, carbs: 3.8, fat: 7.2, fiber: 1.0 },
              },
            ],
            subtotal: { calories: 537.5, protein: 31.1, carbs: 78.2, fat: 10.5, fiber: 5.0 },
            targetNutrition: { calories: Math.round(nutrition.calorieTarget * 0.35), protein: 45, carbs: 70, fat: 15, fiber: 0 },
          },
          {
            mealSlot: 'dinner',
            isCustomized: false,
            items: [
              {
                foodId: 'food_bengali_ruti',
                foodName: 'Handmade Whole Wheat Roti',
                quantity: 80,
                unit: 'g',
                calculatedNutrition: { calories: 211.2, protein: 7.3, carbs: 42.8, fat: 1.1, fiber: 5.4 },
              },
              {
                foodId: 'food_bengali_murgir_jhol',
                foodName: 'Bengali Chicken Curry',
                quantity: 150,
                unit: 'g',
                calculatedNutrition: { calories: 217.5, protein: 22.8, carbs: 7.2, fat: 11.0, fiber: 1.4 },
              },
            ],
            subtotal: { calories: 428.7, protein: 30.1, carbs: 50.0, fat: 12.1, fiber: 6.8 },
            targetNutrition: { calories: Math.round(nutrition.calorieTarget * 0.30), protein: 40, carbs: 60, fat: 14, fiber: 0 },
          },
          {
            mealSlot: 'snack',
            isCustomized: false,
            items: [
              {
                foodId: 'food_generic_banana',
                foodName: 'Fresh Banana',
                quantity: 118,
                unit: 'g',
                calculatedNutrition: { calories: 105, protein: 1.3, carbs: 26.9, fat: 0.4, fiber: 3.1 },
              },
            ],
            subtotal: { calories: 105, protein: 1.3, carbs: 26.9, fat: 0.4, fiber: 3.1 },
            targetNutrition: { calories: Math.round(nutrition.calorieTarget * 0.10), protein: 5, carbs: 20, fat: 4, fiber: 0 },
          },
        ],
        totals: { calories: 1457.9, protein: 80.9, carbs: 206.0, fat: 35.0, fiber: 21.7 },
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({ activePlan: mockPlan });
  },

  addPlanItem: async (food: FoodItem, quantity: number, unit = 'g') => {
    const { activePlan, activePlanDay, activeMealSlot, subscriberId } = get();
    if (!activePlan || !activePlanDay) return;

    try {
      const res = await fetch('http://localhost:3001/api/diet-plan/item/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId,
          day: activePlanDay,
          mealSlot: activeMealSlot,
          foodId: food.id,
          quantity,
          unit,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        set({ activePlan: updated, isSearchModalOpen: false });
        return;
      }
    } catch {
      // offline fallback
    }

    // Local mutation
    const calculatedNutrition = calculateNutritionHelper(food, quantity, unit);
    const newItem: DietPlanItem = {
      id: `item_${Date.now()}`,
      foodId: food.id,
      foodName: food.canonicalName,
      quantity,
      unit,
      calculatedNutrition,
    };

    const newDays = activePlan.days.map((d) => {
      if (d.day.toLowerCase() !== activePlanDay.toLowerCase()) return d;
      const newMeals = d.meals.map((m) => {
        if (m.mealSlot !== activeMealSlot) return m;
        const newItems = [...m.items, newItem];
        const subtotal = sumNutr(newItems.map((i) => i.calculatedNutrition));
        return {
          ...m,
          items: newItems,
          isCustomized: true,
          subtotal,
          deviationNote: `${Math.round(subtotal.calories)} kcal customized`,
        };
      });
      return {
        ...d,
        meals: newMeals,
        totals: sumNutr(newMeals.map((m) => m.subtotal)),
      };
    });

    set({
      activePlan: { ...activePlan, days: newDays },
      isSearchModalOpen: false,
    });
  },

  removePlanItem: async (day: string, slot: MealSlot, foodId: string, index?: number) => {
    const { activePlan, subscriberId } = get();
    if (!activePlan) return;

    try {
      const res = await fetch('http://localhost:3001/api/diet-plan/item/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId,
          day,
          mealSlot: slot,
          foodId,
          itemIndex: index,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        set({ activePlan: updated });
        return;
      }
    } catch {
      // offline fallback
    }

    const newDays = activePlan.days.map((d) => {
      if (d.day.toLowerCase() !== day.toLowerCase()) return d;
      const newMeals = d.meals.map((m) => {
        if (m.mealSlot !== slot) return m;
        const newItems = index !== undefined
          ? m.items.filter((_, i) => i !== index)
          : m.items.filter((i) => i.foodId !== foodId);
        const subtotal = sumNutr(newItems.map((i) => i.calculatedNutrition));
        return {
          ...m,
          items: newItems,
          isCustomized: true,
          subtotal,
          deviationNote: `${Math.round(subtotal.calories)} kcal customized`,
        };
      });
      return {
        ...d,
        meals: newMeals,
        totals: sumNutr(newMeals.map((m) => m.subtotal)),
      };
    });

    set({ activePlan: { ...activePlan, days: newDays } });
  },
}));
