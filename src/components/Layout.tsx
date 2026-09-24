import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  MoreHorizontal, X, Wifi, WifiOff, RefreshCw, Moon, Sun, LogOut, AlertTriangle, Sparkles, Bell, Compass, Eye, EyeOff,
  Search, ChevronLeft,
} from 'lucide-react'
import { Spinner, ToastContainer, Button, Modal, showToast } from './ui'
import { usePrivacyMode } from '../lib/privacyMask'
import AICommandBar from './AICommandBar'
import { DynamicIsland, pushIslandNotification } from './DynamicIsland'
import { ErrorBoundary } from './ErrorBoundary'
import { MinadentLogo } from './MinadentLogo'
import { ClinicalAlarmCenter, useClinicAlarmSummary } from './ClinicalAlarmCenter'
import { PersianClinicAiAssistant } from './PersianClinicAiAssistant'
import Login from '../pages/Login'
import { useAuth } from '../lib/auth'
import { canAccess, REQUIRE_LOGIN, roleLabel } from '../lib/permissions'
import { isAppLockEnabled } from '../lib/appLock'
import { AppLockScreen } from './AppLockScreen'
import { ModuleIconBadge } from './ModuleIconBadge'
import { labOpenWork, appointmentsOpenWork, billingOpenWork, LEVEL_COLORS, type OpenWork } from '../lib/openWork'
import { APP_VERSION } from '../lib/appVersion'
import { toPersianDigits } from '../lib/persianDate'
import { checkForUpdate, applyUpdate, isAutoCheckEnabled, isAutoApplyEnabled } from '../lib/updateCheck'
import {
  primaryModules, secondaryModules, allModules,
  getModuleByPath, setModuleTheme, type ModuleIdentity,
} from '../theme/modules'
import { subscribeSync, initSyncEngine, syncNow, SyncStatus } from '../lib/sync'
import { initRealtimeSync } from '../lib/realtimeSync'
import { fetchPayments, fetchTreatments, fetchImplantCases, loadRolePermissionOverrides, fetchLabOrders, fetchAppointments } from '../lib/api'
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
      title={dark ? 'تغییر به حالت روشن' : 'تغییر به حالت شب / تاریک'}
      className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl glass border-t border-t-white/90 dark:border-t-white/20 border border-slate-200/60 dark:border-slate-700/60 shadow-md shadow-slate-900/10 text-slate-700 dark:text-amber-400 hover:-translate-y-0.5 active:translate-y-0.5 transition-all press-scale touch-manipulation"
    >
      {dark ? <Sun size={18} className="drop-shadow-xs" /> : <Moon size={18} className="drop-shadow-xs" />}
    </button>
  )
}

