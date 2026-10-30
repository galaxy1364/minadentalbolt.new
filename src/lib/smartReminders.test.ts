// smartReminders.test.ts — coverage for the clinic alarm engine (no fake assertions)
import { describe, it, expect } from 'vitest'
import {
  findBirthdays,
  findDebtors,
  findLapsedPatients,
  findDueInstallments,
  findNoShows,
  findUnfinishedTreatmentFollowups,
  findUnresolvedPastAppointments,
  findDueCheques,
  getUrgentClinicAlarms,
  toIsoDate,
} from './smartReminders'
import type { Patient, Treatment, Payment, Encounter, Installment, Cheque } from '../types'
import type { AppointmentWithRelations } from '../types'

// ─── fixtures ─────────────────────────────────────────────────

const TODAY = new Date('2026-09-16')
const TODAY_STR = '2026-09-16'

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1', clinic_id: 'clinic-1', first_name: 'سارا', last_name: 'حسینی',
    national_id: null, phone: null, phone2: null, email: null,
    birth_date: null, gender: 'female', blood_type: null,
    address: null, city: null, province: null, postal_code: null,
    medical_history: null, allergies: null, medications: null,
    medical_conditions: null, insurance_info: null, insurance_number: null,
    notes: null, vip_level: 0, file_number: null,
    family_head_id: null, family_relationship: null,
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    is_active: true, sync_version: 1, avatar_url: null, file_number_manual: null,
    ...overrides,
  } as Patient
}

function makeAppt(overrides: Partial<AppointmentWithRelations> = {}): AppointmentWithRelations {
  return {
    id: 'a1', patient_id: 'p1', doctor_id: null, unit_id: null,
    date: TODAY_STR, start_time: '09:00', end_time: '10:00',
    type: 'consultation', status: 'scheduled', notes: null,
    estimated_fee: null, recurrence_group_id: null,
    patient: makePatient(), doctor: null, unit: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    is_active: true,
    ...overrides,
  } as AppointmentWithRelations
}

function makeTreatment(overrides: Partial<Treatment> = {}): Treatment {
  return {
    id: 't1', patient_id: 'p1', doctor_id: null, tooth_number: null,
    procedure_id: null, status: 'planned', fee: 1000000, discount: 0,
    notes: null, created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z', is_active: true,
    ...overrides,
  } as Treatment
}

function makeInstallment(overrides: Partial<Installment> = {}): Installment {
  return {
    id: 'i1', patient_id: 'p1', payment_plan_id: 'pp1',
    amount: 500000, due_date: '2026-09-01', status: 'pending',
    paid_at: null, notes: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    is_active: true,
    ...overrides,
  } as Installment
}

function makeCheque(overrides: Partial<Cheque> = {}): Cheque {
  return {
    id: 'c1', patient_id: 'p1', cheque_number: '123456', bank_name: 'ملت',
    amount: 2000000, due_date: TODAY_STR, status: 'pending',
    sayad_id: null, notes: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    is_active: true,
    ...overrides,
  } as Cheque
}

// ─── toIsoDate ────────────────────────────────────────────────

describe('toIsoDate', () => {
  it('extracts date from Date object', () => {
    expect(toIsoDate(new Date('2026-09-16'))).toBe('2026-09-16')
  })
  it('slices ISO string to date part', () => {
    expect(toIsoDate('2026-09-16T10:30:00Z')).toBe('2026-09-16')
  })
})

// ─── findBirthdays ────────────────────────────────────────────

describe('findBirthdays', () => {
  it('detects birthday today', () => {
    const p = makePatient({ birth_date: '2000-09-16' })
    const r = findBirthdays([p], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].category).toBe('birthday')
  })
  it('ignores birthday on wrong day', () => {
    expect(findBirthdays([makePatient({ birth_date: '1990-03-15' })], TODAY)).toHaveLength(0)
  })
  it('ignores inactive patients', () => {
    expect(findBirthdays([makePatient({ birth_date: '2000-09-16', is_active: false })], TODAY)).toHaveLength(0)
  })
  it('handles multiple birthdays same day', () => {
    const p1 = makePatient({ id: 'p1', birth_date: '1985-09-16' })
    const p2 = makePatient({ id: 'p2', birth_date: '1990-09-16' })
    expect(findBirthdays([p1, p2], TODAY)).toHaveLength(2)
  })
})

// ─── findDebtors ──────────────────────────────────────────────

