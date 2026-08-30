import { describe, it, expect } from 'vitest'
import {
  toRial, isConsumingClaim, usedCeiling, remainingCeiling, isPolicyValidOn,
  splitCoverage, ceilingUsagePercent, selectApplicablePolicy, validatePolicy,
} from './insurance'
import type { PatientPolicy } from './insurance'
import type { InsuranceClaim } from '../types'

function policy(over: Partial<PatientPolicy> = {}): PatientPolicy {
  return {
    id: over.id || 'pol1',
    clinic_id: 'c1',
    patient_id: 'p1',
    company_id: over.company_id !== undefined ? over.company_id : 'co1',
    policy_number: '11012511417',
    start_date: over.start_date !== undefined ? over.start_date : '2025-03-01',
    end_date: over.end_date !== undefined ? over.end_date : '2027-03-20',
    coverage_percentage: over.coverage_percentage !== undefined ? over.coverage_percentage : 60,
    ceiling_amount: over.ceiling_amount !== undefined ? over.ceiling_amount : 100_000_000,
    is_active: over.is_active !== undefined ? over.is_active : true,
    notes: null,
    created_at: '2025-03-01T00:00:00.000Z',
    updated_at: '2025-03-01T00:00:00.000Z',
  }
}

function claim(over: Partial<InsuranceClaim> = {}): InsuranceClaim {
  return {
    id: over.id || 'cl1',
    clinic_id: 'c1',
    patient_id: 'p1',
    company_id: over.company_id !== undefined ? over.company_id : 'co1',
    encounter_id: null,
    claim_number: null,
    amount: over.amount !== undefined ? over.amount : 10_000_000,
    approved_amount: over.approved_amount !== undefined ? over.approved_amount : null,
    status: over.status || 'approved',
    submitted_at: null,
    response_at: null,
    notes: null,
    payment_recorded_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

const DATE = '2026-08-01'

describe('toRial', () => {
  it('rounds to a whole rial — fractions of a rial do not exist', () => {
    expect(toRial(1234.4)).toBe(1234)
    expect(toRial(1234.5)).toBe(1235)
  })
})

describe('isConsumingClaim', () => {
  it('counts approved, paid and settled claims', () => {
    expect(isConsumingClaim('approved')).toBe(true)
    expect(isConsumingClaim('PAID')).toBe(true)
    expect(isConsumingClaim('settled')).toBe(true)
  })

  it('does not count pending or rejected claims', () => {
    // Counting these would understate what the patient can still claim
    // and wrongly push cost onto them.
    expect(isConsumingClaim('pending')).toBe(false)
    expect(isConsumingClaim('rejected')).toBe(false)
    expect(isConsumingClaim(null)).toBe(false)
  })
})

describe('usedCeiling', () => {
  it('prefers the approved amount over the submitted amount', () => {
    const claims = [claim({ amount: 10_000_000, approved_amount: 6_000_000 })]
    expect(usedCeiling(claims, 'co1')).toBe(6_000_000)
  })

  it('falls back to the submitted amount when the insurer has not answered', () => {
    expect(usedCeiling([claim({ amount: 10_000_000, approved_amount: null })], 'co1')).toBe(10_000_000)
  })

  it('treats an explicit zero approval as zero, not as missing', () => {
    // A claim approved for nothing must consume nothing.
    expect(usedCeiling([claim({ amount: 10_000_000, approved_amount: 0 })], 'co1')).toBe(0)
  })

  it('ignores claims from a different insurer', () => {
    const claims = [claim({ id: 'a', company_id: 'co1' }), claim({ id: 'b', company_id: 'co2' })]
    expect(usedCeiling(claims, 'co1')).toBe(10_000_000)
  })

  it('sums every insurer when no company is given', () => {
    const claims = [claim({ id: 'a', company_id: 'co1' }), claim({ id: 'b', company_id: 'co2' })]
    expect(usedCeiling(claims, null)).toBe(20_000_000)
  })
})

describe('remainingCeiling', () => {
  it('subtracts consumed claims from the ceiling', () => {
    expect(remainingCeiling(policy(), [claim({ approved_amount: 30_000_000 })])).toBe(70_000_000)
  })

  it('never goes negative even if the insurer overpaid', () => {
    expect(remainingCeiling(policy(), [claim({ approved_amount: 150_000_000 })])).toBe(0)
  })

  it('returns null for an unlimited policy', () => {
    expect(remainingCeiling(policy({ ceiling_amount: null }), [])).toBeNull()
  })
})

describe('isPolicyValidOn', () => {
  it('accepts a date inside the window, including both boundaries', () => {
    expect(isPolicyValidOn(policy(), '2026-08-01')).toBe(true)
    expect(isPolicyValidOn(policy(), '2025-03-01')).toBe(true)
    expect(isPolicyValidOn(policy(), '2027-03-20')).toBe(true)
  })

  it('rejects dates outside the window', () => {
    expect(isPolicyValidOn(policy(), '2025-02-28')).toBe(false)
    expect(isPolicyValidOn(policy(), '2027-03-21')).toBe(false)
  })

  it('rejects an inactive policy regardless of dates', () => {
    expect(isPolicyValidOn(policy({ is_active: false }), DATE)).toBe(false)
  })

  it('treats null dates as open-ended', () => {
    expect(isPolicyValidOn(policy({ start_date: null, end_date: null }), '1999-01-01')).toBe(true)
  })

  it('tolerates a full ISO timestamp, not just a date', () => {
    expect(isPolicyValidOn(policy(), '2026-08-01T13:45:00.000Z')).toBe(true)
  })
})

describe('splitCoverage', () => {
  it('applies the coverage percentage when there is ceiling to spare', () => {
    const r = splitCoverage(10_000_000, policy(), [], DATE)
    expect(r.insuranceShare).toBe(6_000_000)
    expect(r.patientShare).toBe(4_000_000)
    expect(r.cappedByCeiling).toBe(false)
    expect(r.warning).toBeNull()
  })

  it('shares always add back up to the exact cost', () => {
    // Guards against a rounding gap silently appearing in the ledger.
    for (const cost of [1, 7, 333, 12_345_679, 99_999_999]) {
      const r = splitCoverage(cost, policy({ coverage_percentage: 33 }), [], DATE)
      expect(r.insuranceShare + r.patientShare).toBe(cost)
    }
  })

  it('caps the insurer at the remaining ceiling and warns', () => {
    // 90m already used, 10m left; 60% of 50m would be 30m.
    const claims = [claim({ approved_amount: 90_000_000 })]
    const r = splitCoverage(50_000_000, policy(), claims, DATE)
    expect(r.uncappedInsuranceShare).toBe(30_000_000)
    expect(r.insuranceShare).toBe(10_000_000)
    expect(r.patientShare).toBe(40_000_000)
    expect(r.cappedByCeiling).toBe(true)
    expect(r.remainingAfter).toBe(0)
    expect(r.warning).toContain('سقف تعهد')
  })

  it('charges the patient everything once the ceiling is exhausted', () => {
    const claims = [claim({ approved_amount: 100_000_000 })]
    const r = splitCoverage(5_000_000, policy(), claims, DATE)
    expect(r.insuranceShare).toBe(0)
    expect(r.patientShare).toBe(5_000_000)
    expect(r.warning).toContain('کامل مصرف شده')
  })

  it('charges the patient everything when there is no policy', () => {
    const r = splitCoverage(5_000_000, null, [], DATE)
    expect(r.patientShare).toBe(5_000_000)
    expect(r.insuranceShare).toBe(0)
    expect(r.warning).toBeNull()
  })

  it('charges the patient everything when the policy has expired', () => {
    const r = splitCoverage(5_000_000, policy(), [], '2028-01-01')
    expect(r.patientShare).toBe(5_000_000)
    expect(r.warning).toContain('معتبر نیست')
  })

  it('handles an unlimited policy with no ceiling', () => {
    const r = splitCoverage(10_000_000, policy({ ceiling_amount: null }), [], DATE)
    expect(r.insuranceShare).toBe(6_000_000)
    expect(r.remainingAfter).toBeNull()
    expect(r.cappedByCeiling).toBe(false)
  })

  it('clamps a nonsensical coverage percentage instead of inverting the split', () => {
    expect(splitCoverage(1000, policy({ coverage_percentage: 150 }), [], DATE).insuranceShare).toBe(1000)
    expect(splitCoverage(1000, policy({ coverage_percentage: -20 }), [], DATE).insuranceShare).toBe(0)
  })

  it('treats a negative cost as zero rather than paying the patient', () => {
    const r = splitCoverage(-5000, policy(), [], DATE)
    expect(r.patientShare).toBe(0)
    expect(r.insuranceShare).toBe(0)
  })

  it('ignores pending claims when computing what is left', () => {
    const claims = [claim({ status: 'pending', amount: 100_000_000 })]
    expect(splitCoverage(10_000_000, policy(), claims, DATE).insuranceShare).toBe(6_000_000)
  })
})

describe('ceilingUsagePercent', () => {
  it('reports consumption as a percentage', () => {
    expect(ceilingUsagePercent(policy(), [claim({ approved_amount: 25_000_000 })])).toBe(25)
  })

  it('clamps at 100 when the insurer overpaid', () => {
    expect(ceilingUsagePercent(policy(), [claim({ approved_amount: 150_000_000 })])).toBe(100)
  })

  it('returns null for an unlimited policy — nothing to fill up', () => {
    expect(ceilingUsagePercent(policy({ ceiling_amount: null }), [])).toBeNull()
    expect(ceilingUsagePercent(policy({ ceiling_amount: 0 }), [])).toBeNull()
  })
})

describe('selectApplicablePolicy', () => {
  it('returns null when no policy is valid on the date', () => {
    expect(selectApplicablePolicy([policy({ end_date: '2025-01-01' })], [], DATE)).toBeNull()
  })

  it('prefers the policy with the most ceiling left', () => {
    // A patient with two policies must not be blocked by an exhausted
    // one while the other still has room.
    const a = policy({ id: 'a', company_id: 'coA', ceiling_amount: 100_000_000 })
    const b = policy({ id: 'b', company_id: 'coB', ceiling_amount: 100_000_000 })
    const claims = [claim({ company_id: 'coA', approved_amount: 95_000_000 })]
    expect(selectApplicablePolicy([a, b], claims, DATE)?.id).toBe('b')
  })

  it('prefers an unlimited policy over a capped one', () => {
    const capped = policy({ id: 'a', company_id: 'coA' })
    const unlimited = policy({ id: 'b', company_id: 'coB', ceiling_amount: null })
    expect(selectApplicablePolicy([capped, unlimited], [], DATE)?.id).toBe('b')
  })

  it('skips inactive policies', () => {
    const off = policy({ id: 'a', is_active: false })
    const on = policy({ id: 'b', company_id: 'coB' })
    expect(selectApplicablePolicy([off, on], [], DATE)?.id).toBe('b')
  })
})

describe('validatePolicy', () => {
  it('accepts a well-formed policy', () => {
    expect(validatePolicy(policy())).toEqual([])
  })

  it('requires a coverage percentage', () => {
    expect(validatePolicy({ coverage_percentage: undefined })).toContain('درصد پوشش بیمه الزامی است')
  })

  it('rejects an out-of-range percentage', () => {
    expect(validatePolicy({ coverage_percentage: 120 })).toContain('درصد پوشش باید بین ۰ تا ۱۰۰ باشد')
    expect(validatePolicy({ coverage_percentage: -1 })).toContain('درصد پوشش باید بین ۰ تا ۱۰۰ باشد')
  })

  it('rejects a negative ceiling', () => {
    expect(validatePolicy({ coverage_percentage: 60, ceiling_amount: -1 }))
      .toContain('سقف تعهد نمی‌تواند منفی باشد')
  })

  it('rejects an end date before the start date', () => {
    expect(validatePolicy({ coverage_percentage: 60, start_date: '2026-05-01', end_date: '2026-01-01' }))
      .toContain('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد')
  })

  it('allows a null ceiling for an unlimited policy', () => {
    expect(validatePolicy({ coverage_percentage: 60, ceiling_amount: null })).toEqual([])
  })
})
