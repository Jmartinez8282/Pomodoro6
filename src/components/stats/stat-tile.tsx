import type * as React from 'react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
}

export function StatTile({ label, value, hint, icon, emphasis = false }: StatTileProps) {
  return (
    <Card padding="sm" variant={emphasis ? 'raised' : 'flat'}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p
            className={cn(
              'tabular mt-1.5 text-2xl font-semibold',
              emphasis ? 'text-accent-text' : 'text-foreground',
            )}
          >
            {value}
          </p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? (
          <span aria-hidden className="shrink-0 text-subtle-foreground">
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
