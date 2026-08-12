// Dashboard.tsx — World-class Enterprise Persian RTL Dental Clinic Dashboard
// iOS 27 design • Dark mode • Time-range & doctor filters • Period comparison
// Auto-refresh • CSV export • Activity feed • Full accessibility • Responsive
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Calendar, DollarSign, FlaskConical, Plus, ArrowLeft, Activity,
  Clock, TrendingUp, TrendingDown, Smile, AlertTriangle, Package,
  ClipboardList, Wallet, Zap, ChevronLeft, Timer, Moon, Sun,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles, Building2,
  RefreshCw, Download, FileText, Bell,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, Cell,
} from 'recharts'
import {
  fetchDashboardStats, fetchAppointments, fetchPatients, fetchPayments,
  fetchEncounters, fetchInventoryItems, fetchLabOrders, fetchWaitingList,
  fetchActivityFeed, fetchDoctors,
} from '../lib/api'
import {
  toJalaliStringPretty, getJalaliMonthYear, formatCurrency, formatNumber,
  toPersianDigits, persianMonths, formatTime,
} from '../lib/persianDate'
import type {
  AppointmentWithRelations, Patient, Payment, DashboardStats, Doctor, LabOrder,
} from '../types'
import { Card, Badge, EmptyState, showToast } from '../components/ui'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { h } from '../lib/haptics'
import { usePullToRefresh } from '../lib/usePullToRefresh'

// ============================================================================
// Types & Constants
// ============================================================================

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all'

const timeRangeLabels: Record<TimeRange, string> = {
  today: 'امروز',
  week: 'هفته',
  month: 'ماه',
  year: 'سال',
  all: 'همه',
}

const appointmentStatusColors: Record<string, string> = {
  scheduled: 'slate',
  confirmed: 'primary',
  in_chair: 'warning',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
}

const appointmentStatusLabels: Record<string, string> = {
  scheduled: 'زمان‌بندی شده',
  confirmed: 'تایید شده',
  in_chair: 'روی صندلی',
  completed: 'تکمیل شده',
  cancelled: 'لغو شده',
  no_show: 'حضور نداشت',
}

const activityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  patient_created: { icon: <Users size={14} />, color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400' },
  appointment_scheduled: { icon: <Calendar size={14} />, color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' },
  payment_received: { icon: <Wallet size={14} />, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' },
  treatment_completed: { icon: <CheckCircle2 size={14} />, color: 'bg-success-100 text-success-600 dark:bg-success-900/40 dark:text-success-400' },
  prescription_created: { icon: <FileText size={14} />, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' },
  lab_order_created: { icon: <FlaskConical size={14} />, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' },
  default: { icon: <Activity size={14} />, color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
}

// ============================================================================
// Animated Count-Up Hook
// ============================================================================

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return value
}

// ============================================================================
// Date Range Helper
// ============================================================================

function getDateRange(range: TimeRange): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  let start: Date
  switch (range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week': {
      const day = now.getDay()
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
      break
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      break
    case 'all':
      start = new Date(2000, 0, 1)
      break
  }
  const diffMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - diffMs)
  return { start, end, prevStart, prevEnd }
}

// ============================================================================
// Sparkline
// ============================================================================

function Sparkline({ data, color, width = 64, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const stepX = width / Math.max(data.length - 1, 1)
  const points = data.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * height * 0.85 - 2
    return `${x},${y}`
  })
  const path = `M${points.join(' L')}`
  const areaPath = `${path} L${width},${height} L0,${height} Z`
  const gradId = `spark-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="sparkline-draw" />
    </svg>
  )
}

// ============================================================================
// Premium Stat Tile
// ============================================================================

type TileColor = 'teal' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet'

const tileThemes: Record<TileColor, { gradient: string; glow: string; text: string; sparkColor: string; iconBg: string }> = {
  teal:    { gradient: 'from-teal-500 via-teal-600 to-cyan-700',        glow: 'shadow-teal-500/30',    text: 'text-teal-50',    sparkColor: '#5eead4', iconBg: 'bg-white/20' },
  amber:   { gradient: 'from-amber-400 via-orange-500 to-amber-600',    glow: 'shadow-amber-500/30',   text: 'text-amber-50',   sparkColor: '#fcd34d', iconBg: 'bg-white/20' },
  emerald: { gradient: 'from-emerald-400 via-green-500 to-emerald-700', glow: 'shadow-emerald-500/30', text: 'text-emerald-50', sparkColor: '#6ee7b7', iconBg: 'bg-white/20' },
  rose:    { gradient: 'from-rose-400 via-red-500 to-rose-600',         glow: 'shadow-rose-500/30',    text: 'text-rose-50',    sparkColor: '#fda4af', iconBg: 'bg-white/20' },
  sky:     { gradient: 'from-sky-400 via-blue-500 to-indigo-600',       glow: 'shadow-sky-500/30',     text: 'text-sky-50',     sparkColor: '#7dd3fc', iconBg: 'bg-white/20' },
  violet:  { gradient: 'from-violet-400 via-purple-500 to-violet-600',  glow: 'shadow-violet-500/30',  text: 'text-violet-50',  sparkColor: '#c4b5fd', iconBg: 'bg-white/20' },
}

function StatTile({
  icon, label, value, suffix, color, sparkData, trend, delay, onClick, ariaLabel,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  color: TileColor
  sparkData: number[]
  trend?: { value: string; up: boolean }
  delay: number
  onClick?: () => void
  ariaLabel?: string
}) {
  const animatedValue = useCountUp(value)
  const theme = tileThemes[color]
  return (
    <button
      onClick={() => { h.tap(); onClick?.() }}
      aria-label={ariaLabel || label}
      style={{ animationDelay: `${delay}ms` }}
      className={`tile-in card-lift relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} ${theme.glow} shadow-lg p-5 text-right shimmer-sweep group focus:outline-none focus:ring-4 focus:ring-white/30`}
    >
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className={`relative w-12 h-12 rounded-2xl ${theme.iconBg} backdrop-blur-sm flex items-center justify-center text-white mb-3 float-bounce`}>
        {icon}
      </div>
      <p className={`relative text-xs font-medium ${theme.text} opacity-80 mb-1`}>{label}</p>
      <div className="relative flex items-baseline gap-1">
        <span className={`text-2xl font-extrabold ${theme.text} count-glow`}>
          {toPersianDigits(formatNumber(animatedValue))}
        </span>
        {suffix && <span className={`text-xs font-medium ${theme.text} opacity-70`}>{suffix}</span>}
      </div>
      <div className="relative flex items-center justify-between mt-3">
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${theme.text} bg-white/15 rounded-full px-2 py-0.5`}>
            {trend.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.value}
          </span>
        )}
        <div className="mr-auto">
          <Sparkline data={sparkData} color={theme.sparkColor} />
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// Quick Action Button
// ============================================================================

