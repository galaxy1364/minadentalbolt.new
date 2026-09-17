import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Calendar, Clock, CheckCircle2, User, ChevronRight, ChevronLeft, Plus, Search, AlertCircle, Edit2, Stethoscope, DollarSign, FileText, Activity, List, Grid, X, UserPlus, Globe, Ban, Printer, MessageSquare, UserCheck, Volume2, Armchair, Sparkles, Tv, FlaskConical } from 'lucide-react'
import { fetchTreatments, fetchPayments, fetchImplantCases, fetchAppointments, createAppointment, updateAppointment, checkConflict, fetchPatients, updatePatient, fetchDoctors, fetchUnits, peekNextFileNumber, createPatient, createEncounter, createPayment, fetchDoctorSchedules, fetchOnlineBookingRequests, rejectBookingRequest, updateLabOrder, fetchLabOrders, updateImplantCase, fetchWaitingList, updateWaitingEntry } from '../lib/api'
import { useDataRefresh } from '../lib/realtimeSync'
import { supabase } from '../lib/supabase'
import { toJalaliString, toJalaliStringPretty, getJalaliDateInfo, formatTime, timeParts, formatCurrency, toPersianDigits, persianWeekdaysShort, getHoliday, jsDateToPersianWeekday } from '../lib/persianDate'
import { doctorColor } from '../lib/doctorColors'
import { summariseDay, shiftsCapacityMinutes } from '../lib/dayMetrics'
import { generateSlots, slotAvailability, defaultEndTime, addMinutes, firstBookableSlot } from '../lib/timeSlots'
import { doctorsForDay, unitAvailability, patientPickerHint } from '../lib/selectionHints'
import { calcAllPatientBalances } from '../lib/finance'
import { buildPatientAlerts, alertChips } from '../lib/patientAlerts'
import { PatientAlerts } from '../components/PatientAlerts'
import { Appointment, AppointmentWithRelations, Patient, Doctor, Unit, DoctorSchedule, LabOrder } from '../types'
import { Modal, Card, Button, Input, Select, Textarea, EmptyState, showToast, Badge, Spinner } from '../components/ui'
import { ModuleHeader } from '../components/ModuleHeader'
import { useConfirmAction, ConfirmActionConfig } from '../components/ConfirmAction'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { PersianCalendar } from '../components/PersianCalendar'
import { CurrencyInput } from '../components/CurrencyInput'
import { MultiChairGrid } from '../components/MultiChairGrid'
import { buildPrintDocument } from '../lib/printDocument'
import { detectSpecialty, CANCELLATION_REASONS } from '../lib/appointmentColorMap'
import { tileThemes, getHashColor } from '../lib/colors'
import { computeWaitingTimeMinutes, formatWaitingTime, announcePatientCall, broadcastPatientCall, computeAverageWaitingTime } from '../lib/operatoryWorkflow'
import { matchWaitingListForCancelledSlot, MatchCandidate, SlotInfo } from '../lib/waitingListMatcher'
import { recordAuditLog } from '../lib/auditLogger'

const typeMeta: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  consultation:  { label: 'مشاوره',      color: 'text-primary-700',  bg: 'bg-primary-50',  dot: 'bg-primary-500' },
  treatment:     { label: 'درمان',        color: 'text-accent-700',   bg: 'bg-accent-50',   dot: 'bg-accent-500' },
  surgery:       { label: 'جراحی',        color: 'text-error-700',    bg: 'bg-error-50',    dot: 'bg-error-500' },
  orthodontics:  { label: 'ارتودنسی',    color: 'text-secondary-700',bg: 'bg-secondary-50',dot: 'bg-secondary-500' },
  implant:       { label: 'ایمپلنت',      color: 'text-warning-700',  bg: 'bg-warning-50',  dot: 'bg-warning-500' },
  follow_up:     { label: 'ویزیت مجدد',  color: 'text-primary-700',  bg: 'bg-primary-50',  dot: 'bg-primary-500' },
  checkup:       { label: 'معاینه',       color: 'text-success-700',  bg: 'bg-success-50',  dot: 'bg-success-500' },
  emergency:     { label: 'اورژانس',      color: 'text-error-700',    bg: 'bg-error-50',    dot: 'bg-error-500' },
  cleaning:      { label: 'جرم‌گیری',     color: 'text-success-700',  bg: 'bg-success-50',  dot: 'bg-success-500' },
  extraction:    { label: 'کشیدن دندان',  color: 'text-error-700',    bg: 'bg-error-50',    dot: 'bg-error-500' },
  root_canal:    { label: 'عصب‌کشی',      color: 'text-warning-700',  bg: 'bg-warning-50',  dot: 'bg-warning-500' },
  other:         { label: 'سایر',         color: 'text-slate-600',    bg: 'bg-slate-50',    dot: 'bg-slate-400' },
}

const statusMeta: Record<string, { label: string; bg: string; color: string }> = {
  scheduled:  { label: 'در انتظار',    bg: 'bg-slate-100',  color: 'text-slate-600' },
  confirmed:  { label: 'تایید شده',    bg: 'bg-primary-100',color: 'text-primary-700' },
  arrived:    { label: 'در سالن انتظار', bg: 'bg-teal-100 dark:bg-teal-950/40', color: 'text-teal-800 dark:text-teal-300' },
  in_chair:   { label: 'روی صندلی',    bg: 'bg-warning-100',color: 'text-warning-700' },
  completed:  { label: 'تکمیل شد',     bg: 'bg-success-100',color: 'text-success-700' },
  cancelled:  { label: 'لغو شد',        bg: 'bg-error-100',  color: 'text-error-700' },
  no_show:    { label: 'غیبت',          bg: 'bg-error-100',  color: 'text-error-700' },
}

/** Minutes since midnight, 0 when unparseable — used only to work out
 * how long the appointment currently is. */
function toMinutesSafe(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0
}

const filterTabs = [
  { key: 'today',    label: 'امروز' },
  { key: 'tomorrow', label: 'فردا' },
  { key: 'week',     label: 'این هفته' },
  { key: 'all',      label: 'همه' },
]

const typeOptions = Object.entries(typeMeta).map(([v, m]) => ({ value: v, label: m.label }))
const statusOptions = Object.entries(statusMeta).map(([v, m]) => ({ value: v, label: m.label }))

function getType(v: string | null) { return typeMeta[v || 'other'] || typeMeta.other }
function getStatus(v: string) { return statusMeta[v] || statusMeta.scheduled }

