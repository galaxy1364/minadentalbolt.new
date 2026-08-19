import { createContext, useContext, useEffect, useState, createElement, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { currentActor } from './auditLog'

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
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('users').select('id, clinic_id, full_name, role, doctor_id').eq('id', userId).maybeSingle()
    if (!error && data) {
      setProfile(data as StaffProfile)
      currentActor.name = (data as StaffProfile).full_name
      currentActor.role = (data as StaffProfile).role
    } else {
      setProfile(null)
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
    const isPhone = identifier.startsWith('+')
    const { error } = isPhone
      ? await supabase.auth.signInWithPassword({ phone: identifier, password })
      : await supabase.auth.signInWithPassword({ email: identifier, password })
    return { error: error ? mapAuthError(error.message) : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    currentActor.name = null
    currentActor.role = null
  }

  return createElement(AuthContext.Provider, {
    value: { session, user: session?.user ?? null, profile, loading, signIn, signOut },
  }, children)
}

function mapAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'ایمیل یا رمز عبور اشتباه است'
  if (/email not confirmed/i.test(message)) return 'ایمیل شما هنوز تایید نشده است'
  return 'خطا در ورود، لطفاً دوباره تلاش کنید'
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
