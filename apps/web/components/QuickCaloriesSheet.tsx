'use client';

import React, { useState } from 'react';
import { Flame } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { useToast } from '@/components/ui/Toast';
import { MAX_QUICK_CALORIES, QUICK_CALORIE_VALUES, validateCaloriesInput } from '@/lib/calories';
import { localDateString } from '@/lib/date';

const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export function QuickCaloriesSheet() {
  const isOpen = useNutritionStore((s) => s.isQuickCaloriesSheetOpen);
  const close = useNutritionStore((s) => s.closeQuickCalories);

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={close}
      title="Quick add calories"
      description="Log calories without picking a food."
      maxWidth="sm"
    >
      <QuickCaloriesContent onDone={close} />
    </ModalSheet>
  );
}

function QuickCaloriesContent({ onDone }: { onDone: () => void }) {
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const defaultSlot = useNutritionStore((s) => s.quickCaloriesSlot);
  const logQuickCalories = useNutritionStore((s) => s.logQuickCalories);
  const { toast } = useToast();

  const [calories, setCalories] = useState('');
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dayLabel =
    selectedDate === localDateString()
      ? 'today'
      : new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
  const mealLabel = MEAL_SLOTS.find((meal) => meal.value === slot)?.label ?? 'meal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const inputError = validateCaloriesInput(calories);
    if (inputError) {
      setError(inputError);
      return;
    }

    const kcal = Math.round(Number(calories) * 10) / 10;
    setError(null);
    setSaving(true);
    await logQuickCalories(kcal, slot);
    setSaving(false);
    toast(`Logged ${kcal} kcal for ${mealLabel.toLowerCase()} (${dayLabel})`, 'success');
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="quick-calories" className="text-xs font-semibold text-text-secondary block">
          Calories (kcal)
        </label>
        <input
          id="quick-calories"
          type="number"
          inputMode="numeric"
          step="1"
          min={1}
          max={MAX_QUICK_CALORIES}
          placeholder="e.g. 250"
          value={calories}
          onChange={(e) => {
            setCalories(e.target.value);
            if (error) setError(null);
          }}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'quick-calories-error' : undefined}
          className="w-full px-3 py-2.5 border border-zinc-700 rounded-xl bg-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500 text-center text-xl font-tabular font-bold"
        />
      </div>

      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick calorie amounts">
        {QUICK_CALORIE_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={calories === String(value)}
            onClick={() => {
              setCalories(String(value));
              setError(null);
            }}
            className={`min-h-[40px] rounded-xl border text-xs font-medium transition-colors ${
              calories === String(value)
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-semibold'
                : 'bg-zinc-950 border-border text-text-secondary hover:text-text-primary hover:border-zinc-700'
            }`}
          >
            {value} kcal
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-text-secondary">Meal</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Meal">
          {MEAL_SLOTS.map((meal) => (
            <button
              key={meal.value}
              type="button"
              aria-pressed={meal.value === slot}
              onClick={() => setSlot(meal.value)}
              className={`min-h-[40px] rounded-xl border text-xs font-medium transition-colors ${
                meal.value === slot
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-semibold'
                  : 'bg-zinc-950 border-border text-text-secondary hover:text-text-primary hover:border-zinc-700'
              }`}
            >
              {meal.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p id="quick-calories-error" role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || calories.trim() === ''}
        className="w-full min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Flame className="w-4 h-4" />
        <span>{saving ? 'Saving…' : `Add to ${mealLabel}`}</span>
      </button>
    </form>
  );
}
