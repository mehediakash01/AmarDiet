'use client';

import React from 'react';
import type { CalculatedNutrition, NutritionTargets } from '@thali/types';

interface PlateRingChartProps {
  consumed: CalculatedNutrition;
  targets: NutritionTargets;
}

export function PlateRingChart({ consumed, targets }: PlateRingChartProps) {
  const targetKcal = targets.calorieTarget;
  const consumedKcal = consumed.calories;
  const remainingKcal = Math.max(0, targetKcal - consumedKcal);
  const isOver = consumedKcal > targetKcal;

  const percentConsumed = Math.min(100, Math.round((consumedKcal / targetKcal) * 100));

  // SVG Ring calculation
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentConsumed / 100) * circumference;

  // Macro percentages against their respective targets
  const proteinPercent = Math.min(
    100,
    Math.round((consumed.protein / targets.macros.protein_g) * 100),
  );
  const carbsPercent = Math.min(
    100,
    Math.round((consumed.carbs / targets.macros.carbs_g) * 100),
  );
  const fatPercent = Math.min(
    100,
    Math.round((consumed.fat / targets.macros.fat_g) * 100),
  );

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="text-xs uppercase font-bold tracking-wider text-muted mb-3">
        Today's Energy Balance
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* SVG Circular Ring */}
        <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="#DFD7C2"
              strokeWidth="12"
              fill="transparent"
            />
            {/* Consumed ring */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="#1F4D3E"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted font-medium">Percent</span>
            <span className="text-xl font-bold font-serif text-primary">
              {percentConsumed}%
            </span>
          </div>
        </div>

        {/* Slab-serif numeral readout */}
        <div className="flex-1 space-y-1 text-center sm:text-left">
          <div className="text-sm text-muted">
            {isOver ? 'Calorie limit exceeded by' : 'Remaining energy today'}
          </div>
          <div className="text-4xl sm:text-5xl font-serif font-bold text-primary tracking-tight">
            {isOver ? Math.round(consumedKcal - targetKcal) : Math.round(remainingKcal)}
            <span className="text-base font-normal text-muted ml-2">kcal {isOver ? 'over' : 'left'}</span>
          </div>
          <div className="text-xs text-muted">
            {Math.round(consumedKcal)} of {Math.round(targetKcal)} kcal target logged
          </div>
        </div>
      </div>

      {/* Indigo Insight Line */}
      <div className="mt-5 pt-3 border-t border-border bg-secondary-light/40 -mx-5 -mb-5 p-4 rounded-b-lg flex items-center justify-between text-xs text-secondary font-medium">
        <span>Daily Insight</span>
        <span>
          {isOver
            ? 'Energy target exceeded. Protein is at ' + proteinPercent + '%.'
            : remainingKcal > 400
              ? `${Math.round(remainingKcal)} kcal open for your remaining meal slots.`
              : 'On track with your daily calorie allocation.'}
        </span>
      </div>

      {/* Macro Breakdown Bars */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-border">
        {/* Protein */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-dark">Protein</span>
            <span className="text-muted">
              {Math.round(consumed.protein)}/{Math.round(targets.macros.protein_g)}g
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${proteinPercent}%` }}
            />
          </div>
        </div>

        {/* Carbs */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-dark">Carbs</span>
            <span className="text-muted">
              {Math.round(consumed.carbs)}/{Math.round(targets.macros.carbs_g)}g
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
            <div
              className="bg-accent h-full rounded-full transition-all duration-300"
              style={{ width: `${carbsPercent}%` }}
            />
          </div>
        </div>

        {/* Fat */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-dark">Fat</span>
            <span className="text-muted">
              {Math.round(consumed.fat)}/{Math.round(targets.macros.fat_g)}g
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
            <div
              className="bg-secondary h-full rounded-full transition-all duration-300"
              style={{ width: `${fatPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
