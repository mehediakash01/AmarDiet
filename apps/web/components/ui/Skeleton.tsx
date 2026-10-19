import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  circle?: boolean;
}

export function Skeleton({ className = '', circle = false, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-zinc-800/80 animate-pulse ${
        circle ? 'rounded-full' : 'rounded-xl'
      } ${className}`}
      {...props}
    />
  );
}
