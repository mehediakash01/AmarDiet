'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import type { FoodItem, MealSlot } from '@thali/types';
import { FOOD_DATASET } from '@thali/food-data';
import { useNutritionStore } from '../../lib/store/useNutritionStore';
import { db } from '../../lib/db/db';

export function FoodSearchModal() {
  const isSearchModalOpen = useNutritionStore((s) => s.isSearchModalOpen);
  const activeMealSlot = useNutritionStore((s) => s.activeMealSlot);
  const closeFoodSearch = useNutritionStore((s) => s.closeFoodSearch);
  const logFood = useNutritionStore((s) => s.logFood);
  const profile = useNutritionStore((s) => s.profile);

  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>('g');
  const [allFoods, setAllFoods] = useState<FoodItem[]>(FOOD_DATASET);
  const [isLogging, setIsLogging] = useState(false);

  // Load from Dexie if available
  useEffect(() => {
    async function loadLocalFoods() {
      try {
        const count = await db.foods.count();
        if (count > 0) {
          const items = await db.foods.toArray();
          setAllFoods(items);
        } else {
          setAllFoods(FOOD_DATASET);
        }
      } catch {
        setAllFoods(FOOD_DATASET);
      }
    }
    if (isSearchModalOpen) {
      loadLocalFoods();
      setQuery('');
      setSelectedFood(null);
      setQuantity(100);
      setUnit('g');
    }
  }, [isSearchModalOpen]);

  // Filter and rank foods
  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pref = profile?.cuisine_preference;

    if (!q) {
      if (!pref || pref === 'mixed') return allFoods.slice(0, 30);
      return [...allFoods]
        .sort((a, b) => {
          const aMatch = a.cuisineTags.includes(pref) ? 1 : 0;
          const bMatch = b.cuisineTags.includes(pref) ? 1 : 0;
          return bMatch - aMatch;
        })
        .slice(0, 30);
    }

    const scored: Array<{ food: FoodItem; score: number }> = [];

    for (const food of allFoods) {
      let score = 0;
      const canonicalLower = food.canonicalName.toLowerCase();
      const localMatches = food.localNames.some((n) => n.toLowerCase().includes(q));
      const aliasMatches = food.aliases.some((a) => a.toLowerCase().includes(q));
      const tagMatches = food.cuisineTags.some((t) => t.toLowerCase().includes(q));

      if (canonicalLower === q) score += 100;
      else if (canonicalLower.startsWith(q)) score += 75;
      else if (canonicalLower.includes(q)) score += 50;

      if (localMatches) score += 40;
      if (aliasMatches) score += 30;
      if (tagMatches) score += 15;

      if (score > 0) {
        if (pref && pref !== 'mixed' && food.cuisineTags.includes(pref)) {
          score += 5;
        }
        scored.push({ food, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.food).slice(0, 30);
  }, [query, allFoods, profile?.cuisine_preference]);

  if (!isSearchModalOpen) return null;

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    if (food.commonServings.length > 0) {
      setQuantity(food.commonServings[0].grams);
      setUnit('g');
    } else {
      setQuantity(100);
      setUnit('g');
    }
  };

  const handleAddLog = async () => {
    if (!selectedFood || quantity <= 0) return;
    setIsLogging(true);
    try {
      await logFood(selectedFood, quantity, unit, activeMealSlot);
      closeFoodSearch();
    } finally {
      setIsLogging(false);
    }
  };

  const slotTitle =
    activeMealSlot.charAt(0).toUpperCase() + activeMealSlot.slice(1);

  // Computed preview nutrition
  const factor = quantity / 100;
  const previewKcal = selectedFood
    ? Math.round(selectedFood.caloriesPer100g * factor)
    : 0;
  const previewP = selectedFood
    ? Math.round(selectedFood.proteinPer100g * factor * 10) / 10
    : 0;
  const previewC = selectedFood
    ? Math.round(selectedFood.carbsPer100g * factor * 10) / 10
    : 0;
  const previewF = selectedFood
    ? Math.round(selectedFood.fatPer100g * factor * 10) / 10
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/50 backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div>
            <h2 className="font-serif font-bold text-lg text-primary">
              Log Food to {slotTitle}
            </h2>
            <p className="text-xs text-muted">
              Unified database: Bengali, Western, and packaged foods
            </p>
          </div>
          <button
            onClick={closeFoodSearch}
            className="p-1 text-muted hover:text-dark rounded hover:bg-background transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-border bg-background/50">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, Bengali script (e.g. ভাত), tag, or brand..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-surface text-sm text-dark placeholder:text-muted/70 focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>
        </div>

        {/* Modal Body: Food List + Selection Panel */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filteredFoods.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              No food items found matching "{query}".
            </div>
          ) : (
            filteredFoods.map((food) => {
              const isSelected = selectedFood?.id === food.id;
              return (
                <div
                  key={food.id}
                  onClick={() => handleSelectFood(food)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary-light/40 border-l-4 border-primary' : 'hover:bg-background/60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm text-dark flex items-center gap-2">
                      <span>{food.canonicalName}</span>
                      {food.localNames.length > 0 && (
                        <span className="text-xs text-muted font-normal">
                          ({food.localNames[0]})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted flex items-center gap-3">
                      <span>{food.caloriesPer100g} kcal / 100g</span>
                      <span>P: {food.proteinPer100g}g</span>
                      <span>C: {food.carbsPer100g}g</span>
                      <span>F: {food.fatPer100g}g</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {food.cuisineTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-background border border-border text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                    <button
                      type="button"
                      className={`p-1.5 rounded transition ${
                        isSelected ? 'bg-primary text-surface' : 'text-primary hover:bg-primary-light'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Portion Selector Footer (shown when item selected) */}
        {selectedFood && (
          <div className="p-4 border-t border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Portion (grams)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 border border-border rounded bg-background text-sm text-dark font-medium focus:outline-none focus:border-primary"
                  />
                  <span className="text-sm text-muted">g</span>
                </div>
              </div>

              {/* Quick portion chips */}
              <div className="flex flex-wrap gap-1.5">
                {selectedFood.commonServings.map((serving) => (
                  <button
                    key={serving.label}
                    type="button"
                    onClick={() => setQuantity(serving.grams)}
                    className={`text-xs px-2.5 py-1 rounded border transition ${
                      quantity === serving.grams
                        ? 'bg-primary text-surface border-primary'
                        : 'bg-background border-border text-dark hover:bg-surface'
                    }`}
                  >
                    {serving.label} ({serving.grams}g)
                  </button>
                ))}
              </div>
            </div>

            {/* Subtotal & Add Button */}
            <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-4">
              <div className="text-right">
                <div className="text-base font-bold font-serif text-primary">
                  {previewKcal} kcal
                </div>
                <div className="text-xs text-muted">
                  P: {previewP}g | C: {previewC}g | F: {previewF}g
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddLog}
                disabled={isLogging || quantity <= 0}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-surface rounded-lg font-medium text-sm transition shadow flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isLogging ? 'Logging...' : `Log to ${slotTitle}`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
