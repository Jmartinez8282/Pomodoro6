'use client';

import { useId } from 'react';
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
 * Weekly focus, as plain SVG.
 *
 * A charting library would add tens of kilobytes for one seven-bar chart whose
 * every visual decision we want to control anyway. Hand-rolling also means the
 * bars inherit `--color-accent`, so the chart re-themes with the rest of the UI
 * for free.
 *
 * The accessible representation is a table, not the SVG. A screen reader user
 * gets exact numbers instead of a described picture of them.
 */
export function FocusBarChart({ days, goalMs }: FocusBarChartProps) {
  const titleId = useId();
  const max = Math.max(goalMs, ...days.map((day) => day.focusMs), 1);

  return (
    <figure className="space-y-3">
      <div className="relative h-40 w-full">
        <svg
          viewBox="0 0 280 100"
          preserveAspectRatio="none"
          className="size-full overflow-visible"
          aria-labelledby={titleId}
          role="img"
        >
          <title id={titleId}>Focus time for each day this week</title>

          {goalMs > 0 && goalMs <= max ? (
            <line
              x1={0}
              x2={280}
              y1={100 - (goalMs / max) * 100}
              y2={100 - (goalMs / max) * 100}
              className="stroke-border-strong"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {days.map((day, index) => {
            const height = (day.focusMs / max) * 100;
            const width = 280 / days.length;
            const barWidth = width * 0.55;
            const x = index * width + (width - barWidth) / 2;

            return (
              <rect
                key={day.dayKey}
                x={x}
                y={100 - height}
                width={barWidth}
                height={Math.max(height, day.focusMs > 0 ? 1.5 : 0)}
                rx={2}
                className={cn(day.goalMet ? 'fill-accent' : 'fill-track')}
              />
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day) => (
          <span key={day.dayKey} className="text-xs text-muted-foreground">
            {DAY_LABELS[new Date(`${day.dayKey}T12:00:00`).getDay()]}
          </span>
        ))}
      </div>

      {/* The real accessible content. Visually hidden because the chart above
          already conveys it to sighted users. */}
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
