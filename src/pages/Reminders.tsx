// Reminders.tsx — مرکز یادآوری یکپارچه: aggregates every date-driven
// reminder across the whole app (cheques due, installments due, lab
// deadlines, implant surgeries) into one place, with real phone-
// calendar alarms (.ics export) and a lead-time setting, instead of
// each module only surfacing its own reminders separately.
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Banknote, CreditCard, FlaskConical, Bone, Settings2, Bell, BellOff, Plus, StickyNote, Check, X as XIcon } from 'lucide-react'
import { ModuleHeader } from '../components/ModuleHeader'
import { Card, Button, Badge, Spinner, EmptyState, Select, Modal, Input, Textarea, showToast } from '../components/ui'
import { CurrencyInput } from '../components/CurrencyInput'
import { PersianDateInput } from '../components/PersianDateInput'
import { fetchCheques, fetchAllInstallments, fetchLabOrders, fetchImplantCases, fetchPatients, fetchManualReminders, createManualReminder, updateManualReminder, fetchAppointments } from '../lib/api'
import { toJalaliStringPretty, toPersianDigits, formatCurrency } from '../lib/persianDate'
import { downloadICSReminder } from '../lib/icsReminder'
import { requestNotificationPermission, getNotificationPermission, notifyOnceForReminder } from '../lib/notifications'
import { h } from '../lib/haptics'
import type { Patient, ManualReminder } from '../types'

const LEAD_DAYS_KEY = 'minadent-reminder-lead-days'

interface ReminderItem {
  id: string
  category: 'cheque' | 'installment' | 'lab' | 'implant' | 'manual' | 'appointment'
  title: string
  patientName: string
  dueDate: string
  amount?: number
  daysLeft: number
  /** Set only for category==='manual' — lets tapping the card open it for
   * editing (formal records like cheques/installments are edited from
   * their own module, not from here). */
  manualSource?: ManualReminder
}

