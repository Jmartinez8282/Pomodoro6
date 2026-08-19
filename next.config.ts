import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

/**
 * Security headers.
 *
 * A client-only beta still benefits from these, and getting them right before
 * auth exists is far cheaper than retrofitting them after.
 *
 * `script-src` carries `'unsafe-inline'` deliberately, and it is worth being
 * honest about why: next-themes injects a blocking inline script to prevent a
 * theme flash, and Next injects inline bootstrap scripts of its own. The
 * nonce-based alternative requires reading `headers()` in the layout, which
 * opts every page into dynamic rendering and gives up static generation for a
 * fully static app. The trade is revisited when the app gains a server: at that
 * point pages are dynamic anyway and the nonce becomes free.
 */
/**
 * Whether this instance is actually served over HTTPS.
 *
 * Not `NODE_ENV === 'production'`: `next start` runs in production mode over
 * plain HTTP locally and in CI, so keying off it would emit HTTPS-enforcing
 * headers on an HTTP origin. Vercel always sets `VERCEL_ENV`, so its presence —
 * or an explicitly https site URL — is the honest signal.
 */
const isHttpsOrigin =
  process.env.VERCEL_ENV !== undefined ||
  (process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://') ?? false);

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net",
  // The timer heartbeat runs in a Blob worker; the service worker is same-origin.
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // HTTPS origins only. WebKit honours this strictly and rewrites
  // http://localhost to https://localhost, which breaks every asset over plain
  // HTTP — so emitting it unconditionally silently kills local development and
  // the Safari E2E run while looking fine in Chrome.
  ...(isHttpsOrigin ? ['upgrade-insecure-requests'] : []),
]
  .filter(Boolean)
  .join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // Same reasoning: an HSTS header served over HTTP is ignored, but
          // pinning localhost to HTTPS in a developer's browser profile is
          // painful to undo.
          ...(isHttpsOrigin
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

/**
 * Service worker for offline support.
 *
 * Disabled in development: a service worker that aggressively caches during
 * development serves stale code and produces bug reports for things already
 * fixed. `/api/*` is excluded from runtime caching from the start, so that
 * authenticated responses can never be cached once a backend exists — much
 * easier to get right now than to remember later.
 *
 * Note: Serwist injects its manifest through a webpack plugin and has no
 * Turbopack equivalent yet, so `npm run build` pins `--webpack`. Dev still uses
 * Turbopack, which is unaffected because the worker is disabled there anyway.
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
  exclude: [/\.map$/, /^manifest.*\.js$/, /\/api\//],
});

export default withSerwist(nextConfig);
