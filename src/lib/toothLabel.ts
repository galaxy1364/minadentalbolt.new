/**
 * MOD-FEAT-023 | یک نام برای هر دندان، در تمام برنامه
 *
 * گزارش مهدی: «وقتی پالمره باید همه جا پالمر باشه، نه اینکه من دندون یک
 * رو انتخاب کنم ولی در نهایت تو بخشایی که میخوام مالی پرداخت کنم بزنه
 * دندون یازده.»
 *
 * چارت می‌گفت `UR1`. درمان، پرداخت، لابراتوار، ایمپلنت، رسید و پرونده‌ی
 * چاپی همه می‌گفتند «دندان ۱۱». یک دندان، دو اسم — و بیمار سؤال می‌کند
 * کدام است.
 *
 * The cause is the familiar one in this codebase: the label logic lived
 * *inside* `DentalChart` as a local function, so nothing else could reach
 * it and every other screen fell back to printing the raw FDI number. Its
 * own test even copied the function rather than importing it, which is
 * the clearest possible sign that it was in the wrong place.
 *
 * FDI stays the storage format — it is unambiguous, numeric, and what the
 * database already holds. Palmer is the *display* format. Converting at
 * the edge means no migration and no risk of two notations in one column.
 */
import { toPersianDigits } from './persianDate'

export type Quadrant = 'UR' | 'UL' | 'LL' | 'LR'

/**
 * ربع دندان از روی رقم اول FDI.
 * ۱=بالا راست · ۲=بالا چپ · ۳=پایین چپ · ۴=پایین راست
 * دندان‌های شیری (۵۱–۸۵) همان ترتیب را دارند، چهار واحد بالاتر.
 */
export function toothQuadrant(fdi: number): Quadrant | null {
  const raw = Math.floor(fdi / 10)
  const q = raw >= 5 ? raw - 4 : raw
  return q === 1 ? 'UR' : q === 2 ? 'UL' : q === 3 ? 'LL' : q === 4 ? 'LR' : null
}

/** نماد پالمر: ۱–۸ برای دائمی، A–E برای شیری. */
export function palmerSymbol(fdi: number): string {
  const n = fdi % 10
  if (fdi >= 51 && fdi <= 85) {
    return ({ 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' } as Record<number, string>)[n] || String(n)
  }
  return String(n)
}

function parseFdi(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isInteger(n)) return null
  const inPermanent = n >= 11 && n <= 48 && n % 10 >= 1 && n % 10 <= 8
  const inPrimary = n >= 51 && n <= 85 && n % 10 >= 1 && n % 10 <= 5
  return inPermanent || inPrimary ? n : null
}

/**
 * برچسب پالمر یک دندان: `UR۱`
 *
 * Numbers are rendered in Persian digits because every other figure in
 * the app is, and the competitor's own chart does the same. The quadrant
 * prefix stays Latin — it is an abbreviation, not a number, and «بالا
 * راست ۱» is longer than the space under a tooth allows.
 *
 * A value that is not a valid FDI tooth is returned untouched rather than
 * silently replaced: a clinic that typed something unusual into that
 * field should see what they typed, not a guess.
 */
export function toothLabel(value: string | number | null | undefined): string {
  const fdi = parseFdi(value)
  if (fdi === null) return value === null || value === undefined ? '' : String(value)
  const quadrant = toothQuadrant(fdi)
  if (!quadrant) return String(value)
  return `${quadrant}${toPersianDigits(palmerSymbol(fdi))}`
}

/** «دندان UR۱» — برای جاهایی که کلمه هم لازم است. */
export function toothLabelWithWord(value: string | number | null | undefined, fallback = '—'): string {
  const label = toothLabel(value)
  return label ? `دندان ${label}` : fallback
}
