import { describe, it, expect } from 'vitest'
import {
  findOverdueLabOrders, findStalledImplants, findOverduePhases,
  buildClinicalFollowUps, snoozeUntil, applyDismissals,
} from './followUps'
import type { LabOrderLike, ImplantCaseLike, PhaseWithPatient } from './followUps'

const TODAY = '2026-08-15'

function lab(over: Partial<LabOrderLike> = {}): LabOrderLike {
  return { id: 'l1', patient_id: 'p1', deadline: '2026-08-01', status: 'sent', ...over }
}
function impl(over: Partial<ImplantCaseLike> = {}): ImplantCaseLike {
  return { id: 'i1', patient_id: 'p1', stage: 'impression', updated_at: '2026-06-01', ...over }
}
function phase(over: Partial<PhaseWithPatient> = {}): PhaseWithPatient {
  return { id: 'ph1', patient_id: 'p1', phase_number: 1, title: 'جراحی', status: 'in_progress', start_date: '2026-06-01', estimated_duration_days: 10, ...over }
}

describe('findOverdueLabOrders', () => {
  it('flags an order past its due date', () => {
    const r = findOverdueLabOrders([lab()], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].daysLate).toBe(14)
  })

  it('says nothing about an order still within its date', () => {
    expect(findOverdueLabOrders([lab({ deadline: '2026-09-01' })], TODAY)).toEqual([])
  })

  it('ignores delivered and cancelled orders', () => {
    expect(findOverdueLabOrders([
      lab({ delivered: true }),
      lab({ id: 'l2', status: 'cancelled' }),
      lab({ id: 'l3', status: 'delivered' }),
    ], TODAY)).toEqual([])
  })

  it('ignores an order with no deadline rather than guessing one', () => {
    expect(findOverdueLabOrders([lab({ deadline: null })], TODAY)).toEqual([])
  })
})

describe('findStalledImplants', () => {
  it('flags a case sitting too long in one stage', () => {
    // 75 days at impression, which allows 21.
    const r = findStalledImplants([impl()], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].kind).toBe('implant_stalled')
  })

  it('gives healing a far longer rope', () => {
    // Healing genuinely takes months. Flagging every healing implant
    // would bury the ones actually forgotten.
    expect(findStalledImplants([impl({ stage: 'healing' })], TODAY)).toEqual([])
    expect(findStalledImplants([impl({ stage: 'healing', updated_at: '2025-06-01' })], TODAY)).toHaveLength(1)
  })

  it('says nothing about finished or failed cases', () => {
    expect(findStalledImplants([
      impl({ stage: 'completed' }),
      impl({ id: 'i2', stage: 'failed' }),
    ], TODAY)).toEqual([])
  })

  it('ignores an archived case', () => {
    expect(findStalledImplants([impl({ is_active: false })], TODAY)).toEqual([])
  })

  it('falls back to the surgery date when nothing has touched the case', () => {
    const r = findStalledImplants([impl({ updated_at: null, surgery_date: '2026-01-01' })], TODAY)
    expect(r).toHaveLength(1)
  })
})

describe('findOverduePhases', () => {
  it('flags a phase past its own estimate', () => {
    const r = findOverduePhases([phase()], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].daysLate).toBeGreaterThan(0)
  })

  it('says nothing about a completed phase', () => {
    expect(findOverduePhases([phase({ status: 'completed' })], TODAY)).toEqual([])
  })

  it('says nothing about a phase that has not started', () => {
    expect(findOverduePhases([phase({ start_date: null })], TODAY)).toEqual([])
  })
})

describe('buildClinicalFollowUps', () => {
  it('merges the three kinds, most overdue first', () => {
    const r = buildClinicalFollowUps(
      [lab({ deadline: '2026-08-13' })],
      [impl({ updated_at: '2026-01-01' })],
      [phase()],
      TODAY,
    )
    expect(r.length).toBe(3)
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].daysLate).toBeGreaterThanOrEqual(r[i].daysLate)
    }
  })

  it('gives every item a key that survives a reload', () => {
    const r = buildClinicalFollowUps([lab()], [impl()], [phase()], TODAY)
    const keys = r.map((x) => x.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.every((k) => k.includes(':'))).toBe(true)
  })

  it('returns nothing for a clinic with nothing outstanding', () => {
    expect(buildClinicalFollowUps([], [], [], TODAY)).toEqual([])
  })
})

describe('snoozeUntil', () => {
  it('moves the date forward', () => {
    expect(snoozeUntil(TODAY, 3)).toBe('2026-08-18')
  })

  it('never snoozes for zero or negative days', () => {
    // Otherwise "handled" would hide an item and immediately show it
    // again, which reads as the button not working.
    expect(snoozeUntil(TODAY, 0)).toBe('2026-08-16')
    expect(snoozeUntil(TODAY, -5)).toBe('2026-08-16')
  })
})

describe('applyDismissals', () => {
  const items = [{ key: 'lab:1' }, { key: 'lab:2' }, { key: 'implant:1' }]

  it('hides a snoozed item', () => {
    const r = applyDismissals(items, [{ key: 'lab:1', until: '2026-08-20' }], TODAY)
    expect(r.visible.map((i) => i.key)).toEqual(['lab:2', 'implant:1'])
    expect(r.hiddenCount).toBe(1)
  })

  it('brings an item back once the snooze expires', () => {
    // Permanent dismissal is wrong for clinical work: the crown still has
    // not arrived after you tick "called the lab".
    const r = applyDismissals(items, [{ key: 'lab:1', until: '2026-08-14' }], TODAY)
    expect(r.visible).toHaveLength(3)
  })

  it('treats a snooze ending today as expired', () => {
    const r = applyDismissals(items, [{ key: 'lab:1', until: TODAY }], TODAY)
    expect(r.visible).toHaveLength(3)
  })

  it('drops expired snoozes so the stored list cannot grow forever', () => {
    const r = applyDismissals(items, [
      { key: 'lab:1', until: '2026-08-20' },
      { key: 'gone:9', until: '2020-01-01' },
    ], TODAY)
    expect(r.liveDismissals).toHaveLength(1)
  })

  it('leaves everything visible when nothing is snoozed', () => {
    expect(applyDismissals(items, [], TODAY).visible).toHaveLength(3)
  })
})
