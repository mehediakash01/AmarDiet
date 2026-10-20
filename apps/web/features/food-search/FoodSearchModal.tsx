'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Search,
  X,
  Plus,
  Check,
  Clock,
  ShieldCheck,
  Utensils,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { FoodItem, MealSlot } from '@thali/types';
import { FOOD_DATASET } from '@thali/food-data';
import { useNutritionStore } from '../../lib/store/useNutritionStore';
import { db } from '../../lib/db/db';
import { getApiBaseUrl } from '../../lib/identity/subscriberId';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'recent' | 'results';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Phonetic Bengali-to-ASCII map for partial matching */
const PHONETIC_MAP: Record<string, string[]> = {
  bhaat: ['ভাত', 'bhat', 'bhaath'],
  dal: ['ডাল', 'daal', 'dhal'],
  macher: ['মাছ', 'fish', 'maach'],
  murgi: ['মুরগি', 'chicken', 'murgi'],
  roti: ['রুটি', 'chapati', 'chapathi'],
  alu: ['আলু', 'potato', 'aloo'],
  begun: ['বেগুন', 'eggplant', 'brinjal'],
};

function matchesPhonetic(q: string, food: FoodItem): boolean {
  const lower = q.toLowerCase();
  for (const [phonetic, variants] of Object.entries(PHONETIC_MAP)) {
    if (phonetic.startsWith(lower) || lower.startsWith(phonetic)) {
      return variants.some((v) =>
        food.localNames.some((ln) => ln.toLowerCase().includes(v.toLowerCase())),
      );
    }
  }
  return false;
}

