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
      // devices['iPhone 13'] defaults to WebKit, but `npm run e2e:install`
      // only downloads Chromium — so this project could never launch on a
      // clean machine or in CI, and the whole suite failed before running a
      // single assertion. What these tests actually check is layout at phone
      // width (mirrored arch, half-width arch, overflow), and viewport is
      // what decides that, not the engine. So: iPhone metrics, Chromium.
      name: 'iphone',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
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
    env: {
      // Without a key, Layout renders the "پیکربندی سرور ناقص است" screen
      // instead of the app, so every test would be inspecting an error
      // page. A placeholder is enough: it never reaches a server — the
      // clinic-flow tests intercept the Supabase endpoints (see
      // e2e/fixtures/backend.ts), and the smoke tests assert the offline
      // behaviour on purpose. A real key here would leak into CI logs.
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'e2e-placeholder-key',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://e2e.invalid',
    },
  },
})
