import { describe, expect, it } from 'vitest';
import {
  addDays,
  clamp,
  daysBetween,
  formatDuration,
  formatDurationSpoken,
  formatFocusTime,
  minutesToMs,
  startOfWeek,
  toDayKey,
} from './time';

describe('formatDuration', () => {
  it('rounds up, so a fresh timer shows its full length', () => {
    // Rounding down would flick 25:00 to 24:59 within the first frame, and
    // would reach 0:00 a whole second before the session actually ended.
    expect(formatDuration(1_500_000)).toBe('25:00');
    expect(formatDuration(1_499_999)).toBe('25:00');
    expect(formatDuration(1)).toBe('0:01');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('pads seconds but not minutes', () => {
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(600_000)).toBe('10:00');
  });

  it('adds an hours field only when needed', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00');
    expect(formatDuration(3_661_000)).toBe('1:01:01');
    expect(formatDuration(3_599_000)).toBe('59:59');
  });

  it('never renders a negative time', () => {
    expect(formatDuration(-5000)).toBe('0:00');
  });
});

describe('formatDurationSpoken', () => {
  it('reads as words rather than as a clock face', () => {
    expect(formatDurationSpoken(1_500_000)).toBe('25 minutes');
    expect(formatDurationSpoken(65_000)).toBe('1 minute 5 seconds');
    expect(formatDurationSpoken(3_661_000)).toBe('1 hour 1 minute 1 second');
  });

  it('says "0 seconds" rather than nothing at all', () => {
    expect(formatDurationSpoken(0)).toBe('0 seconds');
  });
});

describe('formatFocusTime', () => {
  it('drops empty units', () => {
    expect(formatFocusTime(0)).toBe('0m');
    expect(formatFocusTime(2_700_000)).toBe('45m');
    expect(formatFocusTime(7_200_000)).toBe('2h');
    expect(formatFocusTime(8_100_000)).toBe('2h 15m');
  });
});

describe('toDayKey', () => {
  it('uses the local date, not the UTC one', () => {
    // toISOString().slice(0, 10) would put a late-evening session on tomorrow's
    // date for anyone west of Greenwich — silently shifting a whole day of
    // stats into the wrong bucket.
    const lateEvening = new Date(2026, 2, 15, 23, 30);
    expect(toDayKey(lateEvening)).toBe('2026-03-15');
  });

  it('zero-pads months and days', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('does not slip a day across a DST transition', () => {
    // Anchoring at midnight rather than noon makes this land on the wrong date
    // twice a year, which quietly breaks streak counting.
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-03-09', -1)).toBe('2026-03-08');
  });
});

describe('daysBetween', () => {
  it('counts forwards and backwards', () => {
    expect(daysBetween('2026-03-15', '2026-03-18')).toBe(3);
    expect(daysBetween('2026-03-18', '2026-03-15')).toBe(-3);
    expect(daysBetween('2026-03-15', '2026-03-15')).toBe(0);
  });

  it('stays exact across a DST boundary', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });
});

describe('startOfWeek', () => {
  it('honours the configured first day', () => {
    // 2026-03-15 is a Sunday.
    expect(startOfWeek('2026-03-15', 1)).toBe('2026-03-09');
    expect(startOfWeek('2026-03-15', 0)).toBe('2026-03-15');
  });

  it('is idempotent', () => {
    const start = startOfWeek('2026-03-18', 1);
    expect(startOfWeek(start, 1)).toBe(start);
  });
});

describe('clamp and minutesToMs', () => {
  it('clamps to both bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('converts minutes to whole milliseconds', () => {
    expect(minutesToMs(25)).toBe(1_500_000);
    expect(minutesToMs(0.5)).toBe(30_000);
  });
});