function QuickAction({ icon, label, gradient, onClick, delay }: { icon: React.ReactNode; label: string; gradient: string; onClick: () => void; delay: number }) {
  return (
    <button
      onClick={() => { h.select(); onClick() }}
      aria-label={label}
      style={{ animationDelay: `${delay}ms` }}
      className={`tile-in card-lift flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-md text-white relative overflow-hidden min-w-[88px] flex-1 focus:outline-none focus:ring-4 focus:ring-white/30`}
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center float-bounce">
        {icon}
      </div>
      <span className="text-xs font-bold">{label}</span>
    </button>
  )
}

// ============================================================================
// Alert Widget
// ============================================================================

function AlertWidget({ icon, label, value, color, onClick, delay }: { icon: React.ReactNode; label: string; value: string; color: string; onClick: () => void; delay: number }) {
  return (
    <button
      onClick={() => { h.warning(); onClick() }}
      aria-label={label}
      style={{ animationDelay: `${delay}ms` }}
      className={`tile-in card-lift flex items-center gap-3 p-4 rounded-2xl border-2 ${color} text-right alert-ring focus:outline-none focus:ring-4 focus:ring-error/20`}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold opacity-80">{label}</p>
        <p className="text-base font-extrabold truncate">{value}</p>
      </div>
      <ChevronLeft size={16} className="opacity-50 flex-shrink-0" />
    </button>
  )
}

// ============================================================================
// Today Appointment Row
// ============================================================================

