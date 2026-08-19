'use client';

import { MODE_LABELS, type TimerMode } from '@/types';
import { formatDuration, formatDurationSpoken } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

export interface TimerDisplayProps {
  remainingMs: number;
  mode: TimerMode;
  isRunning: boolean;
}

/**
 * The countdown digits.
 *
 * Hidden from assistive tech: the visible value changes every second, and
 * exposing it would either be announced continuously or read as stale. Screen
 * reader users get milestone announcements from `TimerAnnouncer` plus an
 * on-demand exact reading below, which is both quieter and more useful.
 */
export function TimerDisplay({ remainingMs, mode, isRunning }: TimerDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p
        className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase"
        aria-hidden
      >
        {MODE_LABELS[mode]}
      </p>

      <p
        aria-hidden
        className={cn(
          // `tabular` is doing real work: without fixed-width figures the
          // digits shift horizontally every second and the whole ring jitters.
          'tabular font-semibold text-foreground',
          'text-[clamp(3rem,16vw,5.25rem)] leading-none',
          !isRunning && 'opacity-70',
        )}
      >
        {formatDuration(remainingMs)}
      </p>

      {/* Read on demand when a user navigates here, rather than pushed every
          second into a live region. */}
      <span className="sr-only">
        {MODE_LABELS[mode]}, {formatDurationSpoken(remainingMs)} remaining,{' '}
        {isRunning ? 'running' : 'paused'}.
      </span>
    </div>
  );
}
