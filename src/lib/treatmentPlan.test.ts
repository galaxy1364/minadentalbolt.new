/**
 * MOD-TEST-009 | تست‌های پیشرفت طرح درمان
 *
 * سناریوی مرجع این تست‌ها همان چیزی است که کاربر توصیف کرد:
 * بیمار یک بار می‌آید، چند کار دارد، جلسه‌به‌جلسه انجام می‌شود.
 */
import { describe, it, expect } from 'vitest'
import { calcPlanProgress, groupByTooth, nextStatus } from './treatmentPlan'
import type { Treatment } from '../types'

const t = (status: string, price: number, tooth?: string): Treatment =>
  ({ status, total_price: price, tooth_number: tooth ?? null } as Treatment)

describe('پیشرفت طرح — حالت‌های پایه', () => {
  it('بیمار بدون درمان، پیشرفت صفر دارد و تقسیم بر صفر نمی‌شود', () => {
    const p = calcPlanProgress([])
    expect(p.percent).toBe(0)
    expect(Number.isNaN(p.percent)).toBe(false)
  })

  it('همه تکمیل‌شده یعنی صد درصد', () => {
    const p = calcPlanProgress([t('completed', 100), t('completed', 200)])
    expect(p.percent).toBe(100)
    expect(p.remainingValue).toBe(0)
  })

  it('هیچ‌کدام تکمیل‌نشده یعنی صفر درصد ولی ارزش کل ثبت می‌شود', () => {
    const p = calcPlanProgress([t('planned', 500), t('planned', 500)])
    expect(p.percent).toBe(0)
    expect(p.totalValue).toBe(1000)
    expect(p.remainingValue).toBe(1000)
  })
})

describe('سناریوی واقعی — ۱۰ کار، ۳ تا انجام شده', () => {
  const plan = [
    ...Array(3).fill(null).map(() => t('completed', 1_000_000)),
    ...Array(2).fill(null).map(() => t('in_progress', 2_000_000)),
    ...Array(5).fill(null).map(() => t('planned', 3_000_000)),
  ]

  it('شمارش هر وضعیت درست است', () => {
    const p = calcPlanProgress(plan)
    expect(p.total).toBe(10)
    expect(p.completed).toBe(3)
    expect(p.inProgress).toBe(2)
    expect(p.planned).toBe(5)
  })

  it('درصد بر اساس تعداد است نه ارزش ریالی', () => {
    const p = calcPlanProgress(plan)
    // ۳ از ۱۰ = ۳۰٪، حتی با اینکه ارزششان فقط ۳ از ۲۲ میلیون است
    expect(p.percent).toBe(30)
  })

  it('ارزش باقی‌مانده دقیقاً محاسبه می‌شود', () => {
    const p = calcPlanProgress(plan)
    expect(p.totalValue).toBe(22_000_000)
    expect(p.completedValue).toBe(3_000_000)
    expect(p.remainingValue).toBe(19_000_000)
  })
})

describe('موارد لغوشده', () => {
  /**
   * حیاتی: طبق سیاست پروژه هیچ رکوردی حذف دائمی نمی‌شود، پس درمان
   * لغوشده در جدول می‌ماند. اگر شمرده شود، بیمار برای همیشه
   * «کار ناتمام» خواهد داشت و درصد هرگز به ۱۰۰ نمی‌رسد.
   */
  it('لغوشده نه در تعداد می‌آید نه در ارزش', () => {
    const p = calcPlanProgress([t('completed', 100), t('cancelled', 9999)])
    expect(p.total).toBe(1)
    expect(p.percent).toBe(100)
    expect(p.totalValue).toBe(100)
  })
})

describe('مقادیر خراب', () => {
  it('قیمت null نباید NaN بدهد', () => {
    const p = calcPlanProgress([
      { status: 'completed', total_price: null, tooth_number: null } as unknown as Treatment,
    ])
    expect(Number.isNaN(p.totalValue)).toBe(false)
    expect(p.totalValue).toBe(0)
  })
})

describe('گروه‌بندی بر اساس دندان', () => {
  it('درمان‌های یک دندان کنار هم می‌آیند', () => {
    const g = groupByTooth([t('planned', 1, '16'), t('completed', 1, '16'), t('planned', 1, '21')])
    expect(g.find((x) => x.tooth === '16')!.treatments.length).toBe(2)
    expect(g.find((x) => x.tooth === '21')!.treatments.length).toBe(1)
  })

  /**
   * دندانی که همه‌ی کارش تمام شده باید بعد از دندان‌های ناتمام
   * بیاید — کاری که مانده مهم‌تر از کاری است که تمام شده.
   */
  it('دندان ناتمام قبل از دندان تمام‌شده می‌آید', () => {
    const g = groupByTooth([t('completed', 1, '11'), t('planned', 1, '48')])
    expect(g[0].tooth).toBe('48')
    expect(g[0].allDone).toBe(false)
    expect(g[1].allDone).toBe(true)
  })

  it('درمان بدون شماره دندان در گروه عمومی می‌آید و گم نمی‌شود', () => {
    const g = groupByTooth([t('planned', 1), t('planned', 1, '16')])
    expect(g.some((x) => x.tooth === 'عمومی')).toBe(true)
  })

  it('گروه عمومی همیشه آخر است', () => {
    const g = groupByTooth([t('planned', 1), t('planned', 1, '16'), t('planned', 1, '11')])
    expect(g[g.length - 1].tooth).toBe('عمومی')
  })

  it('دندان‌های ناتمام به ترتیب عددی مرتب می‌شوند', () => {
    const g = groupByTooth([t('planned', 1, '38'), t('planned', 1, '11'), t('planned', 1, '24')])
    expect(g.map((x) => x.tooth)).toEqual(['11', '24', '38'])
  })

  it('شمارش کارهای باقی‌مانده هر دندان درست است', () => {
    const g = groupByTooth([t('completed', 1, '16'), t('planned', 1, '16'), t('in_progress', 1, '16')])
    expect(g[0].remainingCount).toBe(2)
  })

  it('لغوشده در گروه‌بندی هم نمی‌آید', () => {
    const g = groupByTooth([t('cancelled', 1, '16')])
    expect(g.length).toBe(0)
  })
})

describe('چرخه‌ی وضعیت — دکمه‌ی تیک یک‌ضربه‌ای', () => {
  it('برنامه‌ریزی‌شده به در حال انجام می‌رود', () => {
    expect(nextStatus('planned')).toBe('in_progress')
  })

  it('در حال انجام به تکمیل‌شده می‌رود', () => {
    expect(nextStatus('in_progress')).toBe('completed')
  })

  /**
   * تکمیل‌شده نباید با ضربه‌ی اتفاقی به وضعیت دیگری برود —
   * برگرداندن باید تصمیم آگاهانه باشد، نه نتیجه‌ی لمس تصادفی.
   */
  it('تکمیل‌شده با ضربه‌ی دوباره تغییر نمی‌کند', () => {
    expect(nextStatus('completed')).toBe('completed')
  })

  it('لغوشده هم با ضربه تغییر نمی‌کند', () => {
    expect(nextStatus('cancelled')).toBe('cancelled')
  })
})
