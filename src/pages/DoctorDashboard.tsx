// DoctorDashboard.tsx — "برنامه مخصوص پزشک": a focused view for a
// logged-in doctor, showing THEIR OWN schedule/patients/earnings
// instead of the clinic-wide admin dashboard. Real feature gap found
// comparing against minadent.ir's doctor-specific mobile app.
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Users, Wallet, Stethoscope, ChevronLeft, Clock } from 'lucide-react'
import { fetchAppointments, fetchTreatments, fetchWaitingList, fetchLabOrders } from '../lib/api'
import { toJalaliStringPretty, toPersianDigits, formatCurrency, formatTime } from '../lib/persianDate'
import { Card, Badge } from '../components/ui'
import { h } from '../lib/haptics'
import type { AppointmentWithRelations, Treatment, WaitingListEntry, LabOrder } from '../types'

export default function DoctorDashboard({ doctorId, doctorName }: { doctorId: string; doctorName: string }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])

  useEffect(() => {
    Promise.all([fetchAppointments(), fetchTreatments(), fetchWaitingList(), fetchLabOrders()])
      .then(([appts, trts, wait, labs]) => {
        setAppointments(appts.filter((a) => a.doctor_id === doctorId))
        setTreatments(trts.filter((t) => t.doctor_id === doctorId))
        setWaitingList(wait.filter((w) => w.doctor_id === doctorId && w.status === 'waiting'))
        setLabOrders((labs as unknown as LabOrder[]).filter((l) => l.doctor_id === doctorId && l.status !== 'delivered' && l.status !== 'cancelled'))
      })
      .finally(() => setLoading(false))
  }, [doctorId])

  const todayStr = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const todayAppointments = useMemo(
    () => appointments.filter((a) => a.date === todayStr && a.status !== 'cancelled').sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments, todayStr],
  )

  const monthProduction = useMemo(
    () => treatments.filter((t) => t.created_at >= monthStart && t.status !== 'cancelled').reduce((s, t) => s + (t.total_price || 0), 0),
    [treatments, monthStart],
  )

  // 'pendingTreatments' means work not yet done — a cancelled treatment
  // isn't pending work, it's simply not happening, so it must be
  // excluded here too or it would sit in this count forever.
  const pendingTreatments = useMemo(() => treatments.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length, [treatments])

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">سلام</p>
        <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">دکتر {doctorName}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{toJalaliStringPretty(todayStr)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Card className="p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-primary-500" />
            <p className="text-[11px] text-slate-400">نوبت‌های امروز</p>
          </div>
          <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{toPersianDigits(todayAppointments.length)}</p>
        </Card>
        <Card className="p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-amber-500" />
            <p className="text-[11px] text-slate-400">در لیست انتظار</p>
          </div>
          <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{toPersianDigits(waitingList.length)}</p>
        </Card>
        <Card className="p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} className="text-success-500" />
            <p className="text-[11px] text-slate-400">کارکرد این ماه</p>
          </div>
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(monthProduction)} ت</p>
        </Card>
        <Card className="p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope size={16} className="text-sky-500" />
            <p className="text-[11px] text-slate-400">درمان ناتمام</p>
          </div>
          <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{toPersianDigits(pendingTreatments)}</p>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">نوبت‌های امروز</h3>
          <button onClick={() => { h.tap(); navigate('/appointments') }} className="text-xs text-primary-600 flex items-center gap-0.5">همه <ChevronLeft size={12} /></button>
        </div>
        {todayAppointments.length === 0 ? (
          <Card className="p-5 text-center text-sm text-slate-400">نوبتی برای امروز ثبت نشده</Card>
        ) : (
          <div className="space-y-2">
            {todayAppointments.map((a) => (
              <Card key={a.id} className="p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex flex-col items-center justify-center shrink-0">
                  <Clock size={12} className="text-primary-500" />
                  <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400">{formatTime(a.start_time).match(/\d+:\d+/)?.[0] || a.start_time}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'بیمار'}</p>
                  <p className="text-[11px] text-slate-400">{a.type || 'ویزیت'}</p>
                </div>
                <Badge color={a.status === 'completed' ? 'success' : a.status === 'confirmed' ? 'primary' : 'slate'}>{a.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      {labOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">در انتظار لابراتوار</h3>
          <div className="space-y-2">
            {labOrders.slice(0, 5).map((l) => (
              <Card key={l.id} className="p-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">{l.work_type || 'کار لابراتوار'} {l.deadline && `— موعد: ${toJalaliStringPretty(l.deadline)}`}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => navigate('/treatments')} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
          <Stethoscope size={18} className="mx-auto text-primary-500 mb-1" />
          <span className="text-[11px] text-slate-600 dark:text-slate-300">درمان</span>
        </button>
        <button onClick={() => navigate('/prescriptions')} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
          <Users size={18} className="mx-auto text-fuchsia-500 mb-1" />
          <span className="text-[11px] text-slate-600 dark:text-slate-300">نسخه</span>
        </button>
        <button onClick={() => navigate('/radiology')} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
          <Calendar size={18} className="mx-auto text-pink-500 mb-1" />
          <span className="text-[11px] text-slate-600 dark:text-slate-300">رادیولوژی</span>
        </button>
      </div>
    </div>
  )
}
