'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ProgressRingProps {
  /**
   * Elapsed fraction, 0..1. Clamped. The ring *fills* as time is spent, which
   * is the opposite of the original implementation and reads far better: a full
   * ring means a finished session.
   */
  value: number;
  /** Stroke width relative to the 100-unit viewBox. */
  strokeWidth?: number;
  /**
   * Disable the sweep transition — set while resetting or scrubbing, where an
   * animated jump from full to empty looks like a glitch. Automatically
   * disabled under `prefers-reduced-motion`.
   */
  animate?: boolean;
  /**
   * When provided the SVG becomes `role="img"` with this label. Omit when the
   * surrounding region already conveys the value — the timer does exactly
   * that, so its ring stays `aria-hidden` rather than duplicating the digits.
   */
  label?: string;
  /** Rendered dead-centre, inside the ring. */
  children?: React.ReactNode;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}

const VIEWBOX = 100;

/**
 * A pure-SVG progress ring.
 *
 * Sized entirely by its container through `viewBox` — there is no pixel `size`
 * prop, because a fixed dimension is what made the original timer overflow
 * every phone. Callers constrain it with `max-w-*` and it scales fluidly.
 */
export function ProgressRing({
  value,
  strokeWidth = 4,
  animate = true,
  label,
  children,
  className,
  trackClassName,
  indicatorClassName,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
  const radius = (VIEWBOX - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className={cn('relative aspect-square w-full', className)}>
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="size-full -rotate-90"
        {...(label
          ? { role: 'img', 'aria-label': label }
          : { 'aria-hidden': true, focusable: false })}
      >
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn('stroke-track', trackClassName)}
        />
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'stroke-accent',
            // `linear`, not an eased curve: the sweep represents time passing,
            // and any easing makes it visibly lag or overshoot the digits.
            animate && 'transition-[stroke-dashoffset] duration-300 ease-linear',
            'motion-reduce:transition-none',
            indicatorClassName,
          )}
          // A zero-length dash still paints a round cap — a stray dot at 12
          // o'clock on a ring that has not started.
          style={clamped === 0 ? { strokeLinecap: 'butt' } : undefined}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}
