import { test, expect } from '@playwright/test'
import { OWNER } from './support/harness'

/**
 * MOD-FIX-032 | اپ باید بالا بیاید حتی وقتی سرور جواب نمی‌دهد
 *
 * گزارش با اسکرین‌شات: روی LTE، اپ روی اسپینر گیر کرده بود. «قبلاً بدون
 * اینترنت هم باز می‌شد.»
 *
 * فرق حالت خراب با آفلاین: وقتی کاملاً آفلاینی، درخواست سریع رد می‌شود
 * و دروازه‌ی loading باز می‌شود. وقتی شبکه هست ولی سرور (پروژه‌ی رایگان
 * متوقف‌شده یا فیلترشده) جواب نمی‌دهد، درخواست **معلق می‌ماند** —
 * `setLoading(false)` هرگز اجرا نمی‌شد و اسپینر ابدی می‌شد.
 *
 * این تست همان شبکه‌ی معلق را می‌سازد: اتصال برقرار است ولی هیچ پاسخی
 * نمی‌آید. اپ باید با بودجه‌ی زمانی خودش را از دروازه رد کند.
 */

// A stored session in the app's own auth storage key, as a returning
// user would have. `expired` decides whether the token still looks valid.
async function storedSession(page: import('@playwright/test').Page, expired: boolean) {
  await page.addInitScript(([owner, exp]) => {
    const now = Math.floor(Date.now() / 1000)
    localStorage.setItem('minadent-auth', JSON.stringify({
      access_token: 'stored-token', token_type: 'bearer', expires_in: 3600,
      expires_at: exp ? now - 60 : now + 3600, refresh_token: 'stored-refresh',
      user: { id: owner.id, aud: 'authenticated', role: 'authenticated', email: owner.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }))
  }, [OWNER, expired] as const)
}

// Connected, but nothing ever answers — the request hangs rather than
// failing. This is the exact condition a fast-failing "offline" test
// would NOT catch.
async function stallServer(page: import('@playwright/test').Page) {
  await page.route('**://*.supabase.co/**', () => { /* never fulfil */ })
  await page.route('**://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }))
}

test('🔴 با توکن ذخیره‌شده و سرور بی‌جواب، داشبورد باز می‌شود نه اسپینر ابدی', async ({ page }) => {
  await storedSession(page, false)
  await stallServer(page)
  await page.goto('/')
  // بودجه‌ی راه‌اندازی ۴ ثانیه است؛ با حاشیه صبر می‌کنیم.
  await expect(page.getByText('داشبورد').first()).toBeVisible({ timeout: 12_000 })
})

test('🔴 با توکن منقضی و سرور بی‌جواب، صفحه‌ی ورود می‌آید نه اسپینر ابدی', async ({ page }) => {
  await storedSession(page, true)
  await stallServer(page)
  await page.goto('/')
  await expect(page.getByText(/ورود|رمز عبور/).first()).toBeVisible({ timeout: 12_000 })
})
