import { test, expect } from '@playwright/test'

/**
 * MOD-TEST-002 | تست دود — بدون نیاز به رمز
 *
 * این فایل عمداً به هیچ حساب کاربری نیاز ندارد، چون باید در CI و روی
 * لپ‌تاپ هر کسی بدون تنظیم اضافه اجرا شود. کارش این است که بگوید
 * «برنامه اصلاً بالا می‌آید یا نه» — همان چیزی که یک بار با یک متغیر
 * محیطی غایب سفید شد و هیچ تستی نگرفت.
 */

test('برنامه بالا می‌آید و صفحه‌ی ورود را نشان می‌دهد', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push(String(e)))

  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()

  // Either the login screen or a signed-in shell — both mean the bundle
  // parsed and React mounted. A white screen means it didn't.
  await expect(page.getByText(/مینادنت|ورود|رمز عبور/).first()).toBeVisible({ timeout: 15_000 })

  // A crash during mount used to show as a blank page with the real cause
  // only in the console.
  const fatal = consoleErrors.filter((e) => !/favicon|Download the React DevTools/i.test(e))
  expect(fatal, `خطای کنسول هنگام بارگذاری:\n${fatal.join('\n')}`).toEqual([])
})

test('صفحه راست‌به‌چپ و فارسی است', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', /fa/)
  const dir = await page.locator('body div').first().getAttribute('dir')
  expect(dir === 'rtl' || (await page.locator('[dir="rtl"]').count()) > 0).toBeTruthy()
})

test('هیچ چیزی از عرض گوشی بیرون نمی‌زند', async ({ page }, testInfo) => {
  // MOD-FIX-012 بود: قوس دندانی نصف صفحه گیر کرده بود و هیچ تستی نگرفت،
  // چون jsdom عرض را نمی‌سنجد. این تست دقیقاً همان را می‌سنجد.
  test.skip(testInfo.project.name !== 'iphone', 'فقط روی عرض گوشی معنی دارد')

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const overflow = await page.evaluate(() => {
    const w = document.documentElement.clientWidth
    return [...document.querySelectorAll('*')]
      .filter((el) => el.getBoundingClientRect().right > w + 2)
      .slice(0, 5)
      .map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 60)}`)
  })
  expect(overflow, `عناصری که از عرض صفحه بیرون زده‌اند:\n${overflow.join('\n')}`).toEqual([])
})
