import { useMemo } from 'react'
import { X } from 'lucide-react'
import { Select, Input } from './ui'
import { CurrencyInput } from './CurrencyInput'
import { formatCurrency, toPersianDigits } from '../lib/persianDate'
import {
  COST_KINDS, GROUP_LABELS, RETENTION_LABELS, costKindMeta, lineTotal, itemsTotal, totalsByGroup,
  type CostItemLike, type CostGroup,
} from '../lib/implantCosting'
import { h } from '../lib/haptics'
import type { Doctor } from '../types'

/**
 * MOD-FIX-022 | یک ویرایشگر اقلام هزینه، نه دو
 *
 * v1.223 shipped two cost editors on one form — a chip section writing
 * a JSON column, and a dropdown editor writing a table — both by the
 * same author on the same day, either side of a context reset. Mehdi saw
 * both and said the form was not smart. He was right.
 *
 * This is the one that stays. The chips (the better interaction: tap
 * what was done) sit on top of the table (the better model: quantity,
 * retention, whose fee). Tap a chip, a priced row appears beneath. Tap
 * again, it goes.
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

const GROUP_ORDER: CostGroup[] = ['surgical', 'fee', 'prosthetic']

export function ImplantCostItemsEditor({ items, onChange, doctors, fixturePrice }: ImplantCostItemsEditorProps) {
  const active = useMemo(() => items.filter((i) => i.is_active !== false), [items])
  const groups = useMemo(() => totalsByGroup(active), [active])
  const total = fixturePrice + itemsTotal(active)

  const doctorOptions = [{ value: '', label: 'بدون پزشک' }, ...doctors.map((d) => ({ value: d.id, label: d.name || 'پزشک' }))]
  const retentionOptions = Object.entries(RETENTION_LABELS).map(([value, label]) => ({ value, label }))

  const isOn = (kind: string) => active.some((i) => i.kind === kind)

  const toggle = (kind: string) => {
    h.select()
    // «سایر» can appear more than once — every "other" is a different
    // thing. Every named kind appears at most once; tap again removes it.
    if (kind !== 'other' && isOn(kind)) {
      onChange(items.flatMap((i) => {
        if (i.kind !== kind || i.is_active === false) return [i]
        return i.id ? [{ ...i, is_active: false }] : []
      }))
      return
    }
    const meta = costKindMeta(kind)
    onChange([...items, {
      _key: nextKey(), kind, label: kind === 'other' ? '' : meta.label,
      variant: null, quantity: 1, unit_price: 0, doctor_id: null, is_active: true,
    }])
  }

  const update = (key: string, patch: Partial<EditableCostItem>) =>
    onChange(items.map((i) => (i._key === key ? { ...i, ...patch } : i)))

  const remove = (key: string) => {
    h.warning()
    // Existing lines are deactivated, never deleted — same rule as every
    // table. A brand-new line that was never saved can simply go.
    onChange(items.flatMap((i) => (i._key !== key ? [i] : i.id ? [{ ...i, is_active: false }] : [])))
  }

  return (
    <div className="space-y-3">
      {/* ── چیپ‌ها: چه کاری شد ──────────────────────────────── */}
      {GROUP_ORDER.map((group) => (
        <div key={group}>
          <p className="text-[11px] font-bold text-slate-500 mb-1.5">{GROUP_LABELS[group]}</p>
          <div className="flex flex-wrap gap-1.5">
            {COST_KINDS.filter((k) => k.group === group && k.kind !== 'other').map((k) => {
              const on = isOn(k.kind)
              return (
                <button
                  key={k.kind}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(k.kind)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all-smooth press-scale ${
                    on
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {k.label}
                </button>
              )
            })}
            {group === 'surgical' && (
              <button type="button" onClick={() => toggle('other')} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-slate-300 text-slate-500 press-scale">
                + سایر
              </button>
            )}
          </div>
        </div>
      ))}

      {/* ── ردیف‌ها: چقدر، چند تا، مال کی ─────────────────────── */}
      {active.length > 0 && (
        <div className="space-y-2 pt-1">
          {active.map((item) => {
            const meta = costKindMeta(item.kind)
            return (
              <div key={item._key} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  {item.kind === 'other' ? (
                    <input
                      value={item.label}
                      onChange={(e) => update(item._key, { label: e.target.value })}
                      placeholder="عنوان — مثلاً لیزر"
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                    />
                  ) : (
                    <span className="flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{item.label}</span>
                  )}
                  <button type="button" onClick={() => remove(item._key)} aria-label={`حذف ${item.label}`} className="p-1 rounded-lg text-slate-400 hover:text-error-600">
                    <X size={14} />
                  </button>
                </div>

                <div className={`grid gap-2 ${meta.countable ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <CurrencyInput label="" value={String(item.unit_price || '')} onChange={(v) => update(item._key, { unit_price: Number(v) || 0 })} placeholder="قیمت (تومان)" />
                  {meta.countable && (
                    <Input label="" type="number" value={String(item.quantity)} onChange={(v) => update(item._key, { quantity: Math.max(1, Number(v) || 1) })} placeholder="تعداد" />
                  )}
                </div>

                {meta.hasRetention && (
                  <Select label="" value={item.variant || ''} onChange={(v) => update(item._key, { variant: v || null })} options={retentionOptions} placeholder="چسبی یا پیچ‌شونده" />
                )}
                {meta.group === 'fee' && (
                  <Select label="" value={item.doctor_id || ''} onChange={(v) => update(item._key, { doctor_id: v || null })} options={doctorOptions} placeholder="دستمزد مال کدام پزشک" />
                )}
                {meta.countable && item.quantity > 1 && (
                  <p className="text-[11px] text-slate-500">{toPersianDigits(item.quantity)} × {formatCurrency(item.unit_price)} = {formatCurrency(lineTotal(item))} ت</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── جمع، به شکلی که پول واقعاً حرکت می‌کند ──────────────── */}
      <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
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
