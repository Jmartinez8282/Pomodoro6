'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils/cn';

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  /** Fired once on release — use for persisting, so a drag writes once. */
  onValueCommit?: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Accessible name. Required: an unlabelled slider is unusable. */
  label: string;
  /** Hide the visual label when a neighbouring element already names it. */
  labelVisuallyHidden?: boolean;
  /**
   * Spoken value. Without this a duration slider announces "25", not
   * "25 minutes", which is ambiguous when several sliders sit together.
   */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Replaces `react-slider`, which the original app used with a `valu=` typo that
 * silently left both sliders uncontrolled. A typed `value` prop makes that
 * particular mistake a compile error rather than a subtle runtime bug.
 */
export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  label,
  labelVisuallyHidden = false,
  formatValue,
  disabled = false,
  className,
  id,
}: SliderProps) {
  const display = formatValue ? formatValue(value) : String(value);

  return (
    <div className={cn('space-y-2', className)}>
      <div className={cn('flex items-baseline justify-between gap-3', labelVisuallyHidden && 'sr-only')}>
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <span className="tabular text-sm text-muted-foreground">{display}</span>
      </div>

      <SliderPrimitive.Root
        id={id}
        value={[value]}
        onValueChange={([next]) => next !== undefined && onValueChange(next)}
        onValueCommit={([next]) => next !== undefined && onValueCommit?.(next)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={display}
        className="relative flex h-5 w-full touch-none items-center select-none data-disabled:opacity-50"
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-track">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'block size-5 rounded-full border-2 border-accent bg-surface shadow-card',
            'transition-transform hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          )}
        />
      </SliderPrimitive.Root>
    </div>
  );
}