// ── Reception Privacy Mode toggle (ISO-27001 / HIPAA Counter Protection) ──
function PrivacyModeToggle() {
  const { privacyMode, togglePrivacyMode } = usePrivacyMode()

  return (
    <button
      onClick={() => {
        h.tap()
        const next = togglePrivacyMode()
        showToast(
          'info',
          next
            ? 'حالت محرمانگی پیشخوان فعال شد — کد ملی و شماره تلفن‌ها در برابر مراجعین ماسک شدند'
            : 'حالت محرمانگی پیشخوان غیرفعال شد'
        )
      }}
      aria-label={privacyMode ? 'غیرفعال‌سازی حالت محرمانگی پیشخوان' : 'فعال‌سازی حالت محرمانگی پیشخوان'}
      title={
        privacyMode
          ? 'حالت محرمانگی پیشخوان فعال است (کد ملی و تلفن ماسک شده) — جهت نمایش کامل کلیک کنید'
          : 'حالت محرمانگی پیشخوان (مخفی‌سازی کد ملی و تلفن در برابر مراجعین)'
      }
      className={`flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl glass border-t border-t-white/90 dark:border-t-white/20 border transition-all press-scale relative shadow-md shadow-slate-900/10 hover:-translate-y-0.5 active:translate-y-0.5 touch-manipulation overflow-visible ${
        privacyMode
          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
          : 'border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {privacyMode ? <EyeOff size={18} className="drop-shadow-xs" /> : <Eye size={18} className="drop-shadow-xs" />}
      {privacyMode && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
      )}
    </button>
  )
}


// ── Sync indicator ──────────────────────────────────────
// ── Update banner (manual + automatic) ──────────────────────────
const AUTO_CHECK_INTERVAL = 3 * 60 * 1000 // 3 minutes

function UpdateBanner() {
  const [available, setAvailable] = useState(false)
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const location = useLocation()

  const runCheck = useCallback(async () => {
    if (!isAutoCheckEnabled()) return
    const result = await checkForUpdate()
    if (result.updateAvailable) {
      setAvailable(true)
      setRemoteVersion(result.remoteVersion)
      if (isAutoApplyEnabled() && countdown === null && !paused) {
        setCountdown(6)
      }
    }
  }, [countdown, paused])

  useEffect(() => {
    runCheck()
    const interval = setInterval(runCheck, AUTO_CHECK_INTERVAL)
    const onVisible = () => { if (document.visibilityState === 'visible') runCheck() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [runCheck])

  useEffect(() => {
    runCheck()
  }, [location.pathname, runCheck])

  useEffect(() => {
    if (countdown === null || paused || dismissed || updating) return
    if (countdown <= 0) {
      setUpdating(true)
      applyUpdate()
      return
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown, paused, dismissed, updating])

  if (!available || dismissed) return null

  const autoApply = isAutoApplyEnabled()

  return (
    <div
      className="px-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="به‌روزرسانی جدید موجود است"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-l from-violet-600 via-indigo-600 to-sky-500 text-white shadow-lg border border-white/10">
        <Sparkles size={16} className="shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-tight">
            نسخه‌ی جدیدی موجود است{remoteVersion ? ` (${toPersianDigits(remoteVersion)})` : ''}
          </p>
          <p className="text-[10px] text-white/80 truncate">
            {autoApply && countdown !== null && !paused
              ? `به‌روزرسانی خودکار تا ${toPersianDigits(countdown)} ثانیه دیگر...`
              : 'شامل آخرین قابلیت‌ها و استانداردهای جهانی دندانپزشکی'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={async () => { h.confirm(); setUpdating(true); await applyUpdate() }}
            disabled={updating}
            aria-label="به‌روزرسانی فوری نرم‌افزار"
            className="px-3 py-2 min-h-[40px] rounded-xl bg-white/25 hover:bg-white/35 active:bg-white/40 text-xs font-bold transition-all-smooth press-scale disabled:opacity-60 shadow-sm touch-manipulation"
          >
            {updating ? 'در حال دریافت...' : 'به‌روزرسانی فوری'}
          </button>
          {autoApply && countdown !== null && !paused ? (
            <button
              onClick={() => { h.tap(); setPaused(true); setCountdown(null) }}
              title="مکث به‌روزرسانی خودکار جهت اتمام کار جاری"
              aria-label="مکث به‌روزرسانی خودکار"
              className="px-2 py-2 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-medium touch-manipulation"
            >
              مکث
            </button>
          ) : null}
          <button
            onClick={() => { h.cancel(); setDismissed(true) }}
            aria-label="بعداً یادآوری کن"
            className="p-2 min-h-[40px] min-w-[40px] rounded-lg hover:bg-white/20 flex items-center justify-center touch-manipulation"
          >
            <X size={15} />
          </button>
        </div>
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
      if (f > prevFailed.current) {
        pushIslandNotification({ id: 'sync-failed', title: 'نیاز به بررسی همگام‌سازی', message: `${f} مورد همگام‌سازی نشد — تنظیمات را ببینید`, icon: <AlertTriangle size={16} />, color: '#dc2626', duration: 6000 })
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
    : spinning ? 'در حال همگام‌سازی' : isOnline ? 'آنلاین (متصل)' : 'حالت آفلاین (قطع اتصال)'

  const countBadge = hasFailed ? failed : pending

  return (
    <button
      onClick={() => { h.tap(); if (hasFailed) navigate('/settings'); else if (isOnline) syncNow() }}
      aria-label={label}
      title={label}
      className={`relative flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl glass border-t border-t-white/90 dark:border-t-white/20 border transition-all press-scale hover:-translate-y-0.5 active:translate-y-0.5 shadow-md shadow-slate-900/10 touch-manipulation overflow-visible ${
        hasFailed
          ? 'border-rose-400/60 bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
          : isOnline
          ? 'border-emerald-400/50 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-400/60 bg-amber-50/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
      }`}
    >
      {hasFailed ? (
        <AlertTriangle size={18} className="drop-shadow-xs animate-pulse" />
      ) : spinning ? (
        <RefreshCw size={18} className="animate-spin text-emerald-500 drop-shadow-xs" />
      ) : isOnline ? (
        <Wifi size={18} className="drop-shadow-xs" />
      ) : (
        <WifiOff size={18} className="drop-shadow-xs" />
      )}

      {countBadge > 0 && (
        <span
          className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-black flex items-center justify-center border border-white dark:border-slate-900 shadow-xs ${
            hasFailed ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-white'
          }`}
        >
          {toPersianDigits(countBadge > 99 ? '+۹۹' : countBadge)}
        </span>
      )}
    </button>
  )
}

