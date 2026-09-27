/**
 * Lightweight fuzzy search — no dependency needed for the scale of data
 * (hundreds to a few thousand local records per clinic).
 *
 * Handles the two things that make search feel "smart" in Persian UIs:
 *  - Character normalization (ي/ی, ك/ک, digit variants, diacritics removed)
 *  - Typo tolerance via subsequence matching + a relevance score, so
 *    "علی احمد" also matches when the user types "احمدی" or "علیاحمد"
 *    or makes a small typo.
 */

const ARABIC_TO_PERSIAN: Record<string, string> = { 'ي': 'ی', 'ك': 'ک', 'ة': 'ه' }
const PERSIAN_DIGITS: Record<string, string> = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' }

export function normalizeText(input: string): string {
  let s = input.toLowerCase().trim()
  s = s.replace(/[يكة]/g, (c) => ARABIC_TO_PERSIAN[c] ?? c)
  s = s.replace(/[۰-۹]/g, (c) => PERSIAN_DIGITS[c] ?? c)
  s = s.replace(/[\u064B-\u065F\u0670]/g, '') // strip Arabic diacritics
  s = s.replace(/\s+/g, ' ')
  return s
}

/**
 * Returns a relevance score (higher = better match) or null if no match.
 * - Exact substring match scores highest.
 * - Subsequence match (typo-tolerant, e.g. "cnl" matches "canal") scores lower.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = normalizeText(query)
  const t = normalizeText(target)
  if (!q) return 0
  if (!t) return null

  const idx = t.indexOf(q)
  if (idx !== -1) {
    // Prefer matches at the start of the string or a word boundary
    const atStart = idx === 0 || t[idx - 1] === ' '
    return 100 - idx * 0.5 + (atStart ? 20 : 0)
  }

  // Subsequence match: every character of q appears in order within t
  let ti = 0
  let gaps = 0
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return null
    gaps += found - ti
    ti = found + 1
  }
  return Math.max(1, 40 - gaps)
}

export interface SearchableField {
  value: string
  weight?: number
}

/** Scores an item across multiple fields (name, phone, id, etc.), returns the best weighted score. */
export function scoreFields(query: string, fields: SearchableField[]): number | null {
  let best: number | null = null
  for (const f of fields) {
    const s = fuzzyScore(query, f.value)
    if (s === null) continue
    const weighted = s * (f.weight ?? 1)
    if (best === null || weighted > best) best = weighted
  }
  return best
}

/** Returns [start, end) ranges in `target` (normalized) that matched `query`, for highlighting. */
export function matchRanges(query: string, target: string): [number, number][] {
  const q = normalizeText(query)
  const t = normalizeText(target)
  if (!q) return []
  const idx = t.indexOf(q)
  if (idx !== -1) return [[idx, idx + q.length]]
  return []
}
