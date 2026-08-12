import React, { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  MoreHorizontal, X, Wifi, WifiOff, RefreshCw, Cloud, Moon, Sun,
} from 'lucide-react'
import { Spinner, ToastContainer, Button } from './ui'
import AICommandBar from './AICommandBar'
import { DynamicIsland, pushIslandNotification } from './DynamicIsland'
import { ErrorBoundary } from './ErrorBoundary'
import { MinadentLogo } from './MinadentLogo'
import {
  primaryModules, secondaryModules, allModules,
  getModuleByPath, setModuleTheme, type ModuleIdentity,
} from '../theme/modules'
import { subscribeSync, initSyncEngine, syncNow, SyncStatus } from '../lib/sync'
import { h } from '../lib/haptics'
import { CheckCircle2, CloudOff } from 'lucide-react'

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
function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [pending, setPending] = useState(0)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    const unsub = subscribeSync((s, p) => {
      setStatus(s); setPending(p); setSpinning(s === 'syncing')
      if (s === 'online' && p === 0) {
        pushIslandNotification({ id: 'sync-done', title: 'همگام‌سازی کامل', message: 'داده‌ها به‌روزرسانی شد', icon: <CheckCircle2 size={16} />, color: '#0d9488', duration: 3000 })
      } else if (s === 'offline' || s === 'error') {
        pushIslandNotification({ id: 'sync-off', title: 'حالت آفلاین', message: 'تغییرات بعداً همگام می‌شوند', icon: <CloudOff size={16} />, color: '#f59e0b', duration: 3000 })
      }
    })
    return unsub
  }, [])

  const isOnline = status === 'online' || status === 'syncing' || status === 'idle'

  return (
    <button
      onClick={() => { if (isOnline) { h.tap(); syncNow() } }}
      aria-label="وضعیت همگام‌سازی"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass border border-white/60 dark:border-white/10 transition-all-smooth active:scale-95"
    >
      {spinning
        ? <RefreshCw size={13} className="animate-spin text-primary-600" />
        : isOnline
          ? <Wifi size={13} className="text-primary-600" />
          : <WifiOff size={13} className="text-warning-600" />
      }
      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-primary-500' : 'bg-warning-500'} ${isOnline && !spinning ? 'animate-pulse' : ''}`} />
      {pending > 0 && <span className="text-[10px] text-slate-500 font-medium">{pending}</span>}
    </button>
  )
}

// ── Offline banner ──────────────────────────────────────
function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  useEffect(() => { const u = subscribeSync((s) => setOffline(s === 'offline' || s === 'error')); return u }, [])
  if (!offline) return null
  return (
    <div className="bg-warning-50 dark:bg-warning-900/30 border-b border-warning-200 dark:border-warning-700 px-4 py-2">
      <p className="text-xs text-warning-700 dark:text-warning-300 flex items-center justify-center gap-2">
        <Cloud size={13} />
        حالت آفلاین — تغییرات ذخیره شده و با اتصال اینترنت سینک می‌شود
      </p>
    </div>
  )
}

// ── More drawer ─────────────────────────────────────────
function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" onClick={() => { h.cancel(); onClose() }}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl shadow-ios-xl pb-safe drawer-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">همه ماژول‌ها</h3>
          <button onClick={() => { h.cancel(); onClose() }} aria-label="بستن" className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all-smooth press-scale">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 pb-6">
          {secondaryModules.map((item: ModuleIdentity) => {
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
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`
                      : `${item.colorLight}`,
                    color: active ? '#fff' : item.color,
                    boxShadow: active ? `0 4px 14px ${item.color}40` : 'none',
                  }}
                >
                  <Icon size={22} />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
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
  const [moreOpen, setMoreOpen] = useState(false)
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const isMoreActive = secondaryModules.some((n) => isActive(n.path))
  const currentMod = getModuleByPath(location.pathname)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 tab-bar pb-safe">
        <div className="flex items-stretch h-16">
          {primaryModules.map((item: ModuleIdentity) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => { h.select(); navigate(item.path) }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all-smooth ${
                  active ? '' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                style={active ? { color: item.color } : undefined}
              >
                <div
                  className="p-1.5 rounded-xl transition-all-smooth"
                  style={active ? { background: item.colorLight } : undefined}
                >
                  <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] font-medium leading-none ${active ? '' : 'text-slate-400 dark:text-slate-500'}`}
                  style={active ? { color: item.color } : undefined}
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
            style={isMoreActive && currentMod ? { color: currentMod.color } : undefined}
          >
            <div className="p-1.5 rounded-xl transition-all-smooth"
              style={isMoreActive && currentMod ? { background: currentMod.colorLight } : undefined}
            >
              <MoreHorizontal size={isMoreActive ? 22 : 20} strokeWidth={isMoreActive ? 2.5 : 1.8} />
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col" dir="rtl">
      <header className="sticky top-0 z-40 glass dark:glass border-b border-white/60 dark:border-white/10">
        <div className="flex items-center justify-between px-4 h-[56px]">
          <button
            onClick={() => { h.tap(); navigate('/') }}
            className="flex items-center gap-2.5 active:opacity-80 transition-opacity press-scale"
          >
            <MinadentLogo size={36} className="shrink-0" />
            <div>
              <p className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 leading-none">مینادنت</p>
              {currentItem && (
                <p className="text-[10px] font-medium leading-none mt-0.5" style={{ color: currentItem.color }}>
                  {currentItem.label}
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <SyncIndicator />
          </div>
        </div>
        <OfflineBanner />
      </header>

      <main className="flex-1 min-w-0 overflow-x-hidden px-3 pt-3 pb-24">
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

function LL({ children }: { children: React.ReactNode }) {
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

export function Layout() {
  return (
    <HashRouter>
      <LayoutInner>
        <Routes>
          <Route path="/"                element={<LL><Dashboard /></LL>} />
          <Route path="/appointments"    element={<LL><Appointments /></LL>} />
          <Route path="/patients"        element={<LL><Patients /></LL>} />
          <Route path="/patients/:id"    element={<LL><PatientDetail /></LL>} />
          <Route path="/treatments"      element={<LL><Treatments /></LL>} />
          <Route path="/billing"         element={<LL><Billing /></LL>} />
          <Route path="/laboratory"      element={<LL><Laboratory /></LL>} />
          <Route path="/implants"        element={<LL><Implants /></LL>} />
          <Route path="/insurance"       element={<LL><Insurance /></LL>} />
          <Route path="/inventory"       element={<LL><Inventory /></LL>} />
          <Route path="/prescriptions"   element={<LL><Prescriptions /></LL>} />
          <Route path="/radiology"       element={<LL><Radiology /></LL>} />
          <Route path="/staff"           element={<LL><Staff /></LL>} />
          <Route path="/reports"         element={<LL><Reports /></LL>} />
          <Route path="/settings"        element={<LL><Settings /></LL>} />
          <Route path="/waiting-list"    element={<LL><WaitingList /></LL>} />
          <Route path="*"                element={<NotFound />} />
        </Routes>
      </LayoutInner>
    </HashRouter>
  )
}
