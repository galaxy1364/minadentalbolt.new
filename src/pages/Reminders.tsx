// Reminders.tsx — مرکز یادآوری یکپارچه: aggregates every date-driven
// reminder across the whole app (cheques due, installments due, lab
// deadlines, implant surgeries) into one place, with real phone-
// calendar alarms (.ics export) and a lead-time setting, instead of
// each module only surfacing its own reminders separately.
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Banknote, CreditCard, FlaskConical, Bone, Settings2 } from 'lucide-react'
import { ModuleHeader } from '../components/ModuleHeader'
import { Card, Button, Badge, Spinner, EmptyState, Select } from '../components/ui'
import { fetchCheques, fetchAllInstallments, fetchLabOrders, fetchImplantCases, fetchPatients } from '../lib/api'
import { toJalaliStringPretty, toPersianDigits, formatCurrency } from '../lib/persianDate'
import { downloadICSReminder } from '../lib/icsReminder'
import { h } from '../lib/haptics'

const LEAD_DAYS_KEY = 'minadent-reminder-lead-days'

interface ReminderItem {
  id: string
  category: 'cheque' | 'installment' | 'lab' | 'implant'
  title: string
  patientName: string
  dueDate: string
  amount?: number
  daysLeft: number
}

export default function Reminders() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ReminderItem[]>([])
  const [leadDays, setLeadDays] = useState(() => localStorage.getItem(LEAD_DAYS_KEY) || '3')
  const [filter, setFilter] = useState<'all' | ReminderItem['category']>('all')

  useEffect(() => {
    Promise.all([fetchCheques(), fetchAllInstallments(), fetchLabOrders(), fetchImplantCases(), fetchPatients()])
      .then(([cheques, installments, labOrders, implantCases, patients]) => {
        const patientName = (id: string) => {
          const p = patients.find((pp) => pp.id === id)
          return p ? `${p.first_name} ${p.last_name}` : 'بیمار'
        }
        const today = new Date().toISOString().slice(0, 10)
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
        list.sort((a, b) => a.daysLeft - b.daysLeft)
        setItems(list)
      })
      .finally(() => setLoading(false))
  }, [])

  const updateLeadDays = (v: string) => { setLeadDays(v); localStorage.setItem(LEAD_DAYS_KEY, v) }

  const filteredItems = useMemo(() => items.filter((it) => filter === 'all' || it.category === filter), [items, filter])
  const urgentCount = items.filter((it) => it.daysLeft <= Number(leadDays)).length

  const categoryMeta: Record<ReminderItem['category'], { label: string; icon: JSX.Element; color: string }> = {
    cheque: { label: 'چک', icon: <Banknote size={14} />, color: 'text-purple-600 bg-purple-50' },
    installment: { label: 'قسط', icon: <CreditCard size={14} />, color: 'text-blue-600 bg-blue-50' },
    lab: { label: 'لابراتوار', icon: <FlaskConical size={14} />, color: 'text-cyan-600 bg-cyan-50' },
    implant: { label: 'ایمپلنت', icon: <Bone size={14} />, color: 'text-indigo-600 bg-indigo-50' },
  }

  return (
    <div className="space-y-4">
      <ModuleHeader moduleKey="reminders" title="یادآوری‌ها" subtitle="همه‌ی سررسیدهای فعال، یک‌جا" />

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
        {(['all', 'cheque', 'installment', 'lab', 'implant'] as const).map((f) => (
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
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{it.title} — {it.patientName}</p>
                    <p className="text-[11px] text-slate-400">
                      {toJalaliStringPretty(it.dueDate)}
                      {it.amount ? ` — ${formatCurrency(it.amount)} ت` : ''}
                      {isUrgent && <span className="text-error-600 font-bold"> — {it.daysLeft < 0 ? `${toPersianDigits(Math.abs(it.daysLeft))} روز تاخیر` : it.daysLeft === 0 ? 'امروز' : `${toPersianDigits(it.daysLeft)} روز مانده`}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadICSReminder({ title: `${it.title} — ${it.patientName}`, description: it.amount ? `مبلغ: ${formatCurrency(it.amount)} تومان` : undefined, dueDate: it.dueDate, filename: `reminder-${it.id}.ics` })}
                    className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 shrink-0"
                    title="افزودن به تقویم گوشی"
                  >
                    <CalendarClock size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
