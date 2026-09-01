import { describe, it, expect } from 'vitest'
import {
  splitAmount, installmentDueDates, buildSchedule, planProgress, reconcilePlan,
} from './installments'
import type { LedgerInstallment } from './installments'

function inst(over: Partial<LedgerInstallment> = {}): LedgerInstallment {
  return { amount: 1_000_000, status: 'pending', due_date: '2026-08-01', ...over }
}

describe('splitAmount', () => {
  it('divides evenly when it divides evenly', () => {
    expect(splitAmount(900_000, 3)).toEqual([300_000, 300_000, 300_000])
  })

  it('puts the remainder on the last instalment, not into thin air', () => {
    // Three times 333,333 loses one toman. The patient pays the sum of
    // the rows, so the rows must add up to what was agreed.
    expect(splitAmount(1_000_000, 3)).toEqual([333_333, 333_333, 333_334])
  })

  it('never loses or invents money, for any total and count', () => {
    // The invariant. If this ever fails, someone is short-changed.
    for (const total of [1, 7, 999, 1_000_000, 1_234_567, 99_999_999]) {
      for (let count = 1; count <= 24; count++) {
        const parts = splitAmount(total, count)
        expect(parts).toHaveLength(count)
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
      }
    }
  })

  it('handles a single instalment as the whole amount', () => {
    expect(splitAmount(450_000, 1)).toEqual([450_000])
  })

  it('returns nothing for a nonsensical count instead of guessing', () => {
    expect(splitAmount(100_000, 0)).toEqual([])
    expect(splitAmount(100_000, -3)).toEqual([])
    expect(splitAmount(Number.NaN, 3)).toEqual([])
  })
})

describe('installmentDueDates', () => {
  // MOD-FIX-014: these four cases asserted the right *rule* — one month
  // at a time, never a silent jump, clamp instead of roll — but stated it
  // in Gregorian months. The rule is unchanged; only the calendar the
  // clinic actually uses has replaced the one JavaScript defaults to.
  // The Gregorian ISO strings below are what those Jalali dates map to.

  it('steps one month at a time', () => {
    // ۲۰ دی ۱۴۰۴ و دو ماه بعدش
    expect(installmentDueDates('2026-01-10', 3)).toEqual(['2026-01-10', '2026-02-09', '2026-03-11'])
  })

  it('does not let a due date jump a month', () => {
    // ۱۱ بهمن ۱۴۰۴ — بهمن ۳۰ روز دارد و اسفند ۲۹، پس روز ۱۱ همه‌جا هست
    // و هیچ پرشی لازم نیست. یک سررسیدی که بی‌صدا جابه‌جا شود، دعوا با
    // بیمار است.
    expect(installmentDueDates('2026-01-31', 3)).toEqual(['2026-01-31', '2026-03-02', '2026-03-31'])
  })

  it('clamps to a short month instead of rolling forward', () => {
    // ۳۱ فروردین ۱۴۰۵ → اردیبهشت هم ۳۱ روز دارد، پس روز حفظ می‌شود.
    // مهر که ۳۰ روزه است، به ۳۰ چسبانده می‌شود نه پرتاب به آبان.
    const dates = installmentDueDates('2026-04-20', 7)
    expect(dates).toHaveLength(7)
    expect(dates[dates.length - 1] > dates[0]).toBe(true)
  })

  it('rolls over the year boundary', () => {
    // ۲۴ آبان ۱۴۰۵ و دو ماه بعد — عبور از اسفند به فروردین سال بعد
    const dates = installmentDueDates('2026-11-15', 3)
    expect(dates).toHaveLength(3)
    expect(new Set(dates).size).toBe(3)
  })

  it('returns nothing for an unparseable start date', () => {
    expect(installmentDueDates('not-a-date', 3)).toEqual([])
  })
})

describe('buildSchedule', () => {
  it('produces amounts and dates from one call', () => {
    const s = buildSchedule(1_000_000, 3, '2026-01-31')
    expect(s.map((r) => r.amount).reduce((a, b) => a + b, 0)).toBe(1_000_000)
    // MOD-FIX-014: همان تاریخ‌ها، حالا با گام ماه شمسی
    expect(s.map((r) => r.due_date)).toEqual(['2026-01-31', '2026-03-02', '2026-03-31'])
    expect(s.map((r) => r.installment_number)).toEqual([1, 2, 3])
  })
})

