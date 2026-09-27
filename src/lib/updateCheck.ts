import { APP_VERSION } from './appVersion'

export const AUTO_CHECK_KEY = 'minadent-auto-update-check'
export const AUTO_APPLY_KEY = 'minadent-auto-apply-update'

// Some installs (home-screen PWA on iOS/Android, or a WebView shell built
// from an older snapshot) can never actually pick up a newer bundle after
// a reload — the OS/WebView keeps serving its own cached copy, so
// APP_VERSION stays stale forever and checkForUpdate() keeps reporting
// "update available" on every check. Without a cap, the auto-apply
// countdown in the update banner re-arms on every fresh page load and the
// app reloads itself every few seconds forever (constant refresh / white
// screen, reported on iPhone, Android and Desktop installs). Cap
// automatic reloads to once per browser session; after that, still show
// the banner but require the user to tap "به‌روزرسانی فوری" manually.
const AUTO_APPLY_ATTEMPTED_KEY = 'minadent-auto-apply-attempted'

export function hasAutoApplyBeenAttempted(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(AUTO_APPLY_ATTEMPTED_KEY) === '1'
}

export function markAutoApplyAttempted(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(AUTO_APPLY_ATTEMPTED_KEY, '1')
}


export interface UpdateCheckResult {
  updateAvailable: boolean
  remoteVersion: string | null
  remoteBuildDate: string | null
  remoteTimestamp: number | null
  apkUrl?: string | null
  ipaUrl?: string | null
  description?: string | null
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
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })
    if (!res.ok) throw new Error('version.json fetch failed')
    const data = await res.json()
    const remoteVersion = data.version as string
    return {
      updateAvailable: remoteVersion !== APP_VERSION,
      remoteVersion,
      remoteBuildDate: data.buildDate ?? null,
      remoteTimestamp: data.buildTimestamp ?? null,
      apkUrl: data.apkUrl ?? '/downloads/minadent.apk',
      ipaUrl: data.ipaUrl ?? '/downloads/minadent.ipa',
      description: data.description ?? null,
    }
  } catch {
    return { updateAvailable: false, remoteVersion: null, remoteBuildDate: null, remoteTimestamp: null }
  }
}

/** Forces the browser to fetch the latest app shell + service worker and reload. */
export async function applyUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        await reg.update().catch(() => {})
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }
    }
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // fall through to reload regardless
  } finally {
    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.href.split('?')[0].split('#')[0]
      const hash = window.location.hash || ''
      window.location.href = `${cleanUrl}?v=${Date.now()}${hash}`
    }
  }
}

