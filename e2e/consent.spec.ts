import { expect, test } from '@playwright/test';

test.describe('analytics consent', () => {
  test('sends nothing to Google before the user accepts', async ({ page }) => {
    const googleRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(url)) {
        googleRequests.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The compliance assertion. A banner that renders while the tag has already
    // loaded is theatre, so this checks the network rather than the DOM.
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible();
    expect(googleRequests).toEqual([]);

    // Declining must also send nothing, and must not ask again.
    await page.getByRole('button', { name: 'Decline' }).click();
    await page.waitForTimeout(500);
    expect(googleRequests).toEqual([]);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden();
    expect(googleRequests).toEqual([]);
  });

  test('remembers acceptance across reloads', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden();

    await page.reload();
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden();
  });
});
