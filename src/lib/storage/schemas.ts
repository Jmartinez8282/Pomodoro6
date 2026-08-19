/**
 * Runtime validation for everything read back from storage.
 *
 * Persisted data is *untrusted input*. It can be edited in devtools, corrupted
 * by a failed write, written by an older version of the app, or pasted in
 * through the JSON import. Parsing it with Zod on read — rather than casting
 * and hoping — is what stops a malformed `sessions` array from taking down the
 * stats page, and it is the same gate the import feature goes through.
 */
import { z } from 'zod';
import {
  DEFAULT_SETTINGS,
  MAX_SESSIONS,
  SETTINGS_LIMITS,
  TASK_NOTES_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
} from '@/config/defaults';
import type { SessionRecord, Settings, Task } from '@/types';

const isoDate = z.string().min(1).max(40);

export const timerModeSchema = z.enum(['focus', 'shortBreak', 'longBreak']);

export const settingsSchema = z.object({
  focusMinutes: z.number().int().min(SETTINGS_LIMITS.focusMinutes.min).max(SETTINGS_LIMITS.focusMinutes.max),
  shortBreakMinutes: z.number().int().min(SETTINGS_LIMITS.shortBreakMinutes.min).max(SETTINGS_LIMITS.shortBreakMinutes.max),
  longBreakMinutes: z.number().int().min(SETTINGS_LIMITS.longBreakMinutes.min).max(SETTINGS_LIMITS.longBreakMinutes.max),
  longBreakInterval: z.number().int().min(SETTINGS_LIMITS.longBreakInterval.min).max(SETTINGS_LIMITS.longBreakInterval.max),
  autoStartBreaks: z.boolean(),
  autoStartFocus: z.boolean(),
  alarmSound: z.enum(['chime', 'bell', 'marimba', 'none']),
  alarmVolume: z.number().min(0).max(1),
  ambientSound: z.enum(['none', 'rain', 'brownNoise', 'cafe']),
  ambientVolume: z.number().min(0).max(1),
  ambientOnlyDuringFocus: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  accent: z.enum(['sage', 'clay', 'indigo', 'plum', 'amber']),
  showSecondsInTitle: z.boolean(),
  notificationsEnabled: z.boolean(),
  shortcutsEnabled: z.boolean(),
  reducedMotion: z.enum(['system', 'reduce', 'allow']),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  dailyGoalMinutes: z.number().int().min(SETTINGS_LIMITS.dailyGoalMinutes.min).max(SETTINGS_LIMITS.dailyGoalMinutes.max),
});

export const taskSchema = z.object({
  id: z.string().min(1).max(64),
  // Length caps are enforced here, not only in the form: imported JSON and
  // hand-edited storage must not be able to inject a megabyte of text into a
  // list item and destroy the layout.
  title: z.string().min(1).max(TASK_TITLE_MAX_LENGTH),
  notes: z.string().max(TASK_NOTES_MAX_LENGTH).optional(),
  estimatedPomodoros: z.number().int().min(0).max(99),
  completedPomodoros: z.number().int().min(0).max(999),
  isCompleted: z.boolean(),
  order: z.number(),
  createdAt: isoDate,
  updatedAt: isoDate,
  completedAt: isoDate.optional(),
});

export const sessionSchema = z.object({
  id: z.string().min(1).max(64),
  mode: timerModeSchema,
  startedAt: isoDate,
  endedAt: isoDate,
  plannedMs: z.number().min(0).max(24 * 3_600_000),
  actualMs: z.number().min(0).max(24 * 3_600_000),
  completed: z.boolean(),
  wasAway: z.boolean().optional(),
  taskId: z.string().max(64).optional(),
  interruptions: z.number().int().min(0).max(9999),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeZone: z.string().max(64),
});

export const tasksSchema = z.array(taskSchema).max(1000);
export const sessionsSchema = z.array(sessionSchema).max(MAX_SESSIONS);

/** The shape of the export/import file. */
export const backupSchema = z.object({
  version: z.number().int().min(1),
  exportedAt: isoDate,
  settings: settingsSchema.partial().optional(),
  tasks: tasksSchema.optional(),
  sessions: sessionsSchema.optional(),
});

export type Backup = z.infer<typeof backupSchema>;

/**
 * Parse with a fallback rather than throwing.
 *
 * A single corrupt record should cost the user that record, not the whole app.
 */
export function parseSettings(value: unknown): Settings {
  const result = settingsSchema.safeParse(value);
  if (result.success) return result.data;
  // Merge what is salvageable over the defaults so one bad field does not
  // discard every other preference the user has set. Undefined keys are
  // stripped first: spreading them would overwrite a good default with
  // `undefined` rather than leaving it in place.
  const partial = settingsSchema.partial().safeParse(value);
  if (!partial.success) return { ...DEFAULT_SETTINGS };
  const salvaged = Object.fromEntries(
    Object.entries(partial.data).filter(([, v]) => v !== undefined),
  ) as Partial<Settings>;
  return { ...DEFAULT_SETTINGS, ...salvaged };
}

export function parseTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];
  // Element-wise so one malformed task does not discard the whole list.
  return value.flatMap((item) => {
    const result = taskSchema.safeParse(item);
    return result.success ? [result.data as Task] : [];
  });
}

export function parseSessions(value: unknown): SessionRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      const result = sessionSchema.safeParse(item);
      return result.success ? [result.data as SessionRecord] : [];
    })
    .slice(-MAX_SESSIONS);
}
