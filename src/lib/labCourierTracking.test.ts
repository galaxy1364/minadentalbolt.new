import { describe, it, expect } from 'vitest'
import {
  getDispatchTypeLabel,
  isTransitOverdue,
  validateDispatchInfo,
  formatCourierBadge,
  generateLabDispatchSlip,
} from './labCourierTracking'
import type { LabOrder, Laboratory, Patient, Doctor } from '../types'

describe('labCourierTracking', () => {
  it('correctly maps dispatch types to Persian labels', () => {
    expect(getDispatchTypeLabel('clinic_courier')).toBe('پیک اختصاصی مطب')
    expect(getDispatchTypeLabel('lab_courier')).toBe('پیک اختصاصی لابراتوار')
    expect(getDispatchTypeLabel('postal')).toBe('پست پیشتاز / تیپاکس')
    expect(getDispatchTypeLabel('in_person')).toBe('تحویل و دریافت حضوری')
    expect(getDispatchTypeLabel(null)).toBe('نامشخص')
    expect(getDispatchTypeLabel(undefined)).toBe('نامشخص')
  })

  it('detects whether courier transit is overdue', () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString()
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString()

    // Not dispatched -> not overdue
    expect(isTransitOverdue({ expected_return_date: pastDate })).toBe(false)

    // Already delivered or work_done -> not overdue
    expect(
      isTransitOverdue({
        dispatched_at: pastDate,
        expected_return_date: pastDate,
        delivered: true,
      })
    ).toBe(false)

    // Dispatched, past return date, not delivered -> overdue!
    expect(
      isTransitOverdue({
        dispatched_at: pastDate,
        expected_return_date: pastDate,
        delivered: false,
      })
    ).toBe(true)

    // Dispatched, future return date -> not overdue
    expect(
      isTransitOverdue({
        dispatched_at: pastDate,
        expected_return_date: futureDate,
        delivered: false,
      })
    ).toBe(false)
  })

  it('validates dispatch info including phone and postal tracking code', () => {
    // Valid phone and tracking
    const valid = validateDispatchInfo({
      dispatch_type: 'clinic_courier',
      courier_phone: '09121234567',
    })
    expect(valid.isValid).toBe(true)
    expect(valid.errors).toHaveLength(0)

    // Invalid phone
    const invalidPhone = validateDispatchInfo({
      courier_phone: '12345',
    })
    expect(invalidPhone.isValid).toBe(false)
    expect(invalidPhone.errors[0]).toContain('شماره تماس پیک نامعتبر است')

    // Postal without tracking code
    const missingPostal = validateDispatchInfo({
      dispatch_type: 'postal',
      tracking_code: '',
    })
    expect(missingPostal.isValid).toBe(false)
    expect(missingPostal.errors[0]).toContain('کد رهگیری یا شماره بارنامه الزامی است')
  })

  it('formats courier badge correctly for various states', () => {
    // Delivered
    const deliveredBadge = formatCourierBadge({ delivered: true })
    expect(deliveredBadge.label).toBe('تحویل داده شده به بیمار')
    expect(deliveredBadge.color).toBe('success')

    // Work done on shelf
    const readyBadge = formatCourierBadge({ delivered: false, work_done: true })
    expect(readyBadge.label).toBe('در مطب (آماده تحویل)')
    expect(readyBadge.color).toBe('accent')

    // In transit with courier
    const inTransit = formatCourierBadge({
      dispatched_at: new Date().toISOString(),
      dispatch_type: 'clinic_courier',
      courier_name: 'رضا حسینی',
      expected_return_date: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(inTransit.label).toContain('پیک اختصاصی مطب — رضا حسینی')
    expect(inTransit.color).toBe('warning')
  })

  it('generates a full printable lab dispatch slip with all metadata and signatures', () => {
    const mockOrder = {
      id: 'order-12345678',
      clinic_id: 'c1',
      lab_id: 'l1',
      patient_id: 'p1',
      doctor_id: 'd1',
      encounter_id: null,
      delivery_appointment_id: null,
      work_type: 'crown',
      tooth_number: '16',
      tooth_surface: 'MOD',
      shade: 'A2',
      material: 'zirconia',
      deadline: '2026-09-20',
      status: 'ordered',
      stage: 'sent_to_courier',
      cost: 4500000,
      sent_at: null,
      received_at: null,
      notes: 'لطفا کانتکت مزیال را محکم طراحی کنید',
      shelf: 'A',
      shelf_number: '2',
      shelf_space: 'B',
      alarm_date: null,
      work_done: false,
      delivered: false,
      material_returned: false,
      dispatch_type: 'clinic_courier',
      courier_name: 'محمد شریفی',
      courier_phone: '09123456789',
      tracking_code: 'TRK-9901',
      dispatched_at: '2026-09-14T10:00:00Z',
      expected_return_date: '2026-09-19',
      created_at: '2026-09-14T09:00:00Z',
      updated_at: '2026-09-14T09:00:00Z',
    } as unknown as LabOrder

    const mockPatient = {
      id: 'p1',
      first_name: 'سارا',
      last_name: 'کریمی',
      file_number: 'FN-1044',
    } as unknown as Patient

    const mockDoctor = {
      id: 'd1',
      name: 'دکتر امین راد',
    } as unknown as Doctor

    const mockLab = {
      id: 'l1',
      name: 'لابراتوار تخصصی سپهر',
      phone: '021-88123456',
      contact_person: 'مهندس رضایی',
    } as unknown as Laboratory

    const html = generateLabDispatchSlip({
      order: mockOrder,
      patient: mockPatient,
      doctor: mockDoctor,
      lab: mockLab,
    })

    expect(html).toContain('حواله رسمی ارسال کار به لابراتوار')
    expect(html).toContain('سارا کریمی')
    expect(html).toContain('دکتر امین راد')
    expect(html).toContain('لابراتوار تخصصی سپهر')
    expect(html).toContain('A2')
    expect(html).toContain('zirconia')
    expect(html).toContain('محمد شریفی')
    expect(html).toContain('TRK-۹۹۰۱')
    expect(html).toContain('تحویل‌دهنده (دستیار کلینیک)')
    expect(html).toContain('تحویل‌گیرنده (لابراتوار)')
    expect(html).toContain('mnd-bar')
  })
})
