import { APP_VERSION } from './appVersion'

export const AUTO_CHECK_KEY = 'minadent-auto-update-check'
export const AUTO_APPLY_KEY = 'minadent-auto-apply-update'


export interface UpdateCheckResult {
  updateAvailable: boolean
  remoteVersion: string | null
  remoteBuildDate: string | null
  remoteTimestamp: number | null
}

export function isAutoCheckEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(AUTO_CHECK_KEY) !== 'false'
}

export function setAutoCheckEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(AUTO_CHECK_KEY, String(enabled))
}

export function isAutoApplyEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(AUTO_APPLY_KEY) !== 'false'
}

export function setAutoApplyEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(AUTO_APPLY_KEY, String(enabled))
}

/**
 * Compares the version baked into the currently-running bundle
 * (APP_VERSION) against public/version.json fetched fresh from the
 * server. Because they're two separate files, a new deploy can update
 * version.json (a tiny static file) independently of whether the
 * browser has fully picked up the new JS bundle yet — this is the most
 * reliable "is there something newer than what I'm running" check,
 * independent of service-worker cache timing.
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('version.json fetch failed')
    const data = await res.json()
    const remoteVersion = data.version as string
    return {
      updateAvailable: remoteVersion !== APP_VERSION,
      remoteVersion,
      remoteBuildDate: data.buildDate ?? null,
      remoteTimestamp: data.buildTimestamp ?? null,
    }
  } catch {
    return { updateAvailable: false, remoteVersion: null, remoteBuildDate: null, remoteTimestamp: null }
  }
}

/** Forces the browser to fetch the latest app shell + service worker and reload. */
export async function applyUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) await reg.update()
    }
  } catch {
    // fall through to reload regardless
  } finally {
    window.location.reload()
  }
}

