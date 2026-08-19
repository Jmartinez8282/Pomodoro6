'use client';

import { useId, useMemo } from 'react';
import type { HeatmapCell } from '@/types';
import { formatFocusTime } from '@/lib/utils/time';

export interface ContributionHeatmapProps {
  cells: readonly HeatmapCell[];
  /** Weeks to display, counting back from today. */
  weeks?: number;
}

const CELL = 11;
const GAP = 3;

/**
 * A year of focus, one square per day.
 *
 * Colour comes from `--color-accent` at four opacities rather than four
 * hardcoded shades, so the ramp follows the user's chosen palette and both
 * themes without a second set of values to keep in sync.
 */
export function ContributionHeatmap({ cells, weeks = 26 }: ContributionHeatmapProps) {
  const titleId = useId();

  const visible = useMemo(() => {
    const count = weeks * 7;
    const slice = cells.slice(-count);
    // Pad the front so the grid always starts on a whole week and columns line
    // up with weekday rows.
    const offset = new Date(`${slice[0]?.dayKey ?? '1970-01-01'}T12:00:00`).getDay();
    return { slice, offset };
  }, [cells, weeks]);

  const columns = Math.ceil((visible.slice.length + visible.offset) / 7);
  const width = columns * (CELL + GAP);
  const height = 7 * (CELL + GAP);

  const totalMs = visible.slice.reduce((sum, cell) => sum + cell.focusMs, 0);
  const activeDays = visible.slice.filter((cell) => cell.focusMs > 0).length;

  return (
    <figure className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-labelledby={titleId}
          className="max-w-none"
        >
          <title id={titleId}>
            {`Focus activity over the last ${weeks} weeks: ${formatFocusTime(totalMs)} across ${activeDays} days`}
          </title>

          {visible.slice.map((cell, index) => {
            const position = index + visible.offset;
            const column = Math.floor(position / 7);
            const row = position % 7;

            return (
              <rect
                key={cell.dayKey}
                x={column * (CELL + GAP)}
                y={row * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2.5}
                className={cell.level === 0 ? 'fill-track' : 'fill-accent'}
                // Four steps of one accent, rather than four separate colours:
                // one variable drives the whole ramp in both themes.
                opacity={cell.level === 0 ? 1 : 0.25 + cell.level * 0.1875}
              >
                <title>{`${cell.dayKey}: ${formatFocusTime(cell.focusMs)}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            aria-hidden
            className={`size-2.5 rounded-sm ${level === 0 ? 'bg-track' : 'bg-accent'}`}
            style={level === 0 ? undefined : { opacity: 0.25 + level * 0.1875 }}
          />
        ))}
        <span>More</span>
      </div>
    </figure>
  );
}
