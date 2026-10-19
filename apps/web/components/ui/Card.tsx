import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
  interactive?: boolean;
}

export function Card({
  children,
  variant = 'default',
  interactive = false,
  className = '',
  ...props
}: CardProps) {
  const baseStyles = 'rounded-2xl border transition-all duration-200';
  const variantStyles = {
    default: 'bg-surface/90 border-border',
    elevated: 'bg-surface-elevated/90 border-border shadow-lg shadow-black/40',
    glass: 'bg-surface/75 backdrop-blur-md border-border/80',
  }[variant];
  const interactiveStyles = interactive
    ? 'hover:border-zinc-700 hover:bg-surface active:scale-[0.99] cursor-pointer'
    : '';

  return (
    <div className={`${baseStyles} ${variantStyles} ${interactiveStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}
