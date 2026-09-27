// patientTreatmentGroups.ts — one patient, one file.
//
// MOD-FEAT-042 | گزارش مهدی: «تمام درمان‌های یک فرد باید داخل پرونده‌ی
// بیمار باشد، نه اینکه مثلاً ده بار اسم آبا امیری باشد و همه‌ی
// درمان‌ها پراکنده.»
//
// The «ویزیت‌ها» tab listed every encounter as its own row, repeating
// the patient's name once per visit. Ten visits meant the same name ten
// times and no sense of a patient's overall standing. This groups a
// patient's whole record together — visits, treatment count, the
// doctors who touched the work, and the full money picture (cost, paid,
// balance, pending cheques, remaining instalments) — so the list reads
// as a set of patient files rather than a flat log.
//
// Pure and framework-free: it takes plain rows and returns plain groups,
// so the money math and the "did the doctor change" rule are covered by
// unit tests instead of being trapped inside a component (the pattern
// that produced three bugs this project already paid for).
import { calcPatientBalance } from './finance'
import type { Payment, Treatment, Cheque, Installment } from '../types'

/** Minimal shape this module needs from an encounter. */
export interface EncounterLike {
  id: string
  patient_id: string
  doctor_id: string | null
  encounter_date: string
  status: string
  total_amount: number | null
}

export interface ImplantCaseLike {
  patient_id: string
  total_cost: number | null
  paid_amount: number | null
}

export interface PatientGroupFinance {
  totalCost: number
  paid: number
  balance: number
  /** Cheques still to clear (status neither cleared nor bounced/cancelled). */
  pendingChequeCount: number
  pendingChequeAmount: number
  /** Instalments not yet paid (no payment_date, not cancelled). */
  remainingInstallmentCount: number
  remainingInstallmentAmount: number
}

export interface PatientTreatmentGroup {
  patientId: string
  encounters: EncounterLike[]
  treatmentCount: number
  /** Distinct treating doctors across visits + treatments, first-seen order. */
  doctorIds: string[]
  /** True when more than one doctor worked this patient — surfaced so a
   * handover between doctors is never invisible. */
  doctorChanged: boolean
  lastVisitDate: string | null
  finance: PatientGroupFinance
}

/** A cheque still awaiting settlement counts as money not yet in hand. */
function isPendingCheque(c: Cheque): boolean {
  const s = (c.status || '').toLowerCase()
  return s !== 'cleared' && s !== 'bounced' && s !== 'cancelled' && s !== 'returned'
}

/** An instalment with no payment date and not cancelled is still owed. */
function isRemainingInstallment(i: Installment): boolean {
  const s = (i.status || '').toLowerCase()
  return !i.payment_date && s !== 'paid' && s !== 'cancelled'
}

export interface GroupInput {
  encounters: EncounterLike[]
  treatments: Treatment[]
  payments: Payment[]
  implantCases?: ImplantCaseLike[]
  cheques?: Cheque[]
  installments?: Installment[]
}

/**
 * Groups every patient who has any encounter or treatment into a single
 * file, most-recently-active first. A patient with treatments but no
 * encounter row still appears — work must never be hidden just because a
 * visit header is missing.
 */
export function groupPatientTreatments(input: GroupInput): PatientTreatmentGroup[] {
  const { encounters, treatments, payments } = input
  const implantCases = input.implantCases ?? []
  const cheques = input.cheques ?? []
  const installments = input.installments ?? []

  const patientIds = new Set<string>([
    ...encounters.map((e) => e.patient_id),
    ...treatments.map((t) => t.patient_id),
  ])

  const groups: PatientTreatmentGroup[] = []
  for (const id of patientIds) {
    const patEncounters = encounters
      .filter((e) => e.patient_id === id)
      .sort((a, b) => (b.encounter_date || '').localeCompare(a.encounter_date || ''))
    // Cancelled treatments stay in the file (nothing is deleted) but must
    // not be counted as active work.
    const patTreatments = treatments.filter((t) => t.patient_id === id && t.status !== 'cancelled')

    // Distinct doctors, in first-seen order: encounter doctors first
    // (chronological), then any treatment-level doctor not already seen —
    // a treatment can be done by a different doctor than the visit's.
    const doctorIds: string[] = []
    const seen = new Set<string>()
    const pushDoc = (d: string | null | undefined) => {
      if (d && !seen.has(d)) { seen.add(d); doctorIds.push(d) }
    }
    // chronological (oldest first) so "first doctor" is genuinely first
    ;[...patEncounters].reverse().forEach((e) => pushDoc(e.doctor_id))
    patTreatments.forEach((t) => pushDoc(t.doctor_id))

    const finance = calcPatientBalance(
      payments.filter((p) => p.patient_id === id),
      treatments.filter((t) => t.patient_id === id),
      implantCases.filter((c) => c.patient_id === id),
    )
    const patCheques = cheques.filter((c) => c.patient_id === id && isPendingCheque(c))
    const patInstallments = installments.filter((i) => i.patient_id === id && isRemainingInstallment(i))

    groups.push({
      patientId: id,
      encounters: patEncounters,
      treatmentCount: patTreatments.length,
      doctorIds,
      doctorChanged: doctorIds.length > 1,
      lastVisitDate: patEncounters[0]?.encounter_date ?? null,
      finance: {
        totalCost: finance.totalCost,
        paid: finance.paid,
        balance: finance.balance,
        pendingChequeCount: patCheques.length,
        pendingChequeAmount: patCheques.reduce((s, c) => s + (c.amount || 0), 0),
        remainingInstallmentCount: patInstallments.length,
        remainingInstallmentAmount: patInstallments.reduce((s, i) => s + (i.amount || 0), 0),
      },
    })
  }

  // Most recent activity first — a patient seen today sits above one last
  // seen months ago. Patients with no dated visit sink to the bottom.
  return groups.sort((a, b) => (b.lastVisitDate || '').localeCompare(a.lastVisitDate || ''))
}
