/**
 * The timer engine: a pure reducer over `(state, event, context) -> {state, effects}`.
 *
 * Everything hard about a pomodoro timer lives here — background throttling,
 * machine sleep, clock tampering, long-break cadence, honest session accounting
 * — and none of it touches React, the DOM, or a global clock. `now` and `mono`
 * arrive as parameters, which means every scenario below is testable as a plain
 * function call with explicit timestamps: no fake timers, no jsdom, no flake.
 *
 * The host performs the returned effects. Keeping side effects as *data* is what
 * lets a test assert "exactly one session was recorded, with actualMs clamped"
 * instead of spying on an audio API.
 *
 * The governing rule: **`endsAt` is the only source of truth while running.**
 * Ticks exist to notice that the deadline passed. They never accumulate time.
 * The old implementation decremented a counter once per interval callback, so
 * every throttled or dropped callback silently lost a second.
 */
import {
  AWAY_THRESHOLD_MS,
  CLOCK_SKEW_TOLERANCE_MS,
  MIN_RECORDABLE_MS,
} from '@/config/defaults';
import type { ClockAnchor, Settings, TimerMode, TimerStatus } from '@/types';
import { MODE_DURATION_KEY } from '@/types';
import { clamp, minutesToMs } from '@/lib/utils/time';

export interface EngineState {
  mode: TimerMode;
  status: TimerStatus;
  /** Full length of the current session. */
  durationMs: number;
  /** Authoritative only when `status !== 'running'`. */
  remainingMs: number;
  /** Epoch ms. Authoritative when `status === 'running'`. */
  endsAt: number | null;
  /** Epoch ms of this session's first start; survives pauses. */
  startedAt: number | null;
  /** Focused ms banked from previous run stretches, excluding paused time. */
  accruedMs: number;
  /** Focus sessions completed since the last long break. */
  cyclesCompleted: number;
  /** Pause count for the current session — a quality signal for stats. */
  interruptions: number;
  anchor: ClockAnchor | null;
}

export type EngineEvent =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'SKIP' }
  | { type: 'SET_MODE'; mode: TimerMode }
  | { type: 'SETTINGS_CHANGED' }
  | { type: 'TICK' };

export type EngineEffect =
  | {
      type: 'RECORD_SESSION';
      mode: TimerMode;
      startedAt: number;
      endedAt: number;
      plannedMs: number;
      actualMs: number;
      completed: boolean;
      wasAway: boolean;
      interruptions: number;
    }
  | { type: 'INCREMENT_TASK_POMODORO'; taskId: string }
  | { type: 'PLAY_ALARM' }
  | { type: 'SCHEDULE_ALARM'; atEpochMs: number }
  | { type: 'CANCEL_ALARM' }
  | { type: 'NOTIFY'; title: string; body: string }
  | { type: 'ANNOUNCE'; message: string }
  | { type: 'AWAY_COMPLETION'; mode: TimerMode; completedAt: number };

export interface EngineContext {
  settings: Settings;
  /** `Date.now()`. */
  now: number;
  /** `performance.now()`. */
  mono: number;
  activeTaskId: string | null;
}

export interface EngineResult {
  state: EngineState;
  effects: EngineEffect[];
}

// ── Derivations ────────────────────────────────────────────────────────────

export function durationFor(mode: TimerMode, settings: Settings): number {
  return minutesToMs(settings[MODE_DURATION_KEY[mode]]);
}

/**
 * Which mode follows a completed one.
 *
 * A break is always followed by focus. Focus is followed by a long break when
 * the *completed* count — including the session just finished — lands on a
 * multiple of the interval.
 */
export function nextMode(state: EngineState, settings: Settings): TimerMode {
  if (state.mode !== 'focus') return 'focus';
  const completed = state.cyclesCompleted + 1;
  return completed % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
}

/** Remaining ms at an arbitrary instant. Safe to call at 60fps. */
export function remainingAt(state: EngineState, now: number): number {
  if (state.status !== 'running' || state.endsAt === null) {
    return clamp(state.remainingMs, 0, state.durationMs);
  }
  return clamp(state.endsAt - now, 0, state.durationMs);
}

/** Elapsed fraction, 0..1. The ring *fills* as time is spent. */
export function progressAt(state: EngineState, now: number): number {
  if (state.durationMs <= 0) return 0;
  return clamp(1 - remainingAt(state, now) / state.durationMs, 0, 1);
}

export function createInitialState(settings: Settings, mode: TimerMode = 'focus'): EngineState {
  const durationMs = durationFor(mode, settings);
  return {
    mode,
    status: 'idle',
    durationMs,
    remainingMs: durationMs,
    endsAt: null,
    startedAt: null,
    accruedMs: 0,
    cyclesCompleted: 0,
    interruptions: 0,
    anchor: null,
  };
}

// ── Internals ──────────────────────────────────────────────────────────────

function beginRun(state: EngineState, ctx: EngineContext, announce: string): EngineResult {
  const endsAt = ctx.now + state.remainingMs;
  return {
    state: {
      ...state,
      status: 'running',
      endsAt,
      startedAt: state.startedAt ?? ctx.now,
      anchor: { wall: ctx.now, mono: ctx.mono },
    },
    effects: [
      { type: 'SCHEDULE_ALARM', atEpochMs: endsAt },
      { type: 'ANNOUNCE', message: announce },
    ],
  };
}

