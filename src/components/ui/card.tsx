import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.ComponentPropsWithRef<'div'> {
  /** `sunken` recedes into the page; use for nested groupings. */
  variant?: 'raised' | 'flat' | 'sunken';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const;

const variants = {
  raised: 'bg-surface shadow-card',
  flat: 'bg-surface',
  sunken: 'bg-surface-sunken',
} as const;

export function Card({ className, variant = 'raised', padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border',
        variants[variant],
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.ComponentPropsWithRef<'h2'>) {
  return <h2 className={cn('text-base font-semibold text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentPropsWithRef<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
