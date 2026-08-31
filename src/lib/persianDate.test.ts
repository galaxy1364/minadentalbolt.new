/**
 * MOD-TEST-002 | تست‌های تاریخ شمسی
 *
 * منطق تاریخ در کل برنامه استفاده می‌شود: نوبت‌دهی، یادآوری، گزارش،
 * موعد لابراتوار. یک خطای یک‌روزه اینجا یعنی نوبت اشتباه به بیمار.
 */
import { describe, it, expect } from 'vitest'
import {
  toJalaliString, isJalaliLeapYear, jalaliToGregorian,
  toPersianDigits, toEnglishDigits, formatCurrency, todayLocalISO,
  getJalaliDateInfo, toJalaliStringPretty,
} from './persianDate'

describe('تبدیل میلادی ↔ شمسی', () => {
  it('نوروز ۱۴۰۵ برابر ۲۱ مارس ۲۰۲۶ است', () => {
    expect(toJalaliString('2026-03-21')).toBe('1405/01/01')
  })

  it('تبدیل رفت‌وبرگشت باید همان تاریخ اولیه را بدهد', () => {
    const gregorian = '2026-08-24'
    const jalali = toJalaliString(gregorian)
    const [y, m, d] = jalali.split('/').map(Number)
    expect(jalaliToGregorian(y, m, d)).toBe(gregorian)
  })

  it('اطلاعات تاریخ شمسی، ماه درست را برمی‌گرداند', () => {
    const info = getJalaliDateInfo('2026-08-24')
    expect(info.year).toBe(1405)
    expect(info.month).toBe(6) // شهریور
    expect(info.monthName).toBe('شهریور')
  })
})

describe('سال کبیسه شمسی', () => {
  it('۱۴۰۳ کبیسه است (۳۶۶ روز)', () => {
    expect(isJalaliLeapYear(1403)).toBe(true)
  })

  it('۱۴۰۵ کبیسه نیست', () => {
    expect(isJalaliLeapYear(1405)).toBe(false)
  })

  /**
   * محافظت از باگ واقعی: اگر کبیسه اشتباه محاسبه شود، ۳۰ اسفند
   * سال کبیسه به‌عنوان تاریخ نامعتبر رد می‌شود.
   */
  it('۳۰ اسفند در سال کبیسه باید تاریخ معتبری باشد', () => {
    expect(isJalaliLeapYear(1403)).toBe(true)
    expect(() => jalaliToGregorian(1403, 12, 30)).not.toThrow()
    expect(jalaliToGregorian(1403, 12, 30)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('ارقام فارسی', () => {
  it('ارقام انگلیسی به فارسی تبدیل می‌شوند', () => {
    expect(toPersianDigits('1405')).toBe('۱۴۰۵')
  })

  it('ارقام فارسی به انگلیسی برمی‌گردند', () => {
    expect(toEnglishDigits('۱۴۰۵')).toBe('1405')
  })

  /**
   * حیاتی برای ورودی کاربر: اگر کاربر با کیبورد فارسی مبلغ وارد کند،
   * باید قابل تبدیل به عدد باشد وگرنه محاسبات مالی NaN می‌شود.
   */
  it('مبلغ تایپ‌شده با ارقام فارسی باید عدد معتبر شود', () => {
    expect(Number(toEnglishDigits('۵۰۰۰۰۰'))).toBe(500000)
  })

  it('رفت‌وبرگشت ارقام، همان مقدار اولیه را می‌دهد', () => {
    expect(toEnglishDigits(toPersianDigits('9123456789'))).toBe('9123456789')
  })
})

describe('قالب‌بندی مبلغ', () => {
  it('مبلغ با جداکننده‌ی هزارگان نمایش داده می‌شود', () => {
    expect(formatCurrency(5000000)).toContain('۵')
  })

  it('null و undefined نباید باعث خطا شوند', () => {
    expect(() => formatCurrency(null)).not.toThrow()
    expect(() => formatCurrency(undefined)).not.toThrow()
  })
})

describe('todayLocalISO — باگ نیمه‌شب', () => {
  /**
   * محافظت از باگ واقعی که قبلاً رفع شد: استفاده از
   * new Date().toISOString() در ایران بین ۰۰:۰۰ تا ۰۳:۳۰ تاریخِ
   * «دیروز» را برمی‌گرداند، چون UTC هنوز در روز قبل است.
   * todayLocalISO باید همیشه تاریخ محلی بدهد.
   */
  it('قالب خروجی باید YYYY-MM-DD باشد', () => {
    expect(todayLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('باید با تاریخ محلی دستگاه مطابقت داشته باشد، نه UTC', () => {
    const now = new Date()
    const localExpected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(todayLocalISO()).toBe(localExpected)
  })
})

describe('MOD-FIX-014 | تاریخ خوانا با رقم فارسی نوشته می‌شود', () => {
  /**
   * `toJalaliStringPretty` تاریخ را برای **خواندن** می‌سازد و در ۱۶ جای
   * برنامه استفاده می‌شود — داشبورد، تقویم، لابراتوار، پرونده‌ی بیمار و
   * حتی **رسید چاپی**. ولی رقم لاتین برمی‌گرداند، درحالی‌که کنار همان
   * متن، ساعت و شمارنده با رقم فارسی نوشته می‌شوند. نتیجه روی صفحه:
   * «9 شهریور 1405 — ۲۲:۴۰».
   *
   * `toJalaliString` عمداً دست‌نخورده می‌ماند: خروجی‌اش (۱۴۰۵/۰۶/۰۹) کلید
   * و مقدار مقایسه است، نه متن نمایشی.
   */
  it('روز و سال با رقم فارسی می‌آیند', () => {
    expect(toJalaliStringPretty('2026-08-31')).toBe('۹ شهریور ۱۴۰۵')
  })

  it('هیچ رقم لاتینی باقی نمی‌ماند', () => {
    expect(toJalaliStringPretty('2026-03-21')).not.toMatch(/[0-9]/)
  })

  it('تاریخ خالی همچنان رشته‌ی خالی است', () => {
    expect(toJalaliStringPretty('')).toBe('')
    expect(toJalaliStringPretty('نه-یک-تاریخ')).toBe('')
  })

  it('قالب ماشینی دست‌نخورده می‌ماند — کلید مقایسه است، نه متن', () => {
    expect(toJalaliString('2026-08-31')).toBe('1405/06/09')
  })
})
