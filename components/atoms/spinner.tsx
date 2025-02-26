import { cn } from '@/lib/utils';
import React from 'react';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent',
        className,
      )}
      aria-label="Loading"
      role="status"
    />
  );
}
