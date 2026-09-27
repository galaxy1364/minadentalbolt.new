// followUps.ts — the work that is stuck, and remembering that you dealt
// with it.
//
// smartReminders already finds seven patient-facing things: birthdays,
// debtors, lapsed patients, due instalments, no-shows, unresolved past
// appointments, unfinished treatments. Two gaps stopped it being usable
// as a real worklist.
//
// First, nothing clinical was in it. A crown sitting at the lab three
// weeks past its due date, an implant that has been "healing" since
// spring, a treatment phase a month past its own estimate — all of that
// is work the clinic is losing money and trust on, and none of it
// appeared anywhere.
//
// Second, and worse: there was no way to say "I dealt with this". You
// could send an SMS, but the item came back the next morning looking
// exactly the same. A list that cannot be cleared stops being read
// within a week, which makes it worse than no list.

import { phaseSchedule } from './phases'
import { toothLabel } from './toothLabel'
import type { PhaseLike } from './phases'
import { stageIndex } from './implants'

export type ClinicalFollowUpKind = 'lab_overdue' | 'lab_awaiting_delivery' | 'implant_stalled' | 'phase_overdue'

export interface ClinicalFollowUp {
  kind: ClinicalFollowUpKind
  /** Stable across reloads so a dismissal can be remembered. */
  key: string
  patientId: string | null
  title: string
  detail: string
  /** Days late. Bigger is more urgent; drives the ordering. */
  daysLate: number
}

/** How long a stage may sit before it is treated as stalled. Healing
 * genuinely takes months, which is why it gets a far longer rope than
 * the others — flagging every healing implant would bury the ones that
 * are actually forgotten. */
const STAGE_PATIENCE_DAYS: Record<string, number> = {
  planned: 60,
  surgery_done: 30,
  healing: 240,
  impression: 21,
  crown_delivery: 14,
}

