import { expect, test } from '@playwright/test';

test.describe('timer', () => {
  test('counts down and can be paused, holding its remaining time', async ({ page }) => {
    // Playwright's clock API patches Date and timers inside the real browser,
    // so a 25-minute pomodoro is exercised end to end in milliseconds — against
    // the same deadline arithmetic that runs in production.
    await page.clock.install();
    await page.goto('/');

    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    await page.clock.fastForward('05:00');
    await expect(page.getByText('20:00')).toBeVisible();

    await page.getByRole('button', { name: 'Pause' }).click();

    // Ten minutes of wall time pass while paused; the timer must not move.
    await page.clock.fastForward('10:00');
    await expect(page.getByText('20:00')).toBeVisible();

    await page.getByRole('button', { name: 'Resume' }).click();
    await page.clock.fastForward('01:00');
    await expect(page.getByText('19:00')).toBeVisible();
  });

  test('advances to a break when the focus session completes', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');

    await page.getByRole('button', { name: 'Start' }).click();
    await page.clock.fastForward('25:00');

    // autoStartBreaks defaults on, so the break should already be running.
    await expect(page.getByRole('button', { name: /Short Break/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('resumes at the correct time after a reload mid-session', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');

    await page.getByRole('button', { name: 'Start' }).click();
    await page.clock.fastForward('10:00');
    await expect(page.getByText('15:00')).toBeVisible();

    await page.reload();

    // The deadline is persisted, so the session picks up where it was rather
    // than restarting — the failure mode of the original implementation.
    await expect(page.getByText('15:00')).toBeVisible();
  });

  test('reset returns to a full session', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');

    await page.getByRole('button', { name: 'Start' }).click();
    await page.clock.fastForward('03:00');
    await page.getByRole('button', { name: 'Reset timer' }).click();

    await expect(page.getByText('25:00')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  });
});
