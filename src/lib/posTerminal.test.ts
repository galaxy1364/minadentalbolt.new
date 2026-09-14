import { describe, it, expect } from 'vitest'
import {
  validatePosRrn,
  validatePosTerminalId,
  validateCardLast4,
  detectDuplicatePosRrn,
  computeDailyPosReconciliation,
  generatePosReceiptHtml,
  POS_BANKS,
} from './posTerminal'
import { Payment, Patient } from '../types'

describe('posTerminal.ts — POS Card Terminal Banking & Shaparak RRN Validation', () => {
  describe('validatePosRrn', () => {
    it('rejects empty or whitespace RRN', () => {
      const res = validatePosRrn('')
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('نمی‌تواند خالی باشد')
    })

    it('rejects non-numeric characters', () => {
      const res = validatePosRrn('12345ABC6789')
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('فقط باید شامل ارقام')
    })

    it('rejects numbers shorter or longer than 12 digits', () => {
      const shortRes = validatePosRrn('1234567890') // 10 digits
      expect(shortRes.isValid).toBe(false)
      expect(shortRes.error).toContain('۱۲ رقم')

      const longRes = validatePosRrn('12345678901234') // 14 digits
      expect(longRes.isValid).toBe(false)
      expect(longRes.error).toContain('۱۲ رقم')
    })

    it('accepts and normalizes valid 12-digit RRN with spaces or Persian digits', () => {
      const res = validatePosRrn('۱۲۳۴-۵۶۷۸-۹۰۱۲')
      expect(res.isValid).toBe(true)
      expect(res.cleanRrn).toBe('123456789012')
    })
  })

  describe('validatePosTerminalId', () => {
    it('allows empty optional terminal id', () => {
      const res = validatePosTerminalId('')
      expect(res.isValid).toBe(true)
    })

    it('accepts valid 8-digit terminal id', () => {
      const res = validatePosTerminalId('14892015')
      expect(res.isValid).toBe(true)
      expect(res.cleanTermId).toBe('14892015')
    })

    it('rejects invalid length for terminal id', () => {
      const res = validatePosTerminalId('12345')
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('۸ رقم')
    })
  })

  describe('validateCardLast4', () => {
    it('accepts 4 digits and normalizes Persian numerals', () => {
      const res = validateCardLast4('۵۶۷۸')
      expect(res.isValid).toBe(true)
      expect(res.cleanCard).toBe('5678')
    })

    it('rejects invalid length', () => {
      const res = validateCardLast4('12')
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('۴ رقم')
    })
  })

  describe('detectDuplicatePosRrn', () => {
    const existingPayments: Payment[] = [
      {
        id: 'pay-1',
        clinic_id: 'default',
        patient_id: 'pat-1',
        encounter_id: null,
        implant_case_id: null,
        treatment_id: null,
        doctor_id: null,
        amount: 5000000,
        payment_method: 'card',
        pos_rrn: '987654321098',
        reference: '987654321098',
        notes: null,
        status: 'completed',
        payment_date: '2026-09-13',
        created_by: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
      },
      {
        id: 'pay-2',
        clinic_id: 'default',
        patient_id: 'pat-2',
        encounter_id: null,
        implant_case_id: null,
        treatment_id: null,
        doctor_id: null,
        amount: 2000000,
        payment_method: 'card',
        pos_rrn: '111122223333',
        reference: null,
        notes: null,
        status: 'cancelled', // cancelled payment should not trigger duplicate warning
        payment_date: '2026-09-13',
        created_by: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
      },
    ]

    it('detects duplicate RRN against existing active payments', () => {
      const res = detectDuplicatePosRrn('987654321098', existingPayments)
      expect(res.isDuplicate).toBe(true)
      expect(res.matchedPayment?.id).toBe('pay-1')
    })

    it('ignores duplicate if matching self (same payment id during edit)', () => {
      const res = detectDuplicatePosRrn('987654321098', existingPayments, 'pay-1')
      expect(res.isDuplicate).toBe(false)
    })

    it('ignores duplicate if matching cancelled payment', () => {
      const res = detectDuplicatePosRrn('111122223333', existingPayments)
      expect(res.isDuplicate).toBe(false)
    })

    it('returns false for fresh unique RRN', () => {
      const res = detectDuplicatePosRrn('555566667777', existingPayments)
      expect(res.isDuplicate).toBe(false)
    })
  })

  describe('computeDailyPosReconciliation', () => {
    const payments: Payment[] = [
      {
        id: 'p1',
        clinic_id: 'default',
        patient_id: 'pat-1',
        encounter_id: null,
        implant_case_id: null,
        treatment_id: null,
        doctor_id: null,
        amount: 10000000,
        payment_method: 'card',
        pos_rrn: '123456789012',
        pos_terminal_id: '11223344',
        pos_bank_name: 'saman',
        reference: '123456789012',
        notes: null,
        status: 'completed',
        payment_date: '2026-09-13',
        created_by: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
      },
      {
        id: 'p2',
        clinic_id: 'default',
        patient_id: 'pat-2',
        encounter_id: null,
        implant_case_id: null,
        treatment_id: null,
        doctor_id: null,
        amount: 5000000,
        payment_method: 'card',
        pos_rrn: '998877665544',
        pos_terminal_id: '11223344',
        pos_bank_name: 'saman',
        reference: null,
        notes: null,
        status: 'completed',
        payment_date: '2026-09-13',
        created_by: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
      },
      {
        id: 'p3',
        clinic_id: 'default',
        patient_id: 'pat-3',
        encounter_id: null,
        implant_case_id: null,
        treatment_id: null,
        doctor_id: null,
        amount: 3000000,
        payment_method: 'card',
        pos_rrn: '', // missing RRN
        pos_terminal_id: '88776655',
        pos_bank_name: 'mellat',
        reference: null,
        notes: null,
        status: 'completed',
        payment_date: '2026-09-13',
        created_by: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
      },
      {
        id: 'p4',
        clinic_id: 'default',
        patient_id: 'pat-4',
        encounter_id: null,
        implant_case_id: null,
        treatment_id: null,
        doctor_id: null,
        amount: 4000000,
        payment_method: 'cash', // cash should be excluded from POS reconciliation
        pos_rrn: null,
        reference: null,
        notes: null,
        status: 'completed',
        payment_date: '2026-09-13',
        created_by: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
      },
    ]

    it('aggregates daily card payments and groups by terminal', () => {
      const recon = computeDailyPosReconciliation(payments, '2026-09-13')
      expect(recon.totalPosAmount).toBe(18000000)
      expect(recon.totalPosCount).toBe(3)
      expect(recon.validRrnCount).toBe(2)
      expect(recon.missingRrnCount).toBe(1)
      expect(recon.discrepancies.length).toBe(1)
      expect(recon.terminals.length).toBe(2)

      const samanTerm = recon.terminals.find((t) => t.terminalId === '11223344')
      expect(samanTerm?.totalAmount).toBe(15000000)
      expect(samanTerm?.transactionCount).toBe(2)
      expect(samanTerm?.bankName).toContain('سامان کیش')
    })
  })

  describe('generatePosReceiptHtml', () => {
    it('produces valid 80mm thermal receipt structure', () => {
      const payment: Payment = {
        id: 'pay-x',
        clinic_id: 'default',
        patient_id: 'pat-1',
        encounter_id: null,
        implant_case_id: null,
        treatment_id: null,
        doctor_id: null,
        amount: 8500000,
        payment_method: 'card',
        pos_rrn: '123456789012',
        pos_terminal_id: '44556677',
        card_last4: '4321',
        pos_bank_name: 'saman',
        reference: '123456789012',
        notes: 'ترمیم کامپوزیت دندان ۲۶',
        status: 'completed',
        payment_date: '2026-09-13',
        created_by: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
      }

      const patient: Patient = {
        id: 'pat-1',
        clinic_id: 'default',
        first_name: 'مریم',
        last_name: 'حسینی',
        birth_date: null,
        file_number: '2045',
        is_active: true,
        national_id: null,
        phone: null,
        phone2: null,
        email: null,
        gender: null,
        address: null,
        medical_history: null,
        allergies: null,
        insurance_info: null,
        notes: null,
        avatar_url: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
        file_number_manual: false,
        file_number_assigned_at: null,
        blood_type: null,
        medications: null,
        medical_conditions: null,
        credit_limit: null,
        referral_source: null,
        vip_level: null,
        tags: null,
        city: null,
        province: null,
        postal_code: null,
        insurance_number: null,
        primary_doctor_id: null,
      }

      const html = generatePosReceiptHtml(payment, patient, { name: 'کلینیک دندانپزشکی آریا', phone: '02188888888' })
      expect(html).toContain('کلینیک دندانپزشکی آریا')
      expect(html).toContain('مریم حسینی')
      expect(html).toContain('۴۳۲۱')
      expect(html).toContain('تراکنش موفق')
      expect(html).toContain('ترمیم کامپوزیت')
    })
  })
})
