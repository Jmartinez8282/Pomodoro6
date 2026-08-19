import { expect, test } from '@playwright/test';

test('does not scroll horizontally at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  // The original app hardcoded width: 500 on the timer, which overflowed every
  // phone. This is the regression test for that whole class of bug.
  expect(overflow).toBeLessThanOrEqual(0);
});

test('keeps the ring visible in a short landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('25:00')).toBeInViewport();
});
