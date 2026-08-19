'use client';

import { useEffect } from 'react';
import { useSessionsStore } from '@/store/sessions-store';
import { useSettingsStore } from '@/store/settings-store';
import { useTasksStore } from '@/store/tasks-store';
import { useTimerStore } from '@/store/timer-store';

/**
 * Reads persisted state, once, after mount.
 *
 * Every store is created with `skipHydration: true`, so the server render and
 * the first client render both use defaults and produce identical HTML. This
 * component then pulls the real values in, which is why hydration mismatches
 * are structurally impossible here rather than merely unobserved.
 */
export function HydrationGate() {
  useEffect(() => {
    void Promise.all([
      useSettingsStore.persist.rehydrate(),
      useTasksStore.persist.rehydrate(),
      useSessionsStore.persist.rehydrate(),
      useTimerStore.persist.rehydrate(),
    ]);
  }, []);

  return null;
}
