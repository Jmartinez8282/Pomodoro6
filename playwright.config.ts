import { defineConfig, devices } from '@playwright/test';

const PORT = 3210;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Capped rather than left to default: every worker drives the same Next
  // server, and oversubscribing it makes page.goto time out in ways that look
  // like product bugs.
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The narrowest phone still in meaningful use. Layout bugs show up here
    // first, which is why it is a project rather than a one-off assertion.
    { name: 'mobile', use: { ...devices['iPhone SE'] } },
  ],

  webServer: {
    // Tests run against a production build: dev-mode double-rendering and
    // missing minification hide exactly the class of bug E2E is meant to catch.
    command: `npx next build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
