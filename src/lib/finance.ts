import type { Payment, Treatment, Patient } from '../types'
import { formatCurrency, toPersianDigits } from './persianDate'

/** Minimal shape needed from an implant case — accepts the full
 * ImplantCase/ImplantCaseWithRelations type too since both satisfy this. */
interface ImplantCaseLike {
  patient_id: string
  total_cost: number | null
  paid_amount: number | null
}

/**
 * Single source of truth for "how much does this patient owe" — used by
 * Dashboard, Billing, and Patients so the number is provably identical
 * everywhere. Before this, Dashboard/Billing computed it from the
 * encounters table's total_amount/paid_amount (a cached summary field
 * that can drift out of sync), while Patients computed it from itemized
 * treatments minus actual payments. The two could silently disagree for
 * the same patient — exactly the kind of inconsistency that destroys
 * trust in a clinic's financial numbers.
 *
 * Basis: sum of billable treatment line-items minus sum of actual
 * payments received — the real ledger, not a cached rollup field.
 *
 * Also folds in implant case balances (total_cost - paid_amount): these
 * are tracked in their own table with their own cost/paid fields,
 * completely separate from treatments/payments, and were previously
 * invisible to every balance calculation in the app — a real blind spot
 * given implants are typically the highest-value work a clinic does.
 */
export interface PatientBalance {
  balance: number
  paid: number
  totalCost: number
}

export function calcPatientBalance(
  payments: Payment[],
  treatments: Treatment[],
  implantCases: ImplantCaseLike[] = [],
): PatientBalance {
  // Cancelled treatments must never count toward what a patient owes —
  // this used to be automatic because "delete" meant the row was gone
  // entirely; now that cancelling a treatment keeps the row (clinic
  // policy: nothing is ever permanently deleted), it has to be filtered
  // out explicitly or a cancelled treatment would inflate the balance
  // forever with no way to correct it.
  const billableTreatments = treatments.filter((t) => t.status !== 'cancelled')
  const treatmentCost = billableTreatments.reduce((s, t) => s + (t.patient_share ?? (t.total_price || 0)), 0)
  // Implant-linked payments are excluded here because they are already
  // counted through implant_cases.paid_amount below.
  //
  // createPayment() adds the amount onto the case's paid_amount, so the
  // case mirrors the payment ledger rather than being an independent
  // figure. Summing both counted every implant payment twice: a patient
  // who paid 5m toward an implant read as having paid 10m, and their
  // balance came out 5m LOWER than the truth — the clinic believing it
  // is owed less than it is. Found by the ledger invariant test in
  // doctorLedger.test.ts, which requires the per-doctor rows to sum to
  // exactly this function's result.
  const paid = payments
    .filter((p) => p.status === 'completed' && !p.implant_case_id)
    .reduce((s, p) => s + (p.amount || 0), 0)
  const implantCost = implantCases.reduce((s, c) => s + (c.total_cost || 0), 0)
  const implantPaid = implantCases.reduce((s, c) => s + (c.paid_amount || 0), 0)
  const totalCost = treatmentCost + implantCost
  return { balance: (treatmentCost - paid) + (implantCost - implantPaid), paid: paid + implantPaid, totalCost }
}

/** Balances for every patient at once, plus the clinic-wide total outstanding. */
export function calcAllPatientBalances(
  payments: Payment[],
  treatments: Treatment[],
  implantCases: ImplantCaseLike[] = [],
): { byPatient: Map<string, PatientBalance>; totalOutstanding: number } {
  const patientIds = new Set<string>([
    ...treatments.map((t) => t.patient_id),
    ...payments.map((p) => p.patient_id),
    ...implantCases.map((c) => c.patient_id),
  ])
  const byPatient = new Map<string, PatientBalance>()
  let totalOutstanding = 0
  for (const id of patientIds) {
    const fin = calcPatientBalance(
      payments.filter((p) => p.patient_id === id),
      treatments.filter((t) => t.patient_id === id),
      implantCases.filter((c) => c.patient_id === id),
    )
    byPatient.set(id, fin)
    if (fin.balance > 0) totalOutstanding += fin.balance
  }
  return { byPatient, totalOutstanding }
}

/**
 * Calculates the total balance for a family.
 * A family consists of the head of household and all patients who share that head.
 */
export function calcFamilyBalance(
  patientId: string,
  patients: Patient[],
  payments: Payment[],
  treatments: Treatment[],
  implantCases: ImplantCaseLike[] = [],
): PatientBalance {
  const patient = patients.find(p => p.id === patientId)
  if (!patient) return { balance: 0, paid: 0, totalCost: 0 }
  
  // If this patient has a head, that's the head ID. Otherwise, they might be the head themselves.
  const headId = patient.family_head_id || patient.id
  
  // A family member is the head themselves, or anyone whose family_head_id is the head.
  const familyMembers = patients.filter(p => p.id === headId || p.family_head_id === headId)
  
  // If it's just one person (no one else shares this headId), just return their individual balance
  if (familyMembers.length <= 1) {
    return calcPatientBalance(
      payments.filter(p => p.patient_id === patientId),
      treatments.filter(t => t.patient_id === patientId),
      implantCases.filter(c => c.patient_id === patientId)
    )
  }
  
  const familyIds = new Set(familyMembers.map(p => p.id))
  
  return calcPatientBalance(
    payments.filter(p => familyIds.has(p.patient_id)),
    treatments.filter(t => familyIds.has(t.patient_id)),
    implantCases.filter(c => familyIds.has(c.patient_id))
  )
}

