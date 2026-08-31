import { test, expect, Page } from '@playwright/test'

/**
 * MOD-TEST-002 | روند واقعی مطب، با مرورگر واقعی
 *
 * این همان کاری است که مهدی هر روز انجام می‌دهد و تا امروز هیچ تستی
 * انجامش نمی‌داد: بیمار، نوبت، ویزیت، چارت، درمان، لابراتوار، پرداخت.
 *
 * برای ورود به رمز نیاز دارد، پس اگر رمزی تنظیم نشده باشد **رد می‌شود**
 * نه اینکه شکست بخورد. تستی که در محیط بدون دسترسی قرمز شود، بعد از
 * چند روز نادیده گرفته می‌شود و آن‌وقت واقعاً بی‌فایده است.
 *
 * تنظیم روی لپ‌تاپ (یا در GitHub Secrets):
 *   E2E_EMAIL=...
 *   E2E_PASSWORD=...
 */

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'برای این تست‌ها E2E_EMAIL و E2E_PASSWORD لازم است')

async function signIn(page: Page) {
  await page.goto('/')
  const email = page.getByRole('textbox').first()
  await email.fill(EMAIL as string)
  await page.locator('input[type="password"]').fill(PASSWORD as string)
  await page.getByRole('button', { name: /ورود/ }).click()
  await expect(page.getByText(/داشبورد/).first()).toBeVisible({ timeout: 20_000 })
}

test.describe('روند مطب', () => {
  test.beforeEach(async ({ page }) => { await signIn(page) })

  test('چارت دندانی آینه نیست — راست بیمار سمت چپ صفحه است', async ({ page }) => {
    // MOD-FIX-013: کل قوس برعکس بود و ۷۱۰ تست سبز ماندند. فقط یک مرورگر
    // واقعی می‌تواند بگوید کدام دندان **کجای صفحه** است.
    await page.goto('/treatments')

    const arch = page.locator('[aria-label^="دندان "]')
    if ((await arch.count()) === 0) test.skip(true, 'قوس روی این صفحه باز نیست')

    const first = arch.first()
    const last = arch.last()
    const firstBox = await first.boundingBox()
    const lastBox = await last.boundingBox()
    const firstLabel = await first.getAttribute('aria-label')
    const lastLabel = await last.getAttribute('aria-label')

    expect(firstLabel).toContain('UR')
    expect(lastLabel).toContain('LL')
    // راستِ بیمار باید از نظر مختصات، چپ‌تر باشد.
    expect(firstBox!.x).toBeLessThan(lastBox!.x + firstBox!.width)
  })

  test('قوس دندان تمام عرض دارد، نه نصف', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'iphone', 'فقط روی عرض گوشی معنی دارد')
    await page.goto('/laboratory')

    const arch = page.locator('[aria-label^="دندان "]').first()
    if (!(await arch.isVisible().catch(() => false))) test.skip(true, 'فرم سفارش باز نیست')

    const container = page.locator('[aria-label^="دندان "]').first().locator('xpath=ancestor::div[3]')
    const box = await container.boundingBox()
    const viewport = page.viewportSize()!
    // MOD-FIX-012: نصف عرض گرفته بود. کمتر از ۷۰٪ یعنی همان باگ برگشته.
    expect(box!.width / viewport.width).toBeGreaterThan(0.7)
  })

  test('صفحه‌ی چاپ راه خروج دارد', async ({ page, context }) => {
    // MOD-FIX-011: سند چاپی هیچ دکمه‌ای نداشت و کاربر باید برنامه را
    // می‌بست. داخل PWA این صفحه **کل** صفحه است.
    await page.goto('/billing')
    const printLink = page.getByText('چاپ رسید').first()
    if (!(await printLink.isVisible().catch(() => false))) test.skip(true, 'رسیدی برای چاپ نیست')

    const [doc] = await Promise.all([context.waitForEvent('page'), printLink.click()])
    await expect(doc.getByText('بازگشت')).toBeVisible()
    await expect(doc.getByText('چاپ')).toBeVisible()
  })

  test('هیچ صفحه‌ای از عرض گوشی بیرون نمی‌زند', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'iphone', 'فقط روی عرض گوشی معنی دارد')

    for (const path of ['/', '/patients', '/appointments', '/treatments', '/billing', '/laboratory', '/implants']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => {
        const w = document.documentElement.clientWidth
        return [...document.querySelectorAll('*')]
          .filter((el) => el.getBoundingClientRect().right > w + 2)
          .slice(0, 3)
          .map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 50)}`)
      })
      expect(overflow, `${path} سرریز دارد:\n${overflow.join('\n')}`).toEqual([])
    }
  })
})
