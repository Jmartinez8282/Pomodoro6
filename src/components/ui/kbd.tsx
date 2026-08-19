import type * as React from 'react';
import { cn } from '@/lib/utils/cn';

export function Kbd({ className, ...props }: React.ComponentPropsWithRef<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border',
        'bg-surface-sunken px-1.5 font-sans text-xs font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
