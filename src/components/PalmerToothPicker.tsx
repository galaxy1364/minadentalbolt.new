// PalmerToothPicker.tsx — a real, visual Palmer-notation tooth
// selector: a compact anatomical mini-chart (upper jaw row, lower jaw
// row, correctly mirrored right/left) where you tap the actual tooth
// position directly — no separate "pick a quadrant, then pick a
// number" steps. Stores/emits the FDI number internally (e.g. "16")
// since that's the canonical format the rest of the app — DentalChart
// coloring, lab order tooth matching, implant cases — already uses
// everywhere, but every part of the UI a doctor sees/taps is 100%
// Palmer, per the explicit "فقط سیستم پالمر" requirement.
import { useState, useEffect } from 'react'
import { toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
// The arch rows and the midline rule live in lib so they are reachable
// from a test without rendering React — see MOD-FIX-006.
import {
  ToothEntry, isMidlineStart,
  upperRow, lowerRow, upperRowPrimary, lowerRowPrimary,
} from '../lib/palmerArch'

interface PalmerToothPickerProps {
  label?: string
  value: string
  onChange: (fdi: string) => void
  allowPrimary?: boolean
}

export function PalmerToothPicker({ label = 'دندان (پالمر)', value, onChange, allowPrimary = true }: PalmerToothPickerProps) {
  const selectedFdi = value ? Number(value) : null
  const [isPrimary, setIsPrimary] = useState(selectedFdi ? selectedFdi >= 51 && selectedFdi <= 85 : false)

  useEffect(() => {
    if (selectedFdi) setIsPrimary(selectedFdi >= 51 && selectedFdi <= 85)
  }, [value])

  const upper = isPrimary ? upperRowPrimary : upperRow
  const lower = isPrimary ? lowerRowPrimary : lowerRow
  const selectedEntry = upper.concat(lower).find((t) => t.fdi === selectedFdi)

  const ToothButton = ({ t }: { t: ToothEntry }) => {
    const isSelected = selectedFdi === t.fdi
    return (
      <button
        type="button"
        onClick={() => { h.select(); onChange(String(t.fdi)) }}
        className={`relative flex items-center justify-center w-8 h-9 rounded-lg text-xs font-bold transition-all-smooth press-scale ${
          isSelected
            ? 'bg-primary-600 text-white shadow-md scale-110 z-10'
            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-primary-300'
        }`}
      >
        {toPersianDigits(t.palmer)}
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
        {allowPrimary && (
          <button
            type="button"
            onClick={() => { h.select(); setIsPrimary(!isPrimary) }}
            className="text-[11px] text-primary-600 font-semibold"
          >
            {isPrimary ? 'دائمی' : 'دندان شیری'}
          </button>
        )}
      </div>

      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
        <p className="text-center text-[10px] text-slate-400 mb-1.5">فک بالا</p>
        {/* Single continuous horizontally-scrollable row per jaw — from a
            handwritten diagram showing exactly this: "87654321 | 12345678"
            as ONE unbroken line with a single divider at the real
            midline, scrolling left/right if it doesn't fit rather than
            wrapping to a second line.

            MOD-FIX-006: the divider used to be placed by matching
            `palmer === '1'`, which is true for BOTH central incisors — so
            two dividers were drawn and tooth 1 sat alone in its own
            compartment ("… 2 | 1 | 1 2 …"). The same rule drew nothing at
            all in the primary dentition, where the label is 'A'.
            isMidlineStart() keys off the راست→چپ boundary instead, which
            is the midline by definition in either dentition. */}
        <div className="flex items-center gap-0.5 overflow-x-auto dock-scroll px-1 py-1">
          {upper.map((t, i) => (
            <div key={t.fdi} className="flex items-center shrink-0">
              {isMidlineStart(upper, i) && <div className="w-px h-7 bg-slate-300 dark:bg-slate-500 mx-2 shrink-0" />}
              <ToothButton t={t} />
            </div>
          ))}
        </div>
        <div className="h-px bg-slate-200 dark:bg-slate-600 my-3" />
        <div className="flex items-center gap-0.5 overflow-x-auto dock-scroll px-1 py-1">
          {lower.map((t, i) => (
            <div key={t.fdi} className="flex items-center shrink-0">
              {isMidlineStart(lower, i) && <div className="w-px h-7 bg-slate-300 dark:bg-slate-500 mx-2 shrink-0" />}
              <ToothButton t={t} />
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-1.5">فک پایین</p>
      </div>

      {selectedEntry && (
        <p className="text-[11px] text-slate-400 mt-1.5 text-center">
          دندان انتخاب‌شده: {selectedEntry.palmer} (فک {selectedEntry.jaw} — سمت {selectedEntry.side})
        </p>
      )}
    </div>
  )
}
