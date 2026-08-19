'use client';

import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/store/settings-store';
import { useTimerStore } from '@/store/timer-store';
import type { TimerMode, TimerStatus } from '@/types';
import { clamp } from '@/lib/utils/time';
import { usePrefersReducedMotion } from './use-media-query';
import { useTimerTicker } from './use-timer-ticker';

export interface UseTimerResult {
  mode: TimerMode;
  status: TimerStatus;
  isRunning: boolean;
  /** Milliseconds left, recomputed from the deadline rather than accumulated. */
  remainingMs: number;
  /** Elapsed fraction 0..1 — the ring fills as time is spent. */
  progress: number;
  durationMs: number;
  cyclesCompleted: number;
  /** Focus sessions still to go before the next long break. */
  cyclesUntilLongBreak: number;

  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  setMode: (mode: TimerMode) => void;
}

/**
 * Binds the pure engine to React.
 *
 * Three clocks with distinct jobs, none of which is allowed to define truth:
 *   - the stored deadline is truth (arithmetic, immune to throttling);
 *   - the worker heartbeat notices the deadline passed while backgrounded;
 *   - `requestAnimationFrame` only smooths the display while visible.
 *
 * There is deliberately no state mirroring the countdown. While running, the
 * displayed value is *derived* from `endsAt` and a `now` that only ever changes
 * inside a callback; while stopped, it comes straight from the store. Keeping a
 * second copy in sync with an effect is exactly the pattern that made the
 * original implementation reset itself on every unrelated render.
 */
export function useTimer(): UseTimerResult {
  const dispatch = useTimerStore((state) => state.dispatch);
  const longBreakInterval = useSettingsStore((state) => state.settings.longBreakInterval);
  const reducedMotion = usePrefersReducedMotion();

  const { mode, status, durationMs, endsAt, storedRemainingMs, cyclesCompleted } = useTimerStore(
    useShallow((state) => ({
      mode: state.mode,
      status: state.status,
      durationMs: state.durationMs,
      endsAt: state.endsAt,
      storedRemainingMs: state.remainingMs,
      cyclesCompleted: state.cyclesCompleted,
    })),
  );

  const isRunning = status === 'running';

  // Advanced only from callbacks — never synchronously inside an effect body.
  const [now, setNow] = useState(() => Date.now());

  /** Recompute and let the engine notice a passed deadline. Idempotent. */
  const sync = useCallback(() => {
    setNow(Date.now());
    const state = useTimerStore.getState();
    if (state.status === 'running') state.dispatch({ type: 'TICK' });
  }, []);

  // Background-safe heartbeat: this is what completes a session whose deadline
  // passes while the tab is hidden.
  useTimerTicker(isRunning, sync);

  // Smooth display while visible. Under reduced motion the 1Hz worker tick is
  // enough — a continuously updating display is itself motion.
  useEffect(() => {
    if (!isRunning || reducedMotion) return;
    let frame = 0;
    let lastWhole = -1;

    const loop = () => {
      const current = Date.now();
      const whole = Math.ceil(
        Math.max(0, (useTimerStore.getState().endsAt ?? current) - current) / 1000,
      );
      // Commit only when the displayed second changes: re-rendering at 60Hz to
      // paint identical digits would be pure waste.
      if (whole !== lastWhole) {
        lastWhole = whole;
        setNow(current);
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isRunning, reducedMotion]);

  // Re-entry points. `pageshow` covers restoration from the back/forward cache,
  // where no other event fires and the tab can be minutes stale.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, [sync]);

  const remainingMs =
    isRunning && endsAt !== null ? clamp(endsAt - now, 0, durationMs) : storedRemainingMs;

  const progress = durationMs > 0 ? clamp(1 - remainingMs / durationMs, 0, 1) : 0;

  const completedInCycle = cyclesCompleted % longBreakInterval;

  return {
    mode,
    status,
    isRunning,
    remainingMs,
    progress,
    durationMs,
    cyclesCompleted,
    cyclesUntilLongBreak: longBreakInterval - completedInCycle,

    start: useCallback(() => dispatch({ type: 'START' }), [dispatch]),
    pause: useCallback(() => dispatch({ type: 'PAUSE' }), [dispatch]),
    toggle: useCallback(() => {
      dispatch({ type: useTimerStore.getState().status === 'running' ? 'PAUSE' : 'START' });
    }, [dispatch]),
    reset: useCallback(() => dispatch({ type: 'RESET' }), [dispatch]),
    skip: useCallback(() => dispatch({ type: 'SKIP' }), [dispatch]),
    setMode: useCallback(
      (next: TimerMode) => dispatch({ type: 'SET_MODE', mode: next }),
      [dispatch],
    ),
  };
}
