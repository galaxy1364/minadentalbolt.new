/**
 * MOD-FEAT-030 | تست تشخیص پرداخت تکراری
 *
 * ورودی ساختگی نیست. در دیتابیس زنده دو پرداخت ۱,۰۰۰,۰۰۰ تومانی برای
 * «ابا امیری» ثبت شده — هر دو نقدی، هر دو ۹ شهریور ۱۴۰۵، با فاصله‌ی
 * **۲ دقیقه و ۳۷ ثانیه**. هیچ هشداری نیامد.
 *
 * تنها نگهبان موجود وقتی شلیک می‌کرد که بیمار **تسویه** باشد — و این
 * بیمار بدهکار بود، پس ساکت ماند. حالتی که پوشش می‌داد («پرداخت برای
 * کسی که بدهی ندارد») نادرتر از حالتی است که از دست داد («دو بار زدن
 * دکمه‌ی ذخیره»).
 */
import { describe, it, expect } from 'vitest'
import { findDuplicatePayments, duplicateWarning, type PaymentLike } from './duplicatePayment'

const pay = (over: Partial<PaymentLike> = {}): PaymentLike => ({
  id: 'x1', patient_id: 'aba', amount: 1_000_000, payment_date: '2026-08-31',
  payment_method: 'cash', status: 'completed', ...over,
})

const draft = { patient_id: 'aba', amount: 1_000_000, payment_date: '2026-08-31' }

describe('🔴 همان حالت واقعی گرفته می‌شود', () => {
  it('پرداخت هم‌مبلغ و هم‌روز برای همان بیمار', () => {
    expect(findDuplicatePayments(draft, [pay()])).toHaveLength(1)
  })

  it('🔴 حتی وقتی بیمار بدهکار است — نگهبان قبلی همین را از دست داد', () => {
    // هیچ‌جای این منطق به مانده‌حساب نگاه نمی‌کند، و نباید بکند.
    expect(findDuplicatePayments(draft, [pay()])).not.toHaveLength(0)
  })

  it('هشدار متناسب با تعداد است', () => {
    expect(duplicateWarning(findDuplicatePayments(draft, [pay()]))).toContain('یک بار دیگر')
    const many = [pay({ id: 'a' }), pay({ id: 'b' }), pay({ id: 'c' })]
    // رقم فارسی، مثل هر عدد دیگری در برنامه. اولین نسخه لاتین می‌داد و
    // تست با یک ترفند قبولش کرده بود — کد اصلاح شد، نه تست.
    expect(duplicateWarning(findDuplicatePayments(draft, many))).toContain('۳ بار دیگر')
  })
})

describe('چه چیزی تکراری نیست', () => {
  it('بیمار دیگر', () => {
    expect(findDuplicatePayments(draft, [pay({ patient_id: 'mehdi' })])).toEqual([])
  })

  it('مبلغ دیگر', () => {
    expect(findDuplicatePayments(draft, [pay({ amount: 2_000_000 })])).toEqual([])
  })

  it('روز دیگر', () => {
    expect(findDuplicatePayments(draft, [pay({ payment_date: '2026-08-30' })])).toEqual([])
  })

  it('🔴 پرداخت لغو‌شده تکراری حساب نمی‌شود', () => {
    // پرداختی که باطل شده، عکسِ شاهد بر تکراری بودن است.
    expect(findDuplicatePayments(draft, [pay({ status: 'cancelled' })])).toEqual([])
  })

  it('پرداخت در انتظار همچنان شمرده می‌شود', () => {
    // چکی که هنوز پاس نشده، پول داده‌شده است — نه یک رکورد باطل.
    expect(findDuplicatePayments(draft, [pay({ status: 'pending' })])).toHaveLength(1)
  })
})

describe('🔴 روش پرداخت عمداً در تطبیق نیست', () => {
  it('نقدی و کارت با یک مبلغ، همچنان مشکوک است', () => {
    // ثبت یک مبلغ یک بار نقدی و یک بار کارتی، **محتمل‌تر** از دو پرداخت
    // واقعاً یکسان است، نه کمتر.
    expect(findDuplicatePayments(draft, [pay({ payment_method: 'card' })])).toHaveLength(1)
  })
})

describe('ویرایش خودش را تکراری نمی‌بیند', () => {
  it('رکورد کنارگذاشته‌شده شمرده نمی‌شود', () => {
    expect(findDuplicatePayments({ ...draft, excludeId: 'x1' }, [pay()])).toEqual([])
  })
})

describe('ورودی ناقص', () => {
  it('بدون بیمار، مبلغ یا تاریخ چیزی گزارش نمی‌شود', () => {
    expect(findDuplicatePayments({ ...draft, patient_id: '' }, [pay()])).toEqual([])
    expect(findDuplicatePayments({ ...draft, amount: 0 }, [pay()])).toEqual([])
    expect(findDuplicatePayments({ ...draft, payment_date: '' }, [pay()])).toEqual([])
  })

  it('بدون تطبیق، هشداری ساخته نمی‌شود', () => {
    expect(duplicateWarning([])).toBeNull()
  })

  it('تاریخ با ساعت هم درست مقایسه می‌شود', () => {
    expect(findDuplicatePayments(draft, [pay({ payment_date: '2026-08-31T14:00:00Z' })])).toHaveLength(1)
  })
})

/** قفل ساختاری: هشدار واقعاً در فرم است و دکمه‌ی میان‌بر روی کارت. */
import billing from '../pages/Billing.tsx?raw'

describe('🔴 هشدار و میان‌بر در صفحه‌ی مالی هستند', () => {
  it('فرم پرداخت تکراری را بررسی می‌کند', () => {
    expect(billing).toContain('findDuplicatePayments(')
  })

  it('هر کارت پرداخت میان‌بر ثبت پرداخت دارد', () => {
    expect(billing).toContain('پرداخت جدید')
  })

  it('مبلغ پیشنهادی از یک نقطه می‌آید', () => {
    // دو جای مستقل که مبلغ را حساب کنند، دو عددی است که از هم می‌افتند.
    expect(billing).toContain('const openPaymentModal =')
  })
})
