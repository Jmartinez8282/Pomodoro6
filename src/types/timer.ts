/** The three kinds of session the timer can run. */
export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

/**
 * `idle`      — nothing running; `remainingMs` holds a full session
 * `running`   — counting down; `endsAt` is authoritative
 * `paused`    — stopped mid-session; `remainingMs` is authoritative
 * `completed` — transient, only observed inside the reducer
 */
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export const TIMER_MODES: readonly TimerMode[] = ['focus', 'shortBreak', 'longBreak'] as const;

export const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

/**
 * The wall/monotonic clock pair captured when a run starts.
 *
 * Both are needed because neither alone is trustworthy:
 *   - `Date.now()` advances across machine sleep but can be moved by the user,
 *     by NTP correction, or by a DST change.
 *   - `performance.now()` cannot be tampered with, but on some platforms
 *     (notably Chrome on macOS) it does *not* advance while the machine is
 *     suspended — an hour of sleep reads as zero elapsed time.
 *
 * Comparing their deltas is what lets the engine tell "the laptop was asleep"
 * apart from "someone changed the clock", which are the same event from the
 * perspective of either clock on its own.
 */
export interface ClockAnchor {
  /** `Date.now()` at capture. */
  wall: number;
  /** `performance.now()` at capture. */
  mono: number;
}
