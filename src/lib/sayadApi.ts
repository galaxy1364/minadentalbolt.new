/**
 * sayadApi.ts - Connection to Iranian Sayad Cheque System API
 * 
 * This module provides integration with the Central Bank of Iran's Sayad system
 * for cheque validation and credit status checking.
 * 
 * Note: This is a mock implementation. In production, you would need:
 * 1. Official API credentials from Central Bank of Iran
 * 2. API endpoint and authentication details
 * 3. Proper error handling and rate limiting
 */

import { SayadCreditStatus } from './chequeValidation'

// Mock database of Sayad IDs and their statuses for demonstration
// In production, this would be replaced with actual API calls
const MOCK_SAYAD_DB: Record<string, SayadCreditStatus> = {
  // White (good credit)
  '1234567890123456': 'white',
  '1111222233334444': 'white',
  '5555666677778888': 'white',
  
  // Yellow (low risk - 1 returned cheque)
  '2222333344445555': 'yellow',
  '9999888877776666': 'yellow',
  
  // Orange (medium risk - 2 returned cheques)
  '3333444455556666': 'orange',
  
  // Brown (high risk - 3-4 returned cheques)
  '4444555566667777': 'brown',
  
  // Red (very high risk - 5+ returned cheques)
  '6666777788889999': 'red',
}

/**
 * Fetches the credit status of a Sayad ID from the Central Bank system.
 * 
 * @param sayadId - 16-digit Sayad cheque ID
 * @returns Promise with credit status or null if not found
 */
export async function fetchSayadCreditStatus(sayadId: string): Promise<SayadCreditStatus | null> {
  // Validate the Sayad ID format first
  const cleaned = String(sayadId).replace(/[\s-]/g, '')
  if (!/^\d{16}$/.test(cleaned)) {
    return null
  }

  // In production: Call the actual Sayad API
  // const response = await fetch(`https://api.sayad.ir/v1/cheques/${cleaned}`, {
  //   headers: {
  //     'Authorization': `Bearer ${process.env.SAYAD_API_KEY}`,
  //     'Content-Type': 'application/json'
  //   }
  // })
  // const data = await response.json()
  // return data.status as SayadCreditStatus

  // For now, return mock data
  return MOCK_SAYAD_DB[cleaned] || null
}

/**
 * Validates a Sayad ID and checks its credit status
 * 
 * @param sayadId - 16-digit Sayad cheque ID
 * @returns Validation result with status and formatted ID
 */
export async function validateSayadIdWithStatus(sayadId: string | null | undefined): Promise<{
  isValid: boolean
  formattedId: string
  error: string | null
  creditStatus: SayadCreditStatus | null
}> {
  if (!sayadId || !String(sayadId).trim()) {
    return {
      isValid: true,
      formattedId: '',
      error: null,
      creditStatus: null
    }
  }

  const cleaned = String(sayadId).replace(/[\s-]/g, '')
  
  // Format validation
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      formattedId: '',
      error: 'شناسه صیاد فقط باید شامل ارقام باشد',
      creditStatus: null
    }
  }

  if (cleaned.length !== 16) {
    return {
      isValid: false,
      formattedId: '',
      error: 'شناسه صیاد باید دقیقاً ۱۶ رقم باشد',
      creditStatus: null
    }
  }

  // Format the ID
  const formattedId = formatSayadId(cleaned)

  // Fetch credit status
  const creditStatus = await fetchSayadCreditStatus(cleaned)

  return {
    isValid: true,
    formattedId,
    error: null,
    creditStatus
  }
}

/**
 * Formats a 16-digit Sayad ID as 4-4-4-4
 * 
 * @param sayadId - Raw Sayad ID
 * @returns Formatted ID (e.g., "1234-5678-9012-3456")
 */
export function formatSayadId(sayadId: string | null | undefined): string {
  if (!sayadId) return ''
  const digits = String(sayadId).replace(/\D/g, '').slice(0, 16)
  if (!digits) return ''
  const chunks: string[] = []
  for (let i = 0; i < digits.length; i += 4) {
    chunks.push(digits.slice(i, i + 4))
  }
  return chunks.join('-')
}

/**
 * Gets the Persian label for a Sayad credit status
 * 
 * @param status - Sayad credit status
 * @returns Persian label
 */
export function getSayadStatusLabel(status: SayadCreditStatus | null): string {
  if (!status) return 'نامشخص'
  
  const labels: Record<SayadCreditStatus, string> = {
    white: 'سفید (خوش‌حساب)',
    yellow: 'زرد (کم‌ریسک)',
    orange: 'نارنجی (ریسک متوسط)',
    brown: 'قهوه‌ای (پرریسک)',
    red: 'قرمز (بسیار پرخطر)'
  }
  
  return labels[status] || 'نامشخص'
}

/**
 * Determines if a cheque can be accepted based on Sayad status
 * 
 * @param status - Sayad credit status
 * @returns Whether the cheque can be accepted
 */
export function canAcceptCheque(status: SayadCreditStatus | null): boolean {
  if (!status) return true // Unknown status - accept by default
  
  // Block red and brown status cheques
  return status !== 'red' && status !== 'brown'
}
