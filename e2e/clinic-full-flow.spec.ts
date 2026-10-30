import { test, expect } from '@playwright/test'
import { signIn, seed, CLINIC_ID } from './support/harness'
import { confirmHold, selectByLabel, wizardNext, wizardFinish, fillByLabel, selectOptionContaining, pickPersianDate } from './support/flow'

/**
 * MOD-TEST-004 | صفر تا صد — روند واقعیِ نوشتن، نه فقط خواندن
 *
 * `clinic-flow.spec.ts` صفحه‌ها را با داده‌ی از پیش‌کاشته باز می‌کند و
 * چیدمان را می‌سنجد. این فایل کارِ دیگری می‌کند: از یک دیتابیس **خالی**
 * شروع می‌کند و کل روز مطب را با کلیک روی فرم‌های واقعی می‌سازد —
 * بیمار، نوبت، درمان، پرداخت، مانده، لابراتوار، ایمپلنت، یادآوری.
 *
 * این همان مسیری است که مهدی هر روز طی می‌کند و هیچ تستی تا امروز
 * انجامش نمی‌داد. مسیرهای «ساخت/ذخیره» را می‌آزماید — جایی که ریاضی
 * مالی، اعتبارسنجی فیلد اجباری، و انتشار هشدار بالینی واقعاً اتفاق
 * می‌افتد. سه باگ واقعی از همین‌جا بیرون آمد (MOD-FIX-032/033 و ستاره‌ی
 * فیلد پزشک در نوبت‌دهی).
 *
 * فقط داربستِ حداقلی کاشته می‌شود — چیزی که هر مطب پیش از شروع شیفت
 * دارد: یک پزشک، یک یونیت، دو رویه‌ی قیمت‌دار، یک لابراتوار. باقی همه از
 * صفر و از راه رابط کاربری ساخته می‌شود.
 */

const NOW = new Date().toISOString()
const base = (id: string) => ({ id, clinic_id: CLINIC_ID, created_at: NOW, updated_at: NOW, sync_version: 1 })

function scaffold() {
  return {
    doctors: [{ ...base('22222222-2222-4222-8222-222222222222'), user_id: null, staff_id: null, name: 'سارا رضایی', specialty: 'ترمیمی', license_number: 'D-1001', color: '#7c3aed', is_active: true }],
    units: [{ ...base('66666666-6666-4666-8666-666666666666'), name: 'یونیت ۱', number: 1, is_active: true }],
    procedures: [
      { ...base('77777777-7777-4777-8777-777777777771'), code: 'D2140', name: 'ترمیم یک سطحی', category: 'restorative', default_price: 3_000_000, description: null, is_active: true },
      { ...base('77777777-7777-4777-8777-777777777772'), code: 'D2750', name: 'روکش', category: 'prosthetics', default_price: 12_000_000, description: null, is_active: true },
    ],
    laboratories: [{ ...base('55555555-5555-4555-8555-555555555555'), name: 'لابراتوار پارس', phone: '02188888888', address: null, contact_person: null, notes: null, is_active: true }],
  } as Record<string, any[]>
}

