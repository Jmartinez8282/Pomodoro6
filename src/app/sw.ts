/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Read exactly once. Serwist's build step rewrites this token, and it errors
// out if more than one occurrence appears in the source.
const manifest = self.__SW_MANIFEST;

const serwist = new Serwist({
  // Spread conditionally: the manifest is genuinely absent outside a build,
  // which `exactOptionalPropertyTypes` correctly distinguishes from "present
  // but undefined".
  ...(manifest ? { precacheEntries: manifest } : {}),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,

  // Offline navigations fall back to the cached home page. The timer, tasks,
  // and stats all run entirely client-side against localStorage, so the app is
  // genuinely usable offline rather than merely loading a shell.
  fallbacks: {
    entries: [{ url: '/', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();
