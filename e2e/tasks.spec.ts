import { expect, test } from './fixtures';

test.describe('tasks', () => {
  test('shows a first-run empty state, then the task once added', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('No tasks yet')).toBeVisible();

    await page.getByPlaceholder('What are you working on?').fill('Write the release notes');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByRole('listitem').getByText('Write the release notes')).toBeVisible();
    await expect(page.getByText('No tasks yet')).toBeHidden();
    await expect(page.getByText('1 task left')).toBeVisible();
  });

  test('persists tasks across a reload', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('What are you working on?').fill('Survive a refresh');
    await page.getByRole('button', { name: 'Add' }).click();
    const inList = page.getByRole('listitem').getByText('Survive a refresh');
    await expect(inList).toBeVisible();

    await page.reload();
    await expect(inList).toBeVisible();
  });

  test('reorders by keyboard, without any dragging', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('What are you working on?');

    for (const title of ['First task', 'Second task']) {
      await input.fill(title);
      await page.getByRole('button', { name: 'Add' }).click();
    }

    await page.getByRole('button', { name: 'Move "Second task" up' }).click();

    const titles = await page.locator('ul li label').allTextContents();
    expect(titles).toEqual(['Second task', 'First task']);
  });

  test('completing a task strikes it through and updates the count', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('What are you working on?').fill('Finish me');
    await page.getByRole('button', { name: 'Add' }).click();

    await page.getByRole('checkbox').check();
    await expect(page.getByText('0 tasks left')).toBeVisible();
  });
});
