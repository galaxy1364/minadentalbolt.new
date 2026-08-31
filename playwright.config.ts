import { defineConfig, devices } from '@playwright/test'

/**
 * MOD-TEST-002 | پیکربندی تست مرورگر واقعی
 *
 * تا امروز هر تستی در این پروژه یا منطق خالص بود یا jsdom. هیچ‌کدام چیزی
 * را **نمایش** نمی‌داد، و به همین دلیل باگ‌هایی مثل «قوس دندانی آینه بود»
 * (MOD-FIX-013) و «قوس نصف صفحه گیر کرده» (MOD-FIX-012) را فقط مهدی با
 * چشمش پیدا کرد — بعد از اینکه هر دو با ۷۰۰ تست سبز منتشر شده بودند.
 *
 * Playwright یک مرورگر واقعی باز می‌کند، صفحه را می‌چیند و اسکرین‌شات
 * می‌گیرد. این تنها لایه‌ای است که چیدمان، سرریز و وارونگی را می‌بیند.
 *
 * ابعاد پیش‌فرض روی گوشی تنظیم شده، نه دسکتاپ: این برنامه در عمل روی
 * iPhone استفاده می‌شود و تقریباً همه‌ی ایرادهای چیدمانی‌اش در همان عرض
 * باریک ظاهر شده‌اند.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    // A screenshot of every failure is the whole point — a failed layout
    // assertion that produces only text tells you nothing about what the
    // screen actually looked like.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'fa-IR',
  },

  projects: [
    {
      name: 'iphone',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Starts the dev server automatically. reuseExistingServer means a
  // developer who already has `npm run dev` open isn't fighting the test
  // runner for the port.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
