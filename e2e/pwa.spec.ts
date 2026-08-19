import { expect, test } from './fixtures';

test.describe('offline support', () => {
  // The service worker takes a load to install and claim the page, so these
  // steps must share one context rather than starting fresh.
  test.describe.configure({ mode: 'serial' });

  // Playwright only supports service worker interception in Chromium. Real
  // Safari does support them, so this is a limitation of the test harness
  // rather than of the app — skipped explicitly rather than left to fail.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Service workers are only supported in Playwright Chromium.',
  );

  test('serves a working app with the network cut', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the worker to be activated, not merely registered — a worker
    // still installing does not yet control the page, so reloading offline at
    // that point would legitimately fail.
    await page.waitForFunction(
      async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.state === 'activated';
      },
      undefined,
      { timeout: 20_000 },
    );

    // One online reload first. A service worker does not control the page that
    // registered it, so the very first document load never passes through it
    // and is never cached. This mirrors the real sequence: a visitor's second
    // visit is the one that works offline, not their first.
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('What are you working on?').fill('Works offline');
    await page.getByRole('button', { name: 'Add' }).click();

    await context.setOffline(true);
    await page.reload();

    // Everything the app does — timer, tasks, stats — is client-side against
    // localStorage, so offline should be fully functional rather than a shell.
    await expect(page.getByRole('listitem').getByText('Works offline')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled();

    await context.setOffline(false);
  });
});

test('exposes an installable manifest', async ({ page }) => {
  const response = await page.request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);

  const manifest = (await response.json()) as {
    name: string;
    icons: { src: string; sizes: string }[];
    start_url: string;
    display: string;
  };

  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  expect(manifest.icons.length).toBeGreaterThan(0);

  // A manifest that names icons which 404 is worse than no manifest: the
  // install prompt silently never appears and nothing tells you why.
  for (const icon of manifest.icons) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.ok(), `${icon.src} should exist`).toBe(true);
  }
});
