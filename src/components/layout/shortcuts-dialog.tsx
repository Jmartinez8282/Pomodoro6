'use client';

import { Dialog, Kbd } from '@/components/ui';
import { SHORTCUTS } from '@/config/shortcuts';

export interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Shortcuts are ignored while you are typing, and can be turned off in Settings."
      size="sm"
    >
      <dl className="divide-y divide-border">
        {Object.entries(SHORTCUTS).map(([name, shortcut]) => (
          <div key={name} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm text-foreground">{shortcut.description}</dt>
            <dd>
              <Kbd>{shortcut.label}</Kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
