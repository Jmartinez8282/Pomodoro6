import type { StorageAdapter } from './adapter';
import { createLocalStorageAdapter } from './local-storage-adapter';
import { createMemoryAdapter } from './memory-adapter';

let adapter: StorageAdapter | null = null;

/**
 * The single place the app decides where data lives.
 *
 * When accounts arrive this returns an `HttpAdapter` for signed-in users and
 * keeps the local one for everyone else — no UI code changes, because nothing
 * outside this module knows which adapter it is talking to.
 */
export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter;

  const canUseLocalStorage = (() => {
    if (typeof window === 'undefined') return false;
    try {
      const probe = '__gid_probe__';
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  })();

  adapter = canUseLocalStorage ? createLocalStorageAdapter() : createMemoryAdapter();
  return adapter;
}

/** Test seam. */
export function __setStorageAdapter(next: StorageAdapter | null): void {
  adapter = next;
}

export type { StorageAdapter, StorageKey } from './adapter';
export { STORAGE_KEYS, STORAGE_PREFIX } from './adapter';
export { createMemoryAdapter } from './memory-adapter';
export { createLocalStorageAdapter, StorageQuotaError } from './local-storage-adapter';
