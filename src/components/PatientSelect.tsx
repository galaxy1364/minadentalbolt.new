import { useMemo, useState } from 'react'
import { Select } from './ui'
import { formatCurrency, toPersianDigits } from '../lib/persianDate'
import type { Patient } from '../types'
import type { PatientBalance } from '../lib/finance'

/**
 * MOD-FEAT-025 | یک انتخابگر بیمار برای تمام برنامه
 *
 * ممیزی `AUDIT-DUPLICATION.md` مورد ۱: شش صفحه هرکدام `patientOptions`
 * خودشان را می‌ساختند، با **سه قالب متفاوت** — بعضی شماره‌ی پرونده
 * داشتند، بعضی نه — و هیچ‌کدام نمی‌گفتند بیمار بدهکار است.
 *
 * The practical consequence: in the payment form you pick a patient
 * without seeing that they owe money, while the patient list two taps
 * away shows exactly that in a red chip. The information existed; the
 * screen where it mattered most did not have it.
 *
 * `balances` is optional on purpose. Only Billing loads payments today,
 * and making five other pages fetch the whole ledger just to colour a
 * dropdown would cost more than it returns. Without it the component is
 * still the single source of the *label* format — which is what stops
 * the six variants drifting again.
 */

export interface PatientSelectProps {
  label?: string
  value: string
  onChange: (patientId: string) => void
  patients: Patient[]
  /** مانده‌حساب هر بیمار، اگر صفحه آن را دارد. */
  balances?: Map<string, PatientBalance>
  /** گزینه‌ی «بدون بیمار مشخص» — برای یادآورها. */
  allowEmpty?: boolean
  emptyLabel?: string
  placeholder?: string
  required?: boolean
}

/** «مهدی امیری — MD-1000» — یک قالب، همه‌جا. */
export function patientLabel(p: Patient): string {
  const name = `${p.first_name} ${p.last_name}`.trim()
  return p.file_number ? `${name} — ${p.file_number}` : name
}

export function PatientSelect({
  label = 'بیمار',
  value,
  onChange,
  patients,
  balances,
  allowEmpty = false,
  emptyLabel = 'بدون بیمار مشخص',
  placeholder = 'انتخاب بیمار',
  required = false,
}: PatientSelectProps) {
  const [query, setQuery] = useState('')

  const selectable = useMemo(() => {
    // An inactive patient is kept when they are the current value, so
    // opening an old record doesn't silently drop its own patient — the
    // same rule as attributableTreatments in paymentAttribution.ts.
    return patients.filter((p) => p.is_active !== false || p.id === value)
  }, [patients, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return selectable
    return selectable.filter((p) => {
      const haystack = `${p.first_name} ${p.last_name} ${p.file_number ?? ''} ${p.phone ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [selectable, query])

  const options = useMemo(() => {
    const rows = filtered.map((p) => {
      const balance = balances?.get(p.id)?.balance ?? 0
      // The marker goes in the label rather than beside the field because
      // a native <select> renders only text — and this has to work the
      // same way in all six places, not just the ones with room for a chip.
      const debt = balance > 0 ? ` • بدهکار ${formatCurrency(balance)} ت` : ''
      return { value: p.id, label: `${patientLabel(p)}${debt}` }
    })
    return allowEmpty ? [{ value: '', label: emptyLabel }, ...rows] : rows
  }, [filtered, balances, allowEmpty, emptyLabel])

  const showSearch = selectable.length > 8

  return (
    <div>
      {/* The search box appears only when the list is long enough to be
          hard to scan. Below that it is one more thing to tab past. */}
      {showSearch && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`جستجو در ${toPersianDigits(selectable.length)} بیمار…`}
          className="w-full mb-1.5 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
        />
      )}
      <Select
        label={required ? `${label} *` : label}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
      />
      {query && filtered.length === 0 && (
        <p className="mt-1 text-xs text-slate-500">بیماری با این مشخصات پیدا نشد</p>
      )}
    </div>
  )
}

export default PatientSelect
