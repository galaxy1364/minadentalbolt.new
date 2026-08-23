// Calendar.tsx — Unified Persian calendar command center: aggregates
// appointments, lab order deadlines, treatment-phase timelines, and
// implant surgery dates into one place, per the user's explicit request
// for this to be "مغز برنامه" (the brain of the app).
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar as CalIcon, Clock, FlaskConical, Layers, Bone, User, Users, CalendarPlus, DollarSign, BellRing } from 'lucide-react'
import { fetchAppointments, fetchLabOrders, fetchTreatmentPhases, fetchImplantCases, fetchPatients } from '../lib/api'
import { toJalaliStringPretty, toPersianDigits, toJalaliString, getHoliday, todayLocalISO } from '../lib/persianDate'
import { PersianCalendar } from '../components/PersianCalendar'
import { Card, Spinner, EmptyState, Badge } from '../components/ui'
import { ModuleHeader } from '../components/ModuleHeader'
import { h } from '../lib/haptics'
import type { AppointmentWithRelations, LabOrder, TreatmentPhase, ImplantCaseWithRelations, Patient } from '../types'

type CalEvent = {
  id: string
  date: string
  type: 'appointment' | 'lab_deadline' | 'phase' | 'implant_surgery'
  title: string
  subtitle: string
  status?: string
  patientId?: string
  doctorColorHex?: string
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [phases, setPhases] = useState<TreatmentPhase[]>([])
  const [implantCases, setImplantCases] = useState<ImplantCaseWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedDate, setSelectedDate] = useState(todayLocalISO())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [appts, labs, ph, impl, pats] = await Promise.all([
          fetchAppointments(), fetchLabOrders(), fetchTreatmentPhases(), fetchImplantCases(), fetchPatients(),
        ])
        setAppointments(appts)
        setLabOrders(labs as unknown as LabOrder[])
        setPhases(ph)
        setImplantCases(impl)
        setPatients(pats)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const patientName = (id: string) => {
    const p = patients.find((pp) => pp.id === id)
    return p ? `${p.first_name} ${p.last_name}` : 'بیمار'
  }

  // ── Build the unified event feed ────────────────────────────────
  const allEvents = useMemo(() => {
    const events: CalEvent[] = []
    for (const a of appointments) {
      if (a.status === 'cancelled') continue
      events.push({
        id: `appt-${a.id}`, date: a.date, type: 'appointment',
        title: a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'نوبت',
        subtitle: `ساعت ${toPersianDigits(a.start_time)}`, status: a.status, patientId: a.patient_id,
        doctorColorHex: a.doctor?.color || undefined,
      })
    }
    for (const l of labOrders) {
      if (!l.deadline || l.status === 'delivered' || l.status === 'cancelled') continue
      events.push({
        id: `lab-${l.id}`, date: l.deadline, type: 'lab_deadline',
        title: `مهلت لابراتوار — ${patientName(l.patient_id)}`,
        subtitle: l.work_type || 'کار لابراتوار', status: l.status, patientId: l.patient_id,
      })
    }
    for (const p of phases) {
      if (!p.end_date || p.status === 'completed') continue
      events.push({
        id: `phase-${p.id}`, date: p.end_date, type: 'phase',
        title: `پایان فاز ${toPersianDigits(p.phase_number)} — ${patientName(p.patient_id)}`,
        subtitle: p.title || 'فاز درمان', status: p.status, patientId: p.patient_id,
      })
    }
    for (const c of implantCases) {
      if (!c.surgery_date) continue
      events.push({
        id: `implant-${c.id}`, date: c.surgery_date, type: 'implant_surgery',
        title: `جراحی ایمپلنت — ${patientName(c.patient_id)}`,
        subtitle: `دندان ${c.tooth_number ? toPersianDigits(c.tooth_number) : '-'}`, status: c.stage || undefined, patientId: c.patient_id,
      })
    }
    return events
  }, [appointments, labOrders, phases, implantCases, patients])

  const eventsOnSelectedDate = useMemo(
    () => allEvents.filter((e) => e.date === selectedDate).sort((a, b) => a.type.localeCompare(b.type)),
    [allEvents, selectedDate],
  )

  const highlightDates = useMemo(
    () => Array.from(new Set(allEvents.filter((e) => e.type !== 'appointment').map((e) => e.date))),
    [allEvents],
  )

  const eventTypeMeta: Record<CalEvent['type'], { icon: JSX.Element; color: string; label: string }> = {
    appointment: { icon: <CalIcon size={14} />, color: 'bg-amber-100 text-amber-700', label: 'نوبت' },
    lab_deadline: { icon: <FlaskConical size={14} />, color: 'bg-cyan-100 text-cyan-700', label: 'مهلت لابراتوار' },
    phase: { icon: <Layers size={14} />, color: 'bg-violet-100 text-violet-700', label: 'فاز درمان' },
    implant_surgery: { icon: <Bone size={14} />, color: 'bg-blue-100 text-blue-700', label: 'جراحی ایمپلنت' },
  }

  // Every event carries patientId — routing to that specific patient's
  // file (where their appointments/lab work/implant cases are all
  // visible in context) is a real destination, unlike dumping someone on
  // the generic module list and making them search for the one record
  // they tapped. True per-record deep-linking (e.g. straight into one
  // specific lab order's edit view) would need each destination page to
  // support opening a record by id from the URL, which none of them do
  // yet — this is the meaningful improvement achievable without that.
  const eventTarget = (e: CalEvent): string => e.patientId ? `/patients/${e.patientId}` : '/patients'

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        moduleKey="calendar"
        title="تقویم"
        subtitle="همه‌ی نوبت‌ها، مهلت‌ها و رویدادهای درمانی در یک نگاه"
      />

      {/* Quick access — the calendar as the system's hub: one tap to any
          module, not just to the specific events already listed below. */}
      <div className="flex items-center gap-2 overflow-x-auto dock-scroll pb-1 -mx-1 px-1">
        {[
          { path: '/patients', label: 'بیماران', icon: <Users size={15} /> },
          { path: '/appointments', label: 'نوبت‌دهی', icon: <CalendarPlus size={15} /> },
          { path: '/billing', label: 'مالی', icon: <DollarSign size={15} /> },
          { path: '/laboratory', label: 'لابراتوار', icon: <FlaskConical size={15} /> },
          { path: '/implants', label: 'ایمپلنت', icon: <Bone size={15} /> },
          { path: '/reminders', label: 'یادآوری‌ها', icon: <BellRing size={15} /> },
        ].map((m) => (
          <button
            key={m.path}
            onClick={() => { h.tap(); navigate(m.path) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 active:scale-95 transition-all-smooth"
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <PersianCalendar
        selectedDate={selectedDate}
        onDateSelect={(d) => { h.select(); setSelectedDate(d) }}
        appointments={allEvents.filter((e) => e.type === 'appointment').map((e) => ({ date: e.date, status: e.status || 'scheduled' }))}
        highlightDates={highlightDates}
      />

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          رویدادهای {toJalaliStringPretty(selectedDate)}
          {getHoliday(toJalaliString(selectedDate)) && (
            <span className="status-pill bg-error-50 text-error-600">{getHoliday(toJalaliString(selectedDate))}</span>
          )}
        </h3>

        {eventsOnSelectedDate.length === 0 ? (
          <Card className="p-4"><EmptyState icon={<CalIcon size={24} />} title="رویدادی در این روز نیست" /></Card>
        ) : (
          <div className="space-y-2">
            {eventsOnSelectedDate.map((e) => {
              const meta = eventTypeMeta[e.type]
              return (
                <Card key={e.id} className="p-3 cursor-pointer hover:shadow-md transition-all-smooth">
                  <div className="flex items-center gap-3" onClick={() => navigate(eventTarget(e))}>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${e.doctorColorHex ? '' : meta.color}`}
                      style={e.doctorColorHex ? { background: `${e.doctorColorHex}22`, color: e.doctorColorHex } : undefined}
                    >
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{e.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{e.subtitle}</p>
                    </div>
                    <Badge color="slate">{meta.label}</Badge>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
