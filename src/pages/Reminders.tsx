// Reminders.tsx — مرکز یادآوری یکپارچه: aggregates every date-driven
// reminder across the whole app (cheques due, installments due, lab
// deadlines, implant surgeries) into one place, with real phone-
// calendar alarms (.ics export) and a lead-time setting, instead of
// each module only surfacing its own reminders separately.
import { useState, useEffect, useMemo } from 'react'
import { PatientSelect } from '../components/PatientSelect'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock, Banknote, CreditCard, FlaskConical, Bone, Settings2,
  Bell, BellOff, Plus, StickyNote, Check, X as XIcon, Send, MessageSquare,
  HeartPulse, Scissors, Smile, Users, AlertTriangle, ChevronRight, ExternalLink, Phone
} from 'lucide-react'
import { ModuleHeader } from '../components/ModuleHeader'
import { Card, Button, Badge, Spinner, EmptyState, Select, Modal, Input, Textarea, showToast } from '../components/ui'
import { chimes } from '../lib/chimes'
import { CurrencyInput } from '../components/CurrencyInput'
import { PersianDateInput } from '../components/PersianDateInput'
import {
  fetchCheques, fetchAllInstallments, fetchLabOrders, fetchImplantCases,
  fetchPatients, fetchManualReminders, createManualReminder, updateManualReminder,
  fetchAppointments, fetchPersonalFinanceItems, fetchTreatments, fetchEncounters, fetchPayments
} from '../lib/api'
import {
  findPostOpCheckups, findSutureRemovalReminders, findHygieneRecalls,
  calculateClinicRetentionSummary, type ClinicRetentionSummary
} from '../lib/patientRecallChurn'
import { toJalaliStringPretty, toPersianDigits, formatCurrency } from '../lib/persianDate'
import { downloadICSReminder } from '../lib/icsReminder'
import { requestNotificationPermission, getNotificationPermission, notifyOnceForReminder } from '../lib/notifications'
import { h } from '../lib/haptics'
import { supabase } from '../lib/supabase'
import type { Patient, ManualReminder, Treatment } from '../types'

const LEAD_DAYS_KEY = 'minadent-reminder-lead-days'

interface ReminderItem {
  id: string
  category: 'cheque' | 'installment' | 'lab' | 'implant' | 'manual' | 'appointment' | 'personal' | 'post_op' | 'suture' | 'hygiene'
  title: string
  patientName: string
  dueDate: string
  amount?: number
  daysLeft: number
  manualSource?: ManualReminder
  actionPath?: string
  actionNeeded?: string
  smsTemplate?: string
  priority?: number
}

