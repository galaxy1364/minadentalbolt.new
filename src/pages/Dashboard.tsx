// Dashboard.tsx — World-class Enterprise Persian RTL Dental Clinic Dashboard
// iOS 27 design • Dark mode • Time-range & doctor filters • Period comparison
// Auto-refresh • CSV export • Activity feed • Full accessibility • Responsive
import { useState, useEffect, useCallback, useMemo, useRef, cloneElement, isValidElement } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Calendar, DollarSign, FlaskConical, Plus, ArrowLeft, Activity,
  Clock, TrendingUp, TrendingDown, Smile, AlertTriangle, Package,
  ClipboardList, Wallet, Zap, ChevronLeft, Timer, Moon, Sun, Target, Settings2,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles, Building2,
  RefreshCw, Download, FileText, Bell,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, Cell,
} from 'recharts'
import { ModuleIconBadge } from '../components/ModuleIconBadge'
import { GlyphPatients, GlyphAppointments, GlyphBilling, GlyphLaboratory, GlyphImplants, GlyphWaitingList, GlyphInventory } from '../components/ModuleGlyphs'
import {
  fetchDashboardStats, fetchAppointments, fetchPatients, fetchPayments,
  fetchEncounters, fetchInventoryItems, fetchLabOrders, fetchWaitingList,
  fetchActivityFeed, fetchDoctors, fetchAllInstallments, fetchTreatments, fetchImplantCases,
} from '../lib/api'
import {
  toJalaliStringPretty, getJalaliMonthYear, formatCurrency, formatNumber,
  toPersianDigits, persianMonths, formatTime, jsDateToPersianWeekday,
} from '../lib/persianDate'
import type {
  AppointmentWithRelations, Patient, Payment, DashboardStats, Doctor, LabOrder,
  Encounter, Installment, TreatmentWithRelations, ImplantCase,
} from '../types'
import { Card, Badge, EmptyState, showToast, Modal } from '../components/ui'
import { findBirthdays, findDebtors, findLapsedPatients, findDueInstallments, findNoShows, findUnfinishedTreatmentFollowups, findUnresolvedPastAppointments, REMINDER_CATEGORY_META, SmartReminder } from '../lib/smartReminders'
import { calcAllPatientBalances } from '../lib/finance'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import DoctorDashboard from './DoctorDashboard'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { h } from '../lib/haptics'
import { staggerDelay } from '../lib/motion'
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
      const day = jsDateToPersianWeekday(now)
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

// Soft "white-to-color" tiles (Gemini-style wash) — light-tinted base +
// saturated color blob in the corner + colored icon. Shared by StatTile
// and QuickAction so the whole dashboard reads as one coherent palette:
// violet, lime ("کله‌غازی"), sky blue, pink, amber, rose.
type TileColor = 'violet' | 'lime' | 'sky' | 'pink' | 'amber' | 'rose'

