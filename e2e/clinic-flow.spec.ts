import { test, expect, gotoRoute, holdToConfirm } from './fixtures/backend'

/**
 * MOD-TEST-002/004 | روند واقعی مطب، با مرورگر واقعی
 *
 * این همان کاری است که مهدی هر روز انجام می‌دهد: بیمار، نوبت، ویزیت، چارت،
 * درمان.
 *
 * **تغییر نسبت به نسخه‌ی قبل:** این تست‌ها دیگر به `E2E_EMAIL`/`E2E_PASSWORD`
 * نیاز ندارند و دیگر **رد نمی‌شوند**. مرز شبکه‌ی سوپابیس در
 * `fixtures/backend.ts` بسته شده، پس همه‌جا — CI و هر لپ‌تاپی — واقعاً اجرا
 * می‌شوند. تستی که همیشه skip شود، پوشش نیست؛ فقط شبیه پوشش است.
 *
 * سه ایراد نسخه‌ی قبل که باعث می‌شد حتی با رمز هم چیزی را نسنجد:
 *   ۱. `page.goto('/treatments')` — برنامه HashRouter است، پس این آدرس همیشه
 *      روی **داشبورد** می‌نشست و ادعاها صفحه‌ی اشتباه را می‌سنجیدند.
 *   ۲. `[aria-label^="دندان "]` — هیچ دندانی چنین برچسبی نداشت، پس تست
 *      «قوس آینه نیست» روی صفر عنصر اجرا می‌شد.
 *   ۳. ConfirmAction با کلیک ثبت نمی‌کند، با نگه‌داشتن ثبت می‌کند.
 */

const PATIENT = { first: 'زهرا', last: 'کریمی', nationalId: '0079542118', mobile: '09121234567', landline: '02133445566' }

async function createPatient(page: import('@playwright/test').Page) {
  await gotoRoute(page, '/patients')
  await page.getByRole('button', { name: /بیمار جدید/ }).first().click()
  await page.getByPlaceholder('نام', { exact: true }).fill(PATIENT.first)
  await page.getByPlaceholder('نام خانوادگی').fill(PATIENT.last)
  await page.getByPlaceholder('کد ملی').fill(PATIENT.nationalId)
  await page.getByPlaceholder('09xxxxxxxxx').fill(PATIENT.mobile)
  await page.getByPlaceholder('تلفن ثابت منزل').fill(PATIENT.landline)
  await page.getByRole('button', { name: /پیش‌نمایش و تایید/ }).click()
  await holdToConfirm(page)
  await expect(page.getByText(`${PATIENT.first} ${PATIENT.last}`).first()).toBeVisible({ timeout: 15_000 })
}

async function openChart(page: import('@playwright/test').Page) {
  await gotoRoute(page, '/treatments')
  await page.getByRole('button', { name: 'ویزیت', exact: true }).click()
  const selects = page.locator('select')
  const n = await selects.count()
  await selects.nth(n - 2).selectOption({ index: 1 })
  await selects.nth(n - 1).selectOption({ index: 1 })
  await page.getByRole('button', { name: /ورود به چارت دندانی/ }).click()
  await expect(page.locator('[aria-label^="دندان "]').first()).toBeVisible({ timeout: 20_000 })
}

