// MultiChairGrid.tsx — Multi-Chair Operatory Grid View for Dental Appointments
// Displays appointments in parallel columns by dental chair/unit or by doctor
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Plus,
  Stethoscope,
  Armchair,
  Volume2,
  UserCheck,
  FileText,
} from 'lucide-react'
import { AppointmentWithRelations, Unit, Doctor } from '../types'
import { toJalaliStringPretty, toPersianDigits, getJalaliDateInfo, persianWeekdaysShort } from '../lib/persianDate'
import { doctorColor } from '../lib/doctorColors'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { computeWaitingTimeMinutes, formatWaitingTime, getTriageWaitingStatus } from '../lib/operatoryWorkflow'

interface MultiChairGridProps {
  selectedDate: string
  onDateChange: (newDate: string) => void
  units: Unit[]
  doctors: Doctor[]
  appointments: AppointmentWithRelations[]
  onSelectAppointment: (appt: AppointmentWithRelations) => void
  onNewAppointmentAtSlot: (date: string, startTime: string, unitId?: string, doctorId?: string) => void
  onCallPatient?: (appt: AppointmentWithRelations) => void
  onQuickStatus?: (appt: AppointmentWithRelations, newStatus: string) => void
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
]

export function MultiChairGrid({
  selectedDate,
  onDateChange,
  units,
  doctors,
  appointments,
  onSelectAppointment,
  onNewAppointmentAtSlot,
  onCallPatient,
  onQuickStatus,
}: MultiChairGridProps) {
  const navigate = useNavigate()
  const [groupBy, setGroupBy] = React.useState<'unit' | 'doctor'>('unit')

  // Filter appointments for selected day
  const dayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate && a.status !== 'cancelled')
  }, [appointments, selectedDate])

  // Navigate date
  const changeDateByDays = (days: number) => {
    h.tap()
    chimes.playPop()
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    onDateChange(d.toISOString().slice(0, 10))
  }

  const isToday = useMemo(() => {
    return selectedDate === new Date().toISOString().slice(0, 10)
  }, [selectedDate])

  // Active columns
  const columns = useMemo(() => {
    if (groupBy === 'unit') {
      if (units.length > 0) {
        return units.map((u) => ({ id: u.id, title: u.name, subtitle: u.number ? `شماره ${toPersianDigits(u.number)}` : 'یونیت فعال', type: 'unit' as const }))
      }
      // Fallback default units if clinic hasn't set any in DB yet
      return [
        { id: 'unit-1', title: 'یونیت ۱ (اصلی)', subtitle: 'اتاق ۱', type: 'unit' as const },
        { id: 'unit-2', title: 'یونیت ۲ (جراحی)', subtitle: 'اتاق ۲', type: 'unit' as const },
        { id: 'unit-3', title: 'یونیت ۳ (اطفال/مشاوره)', subtitle: 'اتاق ۳', type: 'unit' as const },
      ]
    } else {
      const activeDocs = doctors.filter((d) => d.is_active)
      if (activeDocs.length > 0) {
        return activeDocs.map((d) => ({
          id: d.id,
          title: `دکتر ${d.name || d.specialty || 'پزشک'}`,
          subtitle: d.specialty || 'دندانپزشک',
          type: 'doctor' as const,
        }))
      }
      return [{ id: 'doc-all', title: 'همه پزشکان', subtitle: 'کلینیک', type: 'doctor' as const }]
    }
  }, [groupBy, units, doctors])

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm">
      {/* Top Header & Day Navigation */}
      {/* Top Header & Day Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => changeDateByDays(1)}
            className="flex items-center justify-center min-w-[42px] min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all text-slate-600 dark:text-slate-300 press-scale shadow-xs"
            title="روز بعد"
            aria-label="روز بعد"
          >
            <ChevronRight size={17} />
          </button>
          <button
            type="button"
            onClick={() => {
              h.tap()
              chimes.playPop()
              onDateChange(new Date().toISOString().slice(0, 10))
            }}
            className={`flex items-center justify-center min-h-[42px] px-3.5 rounded-xl text-xs font-extrabold transition-all press-scale ${
              isToday
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => changeDateByDays(-1)}
            className="flex items-center justify-center min-w-[42px] min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all text-slate-600 dark:text-slate-300 press-scale shadow-xs"
            title="روز قبل"
            aria-label="روز قبل"
          >
            <ChevronLeft size={17} />
          </button>

          <div className="mr-2">
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              {toJalaliStringPretty(selectedDate)}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1.5">
              ({persianWeekdaysShort[getJalaliDateInfo(selectedDate).weekday]})
            </span>
          </div>
        </div>

        {/* Group By Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => {
              h.toggle()
              chimes.playPop()
              setGroupBy('unit')
            }}
            className={`flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg font-bold transition-all press-scale ${
              groupBy === 'unit'
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-xs border border-slate-200/60 dark:border-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Armchair size={15} />
            <span>یونیت‌ها (صندلی‌ها)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              h.toggle()
              chimes.playPop()
              setGroupBy('doctor')
            }}
            className={`flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg font-bold transition-all press-scale ${
              groupBy === 'doctor'
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-xs border border-slate-200/60 dark:border-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Stethoscope size={15} />
            <span>پزشکان</span>
          </button>
        </div>
      </div>

      {/* Operatory Grid Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[650px]">
          {/* Header Row */}
          <div className="grid grid-cols-[70px_repeat(auto-fit,minmax(180px,1fr))] border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="text-xs font-bold text-slate-400 text-center self-end pb-1">
              ساعت
            </div>
            {columns.map((col) => (
              <div
                key={col.id}
                className="px-3 py-1.5 text-center border-r first:border-r-0 border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 rounded-t-xl"
              >
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {col.title}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{col.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Time Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {HOURS.map((hour) => {
              const hourPrefix = hour.slice(0, 2)
              return (
                <div
                  key={hour}
                  className="grid grid-cols-[70px_repeat(auto-fit,minmax(180px,1fr))] min-h-[58px]"
                >
                  {/* Time Label */}
                  <div className="text-[11px] font-mono text-slate-400 text-center pt-2 select-none border-l border-slate-100 dark:border-slate-800">
                    {toPersianDigits(hour)}
                  </div>

                  {/* Columns for this hour */}
                  {columns.map((col) => {
                    // Match appointments in this slot & column
                    const matchedAppts = dayAppointments.filter((a) => {
                      const matchesHour = a.start_time.startsWith(hourPrefix)
                      if (groupBy === 'unit') {
                        if (a.unit_id) return matchesHour && a.unit_id === col.id
                        // If unassigned unit, show on first column
                        return matchesHour && col.id === columns[0].id
                      } else {
                        return matchesHour && a.doctor_id === col.id
                      }
                    })

                    return (
                      <div
                        key={col.id}
                        className="relative p-1 border-r first:border-r-0 border-slate-100 dark:border-slate-800/60 hover:bg-primary-50/30 dark:hover:bg-primary-950/10 transition-colors group"
                      >
                        {matchedAppts.length > 0 ? (
                          <div className="space-y-1">
                            {matchedAppts.map((appt) => {
                              const doc = doctors.find((d) => d.id === appt.doctor_id)
                              const patient = appt.patient
                              const docCol = doc ? doctorColor(doc.id) : null

                              return (
                                <div
                                  key={appt.id}
                                  onClick={() => {
                                    h.tap()
                                    chimes.playPop()
                                    onSelectAppointment(appt)
                                  }}
                                  className="p-2 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all-smooth press-scale"
                                  style={{
                                    borderRightWidth: '4px',
                                    borderRightColor: docCol || '#0d9488',
                                  }}
                                >
                                  <div className="flex items-center justify-between text-xs gap-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          h.tap()
                                          if (appt.patient_id) navigate(`/patients/${appt.patient_id}`)
                                        }}
                                        title="مشاهده پرونده کامل بیمار"
                                        className="font-bold text-slate-800 dark:text-slate-100 truncate hover:text-primary-600 dark:hover:text-primary-400 hover:underline text-right cursor-pointer"
                                      >
                                        {patient ? `${patient.first_name} ${patient.last_name}` : 'بیمار'}
                                      </button>
                                      {patient?.file_number && (
                                        <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-900 dark:bg-primary-950 text-white dark:text-primary-300 rounded font-bold" dir="ltr">
                                          {toPersianDigits(patient.file_number)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                      {toPersianDigits(appt.start_time)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 flex-wrap gap-1">
                                    <span className="truncate max-w-[90px]">
                                      {doc ? `دکتر ${doc.name || doc.specialty}` : 'بدون پزشک'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {appt.status === 'arrived' ? (
                                        <>
                                          {appt.check_in_time && (
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${getTriageWaitingStatus(computeWaitingTimeMinutes(appt.check_in_time)).badgeClass}`}
                                              title={`زمان انتظار: ${formatWaitingTime(computeWaitingTimeMinutes(appt.check_in_time))}`}
                                            >
                                              ⏳ {toPersianDigits(computeWaitingTimeMinutes(appt.check_in_time))}د
                                            </span>
                                          )}
                                          {onCallPatient && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                h.tap()
                                                onCallPatient(appt)
                                              }}
                                              className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                                              title="فراخوان صوتی بیمار به یونیت"
                                            >
                                              <Volume2 size={11} />
                                            </button>
                                          )}
                                          {onQuickStatus && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                h.tap()
                                                onQuickStatus(appt, 'in_chair')
                                              }}
                                              className="p-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                                              title="نشاندن بیمار روی صندلی یونیت"
                                            >
                                              <Armchair size={11} />
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                              appt.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : appt.status === 'in_chair' || appt.status === 'in_progress'
                                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold'
                                                : appt.status === 'confirmed'
                                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            {appt.status === 'completed'
                                              ? 'تکمیل'
                                              : appt.status === 'in_chair' || appt.status === 'in_progress'
                                              ? 'روی یونیت'
                                              : appt.status === 'confirmed'
                                              ? 'تایید شده'
                                              : 'رزرو'}
                                          </span>
                                          {(appt.status === 'scheduled' || appt.status === 'confirmed') && onQuickStatus && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                h.tap()
                                                onQuickStatus(appt, 'arrived')
                                              }}
                                              className="p-1 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 hover:bg-teal-100"
                                              title="اعلام حضور بیمار در کلینیک"
                                            >
                                              <UserCheck size={11} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              h.select()
                              chimes.playPop()
                              onNewAppointmentAtSlot(
                                selectedDate,
                                hour,
                                groupBy === 'unit' ? col.id : undefined,
                                groupBy === 'doctor' ? col.id : undefined
                              )
                            }}
                            className="w-full h-full min-h-[38px] rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-all border border-dashed border-primary-300 dark:border-primary-700 press-scale"
                          >
                            <Plus size={12} />
                            رزرو {toPersianDigits(hour)}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
