import { create } from 'zustand';
import type {
  CalculatedNutrition,
  DietPlan,
  DietPlanItem,
  FoodItem,
  MealSlot,
  NutritionTargets,
  UserProfile,
} from '@thali/types';
import { db, type LocalFoodLogEntry } from '../db/db';
import { syncEngine } from '../sync/syncEngine';
import { getOrCreateSubscriberId, getApiBaseUrl } from '../identity/subscriberId';
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
  isSubscriberReady: boolean;
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
  planError: string | null;

  // Actions
  initSubscriber: () => Promise<void>;
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
  subscriberId: '',
  isSubscriberReady: false,
  profile: null,
  nutrition: null,
  selectedDate: getTodayString(),
  isSearchModalOpen: false,
  searchContext: 'log',
  activeMealSlot: 'lunch',
  activePlanDay: null,
  dailyLogs: [],
  activePlan: null,
  isLoading: false,
  planError: null,

  initSubscriber: async () => {
    const id = await getOrCreateSubscriberId();
    set({ subscriberId: id, isSubscriberReady: true });
    await get().loadProfile();
  },

  setSubscriberId: (id: string) => set({ subscriberId: id }),

  setProfile: async (profile: UserProfile) => {
    const nutrition = computeLocalNutrition(profile);
    set({ profile, nutrition });

    if (typeof window !== 'undefined') {
      await db.cachedProfile.put(profile);
    }

    // Write through to the real account. Local cache above already made
    // this responsive; if the server write fails (offline), the user's
    // local data is still correct — they just won't have it on another
    // device until this succeeds. Not retried/queued yet, unlike food
    // logs — worth adding if this turns out to matter in practice.
    try {
      await fetch(`${getApiBaseUrl()}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
    } catch (e) {
      console.error('Failed to save profile to server (saved locally only):', e);
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
    const { subscriberId } = get();
    if (!subscriberId) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/profile/${subscriberId}`);
      if (res.ok) {
        const result = await res.json();
        const profile: UserProfile = { ...result.profile, subscriberId };
        set({ profile, nutrition: result.nutrition });
        await db.cachedProfile.put(profile);
        return;
      }
      if (res.status === 404) {
        // No profile saved yet for this subscriber — expected for a brand
        // new account before onboarding completes. Not an error.
        set({ profile: null, nutrition: null });
        return;
      }
    } catch (e) {
      console.error('Could not reach server for profile, falling back to local cache:', e);
    }

    // Only reached on an actual network failure, not a normal "no profile
    // yet" 404 — fall back to whatever was last cached on this device.
    try {
      const cached = await db.cachedProfile.get(subscriberId);
      set({
        profile: cached ?? null,
        nutrition: cached ? computeLocalNutrition(cached) : null,
      });
    } catch (e) {
      console.error('Failed to load cached profile:', e);
      set({ profile: null, nutrition: null });
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
    if (!subscriberId) return;
    set({ isLoading: true, planError: null });
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/diet-plan/${subscriberId}`);
      if (res.ok) {
        const plan = await res.json();
        set({ activePlan: plan, isLoading: false });
        return;
      }
      if (res.status === 404) {
        // No plan generated yet for this subscriber — go generate one,
        // this is expected for a new account, not an error.
        set({ isLoading: false });
        await get().generatePlan();
        return;
      }
      set({
        isLoading: false,
        planError: `Couldn't load your plan (server responded ${res.status}). Please try again.`,
      });
    } catch (e) {
      console.error('Failed to load diet plan:', e);
      set({
        isLoading: false,
        planError: "Couldn't reach the server to load your plan. Check your connection and try again.",
      });
    }
  },

  generatePlan: async () => {
    const { subscriberId } = get();
    if (!subscriberId) return;
    set({ isLoading: true, planError: null });
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/diet-plan/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId }),
      });
      if (res.ok) {
        const plan = await res.json();
        set({ activePlan: plan, isLoading: false });
        return;
      }
      set({
        isLoading: false,
        planError: `Couldn't generate your plan (server responded ${res.status}). Please try again.`,
      });
    } catch (e) {
      console.error('Failed to generate diet plan:', e);
      // Honest failure — no fabricated plan. Showing invented food and
      // numbers here would look identical to a real plan while being
      // completely made up, which is worse than a clear error the user
      // can retry.
      set({
        isLoading: false,
        planError:
          "Couldn't reach the server to build your plan. Check your connection and try again.",
      });
    }
  },

  addPlanItem: async (food: FoodItem, quantity: number, unit = 'g') => {
    const { activePlan, activePlanDay, activeMealSlot, subscriberId } = get();
    if (!activePlan || !activePlanDay) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/diet-plan/item/add`, {
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
      const res = await fetch(`${getApiBaseUrl()}/api/diet-plan/item/remove`, {
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
