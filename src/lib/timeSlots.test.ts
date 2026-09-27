import { describe, it, expect } from 'vitest'
import {
  addMinutes, rangesOverlap, generateSlots, slotAvailability,
  defaultEndTime, firstBookableSlot,
} from './timeSlots'
import type { SlotShift, BookedRange } from './timeSlots'

function shift(over: Partial<SlotShift> = {}): SlotShift {
  return { start_time: '09:00', end_time: '17:00', ...over }
}
function booked(over: Partial<BookedRange> = {}): BookedRange {
  return { start_time: '10:00', end_time: '10:30', status: 'scheduled', ...over }
}

describe('addMinutes', () => {
  it('adds within the day', () => {
    expect(addMinutes('09:00', 30)).toBe('09:30')
    expect(addMinutes('09:45', 30)).toBe('10:15')
  })

  it('clamps instead of rolling past midnight', () => {
    // The wizard built its end time as hour + 1, so 23:30 produced
    // "24:00" — not a real time, and it silently passed the "end after
    // start" check because "24:00" sorts after everything.
    expect(addMinutes('23:30', 60)).toBe('23:59')
    expect(addMinutes('23:00', 60)).toBe('23:59')
  })

  it('leaves an unparseable time alone rather than inventing one', () => {
    expect(addMinutes('nonsense', 30)).toBe('nonsense')
  })
})

describe('rangesOverlap', () => {
  it('treats back-to-back slots as not clashing', () => {
    // 09:30-10:00 and 10:00-10:30 are consecutive, not a conflict.
    expect(rangesOverlap(570, 600, 600, 630)).toBe(false)
  })

  it('detects a real overlap', () => {
    expect(rangesOverlap(570, 630, 600, 660)).toBe(true)
  })

  it('detects one range inside another', () => {
    expect(rangesOverlap(540, 720, 600, 630)).toBe(true)
  })
})

describe('generateSlots', () => {
  it('covers the shift in steps', () => {
    const slots = generateSlots([shift({ start_time: '09:00', end_time: '11:00' })], 30, 30)
    expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30'])
  })

  it('does not offer a slot that runs past the end of the shift', () => {
    // Offering 17:45 for a 30-minute appointment in a shift ending 18:00
    // invites a booking that runs past closing.
    const slots = generateSlots([shift({ start_time: '17:00', end_time: '18:00' })], 45, 15)
    expect(slots).toEqual(['17:00', '17:15'])
  })

  it('does not offer a slot that runs into the break', () => {
    const slots = generateSlots(
      [shift({ start_time: '12:00', end_time: '15:00', break_start: '13:00', break_end: '14:00' })],
      60, 30,
    )
    expect(slots).toEqual(['12:00', '14:00'])
  })

  it('merges two doctors working the same day without duplicates', () => {
    const slots = generateSlots(
      [shift({ start_time: '09:00', end_time: '10:00' }), shift({ start_time: '09:00', end_time: '10:00' })],
      30, 30,
    )
    expect(slots).toEqual(['09:00', '09:30'])
  })

  it('ignores inactive and malformed shifts', () => {
    expect(generateSlots([shift({ is_active: false })], 30)).toEqual([])
    expect(generateSlots([shift({ start_time: '17:00', end_time: '09:00' })], 30)).toEqual([])
  })

  it('returns nothing when no shift is defined', () => {
    // The caller then says so, instead of showing a fake list.
    expect(generateSlots([], 30)).toEqual([])
  })
})

describe('slotAvailability', () => {
  const SLOTS = ['09:00', '09:30', '10:00', '10:30']

  it('marks a slot taken when an appointment overlaps it', () => {
    const states = slotAvailability(SLOTS, [booked({ start_time: '10:00', end_time: '10:30' })], 30)
    expect(states.find((s) => s.time === '10:00')?.taken).toBe(true)
    expect(states.find((s) => s.time === '09:30')?.taken).toBe(false)
  })

  it('frees the slot again when the appointment is cancelled', () => {
    const states = slotAvailability(SLOTS, [booked({ start_time: '10:00', status: 'cancelled' })], 30)
    expect(states.find((s) => s.time === '10:00')?.taken).toBe(false)
  })

  it('blocks every slot a long appointment covers', () => {
    const states = slotAvailability(SLOTS, [booked({ start_time: '09:00', end_time: '10:30' })], 30)
    expect(states.filter((s) => s.taken).map((s) => s.time)).toEqual(['09:00', '09:30', '10:00'])
  })

  it('accounts for the length of the appointment being booked', () => {
    // A 90-minute appointment at 09:00 clashes with something at 10:00
    // even though the 09:00 slot itself looks free.
    const states = slotAvailability(SLOTS, [booked({ start_time: '10:00', end_time: '10:30' })], 90)
    expect(states.find((s) => s.time === '09:00')?.taken).toBe(true)
  })

  it('greys out past slots only when booking today', () => {
    const today = slotAvailability(SLOTS, [], 30, { isToday: true, nowMinutes: 10 * 60 })
    expect(today.find((s) => s.time === '09:00')?.past).toBe(true)
    expect(today.find((s) => s.time === '10:30')?.past).toBe(false)

    // Greying out the morning of a date next week would be nonsense.
    const later = slotAvailability(SLOTS, [], 30, { isToday: false, nowMinutes: 10 * 60 })
    expect(later.every((s) => !s.past)).toBe(true)
  })

  it('assumes the booking length when an appointment has no end time', () => {
    const states = slotAvailability(SLOTS, [booked({ start_time: '09:30', end_time: null })], 30)
    expect(states.find((s) => s.time === '09:30')?.taken).toBe(true)
  })
})

describe('defaultEndTime', () => {
  it('uses the doctor’s declared slot length', () => {
    // So the form agrees with the schedule the clinic set up rather than
    // always assuming an hour.
    expect(defaultEndTime('09:00', [shift({ slot_duration: 45 })])).toBe('09:45')
  })

  it('falls back when no slot length is declared', () => {
    expect(defaultEndTime('09:00', [shift()], 20)).toBe('09:20')
  })

  it('still clamps at the end of the day', () => {
    expect(defaultEndTime('23:50', [shift({ slot_duration: 60 })])).toBe('23:59')
  })
})

describe('firstBookableSlot', () => {
  const states = [
    { time: '09:00', taken: true, past: false },
    { time: '09:30', taken: false, past: true },
    { time: '10:00', taken: false, past: false },
    { time: '11:00', taken: false, past: false },
  ]

  it('skips taken and past slots', () => {
    expect(firstBookableSlot(states)).toBe('10:00')
  })

  it('honours a preferred time when something is free after it', () => {
    expect(firstBookableSlot(states, '10:30')).toBe('11:00')
  })

  it('falls back to the earliest free slot when the preference is too late', () => {
    expect(firstBookableSlot(states, '23:00')).toBe('10:00')
  })

  it('returns null when the day is full', () => {
    // The caller says the day is full instead of preselecting a slot
    // that cannot be booked.
    expect(firstBookableSlot([{ time: '09:00', taken: true, past: false }])).toBeNull()
  })
})
