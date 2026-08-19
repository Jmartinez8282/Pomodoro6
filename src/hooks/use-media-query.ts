'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * SSR-safe `matchMedia`, subscribed rather than polled.
 *
 * `useSyncExternalStore` is the right primitive here: a media query *is* an
 * external store, and modelling it as one avoids the extra render pass that a
 * `setState`-in-effect version costs on every mount.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // The server cannot know the user's preferences; assume no match and let the
  // client correct it during hydration.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
