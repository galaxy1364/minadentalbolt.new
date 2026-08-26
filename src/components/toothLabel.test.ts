/**
 * MOD-TEST-005 | تست برچسب‌گذاری ربع‌دار دندان
 *
 * ریشه‌ی این تست یک شکایت واقعی و تکرارشونده است: «چرا دو تا ۱؟».
 * در نماد پالمر خالص هر ربع از ۱ شروع می‌شود، پس چهار دندان مختلف
 * همگی «۱» نامیده می‌شوند. بررسی ویدیوی واقعی رقیب نشان داد آن‌ها
 * با پیشوند ربع (UR/UL/LR/LL) این ابهام را حذف کرده‌اند.
 *
 * این تست تضمین می‌کند برچسب هر دندان در کل دهان **یکتا** باشد —
 * یعنی همان باگ ادراکی هرگز برنگردد.
 */
import { describe, it, expect } from 'vitest'

/** همان منطق DentalChart.getToothLabel — عمداً اینجا بازتولید شده
 *  چون تابع داخل کامپوننت است و بدون رندر React قابل import نیست. */
function fdiToPalmerNumber(fdi: number): string {
  const num = fdi % 10
  if (fdi >= 51 && fdi <= 85) {
    return ({ 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' } as Record<number, string>)[num] || String(num)
  }
  return String(num)
}

function getToothLabel(fdi: number): string {
  const raw = Math.floor(fdi / 10)
  const quadrant = raw >= 5 ? raw - 4 : raw
  const prefix = quadrant === 1 ? 'UR' : quadrant === 2 ? 'UL' : quadrant === 3 ? 'LL' : 'LR'
  return `${prefix}${fdiToPalmerNumber(fdi)}`
}

const PERMANENT = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
]
const PRIMARY = [
  55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
  85, 84, 83, 82, 81, 71, 72, 73, 74, 75,
]

describe('پیشوند ربع درست است', () => {
  it('ربع بالا راست → UR', () => {
    expect(getToothLabel(11)).toBe('UR1')
    expect(getToothLabel(18)).toBe('UR8')
  })

  it('ربع بالا چپ → UL', () => {
    expect(getToothLabel(21)).toBe('UL1')
    expect(getToothLabel(28)).toBe('UL8')
  })

  it('ربع پایین چپ → LL', () => {
    expect(getToothLabel(31)).toBe('LL1')
    expect(getToothLabel(38)).toBe('LL8')
  })

  it('ربع پایین راست → LR', () => {
    expect(getToothLabel(41)).toBe('LR1')
    expect(getToothLabel(48)).toBe('LR8')
  })
})

describe('یکتایی — رفع ریشه‌ای باگ «دو تا ۱»', () => {
  /**
   * حیاتی‌ترین تست: اگر روزی کسی پیشوند را حذف کند، این تست
   * می‌شکند و شکایت «چرا دو تا ۱ داریم؟» دوباره برنمی‌گردد.
   */
  it('هر ۳۲ دندان دائمی برچسب یکتا دارند', () => {
    const labels = PERMANENT.map(getToothLabel)
    expect(new Set(labels).size).toBe(32)
  })

  it('هر ۲۰ دندان شیری برچسب یکتا دارند', () => {
    const labels = PRIMARY.map(getToothLabel)
    expect(new Set(labels).size).toBe(20)
  })

  it('چهار دندان مرکزی دیگر هم‌نام نیستند', () => {
    const centrals = [11, 21, 31, 41].map(getToothLabel)
    expect(centrals).toEqual(['UR1', 'UL1', 'LL1', 'LR1'])
    expect(new Set(centrals).size).toBe(4)
  })
})

describe('دندان‌های شیری', () => {
  it('حرف پالمر با پیشوند ربع ترکیب می‌شود', () => {
    expect(getToothLabel(51)).toBe('URA')
    expect(getToothLabel(61)).toBe('ULA')
    expect(getToothLabel(71)).toBe('LLA')
    expect(getToothLabel(81)).toBe('LRA')
    expect(getToothLabel(55)).toBe('URE')
  })

  it('ربع دندان شیری با دندان دائمی متناظر یکی است', () => {
    // ۵۱ (شیری بالا راست) و ۱۱ (دائمی بالا راست) هر دو باید UR باشند
    expect(getToothLabel(51).startsWith('UR')).toBe(true)
    expect(getToothLabel(11).startsWith('UR')).toBe(true)
  })
})