export default function Reminders() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ReminderItem[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [leadDays, setLeadDays] = useState(() => localStorage.getItem(LEAD_DAYS_KEY) || '3')
  const [filter, setFilter] = useState<'all' | ReminderItem['category']>('all')
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission())
  const [retentionSummary, setRetentionSummary] = useState<ClinicRetentionSummary | null>(null)

  // Manual reminder create/edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [atRiskModalOpen, setAtRiskModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<ManualReminder | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ patient_id: '', title: '', amount: '', due_date: '', notes: '' })
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null)

  const loadData = () => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    return Promise.all([
      fetchCheques(),
      fetchAllInstallments(),
      fetchLabOrders(),
      fetchImplantCases(),
      fetchPatients(),
      fetchManualReminders(),
      fetchAppointments(today),
      fetchPersonalFinanceItems(),
      fetchTreatments(),
      fetchEncounters(),
      fetchPayments(),
    ])
      .then(([cheques, installments, labOrders, implantCases, pats, manualReminders, appointments, personalItems, treatments, encounters, payments]) => {
        setPatients(pats)
        const patientName = (id: string | null) => {
          if (!id) return 'بدون بیمار'
          const p = pats.find((pp) => pp.id === id)
          return p ? `${p.first_name} ${p.last_name}` : 'بیمار'
        }
        const daysLeft = (d: string) => Math.floor((new Date(d).getTime() - new Date(today).getTime()) / 86400000)

        const list: ReminderItem[] = []
        for (const c of cheques) {
          if (c.status !== 'pending') continue
          list.push({ id: `cheque-${c.id}`, category: 'cheque', title: `سررسید چک`, patientName: patientName(c.patient_id), dueDate: c.due_date, amount: c.amount, daysLeft: daysLeft(c.due_date) })
        }
        for (const inst of installments as any[]) {
          if (inst.status !== 'pending') continue
          list.push({ id: `inst-${inst.id}`, category: 'installment', title: `قسط شماره ${inst.installment_number}`, patientName: patientName(inst.patient_id), dueDate: inst.due_date, amount: inst.amount, daysLeft: daysLeft(inst.due_date) })
        }
        for (const l of labOrders as any[]) {
          if (!l.deadline || l.status === 'delivered' || l.status === 'cancelled') continue
          list.push({ id: `lab-${l.id}`, category: 'lab', title: 'موعد تحویل لابراتوار', patientName: patientName(l.patient_id), dueDate: l.deadline, daysLeft: daysLeft(l.deadline) })
        }
        for (const im of implantCases as any[]) {
          if (im.surgery_date && im.surgery_date >= today) {
            list.push({ id: `implant-surgery-${im.id}`, category: 'implant', title: 'جراحی ایمپلنت', patientName: patientName(im.patient_id), dueDate: im.surgery_date, daysLeft: daysLeft(im.surgery_date) })
          }
          if (im.healing_abutment_date && im.healing_abutment_date >= today) {
            list.push({ id: `implant-healing-${im.id}`, category: 'implant', title: 'نصب هیلینگ آباتمنت', patientName: patientName(im.patient_id), dueDate: im.healing_abutment_date, daysLeft: daysLeft(im.healing_abutment_date) })
          }
          if (im.impression_date && im.impression_date >= today) {
            list.push({ id: `implant-impression-${im.id}`, category: 'implant', title: 'قالب‌گیری ایمپلنت', patientName: patientName(im.patient_id), dueDate: im.impression_date, daysLeft: daysLeft(im.impression_date) })
          }
          if (im.crown_delivery_date && im.crown_delivery_date >= today) {
            list.push({ id: `implant-crown-${im.id}`, category: 'implant', title: 'تحویل روکش ایمپلنت', patientName: patientName(im.patient_id), dueDate: im.crown_delivery_date, daysLeft: daysLeft(im.crown_delivery_date) })
          }
        }
        // Manual reminders
        for (const mr of manualReminders) {
          if (mr.status !== 'pending') continue
          list.push({ id: `manual-${mr.id}`, category: 'manual', title: mr.title, patientName: patientName(mr.patient_id), dueDate: mr.due_date, amount: mr.amount || undefined, daysLeft: daysLeft(mr.due_date), manualSource: mr })
        }
        // Upcoming appointments (within 14 days)
        for (const a of appointments as any[]) {
          if (a.status === 'cancelled' || a.status === 'completed' || a.status === 'no_show') continue
          const dl = daysLeft(a.date)
          if (dl > 14) continue
          list.push({ id: `appt-${a.id}`, category: 'appointment', title: 'نوبت', patientName: patientName(a.patient_id), dueDate: a.date, daysLeft: dl })
        }
        // Personal finance
        for (const pf of personalItems as any[]) {
          if (pf.status !== 'active' || !pf.due_date) continue
          const typeLabel = { loan: 'وام', rent: 'اجاره', cheque: 'چک شخصی', debt: 'بدهی', other: 'مالی شخصی' }[pf.item_type as string] || 'مالی شخصی'
          list.push({ id: `personal-${pf.id}`, category: 'personal', title: `${typeLabel} — ${pf.title}`, patientName: pf.counterparty || '-', dueDate: pf.due_date, amount: pf.monthly_amount || (pf.total_amount - pf.paid_amount) || undefined, daysLeft: daysLeft(pf.due_date) })
        }

        // Post-Operative Checkups (24 to 48 hours post surgery)
        const postOps = findPostOpCheckups(treatments as Treatment[], pats, today)
        for (const po of postOps) {
          list.push({
            id: po.id || `postop-${po.patient.id}`,
            category: 'post_op',
            title: po.detail || po.title || 'پیگیری پس از جراحی',
            patientName: po.patientName || `${po.patient.first_name} ${po.patient.last_name}`,
            dueDate: today,
            daysLeft: 0,
            actionPath: po.actionPath,
            actionNeeded: po.actionNeeded,
            smsTemplate: po.smsMessage,
            priority: po.priority,
          })
        }

        // Suture Removals (7 to 10 days post-surgery without booked appointment)
        const sutureRemovals = findSutureRemovalReminders(treatments as Treatment[], pats, appointments as any, today)
        for (const sr of sutureRemovals) {
          list.push({
            id: sr.id || `suture-${sr.patient.id}`,
            category: 'suture',
            title: sr.detail || sr.title || 'موعد کشیدن بخیه',
            patientName: sr.patientName || `${sr.patient.first_name} ${sr.patient.last_name}`,
            dueDate: today,
            daysLeft: 0,
            actionPath: sr.actionPath,
            actionNeeded: sr.actionNeeded,
            smsTemplate: sr.smsMessage,
            priority: sr.priority,
          })
        }

        // Preventive Hygiene & Periodontal Recalls (6-month periodic recall)
        const hygieneRecalls = findHygieneRecalls(pats, encounters as any, appointments as any, 180, today)
        for (const hr of hygieneRecalls) {
          list.push({
            id: hr.id || `recall-${hr.patient.id}`,
            category: 'hygiene',
            title: hr.detail || hr.title || 'چکاپ دوره‌ای ۶ ماهه',
            patientName: hr.patientName || `${hr.patient.first_name} ${hr.patient.last_name}`,
            dueDate: today,
            daysLeft: 0,
            actionPath: hr.actionPath,
            actionNeeded: hr.actionNeeded,
            smsTemplate: hr.smsMessage,
            priority: hr.priority,
          })
        }

        list.sort((a, b) => a.daysLeft - b.daysLeft)
        setItems(list)

        // Calculate clinic-wide retention metrics
        const summary = calculateClinicRetentionSummary({
          patients: pats,
          encounters: encounters as any,
          appointments: appointments as any,
          treatments: treatments as any,
          payments: payments as any,
        })
        setRetentionSummary(summary)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const updateLeadDays = (v: string) => { setLeadDays(v); localStorage.setItem(LEAD_DAYS_KEY, v) }

  const filteredItems = useMemo(() => items.filter((it) => filter === 'all' || it.category === filter), [items, filter])
  const urgentCount = items.filter((it) => it.daysLeft <= Number(leadDays)).length

  useEffect(() => {
    if (notifPermission !== 'granted') return
    const categoryLabel: Record<ReminderItem['category'], string> = {
      cheque: 'چک', installment: 'قسط', lab: 'لابراتوار', implant: 'ایمپلنت',
      manual: 'یادآوری', appointment: 'نوبت', personal: 'مالی شخصی',
      post_op: 'پیگیری پس از جراحی', suture: 'کشیدن بخیه', hygiene: 'چکاپ دوره‌ای',
    }
    for (const it of items) {
      const label = categoryLabel[it.category]
      const when = it.daysLeft === 0 ? 'امروز' : it.daysLeft < 0 ? `${Math.abs(it.daysLeft)} روز پیش` : `${it.daysLeft} روز دیگر`
      const body = `${it.title} — ${it.patientName} — سررسید: ${when}`
      if (it.daysLeft === 3) {
        notifyOnceForReminder(`${it.id}-3day`, `⏰ ۳ روز تا سررسید ${label}`, body)
      } else if (it.daysLeft === 1) {
        notifyOnceForReminder(`${it.id}-1day`, `⏰ فردا سررسید ${label}`, body)
      } else if (it.daysLeft === 0) {
        notifyOnceForReminder(`${it.id}-dueday`, `🔔 امروز سررسید ${label}`, body)
      } else if (it.daysLeft < 0) {
        notifyOnceForReminder(`${it.id}-overdue`, `🚨 گذشته از موعد — ${label}`, `${it.title} — ${it.patientName} — ${Math.abs(it.daysLeft)} روز تاخیر`)
      }
    }
  }, [items, notifPermission])

  const handleEnableNotifications = async () => {
    h.tap()
    const perm = await requestNotificationPermission()
    setNotifPermission(perm)
  }

  const categoryMeta: Record<ReminderItem['category'], { label: string; icon: JSX.Element; color: string }> = {
    cheque: { label: 'چک', icon: <Banknote size={14} />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
    installment: { label: 'قسط', icon: <CreditCard size={14} />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    lab: { label: 'لابراتوار', icon: <FlaskConical size={14} />, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30' },
    implant: { label: 'ایمپلنت', icon: <Bone size={14} />, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
    manual: { label: 'یادآوری دستی', icon: <StickyNote size={14} />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    appointment: { label: 'نوبت', icon: <CalendarClock size={14} />, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
    personal: { label: 'مالی شخصی', icon: <Banknote size={14} />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' },
    post_op: { label: 'پیگیری جراحی (۲۴-۴۸h)', icon: <HeartPulse size={14} />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' },
    suture: { label: 'کشیدن بخیه', icon: <Scissors size={14} />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    hygiene: { label: 'چکاپ دوره‌ای ۶ ماهه', icon: <Smile size={14} />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
  }

  const openCreateModal = () => {
    h.tap()
    setEditingReminder(null)
    setForm({ patient_id: '', title: '', amount: '', due_date: new Date().toISOString().slice(0, 10), notes: '' })
    setModalOpen(true)
  }

  const openEditModal = (mr: ManualReminder) => {
    h.tap()
    setEditingReminder(mr)
    setForm({ patient_id: mr.patient_id || '', title: mr.title, amount: mr.amount != null ? String(mr.amount) : '', due_date: mr.due_date, notes: mr.notes || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('error', 'عنوان یادآوری الزامی است'); return }
    if (!form.due_date) { showToast('error', 'تاریخ سررسید الزامی است'); return }
    setSaving(true)
    try {
      const payload = {
        patient_id: form.patient_id || null,
        title: form.title.trim(),
        amount: form.amount ? Number(form.amount) : null,
        due_date: form.due_date,
        notes: form.notes || null,
        status: 'pending' as const,
      }
      if (editingReminder) {
        await updateManualReminder(editingReminder.id, payload)
        chimes.playSuccess()
        showToast('success', 'یادآوری ویرایش شد')
      } else {
        await createManualReminder(payload)
        chimes.playSuccess()
        showToast('success', 'یادآوری ثبت شد')
      }
      setModalOpen(false)
      await loadData()
    } catch { 
      chimes.playWarning()
      showToast('error', 'خطا در ذخیره') 
    }
    finally { setSaving(false) }
  }

  // Marking done/cancelled keeps the record forever (clinic policy: never
  // delete) — it just leaves the active reminders list.
  const handleResolve = async (mr: ManualReminder, status: 'completed' | 'cancelled') => {
    h.tap()
    try {
      await updateManualReminder(mr.id, { status })
      chimes.playPop()
      showToast('success', status === 'completed' ? 'انجام‌شده علامت خورد' : 'لغو شد')
      await loadData()
    } catch { 
      chimes.playWarning()
      showToast('error', 'خطا') 
    }
  }

  const handleSendSms = async (it: ReminderItem) => {
    const phone = patients.find((p) => `${p.first_name} ${p.last_name}` === it.patientName)?.phone
    if (!phone) { showToast('error', 'شماره تلفن این بیمار ثبت نشده'); return }
    setSendingSmsId(it.id)
    h.tap()
    const categoryLabel: Record<ReminderItem['category'], string> = {
      cheque: 'چک', installment: 'قسط', lab: 'سفارش لابراتوار',
      implant: 'مرحله ایمپلنت', manual: 'یادآوری', appointment: 'نوبت', personal: 'مالی',
      post_op: 'پیگیری جراحی', suture: 'کشیدن بخیه', hygiene: 'چکاپ دوره‌ای',
    }
    const when = it.daysLeft === 0 ? 'امروز' : it.daysLeft < 0 ? `${toPersianDigits(Math.abs(it.daysLeft))} روز پیش` : `${toPersianDigits(it.daysLeft)} روز دیگر`
    const message = it.smsTemplate || `${it.patientName} عزیز، یادآوری ${categoryLabel[it.category]}: ${it.title} — سررسید ${when}${it.amount ? ' — مبلغ ' + formatCurrency(it.amount) + ' تومان' : ''}. کلینیک دندانپزشکی مینا`
    try {
      const { error } = await supabase.functions.invoke('send-sms', { body: { to: phone, message, type: 'reminder' } })
      if (error) throw error
      chimes.playSuccess()
      showToast('success', 'پیامک یادآوری ارسال شد')
    } catch { 
      chimes.playWarning()
      showToast('error', 'خطا در ارسال پیامک') 
    }
    finally { setSendingSmsId(null) }
  }


  return (
    <div className="space-y-4">
      <ModuleHeader
        moduleKey="reminders"
        title="یادآوری‌ها"
        subtitle="همه‌ی سررسیدهای فعال، یک‌جا"
        action={<Button onClick={openCreateModal} variant="primary" size="sm"><Plus size={16} className="inline ml-1" /> یادآوری دستی</Button>}
      />

      {notifPermission !== 'unsupported' && notifPermission !== 'granted' && (
        <Card className="p-4 border-2 border-warning-200 bg-warning-50 dark:bg-warning-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center shrink-0">
              <Bell size={18} className="text-warning-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-warning-700 dark:text-warning-400">نوتیفیکیشن واقعی گوشی</p>
              <p className="text-[11px] text-warning-600 dark:text-warning-500">برای دریافت هشدار فوری روی گوشی، اجازه‌ی نوتیفیکیشن را فعال کنید</p>
            </div>
            <Button size="sm" variant="primary" onClick={handleEnableNotifications}>فعال‌سازی</Button>
          </div>
        </Card>
      )}
      {notifPermission === 'denied' && (
        <Card className="p-3 bg-slate-50 dark:bg-slate-800/60">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5"><BellOff size={13} /> نوتیفیکیشن مسدود شده — از تنظیمات مرورگر/گوشی فعالش کنید</p>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 size={15} className="text-slate-400" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">آستانه‌ی هشدار فوری</p>
        </div>
        <Select
          value={leadDays}
          onChange={updateLeadDays}
          options={[{ value: '1', label: '۱ روز قبل' }, { value: '3', label: '۳ روز قبل' }, { value: '7', label: '۷ روز قبل' }, { value: '14', label: '۱۴ روز قبل' }]}
        />
        <p className="text-[11px] text-slate-400 mt-1.5">مواردی که کمتر از این فاصله تا سررسید دارند، «فوری» علامت‌گذاری می‌شوند.</p>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Card className="p-3.5">
          <p className="text-[11px] text-slate-400">کل یادآوری‌های فعال</p>
          <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{toPersianDigits(items.length)}</p>
        </Card>
        <Card className="p-3.5 border-2 border-error-200">
          <p className="text-[11px] text-error-500">فوری (زیر آستانه)</p>
          <p className="text-xl font-extrabold text-error-600">{toPersianDigits(urgentCount)}</p>
        </Card>
      </div>

      {retentionSummary && (
        <Card className="p-4 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/70 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">شاخص وفاداری و ماندگاری بیماران (CRM Retention)</h3>
                <p className="text-[11px] text-slate-500">پایش هوشمند مراجعات، نرخ ریزش و یادآوری‌های کلینیکی</p>
              </div>
            </div>
            <Badge color={retentionSummary.retentionRatePercent >= 80 ? 'success' : retentionSummary.retentionRatePercent >= 60 ? 'warning' : 'error'}>
              نرخ ماندگاری کلینیک: {toPersianDigits(retentionSummary.retentionRatePercent)}٪
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500">بیماران وفادار</span>
              <p className="text-base font-extrabold text-emerald-600 mt-0.5">{toPersianDigits(retentionSummary.loyalCount)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500">پایدار و عادی</span>
              <p className="text-base font-extrabold text-primary-600 mt-0.5">{toPersianDigits(retentionSummary.stableCount)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-amber-200/60 dark:border-amber-900/40">
              <span className="text-[11px] text-amber-600">در معرض ریزش</span>
              <p className="text-base font-extrabold text-amber-600 mt-0.5">{toPersianDigits(retentionSummary.atRiskCount)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-200/60 dark:border-rose-900/40">
              <span className="text-[11px] text-rose-600">ریزش‌کرده (بازگشت)</span>
              <p className="text-base font-extrabold text-rose-600 mt-0.5">{toPersianDigits(retentionSummary.churnedCount)}</p>
            </div>
          </div>

          {retentionSummary.atRiskPatients.length > 0 && (
            <div className="mt-3 pt-3 border-t border-indigo-100/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle size={13} className="shrink-0" />
                {toPersianDigits(retentionSummary.atRiskPatients.length)} بیمار نیازمند ارتباط و پیگیری ویژه جهت پیشگیری از ریزش
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  h.tap()
                  chimes.playPop()
                  setAtRiskModalOpen(true)
                }}
              >
                مشاهده لیست بیماران ({toPersianDigits(retentionSummary.atRiskPatients.length)}) <ChevronRight size={14} className="mr-0.5 inline" />
              </Button>
            </div>
          )}
        </Card>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'cheque', 'installment', 'lab', 'implant', 'manual', 'appointment', 'personal', 'post_op', 'suture', 'hygiene'] as const).map((f) => (
          <button key={f} onClick={() => { h.select(); setFilter(f) }} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-650'}`}>
            {f === 'all' ? 'همه' : categoryMeta[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner size={24} /></div>
      ) : filteredItems.length === 0 ? (
        <EmptyState icon={<CalendarClock size={28} />} title="یادآوری فعالی نیست" description="همه‌چیز تسویه و به‌روز است" />
      ) : (
        <div className="space-y-2">
          {filteredItems.map((it) => {
            const meta = categoryMeta[it.category]
            const isUrgent = it.daysLeft <= Number(leadDays)
            return (
              <Card key={it.id} className={`p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border ${isUrgent ? 'border-2 border-error-300 dark:border-error-700/80 shadow-sm' : 'border-slate-200/80 dark:border-slate-800'} hover:shadow-md transition-all`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color} ${it.manualSource ? 'cursor-pointer' : ''}`}
                    onClick={it.manualSource ? () => openEditModal(it.manualSource!) : undefined}
                  >
                    {meta.icon}
                  </div>
                  <div className={`flex-1 min-w-0 ${it.manualSource ? 'cursor-pointer' : ''}`} onClick={it.manualSource ? () => openEditModal(it.manualSource!) : undefined}>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{it.title} — {it.patientName}</p>
                    <p className="text-[11px] text-slate-400">
                      {toJalaliStringPretty(it.dueDate)}
                      {it.amount ? ` — ${formatCurrency(it.amount)} ت` : ''}
                      {isUrgent && <span className="text-error-600 font-bold"> — {it.daysLeft < 0 ? `${toPersianDigits(Math.abs(it.daysLeft))} روز تاخیر` : it.daysLeft === 0 ? 'امروز' : `${toPersianDigits(it.daysLeft)} روز مانده`}</span>}
                    </p>
                    {it.manualSource?.notes && <p className="text-[11px] text-slate-400 mt-0.5">{it.manualSource.notes}</p>}
                  </div>
                  {it.manualSource ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleResolve(it.manualSource!, 'completed')} title="انجام شد" className="p-2 rounded-lg bg-success-50 dark:bg-success-900/30 text-success-600"><Check size={16} /></button>
                      <button onClick={() => handleResolve(it.manualSource!, 'cancelled')} title="لغو" className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500"><XIcon size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      {it.actionPath && (
                        <button
                          onClick={() => { h.tap(); navigate(it.actionPath!) }}
                          className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                          title={it.actionNeeded || 'انتقال به بخش مربوطه'}
                        >
                          <ExternalLink size={16} />
                        </button>
                      )}
                      {(() => {
                        const pat = patients.find((p) => `${p.first_name} ${p.last_name}` === it.patientName)
                        if (!pat?.phone) return null
                        const cleanPhone = pat.phone.replace(/\D/g, '').replace(/^0/, '98')
                        const when = it.daysLeft === 0 ? 'امروز' : it.daysLeft < 0 ? `${toPersianDigits(Math.abs(it.daysLeft))} روز پیش` : `${toPersianDigits(it.daysLeft)} روز دیگر`
                        const categoryLabel: Record<ReminderItem['category'], string> = {
                          cheque: 'چک', installment: 'قسط', lab: 'سفارش لابراتوار',
                          implant: 'مرحله ایمپلنت', manual: 'یادآوری', appointment: 'نوبت', personal: 'مالی',
                          post_op: 'پیگیری جراحی', suture: 'کشیدن بخیه', hygiene: 'چکاپ دوره‌ای',
                        }
                        const waText = it.smsTemplate || `${it.patientName} عزیز، یادآوری کلینیک دندانپزشکی مینا (${categoryLabel[it.category]}): ${it.title} — سررسید ${when}${it.amount ? ' — مبلغ ' + formatCurrency(it.amount) + ' تومان' : ''}.`
                        return (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            title="ارسال پیام سریع در واتساپ / پیام‌رسان"
                          >
                            <MessageSquare size={16} />
                          </a>
                        )
                      })()}
                      <button
                        onClick={() => handleSendSms(it)}
                        disabled={sendingSmsId === it.id}
                        className="p-2 rounded-lg bg-success-50 dark:bg-success-900/30 text-success-600 disabled:opacity-50"
                        title="ارسال پیامک یادآوری"
                      >
                        {sendingSmsId === it.id ? <Spinner size={16} /> : <Send size={16} />}
                      </button>
                      <button
                        onClick={() => downloadICSReminder({ title: `${it.title} — ${it.patientName}`, description: it.amount ? `مبلغ: ${formatCurrency(it.amount)} تومان` : undefined, dueDate: it.dueDate, filename: `reminder-${it.id}.ics` })}
                        className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600"
                        title="افزودن به تقویم گوشی"
                      >
                        <CalendarClock size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingReminder ? 'ویرایش یادآوری' : 'یادآوری دستی جدید'}>
        <div className="space-y-3 p-1">
          <p className="text-xs text-slate-500">مثلاً: «بیمار گفت بیستم ماه بعد ۵۰ میلیون تومان می‌آورد» — بدون نیاز به ثبت چک یا قسط رسمی.</p>
          <PatientSelect label="بیمار (اختیاری)" allowEmpty value={form.patient_id} onChange={(v) => setForm((p) => ({ ...p, patient_id: v }))} patients={patients} />
          <Input label="عنوان یادآوری" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="مثلاً: قول پرداخت نقدی" />
          <CurrencyInput label="مبلغ (تومان، اختیاری)" value={form.amount} onChange={(v) => setForm((p) => ({ ...p, amount: v }))} />
          <PersianDateInput label="تاریخ سررسید" value={form.due_date} onChange={(v) => setForm((p) => ({ ...p, due_date: v }))} />
          <Textarea label="یادداشت (اختیاری)" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} rows={3} />
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Spinner size={16} /> : editingReminder ? 'ذخیره‌ی تغییرات' : 'ثبت یادآوری'}
          </Button>
        </div>
      </Modal>

      {/* At-Risk Patients CRM Outreach Modal */}
      <Modal
        open={atRiskModalOpen}
        onClose={() => setAtRiskModalOpen(false)}
        title="مرکز پیشگیری از ریزش و فراخوان مراجعین (CRM Outreach)"
      >
        <div className="space-y-3 p-1 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            بیمارانی که درمان نیمه‌کاره رها شده دارند، نوبت‌های متوالی لغو کرده‌اند یا فاصله طولانی از آخرین حضورشان سپری شده است:
          </p>

          {retentionSummary?.atRiskPatients && retentionSummary.atRiskPatients.length > 0 ? (
            <div className="space-y-2.5">
              {retentionSummary.atRiskPatients.map((profile) => {
                const pat = patients.find((p) => p.id === profile.patientId)
                if (!pat) return null
                const fullName = `${pat.first_name} ${pat.last_name}`
                const isChurned = profile.tier === 'churned'
                const cleanPhone = pat.phone ? pat.phone.replace(/\D/g, '').replace(/^0/, '98') : ''
                const waMessage = `${pat.first_name} عزیز، از کلینیک دندانپزشکی مینا با شما در تماس هستیم. پیرو روند درمانی قبلی و جهت بررسی وضعیت سلامت دندان‌ها، مایل به تنظیم نوبت جدید برای شما هستیم.`

                return (
                  <Card
                    key={profile.patientId}
                    className={`p-3.5 rounded-2xl border ${
                      isChurned
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
                        : 'border-amber-300 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{fullName}</span>
                          <Badge color={profile.tierColor}>
                            {profile.tierLabel} (امتیاز: {toPersianDigits(profile.score)}٪)
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          آخرین حضور: {toPersianDigits(profile.daysSinceLastVisit)} روز پیش
                          {profile.outstandingBalance > 0 && ` — مانده بدهی: ${formatCurrency(profile.outstandingBalance)} تومان`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {pat.phone && (
                          <>
                            <a
                              href={`tel:${pat.phone}`}
                              className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
                              title={`تماس تلفنی با ${fullName}`}
                            >
                              <Phone size={15} />
                            </a>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="پیامک / پیام در واتساپ"
                              >
                                <MessageSquare size={15} />
                              </a>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => {
                            h.tap()
                            setAtRiskModalOpen(false)
                            navigate(`/patients/${profile.patientId}`)
                          }}
                          className="p-2 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 hover:bg-primary-200 transition-colors"
                          title="مشاهده پرونده کامل بیمار"
                        >
                          <ExternalLink size={15} />
                        </button>
                      </div>
                    </div>

                    {profile.riskFactors && profile.riskFactors.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1">
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">عوامل ریسک شناسایی‌شده:</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.riskFactors.map((rf, rIdx) => (
                            <span key={rIdx} className="text-[10px] bg-white dark:bg-slate-850 px-2 py-0.5 rounded-md text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/40">
                              • {rf}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-white/60 dark:bg-slate-850/60 p-2 rounded-xl">
                      <span className="font-bold text-primary-600 dark:text-primary-400 shrink-0">اقدام پیشنهادی هوش بالینی:</span>
                      <span className="truncate">{profile.recommendedAction}</span>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">هیچ بیماری در وضعیت پرخطر یا ریزش قرار ندارد.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
