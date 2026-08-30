// timeSlots.ts — which times can actually be booked.
//
// The wizard offered a hard-coded strip of 26 times under the heading
// "ساعت‌های خالی" (free times). It was not free times. It was the same
// list for every doctor, every day, ignoring the working hours and
// ignoring what was already booked — so the single most-tapped control
// in the app was telling the user something untrue, and the way you
// found out was a conflict warning after you had already chosen.
//
// This computes the real thing: the doctor's hours for that weekday,
// cut into slots, each marked with whether it is taken.

import { toMinutes, formatMinutes } from './dayMetrics'

export interface SlotShift {
  start_time: string
  end_time: string
  break_start?: string | null
  break_end?: string | null
  slot_duration?: number | null
  is_active?: boolean
}

export interface BookedRange {
  start_time: string
  end_time?: string | null
  status: string
}

/** Statuses that still hold a slot. A cancelled appointment frees it. */
const HOLDS_SLOT = new Set(['scheduled', 'confirmed', 'in_chair', 'completed'])

/**
 * Adds minutes to a HH:MM time.
 *
 * Clamps at 23:59 instead of rolling into the next day. The old wizard
 * built its end time as `hour + 1`, so picking 23:30 produced "24:00" —
 * not a real time, and it silently failed the "end after start"
 * comparison because "24:00" sorts after everything.
 */
export function addMinutes(hhmm: string, minutes: number): string {
  const base = toMinutes(hhmm)
  if (base === null) return hhmm
  return formatMinutes(Math.min(base + minutes, 23 * 60 + 59))
}

/** True when two half-open ranges overlap. Touching ends do not: a slot
 * ending 10:00 and one starting 10:00 are back to back, not a clash. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Every slot start inside a shift, skipping the break.
 *
 * A slot is only offered when the WHOLE appointment fits before the
 * break or before the end of the shift — offering 17:45 for a 30-minute
 * appointment in a shift ending at 18:00 invites a booking that runs
 * past closing.
 */
export function generateSlots(
  shifts: SlotShift[],
  durationMinutes: number,
  stepMinutes = 30,
): string[] {
  const out = new Set<number>()
  const duration = Math.max(1, durationMinutes)
  const step = Math.max(5, stepMinutes)

  for (const s of shifts) {
    if (s.is_active === false) continue
    const start = toMinutes(s.start_time)
    const end = toMinutes(s.end_time)
    if (start === null || end === null || end <= start) continue

    const bs = toMinutes(s.break_start)
    const be = toMinutes(s.break_end)
    const hasBreak = bs !== null && be !== null && be > bs

    for (let t = start; t + duration <= end; t += step) {
      // The appointment must not run into the break either.
      if (hasBreak && rangesOverlap(t, t + duration, bs as number, be as number)) continue
      out.add(t)
    }
  }

  return [...out].sort((a, b) => a - b).map(formatMinutes)
}

export interface SlotState {
  time: string
  taken: boolean
  /** Set when the slot is in the past for the day being booked. */
  past: boolean
}

/**
 * Marks each slot as free, taken or already gone.
 *
 * `nowMinutes` is only applied when the date being booked is today —
 * greying out the morning on a date next week would be nonsense.
 */
export function slotAvailability(
  slots: string[],
  booked: BookedRange[],
  durationMinutes: number,
  options: { isToday?: boolean; nowMinutes?: number } = {},
): SlotState[] {
  const duration = Math.max(1, durationMinutes)
  const busy = booked
    .filter((b) => HOLDS_SLOT.has(b.status))
    .map((b) => {
      const s = toMinutes(b.start_time)
      if (s === null) return null
      const e = toMinutes(b.end_time) ?? s + duration
      return [s, Math.max(e, s + 1)] as const
    })
    .filter((r): r is readonly [number, number] => r !== null)

  const { isToday = false, nowMinutes = 0 } = options

  return slots.map((time) => {
    const start = toMinutes(time) as number
    const end = start + duration
    return {
      time,
      taken: busy.some(([bs, be]) => rangesOverlap(start, end, bs, be)),
      past: isToday && start < nowMinutes,
    }
  })
}

/**
 * A sensible default end time for a chosen start.
 *
 * Uses the doctor's declared slot length when there is one, so the form
 * agrees with the schedule the clinic actually set up instead of always
 * assuming an hour.
 */
export function defaultEndTime(start: string, shifts: SlotShift[], fallbackMinutes = 30): string {
  const declared = shifts.find((s) => s.slot_duration && s.slot_duration > 0)?.slot_duration
  return addMinutes(start, declared || fallbackMinutes)
}

/**
 * The first free slot at or after a preferred time.
 *
 * Used to move the strip to something bookable rather than opening on
 * 09:00 for a clinic that starts at 16:00, which is how a user ends up
 * choosing a time the doctor does not work.
 */
export function firstBookableSlot(states: SlotState[], preferred?: string): string | null {
  const usable = states.filter((s) => !s.taken && !s.past)
  if (usable.length === 0) return null
  if (preferred) {
    const p = toMinutes(preferred)
    if (p !== null) {
      const after = usable.find((s) => (toMinutes(s.time) as number) >= p)
      if (after) return after.time
    }
  }
  return usable[0].time
}
