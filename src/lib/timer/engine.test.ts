/**
 * Engine tests.
 *
 * Note what is absent: `vi.useFakeTimers()`. Because the engine takes `now` and
 * `mono` as parameters, "the laptop slept for an hour" is expressed by passing a
 * timestamp an hour later. That makes the hardest scenarios in the app the
 * *easiest* ones to test, and removes the timer-mocking flake that usually
 * makes these suites unreliable.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/config/defaults';
import type { Settings } from '@/types';
import {
  type EngineContext,
  type EngineEffect,
  type EngineEvent,
  type EngineState,
  createInitialState,
  durationFor,
  nextMode,
  progressAt,
  reduce,
  remainingAt,
} from './engine';

const T0 = 1_700_000_000_000; // fixed epoch; no dependence on the real clock
const MIN = 60_000;

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function ctx(now: number, overrides: Partial<EngineContext> = {}): EngineContext {
  return {
    settings: settings(),
    now,
    // Monotonic clock tracks wall time unless a test deliberately diverges them.
    mono: now - T0,
    activeTaskId: null,
    ...overrides,
  };
}

/** Apply a sequence of events, threading state and collecting every effect. */
function run(
  state: EngineState,
  steps: Array<{ event: EngineEvent; at: number; ctx?: Partial<EngineContext> }>,
): { state: EngineState; effects: EngineEffect[] } {
  let current = state;
  const effects: EngineEffect[] = [];
  for (const step of steps) {
    const result = reduce(current, step.event, ctx(step.at, step.ctx));
    current = result.state;
    effects.push(...result.effects);
  }
  return { state: current, effects };
}

const sessionsOf = (effects: EngineEffect[]) =>
  effects.filter((e) => e.type === 'RECORD_SESSION');

describe('derivations', () => {
  it('maps each mode to its configured duration', () => {
    const s = settings({ focusMinutes: 30, shortBreakMinutes: 7, longBreakMinutes: 20 });
    expect(durationFor('focus', s)).toBe(30 * MIN);
    expect(durationFor('shortBreak', s)).toBe(7 * MIN);
    expect(durationFor('longBreak', s)).toBe(20 * MIN);
  });

  it('fills the ring as time is spent rather than draining it', () => {
    // The original app computed `secondsLeft / total`, so the ring emptied.
    const state = createInitialState(settings());
    const started = reduce(state, { type: 'START' }, ctx(T0)).state;

    expect(progressAt(started, T0)).toBe(0);
    expect(progressAt(started, T0 + 12.5 * MIN)).toBeCloseTo(0.5, 5);
    expect(progressAt(started, T0 + 25 * MIN)).toBe(1);
  });

  it('clamps remaining time at both ends', () => {
    const started = reduce(createInitialState(settings()), { type: 'START' }, ctx(T0)).state;
    expect(remainingAt(started, T0 + 99 * MIN)).toBe(0);
    expect(remainingAt(started, T0 - 99 * MIN)).toBe(25 * MIN);
  });
});

describe('start / pause / resume', () => {
  it('preserves remaining time across a pause of arbitrary length', () => {
    const { state } = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0 },
      { event: { type: 'PAUSE' }, at: T0 + 10 * MIN },
    ]);

    expect(state.status).toBe('paused');
    expect(state.remainingMs).toBe(15 * MIN);

    // Idle for an hour while paused, then resume: the deadline shifts by the
    // full hour, and remaining time is untouched.
    const resumed = reduce(state, { type: 'RESUME' }, ctx(T0 + 70 * MIN)).state;
    expect(resumed.endsAt).toBe(T0 + 85 * MIN);
    expect(remainingAt(resumed, T0 + 70 * MIN)).toBe(15 * MIN);
  });

  it('counts pauses as interruptions and excludes paused time from actual focus', () => {
    const { state, effects } = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0 },
      { event: { type: 'PAUSE' }, at: T0 + 5 * MIN },
      { event: { type: 'RESUME' }, at: T0 + 60 * MIN }, // 55 min away from the desk
      { event: { type: 'TICK' }, at: T0 + 80 * MIN }, // 20 more min of focus
    ]);

    const [session] = sessionsOf(effects);
    expect(session).toBeDefined();
    expect(session?.interruptions).toBe(1);
    // 5 + 20 minutes of real focus — the 55-minute pause is not credited.
    expect(session?.actualMs).toBe(25 * MIN);
    expect(state.status).toBe('running'); // autoStartBreaks defaults on
  });

  it('ignores START while already running', () => {
    const started = reduce(createInitialState(settings()), { type: 'START' }, ctx(T0)).state;
    const again = reduce(started, { type: 'START' }, ctx(T0 + MIN));
    expect(again.state).toBe(started);
    expect(again.effects).toEqual([]);
  });
});

