import { toJalaliStringPretty } from './persianDate'
import { deadlineState, type DeadlineState } from './labClinicMilestones'

/**
 * MOD-FEAT-039 | زنجیره‌ی ایمپلنت از دید مطب
 *
 * گزارش مهدی:
 *
 *   «همین کاری که برای لابراتوار انجام دادی برای تمام مراحل ایمپلنت: از
 *    نوبت‌دهی و جراحی و تایم بستن هیلینگ و تایم نوبت برای قالب‌گیری و
 *    یادآوری گرفتن عکس OPG و بعد ارسال به لابراتوار و بعد پیگیری و تحویل
 *    از لابراتوار و تحویل به بیمار.»
 *
 * Same shape as `labClinicMilestones`: a short chain where every link is
 * something the clinic does or waits for, derived from columns rather
 * than kept in a separate `stage` string that can drift from them.
 *
 * The lab portion — sent, arrived, booked, delivered — is not repeated
 * here. It lives on the linked lab order and the lab chain already
 * tracks it. One truth about where the crown is.
 *
 * Healing is the link that makes this chain different from the lab's:
 * it is a *wait*, not an act. Nothing can be done until it ends, and
 * the end date is the one patients most often forget. It is computed
 * from the surgery date so it cannot be entered wrong.
 */

export type ImplantMilestone =
  | 'surgery_booked' | 'surgery' | 'healing' | 'opg' | 'impression' | 'lab' | 'delivered'

export interface ImplantCaseLike {
  surgery_date?: string | null
  healing_months?: number | null
  healing_abutment_date?: string | null
  opg_reminder_date?: string | null
  impression_date?: string | null
  crown_delivery_date?: string | null
  lab_order_id?: string | null
  success_status?: string | null
  /** پیوند به نوبت جراحی، اگر ثبت شده. */
  surgery_appointment_id?: string | null
}

export interface ImplantMilestoneState {
  key: ImplantMilestone
  label: string
  done: boolean
  date: string | null
}

const LABELS: Record<ImplantMilestone, string> = {
  surgery_booked: 'نوبت جراحی',
  surgery: 'جراحی',
  healing: 'دوره‌ی هیلینگ',
  opg: 'عکس OPG',
  impression: 'قالب‌گیری',
  lab: 'ارسال به لابراتوار',
  delivered: 'تحویل روکش',
}

export const IMPLANT_MILESTONE_COLORS: Record<ImplantMilestone, string> = {
  surgery_booked: '#0284c7', // sky
  surgery: '#dc2626',        // red — the invasive step
  healing: '#7c3aed',        // violet — waiting
  opg: '#0891b2',            // cyan
  impression: '#d97706',     // amber
  lab: '#059669',            // emerald
  delivered: '#16a34a',      // green
}

/** ISO date `months` months after `iso`, clamped to the month's length. */
function addMonths(iso: string, months: number): string {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return target.toISOString().slice(0, 10)
}

/**
 * تاریخی که هیلینگ تمام می‌شود — از جراحی + مدت.
 *
 * Null when either half is missing: a guessed healing end is worse than
 * none, because someone will book an impression against it.
 */
export function healingEndDate(c: ImplantCaseLike): string | null {
  if (!c.surgery_date || !c.healing_months || c.healing_months <= 0) return null
  return addMonths(c.surgery_date, c.healing_months)
}

/** آیا هیلینگ تا امروز تمام شده. */
export function healingComplete(c: ImplantCaseLike, today: string): boolean {
  const end = healingEndDate(c)
  return !!end && end <= String(today).slice(0, 10)
}

export function implantMilestones(c: ImplantCaseLike, today: string): ImplantMilestoneState[] {
  const surgeryDone = !!c.surgery_date && c.surgery_date <= String(today).slice(0, 10)
  const healingEnd = healingEndDate(c)
  return [
    { key: 'surgery_booked', label: LABELS.surgery_booked, done: !!c.surgery_appointment_id || !!c.surgery_date, date: c.surgery_date ?? null },
    { key: 'surgery', label: LABELS.surgery, done: surgeryDone, date: c.surgery_date ?? null },
    // Healing counts as done only when its end has passed, not when it
    // was merely set — a wait is done when the waiting is over.
    { key: 'healing', label: LABELS.healing, done: healingComplete(c, today), date: healingEnd },
    { key: 'opg', label: LABELS.opg, done: !!c.opg_reminder_date && c.opg_reminder_date <= String(today).slice(0, 10), date: c.opg_reminder_date ?? null },
    { key: 'impression', label: LABELS.impression, done: !!c.impression_date, date: c.impression_date ?? null },
    { key: 'lab', label: LABELS.lab, done: !!c.lab_order_id, date: null },
    { key: 'delivered', label: LABELS.delivered, done: !!c.crown_delivery_date, date: c.crown_delivery_date ?? null },
  ]
}

/**
 * The one thing to do next. During healing there is nothing to do and
 * the answer says so — a card that offers an action during a mandatory
 * wait is inviting the wrong action.
 */
export function nextImplantAction(
  c: ImplantCaseLike,
  today: string,
): { key: ImplantMilestone | 'wait'; label: string } | null {
  if (c.success_status === 'failed') return null
  const t = String(today).slice(0, 10)
  if (!c.surgery_date) return { key: 'surgery_booked', label: 'نوبت جراحی بگذار' }
  if (c.surgery_date > t) return { key: 'surgery', label: 'در انتظار جراحی' }
  if (!c.healing_months) return { key: 'healing', label: 'مدت هیلینگ را تعیین کن' }
  if (!healingComplete(c, t)) {
    const end = healingEndDate(c)!
    // Jalali on screen; the ISO date is what the record stores.
    return { key: 'wait', label: `هیلینگ تا ${toJalaliStringPretty(end)}` }
  }
  if (!c.opg_reminder_date) return { key: 'opg', label: 'عکس OPG بگیر' }
  if (!c.impression_date) return { key: 'impression', label: 'نوبت قالب‌گیری بگذار' }
  if (!c.lab_order_id) return { key: 'lab', label: 'سفارش روکش به لابراتوار' }
  if (!c.crown_delivery_date) return { key: 'delivered', label: 'تحویل روکش به بیمار' }
  return null
}

/**
 * Deadline for the next dated step, so the implant module can carry the
 * same green/amber/red as the lab module.
 */
export function implantDeadline(c: ImplantCaseLike, today: string): DeadlineState {
  const t = String(today).slice(0, 10)
  if (c.crown_delivery_date || c.success_status === 'failed') return { kind: 'none', days: 0 }
  // The next dated thing in the chain is what can be late.
  const next = !c.surgery_date ? null
    : c.surgery_date > t ? c.surgery_date
    : !healingComplete(c, t) ? healingEndDate(c)
    // Healing is over and nothing has happened since: the end of healing
    // is the date that was missed. This is the state everyone forgets —
    // the wait ended and nobody noticed — so it must read as late, not as
    // "no deadline".
    : !c.impression_date ? (c.opg_reminder_date ?? healingEndDate(c))
    : null
  if (!next) return { kind: 'none', days: 0 }
  return deadlineState({ deadline: next }, t)
}