describe('findDebtors', () => {
  function makePayment(amount: number, patient_id = 'p1'): Payment {
    return {
      id: 'pay1', patient_id, amount, method: 'cash',
      treatment_id: null, doctor_id: null, notes: null,
      status: 'completed', implant_case_id: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      is_active: true,
    } as unknown as Payment
  }

  it('flags patient above balance threshold', () => {
    const p = makePatient()
    const t = { ...makeTreatment({ total_price: 2000000 } as any), total_price: 2000000, patient_share: null }
    const r = findDebtors([p], [t as any], [makePayment(500000)], [], 500000)
    expect(r).toHaveLength(1)
    expect(r[0].category).toBe('debtor')
  })
  it('ignores patient below threshold', () => {
    const p = makePatient()
    const t = { ...makeTreatment({ total_price: 600000 } as any), total_price: 600000, patient_share: null }
    // balance = 100,000 < minBalance 500,000
    expect(findDebtors([p], [t as any], [makePayment(500000)], [], 500000)).toHaveLength(0)
  })
  it('sorts by balance descending', () => {
    const p1 = makePatient({ id: 'p1' })
    const p2 = makePatient({ id: 'p2' })
    const t1 = { ...makeTreatment({ id: 't1', patient_id: 'p1', total_price: 5000000 } as any), total_price: 5000000, patient_share: null }
    const t2 = { ...makeTreatment({ id: 't2', patient_id: 'p2', total_price: 2000000 } as any), total_price: 2000000, patient_share: null }
    const r = findDebtors([p1, p2], [t1 as any, t2 as any], [], [], 1)
    expect(r.length).toBeGreaterThanOrEqual(2)
    expect(r[0].priority).toBeGreaterThan(r[1].priority)
  })
})

// ─── findLapsedPatients ───────────────────────────────────────

describe('findLapsedPatients', () => {
  const enc = (id: string, patient_id: string, date: string): Encounter =>
    ({ id, patient_id, doctor_id: null, encounter_date: date, chief_complaint: null, diagnosis: null, notes: null, created_at: date + 'T00:00:00Z', updated_at: date + 'T00:00:00Z', is_active: true } as unknown as Encounter)

  it('flags patient not seen in 181+ days', () => {
    const p = makePatient()
    const r = findLapsedPatients([p], [enc('e1', 'p1', '2026-03-05')], 180)
    expect(r).toHaveLength(1)
    expect(r[0].category).toBe('lapsed')
  })
  it('ignores patient seen recently', () => {
    const p = makePatient()
    expect(findLapsedPatients([p], [enc('e1', 'p1', '2026-09-01')], 180)).toHaveLength(0)
  })
  it('uses most recent encounter', () => {
    const p = makePatient()
    const old = enc('e1', 'p1', '2025-01-01')
    const recent = enc('e2', 'p1', '2026-09-10')
    expect(findLapsedPatients([p], [old, recent], 180)).toHaveLength(0)
  })
})

// ─── findDueInstallments ──────────────────────────────────────

describe('findDueInstallments', () => {
  it('flags overdue unpaid installment', () => {
    const p = makePatient()
    const r = findDueInstallments([makeInstallment({ due_date: '2026-09-01' })], [p], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].category).toBe('installment_due')
    expect(r[0].id).toBe('installment-i1')
  })
  it('flags installment due today', () => {
    const p = makePatient()
    const r = findDueInstallments([makeInstallment({ due_date: TODAY_STR })], [p], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].detail).toContain('امروز')
  })
  it('ignores paid installments', () => {
    const p = makePatient()
    expect(findDueInstallments([makeInstallment({ status: 'paid' } as any)], [p], TODAY)).toHaveLength(0)
  })
  it('ignores future installments', () => {
    const p = makePatient()
    expect(findDueInstallments([makeInstallment({ due_date: '2026-12-01' })], [p], TODAY)).toHaveLength(0)
  })
})

// ─── findNoShows ──────────────────────────────────────────────

describe('findNoShows', () => {
  it('flags recent no_show without rebooking', () => {
    const p = makePatient()
    const a = makeAppt({ date: '2026-09-10', status: 'no_show' })
    const r = findNoShows([a], [p], 30)
    expect(r).toHaveLength(1)
    expect(r[0].category).toBe('no_show')
  })
  it('ignores if patient was rebooked after no-show', () => {
    const p = makePatient()
    const ns = makeAppt({ id: 'a1', date: '2026-09-05', status: 'no_show' })
    const rb = makeAppt({ id: 'a2', date: '2026-09-15', status: 'scheduled' })
    expect(findNoShows([ns, rb], [p], 30)).toHaveLength(0)
  })
  it('ignores no-shows outside lookback window', () => {
    const p = makePatient()
    const old = makeAppt({ id: 'a3', date: '2026-07-01', status: 'no_show' })
    expect(findNoShows([old], [p], 30)).toHaveLength(0)
  })
})

// ─── findUnfinishedTreatmentFollowups ────────────────────────

