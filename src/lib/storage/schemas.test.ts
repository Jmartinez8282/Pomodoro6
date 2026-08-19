/**
 * Persisted data is untrusted input: it can be hand-edited in devtools, left
 * behind by an older version, truncated by a failed write, or pasted in through
 * the JSON import. These tests pin the "degrade, never crash" contract.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, MAX_SESSIONS, TASK_TITLE_MAX_LENGTH } from '@/config/defaults';
import { parseSessions, parseSettings, parseTasks } from './schemas';

const validTask = {
  id: 'task-1',
  title: 'Write the plan',
  estimatedPomodoros: 3,
  completedPomodoros: 1,
  isCompleted: false,
  order: 1000,
  createdAt: '2026-03-15T10:00:00.000Z',
  updatedAt: '2026-03-15T10:00:00.000Z',
};

const validSession = {
  id: 'session-1',
  mode: 'focus' as const,
  startedAt: '2026-03-15T10:00:00.000Z',
  endedAt: '2026-03-15T10:25:00.000Z',
  plannedMs: 1_500_000,
  actualMs: 1_500_000,
  completed: true,
  interruptions: 0,
  dayKey: '2026-03-15',
  timeZone: 'UTC',
};

describe('parseSettings', () => {
  it('returns defaults for anything unusable', () => {
    for (const input of [null, undefined, 'not an object', 42, []]) {
      expect(parseSettings(input)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('keeps valid fields and falls back only on the broken ones', () => {
    // One bad value must not discard every other preference the user has set.
    const result = parseSettings({
      ...DEFAULT_SETTINGS,
      focusMinutes: 50,
      shortBreakMinutes: 9999, // out of range
    });

    expect(result.focusMinutes).toBe(50);
    expect(result.shortBreakMinutes).toBe(DEFAULT_SETTINGS.shortBreakMinutes);
  });

  it('rejects out-of-range durations that would break the timer', () => {
    // A zero-length session would divide by zero when computing progress.
    expect(parseSettings({ ...DEFAULT_SETTINGS, focusMinutes: 0 }).focusMinutes).toBe(
      DEFAULT_SETTINGS.focusMinutes,
    );
    expect(parseSettings({ ...DEFAULT_SETTINGS, focusMinutes: -5 }).focusMinutes).toBe(
      DEFAULT_SETTINGS.focusMinutes,
    );
  });

  it('rejects unknown enum values rather than passing them through', () => {
    const result = parseSettings({ ...DEFAULT_SETTINGS, accent: 'neon-pink' });
    expect(result.accent).toBe(DEFAULT_SETTINGS.accent);
  });

  it('ignores extra keys from a future version', () => {
    const result = parseSettings({ ...DEFAULT_SETTINGS, somethingNew: true });
    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});

describe('parseTasks', () => {
  it('returns an empty list for non-arrays', () => {
    for (const input of [null, undefined, {}, 'tasks']) {
      expect(parseTasks(input)).toEqual([]);
    }
  });

  it('drops malformed entries but keeps the valid ones', () => {
    // Losing one corrupt task is acceptable; losing the whole list is not.
    const result = parseTasks([
      validTask,
      { id: 'broken' },
      { ...validTask, id: 'task-2', title: '' },
      { ...validTask, id: 'task-3' },
    ]);

    expect(result.map((task) => task.id)).toEqual(['task-1', 'task-3']);
  });

  it('rejects a title beyond the length cap', () => {
    // An unbounded title would destroy the list layout and the tab title.
    const result = parseTasks([{ ...validTask, title: 'x'.repeat(TASK_TITLE_MAX_LENGTH + 1) }]);
    expect(result).toEqual([]);
  });
});

describe('parseSessions', () => {
  it('returns an empty ledger for non-arrays', () => {
    expect(parseSessions(null)).toEqual([]);
    expect(parseSessions({ sessions: [] })).toEqual([]);
  });

  it('drops entries with a malformed day key', () => {
    // dayKey drives every grouping in the stats; a bad one would create a
    // phantom column in the heatmap.
    const result = parseSessions([validSession, { ...validSession, id: 's2', dayKey: 'March 15' }]);
    expect(result).toHaveLength(1);
  });

  it('keeps the most recent records when over the cap', () => {
    const many = Array.from({ length: MAX_SESSIONS + 50 }, (_, i) => ({
      ...validSession,
      id: `session-${i}`,
    }));

    const result = parseSessions(many);
    expect(result).toHaveLength(MAX_SESSIONS);
    // FIFO: the oldest are evicted, so history stays continuous at the recent end.
    expect(result.at(-1)?.id).toBe(`session-${MAX_SESSIONS + 49}`);
  });

  it('rejects an implausible duration', () => {
    const result = parseSessions([{ ...validSession, actualMs: 999_999_999 }]);
    expect(result).toEqual([]);
  });
});
