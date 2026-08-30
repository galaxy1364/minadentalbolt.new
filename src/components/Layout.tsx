import React, { useState, useEffect, useRef, useCallback } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  MoreHorizontal, X, Wifi, WifiOff, RefreshCw, Moon, Sun, LogOut, AlertTriangle, Sparkles,
} from 'lucide-react'
import { Spinner, ToastContainer, Button } from './ui'
import AICommandBar from './AICommandBar'
import { DynamicIsland, pushIslandNotification } from './DynamicIsland'
import { ErrorBoundary } from './ErrorBoundary'
import { MinadentLogo } from './MinadentLogo'
import Login from '../pages/Login'
import { useAuth } from '../lib/auth'
import { canAccess, REQUIRE_LOGIN } from '../lib/permissions'
import { isAppLockEnabled } from '../lib/appLock'
import { AppLockScreen } from './AppLockScreen'
import { ModuleIconBadge } from './ModuleIconBadge'
import { APP_VERSION } from '../lib/appVersion'
import { checkForUpdate, applyUpdate } from '../lib/updateCheck'
import {
  primaryModules, secondaryModules, allModules,
  getModuleByPath, setModuleTheme, type ModuleIdentity,
} from '../theme/modules'
import { subscribeSync, initSyncEngine, syncNow, SyncStatus } from '../lib/sync'
import { fetchPayments, fetchTreatments, fetchImplantCases, loadRolePermissionOverrides } from '../lib/api'
import { runAutoBackupIfNeeded } from '../lib/autoBackup'
import { calcAllPatientBalances } from '../lib/finance'
import { h } from '../lib/haptics'
import { CheckCircle2, CloudOff } from 'lucide-react'
import { hasSupabaseCredentials } from '../lib/supabase'

