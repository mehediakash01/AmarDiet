'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Check, UtensilsCrossed, ShieldAlert } from 'lucide-react';
import type { FoodItem } from '@thali/types';
import { FOOD_DATASET } from '@thali/food-data';
import { db } from '@/lib/db/db';
import { getApiBaseUrl } from '@/lib/identity/subscriberId';

export default function AdminCatalogPage() {
  const [foods, setFoods] = useState<FoodItem[]>(FOOD_DATASET);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [canonicalName, setCanonicalName] = useState('');
  const [localName, setLocalName] = useState('');
  const [category, setCategory] = useState('protein');
  const [cuisineTags, setCuisineTags] = useState('bengali, staple');
  const [calories, setCalories] = useState('150');
  const [protein, setProtein] = useState('15');
  const [carbs, setCarbs] = useState('10');
  const [fat, setFat] = useState('5');
  const [servingLabel, setServingLabel] = useState('1 standard serving');
  const [servingGrams, setServingGrams] = useState('150');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadAllFoods() {
      try {
        const count = await db.foods.count();
        if (count > 0) {
          const items = await db.foods.toArray();
          setFoods(items);
        }
      } catch {
        setFoods(FOOD_DATASET);
      }
    }
    loadAllFoods();
  }, []);

  const filteredFoods = useMemo(() => {
    return foods.filter((f) => {
      const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        f.canonicalName.toLowerCase().includes(q) ||
        f.localNames.some((n) => n.toLowerCase().includes(q)) ||
        f.cuisineTags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [foods, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set(foods.map((f) => f.category));
    return ['all', ...Array.from(set)];
  }, [foods]);

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canonicalName) return;

    setIsSubmitting(true);
    const tags = cuisineTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const newFood: FoodItem = {
      id: `food_custom_${Date.now()}`,
      canonicalName,
      localNames: localName ? [localName] : [],
      aliases: [],
      cuisineTags: tags.length > 0 ? tags : ['generic'],
      category,
      caloriesPer100g: Number(calories) || 0,
      proteinPer100g: Number(protein) || 0,
      carbsPer100g: Number(carbs) || 0,
      fatPer100g: Number(fat) || 0,
      fiberPer100g: 0,
      commonServings: [
        {
          label: servingLabel || '1 serving',
          grams: Number(servingGrams) || 100,
        },
      ],
      source: 'Admin Catalog Entry',
      verifiedAt: new Date().toISOString().split('T')[0],
    };

    try {
      // 1. Add to Dexie local DB for immediate local search
      await db.foods.put(newFood);
      // 2. Post to API
      await fetch(`${getApiBaseUrl()}/api/admin/foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFood),
      });
    } catch {
      // offline fallback
    }

    setFoods((prev) => [newFood, ...prev]);
    setIsSubmitting(false);
    setIsAddModalOpen(false);

    // Reset Form
    setCanonicalName('');
    setLocalName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-primary flex items-center space-x-2">
            <UtensilsCrossed className="w-6 h-6 text-accent" />
            <span>Food Catalog Management</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Universal food database. Total items: <strong className="text-dark font-mono">{foods.length}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-surface rounded-lg text-xs font-medium transition shadow flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Food</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search catalog foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-border rounded bg-background text-xs text-dark focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded text-xs capitalize whitespace-nowrap transition border ${
                categoryFilter === cat
                  ? 'bg-primary text-surface border-primary'
                  : 'bg-background border-border text-dark hover:bg-surface'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background/80 border-b border-border uppercase font-semibold text-muted tracking-wider">
              <tr>
                <th className="py-3 px-4">Food Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4 text-right">Energy</th>
                <th className="py-3 px-4 text-right">Protein</th>
                <th className="py-3 px-4 text-right">Carbs</th>
                <th className="py-3 px-4 text-right">Fat</th>
                <th className="py-3 px-4">Servings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredFoods.map((f) => (
                <tr key={f.id} className="hover:bg-background/30 transition">
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-dark">{f.canonicalName}</div>
                    {f.localNames.length > 0 && (
                      <div className="text-[10px] text-muted">{f.localNames[0]}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 capitalize font-medium text-dark">{f.category}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {f.cuisineTags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-background border border-border text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-primary">
                    {f.caloriesPer100g} kcal
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-dark">{f.proteinPer100g}g</td>
                  <td className="py-2.5 px-4 text-right font-mono text-accent">{f.carbsPer100g}g</td>
                  <td className="py-2.5 px-4 text-right font-mono text-secondary">{f.fatPer100g}g</td>
                  <td className="py-2.5 px-4 text-muted text-[11px]">
                    {f.commonServings.map((s) => `${s.label} (${s.grams}g)`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Food Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/50 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h2 className="font-serif font-bold text-xl text-primary">
              Add New Food to Catalog
            </h2>

            <form onSubmit={handleAddFood} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-dark mb-1">Canonical Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohu Macher Kalia"
                  value={canonicalName}
                  onChange={(e) => setCanonicalName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border rounded bg-background text-sm text-dark focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-dark mb-1">Local / Bengali Name</label>
                  <input
                    type="text"
                    placeholder="e.g. রুই মাছের কালিয়া"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded bg-background text-sm text-dark focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-dark mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded bg-background text-sm text-dark focus:outline-none focus:border-primary"
                  >
                    <option value="protein">Protein</option>
                    <option value="grain">Grain</option>
                    <option value="pulse">Pulse</option>
                    <option value="vegetable">Vegetable</option>
                    <option value="dairy">Dairy</option>
                    <option value="fruit">Fruit</option>
                    <option value="packaged">Packaged</option>
                    <option value="fat_oil">Fat & Oil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-dark mb-1">Cuisine Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. bengali, fish, curry"
                  value={cuisineTags}
                  onChange={(e) => setCuisineTags(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border rounded bg-background text-xs text-dark focus:outline-none focus:border-primary"
                />
              </div>

              {/* Nutrition per 100g */}
              <div className="grid grid-cols-4 gap-2 bg-background p-3 rounded-lg border border-border">
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase">Calories / 100g</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full px-2 py-1 border border-border rounded bg-surface text-xs font-mono font-bold text-primary mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full px-2 py-1 border border-border rounded bg-surface text-xs font-mono mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full px-2 py-1 border border-border rounded bg-surface text-xs font-mono mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full px-2 py-1 border border-border rounded bg-surface text-xs font-mono mt-1"
                    required
                  />
                </div>
              </div>

              {/* Serving */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-dark mb-1">Standard Serving Label</label>
                  <input
                    type="text"
                    value={servingLabel}
                    onChange={(e) => setServingLabel(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded bg-background text-xs text-dark"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-dark mb-1">Serving (g)</label>
                  <input
                    type="number"
                    value={servingGrams}
                    onChange={(e) => setServingGrams(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded bg-background text-xs font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 border border-border rounded text-dark hover:bg-background transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-1.5 bg-primary hover:bg-primary-hover text-surface rounded font-medium transition shadow"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
