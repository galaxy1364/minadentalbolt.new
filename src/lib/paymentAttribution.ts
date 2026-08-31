/**
 * MOD-FEAT-020 | پرداخت بابت چه چیزی بود
 *
 * گزارش مهدی: «در پرداخت بابت کدام دندان و کدام پزشک چقدر داده.»
 *
 * `payments` could say who paid, how much and when — never what for. In a
 * clinic with two doctors and a patient with six teeth under treatment,
 * that leaves the two questions that actually matter unanswerable: which
 * tooth did this settle, and whose work was it? The second one decides
 * the doctor's share of income, so getting it from memory is not an
 * option.
 *
 * Tooth and doctor are RESOLVED from the linked treatment rather than
 * stored on the payment. Storing them would mean a payment still claiming
 * "tooth 11, Dr A" after the treatment was corrected to tooth 21 — the
 * same class of drift that made encounter totals wrong (MOD-FIX-008).
 */

import { toPersianDigits } from './persianDate'

export interface TreatmentRef {
  id: string
  procedure_name: string | null
  tooth_number: string | null
  doctor_id: string | null
  total_price: number | null
  status: string
}

export interface DoctorRef {
  id: string
  name: string | null
}

export interface PaymentRef {
  treatment_id?: string | null
  doctor_id?: string | null
}

export interface PaymentAttribution {
  /** «بیلدآپ» یا null اگر به درمانی وصل نباشد. */
  procedureName: string | null
  /** شماره‌ی دندان، اگر درمان دندان مشخصی داشته باشد. */
  toothNumber: string | null
  /** نام پزشک — از درمان، وگرنه از خود پرداخت. */
  doctorName: string | null
  /** یک خط آماده برای نمایش در فهرست و رسید. */
  label: string
}

/**
 * Treatments a payment may be attributed to.
 *
 * Cancelled treatments are excluded because attributing money to work
 * that was called off is how a refund gets quietly booked as revenue.
 * An already-linked treatment stays in the list so editing a payment
 * doesn't silently drop its own link.
 */
export function attributableTreatments(
  treatments: TreatmentRef[],
  patientTreatmentIds: string[],
  currentTreatmentId?: string | null,
): TreatmentRef[] {
  const allowed = new Set(patientTreatmentIds)
  return treatments.filter(
    (t) =>
      allowed.has(t.id) &&
      (t.status !== 'cancelled' || t.id === currentTreatmentId),
  )
}

/** «بیلدآپ — دندان ۳۸ — دکتر مینا مازندارنی» */
export function resolveAttribution(
  payment: PaymentRef,
  treatments: TreatmentRef[],
  doctors: DoctorRef[],
): PaymentAttribution {
  const treatment = payment.treatment_id
    ? treatments.find((t) => t.id === payment.treatment_id)
    : undefined

  // The treatment's doctor wins when there is one: it is the record of who
  // actually did the work, while payment.doctor_id is only a fallback for
  // money that belongs to no single treatment.
  const doctorId = treatment?.doctor_id || payment.doctor_id || null
  const doctorName = doctorId ? doctors.find((d) => d.id === doctorId)?.name ?? null : null

  const procedureName = treatment?.procedure_name || null
  const toothNumber = treatment?.tooth_number || null

  const parts: string[] = []
  if (procedureName) parts.push(procedureName)
  // Persian digits, like every other number the app shows. A tooth
  // number rendered in Latin next to Persian prices is the kind of small
  // inconsistency that makes a clinic record look machine-generated.
  if (toothNumber) parts.push(`دندان ${toPersianDigits(toothNumber)}`)
  if (doctorName) parts.push(`دکتر ${doctorName}`)

  return {
    procedureName,
    toothNumber,
    doctorName,
    label: parts.length ? parts.join(' — ') : 'بابت مشخص نشده',
  }
}

/**
 * How much of a treatment's price is still unpaid.
 *
 * Payments in any state other than 'cancelled' count, because a cheque
 * that has been handed over but not yet cleared is money the patient has
 * already given — treating it as outstanding is how a patient gets asked
 * twice for the same amount.
 */
export function treatmentRemaining(
  treatment: TreatmentRef,
  payments: { treatment_id?: string | null; amount: number | null; status: string }[],
): number {
  const paid = payments
    .filter((p) => p.treatment_id === treatment.id && p.status !== 'cancelled')
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  return (treatment.total_price || 0) - paid
}
