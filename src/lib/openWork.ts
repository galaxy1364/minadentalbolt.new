import { deadlineState, type LabOrderLike as MilestoneOrder } from './labClinicMilestones'

/**
 * MOD-FEAT-037 | کار باز هر ماژول، و رنگ فوریتش
 *
 * گزارش مهدی: «هر ماژول که کار باز دارد گزینه بالای لوگو داک پایین اضافه
 * شود و اگر از موعدش بگذرد رنگش از سبز به زرد و قرمز تبدیل شود.»
 *
 * The bottom bar had one badge — the debtor count on مالی — and it was
 * always red. Everything else a receptionist has to remember lived in
 * their head: how many lab orders are out, whether any is due today,
 * how many appointments remain. A bar that only ever shouts about money
 * teaches people that the rest is quiet, which it is not.
 *
 * Three levels, mapped to what the deadline is doing:
 *
 *   ok    → سبز   nothing is due today, nothing is late
 *   warn  → زرد   something is due today
 *   late  → قرمز  something is past its date
 *
 * The badge shows the worst state in the module, not the average — one
 * late crown among ten on-time ones is still one late crown.
 */

export type WorkLevel = 'ok' | 'warn' | 'late'

export interface OpenWork {
  count: number
  level: WorkLevel
}

const worst = (a: WorkLevel, b: WorkLevel): WorkLevel =>
  a === 'late' || b === 'late' ? 'late' : a === 'warn' || b === 'warn' ? 'warn' : 'ok'

export interface LabOrderForBadge extends MilestoneOrder {
  status?: string | null
}

/** سفارش‌های لابراتوار که هنوز به بیمار نرسیده‌اند. */
export function labOpenWork(orders: LabOrderForBadge[], today: string): OpenWork {
  let count = 0
  let level: WorkLevel = 'ok'
  for (const o of orders) {
    if (o.delivered || o.status === 'delivered' || o.status === 'cancelled') continue
    count++
    const dl = deadlineState(o, today)
    if (dl.kind === 'late') level = worst(level, 'late')
    else if (dl.kind === 'due_today') level = worst(level, 'warn')
    // Arrived and unbooked is stuck work, and stuck work is late work.
    if (o.received_at && !o.delivery_appointment_id) level = worst(level, 'late')
  }
  return { count, level }
}

export interface AppointmentForBadge {
  date: string
  status?: string | null
}

/** نوبت‌های امروز که هنوز تمام نشده‌اند. */
export function appointmentsOpenWork(appointments: AppointmentForBadge[], today: string): OpenWork {
  const d = today.slice(0, 10)
  const open = appointments.filter(
    (a) => String(a.date).slice(0, 10) === d && a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'no_show',
  )
  // Today's appointments are never "late" in the deadline sense — the
  // day is the deadline. They are simply work to do.
  return { count: open.length, level: 'ok' }
}

/**
 * بدهکاران. پول بدون سررسید است، پس همیشه قرمز — همان رفتاری که نشان
 * قدیمی داشت، و مهدی هرگز از آن گله نکرد.
 */
export function billingOpenWork(debtorCount: number): OpenWork {
  return { count: debtorCount, level: debtorCount > 0 ? 'late' : 'ok' }
}

/** رنگ هر سطح — یک جا، تا نوار پایین و نوار پیشرفت یک زبان داشته باشند. */
export const LEVEL_COLORS: Record<WorkLevel, string> = {
  ok: '#16a34a',    // green-600
  warn: '#d97706',  // amber-600
  late: '#dc2626',  // red-600
}