// ── Dark mode toggle ───────────────────────────────────
function DarkModeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('minadent-dark')
    if (stored !== null) return stored === 'true'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'minadent-dark') setDark(e.newValue === 'true')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return (
    <button
      onClick={() => { h.tap(); const n = !dark; setDark(n); document.documentElement.classList.toggle('dark', n); localStorage.setItem('minadent-dark', String(n)) }}
      aria-label={dark ? 'حالت روشن' : 'حالت تاریک'}
      className="flex items-center justify-center w-9 h-9 rounded-xl glass border border-white/60 dark:border-white/10 text-slate-600 dark:text-amber-400 transition-all-smooth active:scale-90"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

// ── Sync indicator ──────────────────────────────────────
// ── Update banner (manual + automatic) ──────────────────────────
const AUTO_CHECK_KEY = 'minadent-auto-update-check'
const AUTO_CHECK_INTERVAL = 15 * 60 * 1000 // 15 minutes

function UpdateBanner() {
  const [available, setAvailable] = useState(false)
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [updating, setUpdating] = useState(false)

  const runCheck = useCallback(async () => {
    const autoEnabled = localStorage.getItem(AUTO_CHECK_KEY) !== 'false'
    if (!autoEnabled) return
    const result = await checkForUpdate()
    if (result.updateAvailable) {
      setAvailable(true)
      setRemoteVersion(result.remoteVersion)
    }
  }, [])

  useEffect(() => {
    runCheck()
    const interval = setInterval(runCheck, AUTO_CHECK_INTERVAL)
    const onVisible = () => { if (document.visibilityState === 'visible') runCheck() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [runCheck])

  if (!available || dismissed) return null

  return (
    <div className="px-3 pt-2">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-l from-violet-600 to-sky-500 text-white shadow-md">
        <Sparkles size={16} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold">نسخه‌ی جدیدی موجود است{remoteVersion ? ` (${remoteVersion})` : ''}</p>
          <p className="text-[10px] text-white/80">برای دریافت آخرین بهبودها به‌روزرسانی کنید</p>
        </div>
        <button
          onClick={async () => { h.confirm(); setUpdating(true); await applyUpdate() }}
          disabled={updating}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold transition-all-smooth press-scale disabled:opacity-60"
        >
          {updating ? 'در حال بارگذاری...' : 'به‌روزرسانی'}
        </button>
        <button onClick={() => { h.cancel(); setDismissed(true) }} aria-label="بعداً" className="shrink-0 p-1 rounded-lg hover:bg-white/20">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function SyncIndicator() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const prevStatus = useRef<SyncStatus>('idle')
  const prevFailed = useRef(0)

  useEffect(() => {
    const unsub = subscribeSync((s, p, _lastSync, f) => {
      setStatus(s); setPending(p); setSpinning(s === 'syncing'); setFailed(f)
      // Only notify on an actual transition (e.g. offline -> online, or a
      // sync that just finished pushing real changes) — not on every
      // background poll tick, which would otherwise pop up a toast every
      // ~30s even when nothing changed.
      const changed = prevStatus.current !== s
      if (s === 'online' && p === 0 && changed) {
        pushIslandNotification({ id: 'sync-done', title: 'همگام‌سازی کامل', message: 'داده‌ها به‌روزرسانی شد', icon: <CheckCircle2 size={16} />, color: '#0d9488', duration: 3000 })
      } else if ((s === 'offline') && changed) {
        pushIslandNotification({ id: 'sync-off', title: 'حالت آفلاین', message: 'تغییرات بعداً همگام می‌شوند', icon: <CloudOff size={16} />, color: '#f59e0b', duration: 3000 })
      }
      // Failed items need a persistent, hard-to-miss alert — this is real
      // data that couldn't reach the server after repeated attempts.
      if (f > prevFailed.current) {
        pushIslandNotification({ id: 'sync-failed', title: 'نیاز به بررسی', message: `${f} مورد همگام‌سازی نشد — تنظیمات را ببینید`, icon: <AlertTriangle size={16} />, color: '#dc2626', duration: 6000 })
      }
      prevStatus.current = s
      prevFailed.current = f
    })
    return unsub
  }, [])

  const isOnline = status === 'online' || status === 'syncing' || status === 'idle'
  const hasFailed = failed > 0
  const label = hasFailed
    ? `${failed} مورد همگام‌سازی نشد — برای بررسی بزنید`
    : spinning ? 'در حال همگام‌سازی' : isOnline ? 'آنلاین' : 'حالت آفلاین — تغییرات با اتصال اینترنت سینک می‌شود'

  return (
    <button
      onClick={() => { h.tap(); if (hasFailed) navigate('/settings'); else if (isOnline) syncNow() }}
      aria-label={label}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass border transition-all-smooth active:scale-95 ${
        hasFailed ? 'border-error-300 dark:border-error-700 bg-error-50/90 dark:bg-error-900/30' :
        isOnline ? 'border-white/60 dark:border-white/10' :
        'border-warning-300 dark:border-warning-700 bg-warning-50/80 dark:bg-warning-900/20'
      }`}
    >
      {hasFailed
        ? <AlertTriangle size={13} className="text-error-600" />
        : spinning
          ? <RefreshCw size={13} className="animate-spin text-primary-600" />
          : isOnline
            ? <Wifi size={13} className="text-primary-600" />
            : <WifiOff size={13} className="text-warning-600" />
      }
      <div className={`w-1.5 h-1.5 rounded-full ${hasFailed ? 'bg-error-500 animate-pulse' : isOnline ? 'bg-primary-500' : 'bg-warning-500'} ${isOnline && !spinning && !hasFailed ? 'animate-pulse' : ''}`} />
      {hasFailed ? <span className="text-[10px] text-error-600 font-bold">{failed}</span> : pending > 0 && <span className="text-[10px] text-slate-500 font-medium">{pending}</span>}
    </button>
  )
}

// ── Offline banner ──────────────────────────────────────
// ── More drawer ─────────────────────────────────────────
function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const visibleModules = secondaryModules.filter((item: ModuleIdentity) => canAccess(profile?.role, item.path))

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" onClick={() => { h.cancel(); onClose() }}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-ios-xl pb-safe drawer-in flex flex-col overflow-hidden"
        style={{
          maxHeight: '90dvh',
          background: 'linear-gradient(160deg, rgba(139,92,246,0.12), rgba(6,182,212,0.10) 45%, rgba(255,255,255,1) 75%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dark:bg-slate-800/95 absolute inset-0 -z-10 dark:block hidden" />
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">همه ماژول‌ها</h3>
          <button onClick={() => { h.cancel(); onClose() }} aria-label="بستن" className="p-1.5 rounded-xl bg-white/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-white transition-all-smooth press-scale">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 pb-6 overflow-y-auto min-h-0">
          {visibleModules.map((item: ModuleIdentity) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => { h.select(); navigate(item.path); onClose() }}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all-smooth press-scale ${
                  active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <ModuleIconBadge color={item.color} size={38}>
                  <Icon size={34} />
                </ModuleIconBadge>
                <span className={`text-[11px] font-medium text-center leading-tight ${active ? 'font-bold' : ''}`}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Bottom Tab Bar ──────────────────────────────────────
function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [debtorCount, setDebtorCount] = useState(0)
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // Badge on the مالی (Billing) nav icon — how many patients currently
  // owe money, refreshed on every navigation so it stays live as
  // payments get recorded elsewhere in the app. Pure local Dexie reads,
  // so this is cheap even running on every route change.
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPayments(), fetchTreatments(), fetchImplantCases()]).then(([pays, trts, impl]) => {
      if (cancelled) return
      const { byPatient } = calcAllPatientBalances(pays, trts, impl)
      const count = Array.from(byPatient.values()).filter((f) => f.balance > 0).length
      setDebtorCount(count)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname])
  const visiblePrimary = primaryModules.filter((item: ModuleIdentity) => canAccess(profile?.role, item.path))
  const visibleSecondary = secondaryModules.filter((item: ModuleIdentity) => canAccess(profile?.role, item.path))
  const isMoreActive = visibleSecondary.some((n) => isActive(n.path))
  const currentMod = getModuleByPath(location.pathname)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 tab-bar pb-safe">
        <div className="flex items-stretch h-[4.5rem]">
          {visiblePrimary.map((item: ModuleIdentity) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => { h.select(); navigate(item.path) }}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all-smooth"
                // Every module keeps its own colour, not just the active
                // one. Grey icons made the bar read as one undifferentiated
                // strip; colour is how you find the module you want without
                // reading five labels at 10px.
                style={{ color: active ? item.color : `color-mix(in srgb, ${item.color} 62%, #94a3b8)` }}
              >
                <div className="relative p-1 transition-all-smooth">
                  {/* Bigger: 20px was below the size an icon can carry a
                      recognisable shape at, so the custom glyphs read as
                      smudges on a phone. */}
                  <Icon size={active ? 28 : 25} strokeWidth={active ? 2.4 : 1.9} />
                  {item.path === '/billing' && debtorCount > 0 && (
                    <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full bg-error-500 text-white text-[9px] font-bold flex items-center justify-center border border-white dark:border-slate-900">
                      {debtorCount > 99 ? '99+' : debtorCount}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: active ? item.color : `color-mix(in srgb, ${item.color} 55%, #94a3b8)` }}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
          <button
            onClick={() => { h.pop(); setMoreOpen(true) }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all-smooth ${
              isMoreActive ? '' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            style={{ color: isMoreActive && currentMod ? currentMod.color : 'var(--module-color, #64748b)' }}
          >
            <div className="p-1 transition-all-smooth">
              <MoreHorizontal size={isMoreActive ? 28 : 25} strokeWidth={isMoreActive ? 2.4 : 1.9} />
            </div>
            <span className={`text-[10px] font-medium leading-none ${isMoreActive ? '' : 'text-slate-400 dark:text-slate-500'}`}
              style={isMoreActive && currentMod ? { color: currentMod.color } : undefined}
            >
              بیشتر
            </span>
          </button>
        </div>
      </nav>
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}

// ── Main layout ──────────────────────────────────────────
// ── Logout button ───────────────────────────────────
function LogoutButton() {
  const { signOut, profile } = useAuth()
  return (
    <button
      onClick={() => { h.tap(); if (window.confirm('از حساب کاربری خارج شوید؟')) signOut() }}
      aria-label="خروج"
      title={profile?.full_name || 'خروج از حساب'}
      className="flex items-center justify-center w-9 h-9 rounded-xl glass border border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-300 transition-all-smooth active:scale-90"
    >
      <LogOut size={16} />
    </button>
  )
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentItem = getModuleByPath(location.pathname)

  useEffect(() => {
    setModuleTheme(currentItem)
  }, [location.pathname])

  useEffect(() => {
    const cleanup = initSyncEngine()
    return cleanup
  }, [])

  // Load DB-backed RBAC overrides once on mount so canAccess() (used just
  // below, and in the nav-item filtering above) reflects any admin edits
  // instead of only the hardcoded ROLE_ACCESS fallback. Safe even before
  // this resolves — canAccess() falls back to the hardcoded map until then.
  useEffect(() => {
    loadRolePermissionOverrides().catch(() => {})
  }, [])

  // Run the once-daily local backup snapshot. This function was fully
  // written (see autoBackup.ts) but never actually wired to anything —
  // meaning zero backups had ever been taken in production despite the
  // feature existing in the codebase. Runs on every app mount; the
  // function itself no-ops if today's snapshot was already taken.
  useEffect(() => {
    runAutoBackupIfNeeded().catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col" dir="rtl">
      <div className="module-page-bg" aria-hidden="true">
        <div className="module-page-blob module-page-blob-1" />
        <div className="module-page-blob module-page-blob-2" />
      </div>
      <header className="sticky top-0 z-40 glass dark:glass border-b border-white/60 dark:border-white/10">
        <div className="flex items-center justify-between px-4 h-[56px]">
          <button
            onClick={() => { h.tap(); navigate('/') }}
            className="flex items-center gap-2.5 active:opacity-80 transition-opacity press-scale"
          >
            <MinadentLogo size={42} className="shrink-0" />
            <div>
              <p className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 leading-none">مینادنت <span className="text-[9px] font-normal text-slate-300 dark:text-slate-600 align-middle">v{APP_VERSION}</span></p>
              {currentItem && (
                <p className="text-[10px] font-medium leading-none mt-0.5" style={{ color: currentItem.color }}>
                  {currentItem.label}
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <LogoutButton />
            <SyncIndicator />
          </div>
        </div>
      </header>

      <UpdateBanner />

      <main className="relative z-[1] flex-1 min-w-0 overflow-x-hidden px-3 pt-3 pb-48">
        <div key={location.pathname} className="slide-in-right">
          {children}
        </div>
      </main>

      <BottomTabBar />
      <AICommandBar />
      <ToastContainer />
      <DynamicIsland />
    </div>
  )
}

// ── Route prefetching ────────────────────────────────────
const routeImports: Record<string, () => Promise<unknown>> = {
  '/':               () => import('../pages/Dashboard'),
  '/appointments':   () => import('../pages/Appointments'),
  '/patients':       () => import('../pages/Patients'),
  '/patients/:id':   () => import('../pages/PatientDetail'),
  '/treatments':     () => import('../pages/Treatments'),
  '/billing':        () => import('../pages/Billing'),
  '/laboratory':     () => import('../pages/Laboratory'),
  '/implants':       () => import('../pages/Implants'),
  '/insurance':      () => import('../pages/Insurance'),
  '/inventory':      () => import('../pages/Inventory'),
  '/prescriptions':  () => import('../pages/Prescriptions'),
  '/radiology':      () => import('../pages/Radiology'),
  '/staff':          () => import('../pages/Staff'),
  '/reports':        () => import('../pages/Reports'),
  '/settings':       () => import('../pages/Settings'),
  '/waiting-list':   () => import('../pages/WaitingList'),
  '/archive':        () => import('../pages/Archive'),
  '/calendar':       () => import('../pages/Calendar'),
  '/personal-finance': () => import('../pages/PersonalFinance'),
  '/sms': () => import('../pages/SMS'),
  '/reminders': () => import('../pages/Reminders'),
}

const prefetched = new Set<string>()
export function prefetchRoute(path: string) {
  if (prefetched.has(path) || !routeImports[path]) return
  prefetched.add(path)
  routeImports[path]().catch(() => {})
}

const lazyPage = (key: string) => React.lazy(routeImports[key] as () => Promise<{ default: React.ComponentType }>)

const Dashboard    = lazyPage('/')
const Appointments = lazyPage('/appointments')
const Patients     = lazyPage('/patients')
const PatientDetail= lazyPage('/patients/:id')
const Treatments   = lazyPage('/treatments')
const Billing      = lazyPage('/billing')
const Laboratory   = lazyPage('/laboratory')
const Implants     = lazyPage('/implants')
const Insurance    = lazyPage('/insurance')
const Inventory    = lazyPage('/inventory')
const Prescriptions= lazyPage('/prescriptions')
const Radiology    = lazyPage('/radiology')
const Staff        = lazyPage('/staff')
const Reports      = lazyPage('/reports')
const Settings     = lazyPage('/settings')
const WaitingList  = lazyPage('/waiting-list')
const Archive      = lazyPage('/archive')
const CalendarPage = lazyPage('/calendar')
const PersonalFinance = lazyPage('/personal-finance')
const PublicBooking = React.lazy(() => import('../pages/PublicBooking'))
const SMS = lazyPage('/sms')
const Reminders = lazyPage('/reminders')

function LL({ children, path }: { children: React.ReactNode; path: string }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const allowed = canAccess(profile?.role, path)

  useEffect(() => {
    if (!allowed) navigate('/', { replace: true })
  }, [allowed])

  if (!allowed) return null

  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    }>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </React.Suspense>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <p className="text-6xl font-extrabold text-slate-300 dark:text-slate-700 mb-2">۴۰۴</p>
      <p className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">صفحه یافت نشد</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">آدرس مورد نظر در دسترس نیست</p>
      <Button variant="primary" onClick={() => navigate('/')}>بازگشت به داشبورد</Button>
    </div>
  )
}

// Login is built and ready, but temporarily disabled until Supabase Auth
// is configured (users table populated, etc). Flip REQUIRE_LOGIN in
// lib/permissions.ts to true once that's done — both the route gate below
// and the role-based nav filtering read from that same flag.

export function Layout() {
  const { session, loading } = useAuth()
  const [locked, setLocked] = useState(isAppLockEnabled())

  // Re-lock when returning to the app after being backgrounded — the
  // whole point of a biometric/PIN lock is that it re-engages after
  // the phone was put down, not just once at cold start.
  useEffect(() => {
    if (!isAppLockEnabled()) return
    const onVisible = () => { if (document.visibilityState === 'visible') setLocked(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Public online booking form (نوبت‌دهی آنلاین) — must bypass the auth
  // gate entirely below, since it's meant to be reachable by anyone
  // (patients on the clinic's own website), not just logged-in staff.
  // Checked via the raw hash since HashRouter's own route matching
  // only runs AFTER the auth gate further down, which would otherwise
  // always show the login screen first for an unauthenticated visitor.
  if (window.location.hash.startsWith('#/book')) {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size={32} /></div>}>
        <PublicBooking />
      </React.Suspense>
    )
  }

  if (REQUIRE_LOGIN && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Spinner size={32} />
      </div>
    )
  }

  if (REQUIRE_LOGIN && !session) {
    // Without an anon key there is no way to reach the auth server, so
    // the login form would silently fail on every attempt with no
    // explanation. Say so plainly instead of letting someone retype
    // their password over and over against a server we can't call.
    if (!hasSupabaseCredentials) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-sm text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-warning-100 flex items-center justify-center">
              <CloudOff size={26} className="text-warning-600" />
            </div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              پیکربندی سرور ناقص است
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              کلید اتصال به سرور (<span dir="ltr">VITE_SUPABASE_ANON_KEY</span>) در
              محیط استقرار تنظیم نشده، بنابراین ورود به حساب ممکن نیست.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              این مقدار را در تنظیمات پروژه‌ی Vercel، بخش Environment
              Variables اضافه کنید و دوباره منتشر کنید.
            </p>
          </div>
        </div>
      )
    }
    return <Login />
  }

  if (locked) {
    return <AppLockScreen onUnlock={() => setLocked(false)} />
  }

  return (
    <HashRouter>
      <LayoutInner>
        <Routes>
          <Route path="/"                element={<LL path="/"><Dashboard /></LL>} />
          <Route path="/appointments"    element={<LL path="/appointments"><Appointments /></LL>} />
          <Route path="/patients"        element={<LL path="/patients"><Patients /></LL>} />
          <Route path="/patients/:id"    element={<LL path="/patients/:id"><PatientDetail /></LL>} />
          <Route path="/treatments"      element={<LL path="/treatments"><Treatments /></LL>} />
          <Route path="/billing"         element={<LL path="/billing"><Billing /></LL>} />
          <Route path="/laboratory"      element={<LL path="/laboratory"><Laboratory /></LL>} />
          <Route path="/implants"        element={<LL path="/implants"><Implants /></LL>} />
          <Route path="/insurance"       element={<LL path="/insurance"><Insurance /></LL>} />
          <Route path="/inventory"       element={<LL path="/inventory"><Inventory /></LL>} />
          <Route path="/prescriptions"   element={<LL path="/prescriptions"><Prescriptions /></LL>} />
          <Route path="/radiology"       element={<LL path="/radiology"><Radiology /></LL>} />
          <Route path="/staff"           element={<LL path="/staff"><Staff /></LL>} />
          <Route path="/reports"         element={<LL path="/reports"><Reports /></LL>} />
          <Route path="/settings"        element={<LL path="/settings"><Settings /></LL>} />
          <Route path="/waiting-list"    element={<LL path="/waiting-list"><WaitingList /></LL>} />
          <Route path="/archive"         element={<LL path="/archive"><Archive /></LL>} />
          <Route path="/calendar"        element={<LL path="/calendar"><CalendarPage /></LL>} />
          <Route path="/personal-finance" element={<LL path="/personal-finance"><PersonalFinance /></LL>} />
          <Route path="/sms" element={<LL path="/sms"><SMS /></LL>} />
          <Route path="/reminders" element={<LL path="/reminders"><Reminders /></LL>} />
          <Route path="*"                element={<NotFound />} />
        </Routes>
      </LayoutInner>
    </HashRouter>
  )
}
