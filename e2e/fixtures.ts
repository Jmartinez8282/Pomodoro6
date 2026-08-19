import { test as base, expect } from '@playwright/test';

/**
 * The default fixture pre-answers the consent prompt.
 *
 * Only the consent spec should care about the banner; everywhere else it is an
 * overlay that happens to sit on top of the UI under test. Seeding the stored
 * decision before the first paint is closer to the returning-visitor case that
 * most tests are actually about, and it keeps a product-wide overlay from
 * making every unrelated test flaky.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'gitishdone:consent',
        JSON.stringify({ analytics: 'denied', decidedAt: new Date().toISOString() }),
      );
    });
    await use(page);
  },
});

export { expect };
