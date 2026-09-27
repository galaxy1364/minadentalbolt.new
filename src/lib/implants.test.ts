import { describe, it, expect } from 'vitest'
import {
  deductibleComponentCost, calcSurgeryShare, calcProsthesisShare,
  caseFinancials, stageIndex, validateImplantDates,
  validateImplantCase, IMPLANT_STAGES,
} from './implants'
import type { ImplantCaseLike, ImplantComponentLike } from './implants'

function comp(over: Partial<ImplantComponentLike> = {}): ImplantComponentLike {
  return { component_type: 'abutment', cost: 1_000_000, include_in_doctor_share: true, ...over }
}
function kase(over: Partial<ImplantCaseLike> = {}): ImplantCaseLike {
  return { total_cost: 20_000_000, paid_amount: 0, surgery_fee_mode: 'formula', components: [], ...over }
}

describe('deductibleComponentCost', () => {
  it('sums the components that count', () => {
    expect(deductibleComponentCost([comp(), comp({ cost: 500_000 })])).toBe(1_500_000)
  })

  it('always excludes the fixture, even when its flag says to include it', () => {
    // The fixture is billed separately and was never part of the
    // surgeon's deduction base. Unconditional here so a mis-ticked box
    // cannot quietly change what a surgeon is paid.
    expect(deductibleComponentCost([
      comp({ component_type: 'fixture', cost: 9_000_000, include_in_doctor_share: true }),
      comp({ cost: 1_000_000 }),
    ])).toBe(1_000_000)
  })

  it('honours an explicit exclusion on a non-fixture component', () => {
    expect(deductibleComponentCost([comp({ include_in_doctor_share: false })])).toBe(0)
  })

  it('treats a missing flag as included', () => {
    expect(deductibleComponentCost([comp({ include_in_doctor_share: null })])).toBe(1_000_000)
  })

  it('is zero for a case with no components', () => {
    expect(deductibleComponentCost()).toBe(0)
    expect(deductibleComponentCost([])).toBe(0)
  })
})

describe('calcSurgeryShare', () => {
  it('halves what is left after deductible components', () => {
    const share = calcSurgeryShare(kase({ total_cost: 20_000_000, components: [comp({ cost: 4_000_000 })] }))
    expect(share).toBe(8_000_000)
  })

  it('returns whole toman, never a fraction', () => {
    // The old version returned net / 2 unrounded, so an odd net put half
    // a toman into a currency field and every total it fed.
    const share = calcSurgeryShare(kase({ total_cost: 1_000_001, components: [] }))
    expect(Number.isInteger(share)).toBe(true)
    expect(share).toBe(500_001)
  })

  it('returns the negotiated figure untouched', () => {
    const share = calcSurgeryShare(kase({
      surgery_fee_mode: 'negotiated', surgery_fee_amount: 7_500_000,
      total_cost: 20_000_000, components: [comp({ cost: 19_000_000 })],
    }))
    expect(share).toBe(7_500_000)
  })

  it('never goes negative when components cost more than the case sold for', () => {
    // Handing the surgeon a negative share would mean billing them for
    // the privilege of operating.
    const share = calcSurgeryShare(kase({ total_cost: 5_000_000, components: [comp({ cost: 9_000_000 })] }))
    expect(share).toBe(0)
  })

  it('ignores the fixture when splitting', () => {
    const share = calcSurgeryShare(kase({
      total_cost: 20_000_000,
      components: [comp({ component_type: 'fixture', cost: 10_000_000 })],
    }))
    expect(share).toBe(10_000_000)
  })
})

describe('calcProsthesisShare', () => {
  it('rounds and never goes negative', () => {
    expect(calcProsthesisShare(kase({ prosthesis_fee_amount: 1_234_567.6 }))).toBe(1_234_568)
    expect(calcProsthesisShare(kase({ prosthesis_fee_amount: -5 }))).toBe(0)
    expect(calcProsthesisShare(kase())).toBe(0)
  })
})

describe('caseFinancials', () => {
  it('splits the case between doctors and clinic', () => {
    const f = caseFinancials(kase({
      total_cost: 20_000_000, paid_amount: 5_000_000,
      components: [comp({ cost: 4_000_000 })], prosthesis_fee_amount: 2_000_000,
    }))
    expect(f.remaining).toBe(15_000_000)
    expect(f.surgeryShare).toBe(8_000_000)
    expect(f.prosthesisShare).toBe(2_000_000)
    expect(f.clinicShare).toBe(10_000_000)
  })

  it('shows a negative remaining when the patient has overpaid', () => {
    // A deposit larger than the case price is real; hiding it would make
    // the number disagree with the patient balance.
    expect(caseFinancials(kase({ total_cost: 1_000_000, paid_amount: 1_500_000 })).remaining).toBe(-500_000)
  })
})

describe('stageIndex', () => {
  it('places every stage in order', () => {
    IMPLANT_STAGES.forEach((s, i) => expect(stageIndex(s)).toBe(i))
  })

  it('treats an unknown or missing stage as the first', () => {
    expect(stageIndex(null)).toBe(0)
    expect(stageIndex('nonsense')).toBe(0)
  })
})

// MOD-FIX-023: canMoveStage is gone — the chain moves by recording what
// happened, so there is no stage to move and nothing to check a move against.

describe('validateImplantDates', () => {
  it('accepts dates in order', () => {
    expect(validateImplantDates(kase({
      surgery_date: '2026-01-01', healing_abutment_date: '2026-03-01',
      impression_date: '2026-04-01', crown_delivery_date: '2026-05-01',
    }))).toEqual([])
  })

  it('refuses a crown delivered before the surgery', () => {
    // These dates drive the warranty window and the healing interval.
    const errors = validateImplantDates(kase({ surgery_date: '2026-05-01', crown_delivery_date: '2026-01-01' }))
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('تحویل روکش')
  })

  it('skips gaps rather than assuming them', () => {
    // A case with no healing-abutment date is normal; comparing against
    // a missing date would invent an error.
    expect(validateImplantDates(kase({ surgery_date: '2026-01-01', crown_delivery_date: '2026-06-01' }))).toEqual([])
  })

  it('accepts two steps on the same day', () => {
    expect(validateImplantDates(kase({ impression_date: '2026-04-01', crown_delivery_date: '2026-04-01' }))).toEqual([])
  })

  it('says nothing about a case with no dates yet', () => {
    expect(validateImplantDates(kase())).toEqual([])
  })
})

describe('validateImplantCase', () => {
  it('refuses negative money', () => {
    expect(validateImplantCase(kase({ total_cost: -1 }))).toContain('هزینه کل نمی‌تواند منفی باشد')
    expect(validateImplantCase(kase({ paid_amount: -1 }))).toContain('مبلغ پرداختی نمی‌تواند منفی باشد')
  })

  it('refuses a negative negotiated fee', () => {
    expect(validateImplantCase(kase({ surgery_fee_mode: 'negotiated', surgery_fee_amount: -1 })))
      .toContain('حق‌الزحمه توافقی نمی‌تواند منفی باشد')
  })

  it('accepts a well-formed case', () => {
    expect(validateImplantCase(kase({ total_cost: 20_000_000, paid_amount: 0 }))).toEqual([])
  })
})