export interface OverpaymentCheck {
  /** How much this payment exceeds what is still owed. Zero when it does not. */
  excess: number
  /** Remaining balance before this payment. */
  remaining: number
  message: string | null
}

/**
 * Checks a payment against what the patient still owes.
 *
 * Found by auditing the live database: one patient had 22,500,000 of
 * billable treatment and 42,500,000 recorded as paid. Nothing had warned
 * anyone. The form only warned when the balance was ALREADY zero, so the
 * payment that took an account from 12,500,000 owed to 6,500,000 in
 * credit passed in silence.
 *
 * Warns rather than blocks. Paying ahead is real — a deposit before a
 * course of treatment, a family member settling more than one file — so
 * refusing it would be wrong. Doing it without anyone noticing is what
 * was wrong.
 */
/**
 * MOD-FIX-008 | جمع مالی یک ویزیت
 *
 * `encounters.total_amount` is a stored, denormalised copy of "what this
 * visit costs". Four different places changed a visit's treatments and
 * only two of them wrote that field back, each with its own arithmetic —
 * one recomputed from scratch, the other added a delta to the stored
 * value. Editing a price or cancelling a treatment updated neither, so
 * the stored figure drifted away from reality and stayed there.
 *
 * The filter matches calcPatientBalance() deliberately: a cancelled
 * treatment is not billable, so it must not appear in a visit's total
 * either. Two numbers describing the same money disagreeing is worse
 * than either of them being wrong on its own.
 */
export function calcEncounterTotal(treatments: Treatment[], encounterId: string): number {
  return treatments
    .filter((t) => t.encounter_id === encounterId && t.status !== 'cancelled')
    .reduce((sum, t) => sum + (t.patient_share ?? (t.total_price || 0)), 0)
}

export function checkOverpayment(amount: number, remaining: number): OverpaymentCheck {
  const excess = Math.round(amount) - Math.round(remaining)
  if (excess <= 0 || amount <= 0) {
    return { excess: 0, remaining, message: null }
  }
  if (remaining <= 0) {
    return {
      excess,
      remaining,
      message: 'این بیمار بدهی ندارد — کل این مبلغ اضافه‌پرداخت ثبت می‌شود',
    }
  }
  return {
    excess,
    remaining,
    message: 'مبلغ از مانده‌ی بیمار بیشتر است — اضافه‌پرداخت ثبت می‌شود',
  }
}

export interface DuplicatePaymentCheck {
  isDuplicate: boolean
  matchedPayment?: Payment
  minutesDiff?: number
  message?: string
}

/**
 * MOD-FEAT-047 | گارد هوشمند پرداخت تکراری
 *
 * Checks if a payment being recorded appears to duplicate a recent payment
 * for the same patient with the same amount.
 *
 * In busy reception desks, duplicate taps or parallel clicks can easily record
 * the same card swipe or cash entry twice. This warns the user before creating
 * a duplicate ledger record.
 */
export function checkDuplicatePayment(
  candidate: { patient_id: string; amount: number; payment_date?: string },
  existingPayments: Payment[],
  windowMinutes = 10,
  referenceNow?: number,
): DuplicatePaymentCheck {
  if (!candidate.patient_id || !candidate.amount || candidate.amount <= 0) {
    return { isDuplicate: false }
  }

  const candidateAmount = Math.round(candidate.amount)
  const now = referenceNow ?? Date.now()

  // Filter payments for same patient, not cancelled, and with same amount
  const matched = existingPayments.find((p) => {
    if (p.patient_id !== candidate.patient_id) return false
    if (p.status === 'cancelled') return false
    if (Math.round(p.amount || 0) !== candidateAmount) return false

    // Check time diff based on created_at timestamp
    if (p.created_at) {
      const createdTime = new Date(p.created_at).getTime()
      if (!isNaN(createdTime)) {
        const diffMinutes = Math.abs(now - createdTime) / (1000 * 60)
        return diffMinutes <= windowMinutes
      }
    }

    // If candidate has payment_date matching p.payment_date and created within today
    if (candidate.payment_date && p.payment_date === candidate.payment_date) {
      return true
    }

    return false
  })

  if (!matched) {
    return { isDuplicate: false }
  }

  let minutesDiff: number | undefined
  if (matched.created_at) {
    const diff = Math.round(Math.abs(now - new Date(matched.created_at).getTime()) / (1000 * 60))
    minutesDiff = diff
  }

  const timeText = minutesDiff !== undefined && minutesDiff < 60
    ? `${toPersianDigits(minutesDiff <= 1 ? 1 : minutesDiff)} دقیقه گذشته`
    : 'دقایقی قبل'

  return {
    isDuplicate: true,
    matchedPayment: matched,
    minutesDiff,
    message: `پرداختی با همین مبلغ (${formatCurrency(candidateAmount)} ت) در ${timeText} برای این بیمار ثبت شده است. آیا مطمئنید پرداخت تکراری نیست؟`,
  }
}

