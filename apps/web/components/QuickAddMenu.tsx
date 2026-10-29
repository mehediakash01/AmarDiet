'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Utensils, Camera, Droplets, Timer } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { defaultMealSlotForHour } from '@/lib/meal-slot';
import { getFastingProgress } from '@/lib/fasting';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { useToast } from '@/components/ui/Toast';

const WATER_QUICK_ADD_ML = 250; // one glass

const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

function localToday(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * MyFitnessPal-style "+" menu. Opened by the raised center button in the
 * mobile bottom bar (see Navbar). State lives in the store, like the food
 * search and meal scan modals, so any component can open it.
 */
export function QuickAddMenu() {
  const isOpen = useNutritionStore((s) => s.isQuickAddOpen);
  const close = useNutritionStore((s) => s.closeQuickAdd);

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={close}
      title="Quick add"
      description="What would you like to log?"
      maxWidth="sm"
    >
      {/* ModalSheet renders nothing while closed, so this mounts fresh on every
          open and the meal chip re-defaults to the current time of day. */}
      <QuickAddContent onDone={close} />
    </ModalSheet>
  );
}

function QuickAddContent({ onDone }: { onDone: () => void }) {
  const [slot, setSlot] = useState<MealSlot>(() => defaultMealSlotForHour(new Date().getHours()));
  const openFoodSearch = useNutritionStore((s) => s.openFoodSearch);
  const openMealScan = useNutritionStore((s) => s.openMealScan);
  const logWater = useNutritionStore((s) => s.logWater);
  const loadHydration = useNutritionStore((s) => s.loadHydration);
  const setHydrationTab = useNutritionStore((s) => s.setHydrationTab);
  const fastingSession = useNutritionStore((s) => s.fastingSession);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch the current fasting status / water total for the selected day, so the
  // Fasting tile and the Water toast reflect the server, not stale state.
  // The promise is kept so "Water" can wait for it: otherwise a slow fetch could
  // land AFTER the new glass is added and overwrite the total with stale data.
  const hydrationLoad = useRef<Promise<void> | null>(null);
  useEffect(() => {
    hydrationLoad.current = loadHydration();
  }, [loadHydration]);

  const handleFood = () => {
    onDone();
    openFoodSearch(slot);
  };

  const handleScan = () => {
    onDone();
    openMealScan(slot);
  };

  const handleWater = async () => {
    onDone(); // close first so a double-tap can't log twice
    const pendingLoad = hydrationLoad.current;
    if (pendingLoad) await pendingLoad; // never rejects: loadHydration handles its own errors
    await logWater(WATER_QUICK_ADD_ML);
    const { waterLog, selectedDate } = useNutritionStore.getState();
    const dateNote = selectedDate !== localToday() ? ` for ${selectedDate}` : '';
    toast(
      waterLog
        ? `Water${dateNote}: ${waterLog.amount_ml} / ${waterLog.target_ml} ml`
        : `Added ${WATER_QUICK_ADD_ML} ml of water${dateNote}`,
      'success',
    );
  };

  // Opens the dashboard's water & fasting card on its Fasting tab.
  const handleFasting = () => {
    onDone();
    setHydrationTab('fasting');
    if (pathname === '/dashboard') {
      // Already there: wait a beat for the sheet to unmount, then scroll to the card.
      window.setTimeout(() => {
        document.getElementById('hydration')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } else {
      router.push('/dashboard#hydration');
    }
  };

  const fasting = getFastingProgress(fastingSession, Date.now());
  const fastingHint = !fasting.isActive
    ? 'Start a fast'
    : fasting.isCompleted
      ? 'Target reached'
      : `${fasting.elapsedHours}h of ${fasting.targetHours}h`;

  const tiles = [
    { key: 'food', label: 'Food', hint: 'Search & log', icon: Utensils, onClick: handleFood },
    { key: 'scan', label: 'Scan meal', hint: 'AI from photo', icon: Camera, onClick: handleScan },
    {
      key: 'water',
      label: 'Water',
      hint: `+${WATER_QUICK_ADD_ML} ml`,
      icon: Droplets,
      onClick: handleWater,
    },
    { key: 'fasting', label: 'Fasting', hint: fastingHint, icon: Timer, onClick: handleFasting },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
          Add to meal
        </p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Meal">
          {MEAL_SLOTS.map((m) => {
            const selected = m.value === slot;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setSlot(m.value)}
                className={`min-h-[40px] rounded-xl border text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-semibold'
                    : 'bg-zinc-950 border-border text-text-secondary hover:text-text-primary hover:border-zinc-700'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={t.onClick}
              className="flex flex-col items-center justify-center gap-2 min-h-[96px] rounded-2xl border border-border bg-zinc-950 p-3 transition-all hover:border-cyan-500/40 hover:bg-zinc-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span className="w-11 h-11 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-sm font-semibold text-text-primary leading-tight">{t.label}</span>
              <span className="text-[11px] text-text-muted leading-tight">{t.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
