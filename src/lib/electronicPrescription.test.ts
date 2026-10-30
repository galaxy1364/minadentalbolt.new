import { describe, it, expect } from 'vitest'
import {
  parseMedicationsText,
  validateElectronicTrackingCode,
  exportElectronicPrescriptionPayload,
  formatPrescriptionForInsurancePortal,
  formatPrescriptionPatientSms,
  renderElectronicTrackingBadgeHtml,
  INSURANCE_SYSTEMS,
} from './electronicPrescription'
import type { Prescription, Patient, Doctor } from '../types'

describe('parseMedicationsText', () => {
  it('parses standard 3-part prescription text', () => {
    const text = 'آموکسی‌سیلین | ۵۰۰mg | هر ۸ ساعت به مدت ۷ روز\nایبوپروفن | ۴۰۰mg | هنگام درد'
    const items = parseMedicationsText(text)
    expect(items).toHaveLength(2)
    expect(items[0].drugName).toBe('آموکسی‌سیلین')
    expect(items[0].dosage).toBe('۵۰۰mg')
    expect(items[0].frequency).toBe('هر ۸ ساعت به مدت ۷ روز')
    expect(items[1].drugName).toBe('ایبوپروفن')
  })

  it('handles empty and malformed lines gracefully', () => {
    expect(parseMedicationsText('')).toEqual([])
    expect(parseMedicationsText('   \n\n  ')).toEqual([])
    const single = parseMedicationsText('دهان‌شویه کلرهگزیدین')
    expect(single).toHaveLength(1)
    expect(single[0].drugName).toBe('دهان‌شویه کلرهگزیدین')
    expect(single[0].frequency).toBe('طبق دستور پزشک')
  })
})

describe('validateElectronicTrackingCode', () => {
  it('accepts valid alphanumeric tracking codes', () => {
    expect(validateElectronicTrackingCode('982341').isValid).toBe(true)
    expect(validateElectronicTrackingCode('TMN-48912').isValid).toBe(true)
    expect(validateElectronicTrackingCode('SLM98412').isValid).toBe(true)
  })

  it('rejects empty or too short / too long tracking codes', () => {
    expect(validateElectronicTrackingCode('').isValid).toBe(false)
    expect(validateElectronicTrackingCode('12').isValid).toBe(false)
    expect(validateElectronicTrackingCode('1234567890123456789').isValid).toBe(false)
  })

  it('rejects illegal characters', () => {
    expect(validateElectronicTrackingCode('123@#$').isValid).toBe(false)
  })
})

describe('exportElectronicPrescriptionPayload & formatters', () => {
  const mockPatient = {
    id: 'pat-1',
    clinic_id: 'clinic-1',
    first_name: 'رضا',
    last_name: 'حسینی',
    national_id: '0012345678',
    phone: '09121112233',
    birth_date: null,
    gender: 'male',
    address: null,
    medical_conditions: null,
    allergies: null,
    insurance_info: 'تامین اجتماعی',
    insurance_number: '987654321',
    notes: null,
    vip_level: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  } as unknown as Patient

  const mockDoctor = {
    id: 'doc-1',
    clinic_id: 'clinic-1',
    staff_id: 'staff-1',
    name: 'سارا رضایی',
    license_number: '12345',
    medical_council_number: '12345',
    specialty: 'متخصص درمان ریشه',
    color: '#0ea5e9',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    sync_version: 1,
  } as unknown as Doctor

  const mockPrescription: Prescription = {
    id: 'rx-1',
    clinic_id: 'clinic-1',
    patient_id: 'pat-1',
    doctor_id: 'doc-1',
    encounter_id: null,
    medications: { text: 'آموکسی‌سیلین | ۵۰۰mg | ۳ بار در روز' },
    notes: 'همراه با غذا مصرف شود',
    status: 'active',
    electronic_tracking_code: 'TMN-98214',
    insurance_system: 'tamin',
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
  }

  it('exports FHIR MedicationRequest payload accurately', () => {
    const payload = exportElectronicPrescriptionPayload(mockPrescription, mockPatient, mockDoctor)
    expect(payload.resourceType).toBe('MedicationRequest')
    expect(payload.trackingCode).toBe('TMN-98214')
    expect(payload.insuranceSystem).toBe('tamin')
    expect(payload.subject.fullName).toBe('رضا حسینی')
    expect(payload.subject.nationalId).toBe('0012345678')
    expect(payload.requester.name).toBe('دکتر سارا رضایی')
    expect(payload.medications).toHaveLength(1)
    expect(payload.medications[0].drugName).toBe('آموکسی‌سیلین')
  })

  it('formats portal clipboard summary', () => {
    const summary = formatPrescriptionForInsurancePortal(mockPrescription, mockPatient, mockDoctor)
    expect(summary).toContain('TMN-98214')
    expect(summary).toContain('رضا حسینی')
    expect(summary).toContain('آموکسی‌سیلین')
    expect(summary).toContain('دکتر سارا رضایی')
  })

  it('formats patient SMS notification with Persian digits', () => {
    const sms = formatPrescriptionPatientSms(mockPrescription, mockPatient)
    expect(sms).toContain('رضا حسینی')
    expect(sms).toContain('کد رهگیری نسخه:')
    expect(sms).toContain('داروخانه')
  })

  it('renders HTML badge when tracking code is present', () => {
    const badge = renderElectronicTrackingBadgeHtml(mockPrescription)
    expect(badge).toContain('کد رهگیری نسخه الکترونیک')
    expect(badge).toContain('TMN-۹۸۲۱۴')

    const emptyBadge = renderElectronicTrackingBadgeHtml({ ...mockPrescription, electronic_tracking_code: null })
    expect(emptyBadge).toBe('')
  })
})
