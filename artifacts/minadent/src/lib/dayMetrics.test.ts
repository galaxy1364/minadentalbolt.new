import { describe, it, expect } from 'vitest'
import {
  toMinutes, appointmentMinutes, dayOccupancy, averageWaitMinutes,
  patientsPresent, nextAppointmentMinutes, formatMinutes, summariseDay,
  shiftsCapacityMinutes,
} from './dayMetrics'
import type { DayAppointment } from './dayMetrics'

function appt(over: Partial<DayAppointment> = {}): DayAppointment {
  return { status: 'scheduled', start_time: '09:00', end_time: '09:30', ...over }
}

const NINE = 9 * 60
const TEN = 10 * 60
const NOON = 12 * 60
/** A single 09:00–17:00 shift. */
const SHIFT = 8 * 60

describe('toMinutes', () => {
  it('parses HH:MM and HH:MM:SS alike', () => {
    expect(toMinutes('09:30')).toBe(570)
    expect(toMinutes('09:30:00')).toBe(570)
    expect(toMinutes('9:05')).toBe(545)
  })

  it('returns null rather than NaN for junk', () => {
    // NaN would spread silently through every average it touched.
    for (const v of [null, undefined, '', 'abc', '99:99', '25:00', '10:75']) {
      expect(toMinutes(v)).toBeNull()
    }
  })
})

describe('appointmentMinutes', () => {
  it('prefers the explicit duration', () => {
    expect(appointmentMinutes(appt({ duration_minutes: 45 }))).toBe(45)
  })

  it('falls back to end minus start', () => {
    expect(appointmentMinutes(appt({ start_time: '09:00', end_time: '10:15', duration_minutes: null }))).toBe(75)
  })

  it('uses the fallback when the times are unusable', () => {
    // Counting a broken row as zero would make the day look emptier
    // than it is, which is the opposite of useful.
    expect(appointmentMinutes(appt({ start_time: 'x', end_time: null }), 30)).toBe(30)
    expect(appointmentMinutes(appt({ start_time: '10:00', end_time: '09:00', duration_minutes: null }), 20)).toBe(20)
  })
})

describe('dayOccupancy', () => {
  it('measures minutes booked against minutes available', () => {
    const day = [
      appt({ duration_minutes: 60 }),
      appt({ duration_minutes: 60, status: 'completed' }),
    ]
    const occ = dayOccupancy(day, SHIFT)
    expect(occ.bookedMinutes).toBe(120)
    expect(occ.capacityMinutes).toBe(SHIFT)
    expect(occ.percent).toBe(25)
    expect(occ.totalSlots).toBe(16)
  })

  it('frees the slot for cancellations and no-shows', () => {
    const day = [
      appt({ duration_minutes: 60 }),
      appt({ duration_minutes: 60, status: 'cancelled' }),
      appt({ duration_minutes: 60, status: 'no_show' }),
    ]
    expect(dayOccupancy(day, SHIFT).bookedMinutes).toBe(60)
  })

  it('lets the percentage exceed 100 when the day is overbooked', () => {
    // Clamping would hide exactly the day a manager needs to see.
    const day = Array.from({ length: 10 }, () => appt({ duration_minutes: 60 }))
    expect(dayOccupancy(day, SHIFT).percent).toBe(125)
  })

  it('reports zero rather than dividing by zero on a closed day', () => {
    expect(dayOccupancy([appt()], 0).percent).toBe(0)
    expect(dayOccupancy([], SHIFT).percent).toBe(0)
  })

  it('counts long appointments as the capacity they really take', () => {
    // Three implant cases fill a day that a slot count would call a
    // third full. This is the reason capacity is in minutes.
    const implants = Array.from({ length: 3 }, () => appt({ duration_minutes: 150 }))
    expect(dayOccupancy(implants, SHIFT).percent).toBe(94)
  })
})

describe('averageWaitMinutes', () => {
  it('averages only the patients who are actually overdue', () => {
    const day = [
      appt({ start_time: '09:00' }),               // 60 late at 10:00
      appt({ start_time: '09:30' }),               // 30 late
      appt({ start_time: '15:00' }),               // still the future
    ]
    expect(averageWaitMinutes(day, TEN)).toBe(45)
  })

  it('returns null when nobody is waiting', () => {
    // So the card can say "—" rather than a reassuring, meaningless 0.
    expect(averageWaitMinutes([appt({ start_time: '15:00' })], TEN)).toBeNull()
    expect(averageWaitMinutes([], TEN)).toBeNull()
  })

  it('ignores people already seen or gone', () => {
    const day = [
      appt({ start_time: '08:00', status: 'completed' }),
      appt({ start_time: '08:00', status: 'cancelled' }),
      appt({ start_time: '08:00', status: 'no_show' }),
      appt({ start_time: '08:00', status: 'in_chair' }),
    ]
    expect(averageWaitMinutes(day, TEN)).toBeNull()
  })
})

