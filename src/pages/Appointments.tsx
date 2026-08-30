import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, CheckCircle2, User, ChevronRight, ChevronLeft, Plus, Search, Trash2, AlertCircle, Edit2, Stethoscope, DollarSign, FileText, Activity, List, Grid, X, UserPlus, Globe } from 'lucide-react'
import { fetchAppointments, createAppointment, updateAppointment, checkConflict, fetchPatients, updatePatient, fetchDoctors, fetchUnits, peekNextFileNumber, createPatient, createEncounter, fetchDoctorSchedules, fetchOnlineBookingRequests, rejectBookingRequest } from '../lib/api'
import { toJalaliString, toJalaliStringPretty, getJalaliDateInfo, formatTime, formatCurrency, toPersianDigits, persianWeekdaysShort, getHoliday, jsDateToPersianWeekday } from '../lib/persianDate'
import { doctorColor } from '../lib/doctorColors'
import { summariseDay, shiftsCapacityMinutes } from '../lib/dayMetrics'
import { generateSlots, slotAvailability, defaultEndTime, addMinutes, firstBookableSlot } from '../lib/timeSlots'
import { Appointment, AppointmentWithRelations, Patient, Doctor, Unit, DoctorSchedule } from '../types'
import { Modal, Card, Button, Input, Select, Textarea, EmptyState, showToast, Badge } from '../components/ui'
import { ModuleHeader } from '../components/ModuleHeader'
import { useConfirmAction, ConfirmActionConfig } from '../components/ConfirmAction'
import { h } from '../lib/haptics'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { PersianCalendar } from '../components/PersianCalendar'
import { CurrencyInput } from '../components/CurrencyInput'

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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedCalDate, setSelectedCalDate] = useState(new Date().toISOString().slice(0, 10))

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientResults, setShowPatientResults] = useState(false)
  const [quickPatient, setQuickPatient] = useState({ first_name: '', last_name: '', phone: '' })
  const [editingAppt, setEditingAppt] = useState<AppointmentWithRelations | null>(null)
  const [wizardData, setWizardData] = useState({
    patient_id: '', doctor_id: '', unit_id: '',
    date: new Date().toISOString().slice(0, 10),
    start_time: '09:00', end_time: '09:30',
    type: 'consultation', custom_type: '', status: 'scheduled',
    notes: '', estimated_fee: '',
    recurrence: 'none' as 'none' | 'weekly' | 'biweekly' | 'monthly',
    recurrenceCount: '4',
  })

  const { config, confirmAction, close, ConfirmActionModal } = useConfirmAction()

  const [schedules, setSchedules] = useState<DoctorSchedule[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [a, p, d, u, br, sch] = await Promise.all([fetchAppointments(), fetchPatients(), fetchDoctors(), fetchUnits(), fetchOnlineBookingRequests().catch(() => []), fetchDoctorSchedules().catch(() => [])])
      setAppointments(a); setPatients(p); setDoctors(d); setUnits(u); setSchedules(sch)
      setBookingRequests(br.filter((r: any) => r.status === 'pending'))
    } catch { showToast('error', 'خطا در بارگذاری نوبت‌ها') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const todayStr = new Date().toISOString().slice(0, 10)
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

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
    return list.sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [appointments, activeFilter, searchQuery, todayStr, tomorrowStr])

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

  const patientSearchResults = useMemo(() => {
    // Archived patients are now findable here too (with a badge marking
    // them as such) — selecting one auto-reactivates them as part of
    // booking, so a returning patient's old file doesn't require a
    // detour through Archive first. The one already on an appointment
    // being EDITED still always shows.
    const pool = patients
    if (!patientSearch.trim()) return pool.filter((p) => p.is_active).slice(0, 8)
    const q = patientSearch.toLowerCase().trim()
    return pool.filter((p) => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase()
      return name.includes(q) || (p.phone || '').includes(q) || (p.file_number || '').toLowerCase().includes(q) || (p.national_id || '').includes(q)
    }).slice(0, 10)
  }, [patients, patientSearch, wizardData.patient_id])

  const patientName = (a: AppointmentWithRelations) => a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'نامشخص'
  const doctorName = (a: AppointmentWithRelations) => a.doctor?.name ? `دکتر ${a.doctor.name}` : (a.doctor?.specialty ? `دکتر ${a.doctor.specialty}` : '—')
  const unitName = (a: AppointmentWithRelations) => a.unit?.name || ''

  // ── Wizard ─────────────────────────────────────────────
  const openWizard = (appt?: AppointmentWithRelations) => {
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
      setWizardData({
        patient_id: '', doctor_id: '', unit_id: '',
        date: activeFilter === 'tomorrow' ? tomorrowStr : todayStr,
        start_time: '09:00', end_time: '09:30',
        type: 'consultation', custom_type: '', status: 'scheduled',
        notes: '', estimated_fee: '',
        recurrence: 'none', recurrenceCount: '4',
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
    if (wizardStep === 0 && !wizardData.patient_id) { h.error(); showToast('error', 'انتخاب بیمار الزامی است'); return }
    if (wizardStep === 1 && !wizardData.doctor_id) { h.error(); showToast('error', 'انتخاب پزشک الزامی است'); return }
    // Unit wasn't required even after a doctor was chosen — a real
    // scheduling gap, since which physical unit/chair the patient sees
    // matters just as much as which doctor once one is selected.
    if (wizardStep === 1 && units.filter((u) => u.is_active).length > 0 && !wizardData.unit_id) { h.error(); showToast('error', 'انتخاب یونیت الزامی است'); return }
    if (wizardStep === 2 && !wizardData.date) { h.error(); showToast('error', 'انتخاب تاریخ الزامی است'); return }
    if (wizardStep === 2 && (!wizardData.start_time || !wizardData.end_time)) { h.error(); showToast('error', 'انتخاب ساعت شروع و پایان الزامی است'); return }
    if (wizardStep === 2 && wizardData.start_time >= wizardData.end_time) { h.error(); showToast('error', 'ساعت پایان باید بعد از شروع باشد'); return }
    if (wizardStep === 3 && !wizardData.type) { h.error(); showToast('error', 'انتخاب نوع نوبت الزامی است'); return }
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
    if (conflict === 'doctor') { h.error(); showToast('error', 'تداخل زمانی با نوبت دیگر این پزشک'); return }
    if (conflict === 'unit') { h.error(); showToast('error', 'این یونیت/صندلی در این بازه‌ی زمانی رزرو شده است'); return }

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
          await updateAppointment(editingAppt.id, { ...basePayload, date: wizardData.date })
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
          await createAppointment({ ...basePayload, date: wizardData.date })
        }
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
        await updateAppointment(appt.id, { status: newStatus })
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

  // ── Preview + Confirm for delete ──
  const handleDelete = (appt: AppointmentWithRelations) => {
    // Per clinic policy: appointment history is never permanently
    // deleted — 'لغو شد' (cancelled) already exists as a real status and
    // keeps the record (and the fact that this slot happened/was booked)
    // fully intact, instead of erasing it.
    confirmAction({
      type: 'status',
      title: 'لغو نوبت',
      warning: 'این نوبت هیچ‌وقت پاک نمی‌شود — فقط به‌عنوان لغو‌شده علامت می‌خورد.',
      fields: [
        { label: 'بیمار', value: patientName(appt), icon: <User size={16} />, highlight: true },
        { label: 'تاریخ', value: toJalaliStringPretty(appt.date), icon: <Calendar size={16} /> },
        { label: 'ساعت', value: toPersianDigits(appt.start_time), icon: <Clock size={16} /> },
        { label: 'نوع', value: getType(appt.type).label },
      ],
      confirmLabel: 'تایید لغو',
      onConfirm: async () => { await updateAppointment(appt.id, { status: 'cancelled' }); await loadData() },
    })
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
        <button
          onClick={() => { h.tap(); setShowSearch(!showSearch) }}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-primary-600 transition-all-smooth press-scale flex-shrink-0"
        >
          <Search size={16} />
        </button>
        <button
          onClick={() => { h.toggle(); setViewMode(viewMode === 'list' ? 'calendar' : 'list') }}
          className={`p-2 rounded-xl border transition-all-smooth press-scale flex-shrink-0 ${viewMode === 'calendar' ? 'bg-primary-50 border-primary-200 text-primary-600' : 'bg-white border-slate-200 text-slate-500'}`}
        >
          {viewMode === 'calendar' ? <List size={16} /> : <Grid size={16} />}
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
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(appt) }} aria-label="حذف نوبت" className="p-1.5 rounded-lg bg-error-50 text-error-500 press-scale">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
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
          {filtered.map((appt) => {
            const tm = getType(appt.type)
            const sm = getStatus(appt.status)
            const isToday = appt.date === todayStr
            return (
              <div
                key={appt.id}
                className="appt-card p-3.5 stagger-item"
                style={{ borderRight: `3px solid ${doctorColor(doctors.find((d) => d.id === appt.doctor_id)?.color, 0)}` }}
                onClick={() => openWizard(appt)}
              >
                <div className="flex items-start gap-3">
                  {/* Time badge */}
                  {isToday && appt.status === 'scheduled' ? (
                    <div className="time-badge">
                      <div className="text-[9px] opacity-80 leading-none">{formatTime(appt.start_time).split(' ')[0]}</div>
                      <div className="text-lg font-extrabold leading-tight">{formatTime(appt.start_time).match(/\d+/)?.[0] || ''}</div>
                    </div>
                  ) : (
                    <div className="waiting-badge">
                      <div className="text-[9px] text-accent-600 leading-none">{formatTime(appt.start_time).split(' ')[0]}</div>
                      <div className="text-lg font-extrabold text-accent-700 leading-tight">{formatTime(appt.start_time).match(/\d+/)?.[0] || ''}</div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm text-slate-800 truncate">{patientName(appt)}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`status-pill ${tm.bg} ${tm.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tm.dot} ml-1`} />
                        {tm.label}
                      </span>
                      <span className={`status-pill ${sm.bg} ${sm.color}`}>{sm.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><User size={11} /> {doctorName(appt)}</span>
                      {unitName(appt) && <span>{unitName(appt)}</span>}
                      {appt.estimated_fee != null && <span>{formatCurrency(appt.estimated_fee)} ت</span>}
                    </div>
                  </div>

                  {/* Quick action + delete */}
                  <div className="flex flex-col gap-1.5 items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {appt.status === 'scheduled' && (
                      <button onClick={() => quickStatus(appt, 'confirmed')} aria-label="تایید نوبت" className="p-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all-smooth press-scale" title="تایید">
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {appt.status === 'confirmed' && (
                      <button onClick={() => quickStatus(appt, 'completed')} aria-label="تکمیل نوبت" className="p-1.5 rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-all-smooth press-scale" title="تکمیل">
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(appt)} aria-label="حذف نوبت" className="p-1.5 rounded-lg bg-error-50 text-error-500 hover:bg-error-100 transition-all-smooth press-scale" title="حذف">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Notes */}
                {appt.notes && (
                  <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 line-clamp-1">{appt.notes}</p>
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
                    label="پزشک"
                    value={wizardData.doctor_id}
                    onChange={(v) => {
                      h.select()
                      // Changing the doctor resets unit + previously
                      // picked time — a different doctor may not use the
                      // same unit or have that slot free at all, so
                      // silently keeping a stale selection risked booking
                      // a conflict the wizard's own conflict-check
                      // wouldn't catch until much later.
                      setWizardData((p) => ({ ...p, doctor_id: v, unit_id: '', start_time: '09:00', end_time: '09:30' }))
                    }}
                    options={doctors.filter((d) => d.is_active || d.id === wizardData.doctor_id).map((d) => ({ value: d.id, label: `دکتر ${d.name || d.specialty || 'پزشک'}${!d.is_active ? ' (غیرفعال)' : ''}` }))}
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
                  options={units.filter((u) => u.is_active || u.id === wizardData.unit_id).map((u) => ({ value: u.id, label: `${u.name}${!u.is_active ? ' (غیرفعال)' : ''}` }))}
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

      {ConfirmActionModal}
    </div>
  )
}
