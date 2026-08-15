import { APP_VERSION } from './appVersion'

export interface UpdateCheckResult {
  updateAvailable: boolean
  remoteVersion: string | null
  remoteBuildDate: string | null
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
    }
  } catch {
    return { updateAvailable: false, remoteVersion: null, remoteBuildDate: null }
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
