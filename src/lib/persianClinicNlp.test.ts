import { describe, it, expect } from 'vitest'
import {
  normalizePersianDigits,
  extractPersianAmount,
  extractPersianTime,
  parseClinicCommand,
} from './persianClinicNlp'

describe('Persian Clinic Conversational NLP Engine', () => {
  describe('normalizePersianDigits', () => {
    it('converts Persian digits to English digits', () => {
      expect(normalizePersianDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789')
    })
  })

  describe('extractPersianAmount', () => {
    it('parses million expressions', () => {
      expect(extractPersianAmount('۳ میلیون تومان')).toBe(3000000)
      expect(extractPersianAmount('۲.۵ میلیون')).toBe(2500000)
    })

    it('parses thousand expressions', () => {
      expect(extractPersianAmount('۵۰۰ هزار تومان')).toBe(500000)
    })

    it('parses raw numbers with commas', () => {
      expect(extractPersianAmount('10,000,000 تومان')).toBe(10000000)
    })
  })

  describe('extractPersianTime', () => {
    it('converts evening times to 24h format', () => {
      expect(extractPersianTime('ساعت ۵ عصر')).toBe('17:00')
      expect(extractPersianTime('ساعت ۶:۳۰ عصر')).toBe('18:30')
    })

    it('preserves morning times', () => {
      expect(extractPersianTime('ساعت ۱۰ صبح')).toBe('10:00')
    })
  })

  describe('parseClinicCommand', () => {
    it('parses appointment booking command', () => {
      const res = parseClinicCommand('برای رضا احمدی فردا ساعت ۵ عصر نوبت عصب‌کشی بگذار')
      expect(res.intent).toBe('create_appointment')
      expect(res.patientName).toContain('رضا احمدی')
      expect(res.time).toBe('17:00')
      expect(res.service).toBe('عصب‌کشی (اندو)')
      expect(res.details.length).toBeGreaterThanOrEqual(4)
    })

    it('parses payment recording command', () => {
      const res = parseClinicCommand('علی مرادی ۳ میلیون پرداخت کرد کارتخوان')
      expect(res.intent).toBe('record_payment')
      expect(res.patientName).toContain('علی مرادی')
      expect(res.amount).toBe(3000000)
      expect(res.paymentMethod).toBe('card')
    })

    it('parses installment plan creation command', () => {
      const res = parseClinicCommand('برای مریم حسینی طرح اقساط ۱۰ میلیونی در ۴ قسط با پیش‌پرداخت ۲ میلیون ثبت کن')
      expect(res.intent).toBe('create_installment_plan')
      expect(res.patientName).toContain('مریم حسینی')
      expect(res.amount).toBe(10000000)
      expect(res.installmentsCount).toBe(4)
      expect(res.downPayment).toBe(2000000)
    })

    it('parses tooth treatment command', () => {
      const res = parseClinicCommand('ثبت روکش زیرکونیا برای دندان ۱۶ بیمار رضا احمدی')
      expect(res.intent).toBe('record_treatment')
      expect(res.toothNumber).toBe(16)
      expect(res.service).toContain('روکش تمام سرامیک زیرکونیا')
    })
  })
})
