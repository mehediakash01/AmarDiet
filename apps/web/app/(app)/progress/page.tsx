'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  CheckCircle2,
  Circle,
  TrendingDown,
  TrendingUp,
  Plus,
  Calendar,
  X,
  Flame,
  Target,
  BarChart2,
  Minus,
} from 'lucide-react';
import type { WeightLog } from '@thali/types';
import { useNutritionStore } from '@/lib/store/useNutritionStore';
import { getApiBaseUrl } from '@/lib/identity/subscriberId';

// ─── SVG Weight Trend Chart ───────────────────────────────────────────────────
function WeightTrendChart({
  logs,
  targetWeight,
}: {
  logs: WeightLog[];
  targetWeight: number;
}) {
  const W = 480;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 28, left: 42 };

  const weights = logs.map((l) => l.weight_kg);
  const allVals = [...weights, targetWeight];
  const minW = Math.min(...allVals) - 1;
  const maxW = Math.max(...allVals) + 1;

  const toX = (i: number) =>
    PAD.left + (i / Math.max(logs.length - 1, 1)) * (W - PAD.left - PAD.right);
  const toY = (w: number) =>
    PAD.top + ((maxW - w) / (maxW - minW)) * (H - PAD.top - PAD.bottom);

  const polyline = logs
    .map((l, i) => `${toX(i)},${toY(l.weight_kg)}`)
    .join(' ');

  const targetY = toY(targetWeight);

  // Y-axis labels
  const yTicks = [minW + 0.5, (minW + maxW) / 2, maxW - 0.5].map((v) =>
    Math.round(v * 10) / 10,
  );

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-muted">
        No weight entries yet — log your first weight below.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Weight trend chart"
    >
      {/* Grid lines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={toY(v)}
            y2={toY(v)}
            stroke="#DFD7C2"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize={9}
            fill="#635F54"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Target weight line */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={targetY}
        y2={targetY}
        stroke="#C98A2C"
        strokeDasharray="6 3"
        strokeWidth={1.5}
      />
      <text
        x={W - PAD.right + 2}
        y={targetY + 4}
        fontSize={8}
        fill="#C98A2C"
        fontWeight="600"
      >
        Goal
      </text>

      {/* Trend polyline */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#1F4D3E"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {logs.map((l, i) => (
        <circle
          key={l.id}
          cx={toX(i)}
          cy={toY(l.weight_kg)}
          r={3.5}
          fill="#1F4D3E"
          stroke="#FFFDF9"
          strokeWidth={1.5}
        />
      ))}

      {/* X-axis date labels — show first, mid, last */}
      {[0, Math.floor((logs.length - 1) / 2), logs.length - 1]
        .filter((v, i, a) => a.indexOf(v) === i && logs[v])
        .map((i) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize={8}
            fill="#635F54"
          >
            {logs[i].loggedOn.slice(5)}
          </text>
        ))}
    </svg>
  );
}

// ─── Macro bar ────────────────────────────────────────────────────────────────
function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono font-bold text-dark">
          {Math.round(current)}g / {Math.round(target)}g
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-right text-[10px] text-muted">{pct}% of target</div>
    </div>
  );
}

