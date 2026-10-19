import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none select-none min-h-[44px]';

    const variantStyles = {
      primary:
        'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold shadow-md shadow-cyan-500/20 active:bg-cyan-600',
      secondary:
        'bg-zinc-800 hover:bg-zinc-700 text-text-primary border border-border/80 shadow-sm',
      destructive:
        'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 shadow-sm',
      ghost:
        'hover:bg-zinc-800/80 text-text-secondary hover:text-text-primary',
      outline:
        'border border-border hover:border-zinc-700 bg-transparent text-text-primary hover:bg-zinc-900',
    }[variant];

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[38px]',
      md: 'text-sm px-4 py-2 gap-2 min-h-[44px]',
      lg: 'text-base px-5 py-2.5 gap-2.5 min-h-[48px]',
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
