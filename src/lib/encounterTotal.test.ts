/**
 * MOD-FIX-008 | تست جمع مالی ویزیت
 *
 * سناریوی واقعی: دکتر یک درمان ۱۰ میلیونی ثبت می‌کند — سربرگ ویزیت
 * «۱۰,۰۰۰,۰۰۰ ت» نشان می‌دهد. بعد قیمت را به ۶ میلیون اصلاح می‌کند.
 * سربرگ **همچنان ۱۰ میلیون** می‌ماند، و «کل درآمد» در گزارش‌ها هم که از
 * همین فیلد جمع می‌زند، ۴ میلیون بیشتر از واقعیت نشان می‌دهد.
 *
 * همان اتفاق با لغو درمان هم می‌افتاد.
 */
import { describe, it, expect } from 'vitest'
import { calcEncounterTotal } from './finance'
import type { Treatment } from '../types'

const t = (over: Partial<Treatment>): Treatment =>
  ({ id: 'x', encounter_id: 'e1', status: 'planned', total_price: 0, ...over } as Treatment)

describe('جمع مالی ویزیت', () => {
  it('ویزیت بدون درمان صفر است', () => {
    expect(calcEncounterTotal([], 'e1')).toBe(0)
  })

  it('درمان‌های همان ویزیت جمع می‌شوند', () => {
    const list = [t({ id: 'a', total_price: 10_500_000 }), t({ id: 'b', total_price: 12_000_000 })]
    expect(calcEncounterTotal(list, 'e1')).toBe(22_500_000)
  })

  it('درمان ویزیت دیگر شمرده نمی‌شود', () => {
    const list = [t({ id: 'a', total_price: 5_000_000 }), t({ id: 'b', encounter_id: 'e2', total_price: 9_000_000 })]
    expect(calcEncounterTotal(list, 'e1')).toBe(5_000_000)
  })

  it('🔴 درمان لغو‌شده از جمع خارج می‌شود', () => {
    const list = [t({ id: 'a', total_price: 10_000_000 }), t({ id: 'b', total_price: 4_000_000, status: 'cancelled' })]
    expect(calcEncounterTotal(list, 'e1')).toBe(10_000_000)
  })

  it('🔴 بعد از اصلاح قیمت، عدد جدید درمی‌آید — نه عدد قدیمی', () => {
    const before = [t({ id: 'a', total_price: 10_000_000 })]
    const after = [t({ id: 'a', total_price: 6_000_000 })]
    expect(calcEncounterTotal(before, 'e1')).toBe(10_000_000)
    expect(calcEncounterTotal(after, 'e1')).toBe(6_000_000)
  })

  it('total_price خالی مثل صفر است، نه NaN', () => {
    const list = [t({ id: 'a', total_price: null as never }), t({ id: 'b', total_price: 3_000_000 })]
    const result = calcEncounterTotal(list, 'e1')
    expect(Number.isNaN(result)).toBe(false)
    expect(result).toBe(3_000_000)
  })

  it('بازمحاسبه پایدار است — دو بار اجرا عدد را دو برابر نمی‌کند', () => {
    // باگ «افزودن دلتا» دقیقاً همین‌جا خودش را نشان می‌داد.
    const list = [t({ id: 'a', total_price: 7_000_000 })]
    expect(calcEncounterTotal(list, 'e1')).toBe(calcEncounterTotal(list, 'e1'))
  })

  it('اعداد بزرگ کلینیک دقیق می‌مانند', () => {
    const list = Array.from({ length: 40 }, (_, i) => t({ id: `t${i}`, total_price: 1_250_000 }))
    expect(calcEncounterTotal(list, 'e1')).toBe(50_000_000)
  })

  it('با فیلتر calcPatientBalance یکی است — هر دو لغو‌شده را کنار می‌گذارند', () => {
    const list = [
      t({ id: 'a', total_price: 8_000_000, status: 'completed' }),
      t({ id: 'b', total_price: 2_000_000, status: 'in_progress' }),
      t({ id: 'c', total_price: 5_000_000, status: 'cancelled' }),
    ]
    const billable = list.filter((x) => x.status !== 'cancelled').reduce((s, x) => s + (x.total_price || 0), 0)
    expect(calcEncounterTotal(list, 'e1')).toBe(billable)
  })
})
