import React from 'react';

export type MacroType = 'protein' | 'carbs' | 'fat' | 'calories';

export interface MacroBadgeProps {
  type: MacroType;
  gramsOrKcal: number | string;
  target?: number | string;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function MacroBadge({
  type,
  gramsOrKcal,
  target,
  showDot = true,
  size = 'md',
  className = '',
}: MacroBadgeProps) {
  const config = {
    calories: {
      label: 'Calories',
      shortLabel: 'Cal',
      unit: 'kcal',
      dotColor: 'bg-macro-calories',
      textColor: 'text-macro-calories',
      badgeBg: 'bg-cyan-950/40 border-cyan-800/50',
    },
    protein: {
      label: 'Protein',
      shortLabel: 'P',
      unit: 'g',
      dotColor: 'bg-macro-protein',
      textColor: 'text-macro-protein',
      badgeBg: 'bg-purple-950/40 border-purple-800/50',
    },
    carbs: {
      label: 'Carbs',
      shortLabel: 'C',
      unit: 'g',
      dotColor: 'bg-macro-carbs',
      textColor: 'text-macro-carbs',
      badgeBg: 'bg-emerald-950/40 border-emerald-800/50',
    },
    fat: {
      label: 'Fat',
      shortLabel: 'F',
      unit: 'g',
      dotColor: 'bg-macro-fat',
      textColor: 'text-macro-fat',
      badgeBg: 'bg-amber-950/40 border-amber-800/50',
    },
  }[type];

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-lg border font-tabular ${config.badgeBg} ${sizeStyles} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dotColor}`}
          aria-hidden="true"
        />
      )}
      <span className="text-text-secondary">{config.shortLabel}:</span>
      <span className={`font-semibold ${config.textColor}`}>
        {typeof gramsOrKcal === 'number' ? Math.round(gramsOrKcal) : gramsOrKcal}
        {config.unit}
      </span>
      {target !== undefined && (
        <span className="text-text-muted">
          / {typeof target === 'number' ? Math.round(target) : target}
          {config.unit}
        </span>
      )}
    </span>
  );
}