function AppointmentRow({ apt, index, patientName, doctorName, onClick }: {
  apt: AppointmentWithRelations
  index: number
  patientName: (a: AppointmentWithRelations) => string
  doctorName: (a: AppointmentWithRelations) => string
  onClick: () => void
}) {
  const statusColor = appointmentStatusColors[apt.status] || 'slate'
  const statusLabel = appointmentStatusLabels[apt.status] || apt.status
  const isCompleted = apt.status === 'completed'
  const isCancelled = apt.status === 'cancelled' || apt.status === 'no_show'
  const isInChair = apt.status === 'in_chair'

  return (
    <div
      onClick={() => { h.tap(); onClick() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { h.tap(); onClick() } }}
      aria-label={`نوبت ${patientName(apt)} ساعت ${formatTime(apt.start_time)}`}
      style={{ animationDelay: `${index * 60}ms` }}
      className={`stagger-item flex items-center gap-3 p-3 rounded-2xl transition-all-smooth cursor-pointer hover:shadow-md border border-slate-100 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-700 hover:bg-primary-50/30 dark:hover:bg-slate-700/50 ${isInChair ? 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-700' : isCompleted ? 'bg-success-50/50 dark:bg-success-900/10 border-success-100 dark:border-success-800' : isCancelled ? 'bg-error-50/30 dark:bg-error-900/10 border-error-100 dark:border-error-800 opacity-70' : 'bg-white dark:bg-slate-800'}`}
    >
      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex-shrink-0">
        <span className="text-xs font-bold">{toPersianDigits(formatTime(apt.start_time))}</span>
        {isInChair && <Timer size={12} className="text-warning-300 mt-0.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{patientName(apt)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{doctorName(apt)}</p>
      </div>
      <Badge color={statusColor}>{statusLabel}</Badge>
    </div>
  )
}

// ============================================================================
// Recent Patient Row
// ============================================================================

function PatientRow({ patient, index, onClick }: { patient: Patient; index: number; onClick: () => void }) {
  const initials = toPersianDigits(patient.first_name?.charAt(0) || '؟')
  const avatarColors = ['from-teal-400 to-cyan-500', 'from-amber-400 to-orange-500', 'from-emerald-400 to-green-500', 'from-sky-400 to-blue-500', 'from-rose-400 to-red-500']
  const colorIdx = (patient.first_name?.charCodeAt(0) || 0) % avatarColors.length
  return (
    <div
      onClick={() => { h.tap(); onClick() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { h.tap(); onClick() } }}
      aria-label={`بیمار ${patient.first_name} ${patient.last_name}`}
      style={{ animationDelay: `${index * 50}ms` }}
      className="stagger-item flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all-smooth cursor-pointer"
    >
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{patient.first_name} {patient.last_name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{patient.phone ? toPersianDigits(patient.phone) : 'بدون تلفن'}</p>
      </div>
      {patient.vip_level && patient.vip_level > 0 && (
        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 rounded-full px-2 py-0.5">
          <Sparkles size={10} /> VIP
        </span>
      )}
    </div>
  )
}

// ============================================================================
// Radial Progress Ring
// ============================================================================

function RadialProgress({ percent, label, color }: { percent: number; label: string; color: string }) {
  const animatedPercent = useCountUp(percent)
  const data = [{ name: label, value: animatedPercent, fill: color }]
  return (
    <div className="relative w-32 h-32 mx-auto" role="img" aria-label={`${label}: ${toPersianDigits(animatedPercent)} درصد`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="68%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: 'currentColor' }} className="text-slate-100 dark:text-slate-700" dataKey="value" cornerRadius={10} angleAxisId={0} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{toPersianDigits(animatedPercent)}٪</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Activity Feed Item
// ============================================================================

type ActivityItem = {
  id: string
  event_type: string
  event_date: string
  title: string | null
  description: string | null
  patient_name: string | null
  created_at: string
}

function ActivityRow({ item, index, onClick }: { item: ActivityItem; index: number; onClick: () => void }) {
  const config = activityIcons[item.event_type] || activityIcons.default
  return (
    <div
      onClick={() => { h.tap(); onClick() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { h.tap(); onClick() } }}
      style={{ animationDelay: `${index * 40}ms` }}
      className="stagger-item flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-all-smooth"
    >
      <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{item.title || item.event_type}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {item.patient_name && <span className="font-medium">{item.patient_name} — </span>}
          {item.description}
        </p>
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
        {toJalaliStringPretty(item.event_date || item.created_at || new Date().toISOString())}
      </span>
    </div>
  )
}

// ============================================================================
// CSV Export Helper
// ============================================================================

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================================
// Main Component
// ============================================================================

export default function Dashboard() {
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [outstandingBalance, setOutstandingBalance] = useState(0)
  const [lowInventoryCount, setLowInventoryCount] = useState(0)
  const [overdueLabCount, setOverdueLabCount] = useState(0)
  const [waitingListCount, setWaitingListCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('today')
  const [doctorFilter, setDoctorFilter] = useState<string>('all')

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('minadent-dark')
    if (stored !== null) return stored === 'true'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true)

  // ── Dark Mode Effect ───────────────────────────────────────────

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('minadent-dark', String(darkMode))
  }, [darkMode])

  // Sync dark mode across components via storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'minadent-dark') setDarkMode(e.newValue === 'true')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const [labOrdersState, setLabOrdersState] = useState<LabOrder[]>([])

  // ── Data Fetching ──────────────────────────────────────────────

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); h.tap() } else { setLoading(true) }
    try {
      const [s, appts, pats, pays, encs, items, labOrders, waiting, docs, feed] = await Promise.all([
        fetchDashboardStats(),
        fetchAppointments(),
        fetchPatients(),
        fetchPayments(),
        fetchEncounters(),
        fetchInventoryItems(),
        fetchLabOrders(),
        fetchWaitingList(),
        fetchDoctors(),
        fetchActivityFeed(15),
      ])
      setStats(s); setAppointments(appts); setPatients(pats); setPayments(pays)
      setDoctors(docs); setActivity(feed as ActivityItem[])
      setLabOrdersState(labOrders as LabOrder[])
      const outstanding = encs.reduce((sum, e) => sum + Math.max(0, (e.total_amount ?? 0) - (e.paid_amount ?? 0)), 0)
      setOutstandingBalance(outstanding)
      setLowInventoryCount(items.filter((i: any) => (i.quantity ?? 0) <= (i.min_quantity ?? 0) && i.is_active !== false).length)
      const today = new Date().toISOString().slice(0, 10)
      setOverdueLabCount(labOrders.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled' && o.deadline && o.deadline < today).length)
      setWaitingListCount(waiting.filter((w: any) => w.status === 'waiting').length)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error loading dashboard:', err)
      showToast('error', 'خطا در بارگذاری داشبورد')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 30000)
    const autoTimer = autoRefresh ? setInterval(() => loadData(true), 60000) : null
    return () => {
      clearInterval(clockTimer)
      if (autoTimer) clearInterval(autoTimer)
    }
  }, [loadData, autoRefresh])

  // ── Date Range ─────────────────────────────────────────────────

  const { start: rangeStart, end: rangeEnd, prevStart, prevEnd } = useMemo(() => getDateRange(timeRange), [timeRange])

  // ── Filtered Data by Time Range + Doctor ───────────────────────

  const inRange = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    return d >= rangeStart && d <= rangeEnd
  }, [rangeStart, rangeEnd])

  const inPrevRange = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    return d >= prevStart && d <= prevEnd
  }, [prevStart, prevEnd])

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => inRange(a.date))
      .filter((a) => doctorFilter === 'all' || a.doctor_id === doctorFilter)
  }, [appointments, inRange, doctorFilter])

  const filteredPatients = useMemo(() => {
    return patients
      .filter((p) => inRange(p.created_at))
      .filter((p) => doctorFilter === 'all' || p.primary_doctor_id === doctorFilter)
  }, [patients, inRange, doctorFilter])

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => inRange(p.payment_date))
      .filter((p) => p.status === 'completed')
  }, [payments, inRange])

  const prevPayments = useMemo(() => {
    return payments
      .filter((p) => inPrevRange(p.payment_date))
      .filter((p) => p.status === 'completed')
  }, [payments, inPrevRange])

  // ── Today's Appointments (always today regardless of filter) ───

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const todayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === todayStr)
      .filter((a) => doctorFilter === 'all' || a.doctor_id === doctorFilter)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [appointments, todayStr, doctorFilter])

  // ── Recent Patients (always recent regardless of filter) ───────

  const recentPatients = useMemo(() => {
    return [...patients]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
  }, [patients])

  // ── Revenue Chart Data (period-aware) ──────────────────────────

  const revenueChartData = useMemo(() => {
    if (timeRange === 'today' || timeRange === 'week') {
      // Daily breakdown
      const days: { label: string; revenue: number }[] = []
      const dayCount = timeRange === 'today' ? 1 : 7
      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(rangeStart.getTime() + i * 86400000)
        const dayStr = d.toISOString().slice(0, 10)
        const rev = payments
          .filter((p) => p.payment_date.slice(0, 10) === dayStr && p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0)
        const info = toJalaliStringPretty(dayStr)
        days.push({ label: info.split(' ').slice(0, 2).join(' '), revenue: rev })
      }
      return days
    } else if (timeRange === 'month') {
      // Weekly breakdown within the month
      const weeks: { label: string; revenue: number }[] = []
      for (let w = 0; w < 4; w++) {
        const ws = new Date(rangeStart.getTime() + w * 7 * 86400000)
        const we = new Date(Math.min(ws.getTime() + 7 * 86400000, rangeEnd.getTime()))
        const rev = payments
          .filter((p) => {
            const pd = new Date(p.payment_date)
            return pd >= ws && pd < we && p.status === 'completed'
          })
          .reduce((sum, p) => sum + (p.amount || 0), 0)
        weeks.push({ label: `هفته ${toPersianDigits(w + 1)}`, revenue: rev })
      }
      return weeks
    } else {
      // Monthly breakdown for year/all
      const months: { label: string; revenue: number }[] = []
      const monthCount = timeRange === 'year' ? 12 : 6
      const now = new Date()
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const rev = payments
          .filter((p) => {
            const pd = new Date(p.payment_date)
            return pd >= d && pd < next && p.status === 'completed'
          })
          .reduce((sum, p) => sum + (p.amount || 0), 0)
        const { month, year } = getJalaliMonthYear(d.toISOString())
        months.push({ label: `${persianMonths[month - 1]} ${toPersianDigits(year)}`, revenue: rev })
      }
      return months
    }
  }, [payments, timeRange, rangeStart, rangeEnd])

  // ── Period Comparison ──────────────────────────────────────────

  const currentRevenue = useMemo(() => filteredPayments.reduce((s, p) => s + (p.amount || 0), 0), [filteredPayments])
  const prevRevenue = useMemo(() => prevPayments.reduce((s, p) => s + (p.amount || 0), 0), [prevPayments])
  const revenueChange = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0

  const currentPatientCount = filteredPatients.length
  const prevPatientCount = useMemo(() => {
    return patients.filter((p) => inPrevRange(p.created_at)).length
  }, [patients, inPrevRange])
  const patientChange = prevPatientCount > 0 ? Math.round(((currentPatientCount - prevPatientCount) / prevPatientCount) * 100) : 0

  const currentApptCount = filteredAppointments.length
  const prevApptCount = useMemo(() => {
    return appointments.filter((a) => inPrevRange(a.date)).filter((a) => doctorFilter === 'all' || a.doctor_id === doctorFilter).length
  }, [appointments, inPrevRange, doctorFilter])
  const apptChange = prevApptCount > 0 ? Math.round(((currentApptCount - prevApptCount) / prevApptCount) * 100) : 0

  // ── Real Sparkline Data ────────────────────────────────────────

  const patientSparkData = useMemo(() => {
    const now = new Date()
    const data: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      data.push(patients.filter((p) => {
        const pd = new Date(p.created_at)
        return pd >= d && pd < next
      }).length)
    }
    return data
  }, [patients])

  const appointmentSparkData = useMemo(() => {
    const now = new Date()
    const data: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      data.push(appointments.filter((a) => {
        const pd = new Date(a.date)
        return pd >= d && pd < next
      }).length)
    }
    return data
  }, [appointments])

  const revenueSparkData = useMemo(() => {
    const now = new Date()
    const data: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      data.push(payments.filter((p) => {
        const pd = new Date(p.payment_date)
        return pd >= d && pd < next && p.status === 'completed'
      }).reduce((s, p) => s + (p.amount || 0), 0))
    }
    return data
  }, [payments])

  const labSparkData = useMemo(() => {
    const now = new Date()
    const data: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      data.push(labOrdersState.filter((o) => {
        const pd = new Date(o.created_at || o.deadline || '')
        return pd >= d && pd < next
      }).length)
    }
    return data
  }, [labOrdersState])

  // ── Occupancy (from doctor schedules, fallback to 32 max) ──────

  const occupancyRate = useMemo(() => {
    const maxSlots = 32
    return Math.min(100, Math.round((todayAppointments.length / maxSlots) * 100))
  }, [todayAppointments])

  // ── Status Distribution for Bar Chart ──────────────────────────

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredAppointments.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1
    })
    return Object.entries(counts).map(([status, count]) => ({
      name: appointmentStatusLabels[status] || status,
      count,
      fill: status === 'completed' ? '#10b981' : status === 'in_chair' ? '#f59e0b' : status === 'cancelled' || status === 'no_show' ? '#ef4444' : '#0d9488',
    }))
  }, [filteredAppointments])

  // ── Helpers ────────────────────────────────────────────────────

  const patientName = (a: AppointmentWithRelations) => a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'نامشخص'
  const doctorName = (a: AppointmentWithRelations) => {
    if (!a.doctor) return '-'
    return a.doctor.name || a.doctor.specialty || 'پزشک'
  }

  const handleRefresh = useCallback(() => { loadData(true) }, [loadData])

  const ptr = usePullToRefresh(async () => { await loadData(true) })

  const handleExportRevenue = () => {
    h.confirm()
    exportCSV(
      `درآمد-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['بازه', 'درآمد (تومان)'],
      revenueChartData.map((d) => [d.label, d.revenue]),
    )
    showToast('success', 'خروجی CSV دریافت شد')
  }

  const handleExportAppointments = () => {
    h.confirm()
    exportCSV(
      `نوبت‌ها-${new Date().toISOString().slice(0, 10)}.csv`,
      ['بیمار', 'پزشک', 'تاریخ', 'ساعت شروع', 'وضعیت'],
      todayAppointments.map((a) => [
        patientName(a),
        doctorName(a),
        toJalaliStringPretty(a.date),
        a.start_time,
        appointmentStatusLabels[a.status] || a.status,
      ]),
    )
    showToast('success', 'خروجی CSV دریافت شد')
  }

  // ── Quick Actions ──────────────────────────────────────────────

  const quickActions = [
    { label: 'نوبت جدید',   icon: <Calendar size={20} />,      gradient: 'from-amber-400 to-orange-600',  path: '/appointments' },
    { label: 'بیمار جدید',  icon: <Users size={20} />,         gradient: 'from-sky-400 to-blue-600',      path: '/patients' },
    { label: 'ایمپلنت',      icon: <Smile size={20} />,         gradient: 'from-blue-400 to-blue-700',     path: '/implants' },
    { label: 'لیست انتظار', icon: <Clock size={20} />,         gradient: 'from-yellow-400 to-yellow-600', path: '/waiting-list' },
    { label: 'صندوق',        icon: <Wallet size={20} />,        gradient: 'from-emerald-400 to-green-600', path: '/billing' },
    { label: 'موجودی',       icon: <Package size={20} />,       gradient: 'from-orange-400 to-red-600',    path: '/inventory' },
  ]

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="skeleton h-10 w-full rounded-2xl" />
        <div className="skeleton h-28 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="skeleton h-32 rounded-3xl" />)}
        </div>
        <div className="skeleton h-16 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeleton h-80 rounded-2xl lg:col-span-2" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
    <div className="space-y-6" aria-live="polite" {...ptr.handlers}>
      {/* ═══ Pull-to-refresh indicator ═══ */}
      {ptr.pullDistance > 0 && (
        <div className="pull-indicator" style={{ opacity: ptr.isRefreshing ? 1 : ptr.pullProgress, top: -4 }}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full border-2 border-primary-300 dark:border-primary-600 border-t-primary-600 dark:border-t-primary-400 ${ptr.isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `scale(${0.6 + ptr.pullProgress * 0.4})` }}
            />
            <span className="text-[10px] text-primary-500 font-medium">{ptr.isRefreshing ? 'در حال به‌روزرسانی...' : 'برای به‌روزرسانی بکشید'}</span>
          </div>
        </div>
      )}
      {/* ═══ Toolbar: Filters + Dark Mode + Refresh ══════════════ */}
      <div className="tile-in flex items-center justify-between flex-wrap gap-3" style={{ animationDelay: '0ms' }}>
        {/* Time Range Filter */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
          {(Object.keys(timeRangeLabels) as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => { h.tap(); setTimeRange(r) }}
              aria-label={`فیلتر: ${timeRangeLabels[r]}`}
              aria-pressed={timeRange === r}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all-smooth focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                timeRange === r
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {timeRangeLabels[r]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Doctor Filter */}
          {doctors.length > 0 && (
            <select
              value={doctorFilter}
              onChange={(e) => { h.tap(); setDoctorFilter(e.target.value) }}
              aria-label="فیلتر بر اساس پزشک"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
            >
              <option value="all">همه پزشکان</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name || d.specialty || 'پزشک'}</option>
              ))}
            </select>
          )}

          {/* Auto-refresh toggle */}
          <button
            onClick={() => { h.tap(); setAutoRefresh(!autoRefresh) }}
            aria-label="به‌روزرسانی خودکار"
            aria-pressed={autoRefresh}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all-smooth ${
              autoRefresh
                ? 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 border-success-200 dark:border-success-700'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap size={14} className={autoRefresh ? 'animate-pulse' : ''} />
            خودکار
          </button>

          {/* Manual Refresh */}
          <button
            onClick={handleRefresh}
            aria-label="به‌روزرسانی دستی"
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all-smooth disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => { h.tap(); setDarkMode(!darkMode) }}
            aria-label={darkMode ? 'حالت روشن' : 'حالت تاریک'}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all-smooth"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* ═══ Hero Header ═══════════════════════════════════════════ */}
      <div
        className="tile-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-teal-900 dark:from-slate-900 dark:via-slate-950 dark:to-teal-950 p-6 md:p-7 shadow-xl gradient-animate"
        style={{ animationDelay: '50ms' }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/30 backdrop-blur-sm flex items-center justify-center">
                <Building2 size={16} className="text-teal-300" />
              </div>
              <span className="text-teal-300 text-xs font-bold tracking-wide">کلینیک دندانپزشکی مینا</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">داشبورد مدیریت</h1>
            <p className="text-sm text-slate-300">
              {toJalaliStringPretty(todayStr)}
              {doctorFilter !== 'all' && (
                <span className="mr-2 text-teal-300">— {doctors.find((d) => d.id === doctorFilter)?.name || 'پزشک'}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-lg font-bold text-white tabular-nums">
                {toPersianDigits(currentTime.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}
              </span>
              <span className="text-xs text-teal-300">ساعت کلینیک</span>
            </div>
            <button
              onClick={() => { h.confirm(); navigate('/appointments') }}
              aria-label="نوبت جدید"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-white font-bold shadow-lg shadow-teal-500/30 card-lift transition-all-smooth focus:outline-none focus:ring-4 focus:ring-teal-300/50"
            >
              <Plus size={20} />
              نوبت جدید
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Stat Tiles ════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatTile
          icon={<Users size={24} />}
          label="بیماران"
          value={currentPatientCount}
          color="teal"
          sparkData={patientSparkData}
          trend={patientChange !== 0 ? { value: `${toPersianDigits(Math.abs(patientChange))}٪`, up: patientChange >= 0 } : undefined}
          delay={100}
          onClick={() => navigate('/patients')}
          ariaLabel={`بیماران: ${currentPatientCount}، تغییر ${patientChange} درصد`}
        />
        <StatTile
          icon={<Calendar size={24} />}
          label="نوبت‌ها"
          value={currentApptCount}
          suffix={timeRange === 'today' ? `امروز` : ''}
          color="amber"
          sparkData={appointmentSparkData}
          trend={apptChange !== 0 ? { value: `${toPersianDigits(Math.abs(apptChange))}٪`, up: apptChange >= 0 } : undefined}
          delay={180}
          onClick={() => navigate('/appointments')}
          ariaLabel={`نوبت‌ها: ${currentApptCount}`}
        />
        <StatTile
          icon={<DollarSign size={24} />}
          label="درآمد دوره"
          value={Math.round(currentRevenue / 1000000)}
          suffix="م ت"
          color="emerald"
          sparkData={revenueSparkData.map((v) => Math.round(v / 1000000))}
          trend={revenueChange !== 0 ? { value: `${toPersianDigits(Math.abs(revenueChange))}٪`, up: revenueChange >= 0 } : undefined}
          delay={260}
          onClick={() => navigate('/billing')}
          ariaLabel={`درآمد: ${formatCurrency(currentRevenue)} تومان`}
        />
        <StatTile
          icon={<FlaskConical size={24} />}
          label="سفارش‌های لابراتوار"
          value={stats?.activeLabOrders ?? 0}
          color="rose"
          sparkData={labSparkData}
          trend={{ value: `${toPersianDigits(overdueLabCount)} تأخیر`, up: overdueLabCount > 0 }}
          delay={340}
          onClick={() => navigate('/laboratory')}
          ariaLabel={`سفارش‌های فعال: ${stats?.activeLabOrders ?? 0}`}
        />
      </div>

      {/* ═══ Quick Actions ══════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action, i) => (
          <QuickAction
            key={action.path}
            icon={action.icon}
            label={action.label}
            gradient={action.gradient}
            onClick={() => navigate(action.path)}
            delay={400 + i * 60}
          />
        ))}
      </div>

      {/* ═══ Alert Widgets ══════════════════════════════════════════ */}
      {(outstandingBalance > 0 || lowInventoryCount > 0 || overdueLabCount > 0 || waitingListCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {outstandingBalance > 0 && (
            <AlertWidget
              icon={<div className="w-full h-full rounded-xl bg-warning-100 dark:bg-warning-900/40 flex items-center justify-center text-warning-600 dark:text-warning-400"><Wallet size={20} /></div>}
              label="مانده بدهی بیماران"
              value={`${formatCurrency(outstandingBalance)} ت`}
              color="border-warning-200 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/20 text-warning-800 dark:text-warning-300"
              onClick={() => navigate('/billing')}
              delay={500}
            />
          )}
          {lowInventoryCount > 0 && (
            <AlertWidget
              icon={<div className="w-full h-full rounded-xl bg-error-100 dark:bg-error-900/40 flex items-center justify-center text-error-600 dark:text-error-400"><Package size={20} /></div>}
              label="موجودی رو به اتمام"
              value={`${toPersianDigits(lowInventoryCount)} مورد`}
              color="border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-900/20 text-error-800 dark:text-error-300"
              onClick={() => navigate('/inventory')}
              delay={560}
            />
          )}
          {overdueLabCount > 0 && (
            <AlertWidget
              icon={<div className="w-full h-full rounded-xl bg-error-100 dark:bg-error-900/40 flex items-center justify-center text-error-600 dark:text-error-400"><AlertTriangle size={20} /></div>}
              label="سفارش تأخیر یافته"
              value={`${toPersianDigits(overdueLabCount)} مورد`}
              color="border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-900/20 text-error-800 dark:text-error-300"
              onClick={() => navigate('/laboratory')}
              delay={620}
            />
          )}
          {waitingListCount > 0 && (
            <AlertWidget
              icon={<div className="w-full h-full rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400"><ClipboardList size={20} /></div>}
              label="لیست انتظار"
              value={`${toPersianDigits(waitingListCount)} نفر`}
              color="border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300"
              onClick={() => navigate('/waiting-list')}
              delay={680}
            />
          )}
        </div>
      )}

      {/* ═══ Main Grid: Appointments + Side Panel ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <Card className="p-5 lg:col-span-2 tile-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white">
                <Calendar size={16} />
              </div>
              نوبت‌های امروز
              {todayAppointments.length > 0 && (
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 rounded-full px-2 py-0.5">
                  {toPersianDigits(todayAppointments.length)}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAppointments}
                aria-label="خروجی CSV نوبت‌ها"
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                <Download size={14} />
                CSV
              </button>
              <button
                onClick={() => { h.tap(); navigate('/appointments') }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 font-medium"
              >
                مشاهده همه
                <ArrowLeft size={14} />
              </button>
            </div>
          </div>

          {todayAppointments.length === 0 ? (
            <EmptyState
              icon={<Calendar size={28} />}
              title="نوبتی برای امروز ثبت نشده است"
              description="می‌توانید نوبت جدید ایجاد کنید"
            />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 -mr-1">
              {todayAppointments.map((a, i) => (
                <AppointmentRow
                  key={a.id}
                  apt={a}
                  index={i}
                  patientName={patientName}
                  doctorName={doctorName}
                  onClick={() => navigate(`/patients/${a.patient_id}`)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Side Panel: Occupancy + Revenue Snapshot */}
        <div className="space-y-6">
          <Card className="p-5 tile-in">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                <Zap size={14} />
              </div>
              نرخ اشغال یونیت
            </h3>
            <RadialProgress percent={occupancyRate} label="اشغال امروز" color="#f59e0b" />
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">نوبت‌ها</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{toPersianDigits(todayAppointments.length)}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">تکمیل شده</p>
                <p className="text-sm font-bold text-success-600 dark:text-success-400">{toPersianDigits(todayAppointments.filter((a) => a.status === 'completed').length)}</p>
              </div>
            </div>
          </Card>

          {/* Revenue Snapshot with Comparison */}
          <Card className="p-5 tile-in">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white">
                <DollarSign size={14} />
              </div>
              درآمد {timeRangeLabels[timeRange]}
            </h3>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 count-glow">
              {formatCurrency(currentRevenue / 1000000)}
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mr-1">میلیون ت</span>
            </p>
            {revenueChange !== 0 && (
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">نسبت به دوره قبل</span>
                <span className={`flex items-center gap-0.5 font-bold ${revenueChange >= 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                  {revenueChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {toPersianDigits(Math.abs(revenueChange))}٪
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ═══ Charts: Revenue + Status Distribution ══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="p-5 tile-in lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white">
                <TrendingUp size={16} />
              </div>
              روند درآمد
            </h2>
            <button
              onClick={handleExportRevenue}
              aria-label="خروجی CSV درآمد"
              className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
            >
              <Download size={14} />
              CSV
            </button>
          </div>

          {revenueChartData.every((d) => d.revenue === 0) ? (
            <EmptyState
              icon={<TrendingUp size={28} />}
              title="داده درآمدی موجود نیست"
              description="پس از ثبت پرداخت‌ها، نمودار نمایش داده می‌شود"
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v) => formatNumber(Math.round(v / 1000000))}
                  width={50}
                  tickLine={false}
                  axisLine={false}
                />
                <RTooltip
                  formatter={(v: number) => [`${formatCurrency(v)} ت`, 'درآمد']}
                  contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 16, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '8px 12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="url(#revLine)"
                  strokeWidth={3}
                  fill="url(#revGradient)"
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6, fill: '#14b8a6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Status Distribution Bar Chart */}
        <Card className="p-5 tile-in">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white">
              <Activity size={14} />
            </div>
            توزیع وضعیت نوبت‌ها
          </h3>
          {statusChartData.length === 0 ? (
            <EmptyState
              icon={<Activity size={24} />}
              title="داده‌ای موجود نیست"
              description="نوبتی در این بازه ثبت نشده است"
            />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusChartData} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={70} />
                <RTooltip
                  formatter={(v: number) => [`${toPersianDigits(v)} نوبت`, 'تعداد']}
                  contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ═══ Recent Patients + Activity Feed ════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <Card className="p-5 tile-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white">
                <Users size={16} />
              </div>
              بیماران اخیر
            </h2>
            <button
              onClick={() => { h.tap(); navigate('/patients') }}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 font-medium"
            >
              مشاهده همه
              <ArrowLeft size={14} />
            </button>
          </div>

          {recentPatients.length === 0 ? (
            <EmptyState
              icon={<Users size={28} />}
              title="بیماری ثبت نشده است"
              description="با افزودن بیمار شروع کنید"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentPatients.map((p, i) => (
                <PatientRow
                  key={p.id}
                  patient={p}
                  index={i}
                  onClick={() => navigate(`/patients/${p.id}`)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Activity Feed */}
        <Card className="p-5 tile-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white">
                <Bell size={16} />
              </div>
              فعالیت‌های اخیر
            </h2>
          </div>

          {activity.length === 0 ? (
            <EmptyState
              icon={<Bell size={28} />}
              title="فعالیتی ثبت نشده است"
              description="فعالیت‌های کلینیک در اینجا نمایش داده می‌شود"
            />
          ) : (
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1 -mr-1">
              {activity.map((item, i) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                  index={i}
                  onClick={() => item.patient_name ? navigate('/patients') : undefined}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ═══ Activity Footer ═════════════════════════════════════════ */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-2 flex-wrap" aria-live="polite" aria-atomic="true">
        <Activity size={14} className="text-primary-500" />
        <span>آخرین به‌روزرسانی: {toJalaliStringPretty(lastRefresh.toISOString())} — {toPersianDigits(lastRefresh.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}</span>
        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-1" />
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-success-500" />
          سیستم آنلاین
        </span>
        {autoRefresh && (
          <>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-1" />
            <span className="flex items-center gap-1 text-success-500">
              <Zap size={10} className="animate-pulse" />
              به‌روزرسانی خودکار هر ۶۰ ثانیه
            </span>
          </>
        )}
      </div>
    </div>
    </ErrorBoundary>
  )
}