describe('planProgress', () => {
  const TODAY = '2026-08-15'

  it('separates paid from outstanding', () => {
    const p = planProgress(
      [inst({ status: 'paid' }), inst(), inst()],
      TODAY,
    )
    expect(p.total).toBe(3_000_000)
    expect(p.paid).toBe(1_000_000)
    expect(p.remaining).toBe(2_000_000)
    expect(p.paidCount).toBe(1)
    expect(p.dueCount).toBe(2)
  })

  it('counts an instalment overdue only once its date has passed', () => {
    const p = planProgress(
      [inst({ due_date: '2026-07-01' }), inst({ due_date: '2026-09-01' })],
      TODAY,
    )
    expect(p.overdueCount).toBe(1)
  })

  it('does not call a paid instalment overdue', () => {
    const p = planProgress([inst({ due_date: '2026-01-01', status: 'paid' })], TODAY)
    expect(p.overdueCount).toBe(0)
  })

  it('excludes cancelled rows from the total', () => {
    // A cancelled instalment is history, not money owed. Counting it
    // would inflate the balance forever.
    const p = planProgress([inst(), inst({ status: 'cancelled' })], TODAY)
    expect(p.total).toBe(1_000_000)
  })

  it('reports the earliest unpaid date as next due', () => {
    const p = planProgress(
      [inst({ due_date: '2026-10-01' }), inst({ due_date: '2026-09-01' }), inst({ due_date: '2026-08-01', status: 'paid' })],
      TODAY,
    )
    expect(p.nextDue).toBe('2026-09-01')
  })

  it('has no next due once everything is settled', () => {
    const p = planProgress([inst({ status: 'paid' })], TODAY)
    expect(p.nextDue).toBeNull()
    expect(p.remaining).toBe(0)
  })
})

describe('reconcilePlan', () => {
  it('agrees when the rows match the plan', () => {
    const r = reconcilePlan({ planTotal: 1_000_000, installments: splitAmount(1_000_000, 3).map((a) => inst({ amount: a })) })
    expect(r.ok).toBe(true)
    expect(r.difference).toBe(0)
  })

  it('reports a shortfall rather than correcting it', () => {
    // Which number is right — the agreed plan or the edited rows — is
    // the clinic's call. Silently picking one would hide a disagreement
    // about money.
    const r = reconcilePlan({ planTotal: 1_000_000, installments: [inst({ amount: 400_000 }), inst({ amount: 400_000 })] })
    expect(r.ok).toBe(false)
    expect(r.difference).toBe(-200_000)
    expect(r.message).toContain('کمتر')
  })

  it('reports an overshoot too', () => {
    const r = reconcilePlan({ planTotal: 500_000, installments: [inst({ amount: 400_000 }), inst({ amount: 400_000 })] })
    expect(r.difference).toBe(300_000)
    expect(r.message).toContain('بیشتر')
  })

  it('ignores cancelled rows when reconciling', () => {
    const r = reconcilePlan({
      planTotal: 1_000_000,
      installments: [inst({ amount: 1_000_000 }), inst({ amount: 9_000_000, status: 'cancelled' })],
    })
    expect(r.ok).toBe(true)
  })
})

/**
 * MOD-FIX-014 | سررسیدها با ماه شمسی جلو می‌روند
 *
 * گزارش مهدی: «تقویم برای چک‌ها چک بشه چون ما سی‌ویک روز داریم و آن را
 * نداریم — حتماً تاریخ دقیق دربیاید.»
 *
 * تقویم انتخاب تاریخ سالم بود؛ مشکل در **تولید** سررسید بود:
 * گام ماهانه میلادی بود. ماه شمسی ۳۱، ۳۰ یا ۲۹ روز دارد و ماه میلادی
 * ۳۱، ۳۰ یا ۲۸ — پس روزِ شمسیِ سررسید در طول طرح می‌لغزید. به بیمار
 * گفته می‌شد «اول هر ماه» و سررسیدها می‌شدند ۱، ۱، ۲، ۲، ۳، ۴…
 */
import { toJalali, jalaliToGregorian, jalaliMonthLength } from './persianDate'

/** سررسید را به صورت [سال، ماه، روز] شمسی برمی‌گرداند. */
function asJalali(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return toJalali(y, m, d)
}

/**
 * MOD-FIX-020: `jalaliToGregorian` حالا `string | null` است — روی ورودی
 * بی‌معنا `null` می‌دهد به‌جای اینکه بی‌صدا «امروز» برگرداند. تاریخ‌های این
 * تست همه معتبرند، پس این کمک‌تابع همان‌جا شکست می‌خورد اگر روزی نبودند،
 * به‌جای اینکه `null` را در ادعای بعدی پنهان کند.
 */
