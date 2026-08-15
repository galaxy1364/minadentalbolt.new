import type { Payment, Treatment } from '../types'

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
  const treatmentCost = treatments.reduce((s, t) => s + (t.total_price || 0), 0)
  const paid = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0)
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
