'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { useHydrated } from '@/hooks/use-hydrated';
import type { ThemeMode } from '@/types';

const order: ThemeMode[] = ['system', 'light', 'dark'];

const icons: Record<ThemeMode, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const labels: Record<ThemeMode, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  // Before hydration the resolved theme is unknown; rendering a guessed icon
  // would flash the wrong one. A neutral placeholder keeps the layout stable.
  const current: ThemeMode = hydrated && theme && theme in icons ? (theme as ThemeMode) : 'system';
  const Icon = icons[current];
  const next = order[(order.indexOf(current) + 1) % order.length] ?? 'system';

  return (
    <IconButton
      label={`${labels[current]}. Switch to ${labels[next].toLowerCase()}`}
      icon={<Icon className="size-4.5" />}
      onClick={() => setTheme(next)}
    />
  );
}
