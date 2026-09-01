/**
 * MOD-FEAT-028 | تست قانون چک
 *
 * قانونی که مهدی تعریف کرد، کلمه به کلمه:
 *
 *   «کلاً چک تا پاس نشه بدهی حساب بشود. دو مدل چک داریم: یکی که بیمار
 *    ماه‌به‌ماه پرداخت می‌کنه و خودش پاس می‌شه — وقتی پاس شدن دیگه پاس
 *    شدن. و یکی چک ضمانت که ما خرجش نمی‌کنیم؛ براش اقساط تعریف می‌شه و
 *    تا تسویه‌ی کامل بدهی محسوب می‌شه. ولی قابل مدیریت باشه.»
 *
 * این تست‌ها **ریاضی مانده را نمی‌سنجند** — آن از قبل درست بود و دست
 * نخورد. چیزی که اینجا قفل می‌شود، دیده شدن است: آیا می‌شود فهمید بیمار
 * چک داده، چند تا، چه مبلغی، و کِی سررسیدش است.
 */
import { describe, it, expect } from 'vitest'
import { summariseCheques, chequeHeadline, type ChequeLike } from './chequeSummary'

const cheque = (over: Partial<ChequeLike>): ChequeLike => ({
  id: 'c1', patient_id: 'p1', amount: 2_000_000, due_date: '2026-10-01',
  status: 'pending', purpose: 'payment', payment_plan_id: null, ...over,
})

describe('🔴 چک پرداخت تا پاس نشده در جریان است', () => {
  it('چک در انتظار، در جریان شمرده می‌شود', () => {
    const s = summariseCheques([cheque({})], 'p1')
    expect(s.inFlight.count).toBe(1)
    expect(s.inFlight.total).toBe(2_000_000)
  })

  it('چک وصول‌شده در بانک هنوز در جریان است', () => {
    // به حساب رفته ولی هنوز پاس نشده — پول هنوز نرسیده.
    expect(summariseCheques([cheque({ status: 'deposited' })], 'p1').inFlight.count).toBe(1)
  })

  it('🔴 چک پاس‌شده دیگر در جریان نیست', () => {
    // «وقتی پاس شدن دیگه پاس شدن» — از آن لحظه یک پرداخت واقعی است.
    expect(summariseCheques([cheque({ status: 'cleared' })], 'p1').inFlight.count).toBe(0)
  })

  it('نزدیک‌ترین سررسید را می‌گوید', () => {
    const s = summariseCheques([
      cheque({ id: 'a', due_date: '2026-12-01' }),
      cheque({ id: 'b', due_date: '2026-10-01' }),
    ], 'p1')
    expect(s.inFlight.nextDue).toBe('2026-10-01')
  })
})

describe('🔴 چک ضمانت هرگز پرداخت نیست', () => {
  it('جدا از چک در جریان شمرده می‌شود', () => {
    const s = summariseCheques([cheque({ purpose: 'guarantee' })], 'p1')
    expect(s.guarantee.count).toBe(1)
    expect(s.inFlight.count).toBe(0)
  })

  it('🔴 ضمانت بدون طرح قسطی علامت می‌خورد', () => {
    // «ضمانت رو که گرفتیم، بعد باید اقساط براش تعریف بشه.» وثیقه‌ای که
    // برنامه‌ی وصولی ندارد، وثیقه‌ای است که کسی وصولش نمی‌کند.
    const s = summariseCheques([cheque({ purpose: 'guarantee', payment_plan_id: null })], 'p1')
    expect(s.guaranteeWithoutPlan).toBe(1)
  })

  it('ضمانت با طرح قسطی علامت نمی‌خورد', () => {
    const s = summariseCheques([cheque({ purpose: 'guarantee', payment_plan_id: 'plan-1' })], 'p1')
    expect(s.guaranteeWithoutPlan).toBe(0)
    expect(s.guarantee.count).toBe(1)
  })

  it('ضمانت لغو‌شده دیگر وثیقه نیست', () => {
    expect(summariseCheques([cheque({ purpose: 'guarantee', status: 'cancelled' })], 'p1').guarantee.count).toBe(0)
  })
})

describe('چک برگشتی', () => {
  it('جدا شمرده می‌شود', () => {
    const s = summariseCheques([cheque({ status: 'bounced' })], 'p1')
    expect(s.bounced.count).toBe(1)
    expect(s.inFlight.count).toBe(0)
  })

  it('در سرخط، اولویت با برگشتی است', () => {
    // فوری‌ترین چیزی است که کسی باید پیگیری کند.
    const s = summariseCheques([cheque({ status: 'bounced' }), cheque({ id: 'b' })], 'p1')
    expect(chequeHeadline(s)).toBe('چک برگشتی دارد')
  })
})

describe('تفکیک بیماران', () => {
  it('چک بیمار دیگر شمرده نمی‌شود', () => {
    const s = summariseCheques([cheque({ patient_id: 'p2' })], 'p1')
    expect(s.hasAny).toBe(false)
    expect(s.inFlight.count).toBe(0)
  })

  it('بدون چک، سرخطی ساخته نمی‌شود', () => {
    // تا صفحه بتواند کل ردیف را حذف کند، نه یک برچسب خالی نشان دهد.
    expect(chequeHeadline(summariseCheques([], 'p1'))).toBeNull()
  })
})

describe('ترکیب واقعی', () => {
  it('سه دسته با هم درست تفکیک می‌شوند', () => {
    const s = summariseCheques([
      cheque({ id: '1', amount: 1_000_000 }),
      cheque({ id: '2', amount: 2_000_000, status: 'cleared' }),
      cheque({ id: '3', amount: 5_000_000, purpose: 'guarantee', payment_plan_id: 'plan-1' }),
      cheque({ id: '4', amount: 3_000_000, status: 'bounced' }),
    ], 'p1')
    expect(s.inFlight.total).toBe(1_000_000)
    expect(s.guarantee.total).toBe(5_000_000)
    expect(s.bounced.total).toBe(3_000_000)
  })
})
