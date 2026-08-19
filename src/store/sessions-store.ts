'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MAX_SESSIONS } from '@/config/defaults';
import { parseSessions } from '@/lib/storage/schemas';
import type { SessionRecord } from '@/types';
import { createPersistStorage } from './persist-storage';

export interface SessionsStore {
  /** Append-only, ascending by `startedAt`. Every statistic derives from this. */
  sessions: SessionRecord[];
  hydrated: boolean;
  record: (session: SessionRecord) => void;
  clear: () => void;
  replaceAll: (sessions: SessionRecord[]) => void;
}

export const useSessionsStore = create<SessionsStore>()(
  persist(
    (set) => ({
      sessions: [],
      hydrated: false,

      record: (session) =>
        set((state) => ({
          // FIFO eviction keeps the ledger comfortably inside the storage
          // quota. At the cap this is roughly two years of heavy daily use.
          sessions: [...state.sessions, session].slice(-MAX_SESSIONS),
        })),

      clear: () => set({ sessions: [] }),
      replaceAll: (sessions) => set({ sessions: sessions.slice(-MAX_SESSIONS) }),
    }),
    {
      name: 'sessions',
      version: 1,
      storage: createPersistStorage<Pick<SessionsStore, 'sessions'>>('sessions'),
      skipHydration: true,
      partialize: (state) => ({ sessions: state.sessions }),
      merge: (persisted, current) => ({
        ...current,
        sessions: parseSessions((persisted as { sessions?: unknown } | undefined)?.sessions),
      }),
      onRehydrateStorage: () => () => {
        useSessionsStore.setState({ hydrated: true });
      },
    },
  ),
);
