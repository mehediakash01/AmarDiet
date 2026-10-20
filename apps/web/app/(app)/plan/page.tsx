'use client';

import React, { useEffect, useState } from 'react';
import { Plus, X, RefreshCw, Sparkles, Loader2, Utensils } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';

const SLOT_COLORS: Record<string, string> = {
  breakfast: 'text-amber-400',
  lunch: 'text-emerald-400',
  dinner: 'text-purple-400',
  snack: 'text-cyan-400',
};

export default function DietPlanPage() {
  const profile = useNutritionStore((s) => s.profile);
  const nutrition = useNutritionStore((s) => s.nutrition);
  const activePlan = useNutritionStore((s) => s.activePlan);
  const isLoading = useNutritionStore((s) => s.isLoading);
  const planError = useNutritionStore((s) => s.planError);
  const loadPlan = useNutritionStore((s) => s.loadPlan);
  const generatePlan = useNutritionStore((s) => s.generatePlan);
  const openPlanFoodSearch = useNutritionStore((s) => s.openPlanFoodSearch);
  const removePlanItem = useNutritionStore((s) => s.removePlanItem);

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Set first day as active once plan loads
  useEffect(() => {
    if (activePlan && !activeDay) {
      setActiveDay(activePlan.days[0]?.day ?? null);
    }
  }, [activePlan, activeDay]);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      await generatePlan();
      setActiveDay(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const goalDescriptions: Record<string, string> = {
    lose_weight: 'Weight loss — 500 kcal/day deficit',
    maintain: 'Weight maintenance — energy balance',
    gain_weight: 'Weight gain — 300 kcal/day surplus',
    build_muscle: 'Muscle building — high protein surplus',
  };

  const goalText = profile?.goal
    ? (goalDescriptions[profile.goal] ?? profile.goal.replace('_', ' '))
    : 'Goal-Adaptive Nutrition Plan';

  const dailyCalorieTarget = nutrition?.calorieTarget
    ? Math.round(nutrition.calorieTarget)
    : activePlan?.calorieTarget
      ? Math.round(activePlan.calorieTarget)
      : 2000;

  const activeDayData = activePlan?.days.find(
    (d) => d.day.toLowerCase() === activeDay?.toLowerCase(),
  );

  // Sticky day summary totals
  const dayTotal = activeDayData
    ? activeDayData.meals.reduce(
        (acc, m) => ({
          calories: acc.calories + m.subtotal.calories,
          protein: acc.protein + m.subtotal.protein,
          carbs: acc.carbs + m.subtotal.carbs,
          fat: acc.fat + m.subtotal.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
    : null;

  return (
    <div className="space-y-5">
      {/* ── Top Summary Strip ─────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            7-Day Adaptive Plan
          </div>
          <div className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
            {goalText}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mt-1.5 font-tabular">
            <span>
              Target:{' '}
              <strong className="text-cyan-400 font-semibold">{dailyCalorieTarget} kcal</strong>
            </span>
            <span>
              P <strong className="text-purple-400">{Math.round(nutrition?.macros.protein_g ?? 140)}g</strong>
            </span>
            <span>
              C <strong className="text-emerald-400">{Math.round(nutrition?.macros.carbs_g ?? 200)}g</strong>
            </span>
            <span>
              F <strong className="text-amber-400">{Math.round(nutrition?.macros.fat_g ?? 50)}g</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isGenerating || isLoading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 min-h-[44px] self-start sm:self-auto"
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span>{isGenerating ? 'Generating…' : 'Regenerate Plan'}</span>
        </button>
      </div>

      {/* ── Error State ───────────────────────────────────────────────────── */}
      {planError && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 text-sm text-red-300">
          {planError}
        </div>
      )}

      {/* ── Loading State ─────────────────────────────────────────────────── */}
      {(isLoading || isGenerating) && !activePlan && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Building your personalised plan…</p>
        </div>
      )}

      {/* ── No Plan Empty State ───────────────────────────────────────────── */}
      {!activePlan && !isLoading && !isGenerating && !planError && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-4">
          <Utensils className="w-10 h-10 text-zinc-600 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-zinc-400">No plan yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Complete onboarding first, then generate your first 7-day plan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl text-sm font-bold transition-all min-h-[44px]"
          >
            Generate My Plan
          </button>
        </div>
      )}

      {/* ── Day Tabs ──────────────────────────────────────────────────────── */}
      {activePlan && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {activePlan.days.map((d) => {
            const isActive = d.day.toLowerCase() === activeDay?.toLowerCase();
            const shortLabel = d.day.slice(0, 3); // Mon, Tue…
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setActiveDay(d.day)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active Day: Meal Cards ─────────────────────────────────────────── */}
      {activeDayData && (
        <div className="space-y-4">
          {activeDayData.meals.map((meal) => {
            const slotLabel =
              meal.mealSlot.charAt(0).toUpperCase() + meal.mealSlot.slice(1);
            const color = SLOT_COLORS[meal.mealSlot] ?? 'text-zinc-400';

            return (
              <div
                key={meal.mealSlot}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                {/* Meal header */}
                <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/60 gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${color}`}>{slotLabel}</span>
                    {meal.isCustomized && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Customized
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-tabular font-semibold text-zinc-400 flex items-center gap-2">
                    <span>
                      {Math.round(meal.subtotal.calories)}{' '}
                      <span className="text-zinc-600 font-normal">kcal</span>
                      {meal.targetNutrition?.calories ? (
                        <span className="text-zinc-500 text-[11px] font-normal">
                          {' '}/ {Math.round(meal.targetNutrition.calories)} target
                        </span>
                      ) : null}
                    </span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-purple-400">{Math.round(meal.subtotal.protein)}g P</span>
                    <span className="text-emerald-400">{Math.round(meal.subtotal.carbs)}g C</span>
                    <span className="text-amber-400">{Math.round(meal.subtotal.fat)}g F</span>
                  </div>
                </div>

                {/* Food items */}
                <ul className="divide-y divide-zinc-800/60">
                  {meal.items.length === 0 ? (
                    <li className="px-4 py-3 text-xs text-zinc-600 italic">
                      No items — use Add item below to add foods to this meal.
                    </li>
                  ) : (
                    meal.items.map((item, idx) => (
                      <li
                        key={`${item.foodId}_${idx}`}
                        className="group flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-200 font-medium truncate">
                            {item.foodName}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-tabular">
                            {item.quantity} {item.unit} ·{' '}
                            <span className="text-zinc-400">{Math.round(item.calculatedNutrition.calories)} kcal</span>
                            {' · '}
                            <span className="text-purple-400/80">{Math.round(item.calculatedNutrition.protein)}g P</span>
                            {' · '}
                            <span className="text-emerald-400/80">{Math.round(item.calculatedNutrition.carbs)}g C</span>
                            {' · '}
                            <span className="text-amber-400/80">{Math.round(item.calculatedNutrition.fat)}g F</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            removePlanItem(activeDayData.day, meal.mealSlot as MealSlot, item.foodId, idx)
                          }
                          className="ml-3 w-7 h-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                          title="Remove item"
                          aria-label={`Remove ${item.foodName}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>

                {/* Deviation note */}
                {meal.deviationNote && (
                  <div className="px-4 py-2 text-[11px] text-cyan-400/90 bg-cyan-500/5 border-t border-cyan-500/10 flex items-center gap-1.5 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
                    {meal.deviationNote}
                  </div>
                )}

                {/* Add item */}
                <div className="px-4 py-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => openPlanFoodSearch(activeDayData.day, meal.mealSlot as MealSlot)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add item
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky Day Summary ─────────────────────────────────────────────── */}
      {dayTotal && activePlan && (
        <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between sticky bottom-4">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            {activeDay} Total
          </span>
          <div className="flex gap-4 font-tabular text-xs">
            <span className="font-bold text-zinc-100">
              {Math.round(dayTotal.calories)}{' '}
              <span className="font-normal text-zinc-500">kcal</span>
            </span>
            <span>
              P <strong className="text-purple-400">{Math.round(dayTotal.protein)}g</strong>
            </span>
            <span>
              C <strong className="text-emerald-400">{Math.round(dayTotal.carbs)}g</strong>
            </span>
            <span>
              F <strong className="text-amber-400">{Math.round(dayTotal.fat)}g</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
