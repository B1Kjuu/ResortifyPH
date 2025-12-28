import { defineConfig, devices } from '@playwright/test'

const WEB_HOST = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1'
const WEB_PORT = process.env.PLAYWRIGHT_PORT ?? '3000'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${WEB_HOST}:${WEB_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'always', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
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
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        // Use npx to avoid npm argument passthrough issues on Windows
        command: `npx next dev -H ${WEB_HOST} -p ${WEB_PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120 * 1000,
        env: {
          NEXT_PUBLIC_E2E: 'true',
        },
      },
})
