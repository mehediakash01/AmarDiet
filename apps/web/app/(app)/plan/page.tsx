'use client';

import React, { useEffect, useState } from 'react';
import { Plus, X, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';

export default function DietPlanPage() {
  const profile = useNutritionStore((s) => s.profile);
  const nutrition = useNutritionStore((s) => s.nutrition);
  const activePlan = useNutritionStore((s) => s.activePlan);
  const loadPlan = useNutritionStore((s) => s.loadPlan);
  const generatePlan = useNutritionStore((s) => s.generatePlan);
  const openPlanFoodSearch = useNutritionStore((s) => s.openPlanFoodSearch);
  const removePlanItem = useNutritionStore((s) => s.removePlanItem);

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      await generatePlan();
    } finally {
      setIsGenerating(false);
    }
  };

  const goalDescriptions: Record<string, string> = {
    lose_weight: 'Weight loss — 500 kcal/day deficit',
    maintain: 'Weight maintenance — energy balance',
    gain_weight: 'Weight gain — 300 kcal/day clean surplus',
    build_muscle: 'Muscle building — 200 kcal/day surplus with 2.4g/kg protein',
  };

  const goalText = profile?.goal
    ? goalDescriptions[profile.goal] || profile.goal.replace('_', ' ')
    : 'Goal-Adaptive Nutrition Plan';

  const dailyCalorieTarget = nutrition?.calorieTarget
    ? Math.round(nutrition.calorieTarget)
    : activePlan?.calorieTarget
      ? Math.round(activePlan.calorieTarget)
      : 2000;

  return (
    <div className="space-y-6">
      {/* Top Plain Summary Strip per Section 1.5 */}
      <div className="bg-surface border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            7-Day Adaptive Meal Plan
          </div>
          <div className="text-lg sm:text-xl font-serif font-bold text-primary mt-0.5">
            {goalText}
          </div>
          <div className="text-xs text-muted mt-0.5">
            Daily Target: <strong className="text-dark font-mono">{dailyCalorieTarget} kcal</strong> • Protein: <strong className="text-dark font-mono">{Math.round(nutrition?.macros.protein_g || 140)}g</strong> • Carbs: <strong className="text-dark font-mono">{Math.round(nutrition?.macros.carbs_g || 200)}g</strong> • Fat: <strong className="text-dark font-mono">{Math.round(nutrition?.macros.fat_g || 50)}g</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-surface rounded-lg text-xs font-medium transition shadow flex items-center space-x-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Generating Plan...' : 'Regenerate Plan'}</span>
        </button>
      </div>

      {/* 7-Column Layout per Section 1.5 */}
      {!activePlan ? (
        <div className="p-12 text-center text-muted text-sm bg-surface border border-border rounded-lg">
          Loading 7-day adaptive diet plan...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5 overflow-x-auto pb-4">
          {activePlan.days.map((day) => (
            <div
              key={day.day}
              className="bg-surface border border-border rounded-lg flex flex-col min-w-[220px] shadow-xs"
            >
              {/* Day Header */}
              <div className="bg-background/60 p-3 border-b border-border text-center">
                <div className="font-serif font-bold text-sm text-primary">
                  {day.day}
                </div>
              </div>

              {/* Meals List */}
              <div className="p-3 space-y-4 flex-1">
                {day.meals.map((meal) => {
                  const slotLabel = meal.mealSlot.charAt(0).toUpperCase() + meal.mealSlot.slice(1);
                  return (
                    <div key={meal.mealSlot} className="space-y-1.5">
                      {/* Meal Header & Subtotal */}
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
                        <span className="font-semibold text-dark">{slotLabel}</span>
                        <span className="font-mono text-muted text-[11px]">
                          {Math.round(meal.subtotal.calories)} kcal
                        </span>
                      </div>

                      {/* Items list with hover remove */}
                      {meal.items.length === 0 ? (
                        <div className="text-[11px] text-muted/70 italic py-1">
                          No items in this meal.
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {meal.items.map((item, idx) => (
                            <li
                              key={`${item.foodId}_${idx}`}
                              className="group text-xs text-dark/90 flex items-start justify-between py-0.5 hover:bg-background/40 px-1 rounded transition"
                            >
                              <div className="pr-1 flex-1">
                                <span className="font-normal">{item.foodName}</span>
                                <span className="text-[10px] text-muted block">
                                  {item.quantity} {item.unit} • {Math.round(item.calculatedNutrition.calories)} kcal
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePlanItem(day.day, meal.mealSlot, item.foodId, idx)}
                                className="text-muted hover:text-warning opacity-0 group-hover:opacity-100 transition p-0.5 rounded"
                                title="Remove item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Informal Deviation Note (if customized) */}
                      {meal.deviationNote && (
                        <div className="text-[10px] text-secondary font-medium bg-secondary-light/40 px-1.5 py-0.5 rounded">
                          {meal.deviationNote}
                        </div>
                      )}

                      {/* + Add item link */}
                      <button
                        type="button"
                        onClick={() => openPlanFoodSearch(day.day, meal.mealSlot)}
                        className="text-[11px] text-primary hover:text-primary-hover font-medium flex items-center space-x-0.5 transition pt-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add item</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Day Total at Bottom */}
              <div className="bg-background/40 p-2.5 border-t border-border mt-auto flex items-center justify-between text-xs">
                <span className="font-semibold text-muted text-[11px] uppercase tracking-wider">
                  Day Total
                </span>
                <span className="font-mono font-bold text-primary">
                  {Math.round(day.totals.calories)} kcal
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
