import type { Payment, Treatment } from '../types'

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
 */
export interface PatientBalance {
  balance: number
  paid: number
  totalCost: number
}

export function calcPatientBalance(payments: Payment[], treatments: Treatment[]): PatientBalance {
  const totalCost = treatments.reduce((s, t) => s + (t.total_price || 0), 0)
  const paid = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0)
  return { balance: totalCost - paid, paid, totalCost }
}

/** Balances for every patient at once, plus the clinic-wide total outstanding. */
export function calcAllPatientBalances(
  payments: Payment[],
  treatments: Treatment[],
): { byPatient: Map<string, PatientBalance>; totalOutstanding: number } {
  const patientIds = new Set<string>([...treatments.map((t) => t.patient_id), ...payments.map((p) => p.patient_id)])
  const byPatient = new Map<string, PatientBalance>()
  let totalOutstanding = 0
  for (const id of patientIds) {
    const fin = calcPatientBalance(
      payments.filter((p) => p.patient_id === id),
      treatments.filter((t) => t.patient_id === id),
    )
    byPatient.set(id, fin)
    if (fin.balance > 0) totalOutstanding += fin.balance
  }
  return { byPatient, totalOutstanding }
}
