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
/**
 * Sandboxes and CI images often ship a Chromium that was pinned to a
 * different Playwright release than the one in package.json, and the
 * runner then refuses to start with "Executable doesn't exist". Pointing
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE at the browser that IS installed makes
 * the suite runnable there without downgrading the package or
 * re-downloading a browser the image already has.
 */
const launchOptions = {
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
  // Chromium refuses to start as root unless the sandbox is off, which is
  // the normal case inside a container. Opt-in only, so a developer's own
  // laptop keeps the sandbox.
  ...(process.env.PLAYWRIGHT_NO_SANDBOX ? { args: ['--no-sandbox'] } : {}),
}

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
      // installs Chromium only — so this project could never actually
      // start, which is why the phone-width suite had never been run.
      // The bugs it exists to catch (mirrored arch, half-width arch,
      // overflow) are layout at a narrow viewport, not WebKit engine
      // differences, so Chromium at the iPhone's size is the honest fit.
      name: 'iphone',
      use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions },
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
      // Without a key the app (correctly) refuses to show a login form at
      // all, so every browser test would be looking at the config screen.
      // The tests stub Supabase's HTTP surface, so the value only has to
      // be non-empty — a real key is never needed to run them.
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'e2e-placeholder-key-network-is-stubbed',
    },
  },
})
