/**
 * MOD-FEAT-024 | یک انتخابگر دندان برای تمام برنامه
 *
 * گزارش مهدی: «همه جا که باید دندون انتخاب بکنم با همین شکل واقعی نشون
 * بده، یک‌پارچه همه جا.»
 *
 * تا امروز دو زبان برای یک کار وجود داشت: در ویزیت، دندان‌های تصویری
 * چارت؛ و در ثبت درمان، لابراتوار و ایمپلنت، یک ردیف دکمه‌ی عددی. پزشک
 * در یک صفحه دندان را می‌دید و دو صفحه بعد آن را می‌شمرد.
 *
 * این کامپوننت همان `ToothGlyph` چارت را به کار می‌برد — نه یک نسخه‌ی
 * شبیه به آن. اگر روزی شکل دندان عوض شود، همه‌جا با هم عوض می‌شود.
 *
 * چیدمان از رقیب (مینادنت.ir) گرفته شده و در عکس‌های واقعی برنامه‌شان
 * دیده شد: هر فک یک ردیف پیوسته، برچسب ربع‌دار زیر هر دندان، و خط وسط
 * دهان بین دو نیمه.
 */
import { useState } from 'react'
import { ToothGlyph } from './ToothGlyph'
import { toothLabel, toothFullLabel } from '../lib/toothLabel'
import { upperRow, lowerRow, upperRowPrimary, lowerRowPrimary, isMidlineStart } from '../lib/palmerArch'
import type { ToothEntry } from '../lib/palmerArch'
import type { ToothCondition, ToothSurfaceCondition } from '../lib/toothConditions'
import { h } from '../lib/haptics'

export interface ToothArchSelectProps {
  label?: string
  /** شماره‌ی FDI انتخاب‌شده، یا رشته‌ی خالی. */
  value: string
  onChange: (fdi: string) => void
  /** نمایش دکمه‌ی «دندان شیری». */
  allowPrimary?: boolean
  /**
   * وضعیت ثبت‌شده‌ی هر دندان، اگر در دسترس باشد. بدون این هم کار می‌کند —
   * فرم‌هایی که پرونده‌ی دندانی را بارگذاری نکرده‌اند همه را سالم می‌بینند.
   */
  conditions?: Record<number, { condition: ToothCondition; surfaces: ToothSurfaceCondition[] }>
}

export function ToothArchSelect({
  label = 'دندان',
  value,
  onChange,
  allowPrimary = true,
  conditions,
}: ToothArchSelectProps) {
  const [primary, setPrimary] = useState(false)
  const upper = primary ? upperRowPrimary : upperRow
  const lower = primary ? lowerRowPrimary : lowerRow
  const selected = Number(value)

  const renderRow = (row: ToothEntry[]) => (
    /* MOD-FIX-013: dir="ltr" is the whole fix for the mirrored arch.
       A dental chart is drawn as if you are facing the patient, so the
       patient's RIGHT belongs on the viewer's LEFT. The row data is
       already in that order (UR8…UR1 | UL1…UL8), but the container
       inherited dir="rtl" from the app shell, and an RTL flex row lays
       its first item on the right — flipping the entire mouth. Mehdi
       tapped what he read as the patient's upper right and got UL1. */
    <div dir="ltr" className="flex items-end gap-0.5 dock-scroll overflow-x-auto pb-1">
      {row.map((t, i) => (
        <div key={t.fdi} className="flex items-end shrink-0">
          {/* Same midline rule as the numeric picker — one divider, at the
              real boundary between the two sides. See MOD-FIX-006. */}
          {isMidlineStart(row, i) && (
            <div className="w-px h-12 bg-slate-300 dark:bg-slate-500 mx-1.5 shrink-0" />
          )}
          <button
            type="button"
            aria-label={`دندان ${toothLabel(t.fdi)}`}
            onClick={() => { h.select(); onChange(String(t.fdi)) }}
            className={`shrink-0 rounded-lg p-0.5 transition-all-smooth ${
              selected === t.fdi ? 'bg-primary-50 ring-2 ring-primary-400' : ''
            }`}
          >
            <ToothGlyph
              number={t.fdi}
              condition={conditions?.[t.fdi]?.condition ?? 'healthy'}
              surfaces={conditions?.[t.fdi]?.surfaces ?? []}
              size={40}
              selected={selected === t.fdi}
              labelOverride={toothLabel(t.fdi)}
            />
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
        {allowPrimary && (
          <button
            type="button"
            onClick={() => { h.tap(); setPrimary((p) => !p); onChange('') }}
            className={`text-xs font-semibold px-2 py-1 rounded-lg transition-all-smooth ${
              primary ? 'bg-primary-600 text-white' : 'text-primary-700 dark:text-primary-400'
            }`}
          >
            دندان شیری
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 space-y-1">
        {/* Spelled out, because "UR" and "UL" are exactly the pair that was
            silently swapped and neither looks wrong on its own. */}
        <div dir="ltr" className="flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>راست بیمار</span>
          <span className="font-medium">فک بالا</span>
          <span>چپ بیمار</span>
        </div>
        {renderRow(upper)}
        <div className="h-px bg-slate-200 dark:bg-slate-600 my-1" />
        {renderRow(lower)}
        <div dir="ltr" className="flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>راست بیمار</span>
          <span className="font-medium">فک پایین</span>
          <span>چپ بیمار</span>
        </div>
      </div>

      {/* The chosen tooth is stated in words as well as highlighted. On a
          scrolling arch the selected tooth can be off-screen, and a form
          that shows no answer at all reads as though nothing was chosen. */}
      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
        {value ? `انتخاب‌شده: ${toothFullLabel(value)}` : 'دندانی انتخاب نشده'}
      </p>
    </div>
  )
}

export default ToothArchSelect
