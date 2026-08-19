'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  label: string;
  labelVisuallyHidden?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Generic over the value type, so a setting typed as a union stays a union
 * rather than widening to `string` the moment it passes through the control.
 */
export function Select<T extends string>({
  value,
  onValueChange,
  options,
  label,
  labelVisuallyHidden = false,
  disabled = false,
  className,
}: SelectProps<T>) {
  return (
    <div className={cn('space-y-2', className)}>
      <span
        className={cn(
          'block text-sm font-medium text-foreground',
          labelVisuallyHidden && 'sr-only',
        )}
      >
        {label}
      </span>
      <SelectPrimitive.Root
        value={value}
        onValueChange={(next) => onValueChange(next as T)}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          aria-label={label}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg',
            'border border-border bg-surface px-3 text-sm text-foreground',
            'hover:bg-surface-hover',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon>
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className={cn(
              'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
              'rounded-lg border border-border bg-surface shadow-overlay',
              'data-[state=open]:animate-scale-in motion-reduce:animate-none',
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex cursor-pointer items-center rounded-md py-2 pr-2 pl-8 text-sm',
                    'text-foreground outline-none select-none',
                    'data-highlighted:bg-surface-hover',
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center">
                    <Check className="size-4 text-accent-text" aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
