'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type EngineEffect,
  type EngineEvent,
  type EngineState,
  createInitialState,
  reduce,
} from '@/lib/timer/engine';
import { DEFAULT_SETTINGS } from '@/config/defaults';
import { createId } from '@/lib/utils/id';
import { getTimeZone, toDayKey } from '@/lib/utils/time';
import type { SessionRecord } from '@/types';
import { createPersistStorage } from './persist-storage';
import { useSettingsStore } from './settings-store';
import { useSessionsStore } from './sessions-store';
import { useTasksStore } from './tasks-store';

/**
 * Handlers for the effects the engine returns.
 *
 * Registered by the React layer at mount. Keeping them injectable rather than
 * imported means the store has no dependency on audio, notifications, or the
 * DOM — the engine's effects stay plain data all the way to the edge, and tests
 * can drive the store with no browser APIs at all.
 */
export interface EffectHandlers {
  playAlarm: () => void;
  scheduleAlarm: (atEpochMs: number) => void;
  cancelAlarm: () => void;
  notify: (title: string, body: string) => void;
  announce: (message: string) => void;
  onAwayCompletion: (completedAt: number) => void;
}

let handlers: Partial<EffectHandlers> = {};

export function registerEffectHandlers(next: Partial<EffectHandlers>): () => void {
  handlers = { ...handlers, ...next };
  return () => {
    handlers = {};
  };
}

export interface TimerStore extends EngineState {
  hydrated: boolean;
  dispatch: (event: EngineEvent) => void;
}

function applyEffects(effects: EngineEffect[]): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'RECORD_SESSION': {
        const startedAt = new Date(effect.startedAt);
        const session: SessionRecord = {
          id: createId(),
          mode: effect.mode,
          startedAt: startedAt.toISOString(),
          endedAt: new Date(effect.endedAt).toISOString(),
          plannedMs: effect.plannedMs,
          actualMs: effect.actualMs,
          completed: effect.completed,
          interruptions: effect.interruptions,
          // Denormalised at write time, from the *local* day the session began.
          dayKey: toDayKey(startedAt),
          timeZone: getTimeZone(),
          ...(effect.wasAway && { wasAway: true }),
          ...(useTasksStore.getState().activeTaskId && effect.mode === 'focus'
            ? { taskId: useTasksStore.getState().activeTaskId as string }
            : {}),
        };
        useSessionsStore.getState().record(session);
        break;
      }
      case 'INCREMENT_TASK_POMODORO':
        useTasksStore.getState().incrementCompletedPomodoros(effect.taskId);
        break;
      case 'PLAY_ALARM':
        handlers.playAlarm?.();
        break;
      case 'SCHEDULE_ALARM':
        handlers.scheduleAlarm?.(effect.atEpochMs);
        break;
      case 'CANCEL_ALARM':
        handlers.cancelAlarm?.();
        break;
      case 'NOTIFY':
        handlers.notify?.(effect.title, effect.body);
        break;
      case 'ANNOUNCE':
        if (effect.message) handlers.announce?.(effect.message);
        break;
      case 'AWAY_COMPLETION':
        handlers.onAwayCompletion?.(effect.completedAt);
        break;
      default:
        effect satisfies never;
    }
  }
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(DEFAULT_SETTINGS),
      hydrated: false,

      dispatch: (event) => {
        const { hydrated: _hydrated, dispatch: _dispatch, ...state } = get();
        const result = reduce(state, event, {
          settings: useSettingsStore.getState().settings,
          now: Date.now(),
          mono: typeof performance !== 'undefined' ? performance.now() : Date.now(),
          activeTaskId: useTasksStore.getState().activeTaskId,
        });

        // State first, then effects: an effect handler that reads the store
        // must observe the post-transition value, not the one it replaced.
        set(result.state);
        applyEffects(result.effects);
      },
    }),
    {
      name: 'timer',
      version: 1,
      storage: createPersistStorage<Partial<EngineState>>('timer'),
      skipHydration: true,
      // `endsAt` and `anchor` are persisted deliberately: a reload mid-session
      // resumes against the original deadline rather than restarting. `anchor`
      // is dropped on read instead, because a monotonic reading from a previous
      // page load is meaningless in the new one.
      partialize: (state) => ({
        mode: state.mode,
        status: state.status,
        durationMs: state.durationMs,
        remainingMs: state.remainingMs,
        endsAt: state.endsAt,
        startedAt: state.startedAt,
        accruedMs: state.accruedMs,
        cyclesCompleted: state.cyclesCompleted,
        interruptions: state.interruptions,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<EngineState> | undefined;
        if (!saved) return current;

        const merged: TimerStore = { ...current, ...saved, anchor: null };

        // A session persisted as `running` needs its anchor re-established
        // against the current clocks, or the first tick would compare against
        // a monotonic origin from a previous page load and read as a huge skew.
        if (merged.status === 'running' && typeof merged.endsAt === 'number') {
          merged.anchor = {
            wall: Date.now(),
            mono: typeof performance !== 'undefined' ? performance.now() : Date.now(),
          };
        } else if (merged.status === 'running') {
          merged.status = 'paused';
        }
        return merged;
      },
      onRehydrateStorage: () => () => {
        useTimerStore.setState({ hydrated: true });
      },
    },
  ),
);
