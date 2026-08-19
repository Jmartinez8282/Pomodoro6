import { expect, test } from './fixtures';

test('does not scroll horizontally at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  // The original app hardcoded width: 500 on the timer, which overflowed every
  // phone. This is the regression test for that whole class of bug.
  //
  // A single pixel is tolerated because sub-pixel rounding of fractional
  // layout widths differs between platforms — this measured 0 on macOS and 1
  // on Linux CI for identical markup. One pixel is not reachable by scrolling
  // and not visible to anyone; the failure this guards against is measured in
  // hundreds.
  expect(overflow).toBeLessThanOrEqual(1);
});

test('keeps the ring visible in a short landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('25:00')).toBeInViewport();
});
