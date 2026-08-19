import { useState, useMemo } from 'react'
import { ChevronRight, ChevronLeft, Calendar as CalIcon } from 'lucide-react'
import {
  persianMonths, persianWeekdaysShort, getJalaliMonthGrid, getJalaliMonthYear,
  toJalaliString, getHoliday, isHoliday, toJalaliStringPretty,
} from '../lib/persianDate'
import { h } from '../lib/haptics'

interface CalendarProps {
  selectedDate: string // Gregorian "YYYY-MM-DD"
  onDateSelect: (date: string) => void
  appointments?: { date: string; status: string }[]
  highlightDates?: string[]
}

export function PersianCalendar({ selectedDate, onDateSelect, appointments = [], highlightDates = [] }: CalendarProps) {
  const today = new Date().toISOString().slice(0, 10)
  const initialJalali = getJalaliMonthYear(selectedDate || today)
  const [viewYear, setViewYear] = useState(initialJalali.year)
  const [viewMonth, setViewMonth] = useState(initialJalali.month)

  const grid = useMemo(() => getJalaliMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const todayJalali = useMemo(() => {
    const [jy, jm, jd] = (() => {
      const d = new Date()
      const parts = toJalaliString(d.toISOString().slice(0, 10)).split('/')
      return [Number(parts[0]), Number(parts[1]), Number(parts[2])]
    })()
    return { jy, jm, jd }
  }, [])

  const apptDates = useMemo(() => new Set(appointments.map((a) => a.date)), [appointments])
  const highlightSet = useMemo(() => new Set(highlightDates), [highlightDates])

  const prevMonth = () => {
    h.swipe()
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    h.swipe()
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const getGregorianForDay = (day: number): string => {
    const [gy, gm, gd] = (() => {
      // Convert Jalali to Gregorian using jalaliToGregorian from persianDate
      const result = jalaliToGregorianFunc(viewYear, viewMonth, day)
      return result
    })()
    return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-2xl card-shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-all-smooth press-scale">
          <ChevronRight size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <CalIcon size={16} className="text-primary-600" />
          <h3 className="text-base font-bold text-slate-800">
            {persianMonths[viewMonth - 1]} {toPersianDigitsLocal(viewYear)}
          </h3>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-all-smooth press-scale">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {persianWeekdaysShort.map((wd, i) => (
          <div key={i} className={`text-center text-[10px] font-bold py-1 ${i === 5 ? 'text-error-500' : 'text-slate-400'}`}>
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.flat().map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />
          const gregDate = getGregorianForDay(day)
          const jalaliStr = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`
          const holiday = getHoliday(jalaliStr)
          const isToday = todayJalali.jy === viewYear && todayJalali.jm === viewMonth && todayJalali.jd === day
          const isSelected = gregDate === selectedDate
          const hasAppt = apptDates.has(gregDate)
          const isHighlighted = highlightSet.has(gregDate)
          const isFriday = i % 7 === 6

          return (
            <button
              key={i}
              onClick={() => { h.select(); onDateSelect(gregDate) }}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all-smooth press-scale
                ${isSelected ? 'bg-primary-600 text-white shadow-ios' : ''}
                ${!isSelected && isToday ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-300' : ''}
                ${!isSelected && !isToday && (holiday || isFriday) ? 'text-error-500 bg-error-50/30' : ''}
                ${!isSelected && !isToday && !holiday && !isFriday ? 'text-slate-700 hover:bg-slate-50' : ''}
              `}
            >
              <span className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>
                {toPersianDigitsLocal(day)}
              </span>
              {hasAppt && (
                <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary-500'} mt-0.5`} />
              )}
              {holiday && !isSelected && (
                <div className="absolute bottom-0.5 right-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-error-400" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary-500" />
          <span className="text-[10px] text-slate-500">نوبت</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-error-400" />
          <span className="text-[10px] text-slate-500">تعطیلی</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary-600" />
          <span className="text-[10px] text-slate-500">انتخاب شده</span>
        </div>
      </div>

      {/* Holiday info for selected date */}
      {(() => {
        const selectedJalali = toJalaliString(selectedDate)
        const hol = getHoliday(selectedJalali)
        if (!hol) return null
        return (
          <div className="mt-2 p-2.5 rounded-xl bg-error-50 border border-error-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-error-500" />
            <span className="text-xs text-error-700 font-medium">{hol}</span>
          </div>
        )
      })()}
    </div>
  )
}

// Local helpers to avoid import issues
function toPersianDigitsLocal(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

// Import jalaliToGregorian at module level
import { jalaliToGregorian as jalaliToGregorianFunc, toJalaliString as toJalaliStringCal } from '../lib/persianDate'
