/**
 * MOD-FEAT-034 | زنجیره‌ی لابراتوار از دید مطب
 *
 * گزارش مهدی:
 *
 *   «برای کلینیک، روند لابراتوار: ارسال به لابراتوار، تایم گذاشتن، کی به
 *    مطب می‌رسه، و بعد رسیدن، نوبت‌دهی برای بیمار و تحویل مهم است. روند
 *    پرسلن‌گذاری و روند داخل لابراتوار برای اکانت لابراتوار است، نه برای
 *    مطب. اینا با هم قاطی شدن.»
 *
 * او درست می‌گوید و این یک اشتباه معماری است، نه یک ایراد ظاهری.
 *
 * `LAB_STAGES` شش مرحله دارد — قالب‌گیری/اسکن، ارسال به پیک، طراحی
 * CAD/CAM، پخت و پرسلن‌گذاری، کنترل کیفی، آماده تحویل — و **هر شش‌تا
 * داخل ساختمان لابراتوار اتفاق می‌افتند**. مطب نه می‌تواند ببیندشان، نه
 * می‌تواند رویشان کاری کند، و نه لازمشان دارد. آن‌ها متعلق به یک اکانت
 * لابراتوار هستند که هنوز وجود ندارد.
 *
 * The clinic's own chain is short and every link is something a
 * receptionist actually does or waits for:
 *
 *   فرستادیم → قرار بود کِی برسد → رسید → نوبت بیمار گذاشته شد → تحویل شد
 *
 * Derived from columns that already existed (`sent_at`, `deadline`,
 * `received_at`, `delivered`) plus the appointment link added in
 * migration 034. Nothing here reads `stage`.
 */

export type ClinicMilestone = 'sent' | 'due' | 'arrived' | 'booked' | 'delivered'

export interface LabOrderLike {
  sent_at?: string | null
  deadline?: string | null
  received_at?: string | null
  delivered?: boolean | null
  delivery_appointment_id?: string | null
}

export interface MilestoneState {
  key: ClinicMilestone
  label: string
  done: boolean
  /** تاریخ مربوط، اگر ثبت شده باشد. */
  date: string | null
}

const LABELS: Record<ClinicMilestone, string> = {
  sent: 'ارسال به لابراتوار',
  due: 'موعد رسیدن به مطب',
  arrived: 'رسید به مطب',
  booked: 'نوبت تحویل بیمار',
  delivered: 'تحویل به بیمار',
}

/**
 * The five links, in the order the clinic lives them.
 *
 * «due» counts as done once the work has arrived: a promised date that
 * has been overtaken by the real arrival is no longer something anyone
 * is waiting for.
 */
export function clinicMilestones(order: LabOrderLike): MilestoneState[] {
  const arrived = !!order.received_at
  return [
    { key: 'sent', label: LABELS.sent, done: !!order.sent_at, date: order.sent_at ?? null },
    { key: 'due', label: LABELS.due, done: arrived, date: order.deadline ?? null },
    { key: 'arrived', label: LABELS.arrived, done: arrived, date: order.received_at ?? null },
    { key: 'booked', label: LABELS.booked, done: !!order.delivery_appointment_id, date: null },
    { key: 'delivered', label: LABELS.delivered, done: !!order.delivered, date: null },
  ]
}

/**
 * The one thing the clinic should do next, or null when the chain is
 * complete.
 *
 * Returns a single action rather than a list because a card showing four
 * possible next steps is a card nobody acts on.
 */
export function nextClinicAction(order: LabOrderLike): { key: ClinicMilestone; label: string } | null {
  if (!order.sent_at) return { key: 'sent', label: 'ثبت ارسال به لابراتوار' }
  if (!order.received_at) return { key: 'arrived', label: 'رسید به مطب' }
  // Booking comes before handing over: the work is here and the patient
  // is not, and that gap is where a finished crown sits in a drawer for
  // three weeks.
  if (!order.delivery_appointment_id) return { key: 'booked', label: 'نوبت تحویل بگذار' }
  if (!order.delivered) return { key: 'delivered', label: 'تحویل به بیمار' }
  return null
}

/**
 * Days until the promised arrival. Negative once it is late.
 *
 * Only meaningful before the work arrives; afterwards the deadline is
 * history and counting down to it would be noise.
 */
export function daysUntilDue(order: LabOrderLike, today: string): number | null {
  if (!order.deadline || order.received_at) return null
  const due = Date.parse(`${String(order.deadline).slice(0, 10)}T00:00:00Z`)
  const now = Date.parse(`${String(today).slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(due) || Number.isNaN(now)) return null
  return Math.round((due - now) / 86_400_000)
}

/**
 * Whether this order needs the clinic's attention today.
 *
 * Late, or arrived with no appointment booked — the two states where
 * something is stuck and only the clinic can unstick it.
 */
export function needsAttention(order: LabOrderLike, today: string): boolean {
  const days = daysUntilDue(order, today)
  if (days !== null && days < 0) return true
  return !!order.received_at && !order.delivery_appointment_id && !order.delivered
}
