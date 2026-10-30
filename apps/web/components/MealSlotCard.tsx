'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { QUICK_CALORIE_FOOD_ID } from '@thali/types';
import type { LocalFoodLogEntry } from '@/lib/db/db';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface MealSlotCardProps {
  slot: { id: MealSlot; label: string };
  entries: LocalFoodLogEntry[];
  onAddFood: (slot: MealSlot) => void;
  onRemoveFood: (id: string, name?: string) => void;
  onQuickAdd: (id: string, currentQty: number, addQty: number, name?: string) => void;
}

export function MealSlotCard({
  slot,
  entries,
  onAddFood,
  onRemoveFood,
  onQuickAdd,
}: MealSlotCardProps) {
  // Aggregate slot totals
  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calculatedNutrition.calories,
      protein: acc.protein + e.calculatedNutrition.protein,
      carbs: acc.carbs + e.calculatedNutrition.carbs,
      fat: acc.fat + e.calculatedNutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Card variant="glass" className="overflow-hidden border border-border/80">
      {/* Slot Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60 bg-surface/40">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-base text-text-primary tracking-tight">
              {slot.label}
            </h3>
            {entries.length > 0 && (
              <span className="text-[11px] font-medium text-text-muted px-2 py-0.5 rounded-full bg-zinc-800/80 border border-border/50">
                {entries.length} {entries.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          {entries.length > 0 && (
            <div className="flex items-center space-x-2 text-[11px] text-text-muted mt-1 font-tabular">
              <span>P: <strong className="text-macro-protein font-semibold">{Math.round(totals.protein)}g</strong></span>
              <span>•</span>
              <span>C: <strong className="text-macro-carbs font-semibold">{Math.round(totals.carbs)}g</strong></span>
              <span>•</span>
              <span>F: <strong className="text-macro-fat font-semibold">{Math.round(totals.fat)}g</strong></span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm sm:text-base font-bold font-tabular text-macro-calories">
            {Math.round(totals.calories)}{' '}
            <span className="text-xs font-normal text-text-muted">kcal</span>
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onAddFood(slot.id)}
            leftIcon={<Plus className="w-3.5 h-3.5 text-cyan-400" />}
            className="!min-h-[36px] text-xs px-2.5 py-1"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Items List */}
      {entries.length === 0 ? (
        <div className="py-7 text-center space-y-2">
          <p className="text-xs text-text-muted">
            No items logged yet for {slot.label.toLowerCase()}.
          </p>
          <button
            type="button"
            onClick={() => onAddFood(slot.id)}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center space-x-1"
          >
            <span>+ Log a dish or ingredient</span>
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-border/40">
          {entries.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              onRemove={() => onRemoveFood(item.id, item.foodName)}
              onQuickAddGrams={(grams) => onQuickAdd(item.id, item.quantity, grams, item.foodName)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── Swipeable & Interactive Meal Item Row ────────────────────────────────────
function MealItemRow({
  item,
  onRemove,
  onQuickAddGrams,
}: {
  item: LocalFoodLogEntry;
  onRemove: () => void;
  onQuickAddGrams: (grams: number) => void;
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    // Only allow swiping left (negative offset)
    if (diff < 0) {
      setOffsetX(Math.max(-80, diff));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < -60) {
      setOffsetX(-75); // Keep delete button exposed
    } else {
      setOffsetX(0); // Snap back
    }
    setTouchStartX(null);
  };

  return (
    <li className="relative overflow-hidden group select-none">
      {/* Background Delete Action (Revealed on Swipe) */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-600/90 flex items-center justify-center text-white z-0">
        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete entry"
          className="w-full h-full flex flex-col items-center justify-center text-xs font-semibold"
        >
          <Trash2 className="w-4 h-4 mb-0.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* Foreground Content Card */}
      <div
        className="relative z-10 bg-surface/95 p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-transform duration-200"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left: Food details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm text-text-primary truncate">
              {item.foodName || 'Food Item'}
            </span>
            <span className="text-xs text-text-muted font-normal font-tabular whitespace-nowrap">
              ({item.quantity} {item.unit})
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-text-muted mt-1 font-tabular">
            <span>P: <strong className="text-macro-protein font-semibold">{item.calculatedNutrition.protein}g</strong></span>
            <span>•</span>
            <span>C: <strong className="text-macro-carbs font-semibold">{item.calculatedNutrition.carbs}g</strong></span>
            <span>•</span>
            <span>F: <strong className="text-macro-fat font-semibold">{item.calculatedNutrition.fat}g</strong></span>
          </div>
        </div>

        {/* Right: Quick +50g action, Kcal, and Delete Button */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          {/* Quick Add Pills */}
          {item.foodId !== QUICK_CALORIE_FOOD_ID && (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => onQuickAddGrams(50)}
                title="Add 50g"
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-cyan-950 text-cyan-400 text-[11px] font-semibold border border-border/80 transition-all font-tabular min-h-[36px]"
              >
                +50g
              </button>
              <button
                type="button"
                onClick={() => onQuickAddGrams(100)}
                title="Add 100g"
                className="hidden sm:inline-block px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-cyan-950 text-cyan-400 text-[11px] font-semibold border border-border/80 transition-all font-tabular min-h-[36px]"
              >
                +100g
              </button>
            </div>
          )}

          {/* Calorie Readout */}
          <span className="font-tabular font-bold text-xs sm:text-sm text-text-primary min-w-[58px] text-right">
            {Math.round(item.calculatedNutrition.calories)} <span className="text-[10px] font-normal text-text-muted">kcal</span>
          </span>

          {/* Desktop/Visible Delete Button */}
          <button
            type="button"
            onClick={onRemove}
            className="w-9 h-9 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            title="Remove food"
            aria-label={`Remove ${item.foodName || 'food'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
