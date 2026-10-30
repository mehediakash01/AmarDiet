'use client';

import React from 'react';
import type { CalculatedNutrition, NutritionTargets } from '@thali/types';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { CalorieEquation } from './CalorieEquation';
import { getCalorieBalance } from '@/lib/calories';

interface PlateRingChartProps {
  consumed: CalculatedNutrition;
  targets: NutritionTargets;
  /** Calories burned by logged exercise today; adds to what you can eat. */
  exerciseKcal?: number;
}

export function PlateRingChart({ consumed, targets, exerciseKcal = 0 }: PlateRingChartProps) {
  // Budget - Food + Exercise = Remaining, from the nutrition-engine via lib/calories.
  // The ring, the numbers in its centre and the equation below all read this one result.
  const balance = getCalorieBalance(targets.calorieTarget, consumed.calories, exerciseKcal);
  const foodKcal = balance?.food ?? Math.round(consumed.calories);
  const remainingKcal = balance?.remaining ?? 0;
  const isOver = balance?.isOver ?? false;
  const overKcal = balance?.over ?? 0;
  const percentUsed = balance?.percentUsed ?? 0;
  const percentConsumed = Math.min(100, percentUsed);

  // SVG Ring calculation
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentConsumed / 100) * circumference;

  // Macros calculations
  const pTarget = targets.macros.protein_g;
  const cTarget = targets.macros.carbs_g;
  const fTarget = targets.macros.fat_g;

  const pConsumed = Math.round(consumed.protein);
  const cConsumed = Math.round(consumed.carbs);
  const fConsumed = Math.round(consumed.fat);

  const pRemaining = Math.max(0, Math.round(pTarget - pConsumed));
  const cRemaining = Math.max(0, Math.round(cTarget - cConsumed));
  const fRemaining = Math.max(0, Math.round(fTarget - fConsumed));

  return (
    <Card variant="glass" className="p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
          <span className="text-xs uppercase font-bold tracking-wider text-text-secondary">
            Today's Energy Balance
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-text-muted">
          <Flame className="w-3.5 h-3.5 text-macro-calories" />
          <span className="font-tabular text-text-primary">{foodKcal}</span>
          <span>/</span>
          <span className="font-tabular">{balance ? balance.allowance : '\u2014'} kcal</span>
        </div>
      </div>

      {/* Hero Circular Ring & Center Readout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-1">
        {/* SVG Circular Ring */}
        <div className="relative w-44 h-44 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 150 150">
            {/* Background Track */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              stroke="rgb(39 39 42 / 0.8)"
              strokeWidth="11"
              fill="transparent"
            />
            {/* Consumed Ring with Glow */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              stroke={isOver ? '#f87171' : '#22d3ee'}
              strokeWidth="11"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
              style={{
                filter: isOver
                  ? 'drop-shadow(0 0 6px rgb(248 113 113 / 0.4))'
                  : 'drop-shadow(0 0 8px rgb(34 211 238 / 0.35))',
              }}
            />
          </svg>

          {/* Numeral Center Stage */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span
              className={`text-3xl sm:text-4xl font-extrabold font-tabular tracking-tight ${
                isOver ? 'text-red-400' : 'text-text-primary'
              }`}
            >
              {isOver ? `+${overKcal}` : Math.round(remainingKcal)}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                isOver ? 'text-red-400/90' : 'text-text-secondary'
              }`}
            >
              {isOver ? 'Kcal Exceeded' : 'Kcal Remaining'}
            </span>
            <span className="text-[11px] font-medium text-text-muted mt-1 font-tabular">
              {percentUsed}% logged
            </span>
          </div>
        </div>

        {/* Narrative Energy Insight */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="text-sm font-semibold text-text-primary">
            {isOver
              ? 'Calorie ceiling exceeded'
              : remainingKcal > 300
                ? 'Plenty of fuel remaining'
                : 'Nearing daily energy target'}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
            {isOver
              ? `You've exceeded your daily intake by ${overKcal} kcal. Focus on hydration and gentle mobility.`
              : remainingKcal > 400
                ? `You have ${Math.round(remainingKcal)} kcal left across remaining meal slots. Balance with healthy protein & fiber.`
                : 'You are on track with your calculated energy target for today.'}
          </p>
        </div>
      </div>

      {/* Budget − Food + Exercise = Remaining */}
      <div className="border-t border-border/60 pt-4">
        <CalorieEquation budget={targets.calorieTarget} food={consumed.calories} exercise={exerciseKcal} />
      </div>

      {/* Segmented Macro Tiles (Protein, Carbs, Fat) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {/* Protein Card */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Beef className="w-3.5 h-3.5 text-macro-protein" />
              <span className="text-xs font-semibold text-text-primary">Protein</span>
            </div>
            <span className="text-[11px] font-medium text-text-muted font-tabular">
              {pRemaining > 0 ? `${pRemaining}g left` : 'Met'}
            </span>
          </div>
          <ProgressBar value={pConsumed} max={pTarget} variant="protein" size="sm" />
          <div className="flex justify-between text-xs font-tabular">
            <span className="font-bold text-macro-protein">{pConsumed}g</span>
            <span className="text-text-muted">/ {Math.round(pTarget)}g</span>
          </div>
        </div>

        {/* Carbs Card */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Wheat className="w-3.5 h-3.5 text-macro-carbs" />
              <span className="text-xs font-semibold text-text-primary">Carbs</span>
            </div>
            <span className="text-[11px] font-medium text-text-muted font-tabular">
              {cRemaining > 0 ? `${cRemaining}g left` : 'Met'}
            </span>
          </div>
          <ProgressBar value={cConsumed} max={cTarget} variant="carbs" size="sm" />
          <div className="flex justify-between text-xs font-tabular">
            <span className="font-bold text-macro-carbs">{cConsumed}g</span>
            <span className="text-text-muted">/ {Math.round(cTarget)}g</span>
          </div>
        </div>

        {/* Fat Card */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Droplet className="w-3.5 h-3.5 text-macro-fat" />
              <span className="text-xs font-semibold text-text-primary">Fat</span>
            </div>
            <span className="text-[11px] font-medium text-text-muted font-tabular">
              {fRemaining > 0 ? `${fRemaining}g left` : 'Met'}
            </span>
          </div>
          <ProgressBar value={fConsumed} max={fTarget} variant="fat" size="sm" />
          <div className="flex justify-between text-xs font-tabular">
            <span className="font-bold text-macro-fat">{fConsumed}g</span>
            <span className="text-text-muted">/ {Math.round(fTarget)}g</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