function scoreFood(food: FoodItem, q: string, cuisinePref?: string): number {
  const lower = q.toLowerCase();
  const canonical = food.canonicalName.toLowerCase();
  let score = 0;

  if (canonical === lower) score += 100;
  else if (canonical.startsWith(lower)) score += 75;
  else if (canonical.includes(lower)) score += 50;

  if (food.localNames.some((n) => n.toLowerCase().includes(lower))) score += 40;
  if (food.aliases.some((a) => a.toLowerCase().includes(lower))) score += 30;
  if (food.cuisineTags.some((t) => t.toLowerCase().includes(lower))) score += 15;
  if (matchesPhonetic(lower, food)) score += 35;

  // Cuisine preference ranking bonus (never filters)
  if (cuisinePref && cuisinePref !== 'mixed' && food.cuisineTags.includes(cuisinePref)) {
    score += 5;
  }

  return score;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function FoodSearchModal() {
  const isOpen = useNutritionStore((s) => s.isSearchModalOpen);
  const activeMealSlot = useNutritionStore((s) => s.activeMealSlot);
  const activePlanDay = useNutritionStore((s) => s.activePlanDay);
  const searchContext = useNutritionStore((s) => s.searchContext);
  const closeFoodSearch = useNutritionStore((s) => s.closeFoodSearch);
  const logFood = useNutritionStore((s) => s.logFood);
  const addPlanItem = useNutritionStore((s) => s.addPlanItem);
  const profile = useNutritionStore((s) => s.profile);

  // ── local state ──────────────────────────────────────────────────────────
  const [rawQuery, setRawQuery] = useState('');
  const query = useDebounce(rawQuery, 280);

  const [allFoods, setAllFoods] = useState<FoodItem[]>(FOOD_DATASET);
  const [recentFoodIds, setRecentFoodIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('recent');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>('g');
  const [isLogging, setIsLogging] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ── Load foods & recents from Dexie / API on open ────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setRawQuery('');
    setSelectedFood(null);
    setQuantity(100);
    setUnit('g');
    setFocusedIdx(-1);
    setTab('recent');

    async function load() {
      setIsLoadingFoods(true);
      try {
        // Try fetching freshest catalog from backend (includes USDA + OFF items)
        try {
          const res = await fetch(`${getApiBaseUrl()}/api/foods/search`);
          if (res.ok) {
            const data = await res.json();
            if (data.foods && Array.isArray(data.foods) && data.foods.length > 0) {
              setAllFoods(data.foods);
              await db.foods.bulkPut(data.foods);
            }
          }
        } catch {
          // Offline fallback: load from Dexie cache
          const count = await db.foods.count();
          const foods = count > 0 ? await db.foods.toArray() : FOOD_DATASET;
          setAllFoods(foods);
        }

        // Recent food IDs from past logs (last 30 distinct foods)
        const logs = await db.foodLogs.orderBy('createdAt').reverse().limit(200).toArray();
        const seen = new Set<string>();
        const ordered: string[] = [];
        for (const l of logs) {
          if (!seen.has(l.foodId)) {
            seen.add(l.foodId);
            ordered.push(l.foodId);
            if (ordered.length >= 20) break;
          }
        }
        setRecentFoodIds(ordered);
      } catch {
        setAllFoods(FOOD_DATASET);
      } finally {
        setIsLoadingFoods(false);
      }
    }

    load();
    // Auto-focus input after transition
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  // ── Switch to results tab when user types ─────────────────────────────────
  useEffect(() => {
    if (query.trim()) setTab('results');
    else setTab('recent');
    setFocusedIdx(-1);
  }, [query]);

  // ── Computed lists ────────────────────────────────────────────────────────
  const recentFoods = useMemo(() => {
    const map = new Map(allFoods.map((f) => [f.id, f]));
    return recentFoodIds.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  }, [allFoods, recentFoodIds]);

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const scored = allFoods
      .map((food) => ({ food, score: scoreFood(food, q, profile?.cuisine_preference) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((s) => s.food);

    return scored;
  }, [query, allFoods, profile?.cuisine_preference]);

  const activeList: FoodItem[] = tab === 'recent' ? recentFoods : searchResults;

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeList.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((prev) => Math.min(prev + 1, activeList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusedIdx >= 0) {
        e.preventDefault();
        handleSelectFood(activeList[focusedIdx]);
      } else if (e.key === 'Escape') {
        closeFoodSearch();
      }
    },
    [activeList, focusedIdx, closeFoodSearch],
  );

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[focusedIdx] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx]);

  // ── Handlers ──────────────────────────────────────────────────────────────
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
      if (searchContext === 'plan') {
        await addPlanItem(selectedFood, quantity, unit);
      } else {
        await logFood(selectedFood, quantity, unit, activeMealSlot);
      }
      closeFoodSearch();
    } finally {
      setIsLogging(false);
    }
  };

  // ── Preview nutrition ─────────────────────────────────────────────────────
  const factor = quantity / 100;
  const previewKcal = selectedFood ? Math.round(selectedFood.caloriesPer100g * factor) : 0;
  const previewP = selectedFood
    ? Math.round(selectedFood.proteinPer100g * factor * 10) / 10
    : 0;
  const previewC = selectedFood
    ? Math.round(selectedFood.carbsPer100g * factor * 10) / 10
    : 0;
  const previewF = selectedFood
    ? Math.round(selectedFood.fatPer100g * factor * 10) / 10
    : 0;

  const slotTitle = activeMealSlot.charAt(0).toUpperCase() + activeMealSlot.slice(1);

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && closeFoodSearch()}
    >
      {/* Modal Panel */}
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={
          searchContext === 'plan'
            ? `Add food to ${slotTitle} plan (${activePlanDay})`
            : `Log food to ${slotTitle}`
        }
        onKeyDown={handleKeyDown}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/95 flex-shrink-0">
          <div>
            <h2 className="font-bold text-base text-zinc-100 tracking-tight">
              {searchContext === 'plan' ? 'Add to ' : 'Log to '}
              <span className="text-cyan-400">{slotTitle}</span>
              {searchContext === 'plan' && activePlanDay && (
                <span className="text-zinc-400 text-sm font-normal"> · {activePlanDay}</span>
              )}
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {searchContext === 'plan'
                ? 'Swap or add any item from universal catalog — nutrition recalculates live'
                : 'Bengali, Western, and packaged foods — one search'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeFoodSearch}
            className="w-9 h-9 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Search Bar ─────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800 flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {isLoadingFoods && (
              <Loader2 className="w-4 h-4 text-cyan-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
            )}
            <input
              ref={inputRef}
              type="search"
              placeholder="Search by name, ভাত, dal, phonetic spelling…"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium"
              aria-label="Search foods"
              aria-autocomplete="list"
              aria-activedescendant={focusedIdx >= 0 ? `food-item-${focusedIdx}` : undefined}
            />
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="flex items-center space-x-1 mt-3" role="tablist">
            <TabBtn
              active={tab === 'recent'}
              onClick={() => {
                setTab('recent');
                setRawQuery('');
              }}
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Recent"
            />
            <TabBtn
              active={tab === 'results'}
              onClick={() => setTab('results')}
              icon={<Search className="w-3.5 h-3.5" />}
              label={searchResults.length > 0 ? `Results (${searchResults.length})` : 'Results'}
            />
          </div>
        </div>

        {/* ── Food List ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain" role="tabpanel">
          {activeList.length === 0 && !isLoadingFoods ? (
            <EmptyState query={query} tab={tab} />
          ) : (
            <ul ref={listRef} className="divide-y divide-zinc-800/70" role="listbox">
              {activeList.map((food, idx) => {
                const isSelected = selectedFood?.id === food.id;
                const isFocused = focusedIdx === idx;
                return (
                  <FoodRow
                    key={food.id}
                    id={`food-item-${idx}`}
                    food={food}
                    isSelected={isSelected}
                    isFocused={isFocused}
                    onClick={() => {
                      handleSelectFood(food);
                      setFocusedIdx(idx);
                    }}
                    onMouseEnter={() => setFocusedIdx(idx)}
                  />
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Portion Selector (shown when a food is selected) ───────────── */}
        {selectedFood && (
          <div className="border-t border-zinc-800 bg-zinc-900/95 p-4 flex-shrink-0 space-y-4">
            {/* Selected food summary */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-100">{selectedFood.canonicalName}</div>
                {selectedFood.localNames[0] && (
                  <div className="text-xs text-zinc-500">{selectedFood.localNames[0]}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-extrabold font-tabular text-cyan-400">
                  {previewKcal} <span className="text-xs font-normal text-zinc-500">kcal</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-tabular">
                  P{' '}
                  <span className="text-purple-400 font-semibold">{previewP}g</span>
                  {' · '}C{' '}
                  <span className="text-emerald-400 font-semibold">{previewC}g</span>
                  {' · '}F{' '}
                  <span className="text-amber-400 font-semibold">{previewF}g</span>
                </div>
              </div>
            </div>

            {/* Portion input + serving chips */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <label htmlFor="portion-input" className="sr-only">
                  Portion in grams
                </label>
                <input
                  id="portion-input"
                  type="number"
                  min="1"
                  max="3000"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  className="w-20 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 font-medium focus:outline-none focus:border-cyan-500 transition text-center font-tabular"
                />
                <span className="text-sm text-zinc-500">g</span>
              </div>

              {/* Common serving chips */}
              {selectedFood.commonServings.map((serving) => (
                <button
                  key={serving.label}
                  type="button"
                  onClick={() => setQuantity(serving.grams)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all font-medium ${
                    quantity === serving.grams
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {serving.label}
                  <span className="text-zinc-500 ml-1 font-tabular">({serving.grams}g)</span>
                </button>
              ))}
            </div>

            {/* Log / Add to plan button */}
            <button
              type="button"
              onClick={handleAddLog}
              disabled={isLogging || quantity <= 0}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-zinc-950 font-bold text-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 min-h-[44px]"
            >
              {isLogging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{searchContext === 'plan' ? 'Adding to plan…' : 'Logging…'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>
                    {searchContext === 'plan'
                      ? `Add ${quantity}g to ${slotTitle} Plan`
                      : `Log ${quantity}g to ${slotTitle}`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────
function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─── Food Row ─────────────────────────────────────────────────────────────────
function FoodRow({
  id,
  food,
  isSelected,
  isFocused,
  onClick,
  onMouseEnter,
}: {
  id: string;
  food: FoodItem;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  // Categorise tag for badge color
  const primaryTag = food.cuisineTags[0];
  const tagColor =
    primaryTag === 'bengali'
      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      : primaryTag === 'western'
        ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        : 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';

  return (
    <li
      id={id}
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
          : isFocused
            ? 'bg-zinc-800/70'
            : 'hover:bg-zinc-800/50'
      }`}
    >
      {/* Left: Name + macros */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-zinc-100 truncate">
            {food.canonicalName}
          </span>
          {food.localNames[0] && (
            <span className="text-xs text-zinc-500 font-normal">{food.localNames[0]}</span>
          )}
          {primaryTag && (
            <span
              className={`text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded border ${tagColor}`}
            >
              {primaryTag}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5 font-tabular">
          <span className="text-zinc-400 font-semibold">{food.caloriesPer100g} kcal/100g</span>
          <span>
            P <span className="text-purple-400 font-semibold">{food.proteinPer100g}g</span>
          </span>
          <span>
            C <span className="text-emerald-400 font-semibold">{food.carbsPer100g}g</span>
          </span>
          <span>
            F <span className="text-amber-400 font-semibold">{food.fatPer100g}g</span>
          </span>
        </div>
      </div>

      {/* Right: Select indicator */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected
            ? 'bg-cyan-400 text-zinc-950'
            : 'bg-zinc-800 text-zinc-500 group-hover:text-cyan-400'
        }`}
      >
        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      </div>
    </li>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ query, tab }: { query: string; tab: Tab }) {
  if (tab === 'recent') {
    return (
      <div className="py-14 text-center space-y-3 px-8">
        <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
        <p className="text-sm font-semibold text-zinc-400">No recent foods yet</p>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Foods you log will appear here for quick re-selection.
          <br />
          Use the search bar above to find any food.
        </p>
      </div>
    );
  }

  return (
    <div className="py-14 text-center space-y-4 px-8">
      <Utensils className="w-8 h-8 text-zinc-600 mx-auto" />
      <div>
        <p className="text-sm font-semibold text-zinc-400">
          No results for &ldquo;<span className="text-zinc-300">{query}</span>&rdquo;
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          Try the Bengali name, English name, or a phonetic spelling.
        </p>
      </div>

      {/* Add custom food CTA */}
      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-all cursor-pointer">
        <Plus className="w-3.5 h-3.5 text-cyan-400" />
        <span>Add &ldquo;{query}&rdquo; as a custom food</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
      </div>

      <p className="text-[11px] text-zinc-600">
        Custom food creation coming soon — the full database covers 600+ items.
      </p>
    </div>
  );
}
