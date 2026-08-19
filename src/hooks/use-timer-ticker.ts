'use client';

import { useEffect, useRef } from 'react';

/**
 * A 1Hz heartbeat that keeps running when the tab is in the background.
 *
 * Main-thread `setInterval` is clamped to ≥1s in background tabs and frozen
 * outright by Chrome's intensive throttling after a few minutes hidden. Worker
 * timers are throttled far less aggressively, so the completion chime still
 * fires close to on time for a backgrounded tab.
 *
 * Correctness does not depend on this. The engine completes a session by
 * comparing `Date.now()` against a stored deadline, so a throttled or missing
 * heartbeat only delays *noticing*, never changes the outcome — which is why
 * falling back to `setInterval` when Workers are unavailable is safe.
 *
 * The worker is built from a Blob rather than a separate file so it needs no
 * bundler entry point and no extra network request. It holds no state: keeping
 * it a dumb pulse avoids re-syncing worker-side state on every settings change
 * and the startup race that a stateful worker would introduce.
 */
const WORKER_SOURCE = `
let id = null;
self.onmessage = (e) => {
  if (e.data === 'start') {
    if (id !== null) clearInterval(id);
    id = setInterval(() => self.postMessage('tick'), 1000);
  } else if (e.data === 'stop') {
    if (id !== null) clearInterval(id);
    id = null;
  }
};
`;

export function useTimerTicker(active: boolean, onTick: () => void): void {
  // Held in a ref so changing the callback does not tear down the worker.
  const callbackRef = useRef(onTick);
  useEffect(() => {
    callbackRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!active) return;

    const tick = () => callbackRef.current();

    let worker: Worker | null = null;
    let objectUrl: string | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    try {
      const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
      objectUrl = URL.createObjectURL(blob);
      worker = new Worker(objectUrl);
      worker.onmessage = tick;
      worker.postMessage('start');
    } catch {
      // Workers can be unavailable under a strict CSP or in some webviews.
      worker = null;
      intervalId = setInterval(tick, 1000);
    }

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [active]);
}
