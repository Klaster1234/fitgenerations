import { defineConfig, devices } from '@playwright/test';

// Default target is the local dev server; set E2E_BASE_URL to run the suite
// against a deployed environment (e.g. prod) without booting a local server.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const isLocal = /localhost|127\.0\.0\.1/.test(baseURL);

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
    baseURL,
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
  // Only boot the local Next dev server when targeting localhost; against a
  // deployed E2E_BASE_URL we skip it and hit the remote URL directly.
  ...(isLocal
    ? {
        webServer: {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
