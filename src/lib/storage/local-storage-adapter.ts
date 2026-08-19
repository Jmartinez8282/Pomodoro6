import { STORAGE_KEYS, STORAGE_PREFIX, type StorageAdapter, type StorageKey } from './adapter';

const namespaced = (key: StorageKey) => `${STORAGE_PREFIX}${key}`;

/**
 * `localStorage`, defensively.
 *
 * Every access is wrapped, because `localStorage` throws more often than its
 * API suggests: Safari in private mode throws on `setItem`, embedded webviews
 * can disable storage entirely, and any origin can hit `QuotaExceededError`.
 * A productivity timer must keep counting when its storage fails — losing
 * persistence is a degradation, not a crash.
 */
export function createLocalStorageAdapter(): StorageAdapter {
  return {
    name: 'local',

    async getItem(key) {
      try {
        return localStorage.getItem(namespaced(key));
      } catch {
        return null;
      }
    },

    async setItem(key, value) {
      try {
        localStorage.setItem(namespaced(key), value);
      } catch (error) {
        // Surfaced by the caller as a toast; swallowing it here keeps the timer
        // running rather than tearing down a render on a storage failure.
        if (isQuotaError(error)) throw new StorageQuotaError(key);
      }
    },

    async removeItem(key) {
      try {
        localStorage.removeItem(namespaced(key));
      } catch {
        /* nothing useful to do */
      }
    },

    async getAll() {
      const result: Partial<Record<StorageKey, string>> = {};
      for (const key of STORAGE_KEYS) {
        try {
          const value = localStorage.getItem(namespaced(key));
          if (value !== null) result[key] = value;
        } catch {
          /* skip unreadable keys */
        }
      }
      return result;
    },

    async clear() {
      for (const key of STORAGE_KEYS) {
        try {
          localStorage.removeItem(namespaced(key));
        } catch {
          /* keep going */
        }
      }
    },

    /**
     * Cross-tab sync. The `storage` event fires only in *other* tabs, which is
     * exactly what is needed: two open tabs would otherwise fight over the task
     * list, with each overwriting the other's last write.
     */
    subscribe(key, callback) {
      const handler = (event: StorageEvent) => {
        if (event.key === namespaced(key)) callback(event.newValue);
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
  };
}

export class StorageQuotaError extends Error {
  constructor(public readonly key: StorageKey) {
    super(`Storage quota exceeded while writing "${key}".`);
    this.name = 'StorageQuotaError';
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22)
  );
}
