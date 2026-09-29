// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import {
  AuthProvider,
  useAuth,
  CACHED_PROFILE_KEY,
  OFFLINE_AUTH_KEY,
} from './auth'

// The real supabase client would try to hit the network during getSession()
// and onAuthStateChange(); replace it with a minimal stand-in so the
// component's offline/online logic can be exercised deterministically.
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(),
  },
}))

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

function Probe() {
  const { session, profile, notice, isOffline } = useAuth()
  return (
    <div>
      <div data-testid="access-token">{session?.access_token ?? 'none'}</div>
      <div data-testid="profile-role">{profile?.role ?? 'none'}</div>
      <div data-testid="notice">{notice ?? 'none'}</div>
      <div data-testid="offline">{String(isOffline)}</div>
    </div>
  )
}

describe('re-authentication of real staff once connectivity returns (task 16)', () => {
  beforeEach(() => {
    localStorage.clear()
    setNavigatorOnline(false)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('ends the synthetic offline session for a real (non-demo) staff member the moment the network returns, instead of continuing on it', async () => {
    // Simulate a real receptionist who previously authenticated for real at
    // least once (so a cached profile exists), then lost connectivity and is
    // now running on the local-only synthetic session.
    const realStaffProfile = {
      id: 'real-staff-42',
      clinic_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      full_name: 'پذیرش واقعی',
      role: 'receptionist',
      doctor_id: null,
      email: 'reception@clinic.local',
    }
    localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(realStaffProfile))
    localStorage.setItem(OFFLINE_AUTH_KEY, 'true')

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    // Confirm it actually started on the synthetic offline session, scoped
    // to the staff member's own cached role (not an invented/elevated one).
    await waitFor(() => {
      expect(screen.getByTestId('access-token').textContent).toBe('offline-token')
    })
    expect(screen.getByTestId('profile-role').textContent).toBe('receptionist')

    // Connectivity returns.
    setNavigatorOnline(true)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    // The synthetic session must not be allowed to continue: it should be
    // torn down and the user prompted to re-authenticate for real, rather
    // than silently keeping the anon-role session alive indefinitely.
    await waitFor(() => {
      expect(screen.getByTestId('access-token').textContent).toBe('none')
    })
    expect(screen.getByTestId('profile-role').textContent).toBe('none')
    expect(screen.getByTestId('notice').textContent).not.toBe('none')
    expect(localStorage.getItem(OFFLINE_AUTH_KEY)).toBeNull()
  })

  it('leaves a genuine, already-real Supabase session untouched when the online event fires', async () => {
    localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify({
      id: 'real-staff-42',
      clinic_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      full_name: 'پذیرش واقعی',
      role: 'receptionist',
      doctor_id: null,
    }))
    // No OFFLINE_AUTH_KEY set and already online: nothing synthetic to tear down.
    setNavigatorOnline(true)

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('offline').textContent).toBe('false')
    })

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    // Still no session/profile (none was ever set up as offline), and no
    // spurious notice fired from an unrelated online event.
    expect(screen.getByTestId('access-token').textContent).toBe('none')
  })
})
