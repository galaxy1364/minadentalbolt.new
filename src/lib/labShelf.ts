// labShelf.ts — where a physical lab case actually *is*, and when to
// chase it.
//
// The gap this closes: the app tracked a lab case digitally but not
// physically. When a delivered case arrived back at the clinic, nobody
// could say which shelf it was sitting on, so staff searched boxes by
// hand. The competitor makes shelf/number/space mandatory for exactly
// this reason.
import type { LabOrder } from '../types'

/** Fields that locate a case on a physical shelf. */
export interface ShelfLocation {
  shelf: string | null
  shelf_number: string | null
  shelf_space: string | null
}

/** Human-readable location, e.g. "A-۳-۲". Null when nothing is recorded,
 * so callers can render a placeholder rather than an empty dash soup. */
export function formatShelfLocation(loc: ShelfLocation): string | null {
  const parts = [loc.shelf, loc.shelf_number, loc.shelf_space]
    .map((p) => (p || '').trim())
    .filter((p) => p.length > 0)
  return parts.length === 0 ? null : parts.join('-')
}

export function hasShelfLocation(loc: ShelfLocation): boolean {
  return formatShelfLocation(loc) !== null
}

/**
 * A partial shelf address is worse than none — "shelf A" with no number
 * still means opening every box on A. So once any part is filled, all
 * three are required.
 */
export function validateShelf(loc: ShelfLocation): string[] {
  const filled = [loc.shelf, loc.shelf_number, loc.shelf_space].map((p) => (p || '').trim().length > 0)
  const anyFilled = filled.some(Boolean)
  const allFilled = filled.every(Boolean)
  if (anyFilled && !allFilled) {
    return ['برای مکان قفسه، هر سه مقدار قفسه، شماره و فضا الزامی است']
  }
  return []
}

export type AlarmState = 'none' | 'upcoming' | 'due' | 'overdue'

export interface AlarmInfo {
  state: AlarmState
  /** Days until the alarm; negative once it has passed. Null when unset. */
  daysUntil: number | null
  label: string
}

/** Whole days between two ISO dates, comparing dates only. Using UTC
 * midnight avoids a local-timezone shift turning "today" into "yesterday"
 * for clinics running near a day boundary. */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/**
 * Alarm state for a case. The alarm is a *chase* reminder set before the
 * deadline, deliberately separate from the deadline itself: staff need
 * to ring the lab a few days ahead, not discover the miss on the day.
 *
 * A finished case never alarms — chasing work that is already back would
 * train staff to ignore the list.
 */
export function alarmInfo(
  order: Pick<LabOrder, 'status'> & { alarm_date?: string | null; work_done?: boolean | null },
  todayISO: string,
): AlarmInfo {
  const alarm = order.alarm_date || null
  if (!alarm) return { state: 'none', daysUntil: null, label: 'بدون یادآور' }
  if (order.work_done || order.status === 'delivered' || order.status === 'cancelled') {
    return { state: 'none', daysUntil: null, label: 'بدون یادآور' }
  }

  const days = daysBetween(todayISO, alarm)
  if (days < 0) return { state: 'overdue', daysUntil: days, label: `${Math.abs(days)} روز گذشته` }
  if (days === 0) return { state: 'due', daysUntil: 0, label: 'امروز' }
  return { state: 'upcoming', daysUntil: days, label: `${days} روز مانده` }
}

/** Suggests an alarm a few days before the deadline. Returns null when
 * that would land in the past — a reminder for a date already gone is
 * noise, not help. */
export function suggestAlarmDate(deadlineISO: string | null, todayISO: string, leadDays = 2): string | null {
  if (!deadlineISO) return null
  const deadline = Date.parse(`${deadlineISO.slice(0, 10)}T00:00:00Z`)
  const suggested = new Date(deadline - leadDays * 86_400_000).toISOString().slice(0, 10)
  return daysBetween(todayISO, suggested) < 0 ? null : suggested
}

/** Cases the lab has finished but that have not reached the patient yet —
 * the "ready for delivery" worklist the competitor surfaces on its
 * dashboard. This is where cases quietly rot: the lab is done, so it
 * drops off the lab's radar, but the patient has not been called. */
export function readyForDelivery<T extends { status: string; work_done?: boolean | null; delivered?: boolean | null }>(
  orders: T[],
): T[] {
  return orders.filter((o) => {
    if (o.status === 'cancelled') return false
    if (o.delivered) return false
    return Boolean(o.work_done) || o.status === 'ready' || o.status === 'received'
  })
}

/** Sort for the chase list: most overdue first, then by how soon.
 * Cases with no alarm sink to the bottom rather than being dropped —
 * they still need attention, just not urgently. */
export function sortByUrgency<T extends Pick<LabOrder, 'status'> & { alarm_date?: string | null; work_done?: boolean | null }>(
  orders: T[],
  todayISO: string,
): T[] {
  const rank = (o: T) => {
    const info = alarmInfo(o, todayISO)
    return info.daysUntil === null ? Number.POSITIVE_INFINITY : info.daysUntil
  }
  return [...orders].sort((a, b) => rank(a) - rank(b))
}

export interface LabSummary {
  total: number
  readyForDelivery: number
  overdueAlarms: number
  missingShelf: number
}

export function summariseLab<
  T extends Pick<LabOrder, 'status'> & ShelfLocation & { alarm_date?: string | null; work_done?: boolean | null; delivered?: boolean | null },
>(orders: T[], todayISO: string): LabSummary {
  const live = orders.filter((o) => o.status !== 'cancelled')
  const ready = readyForDelivery(live)
  return {
    total: live.length,
    readyForDelivery: ready.length,
    overdueAlarms: live.filter((o) => alarmInfo(o, todayISO).state === 'overdue').length,
    // Only cases physically back at the clinic need a shelf; one still at
    // the lab has nothing to store yet.
    missingShelf: ready.filter((o) => !hasShelfLocation(o)).length,
  }
}
