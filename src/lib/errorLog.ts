/**
 * Self-hosted error logging.
 *
 * There's no Sentry/Bugsnag account connected to this project (that needs
 * the clinic owner's own signup + DSN key), so this is a lightweight
 * built-in alternative: every uncaught error, unhandled promise rejection,
 * and React render error gets recorded locally (last 50, rolling) so the
 * admin can see what actually broke for a user instead of never finding
 * out. See it under Settings → گزارش خطاها.
 */

const STORAGE_KEY = 'minadent-error-log'
const MAX_ENTRIES = 50

export interface LoggedError {
  id: string
  message: string
  stack: string | null
  source: 'window' | 'promise' | 'react'
  context: string | null
  url: string
  timestamp: string
}

export function logError(error: unknown, source: LoggedError['source'], context?: string) {
  try {
    const entry: LoggedError = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? (error.stack ?? null) : null,
      source,
      context: context ?? null,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
    }
    const existing = getErrorLog()
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Logging must never itself throw and cause a secondary crash.
  }
}

export function getErrorLog(): LoggedError[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearErrorLog() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Call once at app startup to catch anything outside React's render tree. */
export function initGlobalErrorLogging() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (event) => {
    logError(event.error ?? event.message, 'window')
  })
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, 'promise')
  })
}
