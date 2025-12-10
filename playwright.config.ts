import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Eleva Care App
 *
 * This configuration is optimized for:
 * - Visual regression testing
 * - Form interaction testing
 * - Multi-step booking flow verification
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for consistency
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (helpful for debugging booking flows)
    video: 'on-first-retry',

    // Viewport size (matches common desktop)
    viewport: { width: 1280, height: 720 },

    // Navigation timeout
    navigationTimeout: 10000,

    // Action timeout
    actionTimeout: 5000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports for responsive testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests (optional)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },

  // Expect configuration for visual assertions
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 5000,

    // Configuration for visual regression testing
    toHaveScreenshot: {
      // Maximum allowed pixel difference
      maxDiffPixels: 100,
      // Threshold for pixel comparison (0.1 = 10% difference allowed)
      threshold: 0.1,
      // Animation stabilization
      animations: 'disabled',
    },

    // Configuration for snapshot testing
    toMatchSnapshot: {
      // Maximum allowed difference between snapshots
      maxDiffPixelRatio: 0.1,
    },
  },

  // Output folder for test artifacts
  outputDir: 'test-results/',

  // Folder for test snapshots
  snapshotDir: 'tests/e2e/__snapshots__',
});
