// @vitest-environment jsdom
// src/lib/privacyMask.test.ts — Unit tests for PII Privacy & Counter Masking
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  maskNationalId,
  maskPhoneNumber,
  maskPatientName,
  maskCardNumber,
  getPrivacyMode,
  setPrivacyMode,
  subscribePrivacyMode,
  PRIVACY_STORAGE_KEY,
} from './privacyMask'

describe('privacyMask — ISO-27001 & HIPAA PII Masking', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('maskNationalId', () => {
    it('masks 10-digit national ID when forced', () => {
      const masked = maskNationalId('0012345678', true)
      // First 3 digits: 001, Last 3 digits: 678, Middle: ****
      expect(masked).toBe('۰۰۱****۶۷۸')
    })

    it('returns full Persian digits when privacy mode is disabled', () => {
      const normal = maskNationalId('0012345678', false)
      expect(normal).toBe('۰۰۱۲۳۴۵۶۷۸')
    })

    it('handles empty or null national IDs gracefully', () => {
      expect(maskNationalId(null, true)).toBe('')
      expect(maskNationalId('', true)).toBe('')
      expect(maskNationalId(undefined, true)).toBe('')
    })

    it('masks arbitrary length national ID', () => {
      const masked = maskNationalId('123456', true)
      expect(masked).toBe('۱۲****۵۶')
    })
  })

  describe('maskPhoneNumber', () => {
    it('masks Iranian mobile phone number keeping prefix and last 3 digits', () => {
      const masked = maskPhoneNumber('09123456789', true)
      expect(masked).toBe('۰۹۱۲****۷۸۹')
    })

    it('masks Iranian mobile phone number without leading zero', () => {
      const masked = maskPhoneNumber('9123456789', true)
      expect(masked).toBe('۹۱۲****۷۸۹')
    })

    it('masks landline numbers', () => {
      const masked = maskPhoneNumber('02188776655', true)
      expect(masked).toBe('۰۲۱****۵۵')
    })

    it('returns unmasked formatted digits when privacy is disabled', () => {
      expect(maskPhoneNumber('09123456789', false)).toBe('۰۹۱۲۳۴۵۶۷۸۹')
    })

    it('handles null and empty phone', () => {
      expect(maskPhoneNumber(null, true)).toBe('')
      expect(maskPhoneNumber('', true)).toBe('')
    })
  })

  describe('maskPatientName', () => {
    it('masks full names with first name and last initial', () => {
      expect(maskPatientName('علی رضایی', true)).toBe('علی ر.')
      expect(maskPatientName('سارا میرزاخانی اصل', true)).toBe('سارا ا.')
    })

    it('keeps single names untouched', () => {
      expect(maskPatientName('مریم', true)).toBe('مریم')
    })

    it('returns full name when privacy is off', () => {
      expect(maskPatientName('امیرحسین خسروی', false)).toBe('امیرحسین خسروی')
    })

    it('falls back to default label when empty', () => {
      expect(maskPatientName('', true)).toBe('بیمار')
      expect(maskPatientName(null, true)).toBe('بیمار')
    })
  })

  describe('maskCardNumber', () => {
    it('masks 16-digit bank card numbers', () => {
      const masked = maskCardNumber('6037991812345678', true)
      expect(masked).toBe('۶۰۳۷-****-****-۵۶۷۸')
    })

    it('masks last 4 digits only when input is 4 digits', () => {
      const masked = maskCardNumber('6037', true)
      expect(masked).toBe('****-****-****-۶۰۳۷')
    })

    it('returns full card number when privacy is off', () => {
      expect(maskCardNumber('6037991812345678', false)).toBe('۶۰۳۷۹۹۱۸۱۲۳۴۵۶۷۸')
    })
  })

  describe('storage and event subscriptions', () => {
    it('reads and writes to localStorage correctly', () => {
      expect(getPrivacyMode()).toBe(false)
      setPrivacyMode(true)
      expect(getPrivacyMode()).toBe(true)
      expect(localStorage.getItem(PRIVACY_STORAGE_KEY)).toBe('true')

      setPrivacyMode(false)
      expect(getPrivacyMode()).toBe(false)
      expect(localStorage.getItem(PRIVACY_STORAGE_KEY)).toBe('false')
    })

    it('notifies subscribers on change', () => {
      const listener = vi.fn()
      const unsubscribe = subscribePrivacyMode(listener)

      setPrivacyMode(true)
      expect(listener).toHaveBeenCalledWith(true)

      setPrivacyMode(false)
      expect(listener).toHaveBeenCalledWith(false)

      unsubscribe()
      setPrivacyMode(true)
      // Listener should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })
})
