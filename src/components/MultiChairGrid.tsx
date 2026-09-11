// MultiChairGrid.tsx — Multi-Chair Operatory Grid View for Dental Appointments
// Displays appointments in parallel columns by dental chair/unit or by doctor
import React, { useMemo } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Plus,
  Stethoscope,
  Armchair,
} from 'lucide-react'
import { AppointmentWithRelations, Unit, Doctor } from '../types'
import { toJalaliStringPretty, toPersianDigits, getJalaliDateInfo, persianWeekdaysShort } from '../lib/persianDate'
import { doctorColor } from '../lib/doctorColors'

interface MultiChairGridProps {
  selectedDate: string
  onDateChange: (newDate: string) => void
  units: Unit[]
  doctors: Doctor[]
  appointments: AppointmentWithRelations[]
  onSelectAppointment: (appt: AppointmentWithRelations) => void
  onNewAppointmentAtSlot: (date: string, startTime: string, unitId?: string, doctorId?: string) => void
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
}: MultiChairGridProps) {
  const [groupBy, setGroupBy] = React.useState<'unit' | 'doctor'>('unit')

  // Filter appointments for selected day
  const dayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate && a.status !== 'cancelled')
  }, [appointments, selectedDate])

  // Navigate date
  const changeDateByDays = (days: number) => {
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
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => changeDateByDays(1)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
            title="روز بعد"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDateChange(new Date().toISOString().slice(0, 10))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isToday
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => changeDateByDays(-1)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
            title="روز قبل"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="mr-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {toJalaliStringPretty(selectedDate)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5">
              ({persianWeekdaysShort[getJalaliDateInfo(selectedDate).weekday]})
            </span>
          </div>
        </div>

        {/* Group By Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setGroupBy('unit')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              groupBy === 'unit'
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Armchair size={13} />
            یونیت‌ها (صندلی‌ها)
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('doctor')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              groupBy === 'doctor'
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Stethoscope size={13} />
            پزشکان
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
                                  onClick={() => onSelectAppointment(appt)}
                                  className="p-2 rounded-xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all-smooth press-scale"
                                  style={{
                                    borderRightWidth: '4px',
                                    borderRightColor: docCol || '#0d9488',
                                  }}
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                      {patient ? `${patient.first_name} ${patient.last_name}` : 'بیمار'}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                      {toPersianDigits(appt.start_time)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                    <span className="truncate">
                                      {doc ? `دکتر ${doc.name || doc.specialty}` : 'بدون پزشک'}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                        appt.status === 'completed'
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                          : appt.status === 'in_progress'
                                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      {appt.status === 'completed' ? 'تکمیل' : appt.status === 'in_progress' ? 'روی یونیت' : 'رزرو'}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onNewAppointmentAtSlot(
                                selectedDate,
                                hour,
                                groupBy === 'unit' ? col.id : undefined,
                                groupBy === 'doctor' ? col.id : undefined
                              )
                            }
                            className="w-full h-full min-h-[38px] rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-all border border-dashed border-primary-300 dark:border-primary-700"
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
