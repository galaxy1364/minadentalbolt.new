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
import { h } from '../lib/haptics'

interface ToothEntry { fdi: number; palmer: string; side: 'راست' | 'چپ'; jaw: 'بالا' | 'پایین' }

const upperRow: ToothEntry[] = [
  { fdi: 18, palmer: '8', side: 'راست', jaw: 'بالا' }, { fdi: 17, palmer: '7', side: 'راست', jaw: 'بالا' },
  { fdi: 16, palmer: '6', side: 'راست', jaw: 'بالا' }, { fdi: 15, palmer: '5', side: 'راست', jaw: 'بالا' },
  { fdi: 14, palmer: '4', side: 'راست', jaw: 'بالا' }, { fdi: 13, palmer: '3', side: 'راست', jaw: 'بالا' },
  { fdi: 12, palmer: '2', side: 'راست', jaw: 'بالا' }, { fdi: 11, palmer: '1', side: 'راست', jaw: 'بالا' },
  { fdi: 21, palmer: '1', side: 'چپ', jaw: 'بالا' }, { fdi: 22, palmer: '2', side: 'چپ', jaw: 'بالا' },
  { fdi: 23, palmer: '3', side: 'چپ', jaw: 'بالا' }, { fdi: 24, palmer: '4', side: 'چپ', jaw: 'بالا' },
  { fdi: 25, palmer: '5', side: 'چپ', jaw: 'بالا' }, { fdi: 26, palmer: '6', side: 'چپ', jaw: 'بالا' },
  { fdi: 27, palmer: '7', side: 'چپ', jaw: 'بالا' }, { fdi: 28, palmer: '8', side: 'چپ', jaw: 'بالا' },
]
const lowerRow: ToothEntry[] = [
  { fdi: 48, palmer: '8', side: 'راست', jaw: 'پایین' }, { fdi: 47, palmer: '7', side: 'راست', jaw: 'پایین' },
  { fdi: 46, palmer: '6', side: 'راست', jaw: 'پایین' }, { fdi: 45, palmer: '5', side: 'راست', jaw: 'پایین' },
  { fdi: 44, palmer: '4', side: 'راست', jaw: 'پایین' }, { fdi: 43, palmer: '3', side: 'راست', jaw: 'پایین' },
  { fdi: 42, palmer: '2', side: 'راست', jaw: 'پایین' }, { fdi: 41, palmer: '1', side: 'راست', jaw: 'پایین' },
  { fdi: 31, palmer: '1', side: 'چپ', jaw: 'پایین' }, { fdi: 32, palmer: '2', side: 'چپ', jaw: 'پایین' },
  { fdi: 33, palmer: '3', side: 'چپ', jaw: 'پایین' }, { fdi: 34, palmer: '4', side: 'چپ', jaw: 'پایین' },
  { fdi: 35, palmer: '5', side: 'چپ', jaw: 'پایین' }, { fdi: 36, palmer: '6', side: 'چپ', jaw: 'پایین' },
  { fdi: 37, palmer: '7', side: 'چپ', jaw: 'پایین' }, { fdi: 38, palmer: '8', side: 'چپ', jaw: 'پایین' },
]
const upperRowPrimary: ToothEntry[] = [
  { fdi: 55, palmer: 'E', side: 'راست', jaw: 'بالا' }, { fdi: 54, palmer: 'D', side: 'راست', jaw: 'بالا' },
  { fdi: 53, palmer: 'C', side: 'راست', jaw: 'بالا' }, { fdi: 52, palmer: 'B', side: 'راست', jaw: 'بالا' },
  { fdi: 51, palmer: 'A', side: 'راست', jaw: 'بالا' }, { fdi: 61, palmer: 'A', side: 'چپ', jaw: 'بالا' },
  { fdi: 62, palmer: 'B', side: 'چپ', jaw: 'بالا' }, { fdi: 63, palmer: 'C', side: 'چپ', jaw: 'بالا' },
  { fdi: 64, palmer: 'D', side: 'چپ', jaw: 'بالا' }, { fdi: 65, palmer: 'E', side: 'چپ', jaw: 'بالا' },
]
const lowerRowPrimary: ToothEntry[] = [
  { fdi: 85, palmer: 'E', side: 'راست', jaw: 'پایین' }, { fdi: 84, palmer: 'D', side: 'راست', jaw: 'پایین' },
  { fdi: 83, palmer: 'C', side: 'راست', jaw: 'پایین' }, { fdi: 82, palmer: 'B', side: 'راست', jaw: 'پایین' },
  { fdi: 81, palmer: 'A', side: 'راست', jaw: 'پایین' }, { fdi: 71, palmer: 'A', side: 'چپ', jaw: 'پایین' },
  { fdi: 72, palmer: 'B', side: 'چپ', jaw: 'پایین' }, { fdi: 73, palmer: 'C', side: 'چپ', jaw: 'پایین' },
  { fdi: 74, palmer: 'D', side: 'چپ', jaw: 'پایین' }, { fdi: 75, palmer: 'E', side: 'چپ', jaw: 'پایین' },
]

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
    const isMidline = t.palmer === '1' || t.palmer === 'A'
    return (
      <button
        type="button"
        onClick={() => { h.select(); onChange(String(t.fdi)) }}
        className={`relative flex items-center justify-center w-8 h-9 rounded-lg text-xs font-bold transition-all-smooth press-scale ${
          isSelected
            ? 'bg-primary-600 text-white shadow-md scale-110 z-10'
            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-primary-300'
        } ${isMidline ? 'mr-1' : ''}`}
      >
        {t.palmer}
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
            wrapping to a second line. flex-wrap previously let the browser
            break the row wherever it needed to for the screen width, which
            could land that break at a completely different point than the
            actual midline — making the divider itself land in the wrong
            place depending on screen size. dock-scroll hides the
            scrollbar; nothing here can silently misplace the divider
            anymore since there's no wrap point to get it wrong. */}
        <div className="flex items-center gap-0.5 overflow-x-auto dock-scroll px-1 py-1">
          {upper.map((t, i) => (
            <div key={t.fdi} className="flex items-center shrink-0">
              {i > 0 && t.palmer === '1' && <div className="w-px h-7 bg-slate-300 dark:bg-slate-500 mx-2 shrink-0" />}
              <ToothButton t={t} />
            </div>
          ))}
        </div>
        <div className="h-px bg-slate-200 dark:bg-slate-600 my-3" />
        <div className="flex items-center gap-0.5 overflow-x-auto dock-scroll px-1 py-1">
          {lower.map((t, i) => (
            <div key={t.fdi} className="flex items-center shrink-0">
              {i > 0 && t.palmer === '1' && <div className="w-px h-7 bg-slate-300 dark:bg-slate-500 mx-2 shrink-0" />}
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
