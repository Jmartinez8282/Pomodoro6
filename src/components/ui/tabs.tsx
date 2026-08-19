'use client';

import type * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Optional trailing hint, e.g. a duration. Not announced separately. */
  hint?: string;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  items: readonly TabItem<T>[];
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}

/**
 * A segmented tab control.
 *
 * `activationMode="manual"` is deliberate: with automatic activation, a screen
 * reader user arrowing through the list to explore it would *switch the timer
 * mode* on every keypress, discarding the running session. Manual mode means
 * arrows move focus and Enter/Space commits.
 */
export function Tabs<T extends string>({
  value,
  onValueChange,
  items,
  label,
  className,
}: TabsProps<T>) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      activationMode="manual"
      className={className}
    >
      <TabsPrimitive.List
        aria-label={label}
        className="inline-flex items-center gap-1 rounded-full bg-surface-sunken p-1"
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled ?? false}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap sm:px-4',
              'text-muted-foreground transition-colors motion-reduce:transition-none',
              'hover:text-foreground',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              'disabled:pointer-events-none disabled:opacity-45',
              'data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-card',
            )}
          >
            {item.label}
            {item.hint ? (
              <span className="tabular ml-1.5 text-xs text-subtle-foreground">{item.hint}</span>
            ) : null}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}

export const TabsContent: React.FC<TabsPrimitive.TabsContentProps> = TabsPrimitive.Content;