export default function Appointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingRequests, setBookingRequests] = useState<any[]>([])
  const [reqModalOpen, setReqModalOpen] = useState<any>(null)

  const [activeFilter, setActiveFilter] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'operatory'>('list')
  const [selectedCalDate, setSelectedCalDate] = useState(new Date().toISOString().slice(0, 10))
  const [cancelModalAppt, setCancelModalAppt] = useState<AppointmentWithRelations | null>(null)
  const [cancelReason, setCancelReason] = useState<string>(CANCELLATION_REASONS[0].label)
  const [cancelNote, setCancelNote] = useState<string>('')
  const [waitingCandidates, setWaitingCandidates] = useState<MatchCandidate[]>([])
  const [backfillModalOpen, setBackfillModalOpen] = useState(false)
  const [freedSlotInfo, setFreedSlotInfo] = useState<SlotInfo | null>(null)
  const [assigningBackfill, setAssigningBackfill] = useState(false)

  // Quick Checkout Modal state for finished appointments
  const [checkoutModalAppt, setCheckoutModalAppt] = useState<AppointmentWithRelations | null>(null)
  const [checkoutAmount, setCheckoutAmount] = useState<string>('0')
  const [checkoutMethod, setCheckoutMethod] = useState<'pos' | 'cash' | 'card_to_card' | 'cheque'>('pos')
  const [checkoutRrn, setCheckoutRrn] = useState<string>('')
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [patientSearch, setPatientSearch] = useState('')
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState('')
  const [showPatientResults, setShowPatientResults] = useState(false)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatientSearch(patientSearch)
    }, 300)
    return () => clearTimeout(handler)
  }, [patientSearch])
  const [quickPatient, setQuickPatient] = useState({ first_name: '', last_name: '', phone: '' })
  const [editingAppt, setEditingAppt] = useState<AppointmentWithRelations | null>(null)
  const routerLocation = useLocation()

  /**
   * MOD-FEAT-035 | ورود از سفارش لابراتوار
   *
   * Laboratory's «نوبت تحویل بگذار» routes here with the patient, the
   * doctor and the order. Until now that state was sent and nothing read
   * it — the sender existed without a receiver, so the loop never closed.
   */
  useEffect(() => {
    const st = routerLocation.state as {
      quickStartPatientId?: string; quickStartDoctorId?: string | null
      quickStartDate?: string; openWizard?: boolean
      labOrderId?: string; implantCaseId?: string; implantStep?: string
    } | null
    if (!st) return

    if (st.quickStartDate) {
      setSelectedCalDate(st.quickStartDate)
    }

    if (st.quickStartPatientId || st.openWizard || st.quickStartDoctorId) {
      const implantStep = st.implantStep
      const typeAndNote = implantStep === 'surgery_booked'
        ? { type: 'surgery', notes: 'جراحی ایمپلنت' }
        : implantStep === 'impression'
          ? { type: 'impression', notes: 'قالب‌گیری ایمپلنت' }
          : implantStep
            ? { type: 'delivery', notes: 'تحویل کار لابراتوار' }
            : {}

      setWizardData((w) => ({
        ...w,
        patient_id: st.quickStartPatientId || w.patient_id,
        doctor_id: st.quickStartDoctorId || w.doctor_id,
        date: st.quickStartDate || w.date,
        ...typeAndNote,
      }))
      setPendingLabOrderId(st.labOrderId ?? null)
      setPendingImplant(st.implantCaseId && implantStep ? { caseId: st.implantCaseId, step: implantStep } : null)
      setEditingAppt(null)
      setWizardStep(st.quickStartDoctorId ? 2 : st.quickStartPatientId ? 1 : 0)
      setWizardOpen(true)
    }
    // Clearing history state stops the wizard reopening on back-navigation.
    window.history.replaceState({}, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.state])

  const [wizardData, setWizardData] = useState({
    patient_id: '', doctor_id: '', unit_id: '',
    date: new Date().toISOString().slice(0, 10),
    start_time: '09:00', end_time: '09:30',
    type: 'consultation', custom_type: '', status: 'scheduled',
    notes: '', estimated_fee: '',
    recurrence: 'none' as 'none' | 'weekly' | 'biweekly' | 'monthly',
    recurrenceCount: '4',
  })
  /**
   * MOD-FEAT-035: the lab order this appointment is being booked to hand
   * over. Lab sends the patient here and this sends the appointment's id
   * back, so `delivery_appointment_id` is filled by whoever books rather
   * than by a second manual step nobody remembers.
   */
  const [pendingLabOrderId, setPendingLabOrderId] = useState<string | null>(null)
  const [pendingImplant, setPendingImplant] = useState<{ caseId: string; step: string } | null>(null)

  const { config, confirmAction, close, ConfirmActionModal } = useConfirmAction()

  const [schedules, setSchedules] = useState<DoctorSchedule[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  // Read for the patient picker's debt flag. These are local IndexedDB
  // reads, so the cost is small; the alternative was booking a patient
  // with no sign that they owe the clinic money.
  const [balanceInputs, setBalanceInputs] = useState<{ treatments: any[]; payments: any[]; implants: any[] }>({ treatments: [], payments: [], implants: [] })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [a, p, d, u, br, sch, tr, pay, imp, labs] = await Promise.all([
        fetchAppointments(), fetchPatients(), fetchDoctors(), fetchUnits(),
        fetchOnlineBookingRequests().catch(() => []), fetchDoctorSchedules().catch(() => []),
        fetchTreatments().catch(() => []), fetchPayments().catch(() => []), fetchImplantCases().catch(() => []),
        fetchLabOrders().catch(() => []),
      ])
      setAppointments(a); setPatients(p); setDoctors(d); setUnits(u); setSchedules(sch)
      setLabOrders(labs as any[])
      setBalanceInputs({ treatments: tr as any[], payments: pay as any[], implants: imp as any[] })
      setBookingRequests(br.filter((r: any) => r.status === 'pending'))
    } catch { showToast('error', 'خطا در بارگذاری نوبت‌ها') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Real-time automatic refresh across devices, tabs, and operatory rooms
  useDataRefresh(['appointments', 'patients', 'treatments', 'payments', 'encounters', 'doctor_schedules'], loadData)

  const todayStr = new Date().toISOString().slice(0, 10)
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  /** One pass for every patient, shared with the picker rows below and row 1 priority */
  const patientBalances = useMemo(
    () => calcAllPatientBalances(balanceInputs.payments, balanceInputs.treatments, balanceInputs.implants).byPatient,
    [balanceInputs],
  )

  const filtered = useMemo(() => {
    let list = appointments
    if (activeFilter === 'today')    list = list.filter((a) => a.date === todayStr)
    else if (activeFilter === 'tomorrow') list = list.filter((a) => a.date === tomorrowStr)
    else if (activeFilter === 'week') {
      const now = new Date()
      const ws = new Date(now); ws.setDate(now.getDate() - now.getDay())
      const we = new Date(ws); we.setDate(ws.getDate() + 6)
      list = list.filter((a) => a.date >= ws.toISOString().slice(0, 10) && a.date <= we.toISOString().slice(0, 10))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((a) => {
        const name = a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : ''
        return name.toLowerCase().includes(q)
      })
    }

    return list.sort((a, b) => {
      // For today's appointments: prioritize finished appointments needing payment to Row 1 (ردیف اول)
      if (activeFilter === 'today') {
        const aBal = a.patient_id ? (patientBalances.get(a.patient_id)?.balance || 0) : 0
        const bBal = b.patient_id ? (patientBalances.get(b.patient_id)?.balance || 0) : 0

        // 1. Finished by doctor today with pending payment -> HIGHEST PRIORITY (ROW 1)
        const aNeedsCheckout = a.status === 'completed' && aBal > 0
        const bNeedsCheckout = b.status === 'completed' && bBal > 0
        if (aNeedsCheckout && !bNeedsCheckout) return -1
        if (!aNeedsCheckout && bNeedsCheckout) return 1

        // 2. Any other appointment completed today
        const aCompleted = a.status === 'completed'
        const bCompleted = b.status === 'completed'
        if (aCompleted && !bCompleted) return -1
        if (!aCompleted && bCompleted) return 1

        // 3. Currently on chair
        const aInChair = a.status === 'in_chair'
        const bInChair = b.status === 'in_chair'
        if (aInChair && !bInChair) return -1
        if (!aInChair && bInChair) return 1

        // 4. Arrived in waiting room
        const aArrived = a.status === 'arrived'
        const bArrived = b.status === 'arrived'
        if (aArrived && !bArrived) return -1
        if (!aArrived && bArrived) return 1
      }
      return a.start_time.localeCompare(b.start_time)
    })
  }, [appointments, activeFilter, searchQuery, todayStr, tomorrowStr, patientBalances])

  const stats = useMemo(() => {
    const today = appointments.filter((a) => a.date === todayStr)
    const completed = today.filter((a) => a.status === 'completed').length
    const inChair = today.filter((a) => a.status === 'in_chair').length
    const waiting = today.filter((a) => a.status === 'scheduled' || a.status === 'confirmed').length

    // Occupancy needs today's shifts, not the whole schedule table:
    // capacity is what the doctors on duty today can actually absorb.
    const weekday = jsDateToPersianWeekday(new Date())
    const capacity = shiftsCapacityMinutes(schedules.filter((sc) => sc.day_of_week === weekday))
    const now = new Date()
    const day = summariseDay(today, now.getHours() * 60 + now.getMinutes(), capacity)

    return { total: today.length, completed, inChair, waiting, day }
  }, [appointments, todayStr, schedules])

  /**
   * Lab Due-Date Collision Guard:
   * Cross-reference active lab orders for this patient to prevent scheduling
   * crown/prosthesis delivery before the lab order has arrived or been delivered.
   */
  const activeLabOrderForPatient = useMemo(() => {
    if (!wizardData.patient_id) return null
    return labOrders.find(
      (lo) => lo.patient_id === wizardData.patient_id && lo.status !== 'delivered' && lo.status !== 'cancelled'
    ) || null
  }, [wizardData.patient_id, labOrders])

  const hasLabConflict = useMemo(() => {
    if (!activeLabOrderForPatient) return false
    if (activeLabOrderForPatient.deadline && wizardData.date && wizardData.date < activeLabOrderForPatient.deadline) {
      return true
    }
    const noteStr = `${wizardData.notes || ''} ${wizardData.custom_type || ''} ${wizardData.type || ''}`.toLowerCase()
    const isDeliveryRelated = ['تحویل', 'روکش', 'پروتز', 'امتحان', 'crown', 'bridge', 'فریم'].some((kw) => noteStr.includes(kw))
    return isDeliveryRelated
  }, [activeLabOrderForPatient, wizardData.date, wizardData.notes, wizardData.custom_type, wizardData.type])

  const patientSearchResults = useMemo(() => {
    // Archived patients are now findable here too (with a badge marking
    // them as such) — selecting one auto-reactivates them as part of
    // booking, so a returning patient's old file doesn't require a
    // detour through Archive first. The one already on an appointment
    // being EDITED still always shows.
    const pool = patients
    if (!debouncedPatientSearch.trim()) return pool.filter((p) => p.is_active).slice(0, 8)
    const q = debouncedPatientSearch.toLowerCase().trim()
    return pool.filter((p) => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase()
      return name.includes(q) || (p.phone || '').includes(q) || (p.file_number || '').toLowerCase().includes(q) || (p.national_id || '').includes(q)
    }).slice(0, 10)
  }, [patients, debouncedPatientSearch, wizardData.patient_id])

  const patientName = (a: AppointmentWithRelations) => a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'نامشخص'
  const doctorName = (a: AppointmentWithRelations) => a.doctor?.name ? `دکتر ${a.doctor.name}` : (a.doctor?.specialty ? `دکتر ${a.doctor.specialty}` : '—')
  const unitName = (a: AppointmentWithRelations) => a.unit?.name || ''

  // ── Wizard ─────────────────────────────────────────────
  const openWizard = (appt?: AppointmentWithRelations | null, prefill?: any) => {
    if (appt) {
      setEditingAppt(appt)
      // If the stored type isn't one of the predefined values, it was
      // entered as free text via 'سایر' — re-select 'other' and restore
      // the actual text into custom_type so editing shows it correctly.
      const isKnownType = appt.type ? appt.type in typeMeta && appt.type !== 'other' : false
      setWizardData({
        patient_id: appt.patient_id, doctor_id: appt.doctor_id || '', unit_id: appt.unit_id || '',
        date: appt.date, start_time: appt.start_time, end_time: appt.end_time,
        type: isKnownType ? (appt.type || 'consultation') : (appt.type ? 'other' : 'consultation'),
        custom_type: isKnownType ? '' : (appt.type || ''),
        status: appt.status,
        notes: appt.notes || '', estimated_fee: appt.estimated_fee ? String(appt.estimated_fee) : '',
        recurrence: 'none', recurrenceCount: '4',
      })
    } else {
      setEditingAppt(null)
      const activeUnits = units.filter((u) => u.is_active)
      setWizardData({
        patient_id: prefill?.patient_id || '',
        doctor_id: prefill?.doctor_id || '',
        unit_id: prefill?.unit_id || (activeUnits.length === 1 ? activeUnits[0].id : ''),
        date: prefill?.date || (activeFilter === 'tomorrow' ? tomorrowStr : todayStr),
        start_time: prefill?.start_time || '09:00',
        end_time: prefill?.end_time || '09:30',
        type: prefill?.type || 'consultation',
        custom_type: '',
        status: 'scheduled',
        notes: prefill?.notes || '',
        estimated_fee: '',
        recurrence: 'none',
        recurrenceCount: '4',
      })
    }
    setWizardStep(0)
    setPatientSearch('')
    setShowPatientResults(false)
    setQuickPatient({ first_name: '', last_name: '', phone: '' })
    setWizardOpen(true)
    h.pop()
  }

  // Pre-fills the same wizard from an approved online booking request —
  // staff pick/create the matching patient (patientSearch pre-filled
  // with the phone the visitor gave) and confirm the doctor/date/time,
  // reusing the exact same booking flow rather than a separate one.
  const openWizardFromRequest = (req: any) => {
    setReqModalOpen(null)
    setEditingAppt(null)
    setWizardData({
      patient_id: '', doctor_id: '', unit_id: '',
      date: req.preferred_date || todayStr,
      start_time: '09:00', end_time: '09:30',
      type: 'consultation', custom_type: '', status: 'scheduled',
      notes: req.reason ? `از نوبت‌دهی آنلاین: ${req.reason}` : 'از نوبت‌دهی آنلاین',
      estimated_fee: '', recurrence: 'none', recurrenceCount: '4',
    })
    setWizardStep(0)
    setPatientSearch(req.phone)
    setShowPatientResults(true)
    setQuickPatient({ first_name: req.full_name.split(' ')[0] || '', last_name: req.full_name.split(' ').slice(1).join(' ') || '', phone: req.phone })
    setWizardOpen(true)
    h.pop()
  }

  const wizardNext = () => {
    if (wizardStep === 0 && !wizardData.patient_id) { chimes.playWarning(); h.error(); showToast('error', 'انتخاب بیمار الزامی است'); return }
    if (wizardStep === 1 && !wizardData.doctor_id) { chimes.playWarning(); h.error(); showToast('error', 'انتخاب پزشک الزامی است'); return }
    // Unit wasn't required even after a doctor was chosen — a real
    // scheduling gap, since which physical unit/chair the patient sees
    // matters just as much as which doctor once one is selected.
    if (wizardStep === 1 && units.filter((u) => u.is_active).length > 0 && !wizardData.unit_id) { chimes.playWarning(); h.error(); showToast('error', 'انتخاب یونیت الزامی است'); return }
    if (wizardStep === 2 && !wizardData.date) { chimes.playWarning(); h.error(); showToast('error', 'انتخاب تاریخ الزامی است'); return }
    if (wizardStep === 2 && (!wizardData.start_time || !wizardData.end_time)) { chimes.playWarning(); h.error(); showToast('error', 'انتخاب ساعت شروع و پایان الزامی است'); return }
    if (wizardStep === 2 && wizardData.start_time >= wizardData.end_time) { chimes.playWarning(); h.error(); showToast('error', 'ساعت پایان باید بعد از شروع باشد'); return }
    if (wizardStep === 3 && !wizardData.type) { chimes.playWarning(); h.error(); showToast('error', 'انتخاب نوع نوبت الزامی است'); return }
    h.confirm()
    setWizardStep((s) => Math.min(s + 1, 3))
  }
  const wizardPrev = () => { h.cancel(); setWizardStep((s) => Math.max(s - 1, 0)) }

  // For weekly/biweekly/monthly recurring appointments — generates the
  // series of dates starting from wizardData.date.
  const generateRecurrenceDates = (startDate: string, recurrence: string, count: number): string[] => {
    const dates: string[] = []
    const d = new Date(startDate)
    for (let i = 0; i < count; i++) {
      dates.push(d.toISOString().slice(0, 10))
      if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
      else if (recurrence === 'biweekly') d.setDate(d.getDate() + 14)
      else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
    }
    return dates
  }

  // ── Preview + Confirm for create/edit ──
  const wizardSave = async () => {
    const conflict = await checkConflict(wizardData.doctor_id, wizardData.date, wizardData.start_time, wizardData.end_time, editingAppt?.id, wizardData.unit_id || null)
    if (conflict === 'doctor') { chimes.playWarning(); h.error(); showToast('error', 'تداخل زمانی با نوبت دیگر این پزشک'); return }
    if (conflict === 'unit') { chimes.playWarning(); h.error(); showToast('error', 'این یونیت/صندلی در این بازه‌ی زمانی رزرو شده است'); return }

    const patient = patients.find((p) => p.id === wizardData.patient_id)
    const doctor = doctors.find((d) => d.id === wizardData.doctor_id)
    const unit = units.find((u) => u.id === wizardData.unit_id)
    const tm = getType(wizardData.type)
    const sm = getStatus(wizardData.status)

    const fields: ConfirmActionConfig['fields'] = [
      { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '—', icon: <User size={16} />, highlight: true },
      { label: 'پزشک', value: doctor ? `دکتر ${doctor.name || doctor.specialty || 'پزشک'}` : '—', icon: <Stethoscope size={16} /> },
      { label: 'تاریخ', value: toJalaliStringPretty(wizardData.date), icon: <Calendar size={16} /> },
      { label: 'ساعت', value: `${toPersianDigits(wizardData.start_time)} تا ${toPersianDigits(wizardData.end_time)}`, icon: <Clock size={16} /> },
      { label: 'نوع نوبت', value: tm.label, icon: <Activity size={16} /> },
      { label: 'وضعیت', value: sm.label, icon: <CheckCircle2 size={16} /> },
    ]
    if (unit) fields.push({ label: 'یونیت', value: unit.name, icon: <FileText size={16} /> })
    if (wizardData.estimated_fee) fields.push({ label: 'هزینه برآوردی', value: `${formatCurrency(Number(wizardData.estimated_fee))} تومان`, icon: <DollarSign size={16} /> })
    if (wizardData.notes) fields.push({ label: 'یادداشت', value: wizardData.notes })

    // Soft warning (never a hard block — real clinics do make
    // exceptions) if the selected time falls outside this doctor's
    // declared working hours for that weekday, or the day is marked off
    // entirely. Schedules are managed in Settings → پزشکان و یونیت‌ها.
    let scheduleWarning: string | null = null
    if (wizardData.doctor_id) {
      const allSchedules = await fetchDoctorSchedules()
      const docSchedules = allSchedules.filter((s) => s.doctor_id === wizardData.doctor_id)
      if (docSchedules.length > 0) {
        const weekday = jsDateToPersianWeekday(new Date(wizardData.date))
        const daySched = docSchedules.find((s) => s.day_of_week === weekday)
        if (!daySched) {
          scheduleWarning = 'طبق برنامه‌ی کاری ثبت‌شده، این پزشک در این روز از هفته حضور ندارد'
        } else if (wizardData.start_time < daySched.start_time || wizardData.end_time > daySched.end_time) {
          scheduleWarning = `خارج از ساعت کاری این پزشک (${toPersianDigits(daySched.start_time)} تا ${toPersianDigits(daySched.end_time)})`
        }
      }
    }
    if (scheduleWarning) fields.push({ label: '⚠ هشدار برنامه‌ی کاری', value: scheduleWarning })

    const isRecurring = !editingAppt && wizardData.recurrence !== 'none' && Number(wizardData.recurrenceCount) > 1
    const recurDates = isRecurring ? generateRecurrenceDates(wizardData.date, wizardData.recurrence, Number(wizardData.recurrenceCount)) : [wizardData.date]
    if (isRecurring) {
      fields.push({ label: 'تکرار', value: `${toPersianDigits(recurDates.length)} جلسه — تا ${toJalaliStringPretty(recurDates[recurDates.length - 1])}`, highlight: true })
    }

    confirmAction({
      type: editingAppt ? 'edit' : 'create',
      title: editingAppt ? 'ویرایش نوبت' : isRecurring ? 'ثبت سری نوبت‌ها' : 'ثبت نوبت جدید',
      fields,
      confirmLabel: editingAppt ? 'تایید ویرایش' : 'تایید و ثبت',
      onConfirm: async () => {
        const basePayload = {
          patient_id: wizardData.patient_id, doctor_id: wizardData.doctor_id || null, unit_id: wizardData.unit_id || null,
          start_time: wizardData.start_time, end_time: wizardData.end_time,
          type: wizardData.type === 'other' ? (wizardData.custom_type.trim() || 'سایر') : wizardData.type, status: wizardData.status,
          notes: wizardData.notes || null,
          estimated_fee: wizardData.estimated_fee ? Number(wizardData.estimated_fee) : null,
          duration_minutes: null, reminder_sent: false, created_by: null,
          last_reminder_sent: null, reminder_count: 0, reminder_enabled: false,
          booking_source: null, confirmed_at: null, confirmed_by: null,
        } as any

        if (editingAppt) {
          await updateAppointment(editingAppt.id, {
            patient_id: wizardData.patient_id,
            doctor_id: wizardData.doctor_id || null,
            unit_id: wizardData.unit_id || null,
            date: wizardData.date,
            start_time: wizardData.start_time,
            end_time: wizardData.end_time,
            type: wizardData.type === 'other' ? (wizardData.custom_type.trim() || 'سایر') : wizardData.type,
            status: wizardData.status,
            notes: wizardData.notes || null,
            estimated_fee: wizardData.estimated_fee ? Number(wizardData.estimated_fee) : null,
          })
        } else if (isRecurring) {
          // Each occurrence gets its own conflict check — a series
          // shouldn't silently double-book a date that's already taken;
          // conflicting dates are skipped and reported, not overwritten.
          let created = 0, skipped = 0
          for (const date of recurDates) {
            const c = await checkConflict(wizardData.doctor_id, date, wizardData.start_time, wizardData.end_time, undefined, wizardData.unit_id || null)
            if (c) { skipped++; continue }
            await createAppointment({ ...basePayload, date })
            created++
          }
          showToast(skipped > 0 ? 'error' : 'success', skipped > 0 ? `${toPersianDigits(created)} نوبت ثبت شد، ${toPersianDigits(skipped)} مورد به‌خاطر تداخل رد شد` : `${toPersianDigits(created)} نوبت با موفقیت ثبت شد`)
        } else {
          const created = await createAppointment({ ...basePayload, date: wizardData.date })
          // MOD-FEAT-035: close the loop. Only for a single booking — a
          // recurring series has no one appointment that is "the
          // delivery", and guessing which would be worse than leaving it
          // for the person to set.
          // MOD-FIX-022: an implant step booked here writes its date to the
          // case, so the chain advances from the appointment rather than
          // from a second manual entry.
          if (pendingImplant && created?.id) {
            try {
              const patch = pendingImplant.step === 'surgery_booked'
                ? { surgery_date: wizardData.date, surgery_appointment_id: created.id }
                : { impression_date: wizardData.date }
              await updateImplantCase(pendingImplant.caseId, patch as never)
            } catch {
              showToast('error', 'نوبت ثبت شد ولی به مورد ایمپلنت وصل نشد')
            }
            setPendingImplant(null)
          }
          if (pendingLabOrderId && created?.id) {
            try {
              await updateLabOrder(pendingLabOrderId, { delivery_appointment_id: created.id } as never)
              showToast('success', 'نوبت تحویل ثبت و به سفارش لابراتوار وصل شد')
            } catch {
              // The appointment is saved either way; failing to link is
              // recoverable and must not look like the booking failed.
              showToast('error', 'نوبت ثبت شد ولی به سفارش لابراتوار وصل نشد')
            }
          }
          // ── MOD-FEAT-NEW-001: SMS تأیید خودکار هنگام ثبت نوبت ──────────
          // A booking confirmation SMS is the single most-requested feature
          // in real clinic software. The patient learns their appointment
          // details the moment staff clicks confirm — no follow-up call needed.
          // Fire-and-forget: SMS failure never blocks the booking itself.
          try {
            const patient = patients.find((p) => p.id === wizardData.patient_id)
            if (patient?.phone) {
              const dateLabel   = toJalaliStringPretty(wizardData.date)
              const timeLabel   = formatTime(wizardData.start_time)
              await supabase.functions.invoke('send-sms', {
                body: {
                  type: 'booking_confirmation',
                  to: patient.phone,
                  patientName: `${patient.first_name} ${patient.last_name}`,
                  date: dateLabel,
                  time: timeLabel,
                },
              })
            }
          } catch {
            // SMS failure is silent — the booking is already saved.
          }
        }
        chimes.playSuccess()
        setPendingLabOrderId(null)
        setWizardOpen(false)
        // The list defaults to "امروز" (today) — a newly-booked appointment
        // for any other date would silently vanish from view even though
        // it saved correctly, looking exactly like "ثبت می‌شه ولی نمایش
        // داده نمی‌شه". Switch to "همه" so it's guaranteed visible right
        // after creating it, regardless of which date was picked.
        if (!editingAppt && wizardData.date !== todayStr) setActiveFilter('all')
        await loadData()
      },
    })
  }

  // ── Preview + Confirm for status change ──
  const quickStatus = (appt: AppointmentWithRelations, newStatus: string) => {
    const sm = getStatus(newStatus)
    // Completing an appointment is the natural moment to start the real
    // clinical record — without this link, staff had to separately
    // re-open Treatments, re-pick the same patient, and build an
    // encounter completely from scratch with no connection back to the
    // appointment that was just finished. That's real friction in a busy
    // clinic and a place data entry could just get skipped.
    const offerEncounter = newStatus === 'completed'
    confirmAction({
      type: 'status',
      title: 'تغییر وضعیت نوبت',
      fields: [
        { label: 'بیمار', value: patientName(appt), icon: <User size={16} />, highlight: true },
        { label: 'زمان', value: `${toJalaliStringPretty(appt.date)} ${toPersianDigits(appt.start_time)}`, icon: <Clock size={16} /> },
        { label: 'وضعیت فعلی', value: getStatus(appt.status).label },
        { label: 'وضعیت جدید', value: sm.label, highlight: true },
        ...(offerEncounter ? [{ label: 'ثبت ویزیت', value: 'همزمان یک ویزیت جدید برای ثبت درمان باز می‌شود' }] : []),
      ],
      onConfirm: async () => {
        const patch: Record<string, any> = { status: newStatus }
        const nowIso = new Date().toISOString()
        if (newStatus === 'arrived' && !appt.check_in_time) {
          patch.check_in_time = nowIso
        } else if (newStatus === 'in_chair') {
          if (!appt.chair_entry_time) patch.chair_entry_time = nowIso
          if (!appt.check_in_time) patch.check_in_time = nowIso
        } else if (newStatus === 'completed') {
          if (!appt.chair_exit_time) patch.chair_exit_time = nowIso
        }
        await updateAppointment(appt.id, patch as any)
        chimes.playSuccess()
        if (offerEncounter) {
          const enc = await createEncounter({
            clinic_id: '', patient_id: appt.patient_id, doctor_id: appt.doctor_id || null,
            appointment_id: appt.id,
            encounter_date: appt.date, chief_complaint: appt.notes || null,
            diagnosis: null, treatment_plan: null,
            status: 'in_progress', total_amount: null, paid_amount: null,
            discount_amount: null, created_by: null,
            notes: null,
          } as any)
          showToast('success', 'نوبت تکمیل شد — ویزیت جدید باز شد')
          navigate('/treatments', { state: { openEncounterId: enc.id } })
          return
        }
        await loadData()
      },
    })
  }

  const handleCallPatient = async (appt: AppointmentWithRelations) => {
    h.tap()
    const pName = patientName(appt)
    const uName = unitName(appt)
    const dName = doctorName(appt)

    // Calculate today's turn sequence
    const todayAppts = appointments
      .filter((a) => a.date === appt.date)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
    const turnIndex = todayAppts.findIndex((a) => a.id === appt.id)
    const turnNumber = turnIndex >= 0 ? turnIndex + 1 : undefined

    const options = {
      patientName: pName,
      unitName: uName,
      doctorName: dName,
      turnNumber,
      fileNumber: appt.patient?.file_number,
    }

    broadcastPatientCall(options)
    await announcePatientCall(options)
    showToast('info', `فراخوان ${turnNumber ? `نوبت ${toPersianDigits(turnNumber)}` : 'بیمار'}: ${pName} (مانیتور سالن انتظار)`)
  }

  // ── Quick Checkout for Finished Patient Care (تسویه سریع پایان درمان) ──
  const handleQuickCheckout = async () => {
    const parsedAmt = parseInt(checkoutAmount, 10) || 0
    if (!checkoutModalAppt || parsedAmt <= 0) {
      showToast('error', 'مبلغ پرداختی نامعتبر است')
      return
    }
    setCheckoutSubmitting(true)
    try {
      await createPayment({
        clinic_id: '',
        patient_id: checkoutModalAppt.patient_id,
        amount: parsedAmt,
        payment_method: checkoutMethod,
        payment_date: todayStr,
        status: 'completed',
        notes: `تسویه نهایی پس از اتمام کار پزشک${checkoutRrn ? ` — شماره پیگیری POS: ${checkoutRrn}` : ''}`,
        pos_rrn: checkoutRrn || null,
      } as any)
      chimes.playSuccess()
      showToast('success', 'پرداخت با موفقیت ثبت شد و حساب بیمار تسویه گردید')
      setCheckoutModalAppt(null)
      await loadData()
    } catch (err) {
      chimes.playWarning()
      showToast('error', 'خطا در ثبت پرداخت')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  // ── Smart Clinical Cancellation with Reason ──
  const handleDelete = (appt: AppointmentWithRelations) => {
    setCancelReason(CANCELLATION_REASONS[0].label)
    setCancelNote('')
    setCancelModalAppt(appt)
  }

  const confirmCancelWithReason = async () => {
    if (!cancelModalAppt) return
    const noteSuffix = ` [علت لغو: ${cancelReason}${cancelNote.trim() ? ` - ${cancelNote.trim()}` : ''}]`
    const updatedNotes = ((cancelModalAppt.notes || '') + noteSuffix).trim()
    
    const freedSlot: SlotInfo = {
      date: cancelModalAppt.date,
      start_time: cancelModalAppt.start_time,
      doctor_id: cancelModalAppt.doctor_id,
      unit_id: cancelModalAppt.unit_id,
    }

    await updateAppointment(cancelModalAppt.id, {
      status: 'cancelled',
      notes: updatedNotes,
    })
    await recordAuditLog({
      table_name: 'appointments',
      operation: 'delete',
      record_id: cancelModalAppt.id,
      summary: `لغو نوبت ${cancelModalAppt.patient ? `${cancelModalAppt.patient.first_name} ${cancelModalAppt.patient.last_name}` : ''} به علت: «${cancelReason}»`,
    })
    chimes.playPop()
    setCancelModalAppt(null)
    showToast('info', 'نوبت لغو و علت در تاریخچه ثبت شد')
    await loadData()

    // Smart Waiting List Backfill Detection
    try {
      const wl = await fetchWaitingList()
      const candidates = matchWaitingListForCancelledSlot(freedSlot, wl)
      if (candidates.length > 0) {
        setFreedSlotInfo(freedSlot)
        setWaitingCandidates(candidates.slice(0, 5))
        setBackfillModalOpen(true)
      }
    } catch (err) {
      console.error('Error matching waiting list:', err)
    }
  }

  const handleAssignBackfill = async (candidate: MatchCandidate) => {
    if (!freedSlotInfo) return
    setAssigningBackfill(true)
    try {
      const pat = candidate.entry.patient
      await createAppointment({
        patient_id: candidate.entry.patient_id,
        doctor_id: freedSlotInfo.doctor_id || null,
        unit_id: freedSlotInfo.unit_id || null,
        date: freedSlotInfo.date,
        start_time: freedSlotInfo.start_time,
        end_time: addMinutes(freedSlotInfo.start_time, 30),
        type: 'treatment',
        status: 'scheduled',
        notes: `تخصیص‌یافته از صف انتظار (علت: ${candidate.entry.reason || '—'})`,
      } as any)

      await updateWaitingEntry(candidate.entry.id, {
        status: 'scheduled',
      })

      chimes.playSuccess()
      showToast('success', `نوبت جدید با موفقیت به ${pat ? `${pat.first_name} ${pat.last_name}` : 'بیمار لیست انتظار'} اختصاص داده شد`)
      setBackfillModalOpen(false)
      setWaitingCandidates([])
      setFreedSlotInfo(null)
      await loadData()
    } catch (err) {
      console.error('Error assigning backfill appointment:', err)
      chimes.playWarning()
      showToast('error', 'خطا در تخصیص نوبت از لیست انتظار')
    } finally {
      setAssigningBackfill(false)
    }
  }

  const ptr = usePullToRefresh(async () => { await loadData() })

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto" aria-busy="true" aria-live="polite">
        <div className="skeleton h-10 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2.5">
          {[0,1,2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        <div className="skeleton h-12 rounded-xl" />
        <div className="space-y-2">
          {[0,1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto" {...ptr.handlers}>
      {ptr.pullDistance > 0 && (
        <div className="pull-indicator" style={{ opacity: ptr.isRefreshing ? 1 : ptr.pullProgress, top: -4 }}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full border-2 border-primary-300 dark:border-primary-600 border-t-primary-600 dark:border-t-primary-400 ${ptr.isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `scale(${0.6 + ptr.pullProgress * 0.4})` }} />
            <span className="text-[10px] text-primary-500 font-medium">{ptr.isRefreshing ? 'در حال به‌روزرسانی...' : 'برای به‌روزرسانی بکشید'}</span>
          </div>
        </div>
      )}
      {/* ── Date header ── */}
      <ModuleHeader
        moduleKey="appointments"
        title="نوبت‌دهی"
        subtitle={`${toJalaliStringPretty(todayStr)} — ${persianWeekdaysShort[getJalaliDateInfo(todayStr).weekday]}`}
        action={
          <button onClick={() => openWizard()} aria-label="نوبت جدید" style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 shadow-md transition-all-smooth press-scale">
            <Plus size={16} /> نوبت جدید
          </button>
        }
      />

      {/* ── Online booking requests (نوبت‌دهی آنلاین) ── */}
      {bookingRequests.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-l from-primary-50 to-white dark:from-primary-900/20 dark:to-transparent border border-primary-100 dark:border-primary-800">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-primary-700 dark:text-primary-400 flex items-center gap-1.5">
              <Globe size={14} /> درخواست‌های نوبت آنلاین
            </p>
            <Badge color="error">{toPersianDigits(bookingRequests.length)}</Badge>
          </div>
          <div className="space-y-2">
            {bookingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{req.full_name}</p>
                  <p className="text-[11px] text-slate-400">
                    {toPersianDigits(req.phone)}
                    {req.preferred_date && ` — ${toJalaliStringPretty(req.preferred_date)}`}
                    {req.preferred_time && ` ساعت ${toPersianDigits(req.preferred_time)}`}
                  </p>
                </div>
                <button onClick={() => openWizardFromRequest(req)} className="px-2.5 py-1.5 rounded-lg bg-primary-600 text-white text-[11px] font-bold shrink-0">تبدیل به نوبت</button>
                <button
                  onClick={async () => { h.warning(); await rejectBookingRequest(req.id); await loadData() }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[11px] font-bold shrink-0"
                >
                  رد
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={14} className="text-primary-600" />
            <span className="text-[10px] text-slate-500 font-medium">امروز</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{toPersianDigits(stats.total)}</p>
        </div>
        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={14} className="text-warning-600" />
            <span className="text-[10px] text-slate-500 font-medium">در انتظار</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{toPersianDigits(stats.waiting)}</p>
        </div>
        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={14} className="text-success-600" />
            <span className="text-[10px] text-slate-500 font-medium">تکمیل شده</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{toPersianDigits(stats.completed)}</p>
        </div>
      </div>

      {/* COMP-133/134/135 — how full the day is, not just how many rows
          it has. Counting appointments says nothing about whether the
          chairs are busy: three implant cases can fill a day that a row
          count calls quiet. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={14} className="text-primary-600" />
            <span className="text-[10px] text-slate-500 font-medium">اشغال امروز</span>
          </div>
          {stats.day.occupancy.capacityMinutes > 0 ? (
            <>
              <p className={`text-2xl font-extrabold ${stats.day.occupancy.percent > 100 ? 'text-error-600' : 'text-slate-800'}`}>
                {toPersianDigits(stats.day.occupancy.percent)}٪
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {toPersianDigits(stats.day.occupancy.bookedSlots)} از {toPersianDigits(stats.day.occupancy.totalSlots)} نوبت
              </p>
            </>
          ) : (
            // An explicit reason beats a silent 0٪ — the number is
            // missing because no shift is defined, not because the day
            // is empty.
            <p className="text-xs text-slate-500 mt-1.5">برنامه‌ی کاری پزشکان برای امروز ثبت نشده</p>
          )}
        </div>

        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={14} className="text-warning-600" />
            <span className="text-[10px] text-slate-500 font-medium">میانگین انتظار</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">
            {stats.day.averageWait === null ? '—' : `${toPersianDigits(stats.day.averageWait)}′`}
          </p>
          {stats.day.averageWait === null && (
            <p className="text-[10px] text-slate-500 mt-0.5">کسی منتظر نیست</p>
          )}
        </div>

        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1">
            <User size={14} className="text-secondary-600" />
            <span className="text-[10px] text-slate-500 font-medium">در مطب</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{toPersianDigits(stats.day.present)}</p>
        </div>

        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={14} className="text-success-600" />
            <span className="text-[10px] text-slate-500 font-medium">نوبت بعدی</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-800" dir="ltr">
            {stats.day.nextAt === null ? '—' : toPersianDigits(stats.day.nextAt)}
          </p>
          {stats.day.nextAt === null && (
            <p className="text-[10px] text-slate-500 mt-0.5">نوبتی برای امروز باقی نمانده</p>
          )}
        </div>
      </div>

      {/* ── Filter tabs + search + view toggle ── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 overflow-x-auto dock-scroll">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { h.select(); setActiveFilter(t.key) }}
              className={`filter-tab ${activeFilter === t.key ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* ── MOD-FEAT-NEW-002: پرینت نوبت‌نامه روزانه با پوسته امن PWA ── */}
        <button
          onClick={() => {
            h.confirm()
            const todayAppts = appointments
              .filter((a) => a.date === todayStr)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
            const rows = todayAppts.map((a) => {
              const p = a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'نامشخص'
              const d = a.doctor?.name ? `دکتر ${a.doctor.name}` : '—'
              const t = getType(a.type).label
              const s = getStatus(a.status).label
              return `<tr><td>${toPersianDigits(a.start_time)}</td><td>${p}</td><td>${d}</td><td>${t}</td><td>${s}</td><td>${a.unit?.name || '—'}</td></tr>`
            }).join('')
            const doc = buildPrintDocument({
              title: `نوبت‌نامه ${toJalaliStringPretty(todayStr)}`,
              styles: `
                h1 { font-size: 16px; margin-bottom: 12px; border-bottom: 2px solid #0d9488; padding-bottom: 6px; color: #0d9488; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; }
                th { background: #f1f5f9; font-weight: bold; color: #334155; }
                tr:nth-child(even) { background: #f8fafc; }
              `,
              bodyHtml: `
                <h1>نوبت‌نامه — ${toJalaliStringPretty(todayStr)} (${toPersianDigits(todayAppts.length)} نوبت)</h1>
                <table>
                  <thead>
                    <tr><th>ساعت</th><th>بیمار</th><th>پزشک</th><th>نوع</th><th>وضعیت</th><th>یونیت</th></tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              `,
              shareText: `نوبت‌نامه روزانه کلینیک دندانپزشکی مینا — ${toJalaliStringPretty(todayStr)}\nتعداد نوبت‌ها: ${toPersianDigits(todayAppts.length)}`,
            })
            const w = window.open('', '_blank')
            if (w) { w.document.write(doc); w.document.close(); }
          }}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-primary-600 transition-all-smooth press-scale flex-shrink-0"
          title="پرینت نوبت‌نامه امروز"
          aria-label="پرینت نوبت‌نامه امروز"
        >
          <Printer size={16} />
        </button>
        <button
          onClick={() => { h.tap(); setShowSearch(!showSearch) }}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-primary-600 transition-all-smooth press-scale flex-shrink-0"
          aria-label="جستجو"
        >
          <Search size={16} />
        </button>
        {/* ── 3-way View Mode Toggle ── */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => { h.toggle(); setViewMode('list') }}
            className={`p-1.5 rounded-lg transition-all-smooth ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            title="نمای لیست نوبت‌ها"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => { h.toggle(); setViewMode('calendar') }}
            className={`p-1.5 rounded-lg transition-all-smooth ${viewMode === 'calendar' ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            title="تقویم ماهانه"
          >
            <Calendar size={16} />
          </button>
          <button
            type="button"
            onClick={() => { h.toggle(); setViewMode('operatory') }}
            className={`p-1.5 rounded-lg transition-all-smooth ${viewMode === 'operatory' ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            title="جدول ستونی یونیت‌ها و صندلی‌ها"
          >
            <Grid size={16} />
          </button>
        </div>

        {/* ── Waiting Room TV Display Launcher Button ── */}
        <button
          type="button"
          onClick={() => {
            h.tap()
            window.open('#/waiting-room', '_blank')
          }}
          className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-all-smooth press-scale flex items-center gap-1.5 text-xs font-bold shrink-0"
          title="باز کردن مانیتور سالن انتظار (مخصوص تلویزیون و نمایشگر عمومی)"
        >
          <Tv size={15} />
          <span className="hidden sm:inline">تلویزیون سالن انتظار</span>
        </button>
      </div>

      {showSearch && (
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی بیمار..."
            aria-label="جستجوی نوبت بر اساس نام بیمار"
            className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      )}

      {/* ── Calendar view ── */}
      {viewMode === 'calendar' && (
        <>
          <PersianCalendar
            selectedDate={selectedCalDate}
            onDateSelect={(d) => { h.select(); setSelectedCalDate(d) }}
            appointments={appointments.map((a) => ({ date: a.date, status: a.status }))}
          />
          {/* Appointments for selected calendar date */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">
              نوبت‌های {toJalaliStringPretty(selectedCalDate)}
              {getHoliday(toJalaliString(selectedCalDate)) && (
                <span className="status-pill bg-error-50 text-error-600 mr-2">{getHoliday(toJalaliString(selectedCalDate))}</span>
              )}
            </h3>
            {appointments.filter((a) => a.date === selectedCalDate).length === 0 ? (
              <Card className="p-4"><EmptyState icon={<Calendar size={24} />} title="نوبتی در این روز نیست" /></Card>
            ) : (
              appointments.filter((a) => a.date === selectedCalDate).sort((a, b) => a.start_time.localeCompare(b.start_time)).map((appt) => {
                const tm = getType(appt.type)
                const sm = getStatus(appt.status)
                return (
                  <div key={appt.id} className="appt-card p-3.5" style={{ borderRight: `3px solid ${doctorColor(doctors.find((d) => d.id === appt.doctor_id)?.color, 0)}` }} onClick={() => openWizard(appt)}>
                    <div className="flex items-center gap-3">
                      <div className="time-badge !min-w-[50px] !text-sm">
                        {toPersianDigits(appt.start_time)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-slate-800 truncate">{patientName(appt)}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`status-pill ${tm.bg} ${tm.color}`}>{tm.label}</span>
                          <span className={`status-pill ${sm.bg} ${sm.color}`}>{sm.label}</span>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(appt) }} aria-label="لغو نوبت" title="لغو نوبت" className="p-1.5 rounded-lg bg-error-50 text-error-500 press-scale">
                        <Ban size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* ── Multi-Chair Operatory Grid view (نمای ستونی یونیت‌ها و صندلی‌ها) ── */}
      {viewMode === 'operatory' && (
        <MultiChairGrid
          selectedDate={selectedCalDate}
          onDateChange={(d) => setSelectedCalDate(d)}
          units={units}
          doctors={doctors}
          appointments={appointments}
          onSelectAppointment={(appt) => openWizard(appt)}
          onCallPatient={handleCallPatient}
          onQuickStatus={quickStatus}
          onNewAppointmentAtSlot={(date, startTime, unitId, doctorId) => {
            openWizard(null, {
              date,
              start_time: startTime,
              end_time: addMinutes(startTime, 30),
              unit_id: unitId || '',
              doctor_id: doctorId || '',
            })
          }}
        />
      )}

      {/* ── Appointment list ── */}
      {viewMode === 'list' && (filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Calendar size={32} />}
            title="نوبتی یافت نشد"
            description="برای ثبت نوبت جدید روی «نوبت جدید» بزنید"
            action={<Button size="sm" onClick={() => openWizard()}><Plus size={16} /> افزودن نوبت</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((appt, idx) => {
            const tm = getType(appt.type)
            const sm = getStatus(appt.status)
            const spec = detectSpecialty(appt.type || appt.notes || tm.label)
            const isToday = appt.date === todayStr
            const theme = tileThemes[getHashColor(appt.patient_id || appt.id)]
            return (
              <div
                key={appt.id}
                className={`stagger-item relative overflow-hidden p-3.5 rounded-2xl cursor-pointer hover:shadow-md border border-slate-100 dark:border-slate-700 bg-gradient-to-br ${theme.bg} ${theme.ring} focus:outline-none focus:ring-4 transition-all duration-300 group`}
                style={{ animationDelay: `${Math.min(idx, 15) * 30}ms` }}
                onClick={() => openWizard(appt)}
              >
                <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${theme.blob} to-transparent blur-xl pointer-events-none breathe-slow opacity-50 group-hover:opacity-80 transition-opacity duration-700`} />
                <div className="flex items-start gap-3 relative z-10">
                  {/* Time badge */}
                  {isToday && appt.status === 'scheduled' ? (
                    <div className="time-badge">
                      <div className="text-[9px] opacity-80 leading-none">{timeParts(appt.start_time).period}</div>
                      <div className="text-lg font-extrabold leading-tight">{timeParts(appt.start_time).clock}</div>
                    </div>
                  ) : (
                    <div className="waiting-badge">
                      <div className="text-[9px] text-accent-600 leading-none">{timeParts(appt.start_time).period}</div>
                      <div className="text-lg font-extrabold text-accent-700 leading-tight">{timeParts(appt.start_time).clock}</div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm text-slate-800 truncate">{patientName(appt)}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className={`status-pill ${tm.bg} ${tm.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tm.dot} ml-1`} />
                        {tm.label}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${spec.badgeClass}`}>
                        {spec.label}
                      </span>
                      <span className={`status-pill ${sm.bg} ${sm.color}`}>{sm.label}</span>
                      {appt.status === 'arrived' && appt.check_in_time && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 animate-pulse">
                          ⏳ {formatWaitingTime(computeWaitingTimeMinutes(appt.check_in_time))}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><User size={11} /> {doctorName(appt)}</span>
                      {unitName(appt) && <span>{unitName(appt)}</span>}
                      {appt.estimated_fee != null && <span>{formatCurrency(appt.estimated_fee)} ت</span>}
                    </div>

                    {/* ── بنر و نشانگر اتمام کار پزشک و آمادگی تسویه (ردیف اول) ── */}
                    {appt.status === 'completed' && (() => {
                      const pBal = appt.patient_id ? (patientBalances.get(appt.patient_id)?.balance || 0) : 0
                      return (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="relative flex h-3 w-3 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                            <span className="text-xs font-black text-amber-900 dark:text-amber-100 truncate">
                              پایان درمان — آماده تسویه در پذیرش
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {pBal > 0 ? (
                              <span className="text-xs font-black bg-amber-200/90 dark:bg-amber-900/80 px-2 py-0.5 rounded-lg text-amber-950 dark:text-amber-100">
                                بدهی: {formatCurrency(pBal)} ت
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <CheckCircle2 size={12} /> تسویه شده
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                h.confirm()
                                setCheckoutModalAppt(appt)
                                setCheckoutAmount(String(pBal > 0 ? pBal : (appt.estimated_fee || 0)))
                                setCheckoutMethod('pos')
                                setCheckoutRrn('')
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all-smooth press-scale"
                              title="تسویه سریع و ثبت پرداخت"
                            >
                              <DollarSign size={13} className="stroke-[3]" />
                              <span>تسویه و پرداخت</span>
                            </button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Quick action + delete */}
                  <div className="flex flex-col gap-1.5 items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Direct WhatsApp Reminder to Patient */}
                    {(() => {
                      const cleanPhone = appt.patient?.phone ? appt.patient.phone.replace(/\D/g, '').replace(/^0/, '98') : null
                      if (!cleanPhone) return null
                      const timeStr = `${toJalaliStringPretty(appt.date)} ساعت ${toPersianDigits(formatTime(appt.start_time))}`
                      const waText = `سلام ${patientName(appt)} عزیز،\nیادآوری نوبت دندانپزشکی شما در کلینیک دندانپزشکی مینا:\nتاریخ و زمان: ${timeStr}\nلطفاً در زمان مقرر در کلینیک حضور داشته باشید.`
                      return (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all-smooth press-scale"
                          title="ارسال پیام یادآوری واتساپ به بیمار"
                          onClick={() => chimes.playPop()}
                        >
                          <MessageSquare size={16} />
                        </a>
                      )
                    })()}
                    {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                      <button onClick={() => quickStatus(appt, 'arrived')} aria-label="اعلام حضور در مطب" className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-all-smooth press-scale" title="اعلام حضور بیمار در کلینیک (پذیرش سالن انتظار)">
                        <UserCheck size={16} />
                      </button>
                    )}
                    {appt.status === 'scheduled' && (
                      <button onClick={() => quickStatus(appt, 'confirmed')} aria-label="تایید نوبت" className="p-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all-smooth press-scale" title="تایید نوبت">
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {appt.status === 'arrived' && (
                      <>
                        <button onClick={() => handleCallPatient(appt)} aria-label="فراخوان صوتی بیمار" className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all-smooth press-scale animate-bounce" title="فراخوان صوتی بیمار به یونیت">
                          <Volume2 size={16} />
                        </button>
                        <button onClick={() => quickStatus(appt, 'in_chair')} aria-label="ورود به یونیت" className="p-1.5 rounded-lg bg-warning-50 text-warning-700 hover:bg-warning-100 transition-all-smooth press-scale" title="نشاندن بیمار روی صندلی یونیت">
                          <Armchair size={16} />
                        </button>
                      </>
                    )}
                    {appt.status === 'confirmed' && (
                      <>
                        <button onClick={() => quickStatus(appt, 'in_chair')} aria-label="نشاندن روی یونیت" className="p-1.5 rounded-lg bg-warning-50 text-warning-600 hover:bg-warning-100 transition-all-smooth press-scale" title="نشاندن روی صندلی یونیت">
                          <Stethoscope size={16} />
                        </button>
                        <button onClick={() => quickStatus(appt, 'completed')} aria-label="تکمیل نوبت" className="p-1.5 rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-all-smooth press-scale" title="تکمیل">
                          <CheckCircle2 size={16} />
                        </button>
                      </>
                    )}
                    {appt.status === 'in_chair' && (
                      <button onClick={() => quickStatus(appt, 'completed')} aria-label="تکمیل نوبت" className="p-1.5 rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-all-smooth press-scale" title="تکمیل نوبت و شروع درمان">
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {appt.status === 'completed' && (
                      <button
                        onClick={() => {
                          const pBal = appt.patient_id ? (patientBalances.get(appt.patient_id)?.balance || 0) : 0
                          h.confirm()
                          setCheckoutModalAppt(appt)
                          setCheckoutAmount(String(pBal > 0 ? pBal : (appt.estimated_fee || 0)))
                          setCheckoutMethod('pos')
                          setCheckoutRrn('')
                        }}
                        aria-label="تسویه و پرداخت"
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all-smooth press-scale shadow-sm"
                        title="تسویه حساب و ثبت پرداخت"
                      >
                        <DollarSign size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(appt)} aria-label="لغو نوبت" className="p-1.5 rounded-lg bg-error-50 text-error-500 hover:bg-error-100 transition-all-smooth press-scale" title="لغو">
                      <Ban size={16} />
                    </button>
                  </div>
                </div>

                {/* Notes */}
                {appt.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100/50 dark:border-slate-700/50 line-clamp-1 relative z-10">{appt.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* ── 4-Step Wizard ── */}
      {wizardOpen && (
        <Modal open={wizardOpen} onClose={() => setWizardOpen(false)} title={editingAppt ? 'ویرایش نوبت' : 'نوبت جدید'} size="full">
          <div className="space-y-5">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              {['بیمار', 'پزشک', 'زمان', 'جزئیات'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => { if (i < wizardStep) { h.tap(); setWizardStep(i) } }}
                  className={`flex-1 flex flex-col items-center gap-1.5 ${i > wizardStep ? 'opacity-40' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all-smooth ${
                    i < wizardStep ? 'bg-primary-600 text-white' :
                    i === wizardStep ? 'bg-primary-600 text-white ring-4 ring-primary-100 pulse-glow' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {i < wizardStep ? <CheckCircle2 size={18} /> : toPersianDigits(i + 1)}
                  </div>
                  <span className={`text-[11px] font-semibold ${i <= wizardStep ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                </button>
              ))}
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-l from-primary-400 to-primary-600 rounded-full transition-all-smooth" style={{ width: `${((wizardStep + 1) / 4) * 100}%` }} />
            </div>

            {/* Step 0: Patient — search autocomplete + quick-create */}
            {wizardStep === 0 && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">جستجوی بیمار</label>
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={patientSearch}
                    onChange={(e) => { h.tap(); setPatientSearch(e.target.value); setShowPatientResults(true) }}
                    onFocus={() => setShowPatientResults(true)}
                    placeholder="نام یا شماره بیمار را جستجو کنید..."
                    className="w-full pr-10 pl-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  {wizardData.patient_id && (
                    <button
                      onClick={() => { h.cancel(); setWizardData((p) => ({ ...p, patient_id: '' })); setPatientSearch('') }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-error-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Selected patient card */}
                {wizardData.patient_id && !showPatientResults && (() => {
                  const p = patients.find((x) => x.id === wizardData.patient_id)
                  return p ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-800">{p.first_name} {p.last_name}</p>
                          {p.file_number && <p className="text-xs text-slate-500">پرونده: {p.file_number}</p>}
                        </div>
                        <CheckCircle2 size={20} className="text-primary-600" />
                      </div>
                      <PatientAlerts
                        patient={p}
                        balance={patientBalances.get(p.id) ?? null}
                      />
                    </div>
                  ) : null
                })()}

                {/* Search results dropdown */}
                {showPatientResults && (
                  <div className="space-y-1 max-h-[280px] overflow-y-auto dock-scroll rounded-xl border border-slate-200 bg-white divide-y divide-slate-50">
                    {patientSearchResults.length > 0 ? (
                      patientSearchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={async () => {
                            h.select()
                            if (!p.is_active) {
                              // Selecting an archived patient here brings
                              // them back into the active flow immediately
                              // — no separate trip through Archive needed.
                              try {
                                await updatePatient(p.id, { is_active: true })
                                setPatients((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, is_active: true } : pp))
                                showToast('success', `${p.first_name} از بایگانی خارج و فعال شد`)
                              } catch { showToast('error', 'خطا در فعال‌سازی بیمار') }
                            }
                            setWizardData((d) => ({ ...d, patient_id: p.id })); setPatientSearch(`${p.first_name} ${p.last_name}`); setShowPatientResults(false)
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-primary-50 transition-all-smooth text-right"
                        >
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs flex-shrink-0">
                            {p.first_name[0]}{p.last_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate flex items-center gap-1.5">
                              {p.first_name} {p.last_name}
                              {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold shrink-0">بایگانی</span>}
                            </p>
                            <p className="text-xs text-slate-500">{p.file_number || 'بدون پرونده'}{p.phone ? ` • ${toPersianDigits(p.phone)}` : ''}</p>
                            {/* Both facts already sat on the record and
                                neither reached this list. The debt costs
                                the clinic money; the clinical one is why
                                the alert cards exist, and whoever books
                                the appointment should see it before, not
                                after. */}
                            {(() => {
                              const hint = patientPickerHint(
                                patientBalances.get(p.id)?.balance ?? 0,
                                alertChips(buildPatientAlerts(p, null), 2),
                              )
                              if (!hint.hasWarning) return null
                              return (
                                <div className="flex items-center gap-1 flex-wrap mt-1">
                                  {hint.debt > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                                      بدهکار {formatCurrency(hint.debt)} ت
                                    </span>
                                  )}
                                  {hint.clinical.map((c) => (
                                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-md bg-error-100 text-error-700 font-bold">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              )
                            })()}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3">
                        <p className="text-xs text-slate-400 mb-2">بیماری یافت نشد — ثبت سریع:</p>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input value={quickPatient.first_name} onChange={(e) => setQuickPatient((p) => ({ ...p, first_name: e.target.value }))} placeholder="نام" className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                            <input value={quickPatient.last_name} onChange={(e) => setQuickPatient((p) => ({ ...p, last_name: e.target.value }))} placeholder="نام خانوادگی" className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                          </div>
                          <input value={quickPatient.phone} onChange={(e) => setQuickPatient((p) => ({ ...p, phone: e.target.value }))} placeholder="شماره تماس" dir="ltr" className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                          <button
                            onClick={async () => {
                              if (!quickPatient.first_name.trim() || !quickPatient.last_name.trim()) { h.error(); showToast('error', 'نام و نام خانوادگی الزامی است'); return }
                              if (!quickPatient.phone.trim()) { h.error(); showToast('error', 'شماره تماس الزامی است'); return }
                              try {
                                const fn = await peekNextFileNumber()
                                const newP = await createPatient({ first_name: quickPatient.first_name.trim(), last_name: quickPatient.last_name.trim(), phone: quickPatient.phone.trim(), file_number: fn, file_number_manual: false } as any)
                                h.success(); showToast('success', 'بیمار بدون پرونده ثبت شد — بعداً تکمیل کنید')
                                await loadData()
                                setWizardData((d) => ({ ...d, patient_id: newP.id }))
                                setPatientSearch(`${newP.first_name} ${newP.last_name}`); setShowPatientResults(false)
                                setQuickPatient({ first_name: '', last_name: '', phone: '' })
                              } catch { h.error(); showToast('error', 'خطا در ثبت بیمار') }
                            }}
                            className="w-full py-2.5 rounded-xl bg-accent-600 text-white text-sm font-bold hover:bg-accent-700 transition-all-smooth press-scale flex items-center justify-center gap-1.5"
                          >
                            <UserPlus size={16} /> ثبت بیمار بدون پرونده
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick-create toggle when search is empty */}
                {!showPatientResults && !wizardData.patient_id && (
                  <button onClick={() => { h.tap(); setShowPatientResults(true); setPatientSearch('') }} className="w-full py-2.5 rounded-xl border-2 border-dashed border-accent-300 text-accent-600 text-sm font-medium hover:bg-accent-50 transition-all-smooth flex items-center justify-center gap-1.5">
                    <UserPlus size={16} /> ثبت بیمار جدید بدون پرونده
                  </button>
                )}
              </div>
            )}

            {/* Step 1: Doctor + Unit */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                {doctors.filter((d) => d.is_active).length === 0 ? (
                  <div className="p-4 rounded-2xl bg-warning-50 border border-warning-200 text-center">
                    <p className="text-sm font-bold text-warning-700 mb-1">هنوز پزشکی ثبت نشده است</p>
                    <p className="text-xs text-warning-600 mb-3">برای رزرو نوبت، اول باید حداقل یک پزشک اضافه کنید.</p>
                    <Button variant="secondary" size="sm" onClick={() => { setWizardOpen(false); navigate('/staff') }}>رفتن به پرسنل</Button>
                  </div>
                ) : (
                  <Select
                    label="پزشک *"
                    value={wizardData.doctor_id}
                    onChange={(v) => {
                      h.select()
                      // Changing the doctor resets unit + previously
                      // picked time — a different doctor may not use the
                      // same unit or have that slot free at all, so
                      // silently keeping a stale selection risked booking
                      // a conflict the wizard's own conflict-check
                      // wouldn't catch until much later.
                      const activeUnits = units.filter((u) => u.is_active)
                      const defaultUnitId = activeUnits.length === 1 ? activeUnits[0].id : ''
                      setWizardData((p) => ({ ...p, doctor_id: v, unit_id: defaultUnitId, start_time: '09:00', end_time: '09:30' }))
                    }}
                    options={(() => {
                      // Marked, not filtered: clinics do book outside
                      // declared hours, and hiding the doctor you are
                      // looking for is worse than warning about them.
                      const weekday = jsDateToPersianWeekday(new Date(wizardData.date))
                      const avail = doctorsForDay(doctors, schedules, weekday)
                      return doctors
                        .filter((d) => d.is_active || d.id === wizardData.doctor_id)
                        .map((d) => {
                          const a = avail.find((x) => x.id === d.id)
                          const name = `دکتر ${d.name || d.specialty || 'پزشک'}`
                          const inactive = !d.is_active ? ' (غیرفعال)' : ''
                          if (a && !a.worksToday) return { value: d.id, label: `${name}${inactive} — این روز کار نمی‌کند` }
                          if (a?.hours) return { value: d.id, label: `${name}${inactive} — ${toPersianDigits(a.hours)}` }
                          return { value: d.id, label: `${name}${inactive}` }
                        })
                    })()}
                    placeholder="انتخاب پزشک..."
                  />
                )}
                {units.filter((u) => u.is_active).length === 0 ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-xs text-slate-500 mb-2">یونیتی ثبت نشده — این فیلد اختیاری است، می‌توانید بعداً از تنظیمات اضافه کنید.</p>
                  </div>
                ) : (
                <Select
                  label="یونیت *"
                  value={wizardData.unit_id}
                  onChange={(v) => { h.select(); setWizardData((p) => ({ ...p, unit_id: v })) }}
                  options={(() => {
                    // A unit is a physical chair. The free-times strip
                    // only checks the chosen doctor, so without this two
                    // doctors could each be offered the same slot while
                    // sharing the only chair.
                    const busy = unitAvailability(
                      units, appointments, wizardData.date,
                      wizardData.start_time, wizardData.end_time, editingAppt?.id,
                    )
                    return units
                      .filter((u) => u.is_active || u.id === wizardData.unit_id)
                      .map((u) => {
                        const b = busy.find((x) => x.id === u.id)
                        const inactive = !u.is_active ? ' (غیرفعال)' : ''
                        return {
                          value: u.id,
                          label: b?.busy
                            ? `${u.name}${inactive} — اشغال ${toPersianDigits(b.busyAt || '')}`
                            : `${u.name}${inactive}`,
                        }
                      })
                  })()}
                  placeholder="انتخاب یونیت..."
                />
                )}
              </div>
            )}

            {/* Step 2: Date & Time */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2">
                  <PersianCalendar
                    selectedDate={wizardData.date}
                    onDateSelect={(date) => { h.select(); setWizardData((p) => ({ ...p, date })) }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="ساعت شروع *"
                    type="time"
                    value={wizardData.start_time}
                    onChange={(v) => setWizardData((p) => {
                      // Keep the appointment the same length when the
                      // start moves, and never let the end roll past
                      // midnight — the old code built it as hour + 1, so
                      // 23:30 produced "24:00".
                      const len = Math.max(15, toMinutesSafe(p.end_time) - toMinutesSafe(p.start_time) || 30)
                      return { ...p, start_time: v, end_time: addMinutes(v, len) }
                    })}
                  />
                  <Input label="ساعت پایان *" type="time" value={wizardData.end_time} onChange={(v) => setWizardData((p) => ({ ...p, end_time: v }))} />
                </div>
                {/* Real free times — see lib/timeSlots.
                    This strip used to be 26 hard-coded times under the
                    heading "free times". It was the same list for every
                    doctor and every day, ignoring the working hours and
                    ignoring what was already booked, so the most-tapped
                    control in the app was telling the user something
                    untrue and the way you found out was a conflict
                    warning after you had already chosen. */}
                {(() => {
                  const weekday = jsDateToPersianWeekday(new Date(wizardData.date))
                  const dayShifts = schedules.filter((sc) =>
                    sc.day_of_week === weekday &&
                    (!wizardData.doctor_id || sc.doctor_id === wizardData.doctor_id))
                  const duration = Math.max(
                    15,
                    (toMinutesSafe(wizardData.end_time) - toMinutesSafe(wizardData.start_time)) || 30,
                  )
                  const slots = generateSlots(dayShifts, duration)
                  const dayAppointments = appointments.filter((a) =>
                    a.date === wizardData.date &&
                    a.id !== editingAppt?.id &&
                    (!wizardData.doctor_id || a.doctor_id === wizardData.doctor_id))
                  const now = new Date()
                  const states = slotAvailability(slots, dayAppointments, duration, {
                    isToday: wizardData.date === todayStr,
                    nowMinutes: now.getHours() * 60 + now.getMinutes(),
                  })
                  const free = states.filter((st) => !st.taken && !st.past)

                  if (dayShifts.length === 0) {
                    // An explicit reason beats a fake list: the times are
                    // missing because no shift is defined, not because
                    // the day is full.
                    return (
                      <p className="text-xs text-slate-500">
                        برنامه‌ی کاری این پزشک برای این روز ثبت نشده — ساعت را دستی وارد کنید.
                      </p>
                    )
                  }

                  return (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        ساعت‌های خالی
                        <span className="font-normal text-slate-400">
                          {' '}({toPersianDigits(free.length)} از {toPersianDigits(states.length)})
                        </span>
                      </p>
                      {free.length === 0 ? (
                        <p className="text-xs text-amber-700">این روز برای این پزشک پر است.</p>
                      ) : (
                        <>
                        {/* The currently typed start is not bookable, so
                            offer the nearest one that is instead of
                            letting the user find out at the conflict
                            check two steps later. */}
                        {!free.some((st) => st.time === wizardData.start_time) && (() => {
                          const suggestion = firstBookableSlot(states, wizardData.start_time)
                          if (!suggestion) return null
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                h.select()
                                setWizardData((p) => ({
                                  ...p,
                                  start_time: suggestion,
                                  end_time: defaultEndTime(suggestion, dayShifts, duration),
                                }))
                              }}
                              className="mb-2 text-xs text-primary-700 underline"
                            >
                              نزدیک‌ترین ساعت خالی: {toPersianDigits(suggestion)} — انتخاب کن
                            </button>
                          )
                        })()}
                        <div className="slot-rail" role="listbox" aria-label="ساعت‌های خالی">
                          {states.map((st) => (
                            <button
                              key={st.time}
                              type="button"
                              role="option"
                              aria-selected={wizardData.start_time === st.time}
                              disabled={st.taken || st.past}
                              title={st.taken ? 'رزرو شده' : st.past ? 'گذشته' : undefined}
                              onClick={() => {
                                h.select()
                                setWizardData((p) => ({
                                  ...p,
                                  start_time: st.time,
                                  end_time: defaultEndTime(st.time, dayShifts, duration),
                                }))
                              }}
                              className={`filter-tab ${wizardData.start_time === st.time ? 'active' : ''} ${st.taken || st.past ? 'opacity-40 line-through cursor-not-allowed' : ''}`}
                            >
                              {toPersianDigits(st.time)}
                            </button>
                          ))}
                        </div>
                        </>
                      )}
                    </div>
                  )
                })()}
                {/* Selected date summary */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary-50 border border-primary-100">
                  <Calendar size={20} className="text-primary-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{toJalaliStringPretty(wizardData.date)}</p>
                    <p className="text-xs text-slate-500">{persianWeekdaysShort[jsDateToPersianWeekday(new Date(wizardData.date))]}{wizardData.start_time ? ` - ساعت ${toPersianDigits(wizardData.start_time)}` : ''}</p>
                  </div>
                </div>
                {/* Recurring appointment (for multi-session treatments) */}
                {!editingAppt && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">تکرار نوبت (برای درمان‌های چندجلسه‌ای)</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([['none', 'بدون تکرار'], ['weekly', 'هفتگی'], ['biweekly', 'دوهفته‌ای'], ['monthly', 'ماهانه']] as const).map(([v, label]) => (
                        <button
                          key={v}
                          onClick={() => { h.select(); setWizardData((p) => ({ ...p, recurrence: v })) }}
                          className={`filter-tab !text-[11px] ${wizardData.recurrence === v ? 'active' : ''}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {wizardData.recurrence !== 'none' && (
                      <div className="mt-2.5">
                        <Input label="تعداد جلسات" type="number" value={wizardData.recurrenceCount} onChange={(v) => setWizardData((p) => ({ ...p, recurrenceCount: v }))} placeholder="4" />
                        <p className="text-[11px] text-slate-400 mt-1">مجموعاً {toPersianDigits(wizardData.recurrenceCount || '0')} نوبت با همین ساعت و پزشک ساخته می‌شود — هرکدام جدا برای تداخل زمانی بررسی می‌شوند.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Details + Summary */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                {/* Summary card */}
                <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50/60 to-white p-4 space-y-2.5">
                  <p className="text-xs font-bold text-primary-700 mb-1">پیش‌نمایش نوبت</p>
                  <div className="flex items-center gap-2.5 text-sm">
                    <User size={16} className="text-slate-400" />
                    <span className="text-slate-700">{wizardData.patient_id ? (() => { const p = patients.find((p) => p.id === wizardData.patient_id); return p ? `${p.first_name} ${p.last_name}` : '—' })() : 'انتخاب نشده'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Stethoscope size={16} className="text-slate-400" />
                    <span className="text-slate-700">{wizardData.doctor_id ? (() => { const d = doctors.find((d) => d.id === wizardData.doctor_id); return d ? `دکتر ${d.name}` : '—' })() : 'انتخاب نشده'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-slate-700">{toJalaliStringPretty(wizardData.date)}{wizardData.start_time ? ` - ساعت ${toPersianDigits(wizardData.start_time)}` : ''}</span>
                  </div>
                  {wizardData.estimated_fee && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <DollarSign size={16} className="text-slate-400" />
                      <span className="text-slate-700">{formatCurrency(Number(wizardData.estimated_fee))} تومان</span>
                    </div>
                  )}
                </div>

                {/* Lab Due-Date Collision Guard Alert */}
                {activeLabOrderForPatient && (
                  <div className={`p-3.5 rounded-2xl border transition-all-smooth flex items-start gap-3 ${
                    hasLabConflict
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-sm'
                      : 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200'
                  }`}>
                    <FlaskConical size={18} className={hasLabConflict ? 'text-amber-600 mt-0.5 shrink-0 animate-bounce' : 'text-cyan-600 mt-0.5 shrink-0'} />
                    <div className="flex-1 min-w-0 text-xs leading-relaxed">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold flex items-center gap-1.5">
                          {hasLabConflict ? '⚠️ هشدار هوشمند تداخل لابراتوار' : 'اطلاعیه سفارش لابراتوار این بیمار'}
                        </p>
                        <Badge color={hasLabConflict ? 'warning' : 'primary'}>
                          {activeLabOrderForPatient.status === 'in_progress' ? 'در حال ساخت' : activeLabOrderForPatient.status === 'sent' ? 'ارسال‌شده به لابراتوار' : activeLabOrderForPatient.status}
                        </Badge>
                      </div>
                      <p className="mt-1">
                        سفارش باز پروتز ({activeLabOrderForPatient.work_type || 'پروتز/روکش'}) با کد {toPersianDigits(activeLabOrderForPatient.id.slice(0, 8))} در جریان است.
                        {activeLabOrderForPatient.deadline && (
                          <span className="font-bold block mt-0.5 text-amber-800 dark:text-amber-300">
                            موعد پیش‌بینی‌شده تحویل از لابراتوار: {toJalaliStringPretty(activeLabOrderForPatient.deadline)}
                          </span>
                        )}
                      </p>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => { h.tap(); navigate('/laboratory') }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 hover:underline"
                        >
                          <span>مشاهده کارتابل لابراتوار</span>
                          <ChevronLeft size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Editable details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select label="نوع نوبت *" value={wizardData.type} onChange={(v) => { h.select(); setWizardData((p) => ({ ...p, type: v })) }} options={typeOptions} />
                  {wizardData.type === 'other' && (
                    <Input label="نوع نوبت (دستی)" value={wizardData.custom_type} onChange={(v) => setWizardData((p) => ({ ...p, custom_type: v }))} placeholder="مثلاً: ادامه‌ی کار قبلی، مشاوره‌ی خاص..." />
                  )}
                  <Select label="وضعیت" value={wizardData.status} onChange={(v) => { h.select(); setWizardData((p) => ({ ...p, status: v })) }} options={statusOptions} />
                </div>
                <CurrencyInput label="هزینه برآوردی (تومان)" value={wizardData.estimated_fee} onChange={(v) => setWizardData((p) => ({ ...p, estimated_fee: v }))} />
                <Textarea label="یادداشت" value={wizardData.notes} onChange={(v) => setWizardData((p) => ({ ...p, notes: v }))} placeholder="یادداشت..." rows={2} />
              </div>
            )}

            {/* Navigation — sticky bottom bar */}
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-6 px-4 sm:px-6 py-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 pb-safe">
              <Button variant="secondary" onClick={wizardPrev} disabled={wizardStep === 0}>
                <ChevronRight size={16} /> قبلی
              </Button>
              <div className="flex items-center gap-1.5">
                {[0,1,2,3].map((i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all-smooth ${i === wizardStep ? 'w-6 bg-primary-600' : i < wizardStep ? 'w-1.5 bg-primary-400' : 'w-1.5 bg-slate-200'}`} />
                ))}
              </div>
              {wizardStep < 3 ? (
                <Button variant="primary" onClick={wizardNext}>
                  بعدی <ChevronLeft size={16} />
                </Button>
              ) : (
                <Button variant="primary" onClick={wizardSave}>
                  <CheckCircle2 size={16} /> ثبت نوبت
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── مدال ثبت استاندارد دلیل لغو نوبت ── */}
      {cancelModalAppt && (
        <Modal
          open={!!cancelModalAppt}
          onClose={() => setCancelModalAppt(null)}
          title="لغو نوبت و ثبت علت در پرونده"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700 text-sm space-y-1.5">
              <p className="font-bold text-slate-800 dark:text-slate-100">{patientName(cancelModalAppt)}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{toJalaliStringPretty(cancelModalAppt.date)}</span>
                <span>ساعت {toPersianDigits(cancelModalAppt.start_time)}</span>
                <span>{doctorName(cancelModalAppt)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">علت لغو نوبت *</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto dock-scroll p-1">
                {CANCELLATION_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setCancelReason(r.label)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                      cancelReason === r.label
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <span>{r.label}</span>
                    {cancelReason === r.label && <CheckCircle2 size={15} className="text-rose-600" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Input
                label="توضیحات تکمیلی (اختیاری)"
                value={cancelNote}
                onChange={setCancelNote}
                placeholder="توضیح بیشتر یا پیگیری منشی..."
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setCancelModalAppt(null)}>
                انصراف
              </Button>
              <Button variant="danger" onClick={confirmCancelWithReason}>
                <Ban size={15} /> تایید لغو نوبت
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── مدال پیشنهاد جایگزینی هوشمند از لیست انتظار ── */}
      {backfillModalOpen && freedSlotInfo && (
        <Modal
          open={backfillModalOpen}
          onClose={() => setBackfillModalOpen(false)}
          title="⚡ پیشنهاد جایگزینی هوشمند از لیست انتظار"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Sparkles size={16} className="text-amber-600 shrink-0" />
                وقت نوبت زیر با لغو آزاد شد:
              </p>
              <div className="flex items-center gap-3 font-medium text-[11px] pt-1 text-slate-600 dark:text-slate-300 flex-wrap">
                <span>📅 {toJalaliStringPretty(freedSlotInfo.date)}</span>
                <span>⏰ ساعت {toPersianDigits(freedSlotInfo.start_time)}</span>
                {freedSlotInfo.doctor_id && (
                  <span>👨‍⚕️ {doctors.find((d) => d.id === freedSlotInfo.doctor_id)?.name || 'پزشک'}</span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              بیماران زیر در لیست انتظار ثبت شده‌اند و بر اساس اولویت و تطابق، بهترین کاندیداها هستند:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto dock-scroll p-1">
              {waitingCandidates.map((cand) => {
                const pat = cand.entry.patient
                return (
                  <div
                    key={cand.entry.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2.5 hover:border-primary-400 transition-all-smooth"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {pat ? `${pat.first_name} ${pat.last_name}` : 'بیمار'}
                        </span>
                        <Badge color={cand.entry.priority === 4 ? 'error' : cand.entry.priority === 3 ? 'warning' : 'primary'}>
                          {cand.entry.priority === 4 ? 'فوری' : cand.entry.priority === 3 ? 'بالا' : 'عادی'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium truncate">
                        {cand.matchReason}
                      </p>
                      {cand.entry.reason && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          علت: {cand.entry.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAssignBackfill(cand)}
                      disabled={assigningBackfill}
                      className="shrink-0 text-xs flex items-center gap-1 bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
                    >
                      {assigningBackfill ? <Spinner size={14} /> : (
                        <>
                          <CheckCircle2 size={14} /> تخصیص وقت
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setBackfillModalOpen(false)}>
                صرف‌نظر (خالی ماندن وقت)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── مدال تسویه سریع و ثبت پرداخت پایان کار پزشک (ردیف اول) ── */}
      {checkoutModalAppt && (
        <Modal
          open={!!checkoutModalAppt}
          onClose={() => setCheckoutModalAppt(null)}
          title={`تسویه حساب و پرداخت — ${patientName(checkoutModalAppt)}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-sm">
                <span>بیمار: {patientName(checkoutModalAppt)}</span>
                <span className="text-emerald-700 dark:text-emerald-300">{doctorName(checkoutModalAppt)}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                درمان به اتمام رسیده است و بیمار آماده تسویه حساب در پذیرش می‌باشد.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">مبلغ پرداختی (تومان) *</label>
              <CurrencyInput
                value={checkoutAmount}
                onChange={setCheckoutAmount}
                placeholder="مبلغ پرداختی را وارد کنید..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">روش پرداخت</label>
              <select
                value={checkoutMethod}
                onChange={(e) => setCheckoutMethod(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500 font-medium"
              >
                <option value="pos">کارت‌خوان مطب (POS)</option>
                <option value="cash">نقدی</option>
                <option value="card_to_card">کارت به کارت</option>
                <option value="cheque">چک</option>
              </select>
            </div>

            <div>
              <Input
                label="شماره پیگیری / ارجاع POS (اختیاری)"
                value={checkoutRrn}
                onChange={setCheckoutRrn}
                placeholder="مثال: ۱۲۳۴۵۶۷۸"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setCheckoutModalAppt(null)} disabled={checkoutSubmitting}>
                انصراف
              </Button>
              <Button variant="primary" onClick={handleQuickCheckout} disabled={checkoutSubmitting || (parseInt(checkoutAmount, 10) || 0) <= 0}>
                {checkoutSubmitting ? <Spinner size={15} /> : <CheckCircle2 size={15} />}
                {checkoutSubmitting ? 'در حال ثبت...' : 'ثبت پرداخت و تسویه نهایی'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {ConfirmActionModal}
    </div>
  )
}