function daysSince(iso: string | null | undefined, todayISO: string): number | null {
  if (!iso) return null
  const a = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${todayISO.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}

export interface LabOrderLike {
  id: string
  patient_id?: string | null
  /** The real column is `deadline`, not `due_date`. Named to match the
   * schema on purpose: a field name invented here would have made this
   * whole check silently return nothing, which is the worst kind of
   * failure for a follow-up list — it looks like there is no work. */
  deadline?: string | null
  status: string
  work_done?: boolean | null
  delivered?: boolean | null
  description?: string | null
  /** MOD-FEAT-035: تاریخ رسیدن کار به مطب. */
  received_at?: string | null
  /** نوبتی که برای تحویل به بیمار گذاشته شده. */
  delivery_appointment_id?: string | null
}

/**
 * MOD-FEAT-035 | کاری که رسیده و بیمار خبر ندارد
 *
 * گزارش مهدی: «وقتی که تحویل گرفته شد باید برنامه اتوماتیک آلارم بده که
 * باید برای این بیمار وقت گذاشته بشه برای نوبت‌دهی برای تحویل کار.»
 *
 * This is the gap that keeps a finished crown in a drawer. The order is
 * no longer late — the lab did its job — so `findOverdueLabOrders` goes
 * quiet exactly when someone needs to act. Nothing else was watching.
 *
 * Derived rather than stored: the moment an appointment is booked the
 * item disappears on its own. A written reminder would have to be
 * deleted by hand, and the one that isn't becomes noise that trains
 * people to ignore the list.
 *
 * `daysLate` counts from arrival, so a crown that landed three weeks ago
 * outranks one that came in yesterday.
 */
export function findLabAwaitingDeliveryAppointment(
  orders: LabOrderLike[],
  todayISO: string,
): ClinicalFollowUp[] {
  const out: ClinicalFollowUp[] = []
  for (const o of orders) {
    if (o.delivered || o.status === 'cancelled' || o.status === 'delivered') continue
    // Only work that is physically in the clinic. Anything still at the
    // lab is the other check's business.
    if (!o.received_at) continue
    if (o.delivery_appointment_id) continue

    const waiting = daysSince(o.received_at, todayISO) ?? 0
    out.push({
      kind: 'lab_awaiting_delivery',
      key: `lab-delivery:${o.id}`,
      patientId: o.patient_id ?? null,
      title: o.description?.trim() || 'کار لابراتوار',
      detail: waiting > 0
        ? `${waiting} روز است در مطب مانده — نوبت تحویل گذاشته نشده`
        : 'رسید به مطب — نوبت تحویل گذاشته نشده',
      daysLate: waiting,
    })
  }
  return out
}

export function findOverdueLabOrders(
  orders: LabOrderLike[],
  todayISO: string,
): ClinicalFollowUp[] {
  const out: ClinicalFollowUp[] = []
  for (const o of orders) {
    if (o.delivered) continue
    if (o.status === 'cancelled' || o.status === 'delivered') continue
    const late = daysSince(o.deadline, todayISO)
    if (late === null || late <= 0) continue
    out.push({
      kind: 'lab_overdue',
      key: `lab:${o.id}`,
      patientId: o.patient_id ?? null,
      title: o.description?.trim() || 'سفارش لابراتوار',
      detail: `${late} روز از موعد تحویل گذشته`,
      daysLate: late,
    })
  }
  return out
}

export interface ImplantCaseLike {
  id: string
  patient_id?: string | null
  stage?: string | null
  is_active?: boolean
  tooth_number?: string | null
  surgery_date?: string | null
  updated_at?: string | null
}

export function findStalledImplants(
  cases: ImplantCaseLike[],
  todayISO: string,
): ClinicalFollowUp[] {
  const out: ClinicalFollowUp[] = []
  for (const c of cases) {
    if (c.is_active === false) continue
    const stage = c.stage || 'planned'
    if (stage === 'completed' || stage === 'failed') continue

    const patience = STAGE_PATIENCE_DAYS[stage]
    if (patience === undefined) continue

    // updated_at is when the stage last moved; surgery_date is the
    // fallback for a case nobody has touched since the operation.
    const since = daysSince(c.updated_at || c.surgery_date, todayISO)
    if (since === null || since <= patience) continue

    out.push({
      kind: 'implant_stalled',
      key: `implant:${c.id}`,
      patientId: c.patient_id ?? null,
      title: `ایمپلنت دندان ${toothLabel(c.tooth_number) || '—'}`,
      detail: `${since} روز در همین مرحله مانده`,
      daysLate: since - patience,
    })
  }
  // Later stages first when equally late: a case waiting on crown
  // delivery is closer to money than one still at planning.
  return out.sort((a, b) => b.daysLate - a.daysLate || stageIndex(b.key) - stageIndex(a.key))
}

export interface PhaseWithPatient extends PhaseLike {
  id: string
  patient_id?: string | null
}

export function findOverduePhases(
  phases: PhaseWithPatient[],
  todayISO: string,
): ClinicalFollowUp[] {
  const out: ClinicalFollowUp[] = []
  for (const p of phases) {
    const sched = phaseSchedule(p, todayISO)
    if (sched.timing !== 'overdue') continue
    const late = Math.abs(sched.daysRemaining ?? 0)
    out.push({
      kind: 'phase_overdue',
      key: `phase:${p.id}`,
      patientId: p.patient_id ?? null,
      title: p.title?.trim() || `مرحله ${p.phase_number}`,
      detail: `${late} روز از برآورد گذشته`,
      daysLate: late,
    })
  }
  return out
}

// ── Dismissal ────────────────────────────────────────────────────────

export interface Dismissal {
  /** Matches ClinicalFollowUp.key, or a smartReminders key. */
  key: string
  /** ISO date this item should reappear on. */
  until: string
}

/**
 * Hides an item until a date, rather than for ever.
 *
 * Permanent dismissal is the wrong default for clinical work: a crown
 * still has not arrived after you tick "called the lab", and the whole
 * point is that it comes back if nothing changed. A snooze that expires
 * keeps the list honest.
 */
export function snoozeUntil(todayISO: string, days: number): string {
  const base = Date.parse(`${todayISO.slice(0, 10)}T00:00:00Z`)
  return new Date(base + Math.max(1, days) * 86_400_000).toISOString().slice(0, 10)
}

/** Drops items snoozed past today, and drops expired snoozes so the
 * stored list cannot grow without limit. */
export function applyDismissals<T extends { key: string }>(
  items: T[],
  dismissals: Dismissal[],
  todayISO: string,
): { visible: T[]; hiddenCount: number; liveDismissals: Dismissal[] } {
  const live = dismissals.filter((d) => d.until > todayISO)
  const hidden = new Set(live.map((d) => d.key))
  const visible = items.filter((i) => !hidden.has(i.key))
  return {
    visible,
    hiddenCount: items.length - visible.length,
    liveDismissals: live,
  }
}

/** Everything clinical, most overdue first. */
export function buildClinicalFollowUps(
  orders: LabOrderLike[],
  implants: ImplantCaseLike[],
  phases: PhaseWithPatient[],
  todayISO: string,
): ClinicalFollowUp[] {
  return [
    ...findOverdueLabOrders(orders, todayISO),
    // MOD-FEAT-035: work that has arrived and is waiting on an
    // appointment. The overdue check goes quiet the moment the lab
    // delivers, which is exactly when the clinic has to act.
    ...findLabAwaitingDeliveryAppointment(orders, todayISO),
    ...findStalledImplants(implants, todayISO),
    ...findOverduePhases(phases, todayISO),
  ].sort((a, b) => b.daysLate - a.daysLate)
}
