'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Settings, Sparkles, TrendingUp } from 'lucide-react';
import type { MealSlot } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { PlateRingChart } from '@/components/PlateRingChart';
import { BmiSpectrumChart } from '@/components/BmiSpectrumChart';
import { MealSlotCard } from '@/components/MealSlotCard';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { WaterTrackerWidget } from '@/components/WaterTrackerWidget';
import { useToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const { toast } = useToast();
  const profile = useNutritionStore((s) => s.profile);
  const nutrition = useNutritionStore((s) => s.nutrition);
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const dailyLogs = useNutritionStore((s) => s.dailyLogs);
  const openFoodSearch = useNutritionStore((s) => s.openFoodSearch);
  const removeFoodLog = useNutritionStore((s) => s.removeFoodLog);
  const updateFoodLog = useNutritionStore((s) => s.updateFoodLog);
  const loadProfile = useNutritionStore((s) => s.loadProfile);
  const loadLogsForDate = useNutritionStore((s) => s.loadLogsForDate);

  useEffect(() => {
    loadProfile();
    loadLogsForDate();
  }, [loadProfile, loadLogsForDate]);

  // Arriving from the Quick Add menu's "Fasting" tile (or a #hydration link):
  // bring the water & fasting card into view.
  useEffect(() => {
    if (window.location.hash === '#hydration') {
      document.getElementById('hydration')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Aggregate consumed nutrition across all slots
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
    { id: 'snack', label: 'Snacks & Extras' },
  ];

  const handleQuickAdd = async (id: string, currentQty: number, addQty: number, name?: string) => {
    const newQty = currentQty + addQty;
    await updateFoodLog(id, newQty);
    toast(`Added +${addQty}g to ${name || 'item'}`, 'success');
  };

  const handleRemove = async (id: string, name?: string) => {
    await removeFoodLog(id);
    toast(`Removed ${name || 'item'}`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Banner ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
            Today&apos;s Log
          </h1>
          <div className="flex items-center space-x-2 text-xs text-text-muted mt-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-text-secondary" />
            <span className="font-tabular text-text-secondary">{selectedDate}</span>
            <span>•</span>
            <span className="capitalize text-text-secondary">{profile?.goal.replace('_', ' ') || 'Nutrition Plan'}</span>
            <span>•</span>
            <span className="capitalize text-text-secondary">{profile?.cuisine_preference || 'Mixed'} Focus</span>
          </div>
        </div>

        <Link
          href="/onboarding"
          className="inline-flex items-center space-x-2 px-3.5 py-2 border border-border bg-surface hover:bg-zinc-800 rounded-xl text-xs font-semibold text-text-primary transition-all self-start sm:self-auto min-h-[44px]"
        >
          <Settings className="w-3.5 h-3.5 text-text-muted" />
          <span>Edit Profile / Targets</span>
        </Link>
      </div>

      {/* ─── Main Grid Layout (Mobile: Hero Top; Desktop: Side-by-Side) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT COLUMN on desktop / TOP HERO on mobile: Energy Ring & Stats */}
        <div className="order-1 lg:order-2 lg:col-span-5 space-y-5">
          {nutrition && (
            <PlateRingChart consumed={consumedTotals} targets={nutrition} />
          )}

          {/* Water & fasting tracker (scroll-mt clears the sticky header) */}
          <div id="hydration" className="scroll-mt-20">
            <WaterTrackerWidget />
          </div>

          {/* Quick Anthropometric & Target Breakdown */}
          {profile && nutrition && (
            <>
              <BmiSpectrumChart heightCm={profile.height_cm} weightKg={profile.weight_kg} />

              <div className="bg-surface/90 border border-border/80 rounded-2xl p-4 sm:p-5 text-xs space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-text-secondary flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scientific Formula Breakdown</span>
                  </span>
                  <span className="text-[10px] text-text-muted">Mifflin-St Jeor</span>
                </div>

                <div className="flex justify-between py-1 border-b border-border/40 font-tabular">
                  <span className="text-text-muted">Basal Metabolic Rate (BMR)</span>
                  <span className="font-semibold text-text-primary">{Math.round(nutrition.bmr)} kcal</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40 font-tabular">
                  <span className="text-text-muted">Total Expenditure (TDEE)</span>
                  <span className="font-semibold text-text-primary">{Math.round(nutrition.tdee)} kcal</span>
                </div>
                <div className="flex justify-between py-1 font-tabular">
                  <span className="text-text-muted">Target Daily Goal</span>
                  <span className="font-bold text-macro-calories">{Math.round(nutrition.calorieTarget)} kcal</span>
                </div>
              </div>
            </>
          )}

          <SubscriptionCard />
        </div>

        {/* LEFT COLUMN on desktop / SECOND on mobile: 4 Meal Slot Cards */}
        <div className="order-2 lg:order-1 lg:col-span-7 space-y-4">
          {slots.map((slot) => {
            const slotEntries = dailyLogs.filter((l) => l.mealSlot === slot.id);
            return (
              <MealSlotCard
                key={slot.id}
                slot={slot}
                entries={slotEntries}
                onAddFood={openFoodSearch}
                onRemoveFood={handleRemove}
                onQuickAdd={handleQuickAdd}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
