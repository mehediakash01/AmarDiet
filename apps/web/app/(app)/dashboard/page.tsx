'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, X, Utensils, Calendar, Settings } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { PlateRingChart } from '@/components/PlateRingChart';
import { BmiSpectrumChart } from '@/components/BmiSpectrumChart';

export default function DashboardPage() {
  const profile = useNutritionStore((s) => s.profile);
  const nutrition = useNutritionStore((s) => s.nutrition);
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const dailyLogs = useNutritionStore((s) => s.dailyLogs);
  const openFoodSearch = useNutritionStore((s) => s.openFoodSearch);
  const removeFoodLog = useNutritionStore((s) => s.removeFoodLog);
  const loadProfile = useNutritionStore((s) => s.loadProfile);
  const loadLogsForDate = useNutritionStore((s) => s.loadLogsForDate);

  useEffect(() => {
    loadProfile();
    loadLogsForDate();
  }, [loadProfile, loadLogsForDate]);

  // Aggregate consumed nutrition
  const consumedTotals = useMemo(() => {
    return dailyLogs.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calculatedNutrition.calories,
        protein: acc.protein + entry.calculatedNutrition.protein,
        carbs: acc.carbs + entry.calculatedNutrition.carbs,
        fat: acc.fat + entry.calculatedNutrition.fat,
        fiber: acc.fiber + entry.calculatedNutrition.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
  }, [dailyLogs]);

  const slots: Array<{ id: MealSlot; label: string }> = [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
    { id: 'snack', label: 'Snacks & Extras' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-primary">
            Today's Log
          </h1>
          <div className="flex items-center space-x-2 text-xs text-muted mt-1">
            <Calendar className="w-3.5 h-3.5 text-muted" />
            <span>{selectedDate}</span>
            <span>•</span>
            <span className="capitalize">{profile?.goal.replace('_', ' ')}</span>
            <span>•</span>
            <span className="capitalize">{profile?.cuisine_preference} Focus</span>
          </div>
        </div>

        <Link
          href="/onboarding"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-border bg-surface hover:bg-background rounded text-xs font-medium text-dark transition self-start sm:self-auto"
        >
          <Settings className="w-3.5 h-3.5 text-muted" />
          <span>Edit Profile / Targets</span>
        </Link>
      </div>

      {/* Main 2-Column Utilitarian Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Meals by 4 slots) */}
        <div className="lg:col-span-7 space-y-4">
          {slots.map((slot) => {
            const slotEntries = dailyLogs.filter((l) => l.mealSlot === slot.id);
            const slotCalories = slotEntries.reduce(
              (sum, l) => sum + l.calculatedNutrition.calories,
              0,
            );

            return (
              <div
                key={slot.id}
                className="bg-surface border border-border rounded-lg p-4 transition"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border/70">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-dark text-base">
                      {slot.label}
                    </span>
                    {slotEntries.length > 0 && (
                      <span className="text-xs text-muted">
                        ({slotEntries.length} {slotEntries.length === 1 ? 'item' : 'items'})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold font-serif text-primary">
                      {Math.round(slotCalories)} kcal
                    </span>
                    <button
                      type="button"
                      onClick={() => openFoodSearch(slot.id)}
                      className="px-2.5 py-1 bg-background hover:bg-primary-light text-primary border border-border hover:border-primary rounded text-xs font-medium flex items-center space-x-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add food</span>
                    </button>
                  </div>
                </div>

                {/* Items in Slot */}
                {slotEntries.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted">
                    No items logged yet for {slot.label.toLowerCase()}.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40 mt-1">
                    {slotEntries.map((item) => (
                      <li
                        key={item.id}
                        className="py-2.5 flex items-center justify-between text-sm group"
                      >
                        <div>
                          <div className="font-medium text-dark flex items-center space-x-2">
                            <span>{item.foodName || 'Food Item'}</span>
                            <span className="text-xs text-muted font-normal">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted space-x-2 mt-0.5">
                            <span>P: {item.calculatedNutrition.protein}g</span>
                            <span>C: {item.calculatedNutrition.carbs}g</span>
                            <span>F: {item.calculatedNutrition.fat}g</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="font-serif font-semibold text-xs text-dark">
                            {Math.round(item.calculatedNutrition.calories)} kcal
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFoodLog(item.id)}
                            className="text-muted hover:text-warning p-1 rounded transition opacity-60 hover:opacity-100"
                            title="Remove food"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column (Plate Macro Ring + Readout) */}
        <div className="lg:col-span-5 space-y-4">
          {nutrition && (
            <PlateRingChart consumed={consumedTotals} targets={nutrition} />
          )}

          {/* Quick Profile Summary & BMI Spectrum Chart */}
          {profile && nutrition && (
            <>
              <BmiSpectrumChart heightCm={profile.height_cm} weightKg={profile.weight_kg} />

              <div className="bg-surface border border-border rounded-lg p-4 text-xs space-y-2">
                <div className="font-semibold text-dark uppercase tracking-wider text-[11px] text-muted">
                  Formula Breakdown
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted">BMR (Mifflin-St Jeor)</span>
                  <span className="font-mono font-medium text-dark">{Math.round(nutrition.bmr)} kcal</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted">TDEE ({profile.activity_level.replace('_', ' ')})</span>
                  <span className="font-mono font-medium text-dark">{Math.round(nutrition.tdee)} kcal</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Daily Target ({profile.goal.replace('_', ' ')})</span>
                  <span className="font-mono font-bold text-primary">{Math.round(nutrition.calorieTarget)} kcal</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