// ── Offline banner ──────────────────────────────────────
function LogoutConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}) {
  const { profile } = useAuth()
  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="خروج از حساب کاربری" size="sm">
      <div className="text-center py-2 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-error-50 dark:bg-error-900/30 text-error-600 dark:text-error-400 flex items-center justify-center">
          <LogOut size={26} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
            آیا می‌خواهید از حساب کاربری خارج شوید؟
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {profile?.full_name ? (
              <>
                کاربر جاری: <span className="font-semibold text-slate-700 dark:text-slate-200">{profile.full_name}</span>
                {profile.role ? ` (${roleLabel(profile.role)})` : ''}
              </>
            ) : (
              'برای ورود مجدد باید نام کاربری و رمز عبور خود را وارد کنید.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="danger"
            className="flex-1 min-h-[44px]"
            disabled={loading}
            onClick={() => {
              h.confirm()
              onConfirm()
            }}
          >
            {loading ? <Spinner size={16} /> : 'خروج از حساب'}
          </Button>
          <Button
            variant="secondary"
            className="flex-1 min-h-[44px]"
            disabled={loading}
            onClick={() => {
              h.cancel()
              onClose()
            }}
          >
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Metadata & Categorization for Clinic Services Hub ──────────────────
const MODULE_METADATA: Record<string, { category: 'clinical' | 'operations' | 'intelligence'; description: string }> = {
  '/implants': { category: 'clinical', description: 'شناسنامه قطعات ITI و ۴ فاز جراحی' },
  '/radiology': { category: 'clinical', description: 'نمایشگر و آرشیو گرافی‌های OPG و PA' },
  '/prescriptions': { category: 'clinical', description: 'ثبت نسخه الکترونیک و دارونامه کلینیک' },
  '/waiting-list': { category: 'clinical', description: 'مدیریت صف و سالن انتظار بیماران' },
  '/archive': { category: 'clinical', description: 'بایگانی دیجیتال اسناد و مدارک راکد' },

  '/insurance': { category: 'operations', description: 'محاسبه تعرفه بیمه پایه و تکمیلی' },
  '/inventory': { category: 'operations', description: 'کنترل موجودی و کسر خودکار متریال' },
  '/staff': { category: 'operations', description: 'کادر درمان، دستیاران و سطح دسترسی' },
  '/calendar': { category: 'operations', description: 'تقویم جامع کلینیک، شیفت‌ها و رویدادها' },
  '/sms': { category: 'operations', description: 'سامانه پیامک هوشمند، تبریک و پیگیری' },
  '/reminders': { category: 'operations', description: 'یادآوری خودکار مراقبت پس از درمان' },

  '/roadmap': { category: 'intelligence', description: 'هاب هوشمندی و نقشه راه بالینی' },
  '/personal-finance': { category: 'intelligence', description: 'کارانه، تسویه و سهم درمان پزشک' },
  '/reports': { category: 'intelligence', description: 'گزارش‌های آماری، مالی و KPI مطب' },
  '/settings': { category: 'intelligence', description: 'پیکربندی کلینیک، پشتیبان‌گیری و امنیت' },
}

// ── More drawer (Enterprise Services Hub) ─────────────────────────────
function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, session, signOut } = useAuth()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'clinical' | 'operations' | 'intelligence'>('all')

  const effectiveRole = profile?.role || (session ? 'owner' : undefined)
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const visibleModules = secondaryModules.filter((item: ModuleIdentity) => canAccess(effectiveRole, item.path))

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return visibleModules.filter((item) => {
      const meta = MODULE_METADATA[item.path]
      if (activeCategory !== 'all' && meta?.category !== activeCategory) {
        return false
      }
      if (!q) return true
      const matchLabel = item.label.toLowerCase().includes(q)
      const matchDesc = meta?.description.toLowerCase().includes(q)
      return matchLabel || matchDesc
    })
  }, [visibleModules, activeCategory, searchQuery])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      onClose()
    } finally {
      setLoggingOut(false)
      setLogoutConfirmOpen(false)
    }
  }

  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={() => { h.cancel(); onClose() }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300" />
        <div
          className="absolute bottom-0 left-0 right-0 max-w-2xl mx-auto rounded-t-[32px] shadow-2xl pb-safe drawer-in flex flex-col overflow-hidden border-t border-white/80 dark:border-slate-700/80"
          style={{
            maxHeight: '88dvh',
            background: 'linear-gradient(165deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dark:bg-slate-900/98 absolute inset-0 -z-10 dark:block hidden" />
          
          {/* Grab Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>

          {/* Header & Close */}
          <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                مرکز خدمات و ماژول‌های کلینیک
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                  {toPersianDigits(filteredModules.length)} ماژول
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                دسترسی سریع و استاندارد به تمام بخش‌های بالینی، مدیریتی و هوشمندی مطب
              </p>
            </div>
            <button
              onClick={() => { h.cancel(); onClose() }}
              aria-label="بستن پنجره خدمات"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all press-scale touch-manipulation"
            >
              <X size={18} />
            </button>
          </div>

          {/* Real-time Search Box */}
          <div className="px-5 mb-2.5 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی سریع در خدمات، انبار، بیمه، رادیولوژی، گزارش‌ها..."
                className="w-full h-11 pr-10 pl-9 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
              <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Categorized Filter Chips */}
          <div className="flex items-center gap-1.5 px-5 pb-3 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'همه بخش‌ها' },
              { id: 'clinical', label: '🩺 بالینی و درمان' },
              { id: 'operations', label: '🏢 مدیریت مطب' },
              { id: 'intelligence', label: '📊 هوشمندی و مالی' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => { h.tap(); setActiveCategory(cat.id as any) }}
                className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all shrink-0 press-scale touch-manipulation flex items-center ${
                  activeCategory === cat.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Modules Grid — always 2-col on mobile to halve scroll length */}
          <div className="grid grid-cols-2 gap-2 px-5 pb-4 overflow-y-auto min-h-0 flex-1">
            {filteredModules.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Search size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">خدمتی مطابق جستجوی شما یافت نشد</p>
                <p className="text-xs text-slate-400 mt-1">عنوان دیگری را جستجو کنید یا فیلتر دسته‌بندی را تغییر دهید.</p>
              </div>
            ) : (
              filteredModules.map((item: ModuleIdentity) => {
                const Icon = item.icon
                const active = isActive(item.path)
                const meta = MODULE_METADATA[item.path]
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      h.select()
                      navigate(item.path)
                      onClose()
                    }}
                    className={`card-tactile-3d min-h-[64px] p-3 rounded-2xl border transition-all press-scale text-right flex items-center justify-between gap-2 group touch-manipulation ${
                      active
                        ? 'bg-white dark:bg-slate-800 border-primary-500/60 ring-2 ring-primary-500/20 shadow-md'
                        : 'bg-white/80 dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ModuleIconBadge color={item.color} size={42}>
                        <Icon size={38} />
                      </ModuleIconBadge>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                          {item.label}
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {meta?.description || 'امکانات و ابزارهای ماژول'}
                        </p>
                      </div>
                    </div>
                    <div className="text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors shrink-0">
                      <ChevronLeft size={16} />
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Profile and Logout Footer */}
          <div className="mt-auto px-5 py-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {profile?.full_name ? profile.full_name.charAt(0) : 'م'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                  {profile?.full_name || 'کاربر سیستم مینادنت'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {roleLabel(effectiveRole)} · <span className="font-mono">v{APP_VERSION}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => { h.tap(); setLogoutConfirmOpen(true) }}
              className="btn-tactile-3d flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-all press-scale touch-manipulation"
            >
              <LogOut size={13} />
              <span>خروج از حساب</span>
            </button>
          </div>
        </div>
      </div>
      <LogoutConfirmModal
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        loading={loggingOut}
      />
    </>
  )
}

// ── Bottom Tab Bar ──────────────────────────────────────
function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, session } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [openWork, setOpenWork] = useState<Record<string, OpenWork>>({})
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const effectiveRole = profile?.role || (session ? 'owner' : undefined)

  useEffect(() => {
    let cancelled = false
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([fetchPayments(), fetchTreatments(), fetchImplantCases(), fetchLabOrders(), fetchAppointments()])
      .then(([pays, trts, impl, labs, appts]) => {
        if (cancelled) return
        const { byPatient } = calcAllPatientBalances(pays, trts, impl)
        const debtors = Array.from(byPatient.values()).filter((f) => f.balance > 0).length
        setOpenWork({
          '/billing': billingOpenWork(debtors),
          '/laboratory': labOpenWork(labs as never, today),
          '/appointments': appointmentsOpenWork(appts as never, today),
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname])
  const visiblePrimary = primaryModules.filter((item: ModuleIdentity) => canAccess(effectiveRole, item.path))
  const visibleSecondary = secondaryModules.filter((item: ModuleIdentity) => canAccess(effectiveRole, item.path))
  const isMoreActive = visibleSecondary.some((n) => isActive(n.path))
  const currentMod = getModuleByPath(location.pathname)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 tab-bar pb-safe sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[94%] sm:max-w-2xl sm:rounded-3xl sm:pb-0 transition-all duration-300" role="navigation" aria-label="ناوبری اصلی">
        <div className="flex items-stretch h-[4.75rem] max-w-2xl mx-auto px-1 sm:px-2">
          {visiblePrimary.map((item: ModuleIdentity) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => { h.select(); navigate(item.path) }}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all-smooth press-scale group min-h-[48px] touch-manipulation"
                style={{ color: item.color }}
              >
                <div
                  className={`relative transition-all duration-300 flex flex-col items-center justify-center ${
                    active
                      ? 'p-1.5 px-3 rounded-2xl scale-105'
                      : 'p-1 px-2 rounded-xl hover:scale-105'
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: `color-mix(in srgb, ${item.color} 18%, white)`,
                          border: `1.5px solid color-mix(in srgb, ${item.color} 45%, transparent)`,
                          boxShadow: `0 4px 16px color-mix(in srgb, ${item.color} 35%, transparent), 0 1px 3px rgba(0,0,0,0.06)`,
                        }
                      : {
                          backgroundColor: `color-mix(in srgb, ${item.color} 6%, transparent)`,
                        }
                  }
                >
                  <Icon size={active ? 26 : 23} strokeWidth={active ? 2.5 : 2} />
                  {(() => {
                    const w = openWork[item.path]
                    if (!w || w.count === 0) return null
                    return (
                      <span
                        className="absolute -top-1 -left-1 min-w-[17px] h-[17px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center border border-white dark:border-slate-900 shadow-sm animate-pulse"
                        style={{ backgroundColor: LEVEL_COLORS[w.level] }}
                        aria-label={`${w.count} کار باز`}
                      >
                        {w.count > 99 ? '+۹۹' : toPersianDigits(w.count)}
                      </span>
                    )
                  })()}
                </div>
                <span
                  className={`tab-bar-label text-[11px] leading-tight tracking-tight transition-all ${
                    active ? 'font-black scale-105' : 'font-bold opacity-85 group-hover:opacity-100'
                  }`}
                  style={{ color: item.color }}
                  aria-hidden="true"
                >
                  {item.label}
                </span>
              </button>
            )
          })}
          {(() => {
            const moreColor = '#c026d3' // Distinct Vivid Fuchsia (no two modules share this color)
            return (
              <button
                onClick={() => { h.pop(); setMoreOpen(true) }}
                aria-label="بخش‌های بیشتر"
                aria-expanded={moreOpen}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all-smooth press-scale group min-h-[48px] touch-manipulation"
                style={{ color: isMoreActive && currentMod ? currentMod.color : moreColor }}
              >
                <div
                  className={`transition-all duration-300 flex flex-col items-center justify-center ${
                    isMoreActive
                      ? 'p-1.5 px-3 rounded-2xl scale-105'
                      : 'p-1 px-2 rounded-xl hover:scale-105'
                  }`}
                  style={
                    isMoreActive
                      ? {
                          backgroundColor: `color-mix(in srgb, ${currentMod?.color || moreColor} 18%, white)`,
                          border: `1.5px solid color-mix(in srgb, ${currentMod?.color || moreColor} 45%, transparent)`,
                          boxShadow: `0 4px 16px color-mix(in srgb, ${currentMod?.color || moreColor} 35%, transparent)`,
                        }
                      : {
                          backgroundColor: `color-mix(in srgb, ${moreColor} 6%, transparent)`,
                        }
                  }
                >
                  <MoreHorizontal size={isMoreActive ? 26 : 23} strokeWidth={isMoreActive ? 2.5 : 2} style={{ color: isMoreActive && currentMod ? currentMod.color : moreColor }} />
                </div>
                <span
                  className={`tab-bar-label text-[11px] leading-tight tracking-tight transition-all ${
                    isMoreActive ? 'font-black scale-105' : 'font-bold opacity-85 group-hover:opacity-100'
                  }`}
                  style={{ color: isMoreActive && currentMod ? currentMod.color : moreColor }}
                  aria-hidden="true"
                >
                  بیشتر
                </span>
              </button>
            )
          })()}
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
    } finally {
      setLoggingOut(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { h.tap(); setConfirmOpen(true) }}
        aria-label="خروج از حساب کاربری"
        title={profile?.full_name ? `خروج (${profile.full_name})` : 'خروج از حساب'}
        className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl glass border-t border-t-white/90 dark:border-t-white/20 border border-slate-200/60 dark:border-slate-700/60 shadow-md shadow-slate-900/10 text-slate-700 dark:text-slate-300 hover:-translate-y-0.5 active:translate-y-0.5 transition-all press-scale touch-manipulation"
      >
        <LogOut size={18} className="drop-shadow-xs" />
      </button>
      <LogoutConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleLogout}
        loading={loggingOut}
      />
    </>
  )
}

