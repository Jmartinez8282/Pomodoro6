import type { TimerMode } from './timer';

/**
 * One entry in the append-only session ledger.
 *
 * Every statistic in the app is derived from this list — nothing is stored
 * pre-aggregated. That removes any possibility of the charts disagreeing with
 * the log, and means a future server sync ships plain rows.
 */
export interface SessionRecord {
  id: string;
  mode: TimerMode;
  /** ISO 8601 UTC. */
  startedAt: string;
  endedAt: string;
  /** The session's full length. */
  plannedMs: number;
  /**
   * Time actually spent, excluding paused stretches, clamped to `plannedMs`.
   * The clamp is what stops a suspended laptop from inflating focus time.
   */
  actualMs: number;
  /** `true` if it reached its deadline; `false` if skipped or reset early. */
  completed: boolean;
  /** `true` when the deadline passed while the tab was hidden or the machine
   *  was asleep, so stats can distinguish real focus from elapsed wall time. */
  wasAway?: boolean;
  taskId?: string;
  /** How many times the user paused. A quality signal, not just a count. */
  interruptions: number;
  /**
   * Local calendar day (YYYY-MM-DD) at session start, denormalised on write.
   * Deliberate: grouping by day stays O(n), and a later timezone change cannot
   * silently reshuffle history that was already recorded.
   */
  dayKey: string;
  /** IANA zone at time of recording, for auditability. */
  timeZone: string;
}
