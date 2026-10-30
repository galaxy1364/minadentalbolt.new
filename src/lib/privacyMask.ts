// src/lib/privacyMask.ts — PII Privacy Protection & Counter Desk Masking (ISO-27001 & HIPAA Compliance)
import { useState, useEffect, useCallback } from 'react'
import { toEnglishDigits, toPersianDigits } from './persianDate'

export const PRIVACY_STORAGE_KEY = 'minadent_reception_privacy'
const PRIVACY_EVENT = 'minadent:privacy-mode-change'

/**
 * Checks if receptionist/counter privacy mode is currently active.
 * In privacy mode, patient national IDs and phone numbers are masked on screen
 * to protect patient confidentiality from onlookers in the clinic waiting lounge.
 */
export function getPrivacyMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Toggles or sets reception privacy mode, broadcasting the change across the application.
 */
export function setPrivacyMode(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PRIVACY_STORAGE_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent(PRIVACY_EVENT, { detail: { enabled } }))
  } catch {
    // Ignore storage quota / restricted browser exceptions
  }
}

/**
 * Subscribes to changes in privacy mode.
 */
export function subscribePrivacyMode(callback: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ enabled: boolean }>
    if (custom.detail && typeof custom.detail.enabled === 'boolean') {
      callback(custom.detail.enabled)
    } else {
      callback(getPrivacyMode())
    }
  }

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === PRIVACY_STORAGE_KEY) {
      callback(e.newValue === 'true')
    }
  }

  window.addEventListener(PRIVACY_EVENT, handleCustomEvent)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(PRIVACY_EVENT, handleCustomEvent)
    window.removeEventListener('storage', handleStorageEvent)
  }
}

/**
 * Masks an Iranian 10-digit National ID (کد ملی).
 * E.g.: "0012345678" -> "001****678"
 */
export function maskNationalId(nationalId: string | null | undefined, forceMask?: boolean): string {
  if (!nationalId || nationalId.trim() === '') return ''
  const isMasked = forceMask !== undefined ? forceMask : getPrivacyMode()
  const clean = toEnglishDigits(nationalId).replace(/\D/g, '').trim()

  if (!isMasked) {
    return toPersianDigits(clean)
  }

  if (clean.length === 10) {
    const head = clean.slice(0, 3)
    const tail = clean.slice(-3)
    return `${toPersianDigits(head)}****${toPersianDigits(tail)}`
  }

  if (clean.length > 4) {
    const head = clean.slice(0, 2)
    const tail = clean.slice(-2)
    return `${toPersianDigits(head)}****${toPersianDigits(tail)}`
  }

  return '****'
}

/**
 * Masks a mobile phone number or landline for public/counter view.
 * E.g.: "09123456789" -> "0912****789"
 */
export function maskPhoneNumber(phone: string | null | undefined, forceMask?: boolean): string {
  if (!phone || phone.trim() === '') return ''
  const isMasked = forceMask !== undefined ? forceMask : getPrivacyMode()
  const clean = toEnglishDigits(phone).replace(/\D/g, '').trim()

  if (!isMasked) {
    return toPersianDigits(clean)
  }

  // Mobile number 11 digits (e.g. 09123456789)
  if (clean.length === 11 && clean.startsWith('09')) {
    const prefix = clean.slice(0, 4) // e.g. 0912
    const tail = clean.slice(-3) // e.g. 789
    return `${toPersianDigits(prefix)}****${toPersianDigits(tail)}`
  }

  // Mobile without leading zero: 9123456789
  if (clean.length === 10 && clean.startsWith('9')) {
    const prefix = clean.slice(0, 3) // e.g. 912
    const tail = clean.slice(-3)
    return `${toPersianDigits(prefix)}****${toPersianDigits(tail)}`
  }

  // Landline or other length
  if (clean.length >= 7) {
    const head = clean.slice(0, 3)
    const tail = clean.slice(-2)
    return `${toPersianDigits(head)}****${toPersianDigits(tail)}`
  }

  return '****'
}

/**
 * Masks full name to First Name + Initial of Last Name for waiting room / lobby privacy.
 * E.g.: "سارا حسینی" -> "سارا ح."
 */
export function maskPatientName(fullName: string | null | undefined, forceMask?: boolean): string {
  if (!fullName || !fullName.trim()) return 'بیمار'
  const isMasked = forceMask !== undefined ? forceMask : getPrivacyMode()
  const trimmed = fullName.trim()

  if (!isMasked) return trimmed

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0]

  const firstName = parts[0]
  const lastInitial = parts[parts.length - 1].charAt(0)
  return `${firstName} ${lastInitial}.`
}

/**
 * Masks 16-digit debit/credit card numbers.
 * E.g.: "6037991812345678" -> "6037-****-****-5678"
 */
export function maskCardNumber(card: string | null | undefined, forceMask?: boolean): string {
  if (!card || card.trim() === '') return ''
  const isMasked = forceMask !== undefined ? forceMask : getPrivacyMode()
  const clean = toEnglishDigits(card).replace(/\D/g, '').trim()

  if (!isMasked) {
    return toPersianDigits(clean)
  }

  if (clean.length === 16) {
    const first4 = clean.slice(0, 4)
    const last4 = clean.slice(-4)
    return `${toPersianDigits(first4)}-****-****-${toPersianDigits(last4)}`
  }

  if (clean.length === 4) {
    return `****-****-****-${toPersianDigits(clean)}`
  }

  return '****-****-****-****'
}

/**
 * React hook to access and toggle reception privacy mode across any component.
 */
export function usePrivacyMode() {
  const [privacyMode, setPrivacyState] = useState<boolean>(() => getPrivacyMode())

  useEffect(() => {
    return subscribePrivacyMode((enabled) => {
      setPrivacyState(enabled)
    })
  }, [])

  const toggle = useCallback(() => {
    const next = !getPrivacyMode()
    setPrivacyMode(next)
    setPrivacyState(next)
    return next
  }, [])

  const setPrivacy = useCallback((enabled: boolean) => {
    setPrivacyMode(enabled)
    setPrivacyState(enabled)
  }, [])

  const maskId = useCallback((id: string | null | undefined) => maskNationalId(id, privacyMode), [privacyMode])
  const maskPhone = useCallback((phone: string | null | undefined) => maskPhoneNumber(phone, privacyMode), [privacyMode])
  const maskName = useCallback((name: string | null | undefined) => maskPatientName(name, privacyMode), [privacyMode])
  const maskCard = useCallback((card: string | null | undefined) => maskCardNumber(card, privacyMode), [privacyMode])

  return {
    privacyMode,
    togglePrivacyMode: toggle,
    setPrivacyMode: setPrivacy,
    maskNationalId: maskId,
    maskPhoneNumber: maskPhone,
    maskPatientName: maskName,
    maskCardNumber: maskCard,
  }
}
