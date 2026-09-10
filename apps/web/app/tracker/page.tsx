'use client';

import React, { useEffect, useMemo } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { useNutritionStore } from '../../lib/store/useNutritionStore';

export default function TrackerPage() {
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate);
  const dailyLogs = useNutritionStore((s) => s.dailyLogs);
  const nutrition = useNutritionStore((s) => s.nutrition);
  const openFoodSearch = useNutritionStore((s) => s.openFoodSearch);
  const removeFoodLog = useNutritionStore((s) => s.removeFoodLog);
  const loadLogsForDate = useNutritionStore((s) => s.loadLogsForDate);

  useEffect(() => {
    loadLogsForDate(selectedDate);
  }, [selectedDate, loadLogsForDate]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
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

  const targetKcal = nutrition?.calorieTarget || 2000;
  const targetP = nutrition?.macros.protein_g || 140;
  const targetC = nutrition?.macros.carbs_g || 200;
  const targetF = nutrition?.macros.fat_g || 55;

  return (
    <div className="space-y-6">
      {/* Date Navigation Strip */}
      <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeDate(-1)}
          className="p-1.5 rounded border border-border hover:bg-background text-dark transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-muted" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent font-serif font-bold text-base text-primary focus:outline-none cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => changeDate(1)}
          className="p-1.5 rounded border border-border hover:bg-background text-dark transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Daily Macro Summary Banner */}
      <div className="bg-surface border border-border rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="border-r border-border/50 last:border-0">
          <div className="text-xs uppercase font-bold text-muted">Calories</div>
          <div className="text-xl font-serif font-bold text-primary mt-1">
            {Math.round(consumedTotals.calories)} / {Math.round(targetKcal)}
          </div>
          <div className="text-[11px] text-muted">
            {Math.max(0, Math.round(targetKcal - consumedTotals.calories))} kcal left
          </div>
        </div>

        <div className="border-r border-border/50 last:border-0">
          <div className="text-xs uppercase font-bold text-muted">Protein</div>
          <div className="text-xl font-serif font-bold text-primary mt-1">
            {Math.round(consumedTotals.protein)} / {Math.round(targetP)}g
          </div>
          <div className="text-[11px] text-muted">
            {Math.round(consumedTotals.protein * 4)} kcal
          </div>
        </div>

        <div className="border-r border-border/50 last:border-0">
          <div className="text-xs uppercase font-bold text-muted">Carbs</div>
          <div className="text-xl font-serif font-bold text-accent mt-1">
            {Math.round(consumedTotals.carbs)} / {Math.round(targetC)}g
          </div>
          <div className="text-[11px] text-muted">
            {Math.round(consumedTotals.carbs * 4)} kcal
          </div>
        </div>

        <div>
          <div className="text-xs uppercase font-bold text-muted">Fat</div>
          <div className="text-xl font-serif font-bold text-secondary mt-1">
            {Math.round(consumedTotals.fat)} / {Math.round(targetF)}g
          </div>
          <div className="text-[11px] text-muted">
            {Math.round(consumedTotals.fat * 9)} kcal
          </div>
        </div>
      </div>

      {/* 4 Stacked Meal Slots */}
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
              className="bg-surface border border-border rounded-lg overflow-hidden"
            >
              {/* Slot Header */}
              <div className="bg-background/40 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="font-serif font-bold text-base text-dark capitalize">
                    {slot.label}
                  </h3>
                  <span className="text-xs text-muted">
                    {Math.round(subtotal.calories)} kcal (P: {Math.round(subtotal.protein)}g, C: {Math.round(subtotal.carbs)}g, F: {Math.round(subtotal.fat)}g)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => openFoodSearch(slot.id)}
                  className="px-3 py-1 bg-primary text-surface hover:bg-primary-hover rounded text-xs font-medium flex items-center space-x-1 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add food</span>
                </button>
              </div>

              {/* Slot Items Table */}
              {slotEntries.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted">
                  No foods logged for {slot.label.toLowerCase()}.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {slotEntries.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center justify-between text-sm hover:bg-background/20 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-dark flex items-center space-x-2">
                          <span>{item.foodName || 'Food Item'}</span>
                          <span className="text-xs text-muted font-normal">
                            • {item.quantity} {item.unit}
                          </span>
                        </div>
                        <div className="text-xs text-muted flex items-center space-x-3">
                          <span>Protein: {item.calculatedNutrition.protein}g</span>
                          <span>Carbs: {item.calculatedNutrition.carbs}g</span>
                          <span>Fat: {item.calculatedNutrition.fat}g</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="font-serif font-bold text-sm text-primary">
                          {Math.round(item.calculatedNutrition.calories)} kcal
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFoodLog(item.id)}
                          className="text-muted hover:text-warning p-1 rounded transition"
                          title="Delete entry"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
