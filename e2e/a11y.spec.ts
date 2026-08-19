import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

const routes = ['/', '/stats'];

for (const route of routes) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${route} has no accessibility violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(route);
      // Wait for hydration so the real UI is scanned, not the skeletons.
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}

test('the timer is fully operable by keyboard alone', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');

  // Space is the primary accelerator and must not scroll the page.
  await page.locator('body').press(' ');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  await page.locator('body').press('s');
  await expect(page.getByRole('button', { name: /Short Break/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.locator('body').press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('shortcuts do not fire while typing in a field', async ({ page }) => {
  await page.goto('/');

  const input = page.getByPlaceholder('What are you working on?');
  await input.fill('Buy milk');
  // "s" would skip the session and space would toggle the timer if the shortcut
  // layer were not suppressed inside text fields.
  await input.press('s');

  await expect(input).toHaveValue('Buy milks');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});

test('the countdown is hidden from assistive tech', async ({ page }) => {
  await page.goto('/');
  // A live-updating countdown exposed to a screen reader would be announced
  // every second and make the app unusable.
  await expect(page.getByText('25:00')).toHaveAttribute('aria-hidden', 'true');
});
