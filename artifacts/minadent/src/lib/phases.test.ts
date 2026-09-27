import { describe, it, expect } from 'vitest'
import {
  livePhases, phasePlanProgress, phaseSchedule, daysBetween,
  validatePhase, nextPhaseNumber, comparePhaseCostToTreatments,
} from './phases'
import type { PhaseLike } from './phases'

function ph(over: Partial<PhaseLike> = {}): PhaseLike {
  return { phase_number: 1, title: 'مرحله', status: 'planned', ...over }
}

const TODAY = '2026-08-15'

describe('livePhases', () => {
  it('drops cancelled phases', () => {
    // Leaving one in keeps the plan permanently unfinishable.
    expect(livePhases([ph(), ph({ status: 'cancelled' })])).toHaveLength(1)
  })
})

describe('phasePlanProgress', () => {
  it('counts what is done, running and not begun', () => {
    const p = phasePlanProgress([
      ph({ status: 'completed' }),
      ph({ status: 'in_progress' }),
      ph({ status: 'planned' }),
      ph({ status: 'planned' }),
    ])
    expect(p).toMatchObject({ total: 4, completed: 1, inProgress: 1, notStarted: 2, percent: 25 })
  })

  it('reaches 100 percent when every live phase is done', () => {
    const p = phasePlanProgress([ph({ status: 'completed' }), ph({ status: 'cancelled' })])
    expect(p.percent).toBe(100)
  })

  it('reports zero rather than dividing by zero on an empty plan', () => {
    expect(phasePlanProgress([]).percent).toBe(0)
  })

  it('projects cost from the actual where it exists and the estimate where it does not', () => {
    // Without the fallback a half-costed plan reads as costing almost
    // nothing, which is the opposite of useful when quoting.
    const p = phasePlanProgress([
      ph({ estimated_cost: 1_000_000, actual_cost: 1_200_000 }),
      ph({ estimated_cost: 500_000 }),
    ])
    expect(p.estimatedCost).toBe(1_500_000)
    expect(p.actualCost).toBe(1_200_000)
    expect(p.projectedCost).toBe(1_700_000)
  })

  it('leaves a cancelled phase out of the money too', () => {
    const p = phasePlanProgress([ph({ estimated_cost: 100 }), ph({ status: 'cancelled', estimated_cost: 9_000_000 })])
    expect(p.estimatedCost).toBe(100)
  })
})

describe('daysBetween', () => {
  it('counts whole days forward and back', () => {
    expect(daysBetween('2026-08-15', '2026-08-20')).toBe(5)
    expect(daysBetween('2026-08-20', '2026-08-15')).toBe(-5)
    expect(daysBetween('2026-08-15', '2026-08-15')).toBe(0)
  })
})

describe('phaseSchedule', () => {
  it('calls a completed phase finished, whatever its dates', () => {
    expect(phaseSchedule(ph({ status: 'completed', start_date: '2020-01-01' }), TODAY).timing).toBe('finished')
  })

  it('calls a phase with no start date not started, even if marked in progress', () => {
    // An in-progress row with no start date is a data-entry slip;
    // calling it on track would hide that.
    expect(phaseSchedule(ph({ status: 'in_progress' }), TODAY).timing).toBe('not_started')
  })

  it('derives the expected end from the duration estimate', () => {
    const s = phaseSchedule(ph({ status: 'in_progress', start_date: '2026-08-10', estimated_duration_days: 10 }), TODAY)
    expect(s.expectedEnd).toBe('2026-08-20')
    expect(s.timing).toBe('on_track')
    expect(s.daysRemaining).toBe(5)
  })

  it('prefers an explicit end date over the duration estimate', () => {
    // Someone typed it deliberately.
    const s = phaseSchedule(
      ph({ status: 'in_progress', start_date: '2026-08-01', end_date: '2026-08-31', estimated_duration_days: 2 }),
      TODAY,
    )
    expect(s.expectedEnd).toBe('2026-08-31')
    expect(s.timing).toBe('on_track')
  })

  it('flags a phase past its expected end', () => {
    const s = phaseSchedule(ph({ status: 'in_progress', start_date: '2026-07-01', estimated_duration_days: 10 }), TODAY)
    expect(s.timing).toBe('overdue')
    expect(s.daysRemaining).toBeLessThan(0)
  })

  it('has a separate state for the day it is due', () => {
    const s = phaseSchedule(ph({ status: 'in_progress', start_date: '2026-08-05', estimated_duration_days: 10 }), TODAY)
    expect(s.timing).toBe('due_today')
    expect(s.daysRemaining).toBe(0)
  })

  it('says on track rather than guessing when there is no estimate at all', () => {
    const s = phaseSchedule(ph({ status: 'in_progress', start_date: '2026-08-01' }), TODAY)
    expect(s.timing).toBe('on_track')
    expect(s.daysRemaining).toBeNull()
  })
})

