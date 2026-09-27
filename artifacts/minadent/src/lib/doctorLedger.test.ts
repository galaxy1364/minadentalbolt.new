import { describe, it, expect } from 'vitest'
import { buildDoctorLedger } from './doctorLedger'
import type { LedgerTreatment, LedgerPayment, LedgerImplantCase } from './doctorLedger'
import { calcPatientBalance } from './finance'

function tx(over: Partial<LedgerTreatment> = {}): LedgerTreatment {
  return { doctor_id: 'd1', total_price: 1_000_000, status: 'completed', ...over }
}
function pay(over: Partial<LedgerPayment> = {}): LedgerPayment {
  return { encounter_id: 'e1', implant_case_id: null, amount: 500_000, status: 'completed', ...over }
}
function implant(over: Partial<LedgerImplantCase> = {}): LedgerImplantCase {
  return { id: 'i1', doctor_id: 'd1', total_cost: 20_000_000, paid_amount: 5_000_000, ...over }
}

const ENCOUNTERS = [
  { id: 'e1', doctor_id: 'd1' },
  { id: 'e2', doctor_id: 'd2' },
]

describe('buildDoctorLedger', () => {
  it('splits cost and payment by the treating doctor', () => {
    const l = buildDoctorLedger(
      [tx({ doctor_id: 'd1' }), tx({ doctor_id: 'd2', total_price: 400_000 })],
      [pay({ encounter_id: 'e1', amount: 300_000 }), pay({ encounter_id: 'e2', amount: 100_000 })],
      ENCOUNTERS,
    )
    const d1 = l.rows.find((r) => r.doctorId === 'd1')!
    const d2 = l.rows.find((r) => r.doctorId === 'd2')!
    expect(d1).toMatchObject({ cost: 1_000_000, paid: 300_000, balance: 700_000 })
    expect(d2).toMatchObject({ cost: 400_000, paid: 100_000, balance: 300_000 })
  })

  it('excludes cancelled treatments, exactly as the patient balance does', () => {
    const l = buildDoctorLedger([tx(), tx({ status: 'cancelled', total_price: 9_000_000 })], [], ENCOUNTERS)
    expect(l.totals.cost).toBe(1_000_000)
  })

  it('ignores payments that are not completed', () => {
    const l = buildDoctorLedger([tx()], [pay({ status: 'pending' })], ENCOUNTERS)
    expect(l.totals.paid).toBe(0)
  })

  it('shows unattributed money on its own row instead of spreading it', () => {
    // Dividing an unknown payment across doctors by share of cost gives
    // a table that balances and is wrong — worse than one that visibly
    // does not know.
    const l = buildDoctorLedger(
      [tx({ doctor_id: 'd1' })],
      [pay({ encounter_id: null, amount: 250_000 })],
      ENCOUNTERS,
    )
    expect(l.hasUnattributed).toBe(true)
    const unknown = l.rows.find((r) => r.doctorId === null)!
    expect(unknown.paid).toBe(250_000)
    expect(l.rows.find((r) => r.doctorId === 'd1')!.paid).toBe(0)
  })

  it('treats a payment pointing at an unknown encounter as unattributed', () => {
    const l = buildDoctorLedger([tx()], [pay({ encounter_id: 'gone' })], ENCOUNTERS)
    expect(l.rows.find((r) => r.doctorId === null)?.paid).toBe(500_000)
  })

  it('counts an implant case once, not twice', () => {
    // The case carries paid_amount AND there is a payment row linked to
    // it. Counting both would double the doctor's paid column while the
    // patient total stayed correct — the hardest kind of bug to spot.
    const l = buildDoctorLedger(
      [],
      [pay({ encounter_id: null, implant_case_id: 'i1', amount: 5_000_000 })],
      ENCOUNTERS,
      [implant()],
    )
    expect(l.totals.paid).toBe(5_000_000)
  })

  it('sinks the unattributed row to the bottom', () => {
    const l = buildDoctorLedger(
      [tx({ doctor_id: 'd1' })],
      [pay({ encounter_id: null })],
      ENCOUNTERS,
    )
    expect(l.rows[l.rows.length - 1].doctorId).toBeNull()
  })

  it('reports no doctors for an empty file rather than throwing', () => {
    const l = buildDoctorLedger([], [], [], [])
    expect(l.rows).toEqual([])
    expect(l.totals).toEqual({ cost: 0, paid: 0, balance: 0 })
    expect(l.hasUnattributed).toBe(false)
  })
})

describe('the ledger totals must equal the patient balance', () => {
  /** The invariant. If these ever disagree, one of the two screens is
   * lying to the clinic about money. */
  function assertAgrees(
    treatments: LedgerTreatment[],
    payments: LedgerPayment[],
    encounters: { id: string; doctor_id: string | null }[],
    implants: LedgerImplantCase[],
  ) {
    const ledger = buildDoctorLedger(treatments, payments, encounters, implants)
    const patient = calcPatientBalance(
      payments.map((p) => ({ ...p, patient_id: 'p1' })) as never,
      treatments.map((t) => ({ ...t, patient_id: 'p1' })) as never,
      implants.map((i) => ({ patient_id: 'p1', total_cost: i.total_cost, paid_amount: i.paid_amount })),
    )
    expect(ledger.totals.cost).toBe(patient.totalCost)
    expect(ledger.totals.paid).toBe(patient.paid)
    expect(ledger.totals.balance).toBe(patient.balance)
  }

  it('agrees on a plain two-doctor file', () => {
    assertAgrees(
      [tx({ doctor_id: 'd1' }), tx({ doctor_id: 'd2', total_price: 750_000 })],
      [pay({ encounter_id: 'e1', amount: 400_000 }), pay({ encounter_id: 'e2', amount: 200_000 })],
      ENCOUNTERS,
      [],
    )
  })

  it('agrees when a payment cannot be attributed', () => {
    assertAgrees([tx()], [pay({ encounter_id: null, amount: 320_000 })], ENCOUNTERS, [])
  })

  it('agrees when a treatment has no doctor recorded', () => {
    assertAgrees([tx({ doctor_id: null })], [pay({ amount: 100_000 })], ENCOUNTERS, [])
  })

  it('agrees when cancelled treatments are present', () => {
    assertAgrees(
      [tx(), tx({ status: 'cancelled', total_price: 5_000_000 })],
      [pay({ amount: 250_000 })],
      ENCOUNTERS,
      [],
    )
  })

  it('agrees with implant cases in the mix', () => {
    assertAgrees(
      [tx({ doctor_id: 'd2', total_price: 600_000 })],
      [pay({ encounter_id: 'e2', amount: 100_000 }), pay({ encounter_id: null, implant_case_id: 'i1', amount: 5_000_000 })],
      ENCOUNTERS,
      [implant()],
    )
  })

  it('agrees when the patient has paid more than they owe', () => {
    // Overpayment is real (a deposit before treatment). The balance goes
    // negative and both sides must agree that it did.
    assertAgrees([tx({ total_price: 100_000 })], [pay({ amount: 900_000 })], ENCOUNTERS, [])
  })

  it('agrees on an empty file', () => {
    assertAgrees([], [], [], [])
  })
})
