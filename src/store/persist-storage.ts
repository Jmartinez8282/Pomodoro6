import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { getStorageAdapter } from '@/lib/storage';
import type { StorageKey } from '@/lib/storage';

/**
 * Bridges Zustand's `persist` middleware onto our `StorageAdapter`.
 *
 * Zustand accepts an async storage, which is what lets the same store code run
 * against `localStorage` today and an HTTP-backed adapter once accounts exist.
 */
export function createPersistStorage<T>(key: StorageKey): PersistStorage<T> {
  return {
    async getItem(): Promise<StorageValue<T> | null> {
      const raw = await getStorageAdapter().getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as StorageValue<T>;
      } catch {
        // Corrupt JSON: treat as absent so the store falls back to defaults
        // instead of throwing during rehydration.
        return null;
      }
    },
    async setItem(_name, value) {
      await getStorageAdapter().setItem(key, JSON.stringify(value));
    },
    async removeItem() {
      await getStorageAdapter().removeItem(key);
    },
  };
}