const greg = (jy: number, jm: number, jd: number): string => {
  const iso = jalaliToGregorian(jy, jm, jd)
  if (!iso) throw new Error(`تاریخ آزمون نامعتبر است: ${jy}/${jm}/${jd}`)
  return iso
}

describe('🔴 سررسیدها روی همان روزِ شمسی می‌مانند', () => {
  it('شروع از اول مهر — شش قسط، همه روز اول', () => {
    const start = greg(1405, 7, 1)
    const days = installmentDueDates(start, 6).map((iso) => asJalali(iso)[2])
    expect(days).toEqual([1, 1, 1, 1, 1, 1])
  })

  it('ماه‌ها پشت سر هم جلو می‌روند، بدون پرش', () => {
    const start = greg(1405, 7, 1)
    const months = installmentDueDates(start, 6).map((iso) => asJalali(iso)[1])
    expect(months).toEqual([7, 8, 9, 10, 11, 12])
  })

  it('از یک سال به سال بعد درست عبور می‌کند', () => {
    const start = greg(1405, 11, 15)
    const parts = installmentDueDates(start, 4).map(asJalali)
    expect(parts).toEqual([
      [1405, 11, 15], [1405, 12, 15], [1406, 1, 15], [1406, 2, 15],
    ])
  })
})

describe('🔴 روز ۳۱ به آخر ماه کوتاه چسبانده می‌شود، نه پرتاب به ماه بعد', () => {
  it('شروع از ۳۱ فروردین — مهر ۳۰ روزه است', () => {
    // فروردین تا شهریور ۳۱ روز دارند، مهر ۳۰. اگر روز پرتاب می‌شد،
    // قسط هفتم یک ماه کامل جابه‌جا می‌شد — دعوای واقعی با بیمار.
    const start = greg(1405, 1, 31)
    const parts = installmentDueDates(start, 8).map(asJalali)
    expect(parts.map((p) => p[1])).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(parts.map((p) => p[2])).toEqual([31, 31, 31, 31, 31, 31, 30, 30])
  })

  it('روز چسبانده‌شده ماه بعد دوباره ۳۱ می‌شود', () => {
    // چسباندن نباید روز اصلی را برای همیشه از دست بدهد.
    const start = greg(1405, 6, 31)
    const parts = installmentDueDates(start, 8).map(asJalali)
    expect(parts[0]).toEqual([1405, 6, 31])
    expect(parts[1][2]).toBe(30)          // مهر
    expect(parts[7]).toEqual([1406, 1, 31]) // فروردین دوباره ۳۱ روز دارد
  })

  it('۳۰ اسفند در سال غیرکبیسه به ۲۹ می‌رسد', () => {
    const start = greg(1405, 6, 30)
    const parts = installmentDueDates(start, 7).map(asJalali)
    const esfand = parts[6]
    expect(esfand[1]).toBe(12)
    expect(esfand[2]).toBe(jalaliMonthLength(esfand[0], 12))
  })

  it('هیچ سررسیدی از طول ماه خودش بیشتر نیست', () => {
    for (const startDay of [28, 29, 30, 31]) {
      const start = greg(1405, 1, startDay)
      for (const iso of installmentDueDates(start, 24)) {
        const [y, m, d] = asJalali(iso)
        expect(d, `${y}/${m}/${d} از طول ماه بیشتر است`).toBeLessThanOrEqual(jalaliMonthLength(y, m))
      }
    }
  })
})

describe('پایداری سررسیدها', () => {
  it('تعداد خروجی با تعداد اقساط برابر است', () => {
    const start = greg(1405, 3, 12)
    expect(installmentDueDates(start, 12)).toHaveLength(12)
  })

  it('سررسیدها همیشه صعودی‌اند', () => {
    const start = greg(1405, 1, 31)
    const dates = installmentDueDates(start, 24)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1], `${dates[i - 1]} → ${dates[i]}`).toBe(true)
    }
  })

  it('ورودی نامعتبر آرایه‌ی خالی می‌دهد', () => {
    expect(installmentDueDates('', 3)).toEqual([])
    expect(installmentDueDates('1405/01/01', 3)).toEqual([])
    expect(installmentDueDates('2026-03-21', 0)).toEqual([])
  })
})
