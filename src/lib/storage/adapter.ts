export type StorageKey = 'settings' | 'tasks' | 'sessions' | 'timer' | 'consent';

/**
 * The seam between the app and wherever its data lives.
 *
 * Every method is async even though `localStorage` is synchronous. That is the
 * entire point: a future `HttpAdapter` backed by Postgres has to be async, and
 * if the interface were sync today, adding accounts would mean touching every
 * call site. Paying the `await` cost now makes that migration a new file rather
 * than a refactor.
 */
export interface StorageAdapter {
  readonly name: 'local' | 'memory' | 'http';
  getItem(key: StorageKey): Promise<string | null>;
  setItem(key: StorageKey, value: string): Promise<void>;
  removeItem(key: StorageKey): Promise<void>;
  /** Full snapshot, for export and for merging local data on first sign-in. */
  getAll(): Promise<Partial<Record<StorageKey, string>>>;
  clear(): Promise<void>;
  /** Cross-tab change notification. Returns an unsubscribe function. */
  subscribe?(key: StorageKey, callback: (value: string | null) => void): () => void;
}

export const STORAGE_KEYS: readonly StorageKey[] = [
  'settings',
  'tasks',
  'sessions',
  'timer',
  'consent',
] as const;

export const STORAGE_PREFIX = 'gitishdone:';