describe('findUnfinishedTreatmentFollowups', () => {
  it('flags open treatment without future appointment', () => {
    const p = makePatient()
    const t = makeTreatment({ status: 'in_progress' })
    const past = makeAppt({ date: '2026-09-01', status: 'completed' })
    const r = findUnfinishedTreatmentFollowups([t], [past], [p], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].category).toBe('unfinished_treatment')
  })
  it('ignores patient with future appointment', () => {
    const p = makePatient()
    const t = makeTreatment({ status: 'in_progress' })
    const fut = makeAppt({ date: '2026-10-01', status: 'scheduled' })
    expect(findUnfinishedTreatmentFollowups([t], [fut], [p], TODAY)).toHaveLength(0)
  })
  it('ignores completed/cancelled treatments', () => {
    const p = makePatient()
    expect(findUnfinishedTreatmentFollowups(
      [makeTreatment({ status: 'completed' }), makeTreatment({ id: 't2', status: 'cancelled' })],
      [], [p], TODAY
    )).toHaveLength(0)
  })
})

// ─── findUnresolvedPastAppointments ───────────────────────────

describe('findUnresolvedPastAppointments', () => {
  it('flags past appointment still scheduled', () => {
    const p = makePatient()
    const a = makeAppt({ date: '2026-09-10', status: 'scheduled', end_time: '10:00' })
    const r = findUnresolvedPastAppointments([a], [p], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].category).toBe('unresolved_appointment')
  })
  it('ignores completed or cancelled', () => {
    const p = makePatient()
    const c = makeAppt({ id: 'a1', date: '2026-09-10', status: 'completed' })
    const x = makeAppt({ id: 'a2', date: '2026-09-10', status: 'cancelled' })
    expect(findUnresolvedPastAppointments([c, x], [p], TODAY)).toHaveLength(0)
  })
  it('ignores future appointments', () => {
    const p = makePatient()
    const f = makeAppt({ date: '2026-10-01', status: 'scheduled' })
    expect(findUnresolvedPastAppointments([f], [p], TODAY)).toHaveLength(0)
  })
})

// ─── findDueCheques ───────────────────────────────────────────

describe('findDueCheques', () => {
  it('flags cheque due today', () => {
    const p = makePatient()
    const r = findDueCheques([makeCheque()], [p], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].category).toBe('cheque_due')
    expect(r[0].id).toBe('cheque-c1')
  })
  it('flags bounced cheque', () => {
    const p = makePatient()
    const r = findDueCheques([makeCheque({ status: 'bounced', due_date: '2026-08-01' })], [p], TODAY)
    expect(r).toHaveLength(1)
    expect(r[0].detail).toContain('برگشتی')
    expect(r[0].priority).toBeGreaterThan(150000)
  })
  it('ignores cleared and cancelled cheques', () => {
    const p = makePatient()
    expect(findDueCheques([makeCheque({ status: 'cleared' }), makeCheque({ id: 'c2', status: 'cancelled' })], [p], TODAY)).toHaveLength(0)
  })
  it('bounced prioritised over overdue over today', () => {
    const p = makePatient()
    const b = makeCheque({ id: 'c_b', status: 'bounced', due_date: '2026-08-01' })
    const o = makeCheque({ id: 'c_o', status: 'pending', due_date: '2026-09-01' })
    const d = makeCheque({ id: 'c_d', status: 'pending', due_date: TODAY_STR })
    const r = findDueCheques([d, o, b], [p], TODAY)
    expect(r[0].id).toBe('cheque-c_b')
    expect(r[1].id).toBe('cheque-c_o')
  })
})

// ─── getUrgentClinicAlarms ────────────────────────────────────

describe('getUrgentClinicAlarms', () => {
  it('empty bundle when no data', () => {
    const b = getUrgentClinicAlarms({ patients: [], today: TODAY })
    expect(b.total).toBe(0)
    expect(b.all).toHaveLength(0)
    expect(b.hasCriticalItems).toBe(false)
  })
  it('counts cheque_due and sets hasUrgentFinancial', () => {
    const p = makePatient()
    const cheque = makeCheque()
    const b = getUrgentClinicAlarms({ patients: [p], cheques: [cheque], today: TODAY })
    expect(b.counts.cheque_due).toBe(1)
    expect(b.hasUrgentFinancial).toBe(true)
    expect(b.hasCriticalItems).toBe(true)
  })
  it('sets hasUrgentClinical for overdue lab order', () => {
    const p = makePatient()
    const labOrder = {
      id: 'lo1', patient_id: 'p1', doctor_id: null, treatment_id: null,
      work_type: 'پروتز', status: 'sent', deadline: '2026-09-01',
      received_at: null, delivery_appointment_id: null, notes: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', is_active: true,
    }
    const b = getUrgentClinicAlarms({ patients: [p], labOrders: [labOrder] as any, today: TODAY })
    expect(b.hasUrgentClinical).toBe(true)
  })
  it('includes birthday in all results', () => {
    const p = makePatient({ birth_date: '1990-09-16' })
    const b = getUrgentClinicAlarms({ patients: [p], today: TODAY })
    expect(b.counts.birthday).toBe(1)
    expect(b.all.some(r => r.category === 'birthday')).toBe(true)
  })
  it('countsByCategory equals counts', () => {
    const b = getUrgentClinicAlarms({ patients: [], today: TODAY })
    expect(b.countsByCategory).toEqual(b.counts)
  })
})
