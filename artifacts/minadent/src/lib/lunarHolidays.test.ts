/**
 * MOD-TEST-008 | تست‌های تعطیلات قمری
 *
 * این تست‌ها مهم‌اند چون خروجی این ماژول مستقیم در صفحه‌ی نوبت‌دهی
 * دیده می‌شود: تاریخ غلط یعنی نوبت دادن در روز تعطیل، یا بستن مطب
 * در روز کاری.
 */
import { describe, it, expect } from 'vitest'
import {
  LUNAR_HOLIDAYS, gregorianToHijri, getLunarHoliday, isLunarHoliday,
} from './lunarHolidays'

describe('تبدیل میلادی به قمری', () => {
  /**
   * مقادیر مرجع با اجرای واقعی Intl گرفته شده‌اند، نه از حافظه.
   */
  it('۵ جولای ۲۰۲۵ برابر ۱۰ محرم است (عاشورا)', () => {
    const h = gregorianToHijri('2025-07-05')
    expect(h).not.toBeNull()
    expect(h!.month).toBe(1)
    expect(h!.day).toBe(10)
  })

  it('۲۰ مارس ۲۰۲۶ برابر ۱ شوال است (عید فطر)', () => {
    const h = gregorianToHijri('2026-03-20')
    expect(h!.month).toBe(10)
    expect(h!.day).toBe(1)
  })

  it('سال قمری در محدوده‌ی معقول است', () => {
    const h = gregorianToHijri('2026-08-26')
    expect(h!.year).toBeGreaterThan(1440)
    expect(h!.year).toBeLessThan(1470)
  })

  it('تاریخ نامعتبر باعث خطا نمی‌شود', () => {
    expect(() => gregorianToHijri('چرند')).not.toThrow()
  })
})

describe('تشخیص تعطیلات', () => {
  it('عاشورا تشخیص داده می‌شود', () => {
    expect(getLunarHoliday('2025-07-05')).toContain('عاشورا')
  })

  it('عید فطر تشخیص داده می‌شود', () => {
    expect(getLunarHoliday('2026-03-20')).toContain('فطر')
  })

  it('یک روز کاری معمولی تعطیل نیست', () => {
    // ۱۳ ربیع‌الاول — هیچ تعطیلی رسمی نیست
    expect(getLunarHoliday('2026-08-26')).toBeNull()
    expect(isLunarHoliday('2026-08-26')).toBe(false)
  })
})

describe('صحت جدول تعطیلات', () => {
  /**
   * باگ اصلی که این ماژول رفع می‌کند: تکرار همان ماه/روز. این تست
   * تضمین می‌کند هیچ دو تعطیلی ماه/روز یکسان نداشته باشند.
   */
  it('هیچ دو تعطیلی ماه و روز یکسان ندارند', () => {
    const keys = LUNAR_HOLIDAYS.map((h) => `${h.month}-${h.day}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('همه‌ی ماه‌ها بین ۱ تا ۱۲ هستند', () => {
    for (const h of LUNAR_HOLIDAYS) {
      expect(h.month).toBeGreaterThanOrEqual(1)
      expect(h.month).toBeLessThanOrEqual(12)
    }
  })

  it('همه‌ی روزها بین ۱ تا ۳۰ هستند (ماه قمری حداکثر ۳۰ روز)', () => {
    for (const h of LUNAR_HOLIDAYS) {
      expect(h.day).toBeGreaterThanOrEqual(1)
      expect(h.day).toBeLessThanOrEqual(30)
    }
  })

  it('هیچ عنوانی خالی نیست', () => {
    for (const h of LUNAR_HOLIDAYS) {
      expect(h.title.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('جابه‌جایی سالانه — هسته‌ی باگ اصلی', () => {
  /**
   * **مهم‌ترین تست این فایل.** باگ اصلی این بود که تاریخ تعطیلات
   * در سال‌های مختلف شمسی یکسان فرض شده بود. تعطیلات قمری هر سال
   * شمسی حدود ۱۱ روز عقب می‌روند. این تست ثابت می‌کند محاسبه‌ی
   * جدید واقعاً این جابه‌جایی را نشان می‌دهد.
   */
  it('عاشورا در دو سال میلادی متوالی تاریخ متفاوت دارد', () => {
    const findAshura = (year: number): string | null => {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= 31; d++) {
          const iso = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const h = gregorianToHijri(iso)
          if (h && h.month === 1 && h.day === 10) return iso
        }
      }
      return null
    }
    const a2025 = findAshura(2025)
    const a2026 = findAshura(2026)
    expect(a2025).not.toBeNull()
    expect(a2026).not.toBeNull()
    expect(a2025).not.toBe(a2026)
  })

  it('جابه‌جایی سالانه حدود ۱۰ تا ۱۲ روز است', () => {
    const h1 = gregorianToHijri('2025-07-05')!
    // ۳۵۴ روز بعد (یک سال قمری) باید تقریباً همان روز قمری باشد
    const later = new Date('2025-07-05T12:00:00Z')
    later.setUTCDate(later.getUTCDate() + 354)
    const h2 = gregorianToHijri(later.toISOString().slice(0, 10))!
    expect(h2.month).toBe(h1.month)
    expect(Math.abs(h2.day - h1.day)).toBeLessThanOrEqual(2)
  })
})

describe('یکپارچگی با getHoliday — باگ واقعی که اینجا کشف شد', () => {
  /**
   * این تست یک باگ از پیش موجود را کشف کرد: `getHoliday` از
   * `replace('/', '-')` استفاده می‌کرد که فقط **اولین** اسلش را
   * عوض می‌کند. پس «1406/05/01» می‌شد «1406-05/01» و هیچ کلیدی
   * مطابقت نمی‌کرد — یعنی تابع برای هر تاریخ با فرمت اسلش بی‌صدا
   * null برمی‌گرداند. تست‌های واحد قبلی این را نگرفته بودند چون
   * با فرمت خط‌تیره صدا زده شده بودند.
   */
  it('سالی بدون داده‌ی هاردکد، هم تعطیلات ثابت و هم قمری دارد', async () => {
    const { getHoliday } = await import('./persianDate')
    const found: string[] = []
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 31; d++) {
        const r = getHoliday(`1406/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`)
        if (r) found.push(r)
      }
    }
    expect(found.length).toBeGreaterThan(15)
    expect(found.some((f) => f.includes('نوروز'))).toBe(true)
    expect(found.some((f) => f.includes('تقریبی'))).toBe(true)
  })

  it('هر دو فرمت اسلش و خط‌تیره یکسان کار می‌کنند', async () => {
    const { getHoliday } = await import('./persianDate')
    expect(getHoliday('1406/01/01')).toBe(getHoliday('1406-01-01'))
    expect(getHoliday('1406/01/01')).toContain('نوروز')
  })
})
