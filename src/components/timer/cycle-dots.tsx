import { cn } from '@/lib/utils/cn';

export interface CycleDotsProps {
  /** Focus sessions finished in the current run-up to a long break. */
  completed: number;
  /** Total focus sessions per long break. */
  total: number;
}

/**
 * Progress toward the next long break.
 *
 * The dots are decorative — the same information is given as text below them,
 * because conveying state through colour and shape alone fails WCAG 1.4.1.
 */
export function CycleDots({ completed, total }: CycleDotsProps) {
  const filled = Math.max(0, Math.min(completed, total));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              'size-1.5 rounded-full transition-colors duration-300 motion-reduce:transition-none',
              index < filled ? 'bg-accent' : 'bg-track',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {filled} of {total} until a long break
      </p>
    </div>
  );
}
