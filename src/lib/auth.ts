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

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('users').select('id, clinic_id, full_name, role, doctor_id, is_active').eq('id', userId).maybeSingle()
    if (!error && data && (data as any).is_active === false) {
      // Login access was suspended (e.g. staff member on leave, access
      // revoked) — the row still exists so their history/attribution
      // stays intact, but they must not be able to use the app while
      // suspended. Sign out immediately rather than silently letting
      // them in, which is what happened before this check existed.
      await supabase.auth.signOut()
      setProfile(null)
      setNotice('دسترسی این حساب غیرفعال شده است — با مدیر کلینیک تماس بگیرید')
      currentActor.name = null
      currentActor.role = null
      return
    }
    if (!error && data) {
      setProfile(data as StaffProfile)
      setNotice(null)
      currentActor.name = (data as StaffProfile).full_name
      currentActor.role = (data as StaffProfile).role
    } else {
      // The password was accepted but this user has no row in `users`,
      // so they have no clinic and no role. canAccess() correctly limits
      // them to the dashboard, but without a word of explanation the app
      // just looks broken. This happens when invite-staff creates the
      // auth user and then fails to insert the profile row.
      setProfile(null)
      setNotice('حساب شما به هیچ کلینیکی وصل نیست — با مدیر کلینیک تماس بگیرید')
      currentActor.name = null
      currentActor.role = null
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      // Wait for the role/profile lookup to finish BEFORE letting the app
      // render — otherwise Layout's loading gate flips to "ready" while
      // profile is still null, and every role-filtered menu (بیشتر, nav,
      // route access) briefly — or in some renders, persistently —
      // computes as empty because canAccess(undefined, ...) only allows
      // '/'. This was a real bug, not an intentional restriction.
      if (data.session?.user) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) await loadProfile(newSession.user.id)
      else setProfile(null)
    })

    // Safety net for the exact scenario this clinic app will actually
    // see: the PWA left open for a full workday, phone locked/
    // backgrounded for hours in between patients. Mobile browsers can
    // throttle or fully suspend JS timers while backgrounded, so
    // supabase-js's own autoRefreshToken timer isn't guaranteed to fire
    // in time — the token can quietly expire while nobody's looking.
    // Since RLS now requires a real authenticated session (no more
    // permissive anon fallback), an expired token means sync silently
    // stops working for the rest of the day unless something notices.
    // Re-checking on visibility/focus forces supabase-js to refresh if
    // the token's stale, catching this before it causes a real problem.
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
      // The generic fallback message ("خطا در ورود") hid the actual
      // cause, which made a real login failure impossible to diagnose
      // from the phone — the only place it can be reproduced. Log the
      // real error and record it in Settings → گزارش خطاها so there's
      // something concrete to look at instead of a guess.
      console.error('[auth] signIn failed:', error.status, error.message)
      logError(error, 'react', `signIn status=${error.status ?? 'none'}`)
    }
    return { error: error ? mapAuthError(error.message, error.status) : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    currentActor.name = null
    currentActor.role = null
  }

  return createElement(AuthContext.Provider, {
    value: { session, user: session?.user ?? null, profile, loading, signIn, signOut, notice, clearNotice: () => setNotice(null) },
  }, children)
}

function mapAuthError(message: string, status?: number): string {
  if (/invalid login credentials/i.test(message)) return 'ایمیل یا رمز عبور اشتباه است'
  if (/email not confirmed/i.test(message)) return 'ایمیل شما هنوز تایید نشده است'
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
