'use client';

import { cn } from '@/lib/utils/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Trailing hint, e.g. a duration. Included in the accessible name. */
  hint?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  /** Accessible name for the group. */
  label: string;
  className?: string;
}

/**
 * A one-of-N selector rendered as toggle buttons.
 *
 * Deliberately *not* the tabs pattern: `role="tablist"` promises a matching
 * `tabpanel` for every tab, and without one the `aria-controls` reference is
 * invalid — a critical failure that axe catches immediately.
 *
 * Also deliberately not `radiogroup`: in that pattern arrow keys both move
 * focus and change selection, so a screen reader user exploring the control
 * would switch timer mode — abandoning a running session — just by looking
 * around. Toggle buttons require an explicit Enter or Space, which is the right
 * trade for a destructive action.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center gap-1 rounded-full bg-surface-sunken p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled ?? false}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap sm:px-4',
              'transition-colors motion-reduce:transition-none',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              'disabled:pointer-events-none disabled:opacity-45',
              selected
                ? 'bg-surface text-foreground shadow-card'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {option.hint ? (
              <span className="tabular ml-1.5 hidden text-xs text-muted-foreground sm:inline">
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
