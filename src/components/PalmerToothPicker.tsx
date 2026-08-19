// PalmerToothPicker.tsx — a real Palmer-notation tooth selector: pick
// a quadrant then a position (1-8, or A-E for primary teeth). Stores/
// emits the FDI number internally (e.g. "16") since that's the
// canonical format the rest of the app — DentalChart coloring, lab
// order tooth matching, implant cases — already uses everywhere, but
// every part of the UI a doctor actually sees and interacts with is
// 100% Palmer, per the explicit "فقط سیستم پالمر" requirement.
import { useState, useEffect } from 'react'
import { h } from '../lib/haptics'

const quadrants = [
  { key: 'UR', label: 'بالا راست', fdiBase: 10 },
  { key: 'UL', label: 'بالا چپ', fdiBase: 20 },
  { key: 'LL', label: 'پایین چپ', fdiBase: 30 },
  { key: 'LR', label: 'پایین راست', fdiBase: 40 },
] as const

const primaryQuadrants = [
  { key: 'UR', label: 'بالا راست (شیری)', fdiBase: 50 },
  { key: 'UL', label: 'بالا چپ (شیری)', fdiBase: 60 },
  { key: 'LL', label: 'پایین چپ (شیری)', fdiBase: 70 },
  { key: 'LR', label: 'پایین راست (شیری)', fdiBase: 80 },
] as const

const primaryPositions = ['A', 'B', 'C', 'D', 'E']

function parseExistingFdi(fdi: string): { quadKey: string; position: string; isPrimary: boolean } | null {
  const n = Number(fdi)
  if (!n || fdi.length !== 2) return null
  const quadDigit = Math.floor(n / 10)
  const posDigit = n % 10
  if (quadDigit >= 1 && quadDigit <= 4) {
    const q = quadrants.find((qq) => qq.fdiBase / 10 === quadDigit)
    return q ? { quadKey: q.key, position: String(posDigit), isPrimary: false } : null
  }
  if (quadDigit >= 5 && quadDigit <= 8) {
    const q = primaryQuadrants.find((qq) => qq.fdiBase / 10 === quadDigit)
    return q ? { quadKey: q.key, position: primaryPositions[posDigit - 1] || String(posDigit), isPrimary: true } : null
  }
  return null
}

interface PalmerToothPickerProps {
  label?: string
  value: string // FDI number string, e.g. "16"
  onChange: (fdi: string) => void
  allowPrimary?: boolean
}

export function PalmerToothPicker({ label = 'دندان (پالمر)', value, onChange, allowPrimary = true }: PalmerToothPickerProps) {
  const initial = value ? parseExistingFdi(value) : null
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary || false)
  const [quadKey, setQuadKey] = useState(initial?.quadKey || '')
  const [position, setPosition] = useState<string>(initial?.position || '')

  useEffect(() => {
    const p = value ? parseExistingFdi(value) : null
    setIsPrimary(p?.isPrimary || false)
    setQuadKey(p?.quadKey || '')
    setPosition(p?.position || '')
  }, [value])

  const commit = (newIsPrimary: boolean, newQuad: string, newPos: string) => {
    if (!newQuad || !newPos) return
    const list = newIsPrimary ? primaryQuadrants : quadrants
    const q = list.find((qq) => qq.key === newQuad)
    if (!q) return
    if (newIsPrimary) {
      const posIndex = primaryPositions.indexOf(newPos)
      if (posIndex === -1) return
      onChange(String(q.fdiBase + posIndex + 1))
    } else {
      onChange(String(q.fdiBase + Number(newPos)))
    }
  }

  const activeQuadrants = isPrimary ? primaryQuadrants : quadrants
  const activePositions = isPrimary ? primaryPositions : ['1', '2', '3', '4', '5', '6', '7', '8']

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
        {allowPrimary && (
          <button
            type="button"
            onClick={() => { h.select(); const np = !isPrimary; setIsPrimary(np); setQuadKey(''); setPosition('') }}
            className="text-[11px] text-primary-600 font-semibold"
          >
            {isPrimary ? 'دائمی' : 'دندان شیری'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {activeQuadrants.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => { h.select(); setQuadKey(q.key); commit(isPrimary, q.key, position) }}
            className={`py-2 rounded-xl text-xs font-bold transition-all-smooth ${quadKey === q.key ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
          >
            {q.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {activePositions.map((p) => (
          <button
            key={p}
            type="button"
            disabled={!quadKey}
            onClick={() => { h.select(); setPosition(p); commit(isPrimary, quadKey, p) }}
            className={`py-2 rounded-xl text-sm font-bold transition-all-smooth disabled:opacity-30 ${position === p ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
          >
            {p}
          </button>
        ))}
      </div>
      {quadKey && position && (
        <p className="text-[11px] text-slate-400 mt-1.5">انتخاب‌شده: {activeQuadrants.find((q) => q.key === quadKey)?.label} — {position}</p>
      )}
    </div>
  )
}
