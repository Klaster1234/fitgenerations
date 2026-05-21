import { defineConfig, devices } from '@playwright/test';

// E2E config. We boot the Next dev server via `npm run dev` and reuse one if
// it's already running locally (so developers can `npm run dev` in one tab
// and `npm run e2e` in another without a port conflict). Chromium is the
// only default project for the smoke suite - extend with firefox/webkit if
// browser-specific regressions appear.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Extra browsers wired up so the next person can flip them on without
    // reconfiguring - keep them commented so smoke runs stay fast.
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
