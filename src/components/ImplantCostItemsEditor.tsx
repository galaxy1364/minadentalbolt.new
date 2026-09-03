import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Select, Input } from './ui'
import { CurrencyInput } from './CurrencyInput'
import { formatCurrency, toPersianDigits } from '../lib/persianDate'
import {
  COST_KINDS, GROUP_LABELS, RETENTION_LABELS, costKindMeta, lineTotal, itemsTotal, totalsByGroup,
  type CostItemLike,
} from '../lib/implantCosting'
import { h } from '../lib/haptics'
import type { Doctor } from '../types'

/**
 * MOD-FEAT-040 | ویرایشگر اقلام هزینه‌ی ایمپلنت
 *
 * One row per priced thing. The form used to offer six checkboxes and two
 * price boxes; a checkbox cannot carry a price, and the two boxes covered
 * two of eight things Mehdi listed. This offers every kind the app knows,
 * lets the clinic name one it doesn't, and shows the running total so
 * the number at the bottom is never a surprise.
 */

export interface EditableCostItem extends CostItemLike {
  /** شناسه‌ی موقت برای ردیف‌های تازه، تا ذخیره. */
  _key: string
}

export interface ImplantCostItemsEditorProps {
  items: EditableCostItem[]
  onChange: (items: EditableCostItem[]) => void
  doctors: Doctor[]
  /** قیمت خودِ فیکسچر، برای جمع کل. */
  fixturePrice: number
}

let seq = 0
const nextKey = () => `new-${Date.now()}-${seq++}`

export function ImplantCostItemsEditor({ items, onChange, doctors, fixturePrice }: ImplantCostItemsEditorProps) {
  const active = useMemo(() => items.filter((i) => i.is_active !== false), [items])
  const groups = useMemo(() => totalsByGroup(active), [active])
  const total = fixturePrice + itemsTotal(active)

  const kindOptions = COST_KINDS.map((k) => ({ value: k.kind, label: `${GROUP_LABELS[k.group]} — ${k.label}` }))
  const doctorOptions = [{ value: '', label: 'بدون پزشک' }, ...doctors.map((d) => ({ value: d.id, label: d.name || 'پزشک' }))]
  const retentionOptions = Object.entries(RETENTION_LABELS).map(([value, label]) => ({ value, label }))

  const add = () => {
    h.tap()
    onChange([...items, {
      _key: nextKey(), kind: 'bone_graft', label: costKindMeta('bone_graft').label,
      variant: null, quantity: 1, unit_price: 0, doctor_id: null, is_active: true,
    }])
  }

  const update = (key: string, patch: Partial<EditableCostItem>) => {
    onChange(items.map((i) => (i._key === key ? { ...i, ...patch } : i)))
  }

  const remove = (key: string) => {
    h.warning()
    // Existing lines are deactivated, never deleted — same rule as every
    // table. A brand-new line that was never saved can simply go.
    onChange(items.flatMap((i) => {
      if (i._key !== key) return [i]
      return i.id ? [{ ...i, is_active: false }] : []
    }))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">اقلام هزینه</p>
        <button type="button" onClick={add} className="flex items-center gap-1 text-[11px] font-bold text-primary-700 bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1.5 rounded-lg press-scale">
          <Plus size={12} /> افزودن
        </button>
      </div>

      {active.length === 0 && (
        <p className="text-[11px] text-slate-400">هیچ قلمی ثبت نشده — کشیدن، پیوند، سینوس لیفت، دستمزد، روکش…</p>
      )}

      {active.map((item) => {
        const meta = costKindMeta(item.kind)
        return (
          <div key={item._key} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <Select
                  label="نوع"
                  value={meta.kind === item.kind ? item.kind : 'other'}
                  onChange={(v) => update(item._key, { kind: v, label: v === 'other' ? item.label : costKindMeta(v).label })}
                  options={kindOptions}
                />
              </div>
              <button type="button" onClick={() => remove(item._key)} aria-label="حذف قلم" className="mt-6 p-2 rounded-lg text-error-500 hover:bg-error-50">
                <Trash2 size={14} />
              </button>
            </div>

            {/* «other» keeps the clinic's own wording, so a kind the app
                has not heard of is recorded rather than refused. */}
            {item.kind === 'other' && (
              <Input label="عنوان" value={item.label} onChange={(v) => update(item._key, { label: v })} placeholder="مثلاً لیزر" />
            )}

            <div className="grid grid-cols-2 gap-2">
              <CurrencyInput label="قیمت واحد (تومان)" value={String(item.unit_price || '')} onChange={(v) => update(item._key, { unit_price: Number(v) || 0 })} />
              {meta.countable ? (
                <Input label="تعداد" type="number" value={String(item.quantity)} onChange={(v) => update(item._key, { quantity: Math.max(1, Number(v) || 1) })} />
              ) : (
                <div className="flex items-end pb-2 text-xs text-slate-500">جمع: {formatCurrency(lineTotal(item))} ت</div>
              )}
            </div>

            {meta.hasRetention && (
              <Select label="نوع نگهداری" value={item.variant || ''} onChange={(v) => update(item._key, { variant: v || null })} options={retentionOptions} placeholder="چسبی یا پیچ‌شونده" />
            )}

            {meta.group === 'fee' && (
              <Select label="دستمزد مال" value={item.doctor_id || ''} onChange={(v) => update(item._key, { doctor_id: v || null })} options={doctorOptions} />
            )}

            {meta.countable && item.quantity > 1 && (
              <p className="text-[11px] text-slate-500">{toPersianDigits(item.quantity)} × {formatCurrency(item.unit_price)} = {formatCurrency(lineTotal(item))} ت</p>
            )}
          </div>
        )
      })}

      {/* Running total, split the way the money actually moves. */}
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
        <div className="flex justify-between text-slate-500"><span>فیکسچر</span><span>{formatCurrency(fixturePrice)} ت</span></div>
        {groups.surgical > 0 && <div className="flex justify-between text-slate-500"><span>جراحی</span><span>{formatCurrency(groups.surgical)} ت</span></div>}
        {groups.fee > 0 && <div className="flex justify-between text-slate-500"><span>دستمزد</span><span>{formatCurrency(groups.fee)} ت</span></div>}
        {groups.prosthetic > 0 && <div className="flex justify-between text-slate-500"><span>پروتز</span><span>{formatCurrency(groups.prosthetic)} ت</span></div>}
        <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
          <span>جمع کل</span><span>{formatCurrency(total)} ت</span>
        </div>
      </div>
    </div>
  )
}

export default ImplantCostItemsEditor
