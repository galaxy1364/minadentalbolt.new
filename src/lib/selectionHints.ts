// selectionHints.ts — what a picker should have told you before you
// picked.
//
// Four controls had the same shape of fault: they listed everything as
// equally valid and let the consequence surface later, or not at all.
// A doctor who does not work that day, a unit already occupied, a
// procedure with no price, a patient who owes money or is on an
// anticoagulant — all of it was knowable at the moment of choosing and
// none of it was shown.
//
// Pure, because the rules are worth testing and none of them need a DOM.

import { toMinutes } from './dayMetrics'
import { rangesOverlap } from './timeSlots'

/** Statuses that still hold a room or a chair. */
const HOLDS = new Set(['scheduled', 'confirmed', 'in_chair', 'completed'])

// ── Doctors ──────────────────────────────────────────────────────────

export interface DoctorLike {
  id: string
  name?: string | null
  is_active?: boolean | null
}

export interface ScheduleLike {
  doctor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active?: boolean | null
}

export interface DoctorOption {
  id: string
  /** False when this doctor has no shift on the chosen weekday. */
  worksToday: boolean
  /** Their hours that day, for the hint text. Null when they do not work. */
  hours: string | null
}

/**
 * Marks each doctor with whether they work the chosen day.
 *
 * Deliberately marks rather than filters. Clinics do book a doctor
 * outside their declared hours — an emergency, a favour, a shift nobody
 * updated in settings — and a picker that silently hides the person you
 * are looking for is worse than one that warns. The existing conflict
 * step already treats this as a soft warning; this just moves the
 * information to where the choice is made.
 *
 * A doctor with no schedule rows at all is treated as available: the
 * clinic has not filled that in, and greying out every doctor because
 * settings are empty would make the app unusable.
 */
export function doctorsForDay(
  doctors: DoctorLike[],
  schedules: ScheduleLike[],
  weekday: number,
): DoctorOption[] {
  return doctors.map((d) => {
    const mine = schedules.filter((s) => s.doctor_id === d.id && s.is_active !== false)
    if (mine.length === 0) return { id: d.id, worksToday: true, hours: null }

    const today = mine.filter((s) => s.day_of_week === weekday)
    if (today.length === 0) return { id: d.id, worksToday: false, hours: null }

    const from = today.reduce((a, s) => (s.start_time < a ? s.start_time : a), today[0].start_time)
    const to = today.reduce((a, s) => (s.end_time > a ? s.end_time : a), today[0].end_time)
    return { id: d.id, worksToday: true, hours: `${from} تا ${to}` }
  })
}

// ── Units (chairs / rooms) ───────────────────────────────────────────

export interface UnitBooking {
  unit_id?: string | null
  date: string
  start_time: string
  end_time?: string | null
  status: string
  id?: string
}

export interface UnitOption {
  id: string
  busy: boolean
  /** The clashing appointment's time, for the hint. */
  busyAt: string | null
}

/**
 * Marks each unit busy for the requested window.
 *
 * A unit is a physical chair: two doctors cannot use one at once, and
 * this was the gap left open in MOD-UI-005 — the free-times strip only
 * looked at the chosen doctor, so two doctors could each be shown a slot
 * as free while sharing the only chair.
 */
export function unitAvailability(
  units: { id: string }[],
  appointments: UnitBooking[],
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string,
): UnitOption[] {
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)

  return units.map((u) => {
    if (start === null || end === null || end <= start) {
      return { id: u.id, busy: false, busyAt: null }
    }
    const clash = appointments.find((a) => {
      if (a.unit_id !== u.id) return false
      if (a.date !== date) return false
      if (!HOLDS.has(a.status)) return false
      if (excludeAppointmentId && a.id === excludeAppointmentId) return false
      const s = toMinutes(a.start_time)
      if (s === null) return false
      const e = toMinutes(a.end_time) ?? s + (end - start)
      return rangesOverlap(start, end, s, e)
    })
    return {
      id: u.id,
      busy: !!clash,
      busyAt: clash ? `${clash.start_time}${clash.end_time ? ` تا ${clash.end_time}` : ''}` : null,
    }
  })
}

// ── Procedures ───────────────────────────────────────────────────────

export interface ProcedureLike {
  id: string
  name?: string | null
  default_price?: number | null
}

export interface ProcedurePrice {
  price: number
  /** True when the procedure carries no price and the field will open
   * empty, which is the case START-HERE records as slowing bulk entry. */
  missing: boolean
}

/**
 * The price to prefill when a procedure is chosen.
 *
 * Returns `missing` rather than quietly substituting zero. A zero that
 * looks like a real price is how a treatment gets saved free of charge;
 * an empty field the operator must fill is annoying, and being annoyed
 * is the correct outcome when the clinic has not priced the procedure.
 */
export function procedureDefaultPrice(p: ProcedureLike | null | undefined): ProcedurePrice {
  const price = p?.default_price ?? null
  if (price == null || price <= 0) return { price: 0, missing: true }
  return { price, missing: false }
}

// ── Patients ─────────────────────────────────────────────────────────

export interface PatientPickerHint {
  /** Positive balance owed. */
  debt: number
  /** Short clinical chips: allergies, conditions, medications. */
  clinical: string[]
  hasWarning: boolean
}

/**
 * What must be visible next to a patient's name in a picker.
 *
 * Both facts already existed on the record and neither reached the list.
 * The debtor one costs the clinic money; the clinical one is the reason
 * the alert cards in MOD-FEAT-011 exist, and a receptionist booking a
 * patient should see it before, not after.
 */
export function patientPickerHint(
  balance: number,
  clinicalChips: string[],
): PatientPickerHint {
  const debt = balance > 0 ? balance : 0
  return {
    debt,
    clinical: clinicalChips,
    hasWarning: debt > 0 || clinicalChips.length > 0,
  }
}
