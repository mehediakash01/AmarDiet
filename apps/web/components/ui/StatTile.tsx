import React from 'react';

export interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  accentColor?: 'calories' | 'protein' | 'carbs' | 'fat' | 'default';
  className?: string;
}

export function StatTile({
  label,
  value,
  unit,
  subtext,
  icon,
  trend,
  accentColor = 'default',
  className = '',
}: StatTileProps) {
  const colorClass = {
    calories: 'text-macro-calories',
    protein: 'text-macro-protein',
    carbs: 'text-macro-carbs',
    fat: 'text-macro-fat',
    default: 'text-text-primary',
  }[accentColor];

  return (
    <div className={`p-4 rounded-2xl bg-surface/80 border border-border flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs uppercase font-semibold tracking-wider text-text-secondary">
          {label}
        </span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl sm:text-3xl font-bold font-tabular tracking-tight ${colorClass}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-text-muted">{unit}</span>}
      </div>

      {(subtext || trend) && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
          {subtext && <span className="text-text-muted truncate">{subtext}</span>}
          {trend && (
            <span
              className={`font-semibold ml-auto ${
                trend.direction === 'up'
                  ? 'text-emerald-400'
                  : trend.direction === 'down'
                    ? 'text-amber-400'
                    : 'text-text-secondary'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
