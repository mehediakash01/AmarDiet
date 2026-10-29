'use client';

import React, { useEffect, useState } from 'react';
import {
  Droplets,
  Plus,
  Minus,
  Timer,
  Play,
  Square,
  Sparkles,
  Moon,
  Clock,
  Check,
} from 'lucide-react';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import type { FastingMode } from '@thali/types';
import { getFastingProgress } from '@/lib/fasting';

export function WaterTrackerWidget() {
  const waterLog = useNutritionStore((s) => s.waterLog);
  const fastingSession = useNutritionStore((s) => s.fastingSession);
  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const loadHydration = useNutritionStore((s) => s.loadHydration);
  const logWater = useNutritionStore((s) => s.logWater);
  const updateFasting = useNutritionStore((s) => s.updateFasting);

  const activeTab = useNutritionStore((s) => s.hydrationTab);
  const setActiveTab = useNutritionStore((s) => s.setHydrationTab);
  const [fastingMode, setFastingMode] = useState<FastingMode>('16_8');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    loadHydration(selectedDate);
  }, [loadHydration, selectedDate]);

  // Live timer tick every 10 seconds for fasting
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const currentAmount = waterLog?.amount_ml ?? 0;
  const targetAmount = waterLog?.target_ml ?? 2500;
  const progressPercent = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  const glasses = Math.round((currentAmount / 250) * 10) / 10;
  const targetGlasses = Math.round(targetAmount / 250);

  // Fasting calculations
  const isFastingActive = fastingSession?.isActive ?? false;
  const targetHours = fastingSession?.targetHours ?? (fastingMode === '14_10' ? 14 : fastingMode === '18_6' ? 18 : 16);

  const fasting = getFastingProgress(fastingSession, now);
  const { elapsedHours, remainingMs } = fasting;
  const isFastCompleted = fasting.isCompleted;

  const formatCountdown = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m left`;
  };

  const startFast = () => {
    const hours = fastingMode === '14_10' ? 14 : fastingMode === '18_6' ? 18 : fastingMode === 'ramadan' ? 14 : 16;
    updateFasting({
      mode: fastingMode,
      startTime: new Date().toISOString(),
      targetHours: hours,
      isActive: true,
    });
  };

  const endFast = () => {
    if (fastingSession) {
      updateFasting({
        ...fastingSession,
        isActive: false,
      });
    }
  };

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
      {/* Widget Tabs Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/70">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('water')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'water'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>Water ({currentAmount}ml)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fasting')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'fasting'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-purple-400" />
            <span>Fasting {isFastingActive ? '• Active' : ''}</span>
          </button>
        </div>

        <span className="text-[11px] text-zinc-500 hidden sm:inline-block">
          {activeTab === 'water' ? 'Hydration Target: 35ml/kg' : 'Eating & Fasting Windows'}
        </span>
      </div>

      {/* ── Tab 1: Water / Hydration Tracker ─────────────────────────────── */}
      {activeTab === 'water' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Visual Gauge & Numbers */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {/* Wave Fill Level */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500/60 to-cyan-400/30 transition-all duration-500"
                  style={{ height: `${progressPercent}%` }}
                />
                <span className="relative font-black text-sm text-cyan-200">
                  {progressPercent}%
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-zinc-100">{currentAmount}</span>
                  <span className="text-xs text-zinc-500">/ {targetAmount} ml</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {glasses} of {targetGlasses} glasses (১ গ্লাস = ২৫০ মিলি)
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => logWater(-250)}
                disabled={currentAmount <= 0}
                className="w-10 h-10 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 flex items-center justify-center transition-all disabled:opacity-40"
                title="Subtract 250ml"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => logWater(250)}
                className="flex items-center gap-1.5 px-3.5 h-10 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+250ml</span>
              </button>

              <button
                type="button"
                onClick={() => logWater(500)}
                className="flex items-center gap-1.5 px-3.5 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition-all active:scale-95 shadow-md shadow-cyan-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+500ml Bottle</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Tab 2: Fasting Window Timer ─────────────────────────────────── */}
      {activeTab === 'fasting' && (
        <div className="space-y-4">
          {!isFastingActive ? (
            /* Idle Fasting State — Pick a Mode */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-zinc-300">Choose Fasting Protocol</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(
                    [
                      { id: '16_8', label: '16:8 Intermittent' },
                      { id: '14_10', label: '14:10 Gentle' },
                      { id: '18_6', label: '18:6 Warrior' },
                      { id: 'ramadan', label: 'Ramadan (Suhoor to Iftar)' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFastingMode(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        fastingMode === m.id
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={startFast}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/10 transition-all self-start sm:self-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Fasting Now</span>
              </button>
            </div>
          ) : (
            /* Active Fasting Countdown */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0">
                  {isFastCompleted ? (
                    <Check className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-purple-400 animate-pulse" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold uppercase tracking-wider text-[10px]">
                      {fastingSession?.mode.replace('_', ':')} Protocol
                    </span>
                    {isFastCompleted ? (
                      <span className="text-xs font-bold text-emerald-400">Target Reached!</span>
                    ) : (
                      <span className="text-xs font-medium text-zinc-400">
                        {formatCountdown(remainingMs)}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-zinc-200 mt-1">
                    {elapsedHours} hours fasted / {targetHours} hours target
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={endFast}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/70 text-zinc-300 text-xs font-semibold rounded-xl transition-all self-start sm:self-auto"
              >
                <Square className="w-3.5 h-3.5 text-rose-400 fill-current" />
                <span>End Fast (Open Window)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
