'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Check,
  UtensilsCrossed,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Pencil,
  X,
  BadgeCheck,
} from 'lucide-react';
import type { FoodItem } from '@thali/types';
import { FOOD_DATASET } from '@thali/food-data';
import { db } from '@/lib/db/db';
import { getApiBaseUrl } from '@/lib/identity/subscriberId';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { useToast } from '@/components/ui/Toast';

export default function AdminCatalogPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = useNutritionStore((s) => s.isAdmin);
  const isSubscriberReady = useNutritionStore((s) => s.isSubscriberReady);
  const adminKey = useNutritionStore((s) => s.adminKey);
  const setAdminKey = useNutritionStore((s) => s.setAdminKey);

  const [foods, setFoods] = useState<FoodItem[]>(FOOD_DATASET);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [authKeyInput, setAuthKeyInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Add Form State
  const [canonicalName, setCanonicalName] = useState('');
  const [localName, setLocalName] = useState('');
  const [category, setCategory] = useState('protein');
  const [cuisineTags, setCuisineTags] = useState('bengali, staple');
  const [calories, setCalories] = useState('150');
  const [protein, setProtein] = useState('15');
  const [carbs, setCarbs] = useState('10');
  const [fat, setFat] = useState('5');
  const [fiber, setFiber] = useState('1');
  const [servingLabel, setServingLabel] = useState('1 standard serving');
  const [servingGrams, setServingGrams] = useState('150');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit / Correction State
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editCanonicalName, setEditCanonicalName] = useState('');
  const [editLocalName, setEditLocalName] = useState('');
  const [editCategory, setEditCategory] = useState('protein');
  const [editCuisineTags, setEditCuisineTags] = useState('');
  const [editCalories, setEditCalories] = useState('150');
  const [editProtein, setEditProtein] = useState('15');
  const [editCarbs, setEditCarbs] = useState('10');
  const [editFat, setEditFat] = useState('5');
  const [editFiber, setEditFiber] = useState('0');
  const [editServingLabel, setEditServingLabel] = useState('1 serving');
  const [editServingGrams, setEditServingGrams] = useState('100');
  const [editIsVerified, setEditIsVerified] = useState(false);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  // Route-level protection: redirect non-admin visitors
  useEffect(() => {
    if (isSubscriberReady && !isAdmin) {
      const timer = setTimeout(() => {
        router.replace('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSubscriberReady, isAdmin, router]);

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
      fiberPer100g: Number(fiber) || 0,
      commonServings: [
        {
          label: servingLabel || '1 serving',
          grams: Number(servingGrams) || 100,
        },
      ],
      source: 'Admin Catalog Entry',
      verifiedAt: new Date().toISOString().split('T')[0],
      isVerified: true,
    };

    try {
      // 1. Add to Dexie local DB for immediate local search
      await db.foods.put(newFood);
      // 2. Post to API with admin auth key
      await fetch(`${getApiBaseUrl()}/api/admin/foods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify(newFood),
      });
      toast(`Added "${newFood.canonicalName}" to catalog`, 'success');
    } catch {
      toast('Added locally (offline mode)', 'info');
    }

    setFoods((prev) => [newFood, ...prev]);
    setIsSubmitting(false);
    setIsAddModalOpen(false);

    // Reset Form
    setCanonicalName('');
    setLocalName('');
  };

  const openEditModal = (food: FoodItem) => {
    setEditingFood(food);
    setEditCanonicalName(food.canonicalName);
    setEditLocalName(food.localNames[0] || '');
    setEditCategory(food.category);
    setEditCuisineTags(food.cuisineTags.join(', '));
    setEditCalories(String(food.caloriesPer100g));
    setEditProtein(String(food.proteinPer100g));
    setEditCarbs(String(food.carbsPer100g));
    setEditFat(String(food.fatPer100g));
    setEditFiber(String(food.fiberPer100g || 0));
    const mainServing = food.commonServings[0];
    setEditServingLabel(mainServing?.label || '1 serving');
    setEditServingGrams(String(mainServing?.grams || 100));
    setEditIsVerified(Boolean(food.verifiedAt || food.isVerified));
  };

  const handleUpdateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFood) return;
    setIsEditingSubmitting(true);

    const tags = editCuisineTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const updates = {
      canonicalName: editCanonicalName,
      localNames: editLocalName ? [editLocalName] : [],
      category: editCategory,
      cuisineTags: tags.length > 0 ? tags : ['generic'],
      caloriesPer100g: Number(editCalories) || 0,
      proteinPer100g: Number(editProtein) || 0,
      carbsPer100g: Number(editCarbs) || 0,
      fatPer100g: Number(editFat) || 0,
      fiberPer100g: Number(editFiber) || 0,
      commonServings: [
        {
          label: editServingLabel || '1 serving',
          grams: Number(editServingGrams) || 100,
        },
      ],
      verifiedAt: editIsVerified ? (editingFood.verifiedAt || new Date().toISOString().split('T')[0]) : undefined,
    };

    const updatedFood: FoodItem = {
      ...editingFood,
      ...updates,
      isVerified: editIsVerified,
    };

    try {
      await db.foods.put(updatedFood);
      await fetch(`${getApiBaseUrl()}/api/admin/foods/${editingFood.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify(updates),
      });
      toast(`Updated "${updatedFood.canonicalName}" in catalog`, 'success');
    } catch {
      toast('Saved locally (offline)', 'info');
    }

    setFoods((prev) => prev.map((f) => (f.id === updatedFood.id ? updatedFood : f)));
    setIsEditingSubmitting(false);
    setEditingFood(null);
  };

  const handleQuickVerify = async (food: FoodItem) => {
    const verifiedAt = new Date().toISOString().split('T')[0];
    const updatedFood: FoodItem = {
      ...food,
      verifiedAt,
      isVerified: true,
    };
    try {
      await db.foods.put(updatedFood);
      await fetch(`${getApiBaseUrl()}/api/admin/foods/${food.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify({ verifiedAt }),
      });
      toast(`Verified "${food.canonicalName}"`, 'success');
      setFoods((prev) => prev.map((f) => (f.id === food.id ? updatedFood : f)));
    } catch {
      toast('Verified locally', 'info');
    }
  };

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedKey = process.env.NEXT_PUBLIC_ADMIN_KEY || 'amardiet-admin-secret-2026';
    if (authKeyInput.trim() === expectedKey) {
      setAdminKey(authKeyInput.trim());
      setAuthError(null);
      toast('Admin session verified', 'success');
    } else {
      setAuthError('Invalid admin secret key.');
    }
  };

  if (!isSubscriberReady) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-text-muted text-sm">
        Checking authorization...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-surface/90 border border-border text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Admin Access Required</h2>
        <p className="text-sm text-text-secondary">
          This area is restricted to authorized personnel. Non-admin visitors are automatically redirected to the dashboard.
        </p>

        <form onSubmit={handleUnlockAdmin} className="pt-2 space-y-3">
          <input
            type="password"
            placeholder="Enter admin key..."
            value={authKeyInput}
            onChange={(e) => setAuthKeyInput(e.target.value)}
            className="w-full bg-zinc-900 border border-border focus:border-cyan-400 text-text-primary text-sm rounded-xl px-4 py-2.5 outline-none"
          />
          {authError && <p className="text-xs text-red-400">{authError}</p>}
          <button
            type="submit"
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center space-x-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>Unlock Admin Panel</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Add CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Admin Portal
            </span>
            <span className="text-xs text-text-muted">Master Food Catalog</span>
          </div>
          <h1 className="font-bold text-2xl text-text-primary tracking-tight mt-1">
            Food Catalog Management
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Add new foods, correct nutritional values, and verify catalog entries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition shadow flex items-center space-x-1.5 self-start sm:self-auto min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Food</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface/90 border border-border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search catalog foods by name, local name, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-border rounded-xl bg-zinc-900 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs capitalize whitespace-nowrap transition border ${
                categoryFilter === cat
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-medium'
                  : 'bg-zinc-900 border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-surface/90 border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 border-b border-border uppercase font-semibold text-text-muted tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Food Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4 text-right">Energy</th>
                <th className="py-3 px-4 text-right">Protein</th>
                <th className="py-3 px-4 text-right">Carbs</th>
                <th className="py-3 px-4 text-right">Fat</th>
                <th className="py-3 px-4">Servings</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredFoods.slice(0, 100).map((f) => {
                const isVerified = Boolean(f.verifiedAt || f.isVerified);
                return (
                  <tr key={f.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-text-primary">{f.canonicalName}</div>
                      {f.localNames.length > 0 && (
                        <div className="text-[10px] text-text-muted">{f.localNames[0]}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 capitalize font-medium text-text-secondary">{f.category}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {f.cuisineTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-border text-text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-tabular font-bold text-macro-calories">
                      {Math.round(f.caloriesPer100g)} kcal
                    </td>
                    <td className="py-2.5 px-4 text-right font-tabular text-macro-protein font-medium">
                      {f.proteinPer100g}g
                    </td>
                    <td className="py-2.5 px-4 text-right font-tabular text-macro-carbs font-medium">
                      {f.carbsPer100g}g
                    </td>
                    <td className="py-2.5 px-4 text-right font-tabular text-macro-fat font-medium">
                      {f.fatPer100g}g
                    </td>
                    <td className="py-2.5 px-4 text-text-muted text-[11px]">
                      {f.commonServings.map((s) => `${s.label} (${s.grams}g)`).join(', ')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isVerified ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleQuickVerify(f)}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-border hover:border-emerald-500/40 hover:text-emerald-400 transition"
                          title="Click to mark verified"
                        >
                          <span>Unverified</span>
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(f)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-text-primary text-[11px] font-semibold transition border border-border"
                      >
                        <Pencil className="w-3 h-3 text-cyan-400" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Food Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="font-bold text-lg text-text-primary">
                Add New Food to Catalog
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg text-text-muted hover:text-text-primary flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFood} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Canonical Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohu Macher Kalia"
                  value={canonicalName}
                  onChange={(e) => setCanonicalName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-sm text-text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Local / Bengali Name</label>
                  <input
                    type="text"
                    placeholder="e.g. রুই মাছের কালিয়া"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-sm text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-sm text-text-primary focus:outline-none focus:border-cyan-500"
                  >
                    <option value="protein">Protein</option>
                    <option value="grain">Grain</option>
                    <option value="pulse">Pulse</option>
                    <option value="vegetable">Vegetable</option>
                    <option value="dairy">Dairy</option>
                    <option value="fruit">Fruit</option>
                    <option value="packaged">Packaged</option>
                    <option value="fat_oil">Fat &amp; Oil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Cuisine Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. bengali, fish, curry"
                  value={cuisineTags}
                  onChange={(e) => setCuisineTags(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Nutrition per 100g */}
              <div className="grid grid-cols-5 gap-2 bg-zinc-950 p-3 rounded-xl border border-border">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Calories / 100g</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular font-bold text-cyan-400 mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Fiber (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular mt-1"
                  />
                </div>
              </div>

              {/* Serving */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-text-secondary mb-1">Standard Serving Label</label>
                  <input
                    type="text"
                    value={servingLabel}
                    onChange={(e) => setServingLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Serving (g)</label>
                  <input
                    type="number"
                    value={servingGrams}
                    onChange={(e) => setServingGrams(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-xs font-tabular text-text-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-text-secondary hover:text-text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold transition shadow disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Correct Food Modal */}
      {editingFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-cyan-400" />
                <h2 className="font-bold text-lg text-text-primary">
                  Correct Nutrition &amp; Food Data
                </h2>
              </div>
              <button
                onClick={() => setEditingFood(null)}
                className="w-8 h-8 rounded-lg text-text-muted hover:text-text-primary flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateFood} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-text-secondary mb-1">Canonical Name *</label>
                <input
                  type="text"
                  required
                  value={editCanonicalName}
                  onChange={(e) => setEditCanonicalName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-sm text-text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Local / Bengali Name</label>
                  <input
                    type="text"
                    value={editLocalName}
                    onChange={(e) => setEditLocalName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-sm text-text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-sm text-text-primary focus:outline-none focus:border-cyan-500"
                  >
                    <option value="protein">Protein</option>
                    <option value="grain">Grain</option>
                    <option value="pulse">Pulse</option>
                    <option value="vegetable">Vegetable</option>
                    <option value="dairy">Dairy</option>
                    <option value="fruit">Fruit</option>
                    <option value="packaged">Packaged</option>
                    <option value="fat_oil">Fat &amp; Oil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text-secondary mb-1">Cuisine Tags</label>
                <input
                  type="text"
                  value={editCuisineTags}
                  onChange={(e) => setEditCuisineTags(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-xs text-text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Nutrition per 100g */}
              <div className="grid grid-cols-5 gap-2 bg-zinc-950 p-3 rounded-xl border border-border">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Calories / 100g</label>
                  <input
                    type="number"
                    value={editCalories}
                    onChange={(e) => setEditCalories(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular font-bold text-cyan-400 mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editProtein}
                    onChange={(e) => setEditProtein(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editCarbs}
                    onChange={(e) => setEditCarbs(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editFat}
                    onChange={(e) => setEditFat(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Fiber (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editFiber}
                    onChange={(e) => setEditFiber(e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-zinc-900 text-xs font-tabular mt-1"
                  />
                </div>
              </div>

              {/* Serving */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-text-secondary mb-1">Standard Serving Label</label>
                  <input
                    type="text"
                    value={editServingLabel}
                    onChange={(e) => setEditServingLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-xs text-text-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-secondary mb-1">Serving (g)</label>
                  <input
                    type="number"
                    value={editServingGrams}
                    onChange={(e) => setEditServingGrams(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-zinc-800 text-xs font-tabular text-text-primary"
                  />
                </div>
              </div>

              {/* Verification Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsVerified"
                  checked={editIsVerified}
                  onChange={(e) => setEditIsVerified(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-cyan-500 focus:ring-0 bg-zinc-800"
                />
                <label htmlFor="editIsVerified" className="text-xs font-medium text-text-primary cursor-pointer flex items-center space-x-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark as Verified Catalog Entry</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingFood(null)}
                  className="px-4 py-2 border border-border rounded-xl text-text-secondary hover:text-text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold transition shadow disabled:opacity-50"
                >
                  {isEditingSubmitting ? 'Saving...' : 'Save Corrections'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
