/**
 * MOD-TEST-001 | تست‌های محاسبات مالی
 *
 * چرا این فایل مهم‌ترین تست پروژه است: calcPatientBalance تنها منبع
 * حقیقت برای «این بیمار چقدر بدهکار است» در داشبورد، مالی و پرونده‌ی
 * بیمار است. یک اشتباه اینجا یعنی عدد اشتباه به بیمار گفته می‌شود.
 *
 * هر تست یک حالت واقعی کلینیک را پوشش می‌دهد، نه یک حالت ساختگی.
 */
import { describe, it, expect } from 'vitest'
import { calcPatientBalance, calcAllPatientBalances, checkOverpayment } from './finance'
import type { Payment, Treatment } from '../types'

// سازنده‌های کمکی — فقط فیلدهای مؤثر بر محاسبه را می‌سازند
const treat = (patient_id: string, total_price: number, status = 'completed'): Treatment =>
  ({ patient_id, total_price, status } as Treatment)

const pay = (patient_id: string, amount: number, status = 'completed'): Payment =>
  ({ patient_id, amount, status } as Payment)

const implant = (patient_id: string, total_cost: number, paid_amount: number) =>
  ({ patient_id, total_cost, paid_amount })

describe('calcPatientBalance — حالت‌های پایه', () => {
  it('بیمار بدون هیچ رکوردی، مانده‌حساب صفر دارد', () => {
    expect(calcPatientBalance([], [])).toEqual({ balance: 0, paid: 0, totalCost: 0 })
  })

  it('درمان بدون پرداخت، کل مبلغ را بدهکار می‌کند', () => {
    const r = calcPatientBalance([], [treat('p1', 5_000_000)])
    expect(r.balance).toBe(5_000_000)
    expect(r.paid).toBe(0)
    expect(r.totalCost).toBe(5_000_000)
  })

  it('پرداخت کامل، مانده را دقیقاً صفر می‌کند', () => {
    const r = calcPatientBalance([pay('p1', 5_000_000)], [treat('p1', 5_000_000)])
    expect(r.balance).toBe(0)
  })

  it('پرداخت بیشتر از بدهی، مانده‌ی منفی (بستانکار) می‌دهد', () => {
    const r = calcPatientBalance([pay('p1', 6_000_000)], [treat('p1', 5_000_000)])
    expect(r.balance).toBe(-1_000_000)
  })
})

describe('calcPatientBalance — قوانین حیاتی کلینیک', () => {
  /**
   * این تست از یک باگ واقعی محافظت می‌کند: طبق سیاست پروژه هیچ رکوردی
   * حذف دائمی نمی‌شود، پس درمان «لغو شده» در جدول باقی می‌ماند. اگر
   * فیلتر نشود، بیمار برای همیشه بدهکارِ کاری می‌ماند که هرگز انجام نشده.
   */
  it('درمان لغوشده هرگز نباید در بدهی حساب شود', () => {
    const r = calcPatientBalance([], [
      treat('p1', 5_000_000, 'completed'),
      treat('p1', 9_000_000, 'cancelled'),
    ])
    expect(r.balance).toBe(5_000_000)
    expect(r.totalCost).toBe(5_000_000)
  })

  it('درمان برنامه‌ریزی‌شده (انجام‌نشده) در بدهی حساب می‌شود', () => {
    // عمدی: طرح درمان پذیرفته‌شده یک تعهد مالی واقعی است
    const r = calcPatientBalance([], [treat('p1', 3_000_000, 'planned')])
    expect(r.balance).toBe(3_000_000)
  })

  /**
   * پرداخت «در انتظار» هنوز پول دریافت‌شده نیست — اگر شمرده شود،
   * مانده‌حساب به‌دروغ صفر می‌شود و بدهی واقعی گم می‌شود.
   */
  it('پرداخت در انتظار نباید از بدهی کم شود', () => {
    const r = calcPatientBalance(
      [pay('p1', 5_000_000, 'pending')],
      [treat('p1', 5_000_000)],
    )
    expect(r.balance).toBe(5_000_000)
    expect(r.paid).toBe(0)
  })

  it('مقادیر null نباید محاسبه را بشکنند یا NaN بدهند', () => {
    const r = calcPatientBalance(
      [{ patient_id: 'p1', amount: null, status: 'completed' } as unknown as Payment],
      [{ patient_id: 'p1', total_price: null, status: 'completed' } as unknown as Treatment],
    )
    expect(r.balance).toBe(0)
    expect(Number.isNaN(r.balance)).toBe(false)
  })
})

describe('calcPatientBalance — ایمپلنت', () => {
  it('ایمپلنت با دفتر مالی مستقل خودش به بدهی اضافه می‌شود', () => {
    const r = calcPatientBalance([], [], [implant('p1', 20_000_000, 5_000_000)])
    expect(r.balance).toBe(15_000_000)
    expect(r.paid).toBe(5_000_000)
    expect(r.totalCost).toBe(20_000_000)
  })

  it('درمان و ایمپلنت با هم، مجموع درست را می‌دهند', () => {
    const r = calcPatientBalance(
      [pay('p1', 2_000_000)],
      [treat('p1', 5_000_000)],
      [implant('p1', 20_000_000, 5_000_000)],
    )
    // درمان: ۵ - ۲ = ۳ | ایمپلنت: ۲۰ - ۵ = ۱۵ | مجموع = ۱۸
    expect(r.balance).toBe(18_000_000)
    expect(r.paid).toBe(7_000_000)
    expect(r.totalCost).toBe(25_000_000)
  })
})

