import type * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  /** Decorative; automatically hidden from assistive tech. */
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** `card` draws a dashed container; `bare` sits inside an existing card. */
  variant?: 'card' | 'bare';
  size?: 'sm' | 'md';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'bare',
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'sm' ? 'gap-2 py-8' : 'gap-3 py-14',
        variant === 'card' &&
          'rounded-2xl border border-dashed border-border bg-surface-sunken/50 px-6',
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className={cn(
            'flex items-center justify-center rounded-full bg-surface-hover text-subtle-foreground',
            size === 'sm' ? 'mb-1 size-10' : 'mb-2 size-14',
          )}
        >
          {icon}
        </div>
      ) : null}

      <p className={cn('font-semibold text-foreground', size === 'sm' ? 'text-sm' : 'text-base')}>
        {title}
      </p>

      {description ? (
        <p className="max-w-xs text-sm text-balance text-muted-foreground">{description}</p>
      ) : null}

      {action || secondaryAction ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {action ? (
            <Button size="sm" onClick={action.onClick} leadingIcon={action.icon}>
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