export default function Reminders() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ReminderItem[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [leadDays, setLeadDays] = useState(() => localStorage.getItem(LEAD_DAYS_KEY) || '3')
  const [filter, setFilter] = useState<'all' | ReminderItem['category']>('all')
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission())

  // Manual reminder create/edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<ManualReminder | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ patient_id: '', title: '', amount: '', due_date: '', notes: '' })

  const loadData = () => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    return Promise.all([fetchCheques(), fetchAllInstallments(), fetchLabOrders(), fetchImplantCases(), fetchPatients(), fetchManualReminders(), fetchAppointments(today)])
      .then(([cheques, installments, labOrders, implantCases, pats, manualReminders, appointments]) => {
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
          if (!im.surgery_date || im.surgery_date < today) continue
          list.push({ id: `implant-${im.id}`, category: 'implant', title: 'جراحی ایمپلنت', patientName: patientName(im.patient_id), dueDate: im.surgery_date, daysLeft: daysLeft(im.surgery_date) })
        }
        // Manual reminders — free-form, patient-optional, fully editable.
        // Exactly for cases like "patient said they'd bring 50M on the
        // 20th of next month" that aren't a formal cheque/installment yet.
        for (const mr of manualReminders) {
          if (mr.status !== 'pending') continue
          list.push({ id: `manual-${mr.id}`, category: 'manual', title: mr.title, patientName: patientName(mr.patient_id), dueDate: mr.due_date, amount: mr.amount || undefined, daysLeft: daysLeft(mr.due_date), manualSource: mr })
        }
        // Upcoming appointments — including long-range recall/follow-up
        // bookings (e.g. 'come back in 1/3/4 months') that were
        // previously invisible here entirely; staff had to remember to
        // check Appointments/Calendar separately for anything far out.
        // Only surfaced within 14 days of their date — a follow-up
        // booked 3 months out isn't 'urgent' yet and would otherwise
        // flood this list with routine day-to-day bookings; it appears
        // here (and starts sending the escalating notifications below)
        // automatically once it enters that window, so nothing far out
        // needs manual tracking in the meantime.
        for (const a of appointments as any[]) {
          if (a.status === 'cancelled' || a.status === 'completed' || a.status === 'no_show') continue
          const dl = daysLeft(a.date)
          if (dl > 14) continue
          list.push({ id: `appt-${a.id}`, category: 'appointment', title: 'نوبت', patientName: patientName(a.patient_id), dueDate: a.date, daysLeft: dl })
        }
        list.sort((a, b) => a.daysLeft - b.daysLeft)
        setItems(list)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const updateLeadDays = (v: string) => { setLeadDays(v); localStorage.setItem(LEAD_DAYS_KEY, v) }

  const filteredItems = useMemo(() => items.filter((it) => filter === 'all' || it.category === filter), [items, filter])
  const urgentCount = items.filter((it) => it.daysLeft <= Number(leadDays)).length

  // Real OS notifications — escalating tiers per item, not a single flat
  // threshold: 3 days before, 1 day before, the due day itself, and a
  // distinct daily 'overdue' alert that keeps firing every day it stays
  // unresolved (never just once) so a slipped payment can't quietly fall
  // through the cracks. Each tier uses its own notification id (see
  // notifyOnceForReminder's per-day dedup), so all four can fire
  // independently as an item crosses each threshold — this is separate
  // from the 'leadDays' setting below, which only controls the visual
  // 'urgent' highlight in the list, not which alerts actually fire.
  useEffect(() => {
    if (notifPermission !== 'granted') return
    const categoryLabel = { cheque: 'چک', installment: 'قسط', lab: 'لابراتوار', implant: 'ایمپلنت', manual: 'یادآوری', appointment: 'نوبت' }
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
    cheque: { label: 'چک', icon: <Banknote size={14} />, color: 'text-purple-600 bg-purple-50' },
    installment: { label: 'قسط', icon: <CreditCard size={14} />, color: 'text-blue-600 bg-blue-50' },
    lab: { label: 'لابراتوار', icon: <FlaskConical size={14} />, color: 'text-cyan-600 bg-cyan-50' },
    implant: { label: 'ایمپلنت', icon: <Bone size={14} />, color: 'text-indigo-600 bg-indigo-50' },
    manual: { label: 'یادآوری دستی', icon: <StickyNote size={14} />, color: 'text-amber-600 bg-amber-50' },
    appointment: { label: 'نوبت', icon: <CalendarClock size={14} />, color: 'text-teal-600 bg-teal-50' },
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
        showToast('success', 'یادآوری ویرایش شد')
      } else {
        await createManualReminder(payload)
        showToast('success', 'یادآوری ثبت شد')
      }
      setModalOpen(false)
      await loadData()
    } catch { showToast('error', 'خطا در ذخیره') }
    finally { setSaving(false) }
  }

  // Marking done/cancelled keeps the record forever (clinic policy: never
  // delete) — it just leaves the active reminders list.
  const handleResolve = async (mr: ManualReminder, status: 'completed' | 'cancelled') => {
    h.tap()
    try {
      await updateManualReminder(mr.id, { status })
      showToast('success', status === 'completed' ? 'انجام‌شده علامت خورد' : 'لغو شد')
      await loadData()
    } catch { showToast('error', 'خطا') }
  }

  const patientOptions = [{ value: '', label: 'بدون بیمار مشخص' }, ...patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))]

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

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'cheque', 'installment', 'lab', 'implant', 'manual', 'appointment'] as const).map((f) => (
          <button key={f} onClick={() => { h.select(); setFilter(f) }} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filter === f ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
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
              <Card key={it.id} className={`p-3.5 ${isUrgent ? 'border-2 border-error-200' : ''}`}>
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
                    <button
                      onClick={() => downloadICSReminder({ title: `${it.title} — ${it.patientName}`, description: it.amount ? `مبلغ: ${formatCurrency(it.amount)} تومان` : undefined, dueDate: it.dueDate, filename: `reminder-${it.id}.ics` })}
                      className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 shrink-0"
                      title="افزودن به تقویم گوشی"
                    >
                      <CalendarClock size={16} />
                    </button>
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
          <Select label="بیمار (اختیاری)" value={form.patient_id} onChange={(v) => setForm((p) => ({ ...p, patient_id: v }))} options={patientOptions} />
          <Input label="عنوان یادآوری" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="مثلاً: قول پرداخت نقدی" />
          <CurrencyInput label="مبلغ (تومان، اختیاری)" value={form.amount} onChange={(v) => setForm((p) => ({ ...p, amount: v }))} />
          <PersianDateInput label="تاریخ سررسید" value={form.due_date} onChange={(v) => setForm((p) => ({ ...p, due_date: v }))} />
          <Textarea label="یادداشت (اختیاری)" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} rows={3} />
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Spinner size={16} /> : editingReminder ? 'ذخیره‌ی تغییرات' : 'ثبت یادآوری'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
