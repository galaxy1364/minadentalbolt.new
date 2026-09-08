import { test, expect, Page } from '@playwright/test'
import { signInWithDemoData } from './support/harness'

/**
 * MOD-TEST-002 / MOD-TEST-003 | روند واقعی مطب، با مرورگر واقعی
 *
 * تا v1.226 هر تست این فایل **همیشه** skip می‌شد: به `E2E_EMAIL` و
 * `E2E_PASSWORD` نیاز داشت و آن‌ها در CI نبودند. یعنی تنها لایه‌ای که
 * چیدمان را می‌بیند — همان لایه‌ای که برای «قوس آینه» و «قوس نصف‌عرض»
 * ساخته شد — هرگز یک بار هم اجرا نشد.
 *
 * حالا `signInWithDemoData` شبکه‌ی سوپابیس را stub می‌کند و داده‌ی
 * نمونه را در همان IndexedDB‌ای می‌نویسد که خود برنامه از آن می‌خواند.
 * پس این تست‌ها روی هر لپ‌تاپی و در CI اجرا می‌شوند، بدون هیچ رمزی.
 */

/** هر مسیری که از منو قابل باز شدن است. */
const ROUTES = [
  '/', '/patients', '/appointments', '/calendar', '/treatments', '/billing',
  '/laboratory', '/implants', '/insurance', '/inventory', '/prescriptions',
  '/radiology', '/staff', '/reports', '/waiting-list', '/settings', '/archive',
  '/personal-finance', '/sms', '/reminders',
]

