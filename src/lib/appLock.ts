// appLock.ts — local app-lock: PIN is the always-works primary
// mechanism (hashed, never stored in plaintext); WebAuthn platform
// authenticator (Face ID / Touch ID / Android fingerprint) is an
// optional quick-unlock shortcut on top of it, IF the device supports
// it. Important honesty note: without a server verifying a WebAuthn
// challenge, this isn't cryptographic "authentication" in the strict
// sense — it's a genuine trigger of the device's own biometric prompt
// used as a local gate, which is what an app-lock actually needs. The
// PIN always works as a fallback if biometric isn't available/fails,
// so nobody can be permanently locked out.
const PIN_HASH_KEY = 'minadent-app-lock-pin-hash'
const LOCK_ENABLED_KEY = 'minadent-app-lock-enabled'
const WEBAUTHN_CRED_KEY = 'minadent-app-lock-webauthn-id'

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isAppLockEnabled(): boolean {
  return localStorage.getItem(LOCK_ENABLED_KEY) === 'true'
}

export async function setAppLockPin(pin: string): Promise<void> {
  const hash = await sha256(pin)
  localStorage.setItem(PIN_HASH_KEY, hash)
  localStorage.setItem(LOCK_ENABLED_KEY, 'true')
}

export async function verifyAppLockPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_HASH_KEY)
  if (!stored) return false
  return (await sha256(pin)) === stored
}

export function disableAppLock(): void {
  localStorage.removeItem(LOCK_ENABLED_KEY)
  localStorage.removeItem(PIN_HASH_KEY)
  localStorage.removeItem(WEBAUTHN_CRED_KEY)
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

/** Registers a platform-authenticator (Face ID/Touch ID/fingerprint)
 * credential purely as a local unlock trigger — no server round-trip. */
export async function registerBiometric(): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'مینادنت' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'clinic-lock', displayName: 'قفل مینادنت' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null
    if (!cred) return false
    localStorage.setItem(WEBAUTHN_CRED_KEY, cred.id)
    return true
  } catch { return false }
}

export function hasBiometricRegistered(): boolean {
  return !!localStorage.getItem(WEBAUTHN_CRED_KEY)
}

/** Triggers the OS biometric prompt to unlock. Returns false (never
 * throws to the caller) on any cancellation/failure so the UI can
 * cleanly fall back to PIN entry. */
export async function verifyBiometric(): Promise<boolean> {
  const credId = localStorage.getItem(WEBAUTHN_CRED_KEY)
  if (!credId) return false
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: Uint8Array.from(atob(credId.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!assertion
  } catch { return false }
}