describe('completion', () => {
  it('records exactly one session with an honest duration', () => {
    const { effects } = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0 },
      { event: { type: 'TICK' }, at: T0 + 25 * MIN },
    ]);

    const sessions = sessionsOf(effects);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      mode: 'focus',
      completed: true,
      wasAway: false,
      actualMs: 25 * MIN,
      plannedMs: 25 * MIN,
    });
    expect(effects.some((e) => e.type === 'PLAY_ALARM')).toBe(true);
  });

  it('credits the active task, and only on focus sessions', () => {
    const focus = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0, ctx: { activeTaskId: 'task-1' } },
      { event: { type: 'TICK' }, at: T0 + 25 * MIN, ctx: { activeTaskId: 'task-1' } },
    ]);
    expect(focus.effects).toContainEqual({
      type: 'INCREMENT_TASK_POMODORO',
      taskId: 'task-1',
    });

    const brk = run(createInitialState(settings(), 'shortBreak'), [
      { event: { type: 'START' }, at: T0, ctx: { activeTaskId: 'task-1' } },
      { event: { type: 'TICK' }, at: T0 + 5 * MIN, ctx: { activeTaskId: 'task-1' } },
    ]);
    expect(brk.effects.some((e) => e.type === 'INCREMENT_TASK_POMODORO')).toBe(false);
  });

  it('is idempotent: ticking repeatedly at the deadline completes once', () => {
    const started = reduce(createInitialState(settings()), { type: 'START' }, ctx(T0)).state;
    let state = started;
    const effects: EngineEffect[] = [];
    for (let i = 0; i < 50; i++) {
      const result = reduce(state, { type: 'TICK' }, ctx(T0 + 25 * MIN + i));
      state = result.state;
      effects.push(...result.effects);
    }
    expect(sessionsOf(effects)).toHaveLength(1);
  });

  it('does not churn state on ticks before the deadline', () => {
    const started = reduce(createInitialState(settings()), { type: 'START' }, ctx(T0)).state;
    const ticked = reduce(started, { type: 'TICK' }, ctx(T0 + 10 * MIN));
    // Identity equality: a tick that changes nothing must not produce a new
    // object, or every subscriber re-renders once a second for no reason.
    expect(ticked.state).toBe(started);
    expect(ticked.effects).toEqual([]);
  });
});

describe('long-break cadence', () => {
  it('gives a long break on the 4th focus session, then starts the cycle over', () => {
    const s = settings({ longBreakInterval: 4, autoStartBreaks: false, autoStartFocus: false });
    let state = createInitialState(s);
    const observed: string[] = [];

    for (let i = 0; i < 8; i++) {
      const duration = durationFor(state.mode, s);
      const startedAt = T0 + i * 100 * MIN;
      state = reduce(state, { type: 'START' }, { ...ctx(startedAt), settings: s }).state;
      state = reduce(
        state,
        { type: 'TICK' },
        { ...ctx(startedAt + duration), settings: s },
      ).state;
      observed.push(state.mode);
    }

    // focus -> short -> focus -> short -> focus -> short -> focus -> LONG
    expect(observed).toEqual([
      'shortBreak',
      'focus',
      'shortBreak',
      'focus',
      'shortBreak',
      'focus',
      'longBreak',
      'focus',
    ]);
  });

  it('does not award a cycle for a skipped focus session', () => {
    // Otherwise skipping four times in a row earns a long break for no work.
    const s = settings({ longBreakInterval: 4 });
    let state = createInitialState(s);
    for (let i = 0; i < 4; i++) {
      state = reduce(state, { type: 'SKIP' }, { ...ctx(T0 + i * MIN), settings: s }).state;
      if (state.mode !== 'focus') {
        state = reduce(state, { type: 'SKIP' }, { ...ctx(T0 + i * MIN + 1), settings: s }).state;
      }
    }
    expect(state.cyclesCompleted).toBe(0);
    expect(nextMode(state, s)).toBe('shortBreak');
  });
});

describe('machine sleep', () => {
  it('records one honest session and refuses to auto-start when the deadline passed while away', () => {
    // A 25-minute focus session; the lid was shut and reopened an hour later.
    const s = settings({ autoStartBreaks: true });
    const started = reduce(createInitialState(s), { type: 'START' }, ctx(T0)).state;

    const wake = T0 + 60 * MIN;
    const result = reduce(started, { type: 'TICK' }, {
      ...ctx(wake),
      // performance.now() does not advance across suspend on some platforms.
      mono: 1 * MIN,
      settings: s,
    });

    const sessions = sessionsOf(result.effects);
    expect(sessions).toHaveLength(1);

    const session = sessions[0];
    // Credited to the real deadline, not to wake time, and never more than planned.
    expect(session?.endedAt).toBe(T0 + 25 * MIN);
    expect(session?.actualMs).toBe(25 * MIN);
    expect(session?.wasAway).toBe(true);

    // No chime an hour late, and no focus session auto-started for an empty desk.
    expect(result.effects.some((e) => e.type === 'PLAY_ALARM')).toBe(false);
    expect(result.effects.some((e) => e.type === 'AWAY_COMPLETION')).toBe(true);
    expect(result.state.status).toBe('idle');
    expect(result.state.mode).toBe('shortBreak');
  });

  it('never inflates focus time beyond the session length', () => {
    const started = reduce(createInitialState(settings()), { type: 'START' }, ctx(T0)).state;
    const { effects } = run(started, [{ event: { type: 'TICK' }, at: T0 + 24 * 60 * MIN }]);
    const [session] = sessionsOf(effects);
    expect(session?.actualMs).toBeLessThanOrEqual(25 * MIN);
  });
});

