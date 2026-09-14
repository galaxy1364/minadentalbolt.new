import { describe, it, expect } from 'vitest'
import {
  computeWaitingTimeMinutes,
  formatWaitingTime,
  buildPatientCallAnnouncement,
  maskPatientNameForPublicDisplay,
  getTriageWaitingStatus,
  computeAverageWaitingTime,
} from './operatoryWorkflow'

describe('operatoryWorkflow', () => {
  describe('computeWaitingTimeMinutes', () => {
    it('returns 0 for empty or invalid inputs', () => {
      expect(computeWaitingTimeMinutes(null)).toBe(0)
      expect(computeWaitingTimeMinutes(undefined)).toBe(0)
      expect(computeWaitingTimeMinutes('')).toBe(0)
      expect(computeWaitingTimeMinutes('invalid')).toBe(0)
    })

    it('calculates minutes accurately between ISO timestamps', () => {
      const checkIn = '2026-09-13T10:00:00.000Z'
      const chairEntry = '2026-09-13T10:25:00.000Z'
      expect(computeWaitingTimeMinutes(checkIn, chairEntry)).toBe(25)
    })

    it('returns 0 if chair entry is earlier than check in', () => {
      const checkIn = '2026-09-13T10:30:00.000Z'
      const chairEntry = '2026-09-13T10:15:00.000Z'
      expect(computeWaitingTimeMinutes(checkIn, chairEntry)).toBe(0)
    })

    it('handles HH:mm strings correctly', () => {
      expect(computeWaitingTimeMinutes('10:00', '10:45')).toBe(45)
      expect(computeWaitingTimeMinutes('09:30', '11:00')).toBe(90)
    })
  })

  describe('formatWaitingTime', () => {
    it('formats 0 minutes gracefully', () => {
      expect(formatWaitingTime(0)).toBe('هم‌اکنون پذیرش شد')
    })

    it('formats under 1 hour in Persian numerals', () => {
      const text = formatWaitingTime(15)
      expect(text).toContain('۱۵')
      expect(text).toContain('دقیقه در انتظار')
    })

    it('formats exact hours', () => {
      const text = formatWaitingTime(60)
      expect(text).toContain('۱')
      expect(text).toContain('ساعت در انتظار')
    })

    it('formats hours and remaining minutes', () => {
      const text = formatWaitingTime(75)
      expect(text).toContain('۱ ساعت و ۱۵ دقیقه در انتظار')
    })
  })

  describe('buildPatientCallAnnouncement', () => {
    it('builds announcement with patient name, unit and doctor', () => {
      const text = buildPatientCallAnnouncement({
        patientName: 'علی رضایی',
        unitName: 'یونیت ۱',
        doctorName: 'احمدی',
      })
      expect(text).toBe('بیمار محترم، علی رضایی، لطفاً به یونیت ۱ (دکتر احمدی) مراجعه فرمایید.')
    })

    it('builds announcement with only patient and unit', () => {
      const text = buildPatientCallAnnouncement({
        patientName: 'مریم حسینی',
        unitName: 'یونیت جراحی',
      })
      expect(text).toBe('بیمار محترم، مریم حسینی، لطفاً به یونیت جراحی مراجعه فرمایید.')
    })

    it('builds announcement with only patient and doctor', () => {
      const text = buildPatientCallAnnouncement({
        patientName: 'مریم حسینی',
        doctorName: 'سلطانی',
      })
      expect(text).toBe('بیمار محترم، مریم حسینی، لطفاً به اتاق دکتر سلطانی مراجعه فرمایید.')
    })

    it('falls back gracefully if unit and doctor are missing', () => {
      const text = buildPatientCallAnnouncement({
        patientName: 'سامان نوری',
      })
      expect(text).toBe('بیمار محترم، سامان نوری، لطفاً به اتاق درمان مراجعه فرمایید.')
    })

    it('prepends turn number when provided', () => {
      const text = buildPatientCallAnnouncement({
        patientName: 'سارا رضایی',
        unitName: 'یونیت ۲',
        turnNumber: 5,
      })
      expect(text).toBe('نوبت شماره ۵، بیمار محترم، سارا رضایی، لطفاً به یونیت ۲ مراجعه فرمایید.')
    })

    it('prepends file number when turn number is not provided', () => {
      const text = buildPatientCallAnnouncement({
        patientName: 'محسن کریمی',
        fileNumber: 1042,
      })
      expect(text).toBe('پرونده شماره ۱۰۴۲، بیمار محترم، محسن کریمی، لطفاً به اتاق درمان مراجعه فرمایید.')
    })
  })

  describe('maskPatientNameForPublicDisplay', () => {
    it('masks full names with first name and last initial for privacy', () => {
      expect(maskPatientNameForPublicDisplay('علی رضایی')).toBe('علی ر.')
      expect(maskPatientNameForPublicDisplay('زهرا طباطبایی پور')).toBe('زهرا پ.')
    })

    it('returns single word names unchanged', () => {
      expect(maskPatientNameForPublicDisplay('سارا')).toBe('سارا')
    })

    it('handles empty input gracefully', () => {
      expect(maskPatientNameForPublicDisplay('')).toBe('بیمار')
    })
  })

  describe('getTriageWaitingStatus', () => {
    it('categorizes normal waiting (< 15 mins)', () => {
      const res = getTriageWaitingStatus(10)
      expect(res.level).toBe('normal')
      expect(res.label).toBe('طبیعی')
    })

    it('categorizes moderate waiting (15 to 30 mins)', () => {
      const res = getTriageWaitingStatus(20)
      expect(res.level).toBe('moderate')
      expect(res.label).toBe('معطلی متوسط')
    })

    it('categorizes critical excessive waiting (> 30 mins)', () => {
      const res = getTriageWaitingStatus(35)
      expect(res.level).toBe('critical')
      expect(res.label).toBe('معطلی بیش از حد')
      expect(res.badgeClass).toContain('animate-pulse')
    })
  })

  describe('computeAverageWaitingTime', () => {
    it('returns 0 for empty appointments array', () => {
      expect(computeAverageWaitingTime([])).toBe(0)
    })

    it('computes rounded average accurately for valid appointments', () => {
      const appts = [
        { check_in_time: '2026-09-13T10:00:00Z', chair_entry_time: '2026-09-13T10:10:00Z' }, // 10 min
        { check_in_time: '2026-09-13T10:00:00Z', chair_entry_time: '2026-09-13T10:20:00Z' }, // 20 min
        { check_in_time: null, chair_entry_time: null }, // ignored
      ]
      expect(computeAverageWaitingTime(appts)).toBe(15)
    })
  })
})

