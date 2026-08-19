import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends React.ComponentPropsWithRef<'div'> {
  /**
   * Announced to assistive tech via a paired live region. Provide it on the
   * outermost skeleton of a loading area only — one announcement per region,
   * not one per shimmering box.
   */
  loadingLabel?: string;
}

/**
 * A placeholder block.
 *
 * These are load-bearing rather than decorative: persisted state cannot be read
 * during server render, so every store-backed surface renders a skeleton until
 * hydration completes. That is what keeps the first client render byte-identical
 * to the server's and avoids a hydration mismatch.
 */
export function Skeleton({ className, loadingLabel, ...props }: SkeletonProps) {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          'animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none',
          className,
        )}
        {...props}
      />
      {loadingLabel ? (
        <span role="status" aria-live="polite" className="sr-only">
          {loadingLabel}
        </span>
      ) : null}
    </>
  );
}