describe('clock tampering', () => {
  it('re-anchors instead of stalling when the wall clock jumps backwards', () => {
    const started = reduce(createInitialState(settings()), { type: 'START' }, ctx(T0)).state;

    // 10 real minutes pass, then the clock is set back an hour.
    const result = reduce(started, { type: 'TICK' }, {
      ...ctx(T0 + 10 * MIN - 60 * MIN),
      mono: 10 * MIN,
    });

    // Without correction the deadline would sit an hour in the future and the
    // session would never end. The deadline moves with the clock instead.
    expect(result.state.endsAt).toBe(started.endsAt! - 60 * MIN);
    expect(result.state.anchor).not.toBeNull();
    expect(result.effects.some((e) => e.type === 'SCHEDULE_ALARM')).toBe(true);
  });

  it('tolerates ordinary scheduler jitter without re-anchoring', () => {
    const started = reduce(createInitialState(settings()), { type: 'START' }, ctx(T0)).state;
    const result = reduce(started, { type: 'TICK' }, {
      ...ctx(T0 + 5 * MIN),
      mono: 5 * MIN + 150, // 150ms of drift — well inside tolerance
    });
    expect(result.state).toBe(started);
  });
});

describe('settings changes', () => {
  it('leaves a running timer completely alone', () => {
    // This is the original app's headline bug: editing a duration mid-session
    // tore down the interval and reset the countdown to the new full length.
    const started = reduce(createInitialState(settings()), { type: 'START' }, ctx(T0)).state;

    const result = reduce(started, { type: 'SETTINGS_CHANGED' }, {
      ...ctx(T0 + 10 * MIN),
      settings: settings({ focusMinutes: 50 }),
    });

    expect(result.state).toBe(started);
    expect(remainingAt(result.state, T0 + 10 * MIN)).toBe(15 * MIN);
  });

  it('re-seeds an idle timer to the new duration', () => {
    const state = createInitialState(settings());
    const result = reduce(state, { type: 'SETTINGS_CHANGED' }, {
      ...ctx(T0),
      settings: settings({ focusMinutes: 50 }),
    });
    expect(result.state.durationMs).toBe(50 * MIN);
    expect(result.state.remainingMs).toBe(50 * MIN);
  });

  it('keeps a paused session mid-flight but adopts the new total', () => {
    const { state } = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0 },
      { event: { type: 'PAUSE' }, at: T0 + 20 * MIN }, // 5 min left
    ]);

    const shortened = reduce(state, { type: 'SETTINGS_CHANGED' }, {
      ...ctx(T0 + 21 * MIN),
      settings: settings({ focusMinutes: 3 }),
    });
    // Remaining can never exceed the session length, or progress goes negative.
    expect(shortened.state.durationMs).toBe(3 * MIN);
    expect(shortened.state.remainingMs).toBe(3 * MIN);
  });
});

describe('skip and reset', () => {
  it('records a partial session so focus time stays honest', () => {
    const { effects } = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0 },
      { event: { type: 'SKIP' }, at: T0 + 8 * MIN },
    ]);

    const [session] = sessionsOf(effects);
    expect(session).toMatchObject({ completed: false, actualMs: 8 * MIN });
  });

  it('records nothing for a session abandoned immediately', () => {
    const { effects } = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0 },
      { event: { type: 'RESET' }, at: T0 + 300 }, // a mis-click
    ]);
    expect(sessionsOf(effects)).toHaveLength(0);
  });

  it('records nothing when resetting a timer that never started', () => {
    const { effects } = run(createInitialState(settings()), [
      { event: { type: 'RESET' }, at: T0 },
    ]);
    expect(sessionsOf(effects)).toHaveLength(0);
  });

  it('restores the full duration on reset', () => {
    const { state } = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0 },
      { event: { type: 'RESET' }, at: T0 + 8 * MIN },
    ]);
    expect(state.status).toBe('idle');
    expect(state.remainingMs).toBe(25 * MIN);
    expect(state.interruptions).toBe(0);
  });
});

describe('mode switching', () => {
  it('banks a partial session when switching away mid-run', () => {
    const { state, effects } = run(createInitialState(settings()), [
      { event: { type: 'START' }, at: T0 },
      { event: { type: 'SET_MODE', mode: 'longBreak' }, at: T0 + 6 * MIN },
    ]);
    expect(sessionsOf(effects)[0]).toMatchObject({ completed: false, actualMs: 6 * MIN });
    expect(state.mode).toBe('longBreak');
    expect(state.remainingMs).toBe(15 * MIN);
  });

  it('is a no-op when selecting the mode already idle', () => {
    const state = createInitialState(settings());
    const result = reduce(state, { type: 'SET_MODE', mode: 'focus' }, ctx(T0));
    expect(result.state).toBe(state);
    expect(result.effects).toEqual([]);
  });
});
