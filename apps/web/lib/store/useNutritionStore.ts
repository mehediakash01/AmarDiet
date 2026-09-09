import { create } from 'zustand';
import type {
  CalculatedNutrition,
  FoodItem,
  FoodLogEntry,
  MealSlot,
  MealSlotGroup,
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
  activeMealSlot: MealSlot;
  dailyLogs: LocalFoodLogEntry[];
  isLoading: boolean;

  // Actions
  setSubscriberId: (id: string) => void;
  setProfile: (profile: UserProfile) => Promise<void>;
  setSelectedDate: (date: string) => void;
  openFoodSearch: (slot: MealSlot) => void;
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

export const useNutritionStore = create<NutritionState>((set, get) => ({
  subscriberId: 'default-user',
  profile: DEFAULT_PROFILE,
  nutrition: computeLocalNutrition(DEFAULT_PROFILE),
  selectedDate: getTodayString(),
  isSearchModalOpen: false,
  activeMealSlot: 'lunch',
  dailyLogs: [],
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
    set({ activeMealSlot: slot, isSearchModalOpen: true });
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
      const logs = await db.foodLogs
        .where('[subscriberId+loggedOn]')
        .equals([subscriberId, targetDate])
        .toArray();

      // Fallback if compound index not available
      if (!logs || logs.length === 0) {
        const allLogs = await db.foodLogs.toArray();
        const filtered = allLogs.filter(
          (l) => l.subscriberId === subscriberId && l.loggedOn === targetDate,
        );
        set({ dailyLogs: filtered });
      } else {
        set({ dailyLogs: logs });
      }
    } catch {
      const allLogs = await db.foodLogs.toArray();
      const filtered = allLogs.filter(
        (l) => l.subscriberId === subscriberId && l.loggedOn === targetDate,
      );
      set({ dailyLogs: filtered });
    }
  },

  logFood: async (food: FoodItem, quantity: number, unit: string, slot?: MealSlot) => {
    const state = get();
    const mealSlot = slot || state.activeMealSlot;
    const loggedOn = state.selectedDate;

    let totalGrams = quantity;
    const unitLower = unit.toLowerCase().trim();
    if (unitLower !== 'g' && unitLower !== 'grams') {
      const match = food.commonServings.find(
        (s) =>
          s.label.toLowerCase().includes(unitLower) ||
          unitLower.includes(s.label.toLowerCase()),
      );
      if (match) {
        totalGrams = quantity * match.grams;
      } else if (food.commonServings.length > 0 && unitLower === 'serving') {
        totalGrams = quantity * food.commonServings[0].grams;
      }
    }

    const factor = totalGrams / 100;
    const calculatedNutrition: CalculatedNutrition = {
      calories: Math.round(food.caloriesPer100g * factor * 10) / 10,
      protein: Math.round(food.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
      fat: Math.round(food.fatPer100g * factor * 10) / 10,
      fiber: Math.round(food.fiberPer100g * factor * 10) / 10,
    };

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

    // Load food item to recalculate
    let food: FoodItem | undefined;
    if (typeof window !== 'undefined') {
      food = await db.foods.get(existing.foodId);
    }

    let calculatedNutrition = existing.calculatedNutrition;
    const finalUnit = unit || existing.unit;

    if (food) {
      let totalGrams = quantity;
      const unitLower = finalUnit.toLowerCase().trim();
      if (unitLower !== 'g' && unitLower !== 'grams') {
        const match = food.commonServings.find((s) =>
          s.label.toLowerCase().includes(unitLower),
        );
        if (match) totalGrams = quantity * match.grams;
      }
      const factor = totalGrams / 100;
      calculatedNutrition = {
        calories: Math.round(food.caloriesPer100g * factor * 10) / 10,
        protein: Math.round(food.proteinPer100g * factor * 10) / 10,
        carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
        fat: Math.round(food.fatPer100g * factor * 10) / 10,
        fiber: Math.round(food.fiberPer100g * factor * 10) / 10,
      };
    }

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
}));
