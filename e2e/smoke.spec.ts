import { test, expect } from '@playwright/test'
import { stubNetwork } from './support/harness'

/**
 * MOD-TEST-002 | تست دود — بدون نیاز به رمز
 *
 * این فایل عمداً به هیچ حساب کاربری نیاز ندارد، چون باید در CI و روی
 * لپ‌تاپ هر کسی بدون تنظیم اضافه اجرا شود. کارش این است که بگوید
 * «برنامه اصلاً بالا می‌آید یا نه» — همان چیزی که یک بار با یک متغیر
 * محیطی غایب سفید شد و هیچ تستی نگرفت.
 */

/**
 * MOD-TEST-003: شبکه‌ی سوپابیس در هر سه تست stub می‌شود. بدون آن، هر
 * محیطی که به اینترنت وصل نیست یک `ERR_TUNNEL_CONNECTION_FAILED` در
 * کنسول می‌گذارد و تستِ «هیچ خطای کنسولی نباشد» را قرمز می‌کند — تستی
 * که به‌خاطر محیط قرمز شود، چند روز بعد نادیده گرفته می‌شود.
 */
test.beforeEach(async ({ page }) => { await stubNetwork(page) })

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
  const fatal = consoleErrors.filter((e) => !/favicon|Download the React DevTools|ERR_TUNNEL|ERR_FAILED|Failed to load resource|WebSocket|realtime|net::|VITE_SUPABASE/i.test(e))
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

  // دو سنجه، چون دو باگ متفاوت‌اند:
  //  ۱. اسکرول افقی خودِ سند — چیزی که کاربر با انگشتش حس می‌کند.
  //  ۲. محتوایی که بیرون قاب افتاده — متن یا دکمه‌ای که دیده نمی‌شود.
  // لکه‌های تزئینی عمداً از لبه بیرون می‌زنند و `overflow-x: hidden`
  // بدنه می‌بُرَدشان؛ شمردن آن‌ها تست را پر از هشدار بی‌معنی می‌کرد و
  // همان چیزی است که یک تست را بی‌اثر می‌کند.
  const { pageScroll, viewport, offscreen } = await page.evaluate(() => {
    const w = document.documentElement.clientWidth
    const meaningful = (el: Element) => {
      if ((el as HTMLElement).matches('button, a, input, select, textarea, label')) return true
      return [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0)
    }
    return {
      pageScroll: document.documentElement.scrollWidth,
      viewport: w,
      offscreen: [...document.querySelectorAll('*')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) return false
          return (r.right > w + 2 || r.left < -2) && meaningful(el)
        })
        .slice(0, 5)
        .map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 60)}`),
    }
  })
  expect(pageScroll, 'صفحه اسکرول افقی دارد').toBeLessThanOrEqual(viewport + 1)
  expect(offscreen, `محتوایی بیرون از قاب صفحه:\n${offscreen.join('\n')}`).toEqual([])
})
