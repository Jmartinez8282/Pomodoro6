import type { StorageAdapter, StorageKey } from './adapter';

/**
 * In-memory storage. Backs server rendering (where `localStorage` does not
 * exist) and gives tests a clean slate without touching a shared global.
 */
export function createMemoryAdapter(): StorageAdapter {
  const store = new Map<StorageKey, string>();

  return {
    name: 'memory',
    async getItem(key) {
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
    async getAll() {
      return Object.fromEntries(store) as Partial<Record<StorageKey, string>>;
    },
    async clear() {
      store.clear();
    },
  };
}
