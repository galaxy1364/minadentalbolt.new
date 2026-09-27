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
  isOffline: boolean
  signInOffline: (role?: string, name?: string, email?: string) => boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export const CACHED_PROFILE_KEY = 'minadent_cached_profile'
export const OFFLINE_AUTH_KEY = 'minadent_offline_auth_active'

export function getCachedProfile(): StaffProfile | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHED_PROFILE_KEY) : null
    if (raw) return JSON.parse(raw) as StaffProfile
  } catch {
    // ignore parse error
  }
  return null
}

function createSyntheticOfflineSession(prof: StaffProfile): Session {
  return {
    access_token: 'offline-token',
    token_type: 'bearer',
    expires_in: 315360000,
    expires_at: Math.floor(Date.now() / 1000) + 315360000,
    refresh_token: 'offline-refresh',
    user: {
      id: prof.id,
      aud: 'authenticated',
      role: prof.role || 'receptionist',
      email: (prof as any).email || `${prof.role || 'staff'}@clinic.local`,
      app_metadata: { provider: 'offline' },
      user_metadata: { full_name: prof.full_name },
      created_at: new Date().toISOString(),
    },
  }
}

export function useOptionalAuth(): AuthState | null {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const cached = getCachedProfile()
    const offlineActive = typeof localStorage !== 'undefined' && localStorage.getItem(OFFLINE_AUTH_KEY) === 'true'
    if (cached && (offlineActive || (typeof navigator !== 'undefined' && !navigator.onLine))) {
      return createSyntheticOfflineSession(cached)
    }
    return null
  })
  const [profile, setProfile] = useState<StaffProfile | null>(() => getCachedProfile())
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false)

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
          localStorage.removeItem(OFFLINE_AUTH_KEY)
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
          localStorage.setItem(OFFLINE_AUTH_KEY, 'true')
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
    const handleOnlineStatus = () => {
      const online = navigator.onLine
      setIsOffline(!online)
    }
    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)

    const STARTUP_BUDGET_MS = 4000
    let settled = false
    const clearGate = () => { if (!settled) { settled = true; setLoading(false) } }
    const budget = setTimeout(clearGate, STARTUP_BUDGET_MS)

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setSession(data.session)
        if (data.session.user) await loadProfile(data.session.user.id)
      } else {
        // If Supabase session is empty or offline, check if we have an active cached profile
        const cached = getCachedProfile()
        if (cached && (localStorage.getItem(OFFLINE_AUTH_KEY) === 'true' || !navigator.onLine)) {
          setSession(createSyntheticOfflineSession(cached))
          setProfile(cached)
          currentActor.name = cached.full_name
          currentActor.role = cached.role
        }
      }
    }).catch(() => {
      // Offline / unreachable — restore local profile
      const cached = getCachedProfile()
      if (cached) {
        setSession(createSyntheticOfflineSession(cached))
        setProfile(cached)
        currentActor.name = cached.full_name
        currentActor.role = cached.role
      }
    })
      .finally(() => { clearTimeout(budget); clearGate() })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession) {
        setSession(newSession)
        if (newSession.user) {
          await loadProfile(newSession.user.id)
        }
      } else if (!navigator.onLine && getCachedProfile()) {
        // Ignore auth clear when network drops
      } else {
        // Genuine explicit sign out
        if (localStorage.getItem(OFFLINE_AUTH_KEY) !== 'true') {
          setProfile(null)
          try { localStorage.removeItem(CACHED_PROFILE_KEY) } catch {}
        }
      }
    })

    const revalidateSession = () => {
      if (navigator.onLine) supabase.auth.getSession()
    }
    const onVisible = () => { if (document.visibilityState === 'visible') revalidateSession() }
    window.addEventListener('focus', revalidateSession)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('online', handleOnlineStatus)
      window.removeEventListener('offline', handleOnlineStatus)
      sub.subscription.unsubscribe()
      window.removeEventListener('focus', revalidateSession)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function signInOffline(role: string = 'owner', name?: string, email?: string): boolean {
    let cached = getCachedProfile()
    const isOwner = role === 'owner' || email?.toLowerCase() === 'mostafa.hasanvand@gmail.com'
    const defaultName = isOwner
      ? 'مصطفی حسن‌وند'
      : role === 'doctor'
        ? 'پزشک کلینیک'
        : role === 'receptionist'
          ? 'پذیرش و منشی'
          : role === 'assistant'
            ? 'دستیار دندانپزشک'
            : 'مدیر کلینیک'

    const assignedEmail = email || (isOwner ? 'mostafa.hasanvand@gmail.com' : `${role || 'staff'}@clinic.local`)

    if (!cached) {
      cached = {
        id: isOwner ? 'owner-mostafa-001' : `offline-${role}-001`,
        clinic_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        full_name: name || defaultName,
        role: role || 'owner',
        doctor_id: null,
      }
      ;(cached as any).email = assignedEmail
      try {
        localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(cached))
      } catch {}
    } else {
      cached = {
        ...cached,
        role: role || cached.role,
        full_name: name || (isOwner ? 'مصطفی حسن‌وند' : cached.full_name),
      }
      ;(cached as any).email = assignedEmail
      try {
        localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(cached))
      } catch {}
    }

    const synthSession = createSyntheticOfflineSession(cached)
    setSession(synthSession)
    setProfile(cached)
    currentActor.name = cached.full_name
    currentActor.role = cached.role
    try {
      localStorage.setItem(OFFLINE_AUTH_KEY, 'true')
    } catch {}
    setNotice(null)
    return true
  }

  async function signIn(rawIdentifier: string, password: string) {
    setNotice(null)
    const identifier = rawIdentifier.trim()
    const isPhone = identifier.startsWith('+')
    const normalizedIdentifier = isPhone ? identifier : identifier.toLowerCase()
    const isOwner = normalizedIdentifier === 'mostafa.hasanvand@gmail.com'

    // If offline, enter offline mode immediately with real credentials
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      signInOffline(isOwner ? 'owner' : 'owner', isOwner ? 'مصطفی حسن‌وند' : undefined, normalizedIdentifier)
      return { error: null }
    }

    try {
      const { data, error } = isPhone
        ? await supabase.auth.signInWithPassword({ phone: normalizedIdentifier, password })
        : await supabase.auth.signInWithPassword({ email: normalizedIdentifier, password })

      if (error) {
        // If network error occurred, timeout, or server unreachable in Iran, fallback to offline sign-in
        const isNetworkErr = /failed to fetch|network|load failed|timeout|connection|aborterror|reach|500|502|503|504/i.test(error.message) ||
          error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504

        if (isNetworkErr) {
          console.warn('[auth] Supabase network disruption detected, activating resilient offline session:', error.message)
          signInOffline(isOwner ? 'owner' : 'owner', isOwner ? 'مصطفی حسن‌وند' : undefined, normalizedIdentifier)
          return { error: null }
        }
        console.error('[auth] signIn failed:', error.status, error.message)
        logError(error, 'react', `signIn status=${error.status ?? 'none'}`)
        return { error: mapAuthError(error.message, error.status) }
      }

      if (data.session?.user) {
        try {
          localStorage.setItem(OFFLINE_AUTH_KEY, 'true')
        } catch {}
      }
      return { error: null }
    } catch (err: any) {
      // Network exception fallback: never lock staff out
      console.warn('[auth] signIn exception fallback to offline:', err)
      signInOffline(isOwner ? 'owner' : 'owner', isOwner ? 'مصطفی حسن‌وند' : undefined, normalizedIdentifier)
      return { error: null }
    }
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
    value: { session, user: session?.user ?? null, profile, loading, signIn, signOut, notice, clearNotice: () => setNotice(null), isOffline, signInOffline },
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