function HeaderAlarmButton({ onClick }: { onClick: () => void }) {
  const { bundle } = useClinicAlarmSummary()
  const hasUrgent = bundle.total > 0

  return (
    <button
      onClick={() => {
        h.pop()
        onClick()
      }}
      aria-label={hasUrgent ? `مرکز آلارم — ${toPersianDigits(bundle.total)} هشدار فعال` : 'مرکز آلارم و هشدارهای بالینی'}
      title={hasUrgent ? `${toPersianDigits(bundle.total)} هشدار فعال بالینی و مالی` : 'مرکز آلارم و هشدارها'}
      className="relative flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl glass border-t border-t-white/90 dark:border-t-white/20 border border-slate-200/60 dark:border-slate-700/60 shadow-md shadow-slate-900/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:-translate-y-0.5 active:translate-y-0.5 transition-all press-scale touch-manipulation overflow-visible"
    >
      <Bell size={18} className={`drop-shadow-xs ${hasUrgent ? 'text-amber-500 animate-pulse' : ''}`} />
      {hasUrgent && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm"
          aria-hidden="true"
        >
          {bundle.total > 99 ? '+۹۹' : toPersianDigits(bundle.total)}
        </span>
      )}
    </button>
  )
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentItem = getModuleByPath(location.pathname)
  const [alarmCenterOpen, setAlarmCenterOpen] = useState(false)

  useEffect(() => {
    setModuleTheme(currentItem)
  }, [location.pathname])

  useEffect(() => {
    const cleanupPolling = initSyncEngine()
    const cleanupRealtime = initRealtimeSync()
    return () => {
      cleanupPolling()
      cleanupRealtime()
    }
  }, [])

  // Immediate cloud pull on app foreground / screen unlock.
  // This is the MOST IMPORTANT sync trigger for mobile:
  // WebSocket may still be reconnecting when the user returns,
  // but an HTTP pull from Supabase works immediately regardless.
  // Result: staff unlock their phone and see the latest appointments
  // from the laptop within 1-2 seconds, not after 15s polling.
  useEffect(() => {
    const onReturn = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        typeof navigator !== 'undefined' &&
        navigator.onLine
      ) {
        syncNow().catch(() => {})
      }
    }
    const onFocus = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncNow().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onFocus)
    }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col w-full max-w-full overflow-x-clip" dir="rtl">
      <div className="module-page-bg" aria-hidden="true">
        <div className="module-page-blob module-page-blob-1" />
        <div className="module-page-blob module-page-blob-2" />
        <div className="module-page-blob module-page-blob-3" />
        <div className="module-page-blob module-page-blob-4" />
      </div>
      <header className="sticky top-0 z-40 glass dark:glass border-b border-white/60 dark:border-white/10 pt-safe transition-all-smooth" role="banner">
        <div className="flex items-center justify-between px-3.5 h-[60px] sm:h-[64px] max-w-7xl mx-auto w-full">
          <button
            onClick={() => { h.tap(); navigate('/') }}
            className="flex items-center gap-2 active:opacity-80 transition-opacity press-scale shrink-0"
          >
            <MinadentLogo size={38} className="shrink-0" />
            <div className="text-right">
              <p className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                مینادنتال
              </p>
              {currentItem && (
                <p className="text-[10px] font-semibold leading-none mt-1" style={{ color: currentItem.color }}>
                  {currentItem.label}
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs shrink-0">
            {/* AI Assistant Button — Apple Intelligence Sparkle Trigger */}
            <button
              onClick={() => {
                h.pop()
                window.dispatchEvent(new CustomEvent('minadent-open-clinic-ai'))
              }}
              aria-label="دستیار هوشمند بالینی مینادنت"
              title="دستیار هوشمند صوتی و متنی مینادنت"
              className="relative flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl glass border-t border-t-white/90 dark:border-t-white/20 border border-sky-400/50 dark:border-sky-500/40 bg-sky-50/70 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shadow-md shadow-sky-500/15 hover:-translate-y-0.5 active:translate-y-0.5 transition-all press-scale touch-manipulation"
            >
              <Sparkles size={18} className="animate-pulse text-sky-500 drop-shadow-xs" />
            </button>

            <HeaderAlarmButton onClick={() => setAlarmCenterOpen(true)} />
            {/* SyncIndicator & DarkModeToggle: hidden on mobile to reduce header clutter
                (5 buttons in ~200px was too cramped for gloved-finger operation) */}
            <span className="hidden sm:contents">
              <SyncIndicator />
              <DarkModeToggle />
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <UpdateBanner />

      <main id="main-content" className="relative z-[1] flex-1 min-w-0 max-w-full px-3 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]" role="main">
        <div key={location.pathname} className="slide-in-right">
          {children}
        </div>
      </main>

      <BottomTabBar />
      <AICommandBar />
      <ToastContainer />
      <DynamicIsland />
      <ClinicalAlarmCenter open={alarmCenterOpen} onClose={() => setAlarmCenterOpen(false)} />
      <PersianClinicAiAssistant />
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
  '/roadmap': () => import('../pages/Roadmap'),
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
const WaitingRoomDisplay = React.lazy(() => import('../pages/WaitingRoomDisplay'))
const SMS = lazyPage('/sms')
const Reminders = lazyPage('/reminders')
const Roadmap = lazyPage('/roadmap')

function LL({ children, path }: { children: React.ReactNode; path: string }) {
  const { profile, session } = useAuth()
  const navigate = useNavigate()
  const effectiveRole = profile?.role || (session ? 'owner' : undefined)
  const allowed = canAccess(effectiveRole, path)

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

  // Public Waiting Room Lounge TV screen (مانیتور سالن انتظار و فراخوان بیمار)
  if (window.location.hash.startsWith('#/waiting-room')) {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-white"><Spinner size={32} /></div>}>
        <WaitingRoomDisplay />
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
          <Route path="/roadmap" element={<LL path="/roadmap"><Roadmap /></LL>} />
          <Route path="/waiting-room" element={<WaitingRoomDisplay />} />
          <Route path="*"                element={<NotFound />} />
        </Routes>
      </LayoutInner>
    </HashRouter>
  )
}
