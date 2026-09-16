import { createContext, useContext, useEffect, useState, createElement, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { currentActor } from './auditLog'
import { logError } from './errorLog'

export interface StaffProfile {
  id: string
  clinic_id: string
  full_name: string | null
  role: string | null
  doctor_id: string | null
}

interface AuthState {
  session: Session | null
  user: User | null
  profile: StaffProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  /**
   * MOD-FIX-009: why the last session ended, when it ended for a reason
   * the password was not responsible for. A suspended account was signed
   * straight back out with no message at all, so the login screen simply
   * reappeared — indistinguishable from a wrong password, and impossible
   * to diagnose from the phone.
   */
  notice: string | null
  clearNotice: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export const CACHED_PROFILE_KEY = 'minadent_cached_profile'

function getCachedProfile(): StaffProfile | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHED_PROFILE_KEY) : null
    if (raw) return JSON.parse(raw) as StaffProfile
  } catch {
    // ignore parse error
  }
  return null
}

export function useOptionalAuth(): AuthState | null {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(() => getCachedProfile())
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase.from('users').select('id, clinic_id, full_name, role, doctor_id, is_active').eq('id', userId).maybeSingle()
      if (error) {
        // Network failure, offline, timeout, or DB transient error:
        // Do NOT clear the profile! Retain whatever valid profile is already cached.
        console.warn('[auth] loadProfile network error, keeping cached profile:', error.message)
        return
      }
      if (data && (data as any).is_active === false) {
        // Login access was suspended — clear session and storage immediately
        try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
        try {
          localStorage.removeItem(CACHED_PROFILE_KEY)
          localStorage.removeItem('minadent-auth')
        } catch {}
        setSession(null)
        setProfile(null)
        setNotice('دسترسی این حساب غیرفعال شده است — با مدیر کلینیک تماس بگیرید')
        currentActor.name = null
        currentActor.role = null
        return
      }
      if (data) {
        const staffProf = data as StaffProfile
        setProfile(staffProf)
        try {
          localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(staffProf))
        } catch {}
        setNotice(null)
        currentActor.name = staffProf.full_name
        currentActor.role = staffProf.role
      } else {
        // Query succeeded (200 OK) but no user row exists in `users`
        const cached = getCachedProfile()
        if (cached && cached.id === userId) {
          // If we had a matching cached profile for this user ID, retain it
          return
        }
        setProfile(null)
        try { localStorage.removeItem(CACHED_PROFILE_KEY) } catch {}
        setNotice('حساب شما به هیچ کلینیکی وصل نیست — با مدیر کلینیک تماس بگیرید')
        currentActor.name = null
        currentActor.role = null
      }
    } catch (err) {
      console.warn('[auth] loadProfile unexpected error, keeping cached profile:', err)
    }
  }

  useEffect(() => {
    // MOD-FIX-032: the loading gate must NEVER depend on the network
    // resolving. Bound the gate with a timeout so the app opens within
    // STARTUP_BUDGET even on slow or offline networks.
    const STARTUP_BUDGET_MS = 4000
    let settled = false
    const clearGate = () => { if (!settled) { settled = true; setLoading(false) } }
    const budget = setTimeout(clearGate, STARTUP_BUDGET_MS)

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user.id)
    }).catch(() => { /* offline / unreachable — open on local data anyway */ })
      .finally(() => { clearTimeout(budget); clearGate() })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        await loadProfile(newSession.user.id)
      } else if (!newSession) {
        setProfile(null)
        try { localStorage.removeItem(CACHED_PROFILE_KEY) } catch {}
      }
    })

    const revalidateSession = () => { supabase.auth.getSession() }
    const onVisible = () => { if (document.visibilityState === 'visible') revalidateSession() }
    window.addEventListener('focus', revalidateSession)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('focus', revalidateSession)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  async function signIn(identifier: string, password: string) {
    setNotice(null)
    const isPhone = identifier.startsWith('+')
    const { error } = isPhone
      ? await supabase.auth.signInWithPassword({ phone: identifier, password })
      : await supabase.auth.signInWithPassword({ email: identifier, password })
    if (error) {
      console.error('[auth] signIn failed:', error.status, error.message)
      logError(error, 'react', `signIn status=${error.status ?? 'none'}`)
    }
    return { error: error ? mapAuthError(error.message, error.status) : null }
  }

  async function signOut(): Promise<void> {
    // 1. Attempt graceful Supabase sign out with local scope and a fast timeout
    // so network failure can NEVER hang or prevent logout.
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ])
    } catch (e) {
      console.warn('[auth] supabase.auth.signOut local error/timeout:', e)
    }

    // 2. Clear all local storage keys related to auth and profile
    try {
      localStorage.removeItem('minadent-auth')
      localStorage.removeItem(CACHED_PROFILE_KEY)
      sessionStorage.removeItem('minadent-auth')
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('sb-') || key.includes('auth'))) {
          localStorage.removeItem(key)
        }
      }
    } catch (e) {
      console.warn('[auth] storage cleanup error:', e)
    }

    // 3. Immediately reset all React state
    setSession(null)
    setProfile(null)
    setNotice(null)
    currentActor.name = null
    currentActor.role = null

    // 4. Reset hash to '/' so when they re-login they land cleanly on dashboard
    if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '') {
      window.location.hash = '#/'
    }
  }

  return createElement(AuthContext.Provider, {
    value: { session, user: session?.user ?? null, profile, loading, signIn, signOut, notice, clearNotice: () => setNotice(null) },
  }, children)
}

export function mapAuthError(message: string, status?: number): string {
  if (/invalid login credentials/i.test(message)) return 'ایمیل یا رمز عبور اشتباه است'
  if (/email not confirmed/i.test(message)) return 'ایمیل شما هنوز تایید نشده است'
  // MOD-FIX-010: the server logs showed real attempts failing with
  // 422 phone_provider_disabled. Phone sign-in is switched off in the
  // Supabase project (it needs an SMS provider, which this clinic does
  // not have yet), so the phone tab cannot succeed no matter what is
  // typed. Saying so beats the generic message, which sent the user
  // back to retype a password that was never the problem.
  if (/phone.*disabled|phone_provider_disabled/i.test(message)) {
    return 'ورود با شماره موبایل هنوز فعال نیست — با ایمیل وارد شوید'
  }
  // Supabase returns 429 when too many attempts hit the same account or
  // IP in a short window. Retrying immediately makes it worse, so say
  // that plainly rather than inviting another attempt.
  if (status === 429 || /rate limit|too many/i.test(message)) {
    return 'تعداد تلاش‌ها زیاد بوده — چند دقیقه صبر کنید و دوباره تلاش کنید'
  }
  // A failed fetch means the request never reached the server at all —
  // network, DNS, or a paused project. Completely different from a
  // rejected password, and the user needs to know which.
  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'اتصال به سرور برقرار نشد — اینترنت را بررسی کنید'
  }
  if (status === 401 || /api key|apikey|jwt/i.test(message)) {
    return 'کلید اتصال به سرور نامعتبر است — با پشتیبانی تماس بگیرید'
  }
  return `خطا در ورود: ${message}`
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