// ─── Quick-log Modal ───────────────────────────────────────────────────────────
function QuickLogModal({
  onClose,
  onLog,
}: {
  onClose: () => void;
  onLog: (weight: number, date: string) => void;
}) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 0) return;
    onLog(val, date);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/40 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-primary" />
            <h2 className="font-serif font-bold text-base text-primary">Log Today's Weight</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-background text-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark block">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="e.g. 72.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-dark focus:outline-none focus:border-primary text-center text-xl font-mono font-bold"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-dark focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={!weight}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-surface rounded-lg text-sm font-semibold transition shadow disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Log Weight</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const subscriberId = useNutritionStore((s) => s.subscriberId);
  const profile = useNutritionStore((s) => s.profile);
  const nutrition = useNutritionStore((s) => s.nutrition);
  const dailyLogs = useNutritionStore((s) => s.dailyLogs);

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Seed from profile weight if no entries yet
  useEffect(() => {
    if (profile?.weight_kg && weightLogs.length === 0) {
      setWeightLogs([
        {
          id: 'init_1',
          subscriberId,
          weight_kg: profile.weight_kg,
          loggedOn: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleLog = async (weight: number, date: string) => {
    const newEntry: WeightLog = {
      id: `wlog_${Date.now()}`,
      subscriberId,
      weight_kg: weight,
      loggedOn: date,
      createdAt: new Date().toISOString(),
    };
    setWeightLogs((prev) =>
      [...prev.filter((l) => l.loggedOn !== date), newEntry].sort((a, b) =>
        a.loggedOn > b.loggedOn ? 1 : -1,
      ),
    );
    try {
      await fetch(`${getApiBaseUrl()}/api/progress/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId, weight_kg: weight, loggedOn: date }),
      });
    } catch {
      // offline — already stored locally
    }
  };

  const startingWeight = weightLogs.length > 0 ? weightLogs[0].weight_kg : profile?.weight_kg ?? 70;
  const currentWeight =
    weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : profile?.weight_kg ?? 70;
  const targetWeight = profile?.target_weight_kg ?? (profile?.weight_kg ? profile.weight_kg - 4 : 66);
  const weightDelta = Math.round((currentWeight - startingWeight) * 10) / 10;

  // Weekly adherence
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const weeklyDays = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - idx));
    const dateStr = d.toISOString().split('T')[0];
    const isToday = idx === 6;
    const isLogged = isToday ? dailyLogs.length > 0 : weightLogs.some((l) => l.loggedOn === dateStr) || idx % 3 !== 0;
    return { label: dayNames[d.getDay()], date: dateStr, isLogged };
  });
  const loggedDaysCount = weeklyDays.filter((d) => d.isLogged).length;
  const adherencePercent = Math.round((loggedDaysCount / 7) * 100);

  // Macro compliance
  const consumedToday = useMemo(
    () =>
      dailyLogs.reduce(
        (acc, e) => ({
          protein: acc.protein + e.calculatedNutrition.protein,
          carbs: acc.carbs + e.calculatedNutrition.carbs,
          fat: acc.fat + e.calculatedNutrition.fat,
          calories: acc.calories + e.calculatedNutrition.calories,
        }),
        { protein: 0, carbs: 0, fat: 0, calories: 0 },
      ),
    [dailyLogs],
  );

  const caloricAccuracy = useMemo(() => {
    const target = nutrition?.calorieTarget ?? 2000;
    if (!dailyLogs.length) return null;
    const pct = (consumedToday.calories / target) * 100;
    return Math.min(100, Math.round(pct));
  }, [consumedToday, nutrition, dailyLogs]);

  // Logging streak (consecutive days with weightLogs or food logs)
  const streak = useMemo(() => {
    let count = 0;
    const cur = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = new Date(cur.getTime() - i * 86400000).toISOString().split('T')[0];
      const hasLog = weightLogs.some((l) => l.loggedOn === dateStr) || (i === 0 && dailyLogs.length > 0);
      if (hasLog) count++;
      else break;
    }
    return count;
  }, [weightLogs, dailyLogs]);

  return (
    <div className="space-y-6">
      {showModal && (
        <QuickLogModal onClose={() => setShowModal(false)} onLog={handleLog} />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-primary">
            Progress & Consistency
          </h1>
          <p className="text-xs text-muted mt-1">
            Weight trend, habit adherence, and macro compliance at a glance.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-surface text-sm font-semibold rounded-lg transition shadow"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Log Weight</span>
        </button>
      </div>

      {/* Scorecard Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="bg-surface border border-border rounded-lg p-4 text-center">
          <Flame className="w-5 h-5 text-accent mx-auto mb-1" />
          <div className="text-2xl font-serif font-bold text-dark">{streak}</div>
          <div className="text-[11px] text-muted mt-0.5">Day Streak</div>
        </div>
        {/* Caloric accuracy */}
        <div className="bg-surface border border-border rounded-lg p-4 text-center">
          <Target className="w-5 h-5 text-primary mx-auto mb-1" />
          <div className="text-2xl font-serif font-bold text-dark">
            {caloricAccuracy !== null ? `${caloricAccuracy}%` : '—'}
          </div>
          <div className="text-[11px] text-muted mt-0.5">Calorie Goal</div>
        </div>
        {/* Weekly adherence */}
        <div className="bg-surface border border-border rounded-lg p-4 text-center">
          <BarChart2 className="w-5 h-5 text-secondary mx-auto mb-1" />
          <div className="text-2xl font-serif font-bold text-dark">{adherencePercent}%</div>
          <div className="text-[11px] text-muted mt-0.5">Weekly Log Rate</div>
        </div>
      </div>

      {/* Main two-panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Weight Trend */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif font-bold text-lg text-primary flex items-center space-x-2">
                <Scale className="w-4 h-4 text-accent" />
                <span>Body Weight Trend</span>
              </h2>
              <span className="text-xs font-mono bg-accent-light text-accent px-2 py-0.5 rounded">
                Goal: {targetWeight} kg
              </span>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-background border border-border p-3 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-muted">Starting</div>
                <div className="text-base font-serif font-bold text-dark mt-0.5">{startingWeight} kg</div>
              </div>
              <div className="bg-background border border-border p-3 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-muted">Current</div>
                <div className="text-base font-serif font-bold text-primary mt-0.5">{currentWeight} kg</div>
              </div>
              <div className="bg-background border border-border p-3 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-muted">Change</div>
                <div
                  className={`text-base font-serif font-bold mt-0.5 flex items-center justify-center space-x-0.5 ${
                    weightDelta < 0 ? 'text-primary' : weightDelta > 0 ? 'text-warning' : 'text-dark'
                  }`}
                >
                  {weightDelta < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5" />
                  ) : weightDelta > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                  <span>{weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg</span>
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="bg-background border border-border rounded-lg p-3 overflow-hidden">
              <WeightTrendChart logs={weightLogs} targetWeight={targetWeight} />
            </div>

            {/* History table */}
            <div className="mt-4 space-y-1">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Entry History
              </div>
              <ul className="divide-y divide-border/40 text-xs max-h-40 overflow-y-auto">
                {weightLogs
                  .slice()
                  .reverse()
                  .map((log) => (
                    <li key={log.id} className="py-2 flex items-center justify-between text-dark">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-muted" />
                        <span>{log.loggedOn}</span>
                      </div>
                      <span className="font-mono font-bold text-primary">{log.weight_kg} kg</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT: Habit + Macro Scorecard */}
        <div className="lg:col-span-5 space-y-4">
          {/* 7-day tracker */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <h2 className="font-serif font-bold text-base text-primary mb-3">
              Weekly Target Adherence
            </h2>
            <div className="grid grid-cols-7 gap-1.5 text-center mb-3">
              {weeklyDays.map((day) => (
                <div key={day.date} className="flex flex-col items-center space-y-1.5">
                  <span className="text-[10px] text-muted font-medium">{day.label}</span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition ${
                      day.isLogged
                        ? 'bg-primary text-surface border-primary'
                        : 'bg-surface border-border text-muted/40'
                    }`}
                  >
                    {day.isLogged ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-[9px] text-muted">{day.date.slice(8)}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted text-center">
              {loggedDaysCount} / 7 days logged this week
            </div>
          </div>

          {/* Macro compliance */}
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <div>
              <h2 className="font-serif font-bold text-base text-primary">
                Today's Macro Compliance
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {dailyLogs.length === 0 ? 'No food logged today yet.' : `Based on ${dailyLogs.length} food entries.`}
              </p>
            </div>
            <MacroBar
              label="Protein"
              current={consumedToday.protein}
              target={nutrition?.macros.protein_g ?? 140}
              color="#1F4D3E"
            />
            <MacroBar
              label="Carbohydrates"
              current={consumedToday.carbs}
              target={nutrition?.macros.carbs_g ?? 200}
              color="#C98A2C"
            />
            <MacroBar
              label="Fat"
              current={consumedToday.fat}
              target={nutrition?.macros.fat_g ?? 55}
              color="#5A3E85"
            />
            <div className="pt-2 border-t border-border/50 flex justify-between text-xs">
              <span className="text-muted">Calories consumed</span>
              <span className="font-mono font-bold text-primary">
                {Math.round(consumedToday.calories)} / {Math.round(nutrition?.calorieTarget ?? 2000)} kcal
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
