/**
 * MOD-FIX-016 | منبع «2-00-02» پیدا شد
 *
 * گزارش مهدی: «تاریخ کلیک می‌کنم، بعد جاش سفیده، نشون نمی‌ده.»
 *
 * `PersianCalendar` خروجی `jalaliToGregorian` را — که یک **رشته‌ی**
 * ISO است — مثل یک آرایه‌ی `[سال، ماه، روز]` باز می‌کرد:
 *
 *     const [gy, gm, gd] = jalaliToGregorian(...)   // "2026-08-31"
 *     → gy='2', gm='0', gd='2'
 *     → `${gy}-${pad(gm)}-${pad(gd)}`  →  "2-00-02"
 *
 * **هر تاریخی که از تقویم انتخاب می‌شد خراب بود.** فقط جایی دیده می‌شد
 * که مقدار دوباره نمایش داده شود (فیلد سفید می‌ماند، چون
 * `new Date("2-00-02")` نامعتبر است) یا به سرور برود — همان دو رکوردی
 * که ده بار در صف سینک شکست خوردند.
 *
 * MOD-FIX-015 نشانه را درمان کرد؛ این رکورد علت را.
 */
import { describe, it, expect } from 'vitest'
import { jalaliToGregorian, toJalaliStringPretty, toJalali } from './persianDate'
import { isValidISODate } from './dateSanitise'

describe('🔴 تبدیل تاریخ، رشته می‌دهد نه آرایه', () => {
  it('خروجی یک رشته است', () => {
    // اگر روزی این تابع آرایه برگرداند، هر فراخوانی‌اش باید بازبینی شود.
    expect(typeof jalaliToGregorian(1405, 6, 10)).toBe('string')
  })

  it('خروجی یک تاریخ ISO معتبر است', () => {
    expect(isValidISODate(jalaliToGregorian(1405, 6, 10))).toBe(true)
  })

  it('🔴 باز کردن رشته مثل آرایه، دقیقاً «2-00-02» می‌سازد', () => {
    // این همان اشتباهی است که در PersianCalendar بود — اینجا بازسازی
    // می‌شود تا هیچ‌کس فکر نکند فرضیه است.
    const iso = jalaliToGregorian(1405, 6, 10)
    const [gy, gm, gd] = iso as unknown as [string, string, string]
    const rebuilt = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
    expect(rebuilt).toBe('2-00-02')
    expect(isValidISODate(rebuilt)).toBe(false)
  })
})

describe('🔴 تاریخ انتخاب‌شده دوباره نمایش داده می‌شود', () => {
  it('رفت و برگشت شمسی → میلادی → شمسی سالم است', () => {
    for (const [jy, jm, jd] of [[1405, 1, 1], [1405, 6, 10], [1405, 12, 29], [1404, 11, 30]] as const) {
      const iso = jalaliToGregorian(jy, jm, jd)
      const [by, bm, bd] = toJalali(...iso.split('-').map(Number) as [number, number, number])
      expect([by, bm, bd], `${jy}/${jm}/${jd}`).toEqual([jy, jm, jd])
    }
  })

  it('🔴 نمایش خالی نمی‌ماند — همان چیزی که مهدی دید', () => {
    // فیلد سفید یعنی toJalaliStringPretty رشته‌ی خالی داده، و آن فقط
    // وقتی است که تاریخ نامعتبر باشد.
    const iso = jalaliToGregorian(1405, 6, 10)
    expect(toJalaliStringPretty(iso)).not.toBe('')
    expect(toJalaliStringPretty(iso)).toContain('شهریور')
  })

  it('تاریخ خراب همچنان خالی نشان داده می‌شود، نه چیز جعلی', () => {
    // رفتار درست برای مقدار نامعتبر: چیزی نگو، حدس نزن.
    expect(toJalaliStringPretty('2-00-02')).toBe('')
  })

  it('سه ماه بعد هم درست نمایش داده می‌شود', () => {
    // سناریوی مهدی: «سه ماه دیگه تاریخ رو انتخاب می‌کنم».
    const iso = jalaliToGregorian(1405, 9, 10)
    expect(toJalaliStringPretty(iso)).toContain('آذر')
  })
})

/** قفل ساختاری: تقویم دیگر رشته را دوباره نمی‌سازد. */
import calendar from '../components/PersianCalendar.tsx?raw'

describe('🔴 تقویم رشته‌ی ISO را دست‌کاری نمی‌کند', () => {
  it('خروجی تابع مشترک مستقیم برگردانده می‌شود', () => {
    expect(calendar).toContain('jalaliToGregorianFunc(viewYear, viewMonth, day)')
  })

  it('هیچ بازسازی دستی رشته‌ی تاریخ نمانده', () => {
    // قانون پروژه: هیچ دو مسیر برای یک مقصد. مسیر دوم از اولی جدا افتاد
    // و کسی متوجه نشد چون هر دو معقول به نظر می‌رسیدند.
    expect(calendar).not.toMatch(/const \[gy, gm, gd\]/)
    expect(calendar).not.toMatch(/\$\{gy\}-\$\{String\(gm\)/)
  })
})
