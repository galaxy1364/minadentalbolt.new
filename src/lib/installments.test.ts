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
  it('steps one month at a time', () => {
    expect(installmentDueDates('2026-01-10', 3)).toEqual(['2026-01-10', '2026-02-10', '2026-03-10'])
  })

  it('does not let a due date jump a month', () => {
    // Date.setMonth turned 31 January into 3 March, because February has
    // no 31st and JavaScript rolls forward. A due date that silently
    // moves is a dispute with a patient.
    expect(installmentDueDates('2026-01-31', 3)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('clamps to a leap February correctly', () => {
    expect(installmentDueDates('2028-01-31', 2)).toEqual(['2028-01-31', '2028-02-29'])
  })

  it('rolls over the year boundary', () => {
    expect(installmentDueDates('2026-11-15', 3)).toEqual(['2026-11-15', '2026-12-15', '2027-01-15'])
  })

  it('returns nothing for an unparseable start date', () => {
    expect(installmentDueDates('not-a-date', 3)).toEqual([])
  })
})

describe('buildSchedule', () => {
  it('produces amounts and dates from one call', () => {
    const s = buildSchedule(1_000_000, 3, '2026-01-31')
    expect(s.map((r) => r.amount).reduce((a, b) => a + b, 0)).toBe(1_000_000)
    expect(s.map((r) => r.due_date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
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
