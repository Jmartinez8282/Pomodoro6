'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { useTimerStore } from '@/store/timer-store';

/**
 * Reflects app state onto `documentElement` as data attributes.
 *
 * The accent palette is driven entirely by `[data-accent]` and `[data-mode]` in
 * CSS, so switching timer mode repaints the ring, buttons, focus rings and
 * charts together from one attribute write — no colour values in JavaScript,
 * and no component needing to know what "focus" looks like.
 */
export function AppChrome() {
  const accent = useSettingsStore((state) => state.settings.accent);
  const reducedMotion = useSettingsStore((state) => state.settings.reducedMotion);
  const mode = useTimerStore((state) => state.mode);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  useEffect(() => {
    if (reducedMotion === 'system') {
      delete document.documentElement.dataset.reducedMotion;
    } else {
      document.documentElement.dataset.reducedMotion = reducedMotion;
    }
  }, [reducedMotion]);

  return null;
}