/** خطاهایی که به برنامه ربط ندارند و در هر محیطی هستند. */
function fatalOnly(errors: string[]): string[] {
  return errors.filter((e) => !/favicon|Download the React DevTools|ERR_TUNNEL|Failed to load resource/i.test(e))
}

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e}`))
  return errors
}


/** بردن کاربر تا فرمی که قوس دندانی در آن باز است. */
async function openTreatmentForm(page: Page, patientId: string) {
  await page.goto('/#/treatments')
  await page.getByRole('button', { name: /شروع درمان/ }).first().click()
  const patientSelect = page.locator('select').filter({ has: page.locator(`option[value="${patientId}"]`) })
  await patientSelect.first().selectOption(patientId)
  await page.getByRole('button', { name: /ورود به ثبت درمان/ }).click()
  await page.waitForTimeout(1500)
}

test.describe('روند مطب', () => {
  test('🔴 هیچ ماژولی هنگام باز شدن نمی‌شکند', async ({ page }) => {
    // MOD-FIX-024 بود: `Reports` یک useMemo بعد از return زودهنگام
    // داشت، پس همان لحظه‌ای که loading از true به false می‌رفت React
    // «Rendered more hooks than during the previous render» می‌داد و کل
    // صفحه‌ی گزارش‌ها به ErrorBoundary می‌افتاد. ۱۰۶۲ تست واحد سبز بودند.
    test.setTimeout(180_000)
    const errors = watchErrors(page)
    await signInWithDemoData(page)

    for (const path of ROUTES) {
      await page.goto('/#' + path)
      await page.waitForTimeout(700)
      await expect(page.locator('body')).not.toContainText('خطایی رخ داد')
      expect(fatalOnly(errors), `${path} خطای کنسول داد:\n${fatalOnly(errors).join('\n')}`).toEqual([])
    }
  })

  test('🔴 هیچ صفحه‌ای از عرض گوشی بیرون نمی‌زند', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'iphone', 'فقط روی عرض گوشی معنی دارد')
    test.setTimeout(180_000)
    await signInWithDemoData(page)

    for (const path of ROUTES) {
      await page.goto('/#' + path)
      await page.waitForTimeout(600)
      // اسکرول افقی خودِ سند، همان چیزی است که کاربر حس می‌کند —
      // نه هر عنصری که تصادفاً از قاب بیرون است ولی والدش می‌بُرَدش.
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth, `${path} از عرض صفحه بیرون زده`).toBeLessThanOrEqual(clientWidth + 1)
    }
  })

  test('🔴 قوس دندانی آینه نیست — راست بیمار سمت چپ صفحه است', async ({ page }) => {
    // MOD-FIX-013: کل قوس برعکس بود و ۷۱۰ تست سبز ماندند. فقط یک مرورگر
    // واقعی می‌تواند بگوید کدام دندان **کجای صفحه** است.
    //
    // تستِ قبلی این فایل دنبال برچسب `UR` می‌گشت، ولی از MOD-FEAT-032 به
    // بعد برچسب براکت واقعی پالمر است (`۸┘`) — یعنی حتی اگر روزی اجرا
    // می‌شد هم skip می‌کرد. انتخابگرها از روی کد حدس زده شده بودند، نه
    // از روی DOM واقعی؛ همان چیزی که در بریف تحویل هشدار داده شده بود.
    test.setTimeout(120_000)
    const demo = await signInWithDemoData(page)
    await openTreatmentForm(page, demo.ids.patientId)

    const teeth = page.locator('[aria-label^="دندان "]')
    await expect(teeth.first()).toBeVisible()
    expect(await teeth.count(), 'قوس دائمی باید ۳۲ دندان داشته باشد').toBe(32)

    // `۸┘` بالا-راستِ بیمار است و `└۸` بالا-چپِ او. قرارداد جهانی:
    // راستِ بیمار سمت چپِ صفحه.
    const box = async (label: string) =>
      (await page.locator(`[aria-label="دندان ${label}"]`).boundingBox())!
    const ur8 = await box('۸┘')
    const ul8 = await box('└۸')
    expect(ur8.x, 'راستِ بیمار باید چپ‌ترِ صفحه باشد').toBeLessThan(ul8.x)

    // MOD-FIX-012: قوس نصف عرض گیر کرده بود، داخل یک grid دو ستونه.
    // سنجه، عرضِ خودِ ظرفِ فرم است نه عرض صفحه: روی دسکتاپ مودال عمداً
    // تمام‌عرض نیست، پس نسبت به viewport چیزی را ثابت نمی‌کند.
    const ratio = await page.evaluate(() => {
      const tooth = document.querySelector('[aria-label="دندان ۸┘"]')
      const arch = tooth?.closest('div[dir="ltr"]') as HTMLElement | null
      const field = arch?.parentElement as HTMLElement | null
      const column = field?.parentElement as HTMLElement | null
      if (!arch || !column) return null
      return arch.getBoundingClientRect().width / column.getBoundingClientRect().width
    })
    expect(ratio, 'قوس در ظرف خودش پیدا نشد').not.toBeNull()
    expect(ratio!, 'قوس نصف عرضِ فرم گیر کرده').toBeGreaterThan(0.9)
  })

  test('🔴 دکمه‌ی شناور محتوا را نمی‌پوشاند', async ({ page }, testInfo) => {
    // MOD-FIX-031: پیل «جستجو و دستیار» روی گوشه‌ی پایین-چپ شناور است،
    // دقیقاً همان‌جا که وضعیت یک نوبت نوشته می‌شود. حالا با اسکرول به
    // پایین کنار می‌رود و با اسکرول به بالا برمی‌گردد.
    test.skip(testInfo.project.name !== 'iphone', 'فقط روی گوشی پنهان می‌شود')
    await signInWithDemoData(page)
    await page.goto('/#/treatments')
    await page.waitForTimeout(1200)

    const fab = page.locator('button[aria-label="دستیار هوشمند"]')
    const opacity = () => fab.evaluate((el) => getComputedStyle(el).opacity)
    expect(await opacity(), 'در بالای صفحه باید دیده شود').toBe('1')

    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(700)
    expect(await opacity(), 'با اسکرول به پایین باید کنار برود').toBe('0')

    await page.mouse.wheel(0, -400)
    await page.waitForTimeout(700)
    expect(await opacity(), 'با اسکرول به بالا باید برگردد').toBe('1')
  })

  test('🔴 تاریخ‌ها با رقم فارسی نوشته می‌شوند', async ({ page }) => {
    // MOD-FIX-025: جدول ویزیت‌ها «1405/06/17» می‌نوشت، درست کنار
    // «۱۵,۰۰۰,۰۰۰ ت» — دو دستگاه رقم در یک ردیف.
    await signInWithDemoData(page)
    await page.goto('/#/treatments')
    await page.waitForTimeout(1200)
    const dates = await page.locator('body').innerText()
    expect(dates, 'تاریخ با رقم لاتین در صفحه هست').not.toMatch(/\b1[34]\d{2}\/\d{2}\/\d{2}\b/)
  })
})
