import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-surface/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-border flex items-center justify-center text-text-secondary mb-4 shadow-inner">
        {icon}
      </div>

      <h3 className="font-semibold text-base sm:text-lg text-text-primary tracking-tight">
        {title}
      </h3>

      <p className="text-sm text-text-secondary max-w-sm mt-1.5 mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
