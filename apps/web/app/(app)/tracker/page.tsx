'use client';

import React, { useEffect, useMemo } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Calendar, Camera, Dumbbell } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CalorieEquation } from '@/components/CalorieEquation';
import { useToast } from '@/components/ui/Toast';
import { sumCaloriesBurned } from '@/lib/exercise';
import { addDaysToDateString, localDateString } from '@/lib/date';

export default function TrackerPage() {
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate);
  const dailyLogs = useNutritionStore((s) => s.dailyLogs);
  const nutrition = useNutritionStore((s) => s.nutrition);
  const openFoodSearch = useNutritionStore((s) => s.openFoodSearch);
  const openMealScan = useNutritionStore((s) => s.openMealScan);
  const removeFoodLog = useNutritionStore((s) => s.removeFoodLog);
  const loadLogsForDate = useNutritionStore((s) => s.loadLogsForDate);
  const exerciseLogs = useNutritionStore((s) => s.exerciseLogs);
  const loadExercise = useNutritionStore((s) => s.loadExercise);
  const removeExercise = useNutritionStore((s) => s.removeExercise);
  const openExerciseSheet = useNutritionStore((s) => s.openExerciseSheet);
  const { toast } = useToast();

  useEffect(() => {
    loadLogsForDate(selectedDate);
  }, [selectedDate, loadLogsForDate]);

  useEffect(() => {
    loadExercise(selectedDate);
  }, [selectedDate, loadExercise]);

  // The store may briefly hold the previous day's list while a new date loads.
  const dayExercise = useMemo(
    () => exerciseLogs.filter((l) => l.loggedOn === selectedDate),
    [exerciseLogs, selectedDate],
  );
  const caloriesBurned = sumCaloriesBurned(dayExercise);

  const handleRemoveExercise = async (id: string) => {
    const result = await removeExercise(id);
    if (!result.ok) toast(result.error, 'error');
  };

  const changeDate = (days: number) => {
    setSelectedDate(addDaysToDateString(selectedDate, days));
  };

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
    { id: 'snack', label: 'Snacks' },
  ];

  const targetP = nutrition?.macros.protein_g || 140;
  const targetC = nutrition?.macros.carbs_g || 200;
  const targetF = nutrition?.macros.fat_g || 55;

  // Format date as human-readable
  const dateLabel = (() => {
    const today = localDateString();
    if (selectedDate === today) return 'Today';
    if (selectedDate === addDaysToDateString(today, -1)) return 'Yesterday';
    return new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  })();

  return (
    <div className="space-y-5">
      {/* ── Date Navigation ───────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => changeDate(-1)}
          className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 flex-1 justify-center">
          <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="font-bold text-sm text-zinc-100">{dateLabel}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="sr-only"
            aria-label="Select date"
          />
          <span className="text-xs text-zinc-500 font-tabular hidden sm:inline">
            {selectedDate}
          </span>
        </div>

        <button
          type="button"
          onClick={() => changeDate(1)}
          className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Calories: Budget − Food + Exercise = Remaining ────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5">
        <CalorieEquation
          budget={nutrition?.calorieTarget}
          food={consumedTotals.calories}
          exercise={caloriesBurned}
          showBar
        />
      </div>

      {/* ── Daily Macro Summary ───────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Macro trio */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Protein',
              value: consumedTotals.protein,
              target: targetP,
              variant: 'protein' as const,
              color: 'text-purple-400',
            },
            {
              label: 'Carbs',
              value: consumedTotals.carbs,
              target: targetC,
              variant: 'carbs' as const,
              color: 'text-emerald-400',
            },
            {
              label: 'Fat',
              value: consumedTotals.fat,
              target: targetF,
              variant: 'fat' as const,
              color: 'text-amber-400',
            },
          ].map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                  {m.label}
                </span>
                <span className={`text-[11px] font-semibold font-tabular ${m.color}`}>
                  {Math.round(m.value)}g
                </span>
              </div>
              <ProgressBar value={m.value} max={m.target} variant={m.variant} size="sm" />
              <div className="text-[10px] text-zinc-600 font-tabular">
                / {Math.round(m.target)}g
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4 Stacked Meal Sections ───────────────────────────────────────── */}
      <div className="space-y-4">
        {slots.map((slot) => {
          const slotEntries = dailyLogs.filter((l) => l.mealSlot === slot.id);
          const subtotal = slotEntries.reduce(
            (acc, l) => ({
              calories: acc.calories + l.calculatedNutrition.calories,
              protein: acc.protein + l.calculatedNutrition.protein,
              carbs: acc.carbs + l.calculatedNutrition.carbs,
              fat: acc.fat + l.calculatedNutrition.fat,
              fiber: acc.fiber + l.calculatedNutrition.fiber,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          );

          return (
            <div
              key={slot.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">{slot.label}</h3>
                  {slotEntries.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-tabular mt-0.5">
                      <span className="text-cyan-400 font-semibold">
                        {Math.round(subtotal.calories)} kcal
                      </span>
                      <span>
                        P <span className="text-purple-400">{Math.round(subtotal.protein)}g</span>
                      </span>
                      <span>
                        C <span className="text-emerald-400">{Math.round(subtotal.carbs)}g</span>
                      </span>
                      <span>
                        F <span className="text-amber-400">{Math.round(subtotal.fat)}g</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openMealScan(slot.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-all min-h-[36px]"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openFoodSearch(slot.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold transition-all min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {/* Item List */}
              {slotEntries.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-zinc-600">
                    No foods logged for {slot.label.toLowerCase()}.
                  </p>
                  <button
                    type="button"
                    onClick={() => openFoodSearch(slot.id)}
                    className="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Log a dish or ingredient
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800/60">
                  {slotEntries.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-zinc-200 truncate">
                            {item.foodName || 'Food Item'}
                          </span>
                          <span className="text-xs text-zinc-500 font-tabular whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-tabular mt-0.5">
                          <span>
                            P{' '}
                            <span className="text-purple-400">
                              {item.calculatedNutrition.protein}g
                            </span>
                          </span>
                          <span>
                            C{' '}
                            <span className="text-emerald-400">
                              {item.calculatedNutrition.carbs}g
                            </span>
                          </span>
                          <span>
                            F{' '}
                            <span className="text-amber-400">{item.calculatedNutrition.fat}g</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="font-tabular font-bold text-sm text-zinc-100">
                          {Math.round(item.calculatedNutrition.calories)}{' '}
                          <span className="text-[10px] font-normal text-zinc-500">kcal</span>
                        </span>
                        {/* Always visible (not hover-only) so it can be tapped on a phone. */}
                        <button
                          type="button"
                          onClick={() => removeFoodLog(item.id)}
                          className="w-9 h-9 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                          title="Remove entry"
                          aria-label={`Remove ${item.foodName ?? 'food'}`}
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

      {/* ── Exercise ──────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
          <div>
            <h3 className="font-bold text-sm text-zinc-100">Exercise</h3>
            {dayExercise.length > 0 && (
              <p className="text-[11px] text-zinc-500 font-tabular mt-0.5">
                <span className="text-cyan-400 font-semibold">{caloriesBurned} kcal</span> burned
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={openExerciseSheet}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold transition-all min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {dayExercise.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-xs text-zinc-600">No exercise logged for this day.</p>
            <button
              type="button"
              onClick={openExerciseSheet}
              className="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
            >
              <Dumbbell className="w-3 h-3" />
              Log a workout or activity
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {dayExercise.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-zinc-200 block truncate">
                    {entry.activityName}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-tabular">
                    {entry.minutes} min
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="font-tabular font-bold text-sm text-zinc-100">
                    {entry.calories_burned}{' '}
                    <span className="text-[10px] font-normal text-zinc-500">kcal</span>
                  </span>
                  {/* Always visible (not hover-only) so it can be tapped on a phone. */}
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(entry.id)}
                    className="w-9 h-9 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                    aria-label={`Remove ${entry.activityName}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
