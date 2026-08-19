'use client';

import { useId } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  /** Shown under the label; also wired to `aria-describedby`. */
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchProps) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div className={cn('flex items-start justify-between gap-4 py-1', className)}>
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full',
          'border-2 border-transparent transition-colors motion-reduce:transition-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-accent data-[state=unchecked]:bg-track',
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0',
            'transition-transform motion-reduce:transition-none',
            'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
}