/** A fresh, idle session in `mode`. */
function resetTo(state: EngineState, mode: TimerMode, settings: Settings): EngineState {
  const durationMs = durationFor(mode, settings);
  return {
    ...state,
    mode,
    status: 'idle',
    durationMs,
    remainingMs: durationMs,
    endsAt: null,
    startedAt: null,
    accruedMs: 0,
    interruptions: 0,
    anchor: null,
  };
}

/**
 * Focused ms banked so far, excluding paused stretches and never exceeding the
 * session length.
 *
 * The clamp is the line that stops a suspended laptop from inflating focus
 * time: if the lid was shut for an hour during a 25-minute session, the wall
 * clock says 60 minutes elapsed, and only the clamp keeps the ledger honest.
 */
function accruedThrough(state: EngineState, at: number): number {
  const thisRun = state.anchor ? Math.max(0, at - state.anchor.wall) : 0;
  return clamp(state.accruedMs + thisRun, 0, state.durationMs);
}

function completionMessage(finished: TimerMode, next: TimerMode, nextMs: number): string {
  const minutes = Math.round(nextMs / 60_000);
  const finishedLabel = finished === 'focus' ? 'Focus session' : 'Break';
  const nextLabel =
    next === 'focus' ? 'Focus' : next === 'shortBreak' ? 'Short break' : 'Long break';
  return `${finishedLabel} complete. ${nextLabel} started, ${minutes} minutes.`;
}

/**
 * The session reached its deadline.
 *
 * Credit is given to `endsAt`, never to `now`. If we only noticed an hour late
 * because the tab was frozen, the session still ended when it was supposed to.
 */
function completeSession(state: EngineState, ctx: EngineContext): EngineResult {
  const { settings } = ctx;
  const endedAt = state.endsAt ?? ctx.now;
  const startedAt = state.startedAt ?? endedAt;
  const actualMs = accruedThrough(state, endedAt);

  // How late are we noticing? Large means the tab was hidden or the machine
  // was asleep — nobody heard a chime and nobody is at the desk.
  const wasAway = ctx.now - endedAt > AWAY_THRESHOLD_MS;

  const effects: EngineEffect[] = [
    {
      type: 'RECORD_SESSION',
      mode: state.mode,
      startedAt,
      endedAt,
      plannedMs: state.durationMs,
      actualMs,
      completed: true,
      wasAway,
      interruptions: state.interruptions,
    },
  ];

  if (state.mode === 'focus' && ctx.activeTaskId) {
    effects.push({ type: 'INCREMENT_TASK_POMODORO', taskId: ctx.activeTaskId });
  }

  const cyclesCompleted =
    state.mode === 'focus' ? state.cyclesCompleted + 1 : state.cyclesCompleted;
  const upcoming = nextMode(state, settings);
  const advanced = resetTo({ ...state, cyclesCompleted }, upcoming, settings);

  if (wasAway) {
    // Do not fast-forward through the sessions that "would have" happened, and
    // do not auto-start: starting a focus session for someone who isn't at
    // their desk poisons the very statistics the app exists to produce.
    effects.push({ type: 'CANCEL_ALARM' });
    effects.push({ type: 'AWAY_COMPLETION', mode: state.mode, completedAt: endedAt });
    return { state: advanced, effects };
  }

  effects.push({ type: 'PLAY_ALARM' });
  effects.push({
    type: 'NOTIFY',
    title: state.mode === 'focus' ? 'Focus session complete' : 'Break over',
    body:
      state.mode === 'focus'
        ? `Time for a ${upcoming === 'longBreak' ? 'long' : 'short'} break.`
        : 'Ready for another focus session?',
  });
  effects.push({
    type: 'ANNOUNCE',
    message: completionMessage(state.mode, upcoming, advanced.durationMs),
  });

  const autoStart =
    upcoming === 'focus' ? settings.autoStartFocus : settings.autoStartBreaks;
  if (!autoStart) return { state: advanced, effects };

  const started = beginRun(advanced, ctx, '');
  // The completion announcement above already says the next session started;
  // a second announcement would double-speak it.
  return {
    state: started.state,
    effects: [...effects, ...started.effects.filter((e) => e.type !== 'ANNOUNCE')],
  };
}

/** Record a session the user cut short. */
function abandonEffects(state: EngineState, ctx: EngineContext): EngineEffect[] {
  if (state.status === 'idle' || state.startedAt === null) return [];
  const actualMs = accruedThrough(state, ctx.now);
  if (actualMs < MIN_RECORDABLE_MS) return [];
  return [
    {
      type: 'RECORD_SESSION',
      mode: state.mode,
      startedAt: state.startedAt,
      endedAt: ctx.now,
      plannedMs: state.durationMs,
      actualMs,
      completed: false,
      wasAway: false,
      interruptions: state.interruptions,
    },
  ];
}

// ── The reducer ────────────────────────────────────────────────────────────

