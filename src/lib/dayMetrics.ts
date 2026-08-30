// dayMetrics.ts — how busy a clinic day actually is.
//
// The appointment page already counted rows (today / completed / in
// chair). Counting rows tells you the volume, not whether the day is
// full: eight appointments is a quiet day for four chairs and an
// overbooked one for a single doctor working half a shift.
//
// Competitor reference: COMP-133 (occupancy percent, "10 of 22 slots"),
// COMP-134 (average wait), COMP-135 (patients in the clinic now).
//
// All pure: no Date.now(), no DOM. The caller passes "now" so the same
// day can be evaluated at any moment in a test.

/** Statuses that mean the appointment still occupies clinic capacity.
 * A cancellation frees the slot; a no-show does not free it in advance,
 * but by the time it is marked the slot is already gone, so neither
 * counts toward what is booked. */
const OCCUPYING = new Set(['scheduled', 'confirmed', 'in_chair', 'completed'])

/** Waiting to be seen. `confirmed` means the patient rang ahead, not
 * that they are in the building, so it is not counted as present. */
const WAITING = new Set(['scheduled', 'confirmed'])

export interface DayAppointment {
  status: string
  start_time: string
  end_time?: string | null
  duration_minutes?: number | null
  doctor_id?: string | null
}

/** Minutes since midnight. Returns null for anything unparseable rather
 * than NaN, which would poison every average it touched. */
export function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

/** How long one appointment blocks a chair. Prefers the explicit
 * duration, falls back to end-start, then to a default — an appointment
 * with no usable times must not silently count as zero minutes and make
 * the day look emptier than it is. */
export function appointmentMinutes(a: DayAppointment, fallback = 30): number {
  if (a.duration_minutes && a.duration_minutes > 0) return a.duration_minutes
  const s = toMinutes(a.start_time)
  const e = toMinutes(a.end_time)
  if (s !== null && e !== null && e > s) return e - s
  return fallback
}

export interface Occupancy {
  bookedMinutes: number
  capacityMinutes: number
  /** 0–100, rounded. 0 when there is no capacity to fill. */
  percent: number
  bookedSlots: number
  totalSlots: number
}

/**
 * Occupancy for a day.
 *
 * Capacity is expressed in minutes rather than a slot count because
 * appointments are not all the same length: three implant cases can fill
 * a day that a slot count would call a third full.
 *
 * `percent` is deliberately allowed to exceed 100. Overbooking is a real
 * thing that happens, and clamping it to 100 would hide exactly the day
 * the manager needs to see.
 */
export function dayOccupancy(
  appointments: DayAppointment[],
  workingMinutes: number,
  slotMinutes = 30,
): Occupancy {
  const occupying = appointments.filter((a) => OCCUPYING.has(a.status))
  const bookedMinutes = occupying.reduce((sum, a) => sum + appointmentMinutes(a, slotMinutes), 0)
  const capacityMinutes = Math.max(0, workingMinutes)
  const totalSlots = slotMinutes > 0 ? Math.floor(capacityMinutes / slotMinutes) : 0
  return {
    bookedMinutes,
    capacityMinutes,
    percent: capacityMinutes > 0 ? Math.round((bookedMinutes / capacityMinutes) * 100) : 0,
    bookedSlots: slotMinutes > 0 ? Math.ceil(bookedMinutes / slotMinutes) : 0,
    totalSlots,
  }
}

/**
 * Average minutes patients have been waiting past their appointment time.
 *
 * Only counts people who are actually late being seen: an appointment at
 * 15:00 when it is 14:30 is not a wait, it is the future. Returns null
 * when nobody is overdue, so the card can say "—" rather than a
 * reassuring but meaningless zero.
 */
export function averageWaitMinutes(
  appointments: DayAppointment[],
  nowMinutes: number,
): number | null {
  const overdue: number[] = []
  for (const a of appointments) {
    if (!WAITING.has(a.status)) continue
    const start = toMinutes(a.start_time)
    if (start === null) continue
    const late = nowMinutes - start
    if (late > 0) overdue.push(late)
  }
  if (overdue.length === 0) return null
  return Math.round(overdue.reduce((s, n) => s + n, 0) / overdue.length)
}

/** Patients physically in the clinic right now: in the chair, plus those
 * whose slot has started and who have not been seen yet. */
export function patientsPresent(appointments: DayAppointment[], nowMinutes: number): number {
  return appointments.filter((a) => {
    if (a.status === 'in_chair') return true
    if (!WAITING.has(a.status)) return false
    const start = toMinutes(a.start_time)
    return start !== null && start <= nowMinutes
  }).length
}

/**
 * The next appointment still to come today, as minutes since midnight.
 * Null when the day is done — which the UI should render as an explicit
 * "nothing left today", not as an empty box.
 */
export function nextAppointmentMinutes(
  appointments: DayAppointment[],
  nowMinutes: number,
): number | null {
  const upcoming = appointments
    .filter((a) => OCCUPYING.has(a.status) && a.status !== 'completed')
    .map((a) => toMinutes(a.start_time))
    .filter((m): m is number => m !== null && m > nowMinutes)
  if (upcoming.length === 0) return null
  return Math.min(...upcoming)
}

/** Formats minutes-since-midnight back to HH:MM for display. */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export interface DayShift {
  start_time: string
  end_time: string
  break_start?: string | null
  break_end?: string | null
  is_active?: boolean
}

/**
 * Capacity in minutes for a day, summed across every doctor working it.
 *
 * The lunch break is subtracted: counting it as bookable makes every
 * clinic look permanently under-booked, and a metric that always reads
 * low is a metric nobody acts on. Inactive or malformed shifts
 * contribute nothing rather than a guess.
 */
export function shiftsCapacityMinutes(shifts: DayShift[]): number {
  let total = 0
  for (const s of shifts) {
    if (s.is_active === false) continue
    const start = toMinutes(s.start_time)
    const end = toMinutes(s.end_time)
    if (start === null || end === null || end <= start) continue
    let minutes = end - start
    const bs = toMinutes(s.break_start)
    const be = toMinutes(s.break_end)
    if (bs !== null && be !== null && be > bs) {
      // Only the part of the break that falls inside the shift counts.
      const overlap = Math.min(end, be) - Math.max(start, bs)
      if (overlap > 0) minutes -= overlap
    }
    total += Math.max(0, minutes)
  }
  return total
}

export interface DaySummary {
  occupancy: Occupancy
  averageWait: number | null
  present: number
  nextAt: string | null
  completed: number
  cancelled: number
  noShow: number
}

/** Everything the day header needs, in one pass. */
export function summariseDay(
  appointments: DayAppointment[],
  nowMinutes: number,
  workingMinutes: number,
  slotMinutes = 30,
): DaySummary {
  const next = nextAppointmentMinutes(appointments, nowMinutes)
  return {
    occupancy: dayOccupancy(appointments, workingMinutes, slotMinutes),
    averageWait: averageWaitMinutes(appointments, nowMinutes),
    present: patientsPresent(appointments, nowMinutes),
    nextAt: next === null ? null : formatMinutes(next),
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    noShow: appointments.filter((a) => a.status === 'no_show').length,
  }
}
