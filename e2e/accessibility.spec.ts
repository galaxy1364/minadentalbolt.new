import { test, expect, Page } from '@playwright/test'
import AxeBuilder from './support/axeBuilder'
import { signInWithDemoData, stubNetwork } from './support/harness'

/**
 * MOD-TEST-A11Y | چک خودکار برچسب‌های صفحه‌خوان
 *
 * تسک #24 دستی همه‌ی دکمه‌های صرفاً آیکونی را در سراسر برنامه پیدا و
 * اصلاح کرد (Login، Dashboard، Treatments، Settings،
 * WaitingRoomDisplay، Radiology، PatientDetail، DentalChart،
 * OrthodonticChart، PersianClinicAiAssistant، AppLockScreen،
 * DocumentScannerModal، PersianCalendar، DentalRadiologyViewer). هیچ‌چیز
 * جلوی این را نمی‌گیرد که یک دکمهٔ آیکونی جدید بدون نام قابل‌دسترس
 * منتشر شود — این فایل همان سد است.
 *
 * axe-core فقط قوانینی را اجرا می‌کند که مستقیماً به «نام قابل‌دسترس»
 * مربوط‌اند (دکمه، لینک، ورودی، تصویر، عنصر با aria-hidden که فوکوس‌پذیر
 * مانده). قوانین بصری مثل کنتراست رنگ عمداً کنار گذاشته شده‌اند چون
 * Chromium headless بدون رندر واقعی فونت/CSS گاهی مثبت کاذب می‌دهد و
 * پوشش بصری همین حالا در e2e/smoke.spec.ts و clinic-flow.spec.ts هست.
 */

const A11Y_RULES = [
  'button-name',
  'link-name',
  'aria-command-name',
  'input-button-name',
  'image-alt',
  'svg-img-alt',
  'area-alt',
  'aria-input-field-name',
  'aria-hidden-focus',
  'select-name',
  'label',
]

/** هر عنصر تعاملی روی این صفحه باید یک نام قابل‌دسترس داشته باشد. */
async function expectNoMissingLabels(page: Page, screenName: string) {
  const results = await new AxeBuilder({ page }).withRules(A11Y_RULES).analyze()
  const details = results.violations
    .map((v) => `- ${v.id}: ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(' ')} :: ${n.failureSummary}`).join('\n')}`)
    .join('\n')
  expect(results.violations, `${screenName} عنصر تعاملی بدون نام قابل‌دسترس دارد:\n${details}`).toEqual([])
}

test.describe('دسترس‌پذیری — نام قابل‌دسترس روی عناصر تعاملی', () => {
  test('صفحه ورود', async ({ page }) => {
    await stubNetwork(page)
    await page.goto('/')
    await expect(page.locator('input[type="email"], input[type="password"]').first()).toBeVisible({ timeout: 15_000 })
    await expectNoMissingLabels(page, 'صفحه ورود')
  })

  const SCREENS: Array<{ name: string; path: string }> = [
    { name: 'داشبورد', path: '/' },
    { name: 'لیست بیماران', path: '/patients' },
    { name: 'نوبت‌دهی', path: '/appointments' },
    { name: 'تقویم', path: '/calendar' },
    { name: 'درمان‌ها', path: '/treatments' },
    { name: 'صورت‌حساب', path: '/billing' },
    { name: 'تنظیمات', path: '/settings' },
  ]

  for (const { name, path } of SCREENS) {
    test(name, async ({ page }) => {
      test.setTimeout(60_000)
      await signInWithDemoData(page)
      await page.goto('/#' + path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      await expectNoMissingLabels(page, name)
    })
  }

  test('جزئیات بیمار', async ({ page }) => {
    test.setTimeout(60_000)
    const demo = await signInWithDemoData(page)
    await page.goto('/#/patients/' + demo.ids.patientId)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expectNoMissingLabels(page, 'جزئیات بیمار')
  })

  test('سالن انتظار (نمایشگر عمومی)', async ({ page }) => {
    await page.goto('/#/waiting-room')
    await page.waitForLoadState('networkidle')
    await expectNoMissingLabels(page, 'سالن انتظار')
  })
})
