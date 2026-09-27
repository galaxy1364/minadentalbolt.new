/**
 * MOD-FIX-006 | تست خط وسط قوس پالمر
 *
 * باگ واقعی که این تست جلوی برگشتش را می‌گیرد (دیده‌شده روی گوشی، v1.167):
 *   ۱) در دندان دائمی دو خط وسط کشیده می‌شد: «… ۲ | ۱ | ۱ ۲ …»
 *      چون شرط قدیمی `palmer === '1'` روی هر دو ثنایای میانی صدق می‌کرد.
 *   ۲) در دندان شیری هیچ خطی کشیده نمی‌شد، چون آنجا برچسب 'A' است نه '1'.
 *
 * هر دو از یک ریشه می‌آمدند: تصمیم‌گیری بر اساس «برچسب چاپ‌شده» به‌جای
 * «مرز راست/چپ». این تست دقیقاً همان تصمیم را قفل می‌کند.
 */
import { describe, it, expect } from 'vitest'
import {
  allArchRows, isMidlineStart,
  upperRow, lowerRow, upperRowPrimary, lowerRowPrimary,
} from './palmerArch'

/** شماره‌ی خانه‌هایی که خط وسط قبلشان کشیده می‌شود. */
function midlineIndexes(row: typeof upperRow): number[] {
  return row.map((_, i) => i).filter((i) => isMidlineStart(row, i))
}

describe('خط وسط دقیقاً یکی است', () => {
  it('در هر چهار ردیف فقط و فقط یک خط وسط وجود دارد', () => {
    for (const row of allArchRows) {
      expect(midlineIndexes(row)).toHaveLength(1)
    }
  })

  it('دندان دائمی: خط بعد از هشت دندان سمت راست می‌آید', () => {
    expect(midlineIndexes(upperRow)).toEqual([8])
    expect(midlineIndexes(lowerRow)).toEqual([8])
  })

  it('دندان شیری هم خط وسط دارد — برچسب A نباید کورش کند', () => {
    expect(midlineIndexes(upperRowPrimary)).toEqual([5])
    expect(midlineIndexes(lowerRowPrimary)).toEqual([5])
  })

  it('هیچ ردیفی با خط وسط شروع نمی‌شود', () => {
    for (const row of allArchRows) {
      expect(isMidlineStart(row, 0)).toBe(false)
    }
  })

  it('خانه‌ی خارج از محدوده خط نمی‌سازد', () => {
    expect(isMidlineStart(upperRow, -1)).toBe(false)
    expect(isMidlineStart(upperRow, upperRow.length)).toBe(false)
    expect(isMidlineStart(upperRow, 99)).toBe(false)
  })

  it('خط دقیقاً روی اولین دندان سمت چپ می‌افتد', () => {
    for (const row of allArchRows) {
      const [i] = midlineIndexes(row)
      expect(row[i].side).toBe('چپ')
      expect(row[i - 1].side).toBe('راست')
    }
  })
})

describe('داده‌ی ردیف‌ها سالم است', () => {
  it('طول ردیف‌ها درست است', () => {
    expect(upperRow).toHaveLength(16)
    expect(lowerRow).toHaveLength(16)
    expect(upperRowPrimary).toHaveLength(10)
    expect(lowerRowPrimary).toHaveLength(10)
  })

  it('هر ردیف دو نیمه‌ی مساوی راست و چپ دارد', () => {
    for (const row of allArchRows) {
      const right = row.filter((t) => t.side === 'راست')
      const left = row.filter((t) => t.side === 'چپ')
      expect(right).toHaveLength(row.length / 2)
      expect(left).toHaveLength(row.length / 2)
    }
  })

  it('سمت راست همیشه قبل از سمت چپ می‌آید — بدون قاطی شدن', () => {
    for (const row of allArchRows) {
      const sides = row.map((t) => t.side)
      expect(sides.lastIndexOf('راست')).toBeLessThan(sides.indexOf('چپ'))
    }
  })

  it('هیچ شماره‌ی FDI تکراری در کل دهان نیست', () => {
    const all = allArchRows.flat().map((t) => t.fdi)
    expect(new Set(all).size).toBe(all.length)
  })

  it('هر ردیف فقط دندان‌های یک فک را دارد', () => {
    for (const [row, jaw] of [
      [upperRow, 'بالا'], [lowerRow, 'پایین'],
      [upperRowPrimary, 'بالا'], [lowerRowPrimary, 'پایین'],
    ] as const) {
      expect(row.every((t) => t.jaw === jaw)).toBe(true)
    }
  })

  it('برچسب پالمر با رقم آخر FDI می‌خواند (دائمی)', () => {
    for (const t of [...upperRow, ...lowerRow]) {
      expect(t.palmer).toBe(String(t.fdi % 10))
    }
  })

  it('برچسب شیری A تا E است و با رقم آخر FDI می‌خواند', () => {
    const letters = ['A', 'B', 'C', 'D', 'E']
    for (const t of [...upperRowPrimary, ...lowerRowPrimary]) {
      expect(t.palmer).toBe(letters[(t.fdi % 10) - 1])
    }
  })
})
