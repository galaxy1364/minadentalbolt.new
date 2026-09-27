/**
 * MOD-FEAT-030 | تشخیص پرداخت تکراری
 *
 * گزارش مهدی: «الان ما دو تا پرداخت شبیه هم داریم. تکراری نباید وجود
 * داشته باشه.»
 *
 * دو پرداخت ۱,۰۰۰,۰۰۰ تومانی برای «ابا امیری»، هر دو نقدی، هر دو ۹
 * شهریور، با فاصله‌ی **۲ دقیقه و ۳۷ ثانیه**. هیچ هشداری نیامد.
 *
 * The only guard that existed fired when the patient was already fully
 * settled — and this patient owed money, so it never spoke. The case it
 * covered ("paying someone who owes nothing") is rarer than the one it
 * missed ("pressing save twice, or two people recording the same cash").
 *
 * Detection, not prevention. A patient genuinely can hand over the same
 * amount twice in one day, and a hard block would force whoever hit that
 * case to work around the app — which is how a clinic ends up keeping a
 * second ledger on paper. The warning goes where the decision is made,
 * with enough detail to tell the two situations apart.
 */

import { toPersianDigits } from './persianDate'

export interface PaymentLike {
  id: string
  patient_id: string
  amount: number
  payment_date: string
  payment_method?: string | null
  status: string
  created_at?: string | null
}

export interface DuplicateDraft {
  patient_id: string
  amount: number
  payment_date: string
  /** هنگام ویرایش، خودِ رکورد نباید تکراریِ خودش حساب شود. */
  excludeId?: string | null
}

/**
 * Payments that look like the one about to be saved: same patient, same
 * amount, same day.
 *
 * Method is deliberately not part of the match. Recording the same sum
 * once as cash and once as card is a *more* likely mistake than a real
 * pair of identical payments, not less.
 *
 * Cancelled payments are excluded — one that was already voided is the
 * opposite of evidence that this is a duplicate.
 */
export function findDuplicatePayments(
  draft: DuplicateDraft,
  existing: PaymentLike[],
): PaymentLike[] {
  if (!draft.patient_id || !draft.amount || !draft.payment_date) return []

  return existing.filter(
    (p) =>
      p.id !== draft.excludeId &&
      p.patient_id === draft.patient_id &&
      p.status !== 'cancelled' &&
      Number(p.amount) === Number(draft.amount) &&
      String(p.payment_date).slice(0, 10) === String(draft.payment_date).slice(0, 10),
  )
}

/**
 * A warning the person can act on, or null when there is nothing to say.
 *
 * Names the count rather than just flagging, because "one identical
 * payment already today" and "three" call for different amounts of
 * suspicion.
 */
export function duplicateWarning(matches: PaymentLike[]): string | null {
  if (matches.length === 0) return null
  const n = matches.length
  return n === 1
    ? 'همین مبلغ امروز یک بار دیگر برای این بیمار ثبت شده است. اگر واقعاً دو پرداخت جدا بوده، ادامه دهید.'
    : `همین مبلغ امروز ${toPersianDigits(n)} بار دیگر برای این بیمار ثبت شده است. مطمئن شوید تکراری نیست.`
}
