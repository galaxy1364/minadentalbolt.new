import { describe, it, expect } from 'vitest'
import {
  calculateHouseholdBalance,
  generateHouseholdStatementHtml,
  formatCrossFamilyPaymentNote,
} from './familyBilling'
import { Patient, Payment, Treatment, ImplantCase } from '../types'

function makeMockPatient(
  id: string,
  firstName: string,
  lastName: string,
  familyHeadId?: string | null,
  relation?: string | null,
): Patient {
  return {
    id,
    clinic_id: 'clinic-1',
    first_name: firstName,
    last_name: lastName,
    national_id: `00${id}1234567`,
    phone: `0912000000${id}`,
    birth_date: null,
    gender: 'male',
    address: null,
    medical_conditions: null,
    allergies: null,
    insurance_info: null,
    insurance_number: null,
    notes: null,
    vip_level: 0,
    family_head_id: familyHeadId ?? null,
    family_relationship: relation ?? null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  } as unknown as Patient
}

describe('familyBilling — Household Master Account', () => {
  const father = makeMockPatient('f1', 'محمد', 'احمدی', null, 'head')
  const mother = makeMockPatient('m1', 'مریم', 'کاظمی', 'f1', 'spouse')
  const son = makeMockPatient('s1', 'سینا', 'احمدی', 'f1', 'child')
  const stranger = makeMockPatient('p99', 'علی', 'رضایی')

  const allPatients = [father, mother, son, stranger]

  const mockTreatments: Treatment[] = [
    // Father: 1,000,000 total, 200,000 insurance => patient_share = 800,000
    {
      id: 't-1',
      clinic_id: 'clinic-1',
      patient_id: 'f1',
      cost: 1000000,
      insurance_share: 200000,
      patient_share: 800000,
      status: 'completed',
      created_at: '2026-01-01',
    } as any,
    // Son (ortho): 5,000,000 total, 0 insurance => patient_share = 5,000,000
    {
      id: 't-2',
      clinic_id: 'clinic-1',
      patient_id: 's1',
      cost: 5000000,
      insurance_share: 0,
      patient_share: 5000000,
      status: 'completed',
      created_at: '2026-01-02',
    } as any,
  ]

  const mockPayments: Payment[] = [
    // Father paid 1,000,000
    {
      id: 'p-1',
      clinic_id: 'clinic-1',
      patient_id: 'f1',
      amount: 1000000,
      payment_date: '2026-01-01',
      method: 'card',
      status: 'completed',
      is_active: true,
    } as any,
    // Son paid 2,000,000
    {
      id: 'p-2',
      clinic_id: 'clinic-1',
      patient_id: 's1',
      amount: 2000000,
      payment_date: '2026-01-02',
      method: 'cash',
      status: 'completed',
      is_active: true,
    } as any,
  ]

  it('returns null for an unlinked patient with no household head or dependents', () => {
    const res = calculateHouseholdBalance('p99', allPatients, mockPayments, mockTreatments)
    expect(res).toBeNull()
  })

  it('calculates aggregated household balance when queried from head of household', () => {
    const res = calculateHouseholdBalance('f1', allPatients, mockPayments, mockTreatments)
    expect(res).not.toBeNull()
    expect(res?.head.id).toBe('f1')
    expect(res?.members.length).toBe(3) // father, mother, son

    // Total cost: 1,000,000 + 5,000,000 = 6,000,000
    expect(res?.totalCost).toBe(6000000)
    // Total insurance: 200,000
    expect(res?.totalInsurance).toBe(200000)
    // Total patient share: 800,000 + 5,000,000 = 5,800,000
    expect(res?.totalPatientShare).toBe(5800000)
    // Total paid: 1,000,000 + 2,000,000 = 3,000,000
    expect(res?.totalPaid).toBe(3000000)
    // Net remaining debt: 5,800,000 - 3,000,000 = 2,800,000
    expect(res?.netRemaining).toBe(2800000)
    expect(res?.status).toBe('debtor')
  })

  it('calculates identical aggregated household balance when queried from a dependent (son)', () => {
    const res = calculateHouseholdBalance('s1', allPatients, mockPayments, mockTreatments)
    expect(res).not.toBeNull()
    expect(res?.head.id).toBe('f1')
    expect(res?.totalPaid).toBe(3000000)
    expect(res?.netRemaining).toBe(2800000)
  })

  it('correctly reports cleared status when all household balances are paid', () => {
    const extraPayment: Payment = {
      id: 'p-3',
      clinic_id: 'clinic-1',
      patient_id: 's1',
      amount: 2800000,
      payment_date: '2026-01-03',
      method: 'card',
      status: 'completed',
      is_active: true,
    } as any

    const res = calculateHouseholdBalance('f1', allPatients, [...mockPayments, extraPayment], mockTreatments)
    expect(res?.netRemaining).toBe(0)
    expect(res?.status).toBe('cleared')
  })

  it('generates valid printable statement HTML with members and financial metrics', () => {
    const profile = calculateHouseholdBalance('f1', allPatients, mockPayments, mockTreatments)
    expect(profile).not.toBeNull()

    const html = generateHouseholdStatementHtml(profile!)
    expect(html).toContain('صورت‌حساب مالی تجمیعی خانوار')
    expect(html).toContain('محمد احمدی')
    expect(html).toContain('سینا احمدی')
    expect(html).toContain('سرپرست خانوار')
    expect(html).toContain('امضای سرپرست خانوار')
  })

  it('formats cross family payment note appropriately', () => {
    const note = formatCrossFamilyPaymentNote('محمد احمدی', 'سینا احمدی', 'فرزند')
    expect(note).toContain('محمد احمدی')
    expect(note).toContain('سینا احمدی')
    expect(note).toContain('فرزند')
  })
})