describe('calcAllPatientBalances — تفکیک بین بیماران', () => {
  it('داده‌ی بیماران هرگز نباید با هم قاطی شود', () => {
    const { byPatient } = calcAllPatientBalances(
      [pay('p1', 1_000_000), pay('p2', 4_000_000)],
      [treat('p1', 5_000_000), treat('p2', 4_000_000)],
    )
    expect(byPatient.get('p1')!.balance).toBe(4_000_000)
    expect(byPatient.get('p2')!.balance).toBe(0)
  })

  /**
   * بستانکاری یک بیمار نباید بدهی بیمار دیگر را بپوشاند — وگرنه
   * «کل مطالبات معوق» کلینیک کمتر از واقعیت گزارش می‌شود.
   */
  it('مانده‌ی منفی یک بیمار، مطالبات کل را کم نمی‌کند', () => {
    const { totalOutstanding } = calcAllPatientBalances(
      [pay('p1', 9_000_000)],
      [treat('p1', 5_000_000), treat('p2', 3_000_000)],
    )
    expect(totalOutstanding).toBe(3_000_000)
  })

  it('بیماری که فقط ایمپلنت دارد هم باید در نتیجه بیاید', () => {
    const { byPatient } = calcAllPatientBalances([], [], [implant('p9', 10_000_000, 0)])
    expect(byPatient.has('p9')).toBe(true)
    expect(byPatient.get('p9')!.balance).toBe(10_000_000)
  })
})

describe('پرداخت ایمپلنت نباید دوبار شمرده شود', () => {
  /** createPayment() مبلغ را روی implant_cases.paid_amount هم اضافه
   * می‌کند، پس ردیف پرداخت و paid_amount یک پول‌اند نه دو تا. */
  const implantPay = (patient_id: string, amount: number, implant_case_id: string): Payment =>
    ({ patient_id, amount, status: 'completed', implant_case_id } as Payment)

  it('پرداخت متصل به ایمپلنت فقط یک بار در «پرداخت‌شده» می‌آید', () => {
    // بیمار ۵ میلیون بابت ایمپلنت داده. اگر دوبار شمرده شود، «۱۰
    // میلیون پرداخت کرده» خوانده می‌شود و مانده‌اش ۵ میلیون کمتر از
    // واقعیت درمی‌آید — یعنی کلینیک فکر می‌کند کمتر طلبکار است.
    const r = calcPatientBalance(
      [implantPay('p1', 5_000_000, 'i1')],
      [],
      [implant('p1', 20_000_000, 5_000_000)],
    )
    expect(r.paid).toBe(5_000_000)
    expect(r.balance).toBe(15_000_000)
  })

  it('پرداخت عادی کنار پرداخت ایمپلنت هر دو درست جمع می‌شوند', () => {
    const r = calcPatientBalance(
      [pay('p1', 300_000), implantPay('p1', 5_000_000, 'i1')],
      [treat('p1', 1_000_000)],
      [implant('p1', 20_000_000, 5_000_000)],
    )
    expect(r.totalCost).toBe(21_000_000)
    expect(r.paid).toBe(5_300_000)
    expect(r.balance).toBe(15_700_000)
  })

  it('پرونده‌ی بدون ایمپلنت دست‌نخورده می‌ماند', () => {
    const r = calcPatientBalance([pay('p1', 400_000)], [treat('p1', 1_000_000)])
    expect(r.paid).toBe(400_000)
    expect(r.balance).toBe(600_000)
  })
})

const calcOver = (amount: number, remaining: number) => checkOverpayment(amount, remaining)

describe('checkOverpayment', () => {
  it('stays quiet for a payment within the balance', () => {
    expect(calcOver(500_000, 1_000_000).message).toBeNull()
  })

  it('stays quiet when the payment settles the balance exactly', () => {
    expect(calcOver(1_000_000, 1_000_000).excess).toBe(0)
  })

  it('reports the excess when a payment overshoots a real balance', () => {
    // The live database had a patient with 22,500,000 billable and
    // 42,500,000 paid, and nothing had ever warned anyone.
    const r = calcOver(19_000_000, 12_500_000)
    expect(r.excess).toBe(6_500_000)
    expect(r.message).toContain('بیشتر')
  })

  it('says the whole amount is surplus when nothing is owed', () => {
    const r = calcOver(5_000_000, 0)
    expect(r.excess).toBe(5_000_000)
    expect(r.message).toContain('بدهی ندارد')
  })

  it('treats an already-credit account the same way', () => {
    expect(calcOver(1_000_000, -500_000).excess).toBe(1_500_000)
  })
})
