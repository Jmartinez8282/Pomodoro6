import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/config/defaults';
import type { SessionRecord, Settings } from '@/types';
import { toDayKey } from '@/lib/utils/time';
import { computeStats } from './aggregate';

const MIN = 60_000;

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

/** Build a focus session on a given local day. */
function session(dayKey: string, minutes: number, overrides: Partial<SessionRecord> = {}): SessionRecord {
  const started = new Date(`${dayKey}T10:00:00`);
  return {
    id: `${dayKey}-${minutes}-${Math.random()}`,
    mode: 'focus',
    startedAt: started.toISOString(),
    endedAt: new Date(started.getTime() + minutes * MIN).toISOString(),
    plannedMs: minutes * MIN,
    actualMs: minutes * MIN,
    completed: true,
    interruptions: 0,
    dayKey,
    timeZone: 'UTC',
    ...overrides,
  };
}

const NOW = new Date('2026-03-15T12:00:00');
const TODAY = toDayKey(NOW);

describe('computeStats', () => {
  it('reports no data for a brand-new user', () => {
    const stats = computeStats([], settings(), NOW);

    expect(stats.hasData).toBe(false);
    expect(stats.totalSessions).toBe(0);
    expect(stats.today.focusMs).toBe(0);
    expect(stats.streak.current).toBe(0);
    // The heatmap still renders a full grid, so an empty state is a design
    // decision rather than a crash.
    expect(stats.heatmap).toHaveLength(371);
    expect(stats.heatmap.every((cell) => cell.level === 0)).toBe(true);
  });

  it('sums only focus time into the daily total', () => {
    const stats = computeStats(
      [
        session(TODAY, 25),
        session(TODAY, 25),
        { ...session(TODAY, 5), mode: 'shortBreak' },
      ],
      settings(),
      NOW,
    );

    expect(stats.today.focusMs).toBe(50 * MIN);
    expect(stats.today.breakMs).toBe(5 * MIN);
    expect(stats.totalSessions).toBe(2);
  });

  it('counts abandoned sessions separately but still credits the time spent', () => {
    const stats = computeStats(
      [session(TODAY, 25), session(TODAY, 8, { completed: false })],
      settings(),
      NOW,
    );

    expect(stats.today.completedSessions).toBe(1);
    expect(stats.today.abandonedSessions).toBe(1);
    // Eight minutes of real focus is still eight minutes of focus.
    expect(stats.today.focusMs).toBe(33 * MIN);
  });

  it('marks the goal met only once the threshold is crossed', () => {
    const under = computeStats([session(TODAY, 60)], settings({ dailyGoalMinutes: 120 }), NOW);
    expect(under.today.goalMet).toBe(false);

    const over = computeStats(
      [session(TODAY, 60), session(TODAY, 60)],
      settings({ dailyGoalMinutes: 120 }),
      NOW,
    );
    expect(over.today.goalMet).toBe(true);
  });
});

describe('streaks', () => {
  const goal = settings({ dailyGoalMinutes: 30 });

  it('counts consecutive goal-meeting days back from today', () => {
    const stats = computeStats(
      [
        session('2026-03-15', 40),
        session('2026-03-14', 40),
        session('2026-03-13', 40),
      ],
      goal,
      NOW,
    );
    expect(stats.streak.current).toBe(3);
  });

  it('does not break the streak just because today is still in progress', () => {
    // Yesterday and the day before met the goal; today has not yet. The streak
    // is still alive — punishing someone at 9am for not having finished their
    // day would be both wrong and demoralising.
    const stats = computeStats(
      [session('2026-03-14', 40), session('2026-03-13', 40)],
      goal,
      NOW,
    );

    expect(stats.streak.current).toBe(2);
    expect(stats.streak.atRisk).toBe(true);
  });

  it('breaks the streak on a missed day', () => {
    const stats = computeStats(
      [session('2026-03-15', 40), session('2026-03-13', 40), session('2026-03-12', 40)],
      goal,
      NOW,
    );
    expect(stats.streak.current).toBe(1);
    expect(stats.streak.longest).toBe(2);
  });

  it('ignores days that fell short of the goal', () => {
    const stats = computeStats(
      [session('2026-03-15', 40), session('2026-03-14', 10), session('2026-03-13', 40)],
      goal,
      NOW,
    );
    expect(stats.streak.current).toBe(1);
  });

  it('survives a DST boundary without dropping a day', () => {
    // US DST began 2026-03-08. Day arithmetic anchored at midnight would shift
    // by an hour here and land on the wrong date, silently breaking the streak.
    const stats = computeStats(
      [
        session('2026-03-09', 40),
        session('2026-03-08', 40),
        session('2026-03-07', 40),
        session('2026-03-06', 40),
      ],
      goal,
      new Date('2026-03-09T12:00:00'),
    );
    expect(stats.streak.current).toBe(4);
  });
});

