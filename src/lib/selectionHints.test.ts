import { describe, it, expect } from 'vitest'
import {
  doctorsForDay, unitAvailability, procedureDefaultPrice, patientPickerHint,
} from './selectionHints'
import type { ScheduleLike, UnitBooking } from './selectionHints'

const DOCS = [{ id: 'd1' }, { id: 'd2' }]

function sched(over: Partial<ScheduleLike> = {}): ScheduleLike {
  return { doctor_id: 'd1', day_of_week: 1, start_time: '09:00', end_time: '17:00', ...over }
}
function appt(over: Partial<UnitBooking> = {}): UnitBooking {
  return { unit_id: 'u1', date: '2026-08-15', start_time: '10:00', end_time: '10:30', status: 'scheduled', ...over }
}

describe('doctorsForDay', () => {
  it('marks a doctor who does not work that weekday', () => {
    const opts = doctorsForDay(DOCS, [sched({ doctor_id: 'd1', day_of_week: 1 })], 3)
    expect(opts.find((o) => o.id === 'd1')?.worksToday).toBe(false)
  })

  it('reports the hours on a day they do work', () => {
    const opts = doctorsForDay(DOCS, [sched({ day_of_week: 1 })], 1)
    expect(opts.find((o) => o.id === 'd1')).toMatchObject({ worksToday: true, hours: '09:00 تا 17:00' })
  })

  it('spans two shifts on the same day', () => {
    const opts = doctorsForDay(DOCS, [
      sched({ start_time: '09:00', end_time: '12:00' }),
      sched({ start_time: '16:00', end_time: '20:00' }),
    ], 1)
    expect(opts.find((o) => o.id === 'd1')?.hours).toBe('09:00 تا 20:00')
  })

  it('treats a doctor with no schedule at all as available', () => {
    // Greying out every doctor because settings are empty would make the
    // app unusable.
    const opts = doctorsForDay(DOCS, [], 3)
    expect(opts.every((o) => o.worksToday)).toBe(true)
  })

  it('marks rather than filters, so an unavailable doctor is still listed', () => {
    // Clinics do book outside declared hours — an emergency, a favour, a
    // shift nobody updated. Hiding the person you are looking for is
    // worse than warning about them.
    const opts = doctorsForDay(DOCS, [sched({ day_of_week: 1 })], 3)
    expect(opts).toHaveLength(2)
  })

  it('ignores an inactive schedule row', () => {
    const opts = doctorsForDay(DOCS, [sched({ day_of_week: 1, is_active: false })], 1)
    expect(opts.find((o) => o.id === 'd1')?.worksToday).toBe(true)
  })
})

describe('unitAvailability', () => {
  const UNITS = [{ id: 'u1' }, { id: 'u2' }]

  it('marks a unit busy when an appointment overlaps the window', () => {
    // Two doctors cannot share one chair — the gap MOD-UI-005 left open.
    const opts = unitAvailability(UNITS, [appt()], '2026-08-15', '10:00', '10:30')
    expect(opts.find((o) => o.id === 'u1')?.busy).toBe(true)
    expect(opts.find((o) => o.id === 'u2')?.busy).toBe(false)
  })

  it('reports when the clash is, so the hint can say so', () => {
    const opts = unitAvailability(UNITS, [appt()], '2026-08-15', '10:15', '10:45')
    expect(opts.find((o) => o.id === 'u1')?.busyAt).toBe('10:00 تا 10:30')
  })

  it('treats back-to-back bookings as free', () => {
    const opts = unitAvailability(UNITS, [appt({ start_time: '09:30', end_time: '10:00' })], '2026-08-15', '10:00', '10:30')
    expect(opts.find((o) => o.id === 'u1')?.busy).toBe(false)
  })

  it('ignores another day and a cancelled booking', () => {
    const opts = unitAvailability(UNITS, [
      appt({ date: '2026-08-16' }),
      appt({ status: 'cancelled' }),
    ], '2026-08-15', '10:00', '10:30')
    expect(opts.every((o) => !o.busy)).toBe(true)
  })

  it('does not treat the appointment being edited as its own clash', () => {
    const opts = unitAvailability(UNITS, [appt({ id: 'a1' })], '2026-08-15', '10:00', '10:30', 'a1')
    expect(opts.find((o) => o.id === 'u1')?.busy).toBe(false)
  })

  it('says nothing rather than guessing when the window is unusable', () => {
    const opts = unitAvailability(UNITS, [appt()], '2026-08-15', '11:00', '10:00')
    expect(opts.every((o) => !o.busy)).toBe(true)
  })
})

describe('procedureDefaultPrice', () => {
  it('returns the price when one is set', () => {
    expect(procedureDefaultPrice({ id: 'p1', default_price: 2_500_000 }))
      .toEqual({ price: 2_500_000, missing: false })
  })

  it('flags a missing price instead of substituting zero', () => {
    // A zero that looks like a real price is how a treatment gets saved
    // free of charge.
    expect(procedureDefaultPrice({ id: 'p1', default_price: null }).missing).toBe(true)
    expect(procedureDefaultPrice({ id: 'p1', default_price: 0 }).missing).toBe(true)
    expect(procedureDefaultPrice(null).missing).toBe(true)
  })

  it('treats a negative price as missing', () => {
    expect(procedureDefaultPrice({ id: 'p1', default_price: -5 }).missing).toBe(true)
  })
})

describe('patientPickerHint', () => {
  it('surfaces a debt', () => {
    expect(patientPickerHint(1_500_000, [])).toMatchObject({ debt: 1_500_000, hasWarning: true })
  })

  it('does not call a credit balance a debt', () => {
    // A negative balance means the clinic owes the patient.
    expect(patientPickerHint(-200_000, [])).toMatchObject({ debt: 0, hasWarning: false })
  })

  it('surfaces clinical chips', () => {
    const h = patientPickerHint(0, ['پنی‌سیلین', 'وارفارین'])
    expect(h.clinical).toEqual(['پنی‌سیلین', 'وارفارین'])
    expect(h.hasWarning).toBe(true)
  })

  it('stays quiet for a clean patient', () => {
    expect(patientPickerHint(0, []).hasWarning).toBe(false)
  })
})
