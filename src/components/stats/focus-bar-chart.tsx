'use client';

import type { DailyStat } from '@/types';
import { formatFocusTime } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

export interface FocusBarChartProps {
  days: readonly DailyStat[];
  /** Drawn as a dashed reference line across the plot. */
  goalMs: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Weekly focus time.
 *
 * Built from layout elements rather than SVG. A seven-bar chart needs no path
 * maths, and a stretched SVG (`preserveAspectRatio="none"`) distorts corner
 * radii into ovals — the kind of detail that quietly makes a UI look unfinished.
 * Bars inherit `--color-accent`, so the chart re-themes with everything else.
 *
 * The accessible representation is a table, not the bars: a screen reader user
 * gets exact numbers rather than a description of a picture of them.
 */
export function FocusBarChart({ days, goalMs }: FocusBarChartProps) {
  const max = Math.max(goalMs, ...days.map((day) => day.focusMs), 1);
  const goalPercent = goalMs > 0 && goalMs <= max ? (goalMs / max) * 100 : null;

  return (
    <figure className="space-y-3">
      <div className="relative flex h-40 items-end gap-1.5 sm:gap-3" aria-hidden>
        {goalPercent !== null ? (
          <div
            className="absolute inset-x-0 border-t border-dashed border-border-strong"
            style={{ bottom: `${goalPercent}%` }}
          />
        ) : null}

        {days.map((day) => {
          const height = (day.focusMs / max) * 100;
          return (
            <div key={day.dayKey} className="flex h-full flex-1 items-end justify-center">
              <div
                className={cn(
                  // Capped so the bars stay bars at desktop widths instead of
                  // becoming full-column blocks.
                  'w-full max-w-14 rounded-t-md transition-[height] duration-500 motion-reduce:transition-none',
                  // Always the accent. Colouring only goal-met days meant that
                  // a week of solid-but-short sessions rendered entirely grey,
                  // which reads as "no data" rather than "not quite there" —
                  // discouraging, and factually misleading. Meeting the goal is
                  // encoded as full strength instead.
                  'bg-accent',
                  day.goalMet ? 'opacity-100' : 'opacity-40',
                )}
                // A day with a few minutes on it should still show a sliver
                // rather than reading as an empty day.
                style={{ height: day.focusMs > 0 ? `max(${height}%, 3px)` : '0%' }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5 sm:gap-3" aria-hidden>
        {days.map((day) => (
          <span key={day.dayKey} className="flex-1 text-center text-xs text-muted-foreground">
            {DAY_LABELS[new Date(`${day.dayKey}T12:00:00`).getDay()]}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">
        <table>
          <caption>Focus time by day this week</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Focus time</th>
              <th scope="col">Goal met</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.dayKey}>
                <th scope="row">{day.dayKey}</th>
                <td>{formatFocusTime(day.focusMs)}</td>
                <td>{day.goalMet ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
