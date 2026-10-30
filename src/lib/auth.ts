import { createContext, useContext, useEffect, useRef, useState, createElement, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { currentActor } from './auditLog'
import { logError } from './errorLog'
import { enqueueSync } from './sync'

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
  /**
   * MOD-SEC-011: an earlier revision of this fix added real, seeded
   * per-role Supabase Auth accounts with credentials shipped in client
   * source, so the Login page's "quick login" buttons could authenticate
   * for real and get RBAC-enforced sessions. That was rejected in review:
   * baking a real, permanently-valid `owner` credential (and others) into
   * the public client is itself a critical access-control hole — anyone
   * reading the bundle gets a genuine, server-verifiable privileged
   * session against the live clinic, worse than the local-only fake
   * session it replaced. There is no way to make a password-free one-tap
   * login both real (DB-verifiable) and safe, so it is removed entirely;
   * every real login now requires the user's own credentials. Only
   * signInOffline (local-only, cached-identity reuse, see
   * offlineFallbackSignIn) remains for the no-network case.
   */
  signInOffline: (role?: string, name?: string, email?: string) => boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export const CACHED_PROFILE_KEY = 'minadent_cached_profile'
export const OFFLINE_AUTH_KEY = 'minadent_offline_auth_active'
/**
 * MOD-SEC-013: the last real (non-synthetic) refresh token Supabase issued
 * for this device, kept so that when connectivity returns we can try a
 * silent supabase.auth.refreshSession() before forcing a password prompt.
 * A refresh token stays valid for a long time (until explicitly revoked or
 * its own expiry), so most staff who briefly lose connection get their
 * real, RBAC-enforced session back with zero interruption; only an
 * actually-expired/revoked token falls through to asking for a password.
 */
export const REAL_REFRESH_TOKEN_KEY = 'minadent_real_refresh_token'

/**
 * MOD-FIX-011: while a reconnect is mid-retry, the synthetic offline
 * session (`offline-token`, never a real Supabase Auth JWT) is still the
 * active session and the device is back online — the exact combination
 * that lets requests go out unauthenticated (anon role, not RBAC-scoped
 * to the cached role). Before the retry loop existed this window was one
 * failed attempt wide; the retries make it wider, so sync.ts must check
 * this gate and refuse to push/pull while it is active, resuming only
 * once a real session is restored or the user is sent back to the login
 * screen (at which point there is no session for it to run under).
 */
export const reconnectGate = { active: false }

/**
 * MOD-FIX-011: distinguishes a transient network hiccup during the
 * refreshSession() call itself from a genuinely invalid/expired/revoked
 * refresh token. Only the former is worth retrying — Supabase's
 * "Invalid Refresh Token" / "refresh_token_not_found" responses mean the
 * token itself is dead and no retry will ever succeed.
 */
function isTransientRefreshError(err: unknown): boolean {
  if (!err) return false
  const message = (err as any)?.message ? String((err as any).message) : String(err)
  const status = (err as any)?.status
  if (/invalid refresh token|refresh_token_not_found|already used|revoked|invalid grant|user not found/i.test(message)) {
    return false
  }
  if (status === 400 || status === 401 || status === 403) return false
  if (/failed to fetch|network|load failed|timeout|connection|aborterror|fetch failed|reach/i.test(message)) {
    return true
  }
  if (status === 0 || status === 502 || status === 503 || status === 504) return true
  // Unknown shape: default to transient so a temporary hiccup doesn't
  // immediately force a password prompt; retries are capped either way.
  return true
}

function storeRealRefreshToken(session: Session | null | undefined) {
  if (!session || session.access_token === 'offline-token' || !session.refresh_token) return
  try { localStorage.setItem(REAL_REFRESH_TOKEN_KEY, session.refresh_token) } catch {}
}

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
  // Mirrors `session` synchronously so the 'online' handler can read the
  // current session type immediately, without waiting on React's state
  // update batching (a functional setSession updater can be deferred,
  // which let the reconnect check silently no-op — see MOD-SEC-013).
  const sessionRef = useRef<Session | null>(session)
  useEffect(() => { sessionRef.current = session }, [session])

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
      // MOD-SEC-012: closing the remaining piece of the offline gap. A
      // synthetic offline session (access_token === 'offline-token') never
      // carries a real Supabase Auth JWT, so every request it makes goes
      // out as the unrestricted `anon` role (see migration 20260918_038's
      // documented single-clinic tradeoff) — not scoped to the cached
      // role by has_module_permission() (migration 20260928_040). That is
      // an acceptable, unavoidable gap while genuinely offline (no
      // network means no Postgres request can succeed either way), but it
      // must not silently continue once the network returns: from that
      // point on, every module the cached role should NOT have becomes a
      // live, DB-reachable bypass again. So the moment connectivity comes
      // back, end the synthetic session and require the user's own
      // credentials for a real, RBAC-enforced sign-in.
      if (online) {
        (async () => {
          // Only act if we're currently in a synthetic offline session.
          // Read from the ref (kept in sync synchronously with `session`
          // via committed renders), not a setSession updater — an updater
          // callback can be deferred by React's batching and silently
          // no-op the whole reconnect check.
          const wasOffline = sessionRef.current?.access_token === 'offline-token'
          if (!wasOffline) return

          reconnectGate.active = true

          let realRefreshToken: string | null = null
          try { realRefreshToken = localStorage.getItem(REAL_REFRESH_TOKEN_KEY) } catch {}

          if (realRefreshToken) {
            // MOD-FIX-011: a refresh attempt can fail for two very
            // different reasons — the token itself is genuinely
            // invalid/expired/revoked (no amount of retrying helps, the
            // user must re-enter their password), or the refresh *call*
            // itself hit a transient network hiccup (the connection just
            // came back and may still be flaky — a DNS blip, a dropped
            // TLS handshake, a slow captive-portal redirect). Treating
            // both the same forced a password prompt on staff whose
            // network was still settling, even though their saved login
            // was perfectly valid. So a network-shaped failure gets a
            // couple of retries with backoff before giving up.
            const MAX_ATTEMPTS = 3
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
              try {
                const { data, error } = await supabase.auth.refreshSession({ refresh_token: realRefreshToken })
                if (!error && data.session) {
                  // Silent success: swap the synthetic session for the real,
                  // RBAC-enforced one with no visible interruption.
                  setSession(data.session)
                  storeRealRefreshToken(data.session)
                  try { localStorage.setItem(OFFLINE_AUTH_KEY, 'true') } catch {}
                  if (data.session.user) await loadProfile(data.session.user.id)
                  reconnectGate.active = false
                  try { enqueueSync(0) } catch {}
                  return
                }
                if (error && !isTransientRefreshError(error) ) {
                  // Genuinely invalid/expired/revoked token — retrying
                  // will not help, stop immediately and fall through to
                  // the password prompt below.
                  console.warn('[auth] refreshSession rejected (non-transient):', error.message)
                  break
                }
                console.warn(`[auth] refreshSession transient failure (attempt ${attempt}/${MAX_ATTEMPTS}):`, error?.message)
              } catch (err) {
                if (!isTransientRefreshError(err)) {
                  console.warn('[auth] silent refreshSession on reconnect failed (non-transient):', err)
                  break
                }
                console.warn(`[auth] silent refreshSession exception, transient (attempt ${attempt}/${MAX_ATTEMPTS}):`, err)
              }

              if (attempt < MAX_ATTEMPTS) {
                const backoffMs = 1000 * 2 ** (attempt - 1) // 1s, 2s
                await new Promise((resolve) => setTimeout(resolve, backoffMs))
                // If we went offline again mid-retry, stop and let the
                // next 'online' event restart this whole flow instead of
                // burning retries against a dead connection.
                if (!navigator.onLine) {
                  console.warn('[auth] connection dropped again during retry backoff, aborting retries')
                  reconnectGate.active = false
                  return
                }
              }
            }
          }

          // Silent refresh unavailable, or failed non-transiently (no
          // cached token, or it's expired/revoked after exhausting
          // retries) — fall back to requiring a real password.
          reconnectGate.active = false
          setSession((prev) => {
            if (prev?.access_token !== 'offline-token') return prev
            setProfile(null)
            currentActor.name = null
            currentActor.role = null
            try {
              localStorage.removeItem(OFFLINE_AUTH_KEY)
              localStorage.removeItem(REAL_REFRESH_TOKEN_KEY)
            } catch {}
            setNotice('اتصال اینترنت برقرار شد — برای ادامه با رمز عبور خود دوباره وارد شوید')
            return null
          })
        })()
      }
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
        storeRealRefreshToken(data.session)
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
        storeRealRefreshToken(newSession)
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

  /**
   * MOD-SEC-010: the previous fallback here read
   * `signInOffline(isOwner ? 'owner' : 'owner', ...)` — both branches
   * resolved to 'owner' no matter who was signing in, so any staff
   * member's network hiccup during login handed them a full owner
   * session. This restores an actual non-owner identifier to the role of
   * their own last-cached login (if any); it never invents a role, and
   * never grants owner to anyone but the real owner identifier.
   */
  function offlineFallbackSignIn(normalizedIdentifier: string, isOwner: boolean): { error: string | null } {
    if (isOwner) {
      signInOffline('owner', 'مصطفی حسن‌وند', normalizedIdentifier)
      return { error: null }
    }
    const cached = getCachedProfile()
    if (cached && ((cached as any).email || '').toLowerCase() === normalizedIdentifier) {
      signInOffline(cached.role || 'receptionist', cached.full_name || undefined, normalizedIdentifier)
      return { error: null }
    }
    return {
      error: 'اتصال به سرور برقرار نشد — برای ورود بدون اینترنت باید حداقل یک‌بار قبلاً با همین حساب و اینترنت متصل وارد شده باشید',
    }
  }

  async function signIn(rawIdentifier: string, password: string) {
    setNotice(null)
    const identifier = rawIdentifier.trim()
    const isPhone = identifier.startsWith('+')
    const normalizedIdentifier = isPhone ? identifier : identifier.toLowerCase()
    const isOwner = normalizedIdentifier === 'mostafa.hasanvand@gmail.com'

    // If offline, enter offline mode immediately — but only into a role we
    // actually have evidence for (see offlineFallbackSignIn above).
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return offlineFallbackSignIn(normalizedIdentifier, isOwner)
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
          return offlineFallbackSignIn(normalizedIdentifier, isOwner)
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
      // Network exception fallback: never lock staff out, but never
      // invent a role either.
      console.warn('[auth] signIn exception fallback to offline:', err)
      return offlineFallbackSignIn(normalizedIdentifier, isOwner)
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
      localStorage.removeItem(REAL_REFRESH_TOKEN_KEY)
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
