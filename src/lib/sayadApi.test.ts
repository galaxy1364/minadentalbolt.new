// src/lib/sayadApi.test.ts - Unit tests for Sayad API integration
import { describe, it, expect } from 'vitest'
import {
  fetchSayadCreditStatus,
  validateSayadIdWithStatus,
  formatSayadId,
  getSayadStatusLabel,
  canAcceptCheque
} from './sayadApi'

describe('Sayad API Integration', () => {
  describe('formatSayadId', () => {
    it('should format 16-digit ID as 4-4-4-4', () => {
      expect(formatSayadId('1234567890123456')).toBe('1234-5678-9012-3456')
    })

    it('should handle ID with spaces', () => {
      expect(formatSayadId('1234 5678 9012 3456')).toBe('1234-5678-9012-3456')
    })

    it('should handle ID with dashes', () => {
      expect(formatSayadId('1234-5678-9012-3456')).toBe('1234-5678-9012-3456')
    })

    it('should handle partial ID', () => {
      expect(formatSayadId('123456')).toBe('1234-56')
    })

    it('should return empty string for null/undefined', () => {
      expect(formatSayadId(null)).toBe('')
      expect(formatSayadId(undefined)).toBe('')
    })

    it('should remove non-digit characters', () => {
      expect(formatSayadId('12a3b4c5d6e7f8g9h0')).toBe('1234-5678-90')
    })
  })

  describe('getSayadStatusLabel', () => {
    it('should return correct Persian labels', () => {
      expect(getSayadStatusLabel('white')).toBe('سفید (خوش‌حساب)')
      expect(getSayadStatusLabel('yellow')).toBe('زرد (کم‌ریسک)')
      expect(getSayadStatusLabel('orange')).toBe('نارنجی (ریسک متوسط)')
      expect(getSayadStatusLabel('brown')).toBe('قهوه‌ای (پرریسک)')
      expect(getSayadStatusLabel('red')).toBe('قرمز (بسیار پرخطر)')
    })

    it('should return "نامشخص" for null', () => {
      expect(getSayadStatusLabel(null)).toBe('نامشخص')
    })

    it('should return "نامشخص" for unknown status', () => {
      expect(getSayadStatusLabel('unknown' as any)).toBe('نامشخص')
    })
  })

  describe('canAcceptCheque', () => {
    it('should accept white status cheques', () => {
      expect(canAcceptCheque('white')).toBe(true)
    })

    it('should accept yellow status cheques', () => {
      expect(canAcceptCheque('yellow')).toBe(true)
    })

    it('should accept orange status cheques', () => {
      expect(canAcceptCheque('orange')).toBe(true)
    })

    it('should reject brown status cheques', () => {
      expect(canAcceptCheque('brown')).toBe(false)
    })

    it('should reject red status cheques', () => {
      expect(canAcceptCheque('red')).toBe(false)
    })

    it('should accept cheques with unknown status', () => {
      expect(canAcceptCheque(null)).toBe(true)
    })
  })

  describe('validateSayadIdWithStatus', () => {
    it('should accept valid 16-digit ID', async () => {
      const result = await validateSayadIdWithStatus('1234567890123456')
      expect(result.isValid).toBe(true)
      expect(result.formattedId).toBe('1234-5678-9012-3456')
      expect(result.error).toBeNull()
      // This ID is in our mock DB with 'white' status
      expect(result.creditStatus).toBe('white')
    })

    it('should accept empty ID', async () => {
      const result = await validateSayadIdWithStatus('')
      expect(result.isValid).toBe(true)
      expect(result.formattedId).toBe('')
      expect(result.error).toBeNull()
      expect(result.creditStatus).toBeNull()
    })

    it('should reject non-numeric ID', async () => {
      const result = await validateSayadIdWithStatus('1234abcd56789012')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('فقط باید شامل ارقام باشد')
    })

    it('should reject ID with wrong length', async () => {
      const result = await validateSayadIdWithStatus('123456789012345')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('دقیقاً ۱۶ رقم باشد')
    })

    it('should handle ID with spaces', async () => {
      const result = await validateSayadIdWithStatus('1234 5678 9012 3456')
      expect(result.isValid).toBe(true)
      expect(result.formattedId).toBe('1234-5678-9012-3456')
    })

    it('should detect yellow status', async () => {
      const result = await validateSayadIdWithStatus('2222333344445555')
      expect(result.isValid).toBe(true)
      expect(result.creditStatus).toBe('yellow')
    })

    it('should detect red status and reject', async () => {
      const result = await validateSayadIdWithStatus('6666777788889999')
      expect(result.isValid).toBe(true)
      expect(result.creditStatus).toBe('red')
      expect(canAcceptCheque(result.creditStatus)).toBe(false)
    })
  })

  describe('fetchSayadCreditStatus', () => {
    it('should return null for invalid format', async () => {
      const result = await fetchSayadCreditStatus('123')
      expect(result).toBeNull()
    })

    it('should return null for non-numeric ID', async () => {
      const result = await fetchSayadCreditStatus('abcdefghijklmnop')
      expect(result).toBeNull()
    })

    it('should return white status for known good ID', async () => {
      const result = await fetchSayadCreditStatus('1234567890123456')
      expect(result).toBe('white')
    })

    it('should return null for unknown ID', async () => {
      const result = await fetchSayadCreditStatus('0000000000000000')
      expect(result).toBeNull()
    })
  })
})
