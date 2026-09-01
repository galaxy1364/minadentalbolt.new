// PersianDateInput.tsx — a drop-in replacement for `<Input type="date">`
// that shows/picks dates in Jalali via our own PersianCalendar, instead
// of the device's native (Gregorian, usually English) date picker.
// Stores/emits the same Gregorian "YYYY-MM-DD" string everywhere else
// in the app already expects, so no downstream logic changes.
import { useState } from 'react'
import { Calendar as CalIcon, X as XIcon } from 'lucide-react'
import { PersianCalendar } from './PersianCalendar'
import { toJalaliStringPretty } from '../lib/persianDate'
import { h } from '../lib/haptics'

interface PersianDateInputProps {
  label?: string
  value: string // Gregorian "YYYY-MM-DD" or ''
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function PersianDateInput({ label, value, onChange, placeholder = 'انتخاب تاریخ...', className = '' }: PersianDateInputProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => { h.tap(); setOpen(true) }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all-smooth"
      >
        <span className={value ? '' : 'text-slate-400'}>{value ? toJalaliStringPretty(value) : placeholder}</span>
        <CalIcon size={16} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full sm:max-w-sm bg-transparent" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end px-4 pb-2">
              <button onClick={() => setOpen(false)} className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-ios text-slate-500"><XIcon size={16} /></button>
            </div>
            <PersianCalendar
              selectedDate={value || new Date().toISOString().slice(0, 10)}
              // MOD-FIX-020: the second gate, on purpose. This component is
              // the date entry for lab orders, treatment phases and eight
              // other pages, and whatever leaves here goes straight into a
              // Postgres `date` column — where a bad value does not fail
              // loudly, it parks the record in the sync queue forever.
              // The calendar is fixed and already refuses to emit a
              // non-date, so this should never fire; it exists so that the
              // next bug upstream stops here instead of reaching the
              // database. Silence is the failure mode to avoid: a rejected
              // value leaves the field untouched rather than writing a
              // plausible-looking wrong date.
              onDateSelect={(d) => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                  console.error('[minadent] تاریخ نامعتبر از تقویم:', d)
                  return
                }
                onChange(d)
                setOpen(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
