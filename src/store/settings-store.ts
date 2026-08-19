'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS } from '@/config/defaults';
import { parseSettings } from '@/lib/storage/schemas';
import type { Settings } from '@/types';
import { createPersistStorage } from './persist-storage';

export interface SettingsStore {
  settings: Settings;
  /** False until persisted values have been read; gates skeletons. */
  hydrated: boolean;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  patch: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      hydrated: false,

      set: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
      patch: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      reset: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'settings',
      version: 1,
      storage: createPersistStorage<{ settings: Settings }>('settings'),
      // Never touch storage during render. Server and first client render both
      // use DEFAULT_SETTINGS, so their output is identical and no hydration
      // mismatch is possible; real values land on the second paint.
      skipHydration: true,
      partialize: (state) => ({ settings: state.settings }),
      // Re-validate on read: persisted data is untrusted input.
      merge: (persisted, current) => ({
        ...current,
        settings: parseSettings((persisted as { settings?: unknown } | undefined)?.settings),
      }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);

export const selectSettings = (state: SettingsStore) => state.settings;