test.describe('صفر تا صد — روند کامل مطب', () => {
  test('🔴 بیمار → نوبت → درمان → پرداخت → مانده → لابراتوار → ایمپلنت → یادآوری', async ({ page }) => {
    test.setTimeout(240_000)
    const fatal: string[] = []
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|ERR_TUNNEL|favicon|VITE_SUPABASE|DevTools|net::/.test(m.text())) fatal.push(m.text()) })
    page.on('pageerror', (e) => fatal.push('PAGEERROR: ' + String(e)))

    await signIn(page)
    await seed(page, scaffold())
    await page.reload()
    await page.waitForLoadState('networkidle')

    // ۱. بیمار جدید ─ اعتبارسنجی فیلدهای اجباری، هشدار حساسیت
    await page.goto('/#/patients')
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'افزودن بیمار جدید' }).click()
    await page.waitForTimeout(500)
    await page.getByPlaceholder('نام', { exact: true }).fill('علی')
    await page.getByPlaceholder('نام خانوادگی').fill('محمدی')
    await page.getByPlaceholder('کد ملی').fill('0012345678')
    await page.getByPlaceholder('09xxxxxxxxx').fill('09121234567')
    await page.getByPlaceholder('تلفن ثابت منزل').fill('02133334444')
    await page.getByPlaceholder('حساسیت به دارو، غذا و...').fill('پنی‌سیلین')
    await page.getByRole('button', { name: 'پیش‌نمایش و تایید' }).click()
    await page.waitForTimeout(400)
    await confirmHold(page)
    await expect(page.getByText('علی محمدی').first()).toBeVisible()

    // ۲. نوبت‌دهی ─ ویزارد چهارمرحله‌ای، انتخاب پزشک/یونیت/ساعت
    await page.goto('/#/appointments')
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: 'نوبت جدید' }).click()
    await page.waitForTimeout(500)
    await page.getByPlaceholder('نام یا شماره بیمار را جستجو کنید...').fill('علی')
    await page.waitForTimeout(500)
    await page.getByText('علی محمدی').first().click()
    await wizardNext(page)
    await selectByLabel(page, 'پزشک *', 'دکتر سارا رضایی')
    await selectByLabel(page, 'یونیت *', 'یونیت ۱')
    await wizardNext(page)
    await page.locator('input[type="time"]').first().fill('10:00')
    await page.locator('input[type="time"]').nth(1).fill('10:30')
    await wizardNext(page)
    await selectByLabel(page, 'نوع نوبت *', 'درمان')
    await page.getByRole('button', { name: 'ثبت نوبت' }).click()
    await page.waitForTimeout(400)
    await confirmHold(page)
    await page.waitForTimeout(1500)
    await expect(page.getByText('علی محمدی').first()).toBeVisible()

    // ۳. درمان مستقیم ─ دندان → رویه (قیمت خودکار ۱۲م) → ارسال به مالی
    await page.goto('/#/treatments')
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: /شروع درمان/ }).first().click()
    await page.waitForTimeout(600)
    await selectOptionContaining(
      page.locator('select').filter({ has: page.locator('option', { hasText: 'علی محمدی' }) }).first(),
      'علی محمدی',
    )
    await selectByLabel(page, 'پزشک (اختیاری)', 'سارا')
    await page.getByRole('button', { name: /ورود به ثبت درمان/ }).click()
    await page.waitForTimeout(900)
    await page.locator('[aria-label="دندان ۸┘"]').click()
    await wizardNext(page)
    await page.waitForTimeout(400)
    await selectOptionContaining(
      page.locator('select').filter({ has: page.locator('option', { hasText: 'روکش' }) }).first(),
      'روکش',
    )
    // قیمت پیش‌فرض رویه باید خودکار در «قیمت واحد» پر شود
    const unitPrice = page.locator('xpath=//label[contains(normalize-space(.),"قیمت واحد")]/following-sibling::input').first()
    await expect(unitPrice).toHaveValue(/12[,٬]?000[,٬]?000/)
    await wizardNext(page)
    await page.getByText('پس از ثبت، برای دریافت پرداخت به مالی بروم').click()
    await wizardFinish(page, 'ثبت درمان')
    await page.waitForTimeout(400)
    await confirmHold(page)
    await page.waitForTimeout(1500)

    // ۴. پرداخت جزئی ─ go_to_billing فرم پرداخت را با مبلغ کل باز می‌کند
    await page.waitForTimeout(1200)
    await fillByLabel(page, 'مبلغ (تومان)', '5000000')
    await wizardNext(page)
    await selectByLabel(page, 'روش پرداخت *', 'نقدی')
    await wizardFinish(page, 'ثبت')
    await page.waitForTimeout(400)
    await confirmHold(page)
    await page.waitForTimeout(1500)

    // ۵. مانده ─ ۱۲م درمان − ۵م پرداخت = ۷م، در چند جای صفحه یکسان
    await page.goto('/#/patients')
    await page.waitForTimeout(800)
    await page.getByText('علی محمدی').first().click()
    await page.waitForTimeout(1200)
    const detail = await page.locator('body').innerText()
    expect(detail, 'مانده باید دقیقاً ۷ میلیون باشد').toMatch(/۷[,٬]۰۰۰[,٬]۰۰۰/)
    expect(detail, 'هزینه و پرداختی هر دو دیده شوند').toContain('پرداختی')
    expect(detail, 'هشدار حساسیت روی پرونده می‌آید').toContain('پنی‌سیلین')

    // ۶. سفارش لابراتوار ─ ویزارد + انتخاب موعد از تقویم شمسی
    await page.goto('/#/laboratory')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: /^سفارش جدید$/ }).first().click()
    await page.waitForTimeout(600)
    await selectByLabel(page, 'لابراتوار *', 'لابراتوار پارس')
    await selectOptionContaining(
      page.locator('select').filter({ has: page.locator('option', { hasText: 'علی محمدی' }) }).first(),
      'علی محمدی',
    )
    await wizardNext(page)
    await wizardNext(page)
    await pickPersianDate(page, 'موعد تحویل *', '۲۵')
    await wizardFinish(page, 'ثبت سفارش')
    await page.waitForTimeout(400)
    await confirmHold(page)
    await page.waitForTimeout(1500)
    await expect(page.getByText('علی محمدی').first()).toBeVisible()

    // ۷. ایمپلنت ─ فرم باز می‌شود، قوس دندانی درست می‌چیند
    await page.goto('/#/implants')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: /مورد جدید/ }).first().click()
    await page.waitForTimeout(700)
    await selectOptionContaining(
      page.locator('select').filter({ has: page.locator('option', { hasText: 'علی محمدی' }) }).first(),
      'علی محمدی',
    )
    await page.locator('[aria-label="دندان ۶┐"]').first().click()
    await page.waitForTimeout(300)
    // دندان پایین-راستِ بیمار باید همان‌طور برچسب بخورد (قرارداد آینه)
    await expect(page.getByText(/پایین راست بیمار/).first()).toBeVisible()
    await page.getByRole('button', { name: /^بستن$/ }).first().click().catch(() => {})

    // ۸. یادآوری دستی ─ ساده‌ترین فرم، تاریخ سررسید اجباری
    await page.goto('/#/reminders')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: /یادآوری دستی/ }).first().click()
    await page.waitForTimeout(600)
    await fillByLabel(page, 'عنوان یادآوری', 'قول پرداخت مانده')
    await fillByLabel(page, 'مبلغ (تومان، اختیاری)', '7000000')
    await pickPersianDate(page, 'تاریخ سررسید', '۲۵')
    await page.getByRole('button', { name: 'ثبت یادآوری' }).click()
    await page.waitForTimeout(1200)
    await expect(page.getByText('قول پرداخت مانده').first()).toBeVisible()

    // هیچ خطای کنسولی در کل روند
    expect(fatal, `خطای کنسول:\n${fatal.join('\n')}`).toEqual([])
  })
})
