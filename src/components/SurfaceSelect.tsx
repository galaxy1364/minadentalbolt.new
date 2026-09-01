import { SURFACE_ORDER, SURFACE_NAMES, parseSurfaces, toggleSurface, surfaceLabel } from '../lib/toothSurfaces'
import { h } from '../lib/haptics'

/**
 * MOD-FEAT-026 | انتخاب سطوح دندان
 *
 * جایگزین `<Select>` تک‌مقداری در فرم درمان، و اولین انتخابگر سطح در
 * فرم لابراتوار.
 *
 * A dropdown can only ever return one value, which is why the app could
 * not record «MOD» — the commonest kind of restoration. Toggles return a
 * set, which is what a restoration actually is.
 *
 * Built as a shared component from the start rather than inline in the
 * treatment form. Surface selection is now needed in two places and the
 * implant form is the obvious third; the pattern in this codebase is that
 * the second copy is where the two start to drift.
 */

export interface SurfaceSelectProps {
  label?: string
  /** کد ترکیبی مثل «MOD»، یا مقدار قدیمی مثل «occlusal». */
  value: string
  onChange: (code: string) => void
  /** برای فرم‌هایی که سطح اجباری نیست. */
  hint?: string
}

export function SurfaceSelect({ label = 'سطوح دندان', value, onChange, hint }: SurfaceSelectProps) {
  const selected = parseSurfaces(value)

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>

      <div dir="ltr" className="flex gap-1.5">
        {SURFACE_ORDER.map((code) => {
          const on = selected.includes(code)
          return (
            <button
              key={code}
              type="button"
              aria-pressed={on}
              aria-label={SURFACE_NAMES[code]}
              onClick={() => { h.select(); onChange(toggleSurface(value, code)) }}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all-smooth ${
                on
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
              }`}
            >
              {code}
            </button>
          )
        })}
      </div>

      {/* The letters are the standard notation, but nobody should have to
          remember which is which — least of all an assistant filling in a
          lab order. The Persian names spell out whatever is selected. */}
      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
        {selected.length ? surfaceLabel(value) : (hint ?? 'سطحی انتخاب نشده')}
      </p>
    </div>
  )
}

export default SurfaceSelect
