/**
 * Derives every statistic from the session ledger.
 *
 * Nothing here is stored. Keeping stats as a pure function of the sessions
 * array means the charts can never disagree with the log, and there are no
 * denormalised counters to drift out of sync when a session is edited,
 * imported, or evicted.
 */
import type {
  DailyStat,
  HeatmapCell,
  SessionRecord,
  Settings,
  StatsSummary,
  StreakInfo,
  WeeklyStat,
} from '@/types';
import { addDays, daysBetween, minutesToMs, startOfWeek, toDayKey } from '@/lib/utils/time';

const HEATMAP_DAYS = 371; // 53 weeks, so the grid starts on a whole week

function emptyDay(dayKey: string, goalMs: number): DailyStat {
  return {
    dayKey,
    focusMs: 0,
    breakMs: 0,
    completedSessions: 0,
    abandonedSessions: 0,
    goalMs,
    goalMet: false,
  };
}

/** Group sessions by their recorded local day. */
function groupByDay(sessions: readonly SessionRecord[], goalMs: number): Map<string, DailyStat> {
  const days = new Map<string, DailyStat>();

  for (const session of sessions) {
    const day = days.get(session.dayKey) ?? emptyDay(session.dayKey, goalMs);

    if (session.mode === 'focus') {
      day.focusMs += session.actualMs;
      if (session.completed) day.completedSessions += 1;
      else day.abandonedSessions += 1;
    } else {
      day.breakMs += session.actualMs;
    }

    day.goalMet = day.focusMs >= goalMs;
    days.set(session.dayKey, day);
  }

  return days;
}

/**
 * Consecutive days meeting the daily goal, counting back from today.
 *
 * Today not yet meeting the goal does not break the streak — it is still in
 * progress. `atRisk` reports that case so the UI can nudge rather than punish.
 */
function computeStreak(days: Map<string, DailyStat>, today: string): StreakInfo {
  const metGoal = (dayKey: string) => days.get(dayKey)?.goalMet ?? false;

  let current = 0;
  let cursor = metGoal(today) ? today : addDays(today, -1);
  while (metGoal(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest run anywhere in history.
  const sortedKeys = [...days.keys()].filter((key) => days.get(key)?.goalMet).sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of sortedKeys) {
    run = previous !== null && daysBetween(previous, key) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = key;
  }

  const activeDays = [...days.keys()].sort();
  const lastActiveDay = activeDays.at(-1) ?? null;

  return {
    current,
    longest: Math.max(longest, current),
    lastActiveDay,
    atRisk: current > 0 && !metGoal(today),
  };
}

/**
 * Heatmap intensity by quantile rather than fixed thresholds.
 *
 * Fixed cutoffs make the chart useless at both ends: a 20-minute-a-day user
 * sees an entirely pale grid, a 6-hour-a-day user an entirely saturated one.
 * Bucketing against the user's own distribution keeps it readable for both.
 */
function computeHeatmap(days: Map<string, DailyStat>, today: string): HeatmapCell[] {
  const start = addDays(today, -(HEATMAP_DAYS - 1));
  const nonZero = [...days.values()]
    .map((day) => day.focusMs)
    .filter((ms) => ms > 0)
    .sort((a, b) => a - b);

  // Index across (n - 1) so the highest value sits strictly above q3 and lands
  // in the top bucket. Indexing across n would put the maximum *at* q3, leaving
  // level 4 unreachable and the user's best day looking mid-range.
  const quantile = (fraction: number): number => {
    if (nonZero.length === 0) return Infinity;
    const index = Math.floor(fraction * (nonZero.length - 1));
    return nonZero[index] ?? Infinity;
  };

  const q1 = quantile(0.25);
  const q2 = quantile(0.5);
  const q3 = quantile(0.75);

  // With no spread — one active day, or several identical ones — quantiles
  // collapse onto a single value. Rendering those as the palest shade would
  // suggest a bad day when it is in fact the user's only (and best) one.
  const flat = q1 === q3;

  const cells: HeatmapCell[] = [];
  for (let i = 0; i < HEATMAP_DAYS; i++) {
    const dayKey = addDays(start, i);
    const focusMs = days.get(dayKey)?.focusMs ?? 0;
    const level: HeatmapCell['level'] =
      focusMs === 0
        ? 0
        : flat
          ? 4
          : focusMs <= q1
            ? 1
            : focusMs <= q2
              ? 2
              : focusMs <= q3
                ? 3
                : 4;
    cells.push({ dayKey, focusMs, level });
  }
  return cells;
}

function computeWeek(
  days: Map<string, DailyStat>,
  today: string,
  settings: Settings,
  goalMs: number,
): WeeklyStat {
  const weekStart = startOfWeek(today, settings.weekStartsOn);
  const week: DailyStat[] = [];

  for (let i = 0; i < 7; i++) {
    const dayKey = addDays(weekStart, i);
    week.push(days.get(dayKey) ?? emptyDay(dayKey, goalMs));
  }

  const totalFocusMs = week.reduce((sum, day) => sum + day.focusMs, 0);
  const activeDays = week.filter((day) => day.focusMs > 0);
  const bestDay = week.reduce<DailyStat | null>(
    (best, day) => (day.focusMs > (best?.focusMs ?? 0) ? day : best),
    null,
  );

  return {
    weekStart,
    days: week,
    totalFocusMs,
    dailyAverageMs: activeDays.length > 0 ? Math.round(totalFocusMs / activeDays.length) : 0,
    bestDay,
  };
}

export function computeStats(
  sessions: readonly SessionRecord[],
  settings: Settings,
  now: Date = new Date(),
): StatsSummary {
  const goalMs = minutesToMs(settings.dailyGoalMinutes);
  const today = toDayKey(now);
  const days = groupByDay(sessions, goalMs);

  const focusSessions = sessions.filter((session) => session.mode === 'focus');
  const totalFocusMs = focusSessions.reduce((sum, session) => sum + session.actualMs, 0);

  const focusByHour = Array.from({ length: 24 }, () => 0);
  for (const session of focusSessions) {
    const hour = new Date(session.startedAt).getHours();
    focusByHour[hour] = (focusByHour[hour] ?? 0) + session.actualMs;
  }

  return {
    today: days.get(today) ?? emptyDay(today, goalMs),
    week: computeWeek(days, today, settings, goalMs),
    streak: computeStreak(days, today),
    heatmap: computeHeatmap(days, today),
    totalFocusMs,
    totalSessions: focusSessions.length,
    averageSessionMs:
      focusSessions.length > 0 ? Math.round(totalFocusMs / focusSessions.length) : 0,
    focusByHour,
    hasData: focusSessions.length > 0,
  };
}
