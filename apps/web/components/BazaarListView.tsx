'use client';

import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  Fish,
  Carrot,
  Wheat,
  Milk,
  Package,
  Loader2,
} from 'lucide-react';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import type { GroceryItem, GroceryMarketCategoryGroup } from '@thali/types';

const CATEGORY_META: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badgeBg: string;
    borderAccent: string;
  }
> = {
  protein: {
    icon: Fish,
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    borderAccent: 'border-rose-500/30',
  },
  produce: {
    icon: Carrot,
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    borderAccent: 'border-emerald-500/30',
  },
  grains_pulses: {
    icon: Wheat,
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    borderAccent: 'border-amber-500/30',
  },
  dairy_fats: {
    icon: Milk,
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    borderAccent: 'border-cyan-500/30',
  },
  pantry: {
    icon: Package,
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    borderAccent: 'border-purple-500/30',
  },
};

export function BazaarListView() {
  const groceryList = useNutritionStore((s) => s.groceryList);
  const isGroceryLoading = useNutritionStore((s) => s.isGroceryLoading);
  const groceryError = useNutritionStore((s) => s.groceryError);
  const loadGroceryList = useNutritionStore((s) => s.loadGroceryList);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Load list on mount
  useEffect(() => {
    loadGroceryList();
  }, [loadGroceryList]);

  // Restore checked items from localStorage
  useEffect(() => {
    if (groceryList?.planId) {
      try {
        const saved = localStorage.getItem(`bazaar_checked_${groceryList.planId}`);
        if (saved) {
          setCheckedItems(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }
  }, [groceryList?.planId]);

  const toggleItem = (foodId: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [foodId]: !prev[foodId] };
      if (groceryList?.planId) {
        localStorage.setItem(`bazaar_checked_${groceryList.planId}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const resetAll = () => {
    if (groceryList?.planId) {
      localStorage.removeItem(`bazaar_checked_${groceryList.planId}`);
    }
    setCheckedItems({});
  };

  const allItems: GroceryItem[] = groceryList?.categories.flatMap((c) => c.items) || [];
  const totalCount = allItems.length;
  const boughtCount = allItems.filter((i) => checkedItems[i.foodId]).length;
  const progressPercent = totalCount > 0 ? Math.round((boughtCount / totalCount) * 100) : 0;

  const copyToClipboard = async () => {
    if (!groceryList) return;

    let text = `🛒 AmarDiet — Weekly Bazaar List (${groceryList.categories.length} sections)\n`;
    text += `===================================\n\n`;

    for (const cat of groceryList.categories) {
      text += `📂 ${cat.titleBn} (${cat.title})\n`;
      text += `-----------------------------------\n`;
      for (const item of cat.items) {
        const isBought = checkedItems[item.foodId] ? '[✓]' : '[ ]';
        const bnName = item.localNames?.[0] ? ` (${item.localNames[0]})` : '';
        text += `${isBought} ${item.canonicalName}${bnName}: ${item.displayQuantity}\n`;
      }
      text += `\n`;
    }

    text += `Generated for weekly nutrition target adherence.\n`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  if (isGroceryLoading && !groceryList) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Aggregating weekly 7-day bazaar requirements...</p>
      </div>
    );
  }

  if (groceryError && !groceryList) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center max-w-md mx-auto">
        <ShoppingCart className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
        <h3 className="text-zinc-200 font-medium mb-1">No Active Grocery List</h3>
        <p className="text-zinc-400 text-sm mb-4">{groceryError}</p>
        <button
          onClick={() => loadGroceryList()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!groceryList || groceryList.categories.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center max-w-md mx-auto">
        <ShoppingCart className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-zinc-200 font-medium mb-1">No Plan Items Found</h3>
        <p className="text-zinc-400 text-sm mb-4">
          Generate or customize your 7-day diet plan to see aggregated bazaar requirements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar with Stats & Action Buttons */}
      <div className="bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                সাপ্তাহিক বাজারের ফর্দ
              </span>
              <span className="text-xs text-zinc-500">• 7-Day Aggregation</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mt-1">
              Weekly Bazaar & Grocery List
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Exact market quantities needed to cook your entire week&apos;s diet plan.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-all active:scale-95"
              title="Copy entire list formatted for WhatsApp / SMS"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy List</span>
                </>
              )}
            </button>

            {boughtCount > 0 && (
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 text-xs font-medium border border-zinc-800 transition-all"
                title="Reset checked items"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 pt-4 border-t border-zinc-800/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400">
              Shopping Progress:{' '}
              <strong className="text-zinc-200">
                {boughtCount} of {totalCount} items bought
              </strong>
            </span>
            <span className="font-semibold text-emerald-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Market Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {groceryList.categories.map((group) => {
          const meta = CATEGORY_META[group.id] || {
            icon: Package,
            accentColor: 'text-zinc-400',
            badgeBg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
            borderAccent: 'border-zinc-800',
          };
          const Icon = meta.icon;

          return (
            <div
              key={group.id}
              className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-4 flex flex-col backdrop-blur-sm"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-800/80 border ${meta.borderAccent}`}
                  >
                    <Icon className={`w-4 h-4 ${meta.accentColor}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{group.title}</h3>
                    <p className="text-xs text-zinc-400">{group.titleBn}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.badgeBg}`}>
                  {group.items.length} items
                </span>
              </div>

              {/* Items List */}
              <ul className="space-y-2 flex-1">
                {group.items.map((item) => {
                  const isChecked = Boolean(checkedItems[item.foodId]);
                  const bnName = item.localNames?.[0];

                  return (
                    <li
                      key={item.foodId}
                      onClick={() => toggleItem(item.foodId)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-zinc-950/40 border-zinc-800/40 text-zinc-500 opacity-60'
                          : 'bg-zinc-800/30 hover:bg-zinc-800/60 border-zinc-800/70 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-black'
                              : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Food Name & Local Translation */}
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'
                            }`}
                          >
                            {item.canonicalName}
                          </p>
                          {bnName && (
                            <p className="text-xs text-zinc-400 truncate">{bnName}</p>
                          )}
                        </div>
                      </div>

                      {/* Local Market Quantity Pill */}
                      <div className="ml-2 flex-shrink-0 text-right">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                            isChecked
                              ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800'
                              : 'bg-zinc-800/90 text-emerald-300 border-zinc-700/80'
                          }`}
                        >
                          {item.displayQuantity}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Helpful Bazaar Tips Footer */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-400 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>
          <strong>Pro-Tip:</strong> Checked items are saved on this device. Use the{' '}
          <strong>Copy List</strong> button to send the list directly to family or your local bazaar runner.
        </span>
      </div>
    </div>
  );
}
