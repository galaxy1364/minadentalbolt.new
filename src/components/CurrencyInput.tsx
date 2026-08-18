// CurrencyInput.tsx — a drop-in replacement for `<Input type="number">`
// on money fields. Shows live 3-digit-grouped separators as you type
// (e.g. 8,000,000) so a mistyped extra zero is obvious at a glance,
// while still emitting/accepting a plain numeric string ('8000000')
// so all existing save/calculation logic needs zero changes.
import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  label?: string
  value: string // plain digits, e.g. '8000000'
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

function formatWithCommas(digits: string): string {
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

export function CurrencyInput({ label, value, onChange, placeholder = '0', className = '' }: CurrencyInputProps) {
  const [display, setDisplay] = useState(formatWithCommas(value))

  // Keep displayed formatting in sync if the value changes from outside
  // (e.g. form reset, editing an existing record).
  useEffect(() => { setDisplay(formatWithCommas(value)) }, [value])

  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        value={display}
        onChange={(e) => {
          const digitsOnly = e.target.value.replace(/[^\d]/g, '')
          setDisplay(formatWithCommas(digitsOnly))
          onChange(digitsOnly)
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all-smooth text-left"
      />
    </div>
  )
}
