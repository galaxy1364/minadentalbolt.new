/**
 * MOD-FIX-006 | قوس پالمر — داده‌ی ردیف‌ها و تشخیص خط وسط
 *
 * Why this file exists at all: the arch rows and the midline rule used to
 * live inside PalmerToothPicker.tsx, where nothing could reach them
 * without rendering React. That is exactly how the midline bug survived —
 * the divider condition was never executable in a test, so it could be
 * wrong in two different ways at once and still look "reviewed".
 *
 * The rule itself is deliberately expressed as a side transition
 * (راست → چپ) rather than by matching a tooth's printed label. Palmer
 * prints '1' for BOTH central incisors and 'A' for both primary centrals,
 * so any label-matching rule is either doubled or blind depending on which
 * dentition is on screen. The side boundary is the anatomical midline by
 * definition, in every dentition, forever.
 */

export interface ToothEntry {
  fdi: number
  palmer: string
  side: 'راست' | 'چپ'
  jaw: 'بالا' | 'پایین'
}

export const upperRow: ToothEntry[] = [
  { fdi: 18, palmer: '8', side: 'راست', jaw: 'بالا' }, { fdi: 17, palmer: '7', side: 'راست', jaw: 'بالا' },
  { fdi: 16, palmer: '6', side: 'راست', jaw: 'بالا' }, { fdi: 15, palmer: '5', side: 'راست', jaw: 'بالا' },
  { fdi: 14, palmer: '4', side: 'راست', jaw: 'بالا' }, { fdi: 13, palmer: '3', side: 'راست', jaw: 'بالا' },
  { fdi: 12, palmer: '2', side: 'راست', jaw: 'بالا' }, { fdi: 11, palmer: '1', side: 'راست', jaw: 'بالا' },
  { fdi: 21, palmer: '1', side: 'چپ', jaw: 'بالا' }, { fdi: 22, palmer: '2', side: 'چپ', jaw: 'بالا' },
  { fdi: 23, palmer: '3', side: 'چپ', jaw: 'بالا' }, { fdi: 24, palmer: '4', side: 'چپ', jaw: 'بالا' },
  { fdi: 25, palmer: '5', side: 'چپ', jaw: 'بالا' }, { fdi: 26, palmer: '6', side: 'چپ', jaw: 'بالا' },
  { fdi: 27, palmer: '7', side: 'چپ', jaw: 'بالا' }, { fdi: 28, palmer: '8', side: 'چپ', jaw: 'بالا' },
]

export const lowerRow: ToothEntry[] = [
  { fdi: 48, palmer: '8', side: 'راست', jaw: 'پایین' }, { fdi: 47, palmer: '7', side: 'راست', jaw: 'پایین' },
  { fdi: 46, palmer: '6', side: 'راست', jaw: 'پایین' }, { fdi: 45, palmer: '5', side: 'راست', jaw: 'پایین' },
  { fdi: 44, palmer: '4', side: 'راست', jaw: 'پایین' }, { fdi: 43, palmer: '3', side: 'راست', jaw: 'پایین' },
  { fdi: 42, palmer: '2', side: 'راست', jaw: 'پایین' }, { fdi: 41, palmer: '1', side: 'راست', jaw: 'پایین' },
  { fdi: 31, palmer: '1', side: 'چپ', jaw: 'پایین' }, { fdi: 32, palmer: '2', side: 'چپ', jaw: 'پایین' },
  { fdi: 33, palmer: '3', side: 'چپ', jaw: 'پایین' }, { fdi: 34, palmer: '4', side: 'چپ', jaw: 'پایین' },
  { fdi: 35, palmer: '5', side: 'چپ', jaw: 'پایین' }, { fdi: 36, palmer: '6', side: 'چپ', jaw: 'پایین' },
  { fdi: 37, palmer: '7', side: 'چپ', jaw: 'پایین' }, { fdi: 38, palmer: '8', side: 'چپ', jaw: 'پایین' },
]

export const upperRowPrimary: ToothEntry[] = [
  { fdi: 55, palmer: 'E', side: 'راست', jaw: 'بالا' }, { fdi: 54, palmer: 'D', side: 'راست', jaw: 'بالا' },
  { fdi: 53, palmer: 'C', side: 'راست', jaw: 'بالا' }, { fdi: 52, palmer: 'B', side: 'راست', jaw: 'بالا' },
  { fdi: 51, palmer: 'A', side: 'راست', jaw: 'بالا' }, { fdi: 61, palmer: 'A', side: 'چپ', jaw: 'بالا' },
  { fdi: 62, palmer: 'B', side: 'چپ', jaw: 'بالا' }, { fdi: 63, palmer: 'C', side: 'چپ', jaw: 'بالا' },
  { fdi: 64, palmer: 'D', side: 'چپ', jaw: 'بالا' }, { fdi: 65, palmer: 'E', side: 'چپ', jaw: 'بالا' },
]

export const lowerRowPrimary: ToothEntry[] = [
  { fdi: 85, palmer: 'E', side: 'راست', jaw: 'پایین' }, { fdi: 84, palmer: 'D', side: 'راست', jaw: 'پایین' },
  { fdi: 83, palmer: 'C', side: 'راست', jaw: 'پایین' }, { fdi: 82, palmer: 'B', side: 'راست', jaw: 'پایین' },
  { fdi: 81, palmer: 'A', side: 'راست', jaw: 'پایین' }, { fdi: 71, palmer: 'A', side: 'چپ', jaw: 'پایین' },
  { fdi: 72, palmer: 'B', side: 'چپ', jaw: 'پایین' }, { fdi: 73, palmer: 'C', side: 'چپ', jaw: 'پایین' },
  { fdi: 74, palmer: 'D', side: 'چپ', jaw: 'پایین' }, { fdi: 75, palmer: 'E', side: 'چپ', jaw: 'پایین' },
]

/** همه‌ی ردیف‌هایی که پیکر می‌تواند نمایش دهد — تست‌ها روی همین می‌چرخند. */
export const allArchRows: ToothEntry[][] = [upperRow, lowerRow, upperRowPrimary, lowerRowPrimary]

/**
 * True only for the first tooth of the left side, i.e. the one position
 * where the midline divider belongs. Returns false at index 0 so a row can
 * never open with a stray divider.
 */
export function isMidlineStart(row: ToothEntry[], index: number): boolean {
  if (index <= 0 || index >= row.length) return false
  return row[index - 1].side === 'راست' && row[index].side === 'چپ'
}
