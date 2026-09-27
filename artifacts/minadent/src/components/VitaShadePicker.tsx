// VitaShadePicker.tsx — Touch-Ergonomic VITA Classical & Bleach Dental Shade Picker
import { useState, useMemo } from 'react'
import { VITA_SHADES, VITA_GROUPS, getVitaShade, VitaShade } from '../lib/vitaShade'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { Check, Sparkles } from 'lucide-react'

export interface VitaShadePickerProps {
  label?: string
  value: string
  onChange: (shade: string) => void
  allowCustom?: boolean
  required?: boolean
}

export function VitaShadePicker({
  label = 'رنگ دندان (راهنمای رسمی VITA & Bleach)',
  value,
  onChange,
  allowCustom = true,
  required = false,
}: VitaShadePickerProps) {
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const [customMode, setCustomMode] = useState<boolean>(false)

  const selectedShade = useMemo(() => getVitaShade(value), [value])

  const filteredShades = useMemo(() => {
    if (activeGroup === 'all') return VITA_SHADES
    return VITA_SHADES.filter((s) => s.group === activeGroup)
  }, [activeGroup])

  const isCustomValue = Boolean(value && !selectedShade)

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label} {required && <span className="text-error-500">*</span>}
        </label>
        {value && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            {selectedShade ? (
              <>
                <span
                  className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 inline-block shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${selectedShade.enamelHex} 0%, ${selectedShade.hexColor} 100%)`,
                  }}
                />
                <span>رنگ انتخابی: {selectedShade.code}</span>
              </>
            ) : (
              <span>رنگ سفارشی: {value}</span>
            )}
          </div>
        )}
      </div>

      {/* Group selector tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => { h.toggle(); setActiveGroup('all'); setCustomMode(false) }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all-smooth ${
            activeGroup === 'all' && !customMode
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          همه رنگ‌ها
        </button>
        {VITA_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => { h.toggle(); setActiveGroup(g.id); setCustomMode(false) }}
            className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all-smooth flex items-center gap-1 ${
              activeGroup === g.id && !customMode
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {g.id === 'BL' && <Sparkles size={12} className="text-amber-400" />}
            {g.name}
          </button>
        ))}
        {allowCustom && (
          <button
            type="button"
            onClick={() => { h.toggle(); setCustomMode(true) }}
            className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all-smooth ${
              customMode || isCustomValue
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            تایپ دستی / خاص
          </button>
        )}
      </div>

      {/* Custom input view */}
      {customMode || isCustomValue ? (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            برای رنگ‌های استامپ (ND1-ND9)، بلیچ اختصاصی (0M1-0M3)، یا کدهای ترکیبی:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="مثلاً: 0M2، ND2 یا A2/A3 Cervical"
              dir="ltr"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            {value && (
              <button
                type="button"
                onClick={() => { h.cancel(); onChange('') }}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                پاک کردن
              </button>
            )}
          </div>
        </div>
      ) : (
        /* VITA Shades Grid */
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {filteredShades.map((shade) => {
            const isSelected = selectedShade?.code === shade.code
            return (
              <button
                key={shade.code}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  chimes.playPop()
                  h.select()
                  onChange(shade.code)
                }}
                className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all-smooth press-scale ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50/70 dark:bg-primary-950/40 shadow-md ring-2 ring-primary-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Tooth swatch pill */}
                <div
                  className="w-7 h-9 rounded-t-full rounded-b-md shadow-sm border border-slate-300/80 dark:border-slate-600/80 mb-1.5 transition-transform"
                  style={{
                    background: `linear-gradient(180deg, ${shade.enamelHex} 0%, ${shade.hexColor} 70%, ${shade.hexColor} 100%)`,
                  }}
                />

                <span className="text-xs font-black tracking-tight text-slate-800 dark:text-slate-100" dir="ltr">
                  {shade.code}
                </span>

                {isSelected && (
                  <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selectedShade && !customMode && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
          <span className="font-bold text-slate-700 dark:text-slate-300">{selectedShade.code}: </span>
          {selectedShade.description} ({selectedShade.groupName})
        </p>
      )}
    </div>
  )
}