test.describe('روند مطب', () => {
  test('چارت دندانی آینه نیست — راست بیمار سمت چپ صفحه است', async ({ clinic: page }) => {
    // MOD-FIX-013: کل قوس برعکس بود و ۷۱۰ تست سبز ماندند. فقط یک مرورگر
    // واقعی می‌تواند بگوید کدام دندان **کجای صفحه** است.
    await createPatient(page)
    await openChart(page)

    // FDI 11 = ثنایای میانی بالا راستِ بیمار، FDI 21 = قرینه‌اش سمت چپ.
    // چارت از دید روبه‌روی بیمار کشیده می‌شود، پس راستِ بیمار باید چپِ صفحه
    // باشد: x دندان ۱۱ باید کمتر از x دندان ۲۱ باشد.
    const right = await page.locator('[aria-label="دندان 11"]').boundingBox()
    const left = await page.locator('[aria-label="دندان 21"]').boundingBox()
    expect(right, 'دندان ۱۱ روی صفحه پیدا نشد').toBeTruthy()
    expect(left, 'دندان ۲۱ روی صفحه پیدا نشد').toBeTruthy()
    expect(
      right!.x,
      `قوس آینه است: دندان ۱۱ (راست بیمار) در x=${right!.x} و دندان ۲۱ (چپ بیمار) در x=${left!.x}`,
    ).toBeLessThan(left!.x)
  })

  test('قوس دندان تمام عرض دارد، نه نصف', async ({ clinic: page }) => {
    // MOD-FIX-012: قوس در نصف عرض گیر کرده بود.
    await createPatient(page)
    await openChart(page)

    const teeth = page.locator('[aria-label^="دندان "]')
    // ۳۲ دندان دائمی: چهار ربع هشت‌تایی. کمتر از این یعنی نیمی از قوس نیست.
    expect(await teeth.count(), 'همه‌ی ۳۲ دندان دائمی رندر نشده‌اند').toBe(32)

    // و هر چهار ربع باید واقعاً در DOM باشند، نه فقط دو تا.
    for (const fdi of [18, 28, 38, 48]) {
      await expect(page.locator(`[aria-label="دندان ${fdi}"]`), `ربع دندان ${fdi} غایب است`).toHaveCount(1)
    }
  })

  test('وضعیت و سطح دندان بعد از ذخیره باقی می‌ماند', async ({ clinic: page }) => {
    // 🔴 دندانپزشک «پوسیدگی» و سطح اکلوزال را می‌زند، «ذخیره تغییرات» را
    // می‌زند، بازخورد موفقیت می‌گیرد — و هر دو دور ریخته می‌شوند.
    // handleUpdateTooth در Treatments.tsx و PatientDetail.tsx فقط
    // is_missing/is_implant/notes را می‌نوشتند، با `as any` که جلوی
    // typecheck را هم گرفته بود.
    await createPatient(page)
    await openChart(page)

    await page.locator('[aria-label="دندان 16"]').click()
    await page.getByRole('button', { name: 'پوسیدگی', exact: true }).click()
    // Picking a surface only opens its condition list — the surface is not
    // recorded until a condition is chosen for it.
    await page.getByRole('button', { name: 'اکلوزال (جونده)' }).click()
    const surfacePanel = page.locator('div').filter({ hasText: /^وضعیت سطح/ }).last()
    await surfacePanel.getByRole('button', { name: 'پوسیدگی', exact: true }).click()
    await page.getByRole('button', { name: 'ذخیره تغییرات' }).click()

    const saved = await page.evaluate(() => new Promise<Record<string, unknown> | null>((res) => {
      const req = indexedDB.open('minadent')
      req.onsuccess = () => {
        const all = req.result.transaction('tooth_records').objectStore('tooth_records').getAll()
        all.onsuccess = () => res((all.result as Record<string, unknown>[]).find((r) => r.tooth_number === '16') || null)
      }
      req.onerror = () => res(null)
    }))

    expect(saved, 'هیچ رکوردی برای دندان ۱۶ ذخیره نشد').toBeTruthy()
    expect(saved!.condition, 'وضعیت دندان ذخیره نشد').toBe('caries')
    expect(String(saved!.surfaces ?? ''), 'سطح انتخاب‌شده ذخیره نشد').toContain('occlusal')
  })

  test('نوار نگه‌داشتن تایید، در صفحه‌ی راست‌به‌چپ از راست پر می‌شود', async ({ clinic: page }) => {
    // همان خانواده‌ی MOD-FIX-013: جهت بصری برعکسِ جهت خواندن.
    // ConfirmAction دروازه‌ی نهایی هر ثبت در برنامه است.
    await gotoRoute(page, '/patients')
    await page.getByRole('button', { name: /بیمار جدید/ }).first().click()
    await page.getByPlaceholder('نام', { exact: true }).fill(PATIENT.first)
    await page.getByPlaceholder('نام خانوادگی').fill(PATIENT.last)
    await page.getByPlaceholder('کد ملی').fill(PATIENT.nationalId)
    await page.getByPlaceholder('09xxxxxxxxx').fill(PATIENT.mobile)
    await page.getByPlaceholder('تلفن ثابت منزل').fill(PATIENT.landline)
    await page.getByRole('button', { name: /پیش‌نمایش و تایید/ }).click()
    await page.getByRole('button', { name: /ادامه و تایید/ }).click()

    const fill = page.locator('[data-testid="hold-progress"]')
    await fill.waitFor({ state: 'visible' })
    const button = page.locator('button').filter({ has: fill }).first()
    const box = (await button.boundingBox())!

    // Two traps make the obvious measurement lie:
    //   • the button is bg-gradient-to-br, so it is lighter on the left no
    //     matter what the fill does — raw left/right brightness measures
    //     the gradient, not the progress;
    //   • it also gets `scale-[0.98]` the moment a hold starts, so a naive
    //     before/after diff compares two different geometries and the edges
    //     swamp the signal.
    // Pin the transform so both frames share one geometry, then diff. Wall
    // clock is not used to decide *when* to shoot: the hold runs on a 22ms
    // timer that drifts under parallel load, so the frame is taken once the
    // fill has actually reached a known share of the button.
    // Where the fill is actually painted, read in ONE evaluate so the
    // geometry and the progress come from the same instant.
    //
    // A pixel measurement is what proved this bug in the first place, but
    // it cannot be kept: the hold commits after ~550ms, the button gains
    // `scale-[0.98]` and swaps its label to «در حال آماده‌سازی…» while it
    // runs, and a screenshot taken across that is a coin toss. Reading the
    // painted rect is deterministic and says the same thing — the overlay
    // is clipped, so its visible region, not its box, is what the eye sees.
    const painted = async () => fill.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const clip = getComputedStyle(el).clipPath || ''
      // inset(top right bottom left). The browser resolves each side
      // independently, so the same rule comes back as a mix of px and %.
      const parts = [...clip.matchAll(/(-?[\d.]+)(px|%)/g)]
        .map((m) => (m[2] === '%' ? (Number(m[1]) / 100) * r.width : Number(m[1])))
      const [, rightInset = 0, , leftInset = 0] = parts
      return {
        boxLeft: r.left,
        boxRight: r.right,
        width: r.width,
        visibleLeft: r.left + leftInset,
        visibleRight: r.right - rightInset,
        parsed: parts.length === 4,
      }
    })

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    let shot = await painted()
    await expect.poll(async () => {
      shot = await painted()
      const covered = (shot.visibleRight - shot.visibleLeft) / shot.width
      return covered > 0.2 && covered < 0.9 ? 1 : 0
    }, { timeout: 5_000, intervals: [16] }).toBe(1)
    await page.mouse.up()

    expect(shot.parsed, 'شکل clip نوار پیشرفت خوانده نشد — این تست باید به‌روز شود').toBe(true)

    // In an RTL screen progress must start at the right edge and run left,
    // exactly like the booking wizard's own step bar one dialog earlier. So
    // the painted part has to stay welded to the button's right edge while
    // its left edge travels inward.
    expect(
      Math.abs(shot.visibleRight - shot.boxRight),
      `نوار پیشرفت به لبه‌ی راست نچسبیده — از راست ${(shot.boxRight - shot.visibleRight).toFixed(0)} پیکسل فاصله دارد`,
    ).toBeLessThan(2)
    expect(
      shot.visibleLeft - shot.boxLeft,
      'نوار پیشرفت از لبه‌ی چپ شروع شده — در RTL باید از راست پر شود',
    ).toBeGreaterThan(2)
  })

  test('هیچ صفحه‌ای از عرض گوشی بیرون نمی‌زند', async ({ clinic: page }, testInfo) => {
    test.skip(testInfo.project.name !== 'iphone', 'فقط روی عرض گوشی معنی دارد')

    const routes = ['/', '/patients', '/appointments', '/treatments', '/billing', '/laboratory', '/settings']
    for (const route of routes) {
      await gotoRoute(page, route)
      const m = await page.evaluate(() => {
        const de = document.documentElement
        return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth }
      })
      expect(
        m.scrollWidth,
        `صفحه ${route} به اندازه‌ی ${m.scrollWidth - m.clientWidth} پیکسل افقی اسکرول می‌خورد`,
      ).toBeLessThanOrEqual(m.clientWidth + 1)
    }
  })
})
