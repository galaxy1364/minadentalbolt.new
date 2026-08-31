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

  // MOD-TEST-004: this used to be getByText(/مینادنت|ورود|رمز عبور/), which
  // passed on the "پیکربندی سرور ناقص است" screen — the sentence there is
  // «بنابراین ورود به حساب ممکن نیست», so /ورود/ matched an *error page* and
  // the smoke test reported a healthy app. That is the exact failure mode
  // this file exists to catch, so assert on the form itself: a real login
  // screen has a password box and a submit button, an error screen has
  // neither.
  await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /ورود/ })).toBeVisible()

  // A crash during mount used to show as a blank page with the real cause
  // only in the console.
  //
  // Third-party noise is filtered, and so is the offline-degradation path:
  // a runner with no network can't reach the font CDN or Supabase, and the
  // app is *designed* to keep working then (see lib/supabase.ts). Treating
  // that as a failure made this test red in exactly the environment it was
  // written for — CI without secrets — which is how a smoke test gets
  // ignored. Anything else still fails the build.
  const ignorable = /favicon|Download the React DevTools|ERR_(TUNNEL_CONNECTION_FAILED|FAILED|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED)|VITE_SUPABASE_ANON_KEY is not set|Failed to load resource/i
  const fatal = consoleErrors.filter((e) => !ignorable.test(e))
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
    const de = document.documentElement
    const w = de.clientWidth
    // An element sticking out past the viewport is only a bug if the *page*
    // has to scroll to reach it. Two shapes are legitimate and must not
    // fail here: content that is deliberately wide and scrolls inside its
    // own box (the dental arch, wide tables), and decoration positioned
    // off-canvas inside a clipping box (the login screen's blurred blobs
    // sit at `right: -15%` under `overflow-hidden`). Any overflowX other
    // than `visible` means an ancestor already contains the child.
    const isContained = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible') return true
      }
      return false
    }
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: w,
      offenders: [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) return false
          if (getComputedStyle(el).position === 'fixed') return false
          return (r.right > w + 2 || r.left < -2) && !isContained(el)
        })
        .slice(0, 5)
        .map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 60)}`),
    }
  })

  expect(
    overflow.offenders,
    `عناصری که از عرض صفحه بیرون زده‌اند:\n${overflow.offenders.join('\n')}`,
  ).toEqual([])
  expect(
    overflow.scrollWidth,
    `صفحه ${overflow.scrollWidth - overflow.clientWidth} پیکسل افقی اسکرول می‌خورد`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1)
})
