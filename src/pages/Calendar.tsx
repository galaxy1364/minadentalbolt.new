// Calendar.tsx — Unified Persian calendar command center: aggregates
// appointments, lab order deadlines, treatment-phase timelines, and
// implant surgery dates into one place, per the user's explicit request
// for this to be "مغز برنامه" (the brain of the app).
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar as CalIcon, Clock, FlaskConical, Layers, Bone, User } from 'lucide-react'
import { fetchAppointments, fetchLabOrders, fetchTreatmentPhases, fetchImplantCases, fetchPatients } from '../lib/api'
import { toJalaliStringPretty, toPersianDigits, toJalaliString, getHoliday } from '../lib/persianDate'
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
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [phases, setPhases] = useState<TreatmentPhase[]>([])
  const [implantCases, setImplantCases] = useState<ImplantCaseWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

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

  const eventTarget = (e: CalEvent): string => {
    if (e.type === 'appointment') return '/appointments'
    if (e.type === 'lab_deadline') return '/laboratory'
    if (e.type === 'implant_surgery') return '/implants'
    if (e.type === 'phase' && e.patientId) return `/patients/${e.patientId}`
    return '/patients'
  }

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
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
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
