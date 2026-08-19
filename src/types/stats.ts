export interface DailyStat {
  /** YYYY-MM-DD, local. */
  dayKey: string;
  focusMs: number;
  breakMs: number;
  completedSessions: number;
  abandonedSessions: number;
  goalMs: number;
  goalMet: boolean;
}

export interface WeeklyStat {
  weekStart: string;
  days: DailyStat[];
  totalFocusMs: number;
  dailyAverageMs: number;
  bestDay: DailyStat | null;
}

export interface StreakInfo {
  /** Consecutive days meeting the daily goal, counting back from today. */
  current: number;
  longest: number;
  lastActiveDay: string | null;
  /** Yesterday met the goal but today hasn't yet — drives "keep it alive". */
  atRisk: boolean;
}

/** `level` is a quantile bucket, not a fixed threshold, so the heatmap reads
 *  well for a 20-minute-a-day user and a 6-hour-a-day user alike. */
export interface HeatmapCell {
  dayKey: string;
  focusMs: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface StatsSummary {
  today: DailyStat;
  week: WeeklyStat;
  streak: StreakInfo;
  /** Trailing 371 days, week-aligned so the grid starts on a full week. */
  heatmap: HeatmapCell[];
  totalFocusMs: number;
  totalSessions: number;
  averageSessionMs: number;
  /** 24 buckets — "you focus best at 10am". */
  focusByHour: number[];
  /** Drives the empty state. False for a brand-new user. */
  hasData: boolean;
}
