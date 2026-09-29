import { defineConfig, devices } from '@playwright/test'

/**
 * MOD-TEST — منبع واحد پیکربندی برای تست‌های `e2e/`.
 *
 * این فایل عمداً کوچک است: `webServer` خودش `vite preview` را روی یک
 * build واقعی بالا می‌آورد، پس تست‌ها به همان باندلی می‌رسند که در
 * production تحویل کاربر می‌شود، نه سرور dev با HMR.
 */

const port = Number(process.env.E2E_PORT || 4173)
const basePath = process.env.BASE_PATH || '/'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}${basePath}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Uses Chromium with an iPhone viewport rather than the real WebKit
    // engine — this sandbox only ships Chromium's system libraries, and
    // the layout/a11y checks here don't depend on engine-specific quirks.
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `PORT=${port} BASE_PATH=${basePath} pnpm run build && PORT=${port} BASE_PATH=${basePath} pnpm run serve`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