describe('patientsPresent', () => {
  it('counts the chair plus anyone whose slot has started', () => {
    const day = [
      appt({ status: 'in_chair', start_time: '14:00' }),
      appt({ start_time: '09:00' }),
      appt({ start_time: '11:00' }),
    ]
    expect(patientsPresent(day, TEN)).toBe(2)
  })

  it('does not count a confirmed patient who has not arrived yet', () => {
    // "Confirmed" means they rang ahead, not that they are in the room.
    expect(patientsPresent([appt({ status: 'confirmed', start_time: '16:00' })], TEN)).toBe(0)
  })
})

describe('nextAppointmentMinutes', () => {
  it('finds the earliest slot still ahead', () => {
    const day = [appt({ start_time: '16:00' }), appt({ start_time: '11:00' }), appt({ start_time: '08:00' })]
    expect(nextAppointmentMinutes(day, TEN)).toBe(11 * 60)
  })

  it('returns null when the day is done', () => {
    expect(nextAppointmentMinutes([appt({ start_time: '08:00' })], TEN)).toBeNull()
  })

  it('skips finished and cancelled slots', () => {
    const day = [
      appt({ start_time: '11:00', status: 'completed' }),
      appt({ start_time: '12:00', status: 'cancelled' }),
      appt({ start_time: '13:00' }),
    ]
    expect(nextAppointmentMinutes(day, TEN)).toBe(13 * 60)
  })
})

describe('formatMinutes', () => {
  it('pads to HH:MM', () => {
    expect(formatMinutes(NINE)).toBe('09:00')
    expect(formatMinutes(NINE + 5)).toBe('09:05')
    expect(formatMinutes(NOON)).toBe('12:00')
  })
})

describe('summariseDay', () => {
  it('produces every card the header needs in one pass', () => {
    const day = [
      appt({ start_time: '09:00', duration_minutes: 60, status: 'completed' }),
      appt({ start_time: '09:30', duration_minutes: 30 }),
      appt({ start_time: '14:00', duration_minutes: 30 }),
      appt({ start_time: '15:00', duration_minutes: 30, status: 'cancelled' }),
    ]
    const s = summariseDay(day, TEN, SHIFT)
    expect(s.occupancy.bookedMinutes).toBe(120)
    expect(s.averageWait).toBe(30)
    expect(s.present).toBe(1)
    expect(s.nextAt).toBe('14:00')
    expect(s.completed).toBe(1)
    expect(s.cancelled).toBe(1)
  })

  it('survives an empty day without throwing', () => {
    const s = summariseDay([], TEN, SHIFT)
    expect(s.occupancy.percent).toBe(0)
    expect(s.averageWait).toBeNull()
    expect(s.nextAt).toBeNull()
    expect(s.present).toBe(0)
  })
})

describe('shiftsCapacityMinutes', () => {
  it('sums every doctor working the day', () => {
    expect(shiftsCapacityMinutes([
      { start_time: '09:00', end_time: '17:00' },
      { start_time: '09:00', end_time: '13:00' },
    ])).toBe(8 * 60 + 4 * 60)
  })

  it('subtracts the lunch break', () => {
    // Counting the break as bookable makes every clinic look
    // permanently under-booked, and nobody acts on a metric that
    // always reads low.
    expect(shiftsCapacityMinutes([
      { start_time: '09:00', end_time: '17:00', break_start: '13:00', break_end: '14:00' },
    ])).toBe(7 * 60)
  })

  it('only subtracts the part of the break inside the shift', () => {
    expect(shiftsCapacityMinutes([
      { start_time: '09:00', end_time: '13:30', break_start: '13:00', break_end: '14:00' },
    ])).toBe(4 * 60)
  })

  it('ignores inactive and malformed shifts rather than guessing', () => {
    expect(shiftsCapacityMinutes([
      { start_time: '09:00', end_time: '17:00', is_active: false },
      { start_time: '17:00', end_time: '09:00' },
      { start_time: 'x', end_time: 'y' },
    ])).toBe(0)
  })

  it('returns zero for a day nobody works', () => {
    expect(shiftsCapacityMinutes([])).toBe(0)
  })
})
