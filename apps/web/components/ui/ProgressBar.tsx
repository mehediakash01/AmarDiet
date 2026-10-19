
import React from 'react';

export interface ProgressBarProps {
  value: number; // Current value
  max: number; // Max/Target value
  variant?: 'calories' | 'protein' | 'carbs' | 'fat' | 'warning' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const isOver = value > max && max > 0;

  const colorClass = isOver
    ? 'bg-macro-warning shadow-sm shadow-red-500/20'
    : {
        calories: 'bg-macro-calories shadow-sm shadow-cyan-500/20',
        protein: 'bg-macro-protein shadow-sm shadow-purple-500/20',
        carbs: 'bg-macro-carbs shadow-sm shadow-emerald-500/20',
        fat: 'bg-macro-fat shadow-sm shadow-amber-500/20',
        warning: 'bg-macro-warning shadow-sm shadow-red-500/20',
        primary: 'bg-primary shadow-sm shadow-cyan-500/20',
      }[variant];

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-secondary font-medium font-tabular">
            {Math.round(value)} / {Math.round(max)}
          </span>
          <span className={`font-semibold font-tabular ${isOver ? 'text-macro-warning' : 'text-text-muted'}`}>
            {percentage}%
          </span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-label="Progress"
        className={`w-full bg-zinc-800/80 rounded-full overflow-hidden border border-border/40 ${heightClass}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
