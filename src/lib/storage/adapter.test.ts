import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStorageAdapter } from './local-storage-adapter';
import { createMemoryAdapter } from './memory-adapter';

describe.each([
  ['memory', createMemoryAdapter],
  ['localStorage', createLocalStorageAdapter],
])('%s adapter', (_name, create) => {
  beforeEach(() => localStorage.clear());

  it('round-trips a value', async () => {
    const adapter = create();
    await adapter.setItem('settings', '{"focusMinutes":25}');
    expect(await adapter.getItem('settings')).toBe('{"focusMinutes":25}');
  });

  it('returns null for a key that was never written', async () => {
    expect(await create().getItem('tasks')).toBeNull();
  });

  it('removes a value', async () => {
    const adapter = create();
    await adapter.setItem('tasks', '[]');
    await adapter.removeItem('tasks');
    expect(await adapter.getItem('tasks')).toBeNull();
  });

  it('reports everything written via getAll', async () => {
    const adapter = create();
    await adapter.setItem('settings', 'a');
    await adapter.setItem('tasks', 'b');
    expect(await adapter.getAll()).toEqual({ settings: 'a', tasks: 'b' });
  });

  it('clears everything', async () => {
    const adapter = create();
    await adapter.setItem('settings', 'a');
    await adapter.clear();
    expect(await adapter.getAll()).toEqual({});
  });
});

describe('localStorage adapter resilience', () => {
  beforeEach(() => localStorage.clear());

  it('namespaces its keys so it cannot collide with another app on the origin', async () => {
    await createLocalStorageAdapter().setItem('settings', 'value');
    expect(localStorage.getItem('gitishdone:settings')).toBe('value');
    expect(localStorage.getItem('settings')).toBeNull();
  });

  it('returns null instead of throwing when reads fail', async () => {
    // Safari in private mode and some embedded webviews throw outright.
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    await expect(createLocalStorageAdapter().getItem('settings')).resolves.toBeNull();
    spy.mockRestore();
  });

  it('does not throw when a write fails for a non-quota reason', async () => {
    // Losing persistence is a degradation; taking down the running timer with
    // it is not acceptable.
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    await expect(createLocalStorageAdapter().setItem('tasks', '[]')).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it('skips unreadable keys in getAll rather than failing the whole read', async () => {
    const adapter = createLocalStorageAdapter();
    await adapter.setItem('settings', 'good');

    const original = Storage.prototype.getItem;
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key === 'gitishdone:tasks') throw new Error('boom');
      return original.call(this, key);
    });

    expect(await adapter.getAll()).toEqual({ settings: 'good' });
    spy.mockRestore();
  });
});
