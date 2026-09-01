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
/**
 * MOD-FEAT-032 | براکت واقعی پالمر
 *
 * گزارش مهدی: «پالمر باشد، L1 به این سبک.»
 *
 * `UR۱` was unambiguous and easy to build, but it is not Palmer notation
 * — it is a quadrant abbreviation with a number after it. Real Palmer
 * writes an L-shaped bracket around the digit, and the shape itself
 * carries the quadrant:
 *
 *   horizontal stroke on TOP    → upper jaw
 *   horizontal stroke on BOTTOM → lower jaw
 *   vertical stroke on the side facing the MIDLINE
 *
 * Which gives, with the chart drawn facing the patient:
 *
 *   ┐۱  بالا راست     ┌۱  بالا چپ
 *   ┘۱  پایین راست    └۱  پایین چپ   ← «L1» مهدی
 *
 * The digit sits inside the bracket's corner, which is why the bracket
 * leads for left quadrants and trails for right ones.
 */
const PALMER_BRACKET: Record<Quadrant, { char: string; before: boolean }> = {
  // Midline is to the right of these, so the vertical stroke goes right.
  UR: { char: '┐', before: false },
  LR: { char: '┘', before: false },
  // Midline is to the left, so the vertical stroke goes left.
  UL: { char: '┌', before: true },
  LL: { char: '└', before: true },
}

export function toothLabel(value: string | number | null | undefined): string {
  const fdi = parseFdi(value)
  if (fdi === null) return value === null || value === undefined ? '' : String(value)
  const quadrant = toothQuadrant(fdi)
  if (!quadrant) return String(value)

  const digit = toPersianDigits(palmerSymbol(fdi))
  const { char, before } = PALMER_BRACKET[quadrant]
  return before ? `${char}${digit}` : `${digit}${char}`
}

/**
 * کد ربع‌دار — `UR۱`.
 *
 * Kept for places where a bracket cannot be trusted to render: printed
 * documents, exported files, and anywhere the text may be copied into
 * another system. The bracket is the clinical notation; this is the
 * portable one.
 */
export function toothCode(value: string | number | null | undefined): string {
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

/**
 * MOD-FIX-013 | نام فارسی سمت و فک دندان
 *
 * گزارش مهدی: «بالایی میشه بالا راست بیمار، پایینی میشه پایین چپ بیمار.»
 *
 * The quadrant prefix is an abbreviation a dentist reads fluently, but it
 * is also the exact thing that was silently mirrored — and a wrong `UL`
 * looks just as plausible as a right one. Spelling the side out next to
 * the code means a flip is readable at a glance instead of needing to be
 * decoded.
 *
 * «بیمار» is in the wording on purpose: right and left in a dental chart
 * are always the patient's, never the viewer's, and that is precisely the
 * confusion that produced the bug.
 */
export function toothSideLabel(value: string | number | null | undefined): string {
  const q = toothQuadrantOf(value)
  if (!q) return ''
  const jaw = q === 'UR' || q === 'UL' ? 'بالا' : 'پایین'
  const side = q === 'UR' || q === 'LR' ? 'راست' : 'چپ'
  return `${jaw} ${side} بیمار`
}

/** ربع یک مقدار خام (رشته یا عدد)، یا null اگر دندان معتبری نباشد. */
export function toothQuadrantOf(value: string | number | null | undefined): Quadrant | null {
  // MOD-FEAT-032: reads the portable code, not the display label. The
  // label is now a bracket plus a digit, and slicing two characters off
  // it would return the bracket.
  const fdi = parseFdi(value)
  return fdi === null ? null : toothQuadrant(fdi)
}

/** «UR۱ — بالا راست بیمار» */
export function toothFullLabel(value: string | number | null | undefined): string {
  const label = toothLabel(value)
  if (!label) return ''
  const side = toothSideLabel(value)
  return side ? `${label} — ${side}` : label
}
