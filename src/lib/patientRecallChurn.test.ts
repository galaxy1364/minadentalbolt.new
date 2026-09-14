import { describe, it, expect } from 'vitest'
import {
  findPostOpCheckups,
  findSutureRemovalReminders,
  findHygieneRecalls,
  computePatientRetentionProfile,
  calculateClinicRetentionSummary,
} from './patientRecallChurn'
import type { Patient, Treatment, AppointmentWithRelations, Encounter, Payment } from '../types'

describe('patientRecallChurn', () => {
  const baseDate = new Date('2026-09-14T10:00:00Z')

  const mockPatient: Patient = {
    id: 'p1',
    clinic_id: 'c1',
    first_name: 'علیرضا',
    last_name: 'امینی',
    is_active: true,
  } as unknown as Patient

  it('finds post-op checkup candidates within 24 to 48 hours post surgery', () => {
    const yesterday = new Date(baseDate.getTime() - 86400000 * 1.5).toISOString()
    const fiveDaysAgo = new Date(baseDate.getTime() - 86400000 * 5).toISOString()

    const treatments: Treatment[] = [
      {
        id: 't1',
        clinic_id: 'c1',
        patient_id: 'p1',
        encounter_id: 'e1',
        doctor_id: 'd1',
        tooth_number: '48',
        procedure_name: 'جراحی دندان عقل نهفته',
        procedure_category: 'surgery',
        status: 'completed',
        created_at: yesterday,
      } as unknown as Treatment,
      {
        id: 't2',
        clinic_id: 'c1',
        patient_id: 'p1',
        encounter_id: 'e1',
        doctor_id: 'd1',
        tooth_number: '11',
        procedure_name: 'ترمیم کامپوزیت سطحی',
        procedure_category: 'restorative',
        status: 'completed',
        created_at: yesterday,
      } as unknown as Treatment,
      {
        id: 't3',
        clinic_id: 'c1',
        patient_id: 'p1',
        encounter_id: 'e1',
        doctor_id: 'd1',
        tooth_number: '36',
        procedure_name: 'جراحی ایمپلنت',
        procedure_category: 'surgery',
        status: 'completed',
        created_at: fiveDaysAgo, // Outside 24-48h window
      } as unknown as Treatment,
    ]

    const reminders = findPostOpCheckups(treatments, [mockPatient], baseDate)
    expect(reminders).toHaveLength(1)
    expect(reminders[0].patient.id).toBe('p1')
    expect(reminders[0].detail).toContain('جراحی دندان عقل')
    expect(reminders[0].smsMessage).toContain('جویای حال شما هستیم')
  })

  it('detects suture removal window (7 to 10 days) and skips if appointment already exists', () => {
    const eightDaysAgo = new Date(baseDate.getTime() - 86400000 * 8).toISOString()

    const treatments: Treatment[] = [
      {
        id: 't-suture',
        clinic_id: 'c1',
        patient_id: 'p1',
        encounter_id: 'e1',
        doctor_id: 'd1',
        tooth_number: '16',
        procedure_name: 'جراحی فلپ و پیوند استخوان',
        procedure_category: 'surgery',
        status: 'completed',
        created_at: eightDaysAgo,
      } as unknown as Treatment,
    ]

    // Without booked appointment -> reminder generated
    const remindersWithoutAppt = findSutureRemovalReminders(treatments, [mockPatient], [], baseDate)
    expect(remindersWithoutAppt).toHaveLength(1)
    expect(remindersWithoutAppt[0].detail).toContain('موعد کشیدن بخیه')

    // With future appointment -> skipped
    const futureAppt = [
      {
        id: 'a1',
        patient_id: 'p1',
        date: '2026-09-15',
        status: 'scheduled',
      } as unknown as AppointmentWithRelations,
    ]
    const remindersWithAppt = findSutureRemovalReminders(treatments, [mockPatient], futureAppt, baseDate)
    expect(remindersWithAppt).toHaveLength(0)
  })

  it('detects 6-month hygiene / recall candidates', () => {
    const sevenMonthsAgo = new Date(baseDate.getTime() - 86400000 * 210).toISOString()
    const encounters: Encounter[] = [
      {
        id: 'enc-old',
        clinic_id: 'c1',
        patient_id: 'p1',
        encounter_date: sevenMonthsAgo,
      } as unknown as Encounter,
    ]

    const recalls = findHygieneRecalls([mockPatient], encounters, [], 180, baseDate)
    expect(recalls).toHaveLength(1)
    expect(recalls[0].detail).toContain('چکاپ دوره‌ای ۶ ماهه')
  })

  it('evaluates patient retention score and assigns correct risk tier', () => {
    const recentDate = new Date(baseDate.getTime() - 86400000 * 15).toISOString().slice(0, 10)
    const longAgoDate = new Date(baseDate.getTime() - 86400000 * 400).toISOString().slice(0, 10)

    // Patient A: Loyal & Active
    const loyalProfile = computePatientRetentionProfile({
      patient: mockPatient,
      appointments: [
        { patient_id: 'p1', date: recentDate, status: 'completed' } as unknown as AppointmentWithRelations,
        { patient_id: 'p1', date: recentDate, status: 'completed' } as unknown as AppointmentWithRelations,
      ],
      treatments: [
        { patient_id: 'p1', status: 'completed', total_price: 1000000 } as unknown as Treatment,
      ],
      payments: [
        { patient_id: 'p1', amount: 1000000 } as unknown as Payment,
      ],
      today: baseDate,
    })

    expect(loyalProfile.tier).toBe('loyal')
    expect(loyalProfile.score).toBeGreaterThanOrEqual(80)
    expect(loyalProfile.riskFactors).toHaveLength(0)

    // Patient B: Churned (long absence, high debt, repeated no-shows)
    const churnedPatient = { id: 'p2', first_name: 'مهدی', last_name: 'کاظمی', is_active: true } as unknown as Patient
    const churnedProfile = computePatientRetentionProfile({
      patient: churnedPatient,
      appointments: [
        { patient_id: 'p2', date: longAgoDate, status: 'no_show' } as unknown as AppointmentWithRelations,
        { patient_id: 'p2', date: longAgoDate, status: 'cancelled' } as unknown as AppointmentWithRelations,
      ],
      treatments: [
        { patient_id: 'p2', status: 'in_progress', total_price: 5000000 } as unknown as Treatment,
      ],
      payments: [],
      today: baseDate,
    })

    expect(churnedProfile.tier).toBe('churned')
    expect(churnedProfile.score).toBeLessThan(40)
    expect(churnedProfile.riskFactors.length).toBeGreaterThan(0)
  })

  it('aggregates clinic retention summary with active rates and at-risk rankings', () => {
    const p1 = { id: 'p1', first_name: 'سارا', is_active: true } as unknown as Patient
    const p2 = { id: 'p2', first_name: 'امیر', is_active: true } as unknown as Patient

    const summary = calculateClinicRetentionSummary({
      patients: [p1, p2],
      appointments: [
        { patient_id: 'p1', date: '2026-09-10', status: 'completed' } as unknown as AppointmentWithRelations,
      ],
    })

    expect(summary.totalPatients).toBe(2)
    expect(summary.retentionRatePercent).toBeGreaterThanOrEqual(0)
    expect(summary.retentionRatePercent).toBeLessThanOrEqual(100)
    expect(Array.isArray(summary.atRiskPatients)).toBe(true)
  })
})
