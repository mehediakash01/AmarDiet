'use client';

import React from 'react';
import Link from 'next/link';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getCalorieBalance } from '@/lib/calories';

interface CalorieEquationProps {
  /** Daily calorie budget (the calorie target). null/undefined when there is no profile yet. */
  budget: number | null | undefined;
  /** Calories eaten. */
  food: number;
  /** Calories burned by logged exercise. */
  exercise: number;
  /** Also draw a progress bar and a "% used" line (the Diary does; the ring card does not). */
  showBar?: boolean;
}

function Cell({
  value,
  label,
  emphasis = false,
  warn = false,
}: {
  value: string;
  label: string;
  emphasis?: boolean;
  warn?: boolean;
}) {
  const valueColor = warn ? 'text-warning' : emphasis ? 'text-text-primary' : 'text-text-secondary';
  const labelColor = warn ? 'text-warning' : 'text-text-muted';
  return (
    <div className="min-w-0">
      <div
        className={`font-tabular leading-7 ${emphasis ? 'text-xl sm:text-2xl font-extrabold' : 'text-base sm:text-lg font-bold'} ${valueColor}`}
      >
        {value}
      </div>
      <div className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${labelColor}`}>{label}</div>
    </div>
  );
}

function Operator({ symbol }: { symbol: string }) {
  return <div className="text-base font-semibold text-text-muted leading-7 px-0.5">{symbol}</div>;
}

/**
 * Budget − Food + Exercise = Remaining.
 * All numbers come from lib/calories.ts (which uses the nutrition-engine), so
 * this, the ring chart and the Diary always agree. Warning red appears only
 * when you are over budget.
 */
export function CalorieEquation({ budget, food, exercise, showBar = false }: CalorieEquationProps) {
  const balance = getCalorieBalance(budget, food, exercise);

  // No profile -> no budget. Say so plainly and still show what was logged.
  if (!balance) {
    return (
      <div className="text-center space-y-2 py-1">
        <p className="text-sm text-text-secondary">Set up your profile to see your daily calorie budget.</p>
        <p className="text-xs text-text-muted font-tabular">
          Food {Math.round(Number.isFinite(food) ? food : 0)} kcal &middot; Exercise{' '}
          {Math.round(Number.isFinite(exercise) ? exercise : 0)} kcal
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-sm font-bold transition-colors"
        >
          Set up profile
        </Link>
      </div>
    );
  }

  const { isOver } = balance;
  const resultValue = isOver ? `\u2212${balance.over}` : String(balance.remaining);
  const summary = `Budget ${balance.budget}, minus food ${balance.food}, plus exercise ${balance.exercise}, equals ${
    isOver ? `${balance.over} kcal over budget` : `${balance.remaining} kcal remaining`
  }`;

  return (
    <div role="group" aria-label={summary} className="space-y-3">
      <div
        aria-hidden="true"
        className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-x-1 sm:gap-x-2 text-center"
      >
        <Cell value={String(balance.budget)} label="Budget" />
        <Operator symbol={'\u2212'} />
        <Cell value={String(balance.food)} label="Food" />
        <Operator symbol="+" />
        <Cell value={String(balance.exercise)} label="Exercise" />
        <Operator symbol="=" />
        <Cell value={resultValue} label={isOver ? 'Over' : 'Remaining'} emphasis warn={isOver} />
      </div>

      {showBar && (
        <div className="space-y-1.5">
          {/* Food against everything available today (budget + exercise); turns red only past 100%. */}
          <ProgressBar value={balance.food} max={balance.allowance} variant="calories" size="md" />
          <p className="text-[11px] text-text-muted font-tabular text-center">
            {balance.percentUsed}% of available calories used
          </p>
        </div>
      )}
    </div>
  );
}
