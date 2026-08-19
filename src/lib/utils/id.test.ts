import { describe, expect, it, vi } from 'vitest';
import { createId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createId', () => {
  it('produces a v4 UUID', () => {
    expect(createId()).toMatch(UUID_V4);
  });

  it('does not collide across many calls', () => {
    // IDs are generated client-side specifically so a future server sync is a
    // merge rather than a re-key, which only works if they are actually unique.
    const ids = new Set(Array.from({ length: 5000 }, createId));
    expect(ids.size).toBe(5000);
  });

  it('falls back to getRandomValues where randomUUID is unavailable', () => {
    // randomUUID is absent in non-secure contexts, e.g. plain-HTTP LAN testing.
    const spy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('not available');
    });
    // @ts-expect-error — simulating the API being missing entirely
    crypto.randomUUID = undefined;

    const id = createId();
    expect(id).toMatch(UUID_V4);

    spy.mockRestore();
  });
});
