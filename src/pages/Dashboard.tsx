// Dashboard.tsx — World-class Enterprise Persian RTL Dental Clinic Dashboard
// iOS 27 design • Dark mode • Time-range & doctor filters • Period comparison
// Auto-refresh • CSV export • Activity feed • Full accessibility • Responsive
import { useState, useEffect, useCallback, useMemo, useRef, cloneElement, isValidElement } from 'react'
import { subscribeSync, type SyncStatus } from '../lib/sync'
import { useDataRefresh } from '../lib/realtimeSync'
import { useNavigate } from 'react-router-dom'
import {
  Users, Calendar, DollarSign, FlaskConical, Plus, ArrowLeft, Activity,
  Clock, TrendingUp, TrendingDown, Smile, AlertTriangle, Package,
  ClipboardList, Wallet, Zap, ChevronLeft, ChevronDown, Timer, Moon, Sun, Target, Settings2,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles, Building2,
  RefreshCw, Download, FileText, Bell, AlertCircle, Banknote, CalendarClock, MessageSquare,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, Cell,
} from 'recharts'
import { ModuleIconBadge } from '../components/ModuleIconBadge'
import { GlyphPatients, GlyphAppointments, GlyphBilling, GlyphLaboratory, GlyphImplants, GlyphWaitingList, GlyphInventory, GlyphRoadmap } from '../components/ModuleGlyphs'
import {
  fetchDashboardStats, fetchAppointments, fetchPatients, fetchPayments,
  fetchEncounters, fetchInventoryItems, fetchLabOrders, fetchWaitingList,
  fetchActivityFeed, fetchDoctors, fetchAllInstallments, fetchTreatments, fetchImplantCases,
  fetchCheques,
} from '../lib/api'
import {
  toJalaliStringPretty, getJalaliMonthYear, formatCurrency, formatNumber,
  toPersianDigits, persianMonths, formatTime, jsDateToPersianWeekday,
} from '../lib/persianDate'
import type {
  AppointmentWithRelations, Patient, Payment, DashboardStats, Doctor, LabOrder,
  Encounter, Installment, TreatmentWithRelations, ImplantCase, Cheque,
} from '../types'
import { Card, Badge, EmptyState, showToast, Modal } from '../components/ui'
import { buildClinicalFollowUps, applyDismissals, snoozeUntil } from '../lib/followUps'
import type { Dismissal } from '../lib/followUps'
import { fetchTreatmentPhases } from '../lib/api'
import {
  findBirthdays, findDebtors, findLapsedPatients, findDueInstallments,
  findNoShows, findUnfinishedTreatmentFollowups, findUnresolvedPastAppointments,
  findDueCheques, findPendingImplantStages, findOverdueLabOrders,
  REMINDER_CATEGORY_META, type SmartReminder, type ReminderCategory,
} from '../lib/smartReminders'
import { findPostOpCheckups, findSutureRemovalReminders, findHygieneRecalls } from '../lib/patientRecallChurn'
import { calcAllPatientBalances } from '../lib/finance'
import { readyForDelivery, formatShelfLocation } from '../lib/labShelf'
import { toothLabel } from '../lib/toothLabel'
import { supabase } from '../lib/supabase'
import { getClinicSetting, setClinicSetting } from '../lib/clinicSettings'
import { useAuth } from '../lib/auth'
import DoctorDashboard from './DoctorDashboard'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { staggerDelay } from '../lib/motion'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { tileThemes, getHashColor, type TileColor } from '../lib/colors'

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
      className={`tile-in card-lift card-tactile-3d relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.bg} border border-slate-100 dark:border-slate-700 shadow-sm p-3 text-right group focus:outline-none focus:ring-4 ${theme.ring} press-scale`}
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
      {sparkData && sparkData.length > 1 && (
        <div className="relative mt-1.5 flex items-center justify-between pointer-events-none">
          <div className="opacity-70 group-hover:opacity-100 transition-opacity">
            <Sparkline data={sparkData} color={theme.solidColor} width={56} height={18} />
          </div>
        </div>
      )}
      {goalPct !== null && (
        <div className="relative mt-1.5">
          <div className="h-1 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${theme.iconBg} transition-all duration-700`} style={{ width: `${goalPct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-0.5 text-[9px] text-slate-400">
            <span>پیشرفت روزانه</span>
            <span>{toPersianDigits(goalPct)}٪</span>
          </div>
        </div>
      )}
      {narrative && (
        <p className="relative mt-1 text-[10px] text-slate-400 dark:text-slate-500 truncate">{narrative}</p>
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
      className={`tile-in card-lift card-tactile-3d relative overflow-hidden flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-gradient-to-br ${theme.bg} border-t border-t-white/80 dark:border-t-white/10 border border-slate-200/60 dark:border-slate-700 shadow-md shadow-slate-900/5 min-h-[66px] flex-1 focus:outline-none focus:ring-4 ${theme.ring} press-scale hover:-translate-y-0.5 active:translate-y-0.5 transition-all`}
    >
      <div className={`absolute -bottom-6 -left-6 w-16 h-16 rounded-full bg-gradient-to-br ${theme.blob} to-transparent blur-lg pointer-events-none opacity-40`} />
      <ModuleIconBadge color={theme.solidColor} size={28}>
        <div className="float-bounce">
          {isValidElement(icon) ? cloneElement(icon as React.ReactElement<any>, { size: 22 }) : icon}
        </div>
      </ModuleIconBadge>
      <span className={`relative text-[11px] font-extrabold ${theme.text} truncate max-w-full drop-shadow-xs`}>{label}</span>
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
      className={`tile-in card-lift card-tactile-3d group flex items-center gap-2.5 p-3 rounded-2xl border-t border-t-white/80 dark:border-t-white/10 border ${color} text-right focus:outline-none focus:ring-4 focus:ring-primary-400/20 w-full min-h-[58px] press-scale shadow-md shadow-slate-900/5 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0.5 transition-all-smooth`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 drop-shadow-sm">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold opacity-80 truncate">{label}</p>
        <p className="text-sm font-extrabold truncate tabular-nums">{value}</p>
      </div>
      <ChevronLeft size={15} className="opacity-40 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all shrink-0 mr-auto text-current" />
    </button>
  )
}

// ============================================================================
// Dynamic Color Helper
// ============================================================================

// ============================================================================

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
  const navigate = useNavigate()
  const statusColor = appointmentStatusColors[apt.status] || 'slate'
  const statusLabel = appointmentStatusLabels[apt.status] || apt.status
  const isCancelled = apt.status === 'cancelled' || apt.status === 'no_show'
  const isInChair = apt.status === 'in_chair'

  const pName = patientName(apt)
  const theme = tileThemes[getHashColor(pName + apt.id)]

  return (
    <div
      onClick={() => { h.tap(); onClick() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { h.tap(); onClick() } }}
      aria-label={`نوبت ${pName} ساعت ${formatTime(apt.start_time)}`}
      style={{ animationDelay: `${staggerDelay(index)}ms` }}
      className={`stagger-item relative overflow-hidden flex items-center gap-3 p-3 rounded-2xl transition-all-smooth cursor-pointer hover:shadow-md border border-slate-100 dark:border-slate-700 bg-gradient-to-br ${theme.bg} ${theme.ring} focus:outline-none focus:ring-4 ${isCancelled ? 'opacity-50 grayscale' : ''}`}
    >
      <div className={`absolute -top-6 -left-6 w-24 h-24 rounded-full bg-gradient-to-br ${theme.blob} to-transparent blur-xl pointer-events-none breathe-slow`} />
      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl ${theme.iconBg} text-white flex-shrink-0 shadow-sm relative z-10`}>
        <span className="text-xs font-bold">{formatTime(apt.start_time)}</span>
        {isInChair && <Timer size={12} className="text-white mt-0.5 animate-pulse" />}
      </div>
      <div className="min-w-0 flex-1 relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              h.tap()
              if (apt.patient_id) navigate(`/patients/${apt.patient_id}`)
            }}
            title="مشاهده پرونده کامل بیمار"
            className="text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 hover:underline text-right cursor-pointer"
          >
            {pName}
          </button>
          {apt.patient?.file_number && (
            <button
              type="button"
              onClick={() => {
                h.tap()
                if (apt.patient_id) navigate(`/patients/${apt.patient_id}`)
              }}
              title="شماره پرونده بیمار"
              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-900 dark:bg-primary-950 text-white dark:text-primary-300 text-[10px] font-mono font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
              dir="ltr"
            >
              <span>{toPersianDigits(apt.patient.file_number)}</span>
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{doctorName(apt)}</p>
      </div>
      <div className="relative z-10">
        <Badge color={statusColor}>{statusLabel}</Badge>
      </div>
    </div>
  )
}

// ============================================================================
// Recent Patient Row
// ============================================================================

function PatientRow({ patient, index, onClick }: { patient: Patient; index: number; onClick: () => void }) {
  const initials = toPersianDigits(patient.first_name?.charAt(0) || '؟')
  const theme = tileThemes[getHashColor(patient.id)]
  return (
    <div
      onClick={() => { h.tap(); onClick() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { h.tap(); onClick() } }}
      aria-label={`بیمار ${patient.first_name} ${patient.last_name}`}
      style={{ animationDelay: `${index * 50}ms` }}
      className={`stagger-item relative overflow-hidden flex items-center gap-3 p-2.5 rounded-xl transition-all-smooth cursor-pointer hover:shadow-md border border-slate-100 dark:border-slate-700 bg-gradient-to-br ${theme.bg} ${theme.ring} focus:outline-none focus:ring-4`}
    >
      <div className={`absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${theme.blob} to-transparent blur-xl pointer-events-none breathe-slow`} />
      <div className={`w-10 h-10 rounded-full ${theme.iconBg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm relative z-10`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{patient.first_name} {patient.last_name}</p>
          {patient.file_number && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-900 dark:bg-primary-950 text-white dark:text-primary-300 text-[10px] font-mono font-bold" dir="ltr">
              <FileText size={9} className="text-primary-400" />
              <span>{toPersianDigits(patient.file_number)}</span>
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{patient.phone ? toPersianDigits(patient.phone) : 'بدون تلفن'}</p>
      </div>
      {patient.vip_level && patient.vip_level > 0 && (
        <span className="relative z-10 flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-100/80 dark:bg-amber-900/40 dark:text-amber-400 rounded-full px-2 py-0.5">
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

const activityThemeColor: Record<string, TileColor> = {
  patient_created: 'sky',
  appointment_scheduled: 'violet',
  payment_received: 'lime',
  treatment_completed: 'pink',
  prescription_created: 'amber',
  lab_order_created: 'rose',
}

function ActivityRow({ item, index, onClick }: { item: ActivityItem; index: number; onClick: () => void }) {
  const config = activityIcons[item.event_type] || activityIcons.default
  const colorKey = activityThemeColor[item.event_type] || getHashColor(item.id)
  const theme = tileThemes[colorKey]

  return (
    <div
      onClick={() => { h.tap(); onClick() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { h.tap(); onClick() } }}
      style={{ animationDelay: `${index * 40}ms` }}
      className={`stagger-item relative overflow-hidden flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md border border-slate-100 dark:border-slate-700 bg-gradient-to-br ${theme.bg} ${theme.ring} focus:outline-none focus:ring-4 group`}
    >
      <div className={`absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${theme.blob} to-transparent blur-xl pointer-events-none breathe-slow opacity-40 group-hover:opacity-70 transition-opacity duration-700`} />
      
      <div className={`w-8 h-8 rounded-lg ${theme.iconBg} flex items-center justify-center flex-shrink-0 text-white shadow-inner relative z-10`}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.title || item.event_type}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
          {item.patient_name && <span className="font-extrabold">{item.patient_name} — </span>}
          {item.description}
        </p>
      </div>
      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex-shrink-0 relative z-10 mt-1">
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
  const [expiredInventoryCount, setExpiredInventoryCount] = useState(0)
  const [overdueLabCount, setOverdueLabCount] = useState(0)
  const [readyLabCount, setReadyLabCount] = useState(0)
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

  // Auto-refresh & view collapses
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [chartsExpanded, setChartsExpanded] = useState(false)
  const [todayApptsExpanded, setTodayApptsExpanded] = useState(false)
  const [remindersExpanded, setRemindersExpanded] = useState(false)
  const [hubTab, setHubTab] = useState<'alerts' | 'analytics' | 'activity'>('alerts')

  const [labOrdersState, setLabOrdersState] = useState<LabOrder[]>([])
  const [chequesState, setChequesState] = useState<Cheque[]>([])

  // ── Data Fetching ──────────────────────────────────────────────

  const loadData = useCallback(async (isRefresh = false, silent = false) => {
    if (isRefresh) { setRefreshing(true); if (!silent) h.tap() } else { setLoading(true) }
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Dashboard load timed out')), 15000))
      const [s, appts, pats, pays, encs, items, labOrders, waiting, docs, feed, insts, trts, implCases, chqs] = await Promise.race([
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
          fetchCheques(),
        ]),
        timeout,
      ]) as [DashboardStats, AppointmentWithRelations[], Patient[], Payment[], Encounter[], any[], any[], any[], Doctor[], any[], Installment[], TreatmentWithRelations[], ImplantCase[], Cheque[]]
      setStats(s); setAppointments(appts); setPatients(pats); setPayments(pays)
      setDoctors(docs); setActivity(feed as ActivityItem[])
      setEncounters(encs); setInstallments(insts)
      setTreatments(trts)
      setImplantCases(implCases)
      setChequesState(chqs || [])
      // Loaded for the clinical follow-up list; failure here must not
      // take the dashboard down with it.
      fetchTreatmentPhases().then(setPhasesState).catch(() => setPhasesState([]))
      setLabOrdersState(labOrders as LabOrder[])
      const { totalOutstanding } = calcAllPatientBalances(pays, trts, implCases)
      setOutstandingBalance(totalOutstanding)
      setLowInventoryCount(items.filter((i: any) => (i.quantity ?? 0) <= (i.min_quantity ?? 0) && i.is_active !== false).length)
      const today = new Date().toISOString().slice(0, 10)
      setExpiredInventoryCount(items.filter((i: any) => i.expiry_date && i.expiry_date < today && i.is_active !== false).length)
      setOverdueLabCount(labOrders.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled' && o.deadline && o.deadline < today).length)
      setReadyLabCount(readyForDelivery(labOrders as LabOrder[]).length)
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

  /**
   * MOD-FIX-021 | داشبورد بعد از همگام‌سازی تازه می‌شود
   *
   * گزارش مهدی: «در داشبورد زنده مانده ۵ میلیون ولی داخل مالی بدهی
   * نداریم.»
   *
   * Both pages call the same calcAllPatientBalances on the same tables.
   * The dashboard loaded once at mount and then every 90 seconds if
   * auto-refresh was on — so after a payment was cancelled elsewhere and
   * synced down, the dashboard kept the morning's figure until the timer
   * fired, or forever with auto-refresh off. Billing, opened later, read
   * fresh data. Two screens, two truths, one database.
   *
   * A sync completing is the one moment the local data is known to have
   * changed, so it is the right trigger. Silent: the person did not ask
   * for a refresh and should not see a spinner for one.
   */
  useEffect(() => {
    let last: SyncStatus | null = null
    const unsub = subscribeSync((status) => {
      // Fire on the transition into a settled state, not on every tick.
      if (last === 'syncing' && status !== 'syncing') loadData(true, true)
      last = status
    })
    return unsub
  }, [loadData])

  // Instant refresh on cross-device and multi-tab live updates
  useDataRefresh(['appointments', 'patients', 'treatments', 'payments', 'encounters', 'lab_orders'], () => loadData(true, true))

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

  // ── Smart reminders (birthdays, debtors, lapsed patients, due installments, cheques, implants, labs) ──
  const smartReminders = useMemo(() => {
    return {
      cheque_due: findDueCheques(chequesState, patients),
      installment_due: findDueInstallments(installments, patients),
      lab_overdue: findOverdueLabOrders(labOrdersState, patients),
      implant_stage_due: findPendingImplantStages(implantCases, patients),
      birthday: findBirthdays(patients),
      debtor: findDebtors(patients, treatments, payments, implantCases),
      lapsed: findLapsedPatients(patients, encounters),
      no_show: findNoShows(appointments, patients),
      unresolved_appointment: findUnresolvedPastAppointments(appointments, patients),
      unfinished_treatment: findUnfinishedTreatmentFollowups(treatments, appointments, patients),
      post_op_checkup: findPostOpCheckups(treatments as any, patients, todayStr),
      suture_removal: findSutureRemovalReminders(treatments as any, patients, appointments as any, todayStr),
      hygiene_recall: findHygieneRecalls(patients, encounters, appointments as any, 180, todayStr),
    }
  }, [patients, encounters, installments, treatments, appointments, implantCases, chequesState, labOrdersState, todayStr])

  // ── Clinical follow-ups ──────────────────────────────────────
  // smartReminders covers the patient-facing side. Nothing covered the
  // clinical side: a crown three weeks late at the lab, an implant that
  // has not moved since spring, a phase a month past its estimate. That
  // is work the clinic loses money and trust on, and it appeared nowhere.
  const [phasesState, setPhasesState] = useState<any[]>([])

  // Snoozes live in localStorage rather than a new table. Adding one to
  // TABLE_NAMES ahead of its migration is what broke the sync loop once
  // before, and a "I called them" note is per-device UI state, not a
  // clinical record.
  const [dismissals, setDismissals] = useState<Dismissal[]>(() => {
    try { return JSON.parse(localStorage.getItem('followup-snoozes') || '[]') } catch { return [] }
  })

  const clinicalFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const all = buildClinicalFollowUps(labOrdersState as any, implantCases as any, phasesState, today)
    return applyDismissals(all, dismissals, today)
  }, [labOrdersState, implantCases, phasesState, dismissals])

  const handleSnooze = (key: string, days: number) => {
    h.tap()
    chimes.playPop()
    const today = new Date().toISOString().slice(0, 10)
    // Keep only live snoozes, so the stored list cannot grow for ever.
    const next = [
      ...clinicalFollowUps.liveDismissals.filter((d) => d.key !== key),
      { key, until: snoozeUntil(today, days) },
    ]
    setDismissals(next)
    try { localStorage.setItem('followup-snoozes', JSON.stringify(next)) } catch { /* private mode */ }
    showToast('success', `${days} روز بعد دوباره یادآوری می‌شود`)
  }

  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)
  const handleSendReminderSms = async (reminder: SmartReminder) => {
    if (!reminder.patient.phone) { chimes.playWarning(); showToast('error', 'این بیمار شماره تلفن ثبت‌شده ندارد'); return }
    setSendingReminderId(reminder.patient.id + reminder.category)
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: { to: reminder.patient.phone, message: reminder.smsMessage, type: 'reminder' },
      })
      if (error) throw error
      chimes.playSuccess()
      showToast('success', 'پیامک یادآوری ارسال شد')
    } catch (err) {
      console.error('SMS send error:', err)
      chimes.playWarning()
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

  // ── KPI goal (daily appointment target) ──
  // Clinic-wide setting — synced across devices via Supabase.
  // Falls back to localStorage / default of 15 while loading.
  const [apptGoal, setApptGoalState] = useState<number>(15)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState('15')

  // Load from Supabase on mount
  useEffect(() => {
    getClinicSetting<{ value: number }>('appt_goal').then((stored) => {
      const n = stored?.value ?? 15
      setApptGoalState(n)
      setGoalDraft(String(n))
    })
  }, [])

  const saveGoal = () => {
    const n = Math.max(1, Number(goalDraft) || apptGoal)
    setApptGoalState(n)
    setClinicSetting('appt_goal', { value: n })
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

  // ── Drill-down panel (tap a stat tile or operational capsule → quick detail list instead of
  // a full navigation away from the dashboard) ──────────────────────
  type DrillDownType =
    | 'patients'
    | 'appointments'
    | 'revenue'
    | 'lab'
    | 'cheques'
    | 'implants'
    | 'debtors'
    | 'ready_lab'
    | 'overdue_lab'
    | 'installments'
    | null

  const [drillDown, setDrillDown] = useState<DrillDownType>(null)
  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  const recentPaymentsForDrill = useMemo(
    () => [...filteredPayments].sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || '')).slice(0, 6),
    [filteredPayments],
  )
  const recentPatientsForDrill = useMemo(() => [...filteredPatients].slice(0, 6), [filteredPatients])
  const upcomingApptsForDrill = useMemo(() => [...filteredAppointments].sort((a, b) => a.start_time.localeCompare(b.start_time)).slice(0, 6), [filteredAppointments])
  const readyLabOrdersForDrill = useMemo(() => readyForDelivery(labOrdersState), [labOrdersState])
  const overdueLabOrdersForDrill = useMemo(
    () => labOrdersState.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled' && o.deadline && o.deadline < todayStr),
    [labOrdersState, todayStr],
  )

  // ── Notification center (aggregates every alert into one bell icon) ──
  const [notifCenterOpen, setNotifCenterOpen] = useState(false)
  const totalNotifCount =
    smartReminders.birthday.length +
    smartReminders.debtor.length +
    smartReminders.lapsed.length +
    smartReminders.installment_due.length +
    smartReminders.cheque_due.length +
    smartReminders.implant_stage_due.length +
    smartReminders.lab_overdue.length +
    smartReminders.no_show.length +
    smartReminders.unfinished_treatment.length +
    smartReminders.unresolved_appointment.length +
    smartReminders.post_op_checkup.length +
    smartReminders.suture_removal.length +
    smartReminders.hygiene_recall.length +
    lowInventoryCount +
    expiredInventoryCount +
    overdueLabCount +
    readyLabCount +
    waitingListCount

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

  const handleRefresh = useCallback(() => {
    chimes.playPop()
    loadData(true)
  }, [loadData])

  const ptr = usePullToRefresh(async () => { await loadData(true) })

  const handleExportRevenue = () => {
    h.confirm()
    chimes.playSuccess()
    exportCSV(
      `درآمد-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['بازه', 'درآمد (تومان)'],
      revenueChartData.map((d) => [d.label, d.revenue]),
    )
    showToast('success', 'خروجی CSV دریافت شد')
  }

  const handleExportAppointments = () => {
    h.confirm()
    chimes.playSuccess()
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
    { key: 'cash',   label: 'صندوق',        icon: <GlyphBilling size={20} />,   color: 'pink',  path: '/billing' },
    { key: 'lab',    label: 'لابراتوار',    icon: <GlyphLaboratory size={20} />, color: 'violet', path: '/laboratory' },
    { key: 'implant',label: 'ایمپلنت',      icon: <GlyphImplants size={20} />,    color: 'sky',   path: '/implants' },
    { key: 'wait',   label: 'لیست انتظار', icon: <GlyphWaitingList size={20} />,    color: 'lime',  path: '/waiting-list' },
    { key: 'inv',    label: 'موجودی',       icon: <GlyphInventory size={20} />,  color: 'rose',  path: '/inventory' },
  ]

  // Role-aware ordering: each role's most-used actions float to the front
  // (all stay available — this only changes priority, never hides).
  const roleActionPriority: Record<string, string[]> = {
    doctor: ['appt', 'patient', 'lab', 'wait', 'implant', 'cash', 'inv'],
    receptionist: ['patient', 'appt', 'wait', 'cash', 'lab', 'implant', 'inv'],
    assistant: ['appt', 'wait', 'patient', 'lab', 'implant', 'cash', 'inv'],
    lab: ['lab', 'implant', 'appt', 'patient', 'wait', 'cash', 'inv'],
    accountant: ['cash', 'inv', 'appt', 'patient', 'wait', 'lab', 'implant'],
    owner: ['appt', 'patient', 'cash', 'lab', 'implant', 'wait', 'inv'],
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
      {/* ═══ Clean 1-Row Executive Header ══════════════ */}
      <div className="tile-in flex items-center justify-between gap-2 p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 shadow-md shadow-slate-900/5" style={{ animationDelay: '0ms' }}>
        {/* Right: Clinic Title + Jalali Date Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-purple-500/25 border-t border-white/40 shrink-0">
            <Building2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">مینادنتال</span>
              <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/50 rounded-full px-2 py-0.5 shrink-0">
                {roleGreeting[role] || roleGreeting.owner}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => { h.tap(); navigate('/appointments') }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50/80 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/60 border border-violet-200/60 dark:border-violet-800/50 rounded-lg px-2 py-0.5 shadow-2xs transition-all press-scale cursor-pointer"
                title="مشاهده تقویم و نوبت‌ها"
              >
                <Calendar size={11} className="text-violet-500 shrink-0" />
                <span>{toJalaliStringPretty(todayStr)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center / Left: Inline Doctor Filter + Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {doctors.length > 0 && (
            <select
              value={doctorFilter}
              onChange={(e) => { h.tap(); setDoctorFilter(e.target.value) }}
              aria-label="فیلتر پزشک"
              className="hidden sm:block min-h-[44px] px-2.5 py-2 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-primary-400 cursor-pointer max-w-[110px]"
            >
              <option value="all">همه پزشکان</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name || d.specialty || 'پزشک'}</option>
              ))}
            </select>
          )}

          {/* Refresh Button - Vibrant Emerald / Teal 3D Gradient */}
          <button
            onClick={handleRefresh}
            aria-label="به‌روزرسانی"
            title="به‌روزرسانی داده‌ها"
            disabled={refreshing}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 border-t border-t-white/40 border border-emerald-400/30 hover:brightness-110 active:scale-95 transition-all press-scale disabled:opacity-50"
          >
            <RefreshCw size={17} className={`drop-shadow-xs ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Notifications Bell - Vibrant Amber / Orange 3D Gradient */}
          <button
            onClick={() => { h.tap(); setNotifCenterOpen(true) }}
            aria-label={`مرکز اعلان‌ها${totalNotifCount > 0 ? `، ${totalNotifCount} مورد` : ''}`}
            className="relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/25 border-t border-t-white/40 border border-amber-400/30 hover:brightness-110 active:scale-95 transition-all press-scale"
          >
            <Bell size={18} className="drop-shadow-xs" />
            {totalNotifCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm animate-pulse">
                {toPersianDigits(Math.min(totalNotifCount, 99))}
              </span>
            )}
          </button>

          {/* New Appointment CTA */}
          <button
            onClick={() => { h.confirm(); navigate('/appointments') }}
            aria-label="نوبت جدید"
            className="flex items-center justify-center gap-1.5 min-h-[48px] min-w-[48px] px-3.5 sm:px-4 py-2.5 rounded-xl bg-gradient-to-l from-primary-600 to-violet-600 text-white text-xs font-bold btn-tactile-3d shadow-md shadow-primary-600/25 border-t border-white/40 hover:opacity-95 active:scale-95 transition-all shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">نوبت جدید</span>
          </button>
        </div>
      </div>

      {/* ═══ Compact 4-Tile Stat Bento Grid ═══════════════ */}
      <div
        className="tile-in card-tactile-3d relative overflow-hidden rounded-3xl bg-white/85 dark:bg-slate-800/85 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 shadow-xs p-3"
        style={{ animationDelay: '40ms' }}
      >

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
      </div>

      {/* ═══ Today's Appointments (Interactive Collapsible Card) ═════════════ */}
      <Card className="p-3.5 sm:p-4 tile-in card-tactile-3d relative overflow-hidden bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xs border border-slate-200/60 dark:border-slate-700/60">
        <div
          onClick={() => { h.tap(); setTodayApptsExpanded(!todayApptsExpanded) }}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 text-primary-600 dark:text-primary-400 drop-shadow-md transform hover:scale-105 transition-transform">
              <GlyphAppointments size={34} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">نوبت‌های امروز</h2>
                <span className="text-xs font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-full px-2 py-0.5">
                  {toPersianDigits(todayAppointments.length)} نوبت
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {todayAppointments.filter(a => a.status === 'in_chair').length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold ml-1.5">
                    {toPersianDigits(todayAppointments.filter(a => a.status === 'in_chair').length)} روی صندلی
                  </span>
                )}
                {todayAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length > 0 && (
                  <span className="text-sky-600 dark:text-sky-400 font-bold ml-1.5">
                    {toPersianDigits(todayAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length)} در انتظار
                  </span>
                )}
                {todayAppointments.filter(a => a.status === 'completed').length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {toPersianDigits(todayAppointments.filter(a => a.status === 'completed').length)} تکمیل شده
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleExportAppointments() }}
              aria-label="خروجی CSV"
              className="text-xs text-slate-400 hover:text-primary-500 font-medium hidden sm:flex items-center gap-1"
            >
              <Download size={13} />
              CSV
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate('/appointments') }}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-bold flex items-center gap-0.5 px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/40"
            >
              <span>تقویم</span>
              <ArrowLeft size={13} />
            </button>
            <div className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-transform duration-200 ${todayApptsExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {todayApptsExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 animate-in fade-in duration-200">
            {todayAppointments.length === 0 ? (
              <EmptyState
                icon={<Calendar size={28} />}
                title="نوبتی برای امروز ثبت نشده است"
                description="می‌توانید نوبت جدید ایجاد کنید"
              />
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 -mr-1">
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
          </div>
        )}
      </Card>

      {/* ═══ Quick Actions ══════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">دسترسی سریع</span>
          <button
            onClick={() => { h.tap(); setEditingLayout(!editingLayout) }}
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all-smooth ${editingLayout ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-slate-400 dark:text-slate-500 hover:text-primary-500'}`}
          >
            <Settings2 size={12} />
            {editingLayout ? 'پایان چیدمان' : 'تنظیم چیدمان'}
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
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
      </div>

      {/* ═══ Smart Hub Segmented Controls (3 Distinct Visual Color Themes) ═══ */}
      <div className="tile-in grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs my-1">
        {/* Tab 1: هشدارهای کلینیک — Vibrant Amber / Orange */}
        <button
          type="button"
          onClick={() => { h.tap(); chimes.playPop(); setHubTab('alerts') }}
          className={`flex items-center justify-center gap-1.5 min-h-[42px] py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all press-scale ${
            hubTab === 'alerts'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/25 border-t border-white/30'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
          }`}
        >
          <Bell size={15} />
          <span>هشدارهای کلینیک</span>
          {totalNotifCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              hubTab === 'alerts'
                ? 'bg-white/25 text-white'
                : 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
            }`}>
              {toPersianDigits(totalNotifCount)}
            </span>
          )}
        </button>

        {/* Tab 2: نمودارها و مالی — Vibrant Emerald / Green */}
        <button
          type="button"
          onClick={() => { h.tap(); chimes.playPop(); setHubTab('analytics') }}
          className={`flex items-center justify-center gap-1.5 min-h-[42px] py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all press-scale ${
            hubTab === 'analytics'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 border-t border-white/30'
              : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20'
          }`}
        >
          <TrendingUp size={15} />
          <span>نمودارها و مالی</span>
        </button>

        {/* Tab 3: مراجعات و لاگ — Vibrant Sky / Indigo */}
        <button
          type="button"
          onClick={() => { h.tap(); chimes.playPop(); setHubTab('activity') }}
          className={`flex items-center justify-center gap-1.5 min-h-[42px] py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all press-scale ${
            hubTab === 'activity'
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25 border-t border-white/30'
              : 'bg-sky-500/10 text-sky-800 dark:text-sky-300 hover:bg-sky-500/20 border border-sky-500/20'
          }`}
        >
          <Activity size={15} />
          <span>مراجعات و لاگ</span>
        </button>
      </div>

      {/* ═══ Tab 1: هشدارهای کلینیک و یادآوری‌ها ══════════════════════════ */}
      {hubTab === 'alerts' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Operational Action Rail (Permanently Visible) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">کپسول‌های اقدام و پایش عملیاتی</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* 1. چک‌های سررسید و برگشتی */}
              <AlertWidget
                icon={<div className="w-full h-full rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-2xs"><Banknote size={22} /></div>}
                label="چک‌های سررسید و برگشتی"
                value={smartReminders.cheque_due.length > 0 ? `${toPersianDigits(smartReminders.cheque_due.length)} فقره` : '۰ فقره'}
                color={smartReminders.cheque_due.length > 0 ? "border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300" : "border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"}
                onClick={() => setDrillDown('cheques')}
                delay={440}
              />

              {/* 2. ایمپلنت‌های آماده اقدام */}
              <AlertWidget
                icon={<div className="w-full h-full rounded-xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-2xs"><GlyphImplants size={22} /></div>}
                label="ایمپلنت‌های آماده اقدام"
                value={smartReminders.implant_stage_due.length > 0 ? `${toPersianDigits(smartReminders.implant_stage_due.length)} مورد` : '۰ مورد'}
                color={smartReminders.implant_stage_due.length > 0 ? "border-cyan-200 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300" : "border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"}
                onClick={() => setDrillDown('implants')}
                delay={480}
              />

              {/* 3. مانده بدهی بیماران */}
              <AlertWidget
                icon={<div className="w-full h-full rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs"><Wallet size={22} /></div>}
                label="مانده بدهی بیماران"
                value={outstandingBalance > 0 ? `${formatCurrency(outstandingBalance)} ت` : 'تسویه کامل'}
                color={outstandingBalance > 0 ? "border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300" : "border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"}
                onClick={() => setDrillDown('debtors')}
                delay={520}
              />

              {/* 4. سفارش تأخیر یافته */}
              <AlertWidget
                icon={<div className="w-full h-full rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-2xs"><AlertTriangle size={22} /></div>}
                label="سفارش تأخیر یافته"
                value={overdueLabCount > 0 ? `${toPersianDigits(overdueLabCount)} مورد` : 'بدون تأخیر'}
                color={overdueLabCount > 0 ? "border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300" : "border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"}
                onClick={() => setDrillDown('overdue_lab')}
                delay={560}
              />

              {/* 5. لابراتوار آماده تحویل */}
              <AlertWidget
                icon={<div className="w-full h-full rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs"><GlyphLaboratory size={22} /></div>}
                label="لابراتوار آماده تحویل"
                value={readyLabCount > 0 ? `${toPersianDigits(readyLabCount)} مورد` : '۰ مورد'}
                color={readyLabCount > 0 ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300" : "border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"}
                onClick={() => setDrillDown('ready_lab')}
                delay={600}
              />

              {/* 6. اقساط سررسید شده */}
              <AlertWidget
                icon={<div className="w-full h-full rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-2xs"><CalendarClock size={22} /></div>}
                label="اقساط سررسید شده"
                value={smartReminders.installment_due.length > 0 ? `${toPersianDigits(smartReminders.installment_due.length)} قسط` : '۰ قسط'}
                color={smartReminders.installment_due.length > 0 ? "border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300" : "border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"}
                onClick={() => setDrillDown('installments')}
                delay={640}
              />

              {/* Secondary alerts if active */}
              {lowInventoryCount > 0 && (
                <AlertWidget
                  icon={<div className="w-full h-full rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400"><Package size={20} /></div>}
                  label="موجودی رو به اتمام"
                  value={`${toPersianDigits(lowInventoryCount)} مورد`}
                  color="border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
                  onClick={() => navigate('/inventory')}
                  delay={680}
                />
              )}
              {expiredInventoryCount > 0 && (
                <AlertWidget
                  icon={<div className="w-full h-full rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400"><Clock size={20} /></div>}
                  label="کالای تاریخ‌گذشته"
                  value={`${toPersianDigits(expiredInventoryCount)} مورد`}
                  color="border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300"
                  onClick={() => navigate('/inventory')}
                  delay={700}
                />
              )}
              {waitingListCount > 0 && (
                <AlertWidget
                  icon={<div className="w-full h-full rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400"><ClipboardList size={20} /></div>}
                  label="لیست انتظار"
                  value={`${toPersianDigits(waitingListCount)} نفر`}
                  color="border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300"
                  onClick={() => navigate('/waiting-list')}
                  delay={720}
                />
              )}
            </div>
          </div>

          {/* Clinical follow-ups */}
          {clinicalFollowUps.visible.length > 0 && (
            <Card className="p-4 tile-in">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white">
                    <AlertCircle size={16} />
                  </div>
                  کارهای معطل‌مانده
                  <span className="text-xs font-normal text-slate-400">
                    ({toPersianDigits(clinicalFollowUps.visible.length)})
                  </span>
                </h2>
                {clinicalFollowUps.hiddenCount > 0 && (
                  <span className="text-[11px] text-slate-400">
                    {toPersianDigits(clinicalFollowUps.hiddenCount)} مورد به تعویق افتاده
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {clinicalFollowUps.visible.slice(0, 8).map((f) => {
                  const patient = patients.find((p) => p.id === f.patientId)
                  const tone = f.kind === 'lab_overdue' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50'
                    : f.kind === 'implant_stalled' ? 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800/50'
                    : 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50'
                  return (
                    <div key={f.key} className={`flex items-center gap-3 p-2.5 rounded-xl border ${tone}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {f.title}
                          {patient && <span className="font-normal text-slate-500 dark:text-slate-400"> — {patient.first_name} {patient.last_name}</span>}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{toPersianDigits(f.detail)}</p>
                      </div>
                      <button
                        onClick={() => handleSnooze(f.key, 3)}
                        className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-white dark:hover:bg-slate-700 transition-all press-scale"
                      >
                        پیگیری شد
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Smart Reminders */}
          {(smartReminders.birthday.length +
            smartReminders.debtor.length +
            smartReminders.lapsed.length +
            smartReminders.installment_due.length +
            smartReminders.cheque_due.length +
            smartReminders.implant_stage_due.length +
            smartReminders.lab_overdue.length +
            smartReminders.no_show.length +
            smartReminders.unfinished_treatment.length +
            smartReminders.unresolved_appointment.length) > 0 && (
            <Card className="p-3.5 sm:p-4 tile-in relative overflow-hidden bg-white/95 dark:bg-slate-800/95 shadow-xs border border-slate-200/60 dark:border-slate-700/60">
              <div
                onClick={() => { h.tap(); setRemindersExpanded(!remindersExpanded) }}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-xs shrink-0">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      یادآوری‌ها و پیگیری بیماران
                      <Badge color="warning">{toPersianDigits(
                        smartReminders.birthday.length +
                        smartReminders.debtor.length +
                        smartReminders.lapsed.length +
                        smartReminders.installment_due.length +
                        smartReminders.cheque_due.length +
                        smartReminders.implant_stage_due.length +
                        smartReminders.lab_overdue.length +
                        smartReminders.no_show.length +
                        smartReminders.unfinished_treatment.length +
                        smartReminders.unresolved_appointment.length
                      )}</Badge>
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">ارسال پیامک و واتس‌اپ یادآوری نوبت و وضعیت (کلیک برای باز شدن)</p>
                  </div>
                </div>
                <div className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-transform duration-200 ${remindersExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDown size={16} />
                </div>
              </div>

              {remindersExpanded && (
                <div className="space-y-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 animate-in fade-in duration-200">
                  {(Object.keys(REMINDER_CATEGORY_META) as (keyof typeof REMINDER_CATEGORY_META)[]).map((cat) => {
                    const items = smartReminders[cat] as SmartReminder[] | undefined
                    if (!items || items.length === 0) return null
                    const meta = REMINDER_CATEGORY_META[cat]
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{meta.icon}</span>
                          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">{meta.label}</h3>
                          <Badge color="slate">{toPersianDigits(items.length)}</Badge>
                        </div>
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 -mr-1">
                          {items.slice(0, 10).map((r: SmartReminder) => {
                            const key = r.id || r.patient.id + r.category
                            return (
                              <div
                                key={key}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all-smooth cursor-pointer"
                                onClick={() => {
                                  if (r.actionPath) navigate(r.actionPath)
                                  else if (cat === 'unresolved_appointment') navigate('/appointments')
                                  else navigate(`/patients/${r.patient.id}`)
                                }}
                              >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: meta.color }}>
                                  {r.patient.first_name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.title}</p>
                                    {r.patient.file_number && (
                                      <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-900 dark:bg-primary-950 text-white dark:text-primary-300 rounded font-bold" dir="ltr">
                                        {toPersianDigits(r.patient.file_number)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{r.detail}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {r.patient.phone && (
                                    <a
                                      href={`https://wa.me/${r.patient.phone.replace(/\D/g, '').replace(/^0/, '98')}?text=${encodeURIComponent(r.smsMessage || `سلام ${r.patient.first_name} عزیز، یادآوری از کلینیک دندانپزشکی مینا: ${r.detail}`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all-smooth press-scale flex items-center gap-1"
                                      title="ارسال پیام واتس‌اپ"
                                    >
                                      <MessageSquare size={11} />
                                      <span>واتس‌اپ</span>
                                    </a>
                                  )}
                                  {r.smsMessage ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSendReminderSms(r) }}
                                      disabled={sendingReminderId === key}
                                      className="px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[11px] font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all-smooth press-scale disabled:opacity-50"
                                    >
                                      {sendingReminderId === key ? '...' : 'ارسال پیامک'}
                                    </button>
                                  ) : (
                                    <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                                      بستن وضعیت
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          {totalNotifCount === 0 && (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">همه وضعیت‌ها به‌روز هستند</p>
              <p className="text-xs text-slate-400 mt-1">هیچ کار معطل‌مانده یا هشدار اورژانسی برای کلینیک وجود ندارد.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab 2: تحلیل عملکرد و مالی ═════════════════════════════════ */}
      {hubTab === 'analytics' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Chart */}
            <Card className="p-4 sm:p-5 tile-in lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-white to-sky-50/30 dark:from-slate-800 dark:to-sky-950/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white">
                    <TrendingUp size={16} />
                  </div>
                  روند درآمد ({timeRangeLabels[timeRange]})
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
                <ResponsiveContainer width="100%" height={200}>
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

            {/* Occupancy Rate */}
            <div className="space-y-4">
              <Card className="p-4 tile-in relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-800 dark:to-amber-950/20">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                    <Zap size={14} />
                  </div>
                  نرخ اشغال یونیت
                </h3>
                <RadialProgress percent={occupancyRate} label="اشغال امروز" color="#f59e0b" />
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
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

              <Card className="p-4 tile-in relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-800 dark:to-emerald-950/20">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
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
                  <div className="mt-2 flex items-center justify-between text-xs">
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

          {/* Status Distribution */}
          <Card className="p-4 tile-in relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-blue-950/20">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white">
                <Activity size={14} />
              </div>
              توزیع وضعیت نوبت‌های درمان
            </h3>
            {statusChartData.length === 0 ? (
              <EmptyState icon={<Activity size={24} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={150}>
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
      )}

      {/* ═══ Tab 3: مراجعات و فعالیت‌های زنده ═════════════════════════════ */}
      {hubTab === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 animate-in fade-in duration-200">
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
                فعالیت‌های اخیر کلینیک
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
      )}

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
        size="lg"
        title={
          drillDown === 'patients' ? 'بیماران این دوره' :
          drillDown === 'appointments' ? 'نوبت‌های این دوره' :
          drillDown === 'revenue' ? 'پرداخت‌های اخیر' :
          drillDown === 'cheques' ? 'چک‌های سررسید و برگشتی' :
          drillDown === 'implants' ? 'ایمپلنت‌های آماده اقدام بعدی' :
          drillDown === 'debtors' ? 'مانده بدهی بیماران' :
          drillDown === 'ready_lab' ? 'سفارش‌های لابراتوار آماده تحویل' :
          drillDown === 'overdue_lab' ? 'سفارش‌های تأخیر یافته لابراتوار' :
          drillDown === 'installments' ? 'اقساط سررسید شده' :
          'سفارش‌های لابراتوار فعال'
        }
      >
        {drillDown === 'patients' && (
          recentPatientsForDrill.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">بیماری در این بازه ثبت نشده است</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {recentPatientsForDrill.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    h.tap()
                    setDrillDown(null)
                    navigate(`/patients/${p.id}`)
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3 card-tactile-3d min-h-[52px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs">
                      {p.first_name[0] || 'ب'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {p.phone ? toPersianDigits(p.phone) : 'بدون شماره تماس'}
                        {p.national_id ? ` · کد ملی: ${toPersianDigits(p.national_id)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                      پرونده
                      <ArrowLeft size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        {drillDown === 'appointments' && (
          upcomingApptsForDrill.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">نوبتی در این بازه ثبت نشده است</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {upcomingApptsForDrill.map((a) => (
                <div
                  key={a.id}
                  onClick={() => {
                    h.tap()
                    setDrillDown(null)
                    navigate('/appointments')
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3 card-tactile-3d min-h-[52px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0 tabular-nums shadow-xs">
                      {toPersianDigits(a.start_time.slice(0, 5))}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {a.patient?.first_name} {a.patient?.last_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {a.doctor?.name ? `پزشک: ${a.doctor.name}` : ''}
                        {a.type ? ` · ${a.type}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300">
                      {appointmentStatusLabels[a.status] || a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        {drillDown === 'revenue' && (
          recentPaymentsForDrill.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">تراکنش پرداختی در این بازه ثبت نشده است</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {recentPaymentsForDrill.map((p) => {
                const pt = patientMap.get(p.patient_id)
                const methodLabel =
                  p.payment_method === 'pos' ? 'کارتخوان POS' :
                  p.payment_method === 'cash' ? 'نقدی' :
                  p.payment_method === 'cheque' ? 'چک صیادی' :
                  p.payment_method === 'card_to_card' ? 'کارت به کارت' :
                  p.payment_method || 'پرداخت'
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      h.tap()
                      setDrillDown(null)
                      navigate('/billing')
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3 card-tactile-3d min-h-[52px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Wallet size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {pt ? `${pt.first_name} ${pt.last_name}` : 'بیمار درمانگاه'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {p.payment_date ? toJalaliStringPretty(p.payment_date) : '-'} · {methodLabel}
                        </p>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-sm font-extrabold text-sky-700 dark:text-sky-400">
                        {formatCurrency(p.amount)} ت
                      </p>
                      <span className="text-[10px] text-slate-400">ثبت در صندوق</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
        {drillDown === 'lab' && (
          labOrdersState.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">هیچ سفارش فعال یا معوقی در لابراتوار نیست</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {labOrdersState.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').slice(0, 8).map((o) => {
                const pt = patientMap.get(o.patient_id)
                const isOverdue = o.deadline && o.deadline < todayStr
                return (
                  <div
                    key={o.id}
                    onClick={() => {
                      h.tap()
                      setDrillDown(null)
                      navigate('/laboratory')
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3 card-tactile-3d min-h-[52px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FlaskConical size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{o.work_type || 'کار لابراتوار'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {pt ? `بیمار: ${pt.first_name} ${pt.last_name}` : ''}
                          {o.shade ? ` · رنگ: ${o.shade}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      {isOverdue ? (
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                          تأخیر تحویل
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300">
                          {o.deadline ? toJalaliStringPretty(o.deadline) : 'در حال ساخت'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ═══ Drill-down: چک‌های سررسید و برگشتی ═══ */}
        {drillDown === 'cheques' && (
          smartReminders.cheque_due.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">وضعیت چک‌ها به‌روز است</p>
              <p className="text-xs text-slate-400 mt-1">هیچ چک سررسید شده یا برگشتی معوقی در سیستم ثبت نشده است.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {smartReminders.cheque_due.map((r, idx) => (
                <div
                  key={r.id || idx}
                  onClick={() => { setDrillDown(null); navigate(r.actionPath || '/billing') }}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <Banknote size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.patient.first_name} {r.patient.last_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.extraInfo || r.detail}</p>
                      {r.dueDate && <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium mt-0.5">سررسید: {toJalaliStringPretty(r.dueDate)}</p>}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      اقدام مالی
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ═══ Drill-down: ایمپلنت‌های آماده اقدام بعدی ═══ */}
        {drillDown === 'implants' && (
          smartReminders.implant_stage_due.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={36} className="text-sky-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">وضعیت ایمپلنت‌ها پایدار است</p>
              <p className="text-xs text-slate-400 mt-1">هیچ ایمپلنتی در وضعیت معوق یا منتظر اقدام فوری قرار ندارد.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {smartReminders.implant_stage_due.map((r, idx) => (
                <div
                  key={r.id || idx}
                  onClick={() => { setDrillDown(null); navigate(r.actionPath || '/implants') }}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Activity size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.patient.first_name} {r.patient.last_name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{r.detail}</p>
                      {r.extraInfo && <p className="text-[11px] text-slate-400 mt-0.5">{r.extraInfo}</p>}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">
                      پرونده
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ═══ Drill-down: مانده بدهی بیماران ═══ */}
        {drillDown === 'debtors' && (
          smartReminders.debtor.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">حساب‌ها تسویه است</p>
              <p className="text-xs text-slate-400 mt-1">هیچ بیماری دارای مانده بدهی معوق بالای سقف تعیین‌شده نیست.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {smartReminders.debtor.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => { setDrillDown(null); navigate(`/patients/${r.patient.id}`) }}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {r.patient.first_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.patient.first_name} {r.patient.last_name}</p>
                      <p className="text-xs text-slate-400 truncate">{r.patient.phone || 'بدون شماره'}</p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-extrabold text-amber-700 dark:text-amber-400">{formatCurrency(r.priority)} ت</p>
                    <span className="text-[10px] text-slate-400">مشاهده پرونده</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ═══ Drill-down: سفارش‌های آماده تحویل لابراتوار ═══ */}
        {drillDown === 'ready_lab' && (
          readyLabOrdersForDrill.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">سفارش معطل‌مانده‌ای نیست</p>
              <p className="text-xs text-slate-400 mt-1">تمامی کارهای لابراتوار به بیماران تحویل شده است.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {readyLabOrdersForDrill.map((o) => {
                const patient = patients.find((p) => p.id === o.patient_id)
                const shelf = formatShelfLocation(o)
                return (
                  <div
                    key={o.id}
                    onClick={() => { setDrillDown(null); navigate('/laboratory') }}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FlaskConical size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {patient ? `${patient.first_name} ${patient.last_name}` : 'بیمار'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {o.work_type || 'کار لابراتوار'}{o.tooth_number ? ` — دندان ${toothLabel(o.tooth_number)}` : ''}
                        </p>
                        {shelf && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">مکان قفسه: {shelf}</p>}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        آماده تحویل
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ═══ Drill-down: سفارش‌های تأخیر یافته لابراتوار ═══ */}
        {drillDown === 'overdue_lab' && (
          overdueLabOrdersForDrill.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">هیچ سفارش تأخیری وجود ندارد</p>
              <p className="text-xs text-slate-400 mt-1">تمام سفارش‌های لابراتوار در موعد مقرر پیگیری شده‌اند.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {overdueLabOrdersForDrill.map((o) => {
                const patient = patients.find((p) => p.id === o.patient_id)
                return (
                  <div
                    key={o.id}
                    onClick={() => { setDrillDown(null); navigate('/laboratory') }}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {patient ? `${patient.first_name} ${patient.last_name}` : 'بیمار'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {o.work_type || 'کار لابراتوار'}{o.tooth_number ? ` — دندان ${toothLabel(o.tooth_number)}` : ''}
                        </p>
                        {o.deadline && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">موعد تحویل: {toJalaliStringPretty(o.deadline)}</p>}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                        تأخیر موعد
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ═══ Drill-down: اقساط سررسید شده ═══ */}
        {drillDown === 'installments' && (
          smartReminders.installment_due.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={36} className="text-violet-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">اقساط به‌روز هستند</p>
              <p className="text-xs text-slate-400 mt-1">هیچ قسط سررسید شده پرداخت‌نشده‌ای در سیستم وجود ندارد.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
              {smartReminders.installment_due.map((r, idx) => (
                <div
                  key={r.id || idx}
                  onClick={() => { setDrillDown(null); navigate(r.actionPath || '/billing') }}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                      <CalendarClock size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.patient.first_name} {r.patient.last_name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{r.detail}</p>
                      {r.dueDate && <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium mt-0.5">سررسید: {toJalaliStringPretty(r.dueDate)}</p>}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                      تسویه قسط
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        <button
          onClick={() => {
            h.tap()
            const path =
              drillDown === 'patients' ? '/patients' :
              drillDown === 'appointments' ? '/appointments' :
              drillDown === 'revenue' || drillDown === 'cheques' || drillDown === 'debtors' || drillDown === 'installments' ? '/billing' :
              drillDown === 'implants' ? '/implants' :
              '/laboratory'
            setDrillDown(null)
            navigate(path)
          }}
          className="btn-tactile-3d w-full mt-4 py-3 min-h-[48px] rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-sm font-bold shadow-md transition-all-smooth press-scale flex items-center justify-center gap-2"
        >
          {drillDown === 'patients' ? 'مشاهده همه‌ی بیماران' :
           drillDown === 'appointments' ? 'مشاهده تقویم نوبت‌ها' :
           drillDown === 'revenue' ? 'مشاهده تراکنش‌ها در امور مالی' :
           drillDown === 'cheques' ? 'مدیریت چک‌ها در امور مالی' :
           drillDown === 'implants' ? 'مشاهده کارتابل ایمپلنت' :
           drillDown === 'debtors' ? 'مدیریت مطالبات در امور مالی' :
           drillDown === 'installments' ? 'مدیریت اقساط در امور مالی' :
           drillDown === 'ready_lab' ? 'مشاهده کارهای آماده در لابراتوار' :
           drillDown === 'overdue_lab' ? 'پیگیری سفارش‌های تأخیری لابراتوار' :
           'مشاهده کارتابل کامل لابراتوار'}
          <ArrowLeft size={16} />
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
            {smartReminders.cheque_due.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/billing') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-right hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all-smooth">
                <span className="text-lg">🧾</span>
                <span className="flex-1 text-sm font-semibold text-orange-700 dark:text-orange-300">چک‌های سررسید و برگشتی</span>
                <Badge color="error">{toPersianDigits(smartReminders.cheque_due.length)}</Badge>
              </button>
            )}
            {smartReminders.installment_due.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/billing') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-right hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all-smooth">
                <span className="text-lg">📅</span>
                <span className="flex-1 text-sm font-semibold text-violet-700 dark:text-violet-300">اقساط سررسید شده</span>
                <Badge color="secondary">{toPersianDigits(smartReminders.installment_due.length)}</Badge>
              </button>
            )}
            {smartReminders.implant_stage_due.length > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/implants') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-right hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all-smooth">
                <span className="text-lg">🔩</span>
                <span className="flex-1 text-sm font-semibold text-sky-700 dark:text-sky-300">ایمپلنت‌های آماده مرحله بعد</span>
                <Badge color="primary">{toPersianDigits(smartReminders.implant_stage_due.length)}</Badge>
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
            {expiredInventoryCount > 0 && (
              <button onClick={() => { setNotifCenterOpen(false); navigate('/inventory') }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-right hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all-smooth">
                <Clock size={18} className="text-rose-600 dark:text-rose-400" />
                <span className="flex-1 text-sm font-semibold text-rose-700 dark:text-rose-300">کالاهای تاریخ‌گذشته</span>
                <Badge color="error">{toPersianDigits(expiredInventoryCount)}</Badge>
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
