/**
 * MOD-FIX-007 | همگام ماندن درمان و سفارش لابراتوار
 *
 * The bug this exists to end: creating a treatment with «ارسال به
 * لابراتوار» ticked produced a real lab order, but *editing* a treatment
 * and ticking the same box produced nothing. The treatment row still grew
 * its «لابراتوار» chip — that chip is driven by `treatment.lab_id`, which
 * the edit did save — so the screen said the case was at the lab while the
 * Laboratory module had never heard of it. Silent, and only discoverable
 * when a crown never arrives.
 *
 * There is no `lab_orders.treatment_id` column, so the link between the
 * two records is inferred. That inference used to be written inline at the
 * one call site that needed it; putting it here means the edit path and
 * the cancel path cannot drift apart, and the rule is reachable from a
 * test. Adding a real foreign key is the better long-term answer, but it
 * needs a migration applied to the live database first — shipping code
 * that writes a column the server doesn't have is precisely what broke
 * sync once before.
 */

/** فقط همان فیلدهایی که برای تشخیص پیوند لازم است. */
export interface LabOrderLike {
  id: string
  encounter_id: string | null
  lab_id: string | null
  tooth_number: string | null
  status: string
}

export interface TreatmentLabLink {
  encounter_id: string | null
  lab_id: string | null
  tooth_number: string | null
}

/** یک سفارش بسته‌شده دیگر «پیوند زنده» نیست. */
const CLOSED_STATUSES = ['cancelled', 'delivered']

/** null و رشته‌ی خالی هر دو یعنی «دندانی ثبت نشده». */
function normaliseTooth(value: string | null | undefined): string | null {
  return value ? value : null
}

/**
 * The live lab order belonging to a treatment, or undefined.
 *
 * Tooth number is part of the match on purpose. Without it, two treatments
 * in the same visit sent to the same lab are indistinguishable, and
 * cancelling one would cancel the other's order.
 */
export function findLinkedLabOrder<T extends LabOrderLike>(
  orders: T[],
  treatment: TreatmentLabLink,
): T | undefined {
  if (!treatment.lab_id) return undefined
  return orders.find(
    (o) =>
      o.encounter_id === treatment.encounter_id &&
      o.lab_id === treatment.lab_id &&
      normaliseTooth(o.tooth_number) === normaliseTooth(treatment.tooth_number) &&
      !CLOSED_STATUSES.includes(o.status),
  )
}

export type LabHandoffAction = 'none' | 'create' | 'cancel' | 'replace'

/**
 * What has to happen to the lab order when a treatment is saved.
 *
 * 'replace' covers switching labs mid-treatment: the old lab must be told
 * to stop, and the new one must actually receive the case. Doing only half
 * of that is how a clinic ends up paying two labs for one crown.
 */
export function decideLabHandoff(
  previousLabId: string | null,
  nextLabId: string | null,
  hasLiveOrder: boolean,
): LabHandoffAction {
  const prev = previousLabId || null
  const next = nextLabId || null

  if (!next) return hasLiveOrder ? 'cancel' : 'none'
  if (!hasLiveOrder) return 'create'
  return prev === next ? 'none' : 'replace'
}
