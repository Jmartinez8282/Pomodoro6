export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

export function minutesToMs(minutes: number): number {
  return Math.round(minutes * MS_PER_MINUTE);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * `M:SS` under an hour, `H:MM:SS` at or above it.
 *
 * Rounds *up*, so a timer started at 25:00 reads "25:00" for its first second
 * rather than flicking straight to 24:59 — and it reaches "0:00" only when the
 * session is genuinely over, not a second early.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / MS_PER_SECOND));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Spoken form for screen readers — "24 minutes 31 seconds", not "24:31". */
export function formatDurationSpoken(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / MS_PER_SECOND));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);
  }
  return parts.join(' ');
}

/** Compact form for stats — "2h 15m", "45m", "0m". */
export function formatFocusTime(ms: number): string {
  const totalMinutes = Math.round(ms / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Local calendar day key, YYYY-MM-DD.
 *
 * Built from local date parts rather than `toISOString().slice(0, 10)`, which
 * would return the UTC day and put every evening session in the wrong bucket
 * for anyone west of Greenwich.
 */
export function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayKeyToDate(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/**
 * Add days to a day key via local-noon arithmetic.
 *
 * Anchoring at noon means a DST transition — which shifts a day by an hour —
 * can never push the result onto the neighbouring date, the classic off-by-one
 * that breaks streak counting twice a year.
 */
export function addDays(dayKey: string, days: number): string {
  const date = dayKeyToDate(dayKey);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

export function daysBetween(fromDayKey: string, toDayKey_: string): number {
  const from = dayKeyToDate(fromDayKey);
  const to = dayKeyToDate(toDayKey_);
  from.setHours(12, 0, 0, 0);
  to.setHours(12, 0, 0, 0);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Start of the week containing `dayKey`, honouring the user's week start. */
export function startOfWeek(dayKey: string, weekStartsOn: 0 | 1): string {
  const date = dayKeyToDate(dayKey);
  const offset = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(dayKey, -offset);
}

export function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
