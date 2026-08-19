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
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
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

export default nextConfig;
