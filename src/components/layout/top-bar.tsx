'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Keyboard, Settings as SettingsIcon, Timer } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from './theme-toggle';

export interface TopBarProps {
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export function TopBar({ onOpenSettings, onOpenShortcuts }: TopBarProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Timer className="size-5 text-accent-text" aria-hidden />
          <span>{siteConfig.name}</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            href="/stats"
            aria-current={pathname === '/stats' ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium',
              'transition-colors motion-reduce:transition-none',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              pathname === '/stats'
                ? 'bg-surface-hover text-foreground'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
            )}
          >
            <BarChart3 className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">Stats</span>
          </Link>

          <IconButton
            label="Keyboard shortcuts"
            icon={<Keyboard className="size-4.5" />}
            onClick={onOpenShortcuts}
            className="hidden sm:inline-flex"
          />
          <IconButton
            label="Settings"
            icon={<SettingsIcon className="size-4.5" />}
            onClick={onOpenSettings}
          />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
