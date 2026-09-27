/**
 * MOD-TEST-010 | تست‌های سبد ورود دسته‌ای
 *
 * تمرکز اصلی: **دقت مالی**. طبق ممنوعیت‌های پروژه، محاسبه‌ی مالی
 * غیردقیق ممنوع است — و اینجا جمع کل چیزی است که به بیمار گفته
 * می‌شود.
 */
import { describe, it, expect } from 'vitest'
import {
  itemTotal, basketTotal, distinctTeeth, findDuplicate,
  validateBasket, makeTempId, type BasketItem,
} from './bulkTreatment'

const item = (over: Partial<BasketItem> = {}): BasketItem => ({
  tempId: makeTempId(),
  toothNumber: '16',
  procedureCode: 'D2140',
  procedureName: 'ترمیم یک سطحی',
  unitPrice: 1_000_000,
  quantity: 1,
  discount: 0,
  ...over,
})

describe('محاسبه‌ی مالی قلم', () => {
  it('جمع ساده درست است', () => {
    expect(itemTotal(item())).toBe(1_000_000)
  })

  it('تعداد در قیمت ضرب می‌شود', () => {
    expect(itemTotal(item({ quantity: 3 }))).toBe(3_000_000)
  })

  it('تخفیف از جمع کل کم می‌شود نه از قیمت واحد', () => {
    // ۲ عدد × ۱ میلیون = ۲ میلیون، منهای ۵۰۰ هزار = ۱.۵ میلیون
    expect(itemTotal(item({ quantity: 2, discount: 500_000 }))).toBe(1_500_000)
  })

  /**
   * محافظت از باگ مالی واقعی: تخفیف بزرگ‌تر از مبلغ نباید عدد
   * منفی بسازد، وگرنه جمع کل سبد به‌اشتباه کم می‌شود و کلینیک
   * ضرر می‌کند.
   */
  it('تخفیف بزرگ‌تر از مبلغ، عدد منفی نمی‌سازد', () => {
    expect(itemTotal(item({ unitPrice: 100, discount: 999_999 }))).toBe(0)
  })

  it('مقادیر خراب نباید NaN بدهند', () => {
    const bad = item({ unitPrice: NaN as unknown as number, quantity: undefined as unknown as number })
    expect(Number.isNaN(itemTotal(bad))).toBe(false)
  })
})

describe('جمع کل سبد', () => {
  it('سبد خالی جمع صفر دارد', () => {
    expect(basketTotal([])).toBe(0)
  })

  it('جمع چند قلم دقیق است', () => {
    const total = basketTotal([
      item({ unitPrice: 1_000_000 }),
      item({ unitPrice: 2_500_000, quantity: 2 }),
      item({ unitPrice: 3_000_000, discount: 500_000 }),
    ])
    // ۱ + ۵ + ۲.۵ = ۸.۵ میلیون
    expect(total).toBe(8_500_000)
  })

  /**
   * سناریوی واقعی درخواست کاربر: ۴۰ کار در یک نشست.
   */
  it('سبد ۴۰ تایی درست جمع می‌زند', () => {
    const many = Array.from({ length: 40 }, () => item({ unitPrice: 500_000 }))
    expect(basketTotal(many)).toBe(20_000_000)
  })
})

describe('شمارش دندان‌ها', () => {
  it('دندان تکراری دوبار شمرده نمی‌شود', () => {
    expect(distinctTeeth([item({ toothNumber: '16' }), item({ toothNumber: '16' })])).toBe(1)
  })

  it('دندان‌های متفاوت جدا شمرده می‌شوند', () => {
    expect(distinctTeeth([item({ toothNumber: '16' }), item({ toothNumber: '21' })])).toBe(2)
  })

  it('قلم بدون دندان (درمان عمومی) شمرده نمی‌شود', () => {
    expect(distinctTeeth([item({ toothNumber: '' }), item({ toothNumber: '  ' })])).toBe(0)
  })
})

describe('تشخیص تکراری', () => {
  it('همان رویه روی همان دندان تکراری تشخیص داده می‌شود', () => {
    const basket = [item({ toothNumber: '16', procedureCode: 'D2140' })]
    const dup = findDuplicate(basket, { ...item(), toothNumber: '16', procedureCode: 'D2140' })
    expect(dup).not.toBeNull()
  })

  it('رویه‌ی متفاوت روی همان دندان تکراری نیست', () => {
    const basket = [item({ toothNumber: '16', procedureCode: 'D2140' })]
    const dup = findDuplicate(basket, { ...item(), toothNumber: '16', procedureCode: 'D3310' })
    expect(dup).toBeNull()
  })

  it('همان رویه روی دندان دیگر تکراری نیست', () => {
    const basket = [item({ toothNumber: '16' })]
    expect(findDuplicate(basket, { ...item(), toothNumber: '21' })).toBeNull()
  })

  it('فاصله‌ی اضافی در شماره دندان نباید تشخیص را خراب کند', () => {
    const basket = [item({ toothNumber: '16' })]
    expect(findDuplicate(basket, { ...item(), toothNumber: ' 16 ' })).not.toBeNull()
  })
})

describe('اعتبارسنجی — باید واقعاً مسدود کند', () => {
  it('سبد خالی رد می‌شود', () => {
    expect(validateBasket([])).not.toBeNull()
  })

  it('سبد معتبر پذیرفته می‌شود', () => {
    expect(validateBasket([item()])).toBeNull()
  })

  /**
   * طبق ممنوعیت‌های پروژه: قیمت صفر یعنی درمانی که هرگز به
   * مانده‌حساب بیمار نمی‌آید — باید مسدود شود نه هشدار.
   */
  it('قیمت صفر مسدود می‌شود', () => {
    expect(validateBasket([item({ unitPrice: 0 })])).toContain('قیمت')
  })

  it('تعداد صفر مسدود می‌شود', () => {
    expect(validateBasket([item({ quantity: 0 })])).toContain('تعداد')
  })

  it('تخفیف منفی مسدود می‌شود', () => {
    expect(validateBasket([item({ discount: -100 })])).toContain('منفی')
  })

  it('تخفیف بیشتر از مبلغ مسدود می‌شود', () => {
    expect(validateBasket([item({ unitPrice: 100, discount: 500 })])).toContain('بیشتر')
  })

  it('رویه‌ی بدون نام مسدود می‌شود', () => {
    expect(validateBasket([item({ procedureName: '   ' })])).not.toBeNull()
  })

  it('اولین خطا گزارش می‌شود حتی اگر قلم اول سالم باشد', () => {
    expect(validateBasket([item(), item({ unitPrice: 0, procedureName: 'روکش' })])).toContain('روکش')
  })
})

describe('شناسه‌ی موقت', () => {
  it('شناسه‌ها یکتا هستند', () => {
    const ids = new Set(Array.from({ length: 200 }, () => makeTempId()))
    expect(ids.size).toBe(200)
  })
})