describe('validatePhase', () => {
  it('accepts a well-formed phase', () => {
    expect(validatePhase(ph({ title: 'جراحی', phase_number: 2 }))).toEqual([])
  })

  it('requires a title', () => {
    expect(validatePhase(ph({ title: '   ' }))).toContain('عنوان مرحله الزامی است')
  })

  it('refuses a duplicate phase number', () => {
    const errors = validatePhase(ph({ phase_number: 1 }), [ph({ phase_number: 1 })])
    expect(errors).toContain('شماره مرحله تکراری است')
  })

  it('refuses an end date before the start date', () => {
    // Otherwise every duration and overdue count downstream is nonsense.
    const errors = validatePhase(ph({ start_date: '2026-08-20', end_date: '2026-08-10' }))
    expect(errors).toContain('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد')
  })

  it('accepts a phase that starts and ends on the same day', () => {
    expect(validatePhase(ph({ start_date: '2026-08-10', end_date: '2026-08-10' }))).toEqual([])
  })

  it('refuses negative money and negative durations', () => {
    expect(validatePhase(ph({ estimated_cost: -1 }))).toContain('هزینه برآوردی نمی‌تواند منفی باشد')
    expect(validatePhase(ph({ actual_cost: -1 }))).toContain('هزینه واقعی نمی‌تواند منفی باشد')
    expect(validatePhase(ph({ estimated_duration_days: -1 }))).toContain('مدت برآوردی نمی‌تواند منفی باشد')
  })

  it('allows a zero cost, which is a real case', () => {
    expect(validatePhase(ph({ estimated_cost: 0, actual_cost: 0 }))).toEqual([])
  })
})

describe('nextPhaseNumber', () => {
  it('starts at one on an empty plan', () => {
    expect(nextPhaseNumber([])).toBe(1)
  })

  it('uses max plus one, not count plus one', () => {
    // Count + 1 would hand out 3 for a plan numbered 1 and 5, colliding
    // the next time someone renumbers.
    expect(nextPhaseNumber([ph({ phase_number: 1 }), ph({ phase_number: 5 })])).toBe(6)
  })

  it('does not reuse a cancelled phase number', () => {
    expect(nextPhaseNumber([ph({ phase_number: 3, status: 'cancelled' })])).toBe(4)
  })
})

describe('comparePhaseCostToTreatments', () => {
  it('agrees when the charges match the projection', () => {
    const r = comparePhaseCostToTreatments(
      [ph({ estimated_cost: 1_000_000 })],
      [{ total_price: 1_000_000, status: 'completed' }],
    )
    expect(r.ok).toBe(true)
    expect(r.difference).toBe(0)
  })

  it('reports charges running ahead of the estimate', () => {
    const r = comparePhaseCostToTreatments(
      [ph({ estimated_cost: 1_000_000 })],
      [{ total_price: 1_400_000, status: 'completed' }],
    )
    expect(r.difference).toBe(400_000)
    expect(r.message).toContain('بیشتر')
  })

  it('reports a plan only part executed without calling it an error', () => {
    const r = comparePhaseCostToTreatments(
      [ph({ estimated_cost: 1_000_000 }), ph({ phase_number: 2, estimated_cost: 1_000_000 })],
      [{ total_price: 1_000_000, status: 'completed' }],
    )
    expect(r.difference).toBe(-1_000_000)
    expect(r.message).toContain('نرسیده')
  })

  it('ignores cancelled treatments', () => {
    const r = comparePhaseCostToTreatments(
      [ph({ estimated_cost: 500_000 })],
      [{ total_price: 500_000, status: 'completed' }, { total_price: 9_000_000, status: 'cancelled' }],
    )
    expect(r.ok).toBe(true)
  })
})
