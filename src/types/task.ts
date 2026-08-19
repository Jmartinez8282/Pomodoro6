export interface Task {
  /** Client-generated UUID. Client-side generation is deliberate: it makes the
   *  future server sync a merge rather than a re-key. */
  id: string;
  /** Plain text, never HTML. Capped at TASK_TITLE_MAX_LENGTH. */
  title: string;
  notes?: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  isCompleted: boolean;
  /** Sparse ordering (0, 1000, 2000, …) so a reorder rewrites one row, not all
   *  of them. Gaps are re-normalised only when they run out. */
  order: number;
  /** ISO 8601 UTC. Present on every record so a later last-write-wins sync
   *  has something to compare. */
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type TaskDraft = Pick<Task, 'title' | 'notes' | 'estimatedPomodoros'>;

export type TaskFilter = 'all' | 'active' | 'completed';
