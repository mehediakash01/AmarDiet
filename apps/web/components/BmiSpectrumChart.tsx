'use client';

import React, { useMemo } from 'react';

export interface BmiSpectrumChartProps {
  heightCm: number;
  weightKg: number;
  bmi?: number;
  className?: string;
}

export function BmiSpectrumChart({
  heightCm,
  weightKg,
  bmi,
  className = '',
}: BmiSpectrumChartProps) {
  // Calculate BMI if not directly provided
  const calculatedBmi = useMemo(() => {
    if (typeof bmi === 'number' && bmi > 0) return bmi;
    if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return 0;
    const heightM = heightCm / 100;
    return Number((weightKg / (heightM * heightM)).toFixed(1));
  }, [bmi, heightCm, weightKg]);

  // Determine category
  const category = useMemo(() => {
    if (calculatedBmi < 18.5) return { label: 'Underweight', color: 'text-indigo-400', badgeBg: 'bg-indigo-500' };
    if (calculatedBmi <= 24.9) return { label: 'Normal Weight', color: 'text-emerald-400', badgeBg: 'bg-emerald-500' };
    if (calculatedBmi <= 29.9) return { label: 'Overweight', color: 'text-amber-400', badgeBg: 'bg-amber-500' };
    return { label: 'Obese', color: 'text-rose-400', badgeBg: 'bg-rose-500' };
  }, [calculatedBmi]);

  // Calculate takeaway statement (kg target range to reach 18.5 - 24.9)
  const takeaway = useMemo(() => {
    if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return null;

    const heightM = heightCm / 100;
    const minNormalKg = 18.5 * heightM * heightM;
    const maxNormalKg = 24.9 * heightM * heightM;

    if (calculatedBmi < 18.5) {
      const kgDiff = (minNormalKg - weightKg).toFixed(1);
      return {
        type: 'underweight',
        text: `Gain ${kgDiff} kg to reach the optimal health range (${minNormalKg.toFixed(1)} – ${maxNormalKg.toFixed(1)} kg).`,
      };
    }

    if (calculatedBmi > 24.9) {
      const kgDiff = (weightKg - maxNormalKg).toFixed(1);
      return {
        type: 'overweight',
        text: `Lose ${kgDiff} kg to reach the optimal health range (${minNormalKg.toFixed(1)} – ${maxNormalKg.toFixed(1)} kg).`,
      };
    }

    return {
      type: 'optimal',
      text: `Your weight is within the healthy optimal range (${minNormalKg.toFixed(1)} – ${maxNormalKg.toFixed(1)} kg).`,
    };
  }, [calculatedBmi, heightCm, weightKg]);

  // Calculate pointer percentage on scale [15 - 35]
  const minBmi = 15;
  const maxBmi = 35;
  const percentage = useMemo(() => {
    if (calculatedBmi <= 0) return 0;
    const clamped = Math.max(minBmi, Math.min(maxBmi, calculatedBmi));
    return ((clamped - minBmi) / (maxBmi - minBmi)) * 100;
  }, [calculatedBmi]);

  return (
    <div className={`border border-border/80 rounded-2xl p-4 sm:p-5 bg-surface/90 space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase font-bold tracking-wider text-text-secondary">
          BMI Spectrum Analysis
        </div>
        <div className="text-xs font-semibold">
          BMI: <span className="font-mono font-bold text-text-primary">{calculatedBmi}</span>{' '}
          <span className={`ml-1 font-semibold ${category.color}`}>({category.label})</span>
        </div>
      </div>

      {/* Bar and Pointer Container */}
      <div className="pt-6 pb-2 relative">
        {/* Pointer Badge */}
        <div
          className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300 z-10"
          style={{ left: `${percentage}%` }}
        >
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono text-zinc-950 shadow-md ${category.badgeBg}`}>
            {calculatedBmi}
          </span>
          <div
            className={`w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent ${
              calculatedBmi < 18.5
                ? 'border-t-indigo-500'
                : calculatedBmi <= 24.9
                ? 'border-t-emerald-500'
                : calculatedBmi <= 29.9
                ? 'border-t-amber-500'
                : 'border-t-rose-500'
            }`}
          />
        </div>

        {/* Multi-segmented Spectrum Bar */}
        <div className="h-3 w-full rounded-full flex overflow-hidden border border-border/60 shadow-inner">
          <div
            style={{ width: '17.5%' }}
            className="bg-indigo-500/80 transition-all"
            title="Underweight (<18.5)"
          />
          <div
            style={{ width: '32.5%' }}
            className="bg-emerald-500 transition-all"
            title="Normal (18.5-24.9)"
          />
          <div
            style={{ width: '25.0%' }}
            className="bg-amber-500 transition-all"
            title="Overweight (25.0-29.9)"
          />
          <div
            style={{ width: '25.0%' }}
            className="bg-rose-500 transition-all"
            title="Obese (>=30.0)"
          />
        </div>

        {/* Spectrum Labels */}
        <div className="flex justify-between text-[10px] text-text-muted font-medium mt-1.5 px-0.5">
          <span>&lt;18.5 (Under)</span>
          <span>18.5–24.9 (Normal)</span>
          <span>25.0–29.9 (Over)</span>
          <span>&ge;30.0 (Obese)</span>
        </div>
      </div>

      {/* Takeaway Statement */}
      {takeaway && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border leading-relaxed ${
            takeaway.type === 'optimal'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : takeaway.type === 'underweight'
              ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/60'
              : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
          }`}
        >
          {takeaway.text}
        </div>
      )}
    </div>
  );
}
