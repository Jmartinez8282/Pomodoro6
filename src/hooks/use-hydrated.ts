'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` during server render and the first client render, `true` afterwards.
 *
 * Implemented with `useSyncExternalStore` rather than a `setState` in an
 * effect: React treats the server/client snapshot split as a first-class
 * concept here, so the flip happens as part of hydration instead of causing a
 * second render pass.
 *
 * Used to gate anything whose output depends on persisted state. Server HTML
 * and the first client render must be byte-identical, so store-backed surfaces
 * render a skeleton until this flips — which is why the skeletons in this app
 * are structural rather than decorative.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
