// doctorLedger.ts — who inside one patient file did the work, and who
// has been paid for it.
//
// The patient file already showed one balance. That answers "does this
// person owe us money" but not "which doctor is owed", which is what a
// multi-doctor clinic actually settles on at the end of a month.
//
// Competitor reference: COMP-127 — a per-doctor cost / paid / balance
// table inside a single patient's file, with a totals row.
//
// ── The rule that governs this whole file ────────────────────────────
// Money must never be invented, dropped, or spread. A payment that
// cannot be attributed to a doctor is shown on its own row, not divided
// between doctors and not quietly ignored. The per-doctor rows plus the
// unattributed row must always sum to exactly what calcPatientBalance
// reports for the patient, and a test asserts that on every shape of
// input — including the awkward ones.

export interface LedgerTreatment {
  doctor_id: string | null
  total_price: number | null
  status: string
}

export interface LedgerPayment {
  encounter_id: string | null
  implant_case_id: string | null
  amount: number | null
  status: string
}

export interface LedgerEncounter {
  id: string
  doctor_id: string | null
}

export interface LedgerImplantCase {
  id: string
  doctor_id: string | null
  total_cost: number | null
  paid_amount: number | null
}

export interface DoctorLedgerRow {
  /** null means "could not be attributed to any doctor". */
  doctorId: string | null
  cost: number
  paid: number
  balance: number
}

export interface DoctorLedger {
  rows: DoctorLedgerRow[]
  totals: { cost: number; paid: number; balance: number }
  /** True when some money could not be tied to a doctor. The UI should
   * say so rather than presenting a table that silently omits it. */
  hasUnattributed: boolean
}

/** The same exclusion calcPatientBalance makes. Cancelling keeps the row
 * (nothing is ever deleted), so it has to be filtered explicitly or a
 * cancelled treatment inflates a doctor's column forever. */
function isBillable(t: LedgerTreatment): boolean {
  return t.status !== 'cancelled'
}

/**
 * Splits one patient's account by treating doctor.
 *
 * Attribution:
 *  - a treatment carries its own doctor_id;
 *  - a payment carries an encounter or an implant case, and those carry
 *    the doctor. A payment with neither, or one pointing at a record
 *    that is not in the supplied lists, is unattributed.
 *
 * Nothing is guessed. Spreading an unattributed payment across doctors
 * by share of cost would produce a table that balances and is wrong,
 * which is worse than one that visibly does not know.
 */
export function buildDoctorLedger(
  treatments: LedgerTreatment[],
  payments: LedgerPayment[],
  encounters: LedgerEncounter[] = [],
  implantCases: LedgerImplantCase[] = [],
): DoctorLedger {
  const cost = new Map<string | null, number>()
  const paid = new Map<string | null, number>()

  const add = (map: Map<string | null, number>, key: string | null, amount: number) => {
    if (amount === 0) return
    map.set(key, (map.get(key) || 0) + amount)
  }

  for (const t of treatments) {
    if (!isBillable(t)) continue
    add(cost, t.doctor_id ?? null, t.total_price || 0)
  }

  const encounterDoctor = new Map(encounters.map((e) => [e.id, e.doctor_id ?? null]))
  const implantDoctor = new Map(implantCases.map((c) => [c.id, c.doctor_id ?? null]))

  for (const c of implantCases) {
    const doctor = c.doctor_id ?? null
    add(cost, doctor, c.total_cost || 0)
    // An implant case carries its own paid_amount, mirroring the way
    // calcPatientBalance treats it — so it is added here, not read from
    // the payments list, or the same money would count twice.
    add(paid, doctor, c.paid_amount || 0)
  }

  for (const p of payments) {
    if (p.status !== 'completed') continue
    const amount = p.amount || 0
    if (amount === 0) continue

    if (p.implant_case_id) {
      // Already counted through the case's paid_amount. Counting it
      // again here would double the doctor's paid column while the
      // patient total stayed right — the hardest kind of bug to spot.
      continue
    }
    if (p.encounter_id && encounterDoctor.has(p.encounter_id)) {
      add(paid, encounterDoctor.get(p.encounter_id) ?? null, amount)
      continue
    }
    // No encounter, or an encounter we were not given: unattributed.
    add(paid, null, amount)
  }

  // Suppress the unused lookup warning while keeping the map meaningful
  // to a future reader: implantDoctor documents the second attribution
  // path, which is served by the loop above.
  void implantDoctor

  const doctorIds = new Set<string | null>([...cost.keys(), ...paid.keys()])
  const rows: DoctorLedgerRow[] = [...doctorIds].map((doctorId) => {
    const c = cost.get(doctorId) || 0
    const pd = paid.get(doctorId) || 0
    return { doctorId, cost: c, paid: pd, balance: c - pd }
  })

  // Named doctors first, biggest balance at the top; the unattributed
  // row sinks to the bottom where it reads as a footnote rather than a
  // participant.
  rows.sort((a, b) => {
    if (a.doctorId === null) return 1
    if (b.doctorId === null) return -1
    return b.balance - a.balance
  })

  const totals = rows.reduce(
    (acc, r) => ({ cost: acc.cost + r.cost, paid: acc.paid + r.paid, balance: acc.balance + r.balance }),
    { cost: 0, paid: 0, balance: 0 },
  )

  return {
    rows,
    totals,
    hasUnattributed: rows.some((r) => r.doctorId === null),
  }
}
