import type { AccentId, Settings } from '@/types';

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,

  autoStartBreaks: true,
  autoStartFocus: false,

  alarmSound: 'chime',
  alarmVolume: 0.6,
  ambientSound: 'none',
  ambientVolume: 0.35,
  ambientOnlyDuringFocus: true,

  theme: 'system',
  accent: 'sage',
  showSecondsInTitle: true,

  notificationsEnabled: false,
  shortcutsEnabled: true,
  reducedMotion: 'system',

  weekStartsOn: 1,
  dailyGoalMinutes: 120,
};

/** Bounds are enforced by the Zod schemas, not just the UI, so imported JSON
 *  and hand-edited localStorage go through the same gate as a slider drag. */
export const SETTINGS_LIMITS = {
  focusMinutes: { min: 1, max: 180 },
  shortBreakMinutes: { min: 1, max: 60 },
  longBreakMinutes: { min: 1, max: 60 },
  longBreakInterval: { min: 2, max: 12 },
  dailyGoalMinutes: { min: 15, max: 960 },
  estimatedPomodoros: { min: 0, max: 99 },
} as const;

export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_NOTES_MAX_LENGTH = 2000;

/** ~2 years of heavy use, comfortably inside the ~5MB localStorage quota. */
export const MAX_SESSIONS = 5000;

/** Sessions shorter than this are not worth recording — they are almost always
 *  a mis-click on start followed immediately by reset. */
export const MIN_RECORDABLE_MS = 1000;

/**
 * If the deadline passed more than this long ago, treat the completion as
 * having happened while the user was away: record it, but do not chime and do
 * not auto-start the next session.
 */
export const AWAY_THRESHOLD_MS = 30_000;

/**
 * Divergence between wall-clock and monotonic elapsed time above which we
 * assume the clock was adjusted rather than time having genuinely passed.
 * Two seconds is comfortably above normal scheduler jitter and well below any
 * meaningful NTP correction.
 */
export const CLOCK_SKEW_TOLERANCE_MS = 2000;

export const ACCENT_IDS: readonly AccentId[] = [
  'sage',
  'clay',
  'indigo',
  'plum',
  'amber',
] as const;

export const ACCENT_LABELS: Record<AccentId, string> = {
  sage: 'Sage',
  clay: 'Clay',
  indigo: 'Indigo',
  plum: 'Plum',
  amber: 'Amber',
};