const tileThemes: Record<TileColor, { bg: string; blob: string; iconBg: string; gradient: [string, string]; solidColor: string; text: string; sparkColor: string; ring: string }> = {
  violet: { bg: 'from-white to-violet-100 dark:from-slate-800 dark:to-violet-950/50', blob: 'from-violet-400/60 dark:from-violet-500/40', iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600', gradient: ['#a78bfa', '#9333ea'], solidColor: '#8b5cf6', text: 'text-violet-700 dark:text-violet-300', sparkColor: '#8b5cf6', ring: 'focus:ring-violet-300' },
  lime:   { bg: 'from-white to-lime-100 dark:from-slate-800 dark:to-lime-950/40',     blob: 'from-lime-400/60 dark:from-lime-500/35',     iconBg: 'bg-gradient-to-br from-lime-500 to-green-600',   gradient: ['#a3e635', '#16a34a'], solidColor: '#84cc16', text: 'text-lime-700 dark:text-lime-300',   sparkColor: '#84cc16', ring: 'focus:ring-lime-300' },
  sky:    { bg: 'from-white to-sky-100 dark:from-slate-800 dark:to-sky-950/50',       blob: 'from-sky-400/60 dark:from-sky-500/40',       iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',     gradient: ['#38bdf8', '#2563eb'], solidColor: '#0ea5e9', text: 'text-sky-700 dark:text-sky-300',     sparkColor: '#0ea5e9', ring: 'focus:ring-sky-300' },
  pink:   { bg: 'from-white to-pink-100 dark:from-slate-800 dark:to-pink-950/50',     blob: 'from-pink-400/60 dark:from-pink-500/40',     iconBg: 'bg-gradient-to-br from-pink-500 to-fuchsia-600', gradient: ['#f472b6', '#c026d3'], solidColor: '#ec4899', text: 'text-pink-700 dark:text-pink-300',   sparkColor: '#ec4899', ring: 'focus:ring-pink-300' },
  amber:  { bg: 'from-white to-amber-100 dark:from-slate-800 dark:to-amber-950/50',   blob: 'from-amber-400/60 dark:from-amber-500/40',   iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600', gradient: ['#fbbf24', '#ea580c'], solidColor: '#f59e0b', text: 'text-amber-700 dark:text-amber-300', sparkColor: '#f59e0b', ring: 'focus:ring-amber-300' },
  rose:   { bg: 'from-white to-rose-100 dark:from-slate-800 dark:to-rose-950/50',     blob: 'from-rose-400/60 dark:from-rose-500/40',     iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',     gradient: ['#fb7185', '#dc2626'], solidColor: '#f43f5e', text: 'text-rose-700 dark:text-rose-300',   sparkColor: '#f43f5e', ring: 'focus:ring-rose-300' },
}

function StatTile({
  icon, label, value, suffix, color, sparkData, trend, delay, onClick, ariaLabel, goal, narrative,
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
  /** Optional daily/period target — renders a thin progress bar under the number. */
  goal?: number
  /** Optional short auto-generated explanation of the trend (why it moved). */
  narrative?: string
}) {
  const animatedValue = useCountUp(value)
  const theme = tileThemes[color]
  const goalPct = goal && goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : null
  return (
    <button
      onClick={() => { h.tap(); onClick?.() }}
      aria-label={ariaLabel || label}
      style={{ animationDelay: `${delay}ms` }}
      className={`tile-in card-lift relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.bg} border border-slate-100 dark:border-slate-700 shadow-sm p-3 text-right group focus:outline-none focus:ring-4 ${theme.ring}`}
    >
      <div className={`absolute -top-6 -left-6 w-24 h-24 rounded-full bg-gradient-to-br ${theme.blob} to-transparent blur-xl pointer-events-none breathe-slow`} />
      <div className="relative flex items-center gap-2 mb-1.5">
        <ModuleIconBadge color={theme.solidColor} size={22}>
          {isValidElement(icon) ? cloneElement(icon as React.ReactElement<any>, { size: 20 }) : icon}
        </ModuleIconBadge>
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{label}</p>
      </div>
      <div className="relative flex items-baseline gap-1">
        <span className={`text-lg font-extrabold ${theme.text}`}>
          {toPersianDigits(formatNumber(animatedValue))}
        </span>
        {suffix && <span className="text-[10px] font-medium text-slate-400">{suffix}</span>}
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold mr-auto ${trend.up ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}`}>
            {trend.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend.value}
          </span>
        )}
      </div>
      {goalPct !== null && (
        <div className="relative mt-1.5">
          <div className="h-1 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${theme.iconBg} transition-all duration-700`} style={{ width: `${goalPct}%` }} />
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">{toPersianDigits(goalPct)}٪ از هدف {toPersianDigits(goal!)}</p>
        </div>
      )}
      {narrative && (
        <p className="relative text-[9px] text-slate-400 dark:text-slate-500 mt-1 truncate">{narrative}</p>
      )}
    </button>
  )
}

// ============================================================================
// Quick Action Button
// ============================================================================

function QuickAction({ icon, label, color, onClick, delay }: { icon: React.ReactNode; label: string; color: TileColor; onClick: () => void; delay: number }) {
  const theme = tileThemes[color]
  return (
    <button
      onClick={() => { h.select(); onClick() }}
      aria-label={label}
      style={{ animationDelay: `${delay}ms` }}
      className={`tile-in card-lift relative overflow-hidden flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gradient-to-br ${theme.bg} border border-slate-100 dark:border-slate-700 shadow-sm min-w-[76px] flex-1 focus:outline-none focus:ring-4 ${theme.ring}`}
    >
      <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-br ${theme.blob} to-transparent blur-xl pointer-events-none breathe-slow`} />
      <ModuleIconBadge color={theme.solidColor} size={30}>
        <div className="float-bounce">
          {isValidElement(icon) ? cloneElement(icon as React.ReactElement<any>, { size: 27 }) : icon}
        </div>
      </ModuleIconBadge>
      <span className={`relative text-[11px] font-bold ${theme.text}`}>{label}</span>
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
      className={`tile-in card-lift flex items-center gap-2 p-2.5 rounded-xl border ${color} text-right focus:outline-none focus:ring-4 focus:ring-error/20`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold opacity-80 truncate">{label}</p>
        <p className="text-sm font-extrabold truncate">{value}</p>
      </div>
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
      // Was `index * 60` — linear stagger meant a long appointment list
      // took proportionally longer to finish appearing (30 items = 1.8s
      // before the last one showed). staggerDelay() falls off
      // sub-linearly so the list stays responsive at any length, and
      // unlike the inline math it's unit-tested.
      style={{ animationDelay: `${staggerDelay(index)}ms` }}
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
  const { profile } = useAuth()
  // 'owner' is the default while login is disabled / no role is set yet,
  // so the dashboard behaves exactly as before until roles are assigned.
  const role = profile?.role || 'owner'

  // "برنامه مخصوص پزشک" — a doctor with a linked doctor_id sees their
  // own focused view (their schedule/patients/earnings) instead of the
  // clinic-wide admin dashboard below. Falls through to the normal
  // dashboard if a doctor account hasn't been linked to a doctors row
  // yet, rather than showing a broken/empty view.
  if (role === 'doctor' && profile?.doctor_id) {
    return <DoctorDashboard doctorId={profile.doctor_id} doctorName={profile.full_name || 'پزشک'} />
  }

  const roleGreeting: Record<string, string> = {
    owner: 'داشبورد مدیریت',
    doctor: 'داشبورد پزشک',
    receptionist: 'داشبورد پذیرش',
    assistant: 'داشبورد دستیار',
    lab: 'داشبورد لابراتوار',
    accountant: 'داشبورد مالی',
  }

  // ── State ──────────────────────────────────────────────────────

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [treatments, setTreatments] = useState<TreatmentWithRelations[]>([])
  const [implantCases, setImplantCases] = useState<ImplantCase[]>([])
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
  const [timeRange, setTimeRange] = useState<TimeRange>(() => (localStorage.getItem('minadent-dash-range') as TimeRange) || 'today')
  const [doctorFilter, setDoctorFilter] = useState<string>(() => localStorage.getItem('minadent-dash-doctor') || 'all')

  useEffect(() => { localStorage.setItem('minadent-dash-range', timeRange) }, [timeRange])
  useEffect(() => { localStorage.setItem('minadent-dash-doctor', doctorFilter) }, [doctorFilter])

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true)

  const [labOrdersState, setLabOrdersState] = useState<LabOrder[]>([])

  // ── Data Fetching ──────────────────────────────────────────────

  const loadData = useCallback(async (isRefresh = false, silent = false) => {
    if (isRefresh) { setRefreshing(true); if (!silent) h.tap() } else { setLoading(true) }
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Dashboard load timed out')), 15000))
      const [s, appts, pats, pays, encs, items, labOrders, waiting, docs, feed, insts, trts, implCases] = await Promise.race([
        Promise.all([
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
          fetchAllInstallments(),
          fetchTreatments(),
          fetchImplantCases(),
        ]),
        timeout,
      ]) as [DashboardStats, AppointmentWithRelations[], Patient[], Payment[], Encounter[], any[], any[], any[], Doctor[], any[], Installment[], TreatmentWithRelations[], ImplantCase[]]
      setStats(s); setAppointments(appts); setPatients(pats); setPayments(pays)
      setDoctors(docs); setActivity(feed as ActivityItem[])
      setEncounters(encs); setInstallments(insts)
      setTreatments(trts)
      setImplantCases(implCases)
      setLabOrdersState(labOrders as LabOrder[])
      const { totalOutstanding } = calcAllPatientBalances(pays, trts, implCases)
      setOutstandingBalance(totalOutstanding)
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
    const autoTimer = autoRefresh ? setInterval(() => loadData(true, true), 90000) : null
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

  // ── Smart reminders (birthdays, debtors, lapsed patients, due installments) ──
  const smartReminders = useMemo(() => {
    return {
      birthday: findBirthdays(patients),
      debtor: findDebtors(patients, treatments, payments, implantCases),
      lapsed: findLapsedPatients(patients, encounters),
      installment_due: findDueInstallments(installments, patients),
      no_show: findNoShows(appointments, patients),
      unresolved_appointment: findUnresolvedPastAppointments(appointments, patients),
      unfinished_treatment: findUnfinishedTreatmentFollowups(treatments, appointments, patients),
    }
  }, [patients, encounters, installments, treatments, appointments, implantCases])

  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)
  const handleSendReminderSms = async (reminder: SmartReminder) => {
    if (!reminder.patient.phone) { showToast('error', 'این بیمار شماره تلفن ثبت‌شده ندارد'); return }
    setSendingReminderId(reminder.patient.id + reminder.category)
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: { to: reminder.patient.phone, message: reminder.smsMessage, type: 'reminder' },
      })
      if (error) throw error
      showToast('success', 'پیامک ارسال شد')
    } catch (err) {
      console.error('SMS send error:', err)
      showToast('error', 'خطا در ارسال پیامک — تابع send-sms را بررسی کنید')
    } finally {
      setSendingReminderId(null)
    }
  }

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

  // ── KPI goal (daily appointment target) — simple localStorage-backed
  // target, editable inline. Only meaningful for the 'today' range.
  const [apptGoal, setApptGoal] = useState<number>(() => {
    const stored = localStorage.getItem('minadent-appt-goal')
    return stored ? Number(stored) : 15
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState(String(apptGoal))
  const saveGoal = () => {
    const n = Math.max(1, Number(goalDraft) || apptGoal)
    setApptGoal(n)
    localStorage.setItem('minadent-appt-goal', String(n))
    setEditingGoal(false)
  }

  // ── Auto-generated narrative context (rule-based "why did this move") ──
  const todayCancelledCount = useMemo(
    () => appointments.filter((a) => a.date === todayStr && a.status === 'cancelled').length,
    [appointments, todayStr],
  )
  const apptNarrative = timeRange === 'today' && todayCancelledCount > 0
    ? `${toPersianDigits(todayCancelledCount)} نوبت لغو شده`
    : undefined

  const revenueNarrative = useMemo(() => {
    if (filteredPayments.length === 0) return undefined
    const topMethod = Object.entries(
      filteredPayments.reduce<Record<string, number>>((acc, p) => {
        const m = p.payment_method || 'نامشخص'
        acc[m] = (acc[m] || 0) + (p.amount || 0)
        return acc
      }, {}),
    ).sort((a, b) => b[1] - a[1])[0]
    if (!topMethod) return undefined
    const pct = Math.round((topMethod[1] / currentRevenue) * 100)
    if (pct < 40) return undefined
    const methodLabel = { cash: 'نقدی', card: 'کارت', transfer: 'انتقال', cheque: 'چک', insurance: 'بیمه' }[topMethod[0]] || topMethod[0]
    return `عمدتاً از ${methodLabel} (${toPersianDigits(pct)}٪)`
  }, [filteredPayments, currentRevenue])

  // ── Drill-down panel (tap a stat tile → quick detail list instead of
  // a full navigation away from the dashboard) ──────────────────────
  const [drillDown, setDrillDown] = useState<'patients' | 'appointments' | 'revenue' | 'lab' | null>(null)
  const recentPaymentsForDrill = useMemo(
    () => [...filteredPayments].sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || '')).slice(0, 6),
    [filteredPayments],
  )
  const recentPatientsForDrill = useMemo(() => [...filteredPatients].slice(0, 6), [filteredPatients])
  const upcomingApptsForDrill = useMemo(() => [...filteredAppointments].sort((a, b) => a.start_time.localeCompare(b.start_time)).slice(0, 6), [filteredAppointments])

  // ── Notification center (aggregates every alert into one bell icon) ──
  const [notifCenterOpen, setNotifCenterOpen] = useState(false)
  const totalNotifCount =
    smartReminders.birthday.length + smartReminders.debtor.length + smartReminders.lapsed.length + smartReminders.installment_due.length + smartReminders.no_show.length + smartReminders.unfinished_treatment.length + smartReminders.unresolved_appointment.length +
    lowInventoryCount + overdueLabCount + waitingListCount

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

  const allQuickActions: { key: string; label: string; icon: React.ReactNode; color: TileColor; path: string }[] = [
    { key: 'appt',   label: 'نوبت جدید',   icon: <GlyphAppointments size={20} />, color: 'amber', path: '/appointments' },
    { key: 'patient',label: 'بیمار جدید',  icon: <GlyphPatients size={20} />,    color: 'violet', path: '/patients' },
    { key: 'implant',label: 'ایمپلنت',      icon: <GlyphImplants size={20} />,    color: 'sky',   path: '/implants' },
    { key: 'wait',   label: 'لیست انتظار', icon: <GlyphWaitingList size={20} />,    color: 'lime',  path: '/waiting-list' },
    { key: 'cash',   label: 'صندوق',        icon: <GlyphBilling size={20} />,   color: 'pink',  path: '/billing' },
    { key: 'inv',    label: 'موجودی',       icon: <GlyphInventory size={20} />,  color: 'rose',  path: '/inventory' },
  ]

  // Role-aware ordering: each role's most-used actions float to the front
  // (all six stay available — this only changes priority, never hides).
  const roleActionPriority: Record<string, string[]> = {
    doctor: ['appt', 'patient', 'wait', 'implant', 'cash', 'inv'],
    receptionist: ['patient', 'appt', 'wait', 'cash', 'implant', 'inv'],
    assistant: ['appt', 'wait', 'patient', 'implant', 'cash', 'inv'],
    lab: ['implant', 'appt', 'patient', 'wait', 'cash', 'inv'],
    accountant: ['cash', 'inv', 'appt', 'patient', 'wait', 'implant'],
    owner: ['appt', 'patient', 'implant', 'wait', 'cash', 'inv'],
  }
  const priority = roleActionPriority[role] || roleActionPriority.owner
  const [customOrder, setCustomOrder] = useState<string[] | null>(() => {
    const stored = localStorage.getItem('minadent-quickaction-order')
    return stored ? JSON.parse(stored) : null
  })
  const [editingLayout, setEditingLayout] = useState(false)
  const effectiveOrder = customOrder || priority
  const quickActions = [...allQuickActions].sort((a, b) => effectiveOrder.indexOf(a.key) - effectiveOrder.indexOf(b.key))
  const moveQuickAction = (key: string, dir: -1 | 1) => {
    const order = [...effectiveOrder]
    const idx = order.indexOf(key)
    const swapWith = idx + dir
    if (swapWith < 0 || swapWith >= order.length) return
    ;[order[idx], order[swapWith]] = [order[swapWith], order[idx]]
    setCustomOrder(order)
    localStorage.setItem('minadent-quickaction-order', JSON.stringify(order))
    h.tap()
  }

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
    <div ref={ptr.containerRef} className="space-y-3.5" aria-live="polite" {...ptr.handlers}>
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

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Doctor Filter */}
          {doctors.length > 0 && (
            <select
              value={doctorFilter}
              onChange={(e) => { h.tap(); setDoctorFilter(e.target.value) }}
              aria-label="فیلتر بر اساس پزشک"
              className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer max-w-[92px]"
            >
              <option value="all">همه پزشکان</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name || d.specialty || 'پزشک'}</option>
              ))}
            </select>
          )}

          {/* Auto-refresh toggle — icon only so it fits next to the time tabs on mobile */}
          <button
            onClick={() => { h.tap(); setAutoRefresh(!autoRefresh) }}
            aria-label={autoRefresh ? 'به‌روزرسانی خودکار فعال' : 'به‌روزرسانی خودکار غیرفعال'}
            aria-pressed={autoRefresh}
            title="به‌روزرسانی خودکار"
            className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all-smooth ${
              autoRefresh
                ? 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 border-success-200 dark:border-success-700'
                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap size={15} className={autoRefresh ? 'animate-pulse' : ''} />
          </button>

          {/* Manual Refresh */}
          <button
            onClick={handleRefresh}
            aria-label="به‌روزرسانی دستی"
            title="به‌روزرسانی دستی"
            disabled={refreshing}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all-smooth disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ═══ Compact Hero + Stats — single Bento block ═══════════════ */}
      <div
        className="tile-in relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm p-4"
        style={{ animationDelay: '50ms' }}
      >
        <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full bg-gradient-to-br from-violet-200/60 dark:from-violet-500/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-sky-200/50 dark:from-sky-500/15 to-transparent blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Building2 size={13} className="text-primary-500 shrink-0" />
              <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 truncate">کلینیک دندانپزشکی مینا</span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5 shrink-0">{roleGreeting[role] || roleGreeting.owner}</span>
            </div>
            <h1 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 truncate">
              {toJalaliStringPretty(todayStr)}
              {doctorFilter !== 'all' && (
                <span className="text-primary-500 text-sm font-medium mr-1.5">— {doctors.find((d) => d.id === doctorFilter)?.name || 'پزشک'}</span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 tabular-nums hidden sm:inline">
              {toPersianDigits(currentTime.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}
            </span>
            <button
              onClick={() => { h.tap(); setNotifCenterOpen(true) }}
              aria-label={`مرکز اعلان‌ها${totalNotifCount > 0 ? `، ${totalNotifCount} مورد` : ''}`}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all-smooth"
            >
              <Bell size={16} />
              {totalNotifCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {toPersianDigits(Math.min(totalNotifCount, 99))}
                </span>
              )}
            </button>
            <button
              onClick={() => { h.confirm(); navigate('/appointments') }}
              aria-label="نوبت جدید"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-l from-violet-600 to-sky-500 hover:opacity-90 text-white text-sm font-bold shadow-md transition-all-smooth press-scale focus:outline-none focus:ring-4 focus:ring-violet-300/40"
            >
              <Plus size={16} />
              نوبت جدید
            </button>
          </div>
        </div>

        {/* Stat tiles — compact 2x2/4x1 bento grid, part of the same block */}
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatTile
            icon={<GlyphPatients />}
            label="بیماران"
            value={currentPatientCount}
            color="violet"
            sparkData={patientSparkData}
            trend={patientChange !== 0 ? { value: `${toPersianDigits(Math.abs(patientChange))}٪`, up: patientChange >= 0 } : undefined}
            delay={100}
            onClick={() => setDrillDown('patients')}
            ariaLabel={`بیماران: ${currentPatientCount}، تغییر ${patientChange} درصد`}
          />
          <StatTile
            icon={<GlyphAppointments />}
            label="نوبت‌ها"
            value={currentApptCount}
            suffix={timeRange === 'today' ? `امروز` : ''}
            color="lime"
            sparkData={appointmentSparkData}
            trend={apptChange !== 0 ? { value: `${toPersianDigits(Math.abs(apptChange))}٪`, up: apptChange >= 0 } : undefined}
            delay={140}
            onClick={() => setDrillDown('appointments')}
            ariaLabel={`نوبت‌ها: ${currentApptCount}`}
            goal={timeRange === 'today' ? apptGoal : undefined}
            narrative={apptNarrative}
          />
          <StatTile
            icon={<GlyphBilling />}
            label="درآمد دوره"
            value={Math.round(currentRevenue / 1000000)}
            suffix="م ت"
            color="sky"
            sparkData={revenueSparkData.map((v) => Math.round(v / 1000000))}
            trend={revenueChange !== 0 ? { value: `${toPersianDigits(Math.abs(revenueChange))}٪`, up: revenueChange >= 0 } : undefined}
            delay={180}
            onClick={() => setDrillDown('revenue')}
            ariaLabel={`درآمد: ${formatCurrency(currentRevenue)} تومان`}
            narrative={revenueNarrative}
          />
          <StatTile
            icon={<GlyphLaboratory />}
            label="لابراتوار"
            value={stats?.activeLabOrders ?? 0}
            color="pink"
            sparkData={labSparkData}
            trend={{ value: `${toPersianDigits(overdueLabCount)} تأخیر`, up: overdueLabCount > 0 }}
            delay={220}
            onClick={() => setDrillDown('lab')}
            ariaLabel={`سفارش‌های فعال: ${stats?.activeLabOrders ?? 0}`}
          />
        </div>

        {timeRange === 'today' && (
          <div className="relative flex items-center justify-end mt-2.5">
            {editingGoal ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="number"
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <button onClick={saveGoal} className="text-[11px] font-bold text-primary-600 dark:text-primary-400">ذخیره</button>
              </div>
            ) : (
              <button
                onClick={() => { setGoalDraft(String(apptGoal)); setEditingGoal(true) }}
                className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors"
              >
                <Target size={11} />
                هدف روزانه نوبت: {toPersianDigits(apptGoal)} (ویرایش)
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ Quick Actions ══════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">دسترسی سریع</span>
        <button
          onClick={() => { h.tap(); setEditingLayout(!editingLayout) }}
          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all-smooth ${editingLayout ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-slate-400 dark:text-slate-500 hover:text-primary-500'}`}
        >
          <Settings2 size={12} />
          {editingLayout ? 'پایان چیدمان' : 'تنظیم چیدمان'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {quickActions.map((action, i) => (
          <div key={action.key} className="relative">
            <QuickAction
              icon={action.icon}
              label={action.label}
              color={action.color}
              onClick={() => { if (!editingLayout) navigate(action.path) }}
              delay={280 + i * 40}
            />
            {editingLayout && (
              <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); moveQuickAction(action.key, 1) }}
                  disabled={i === quickActions.length - 1}
                  aria-label="جابجایی به چپ"
                  className="pointer-events-auto w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveQuickAction(action.key, -1) }}
                  disabled={i === 0}
                  aria-label="جابجایی به راست"
                  className="pointer-events-auto w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft size={13} className="rotate-180" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═══ Alert Widgets ══════════════════════════════════════════ */}
      {(outstandingBalance > 0 || lowInventoryCount > 0 || overdueLabCount > 0 || waitingListCount > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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
          <Card className="p-4 tile-in">
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
          <Card className="p-4 tile-in">
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
            <ResponsiveContainer width="100%" height={190}>
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
        <Card className="p-4 tile-in">
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
            <ResponsiveContainer width="100%" height={190}>
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

      {/* ═══ Smart Reminders ════════════════════════════════════════ */}
      {(smartReminders.birthday.length + smartReminders.debtor.length + smartReminders.lapsed.length + smartReminders.installment_due.length) > 0 && (
        <Card className="p-4 tile-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                <Bell size={16} />
              </div>
              یادآوری‌های هوشمند امروز
            </h2>
          </div>
          <div className="space-y-4">
            {(Object.keys(REMINDER_CATEGORY_META) as (keyof typeof REMINDER_CATEGORY_META)[]).map((cat) => {
              const items = smartReminders[cat]
              if (items.length === 0) return null
              const meta = REMINDER_CATEGORY_META[cat]
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{meta.icon}</span>
                    <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">{meta.label}</h3>
                    <Badge color="slate">{toPersianDigits(items.length)}</Badge>
                  </div>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 -mr-1">
                    {items.slice(0, 10).map((r) => {
                      const key = r.patient.id + r.category
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all-smooth cursor-pointer"
                          onClick={() => cat === 'unresolved_appointment' ? navigate('/appointments') : navigate(`/patients/${r.patient.id}`)}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: meta.color }}>
                            {r.patient.first_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{r.detail}</p>
                          </div>
                          {r.smsMessage ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSendReminderSms(r) }}
                              disabled={sendingReminderId === key}
                              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[11px] font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all-smooth press-scale disabled:opacity-50"
                            >
                              {sendingReminderId === key ? '...' : 'ارسال پیامک'}
                            </button>
                          ) : (
                            <span className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                              بستن وضعیت
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ═══ Recent Patients + Activity Feed ════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Recent Patients */}
        <Card className="p-4 tile-in">
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
        <Card className="p-4 tile-in">
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

      {/* ═══ Drill-down panel — tap a stat tile for a quick preview
           instead of leaving the dashboard ═══════════════════════════ */}
      <Modal
        open={drillDown !== null}
        onClose={() => setDrillDown(null)}
        size="md"
        title={
          drillDown === 'patients' ? 'بیماران این دوره' :
          drillDown === 'appointments' ? 'نوبت‌های این دوره' :
          drillDown === 'revenue' ? 'پرداخت‌های اخیر' :
          'سفارش‌های لابراتوار فعال'
        }
      >
        {drillDown === 'patients' && (
          recentPatientsForDrill.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">بیماری در این بازه ثبت نشده</p> : (
            <div className="space-y-1.5">
              {recentPatientsForDrill.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setDrillDown(null); navigate(`/patients/${p.id}`) }}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{p.first_name[0]}</div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.first_name} {p.last_name}</p>
                </div>
              ))}
            </div>
          )
        )}
        {drillDown === 'appointments' && (
          upcomingApptsForDrill.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">نوبتی در این بازه نیست</p> : (
            <div className="space-y-1.5">
              {upcomingApptsForDrill.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setDrillDown(null); navigate('/appointments') }}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 tabular-nums">{toPersianDigits(a.start_time.slice(0, 5))}</div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{a.patient?.first_name} {a.patient?.last_name}</p>
                </div>
              ))}
            </div>
          )
        )}
        {drillDown === 'revenue' && (
          recentPaymentsForDrill.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">پرداختی در این بازه نیست</p> : (
            <div className="space-y-1.5">
              {recentPaymentsForDrill.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-sm font-bold text-sky-700 dark:text-sky-400">{formatCurrency(p.amount)} ت</span>
                  <span className="text-xs text-slate-400">{p.payment_date ? toJalaliStringPretty(p.payment_date) : '-'}</span>
                </div>
              ))}
            </div>
          )
        )}
        {drillDown === 'lab' && (
          labOrdersState.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length === 0 ? <p className="text-sm text-slate-400 text-center py-6">سفارش فعالی نیست</p> : (
            <div className="space-y-1.5">
              {labOrdersState.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setDrillDown(null); navigate('/laboratory') }}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center text-white shrink-0"><FlaskConical size={14} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{o.work_type || 'کار لابراتوار'}</p>
                    <p className="text-[11px] text-slate-400">{o.deadline ? toJalaliStringPretty(o.deadline) : 'بدون موعد'}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        <button
          onClick={() => {
            const path = drillDown === 'patients' ? '/patients' : drillDown === 'appointments' ? '/appointments' : drillDown === 'revenue' ? '/billing' : '/laboratory'
            setDrillDown(null)
            navigate(path)
          }}
          className="w-full mt-3 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-sm font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all-smooth"
        >
          مشاهده همه
        </button>
      </Modal>

      {/* ═══ Notification Center ═══════════════════════════════════════ */}
      <Modal open={notifCenterOpen} onClose={() => setNotifCenterOpen(false)} size="md" title="مرکز اعلان‌ها">
        {totalNotifCount === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">فعلاً هیچ هشداری نداری 🎉</p>
        ) : (
          <div className="space-y-2">
            {smartReminders.birthday.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/patients') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-right hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-all-smooth">
                <span className="text-lg">🎂</span>
                <span className="flex-1 text-sm font-semibold text-pink-700 dark:text-pink-300">تولد امروز</span>
                <Badge color="error">{toPersianDigits(smartReminders.birthday.length)}</Badge>
              </button>
            )}
            {smartReminders.debtor.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/billing') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-error-50 dark:bg-error-900/20 text-right hover:bg-error-100 dark:hover:bg-error-900/40 transition-all-smooth">
                <span className="text-lg">💰</span>
                <span className="flex-1 text-sm font-semibold text-error-700 dark:text-error-300">بدهکاران</span>
                <Badge color="error">{toPersianDigits(smartReminders.debtor.length)}</Badge>
              </button>
            )}
            {smartReminders.lapsed.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/patients') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-right hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all-smooth">
                <span className="text-lg">⏰</span>
                <span className="flex-1 text-sm font-semibold text-amber-700 dark:text-amber-300">مراجعه‌نکرده‌ها</span>
                <Badge color="warning">{toPersianDigits(smartReminders.lapsed.length)}</Badge>
              </button>
            )}
            {smartReminders.installment_due.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/billing') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-right hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all-smooth">
                <span className="text-lg">📅</span>
                <span className="flex-1 text-sm font-semibold text-violet-700 dark:text-violet-300">اقساط سررسید</span>
                <Badge color="secondary">{toPersianDigits(smartReminders.installment_due.length)}</Badge>
              </button>
            )}
            {smartReminders.no_show.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/appointments') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-right hover:bg-red-100 dark:hover:bg-red-900/40 transition-all-smooth">
                <span className="text-lg">🚫</span>
                <span className="flex-1 text-sm font-semibold text-red-700 dark:text-red-300">غیبت از نوبت (رزرو مجدد نشده)</span>
                <Badge color="error">{toPersianDigits(smartReminders.no_show.length)}</Badge>
              </button>
            )}
            {smartReminders.unresolved_appointment.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/appointments') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-700/40 text-right hover:bg-slate-200 dark:hover:bg-slate-700 transition-all-smooth">
                <span className="text-lg">❓</span>
                <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300">نوبت‌های بدون وضعیت نهایی</span>
                <Badge color="slate">{toPersianDigits(smartReminders.unresolved_appointment.length)}</Badge>
              </button>
            )}
            {smartReminders.unfinished_treatment.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/treatments') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 text-right hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-all-smooth">
                <span className="text-lg">🦷</span>
                <span className="flex-1 text-sm font-semibold text-cyan-700 dark:text-cyan-300">درمان ناتمام بدون نوبت بعدی</span>
                <Badge color="primary">{toPersianDigits(smartReminders.unfinished_treatment.length)}</Badge>
              </button>
            )}
            {lowInventoryCount > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/inventory') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-right hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all-smooth">
                <Package size={18} className="text-orange-600 dark:text-orange-400" />
                <span className="flex-1 text-sm font-semibold text-orange-700 dark:text-orange-300">موجودی رو به اتمام</span>
                <Badge color="warning">{toPersianDigits(lowInventoryCount)}</Badge>
              </button>
            )}
            {overdueLabCount > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/laboratory') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-900/20 text-right hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40 transition-all-smooth">
                <FlaskConical size={18} className="text-fuchsia-600 dark:text-fuchsia-400" />
                <span className="flex-1 text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">سفارش‌های عقب‌افتاده لابراتوار</span>
                <Badge color="error">{toPersianDigits(overdueLabCount)}</Badge>
              </button>
            )}
            {waitingListCount > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/waiting-list') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-right hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all-smooth">
                <Clock size={18} className="text-sky-600 dark:text-sky-400" />
                <span className="flex-1 text-sm font-semibold text-sky-700 dark:text-sky-300">لیست انتظار</span>
                <Badge color="primary">{toPersianDigits(waitingListCount)}</Badge>
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
    </ErrorBoundary>
  )
}
