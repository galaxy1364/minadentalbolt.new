/**
 * MOD-FIX-015 | تست تاریخ خراب در صف همگام‌سازی
 *
 * ورودی این تست‌ها ساختگی نیست. دو رکورد واقعی روی گوشی مهدی گیر کرده
 * بودند — یک سفارش لابراتوار و یک فاز درمان — با همین رشته:
 *
 *     date/time field value out of range: "2-00-02"
 *
 * ماه صفر است. «تلاش مجدد» ده بار زده شد و هیچ‌وقت نمی‌توانست جواب بدهد،
 * چون همان payload خراب دوباره فرستاده می‌شد.
 */
import { describe, it, expect } from 'vitest'
import { isValidISODate, sanitiseDates } from './dateSanitise'

describe('🔴 تاریخ نامعتبر تشخیص داده می‌شود', () => {
  it('ماه صفر — همان چیزی که دو رکورد را گیر انداخت', () => {
    expect(isValidISODate('2-00-02')).toBe(false)
    expect(isValidISODate('0002-00-02')).toBe(false)
  })

  it('روز صفر', () => {
    expect(isValidISODate('2026-03-00')).toBe(false)
  })

  it('ماه سیزده', () => {
    expect(isValidISODate('2026-13-01')).toBe(false)
  })

  it('۳۱ اردیبهشت میلادی وجود ندارد', () => {
    // پستگرس هم همین را رد می‌کند.
    expect(isValidISODate('2026-04-31')).toBe(false)
    expect(isValidISODate('2026-02-30')).toBe(false)
  })

  it('سال بی‌معنی رد می‌شود', () => {
    expect(isValidISODate('0002-01-01')).toBe(false)
    expect(isValidISODate('9999-01-01')).toBe(false)
  })

  it('تاریخ‌های واقعی پذیرفته می‌شوند', () => {
    expect(isValidISODate('2026-08-31')).toBe(true)
    expect(isValidISODate('2028-02-29')).toBe(true) // کبیسه‌ی میلادی
  })

  it('قالب غیر ISO معتبر نیست', () => {
    for (const v of ['1405/06/10', '31-08-2026', '', 'امروز']) {
      expect(isValidISODate(v), v).toBe(false)
    }
  })
})

describe('🔴 اصلاح payload گیرکرده', () => {
  it('تاریخ خراب پاک می‌شود و نامش گزارش می‌شود', () => {
    const { cleaned, clearedFields } = sanitiseDates({
      id: 'x', work_type: 'crown', deadline: '2-00-02',
    })
    expect(cleaned.deadline).toBeNull()
    expect(clearedFields).toEqual(['deadline'])
  })

  it('تاریخ‌های سالم دست نمی‌خورند', () => {
    const { cleaned, clearedFields } = sanitiseDates({
      created_at: '2026-08-31', deadline: '2026-09-15',
    })
    expect(cleaned.created_at).toBe('2026-08-31')
    expect(cleaned.deadline).toBe('2026-09-15')
    expect(clearedFields).toEqual([])
  })

  it('چند فیلد خراب با هم اصلاح می‌شوند', () => {
    const { clearedFields } = sanitiseDates({
      start_date: '2-00-02', end_date: '2026-13-40', notes: 'سلام',
    })
    expect(clearedFields.sort()).toEqual(['end_date', 'start_date'])
  })

  it('🔴 متنی که شبیه تاریخ نیست دست نمی‌خورد', () => {
    // یادداشت بیمار داده‌ی کلینیک است، نه مقدار ستون.
    const { cleaned, clearedFields } = sanitiseDates({
      notes: 'بیمار گفت ۲-۰۰-۰۲ درد داشت', tooth_number: '38', amount: 5_000_000,
    })
    expect(cleaned.notes).toBe('بیمار گفت ۲-۰۰-۰۲ درد داشت')
    expect(cleaned.amount).toBe(5_000_000)
    expect(clearedFields).toEqual([])
  })

  it('تاریخ با ساعت هم بررسی می‌شود', () => {
    const { clearedFields } = sanitiseDates({ created_at: '2-00-02T10:00:00Z' })
    expect(clearedFields).toEqual(['created_at'])
  })

  it('payload اصلی تغییر نمی‌کند', () => {
    const original = { deadline: '2-00-02' }
    sanitiseDates(original)
    expect(original.deadline).toBe('2-00-02')
  })
})

// MOD-FIX-021: ادعاهای این بلوک به `syncFailureAdvice.test.ts` منتقل شدند،
// چون تابعی که می‌سنجیدند (`isRetryableError`/`explainSyncError`) با
// `classifySyncFailure` یکی شد. هیچ پوششی کم نشد — همان ورودی‌ها آن‌جا
// سنجیده می‌شوند، به‌علاوه‌ی خطای دسترسی که این‌جا اصلاً دیده نمی‌شد.
