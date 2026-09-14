import { describe, it, expect } from 'vitest'
import { buildImplantPassportHtml } from './implantPassport'
import { ImplantCase, Patient, Doctor } from '../types'

describe('implantPassport', () => {
  const dummyPatient: Patient = {
    id: 'pat-1',
    clinic_id: 'cl-1',
    file_number: '1402-99',
    first_name: 'سارا',
    last_name: 'افشار',
    national_id: '0012345678',
    phone: '09123456789',
    birth_date: '1985-05-10',
    gender: 'female',
    blood_type: 'A+',
    allergies: '',
    medical_conditions: '',
    medical_history: '',
    medications: '',
    vip_level: 1,
    is_active: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    sync_version: 1,
  } as Patient

  const dummyDoctor: Doctor = {
    id: 'doc-1',
    user_id: null,
    clinic_id: 'cl-1',
    staff_id: null,
    name: 'محمدرضا سلطانی',
    specialty: 'جراح فک و صورت و ایمپلنت',
    license_number: 'MC-88776',
    color: '#0d9488',
    is_active: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    sync_version: 1,
  }

  const dummyCase: ImplantCase = {
    id: 'impl-99887766',
    clinic_id: 'cl-1',
    patient_id: 'pat-1',
    doctor_id: 'doc-1',
    tooth_number: '36',
    brand: 'Straumann',
    model: 'BLX Roxolid SLActive',
    diameter: '4.5',
    length: '10',
    lot_number: 'LOT-987654',
    serial_number: 'SN-11223344',
    torque_ncm: 45,
    isq_value: 78,
    bone_density: 'D2',
    bone_graft: true,
    sinus_lift: false,
    surgery_date: '2025-02-15',
    crown_delivery_date: '2025-05-20',
    warranty_years: 10,
    abutment_type: 'Custom Titanium Variobase',
    crown_material: 'Monolithic Multilayer Zirconia',
    stage: 'crown_delivered',
    total_cost: 35000000,
    paid_amount: 35000000,
    is_active: true,
    created_at: '2025-02-15',
    updated_at: '2025-05-20',
    bone_graft_cost: null,
    gbr: null,
    membrane_used: null,
    extraction_needed: null,
    sinus_lift_cost: null,
    immediate_loading: null,
    healing_months: 3,
    opg_reminder_date: null,
    lab_order_id: null,
    surgery_fee_mode: 'formula',
    surgery_fee_amount: null,
    surgery_settled: true,
    prosthesis_doctor_id: null,
    prosthesis_fee_amount: null,
    prosthesis_settled: true,
    notes: null,
    success_status: 'success',
    failure_reason: null,
    healing_abutment_date: null,
    impression_date: null,
  }

  it('generates passport with patient name, national ID, and file number', () => {
    const html = buildImplantPassportHtml({
      implantCase: dummyCase,
      patient: dummyPatient,
      doctor: dummyDoctor,
    })

    expect(html).toContain('سارا افشار')
    expect(html).toContain('۱۴۰۲-۹۹')
    expect(html).toContain('۰۰۱۲۳۴۵۶۷۸')
  })

  it('renders fixture technical details correctly', () => {
    const html = buildImplantPassportHtml({
      implantCase: dummyCase,
      patient: dummyPatient,
      doctor: dummyDoctor,
    })

    expect(html).toContain('Straumann')
    expect(html).toContain('BLX Roxolid SLActive')
    expect(html).toContain('LOT-987654')
    expect(html).toContain('SN-11223344')
  })

  it('includes ITI biomechanical parameters (Torque, ISQ, Bone Density)', () => {
    const html = buildImplantPassportHtml({
      implantCase: dummyCase,
      patient: dummyPatient,
      doctor: dummyDoctor,
    })

    expect(html).toContain('N.cm')
    expect(html).toContain('ISQ')
    expect(html).toContain('D2')
    expect(html).toContain('پیوند استخوان')
  })

  it('contains prosthodontic restoration and warranty period', () => {
    const html = buildImplantPassportHtml({
      implantCase: dummyCase,
      patient: dummyPatient,
      doctor: dummyDoctor,
    })

    expect(html).toContain('Custom Titanium Variobase')
    expect(html).toContain('Monolithic Multilayer Zirconia')
    expect(html).toContain('سال ضمانت طلایی')
  })

  it('handles optional or missing fields gracefully without crash', () => {
    const minimalCase: ImplantCase = {
      ...dummyCase,
      diameter: null,
      length: null,
      lot_number: null,
      serial_number: null,
      torque_ncm: null,
      isq_value: null,
      bone_density: null,
      warranty_years: null,
      crown_delivery_date: null,
      abutment_type: null,
      crown_material: null,
    }

    const html = buildImplantPassportHtml({
      implantCase: minimalCase,
      patient: dummyPatient,
      doctor: null,
    })

    expect(html).toBeDefined()
    expect(html).toContain('سارا افشار')
    expect(html).toContain('شناسنامه و کارت ضمانت رسمی ایمپلنت دندان')
  })
})