describe('weekly rollup', () => {
  it('always returns seven days, including empty ones', () => {
    const stats = computeStats([session(TODAY, 25)], settings(), NOW);
    expect(stats.week.days).toHaveLength(7);
    expect(stats.week.days.filter((day) => day.focusMs === 0).length).toBe(6);
  });

  it('averages over active days rather than all seven', () => {
    // Averaging across the whole week would make two solid days look like a
    // poor week, which is the opposite of encouraging.
    const stats = computeStats(
      [session('2026-03-09', 60), session('2026-03-10', 120)],
      settings({ weekStartsOn: 1 }),
      new Date('2026-03-13T12:00:00'),
    );

    expect(stats.week.totalFocusMs).toBe(180 * MIN);
    expect(stats.week.dailyAverageMs).toBe(90 * MIN);
    expect(stats.week.bestDay?.dayKey).toBe('2026-03-10');
  });

  it('honours the configured week start', () => {
    const monday = computeStats([], settings({ weekStartsOn: 1 }), new Date('2026-03-15T12:00:00'));
    const sunday = computeStats([], settings({ weekStartsOn: 0 }), new Date('2026-03-15T12:00:00'));
    // 2026-03-15 is a Sunday.
    expect(monday.week.weekStart).toBe('2026-03-09');
    expect(sunday.week.weekStart).toBe('2026-03-15');
  });
});

describe('heatmap', () => {
  it('scales intensity to the user rather than to fixed thresholds', () => {
    // A light user's best day and a heavy user's best day should both read as
    // level 4, or the chart is useless for one of them.
    const light = computeStats(
      [session('2026-03-15', 20), session('2026-03-14', 10), session('2026-03-13', 5)],
      settings(),
      NOW,
    );
    const heavy = computeStats(
      [session('2026-03-15', 400), session('2026-03-14', 200), session('2026-03-13', 100)],
      settings(),
      NOW,
    );

    const busiest = (stats: ReturnType<typeof computeStats>) =>
      stats.heatmap.find((cell) => cell.dayKey === '2026-03-15')?.level;

    expect(busiest(light)).toBe(4);
    expect(busiest(heavy)).toBe(4);
  });

  it('leaves days with no sessions at level zero', () => {
    const stats = computeStats([session(TODAY, 25)], settings(), NOW);
    const yesterday = stats.heatmap.find((cell) => cell.dayKey === '2026-03-14');
    expect(yesterday?.level).toBe(0);
    expect(yesterday?.focusMs).toBe(0);
  });

  it('ends on today', () => {
    const stats = computeStats([], settings(), NOW);
    expect(stats.heatmap.at(-1)?.dayKey).toBe(TODAY);
  });
});

describe('focus by hour', () => {
  it('buckets sessions into the local hour they started', () => {
    const at = (hour: number) => ({
      ...session(TODAY, 25),
      startedAt: new Date(`${TODAY}T${String(hour).padStart(2, '0')}:00:00`).toISOString(),
    });

    const stats = computeStats([at(9), at(9), at(14)], settings(), NOW);

    expect(stats.focusByHour).toHaveLength(24);
    expect(stats.focusByHour[9]).toBe(50 * MIN);
    expect(stats.focusByHour[14]).toBe(25 * MIN);
    expect(stats.focusByHour[0]).toBe(0);
  });
});