export function reduce(
  state: EngineState,
  event: EngineEvent,
  ctx: EngineContext,
): EngineResult {
  const { settings } = ctx;

  switch (event.type) {
    case 'START':
    case 'RESUME': {
      if (state.status === 'running') return { state, effects: [] };
      const minutes = Math.round(state.remainingMs / 60_000);
      const label =
        state.mode === 'focus'
          ? 'Focus'
          : state.mode === 'shortBreak'
            ? 'Short break'
            : 'Long break';
      const message =
        state.status === 'paused'
          ? `Resumed. ${label}, ${minutes} minutes remaining.`
          : `${label} started, ${minutes} minutes.`;
      return beginRun(state, ctx, message);
    }

    case 'PAUSE': {
      if (state.status !== 'running') return { state, effects: [] };
      const remainingMs = remainingAt(state, ctx.now);
      return {
        state: {
          ...state,
          status: 'paused',
          remainingMs,
          accruedMs: accruedThrough(state, ctx.now),
          endsAt: null,
          anchor: null,
          interruptions: state.interruptions + 1,
        },
        effects: [
          { type: 'CANCEL_ALARM' },
          {
            type: 'ANNOUNCE',
            message: `Paused. ${Math.round(remainingMs / 60_000)} minutes remaining.`,
          },
        ],
      };
    }

    case 'RESET': {
      const effects = abandonEffects(state, ctx);
      return {
        state: resetTo(state, state.mode, settings),
        effects: [
          ...effects,
          { type: 'CANCEL_ALARM' },
          { type: 'ANNOUNCE', message: 'Timer reset.' },
        ],
      };
    }

    case 'SKIP': {
      const effects = abandonEffects(state, ctx);
      // Skipping a focus session does not earn a cycle — otherwise skipping
      // four times in a row would award a long break for no work done.
      const upcoming = state.mode === 'focus' ? 'shortBreak' : 'focus';
      const advanced = resetTo(state, upcoming, settings);
      return {
        state: advanced,
        effects: [
          ...effects,
          { type: 'CANCEL_ALARM' },
          {
            type: 'ANNOUNCE',
            message: `Skipped. ${upcoming === 'focus' ? 'Focus' : 'Short break'}, ${Math.round(
              advanced.durationMs / 60_000,
            )} minutes.`,
          },
        ],
      };
    }

    case 'SET_MODE': {
      if (event.mode === state.mode && state.status === 'idle') {
        return { state, effects: [] };
      }
      const effects = abandonEffects(state, ctx);
      return {
        state: resetTo(state, event.mode, settings),
        effects: [...effects, { type: 'CANCEL_ALARM' }],
      };
    }

    case 'SETTINGS_CHANGED': {
      // The headline bug in the original app: changing a duration mid-session
      // tore down the interval and reset the countdown. A running timer must be
      // left strictly alone — the new duration applies to the *next* session.
      if (state.status === 'running') return { state, effects: [] };

      const durationMs = durationFor(state.mode, settings);
      if (durationMs === state.durationMs) return { state, effects: [] };

      // Idle re-seeds to the new length. Paused keeps its remaining time (the
      // user is mid-session) but adopts the new total so progress stays sane.
      if (state.status === 'idle') {
        return { state: { ...state, durationMs, remainingMs: durationMs }, effects: [] };
      }
      return {
        state: { ...state, durationMs, remainingMs: Math.min(state.remainingMs, durationMs) },
        effects: [],
      };
    }

    case 'TICK': {
      if (state.status !== 'running' || state.endsAt === null || state.anchor === null) {
        return { state, effects: [] };
      }

      // Clock-tamper detection. Wall time and monotonic time should advance
      // together; when they diverge, one of two things happened:
      //   - the machine slept  -> mono froze, wall advanced  (real time passed)
      //   - the clock was set  -> wall jumped, mono did not  (no time passed)
      // Both look identical from the wall clock alone. We can only distinguish
      // a *backwards* jump with certainty, so that is the case we correct:
      // re-anchor rather than let a rewound clock stall the timer forever.
      const wallDelta = ctx.now - state.anchor.wall;
      const monoDelta = ctx.mono - state.anchor.mono;
      const skew = wallDelta - monoDelta;

      if (skew < -CLOCK_SKEW_TOLERANCE_MS) {
        // Clock moved backwards. Trust monotonic time and shift the deadline,
        // otherwise the session would appear to gain time out of nowhere.
        const correctedEndsAt = state.endsAt + skew;
        return {
          state: {
            ...state,
            endsAt: correctedEndsAt,
            anchor: { wall: ctx.now, mono: ctx.mono },
          },
          effects: [{ type: 'SCHEDULE_ALARM', atEpochMs: correctedEndsAt }],
        };
      }

      if (ctx.now < state.endsAt) {
        // Normal path: no state churn, so this is safe to call at any rate.
        return { state, effects: [] };
      }

      return completeSession(state, ctx);
    }

    default: {
      // Exhaustiveness guard: adding a case to EngineEvent without handling it
      // here becomes a compile error rather than a silent no-op at runtime.
      event satisfies never;
      return { state, effects: [] };
    }
  }
}
