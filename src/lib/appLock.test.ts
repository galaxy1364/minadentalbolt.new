// @vitest-environment jsdom
// appLock.test.ts -- PIN-based app lock security (no fake assertions)
// Note: WebAuthn (biometric) tests are skipped because navigator.credentials
// is not available in jsdom. Only the localStorage + crypto.subtle PIN
// path -- which is the primary and always-available mechanism -- is tested.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isAppLockEnabled,
  setAppLockPin,
  verifyAppLockPin,
  disableAppLock,
  hasBiometricRegistered,
} from './appLock'

// jsdom provides localStorage and crypto.subtle (via vitest)
beforeEach(() => {
  localStorage.clear()
})

describe('isAppLockEnabled', () => {
  it('returns false when no lock has been set', () => {
    expect(isAppLockEnabled()).toBe(false)
  })

  it('returns true after setAppLockPin is called', async () => {
    await setAppLockPin('1234')
    expect(isAppLockEnabled()).toBe(true)
  })

  it('returns false after disableAppLock is called', async () => {
    await setAppLockPin('1234')
    disableAppLock()
    expect(isAppLockEnabled()).toBe(false)
  })
})

describe('setAppLockPin', () => {
  it('stores a hash (not the raw PIN) in localStorage', async () => {
    await setAppLockPin('9876')
    const stored = localStorage.getItem('minadent-app-lock-pin-hash')
    expect(stored).not.toBeNull()
    // Must NOT store the raw PIN
    expect(stored).not.toBe('9876')
    // SHA-256 hex is always 64 chars
    expect(stored).toHaveLength(64)
  })

  it('sets lock-enabled flag to true', async () => {
    await setAppLockPin('0000')
    expect(localStorage.getItem('minadent-app-lock-enabled')).toBe('true')
  })
})

describe('verifyAppLockPin', () => {
  it('returns false when no PIN has been set', async () => {
    expect(await verifyAppLockPin('anything')).toBe(false)
  })

  it('returns true for the correct PIN', async () => {
    await setAppLockPin('5678')
    expect(await verifyAppLockPin('5678')).toBe(true)
  })

  it('returns false for an incorrect PIN', async () => {
    await setAppLockPin('5678')
    expect(await verifyAppLockPin('0000')).toBe(false)
  })

  it('is case/content-sensitive -- different PINs produce different hashes', async () => {
    await setAppLockPin('1111')
    expect(await verifyAppLockPin('1112')).toBe(false)
  })

  it('same PIN always verifies consistently (hash is deterministic)', async () => {
    await setAppLockPin('9999')
    expect(await verifyAppLockPin('9999')).toBe(true)
    expect(await verifyAppLockPin('9999')).toBe(true)
  })
})

describe('disableAppLock', () => {
  it('removes PIN hash from localStorage', async () => {
    await setAppLockPin('1234')
    disableAppLock()
    expect(localStorage.getItem('minadent-app-lock-pin-hash')).toBeNull()
  })

  it('removes lock-enabled flag from localStorage', async () => {
    await setAppLockPin('1234')
    disableAppLock()
    expect(localStorage.getItem('minadent-app-lock-enabled')).toBeNull()
  })

  it('removes webauthn credential key', () => {
    localStorage.setItem('minadent-app-lock-webauthn-id', 'fake-cred-id')
    disableAppLock()
    expect(localStorage.getItem('minadent-app-lock-webauthn-id')).toBeNull()
  })
})

describe('hasBiometricRegistered', () => {
  it('returns false when no webauthn credential is stored', () => {
    expect(hasBiometricRegistered()).toBe(false)
  })

  it('returns true when a credential id exists in localStorage', () => {
    localStorage.setItem('minadent-app-lock-webauthn-id', 'some-credential-id')
    expect(hasBiometricRegistered()).toBe(true)
  })

  it('returns false after disableAppLock clears the credential', () => {
    localStorage.setItem('minadent-app-lock-webauthn-id', 'some-credential-id')
    disableAppLock()
    expect(hasBiometricRegistered()).toBe(false)
  })
})

