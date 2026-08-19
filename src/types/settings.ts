import type { TimerMode } from './timer';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentId = 'sage' | 'clay' | 'indigo' | 'plum' | 'amber';
export type AlarmSoundId = 'chime' | 'bell' | 'marimba' | 'none';
export type AmbientSoundId = 'none' | 'rain' | 'brownNoise' | 'cafe';
export type ReducedMotionPreference = 'system' | 'reduce' | 'allow';

export interface Settings {
  /** Durations in minutes — the unit the user thinks in. Converted to ms at
   *  the edge so the engine only ever sees milliseconds. */
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** Focus sessions between long breaks. */
  longBreakInterval: number;

  autoStartBreaks: boolean;
  autoStartFocus: boolean;

  alarmSound: AlarmSoundId;
  alarmVolume: number;
  ambientSound: AmbientSoundId;
  ambientVolume: number;
  ambientOnlyDuringFocus: boolean;

  theme: ThemeMode;
  accent: AccentId;
  showSecondsInTitle: boolean;

  notificationsEnabled: boolean;
  shortcutsEnabled: boolean;
  reducedMotion: ReducedMotionPreference;

  /** 0 = Sunday, 1 = Monday. Drives the stats week grouping. */
  weekStartsOn: 0 | 1;
  dailyGoalMinutes: number;
}

export type DurationSettingKey = Extract<
  keyof Settings,
  'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes'
>;

export const MODE_DURATION_KEY: Record<TimerMode, DurationSettingKey> = {
  focus: 'focusMinutes',
  shortBreak: 'shortBreakMinutes',
  longBreak: 'longBreakMinutes',
};
