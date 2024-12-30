import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { ENV } from './env';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */

dotenv.config();

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    headless: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run start:dev -w syncwatch-server',
      url: ENV.SERVER_URL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run serve:test-page -w syncwatch-extension',
      url: ENV.TEST_PAGE_URL,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
