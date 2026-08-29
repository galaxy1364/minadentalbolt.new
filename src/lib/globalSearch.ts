// globalSearch.ts — ranking records from every module in one list.
//
// The command bar already knew how to *navigate* ("برو به بیماران"), but
// not how to *find* ("علی احمدی" → open that file). This adds the second
// half, reusing fuzzyScore rather than introducing a search dependency.
import { fuzzyScore, normalizeText } from './fuzzySearch'

/** Every kind of record reachable from the bar. Kept as a union so a new
 * entity cannot be added without also giving it a label and a route. */
export type GlobalResultKind =
  | 'patient' | 'appointment' | 'treatment' | 'labOrder' | 'payment' | 'page'

export interface GlobalResult {
  kind: GlobalResultKind
  id: string
  title: string
  subtitle: string | null
  route: string
  score: number
}

export const KIND_LABELS: Record<GlobalResultKind, string> = {
  patient: 'بیمار',
  appointment: 'نوبت',
  treatment: 'درمان',
  labOrder: 'لابراتوار',
  payment: 'پرداخت',
  page: 'صفحه',
}

/**
 * Per-kind weight. A patient name is what staff search for by far the
 * most, so an equally-good textual match on a patient outranks one on a
 * lab order. Without this, typing a common first name buries the person
 * under every treatment that mentions them.
 */
const KIND_WEIGHT: Record<GlobalResultKind, number> = {
  patient: 1.4,
  page: 1.2,
  appointment: 1.0,
  treatment: 0.9,
  labOrder: 0.85,
  payment: 0.8,
}

export interface SearchableRecord {
  kind: GlobalResultKind
  id: string
  title: string
  subtitle?: string | null
  route: string
  /** Extra text to match against that is not shown, e.g. national ID. */
  keywords?: (string | null | undefined)[]
}

/**
 * Scores one record. Returns null when nothing matches, so callers can
 * filter without a second pass.
 *
 * The title is weighted above keywords: matching a visible name is a
 * stronger signal than matching a hidden field the user cannot see.
 */
export function scoreRecord(query: string, rec: SearchableRecord): GlobalResult | null {
  const q = normalizeText(query)
  if (!q) return null

  const titleScore = fuzzyScore(q, rec.title)
  const subtitleScore = rec.subtitle ? fuzzyScore(q, rec.subtitle) : null

  let keywordScore: number | null = null
  for (const kw of rec.keywords || []) {
    if (!kw) continue
    const s = fuzzyScore(q, kw)
    if (s !== null && (keywordScore === null || s > keywordScore)) keywordScore = s
  }

  const best = Math.max(
    titleScore ?? -Infinity,
    (subtitleScore ?? -Infinity) * 0.7,
    (keywordScore ?? -Infinity) * 0.85,
  )
  if (!Number.isFinite(best)) return null

  return {
    kind: rec.kind,
    id: rec.id,
    title: rec.title,
    subtitle: rec.subtitle ?? null,
    route: rec.route,
    score: best * KIND_WEIGHT[rec.kind],
  }
}

export interface RankOptions {
  /** Cap on returned rows. A command bar that scrolls is a list, not a
   * shortcut, so this stays small by default. */
  limit?: number
  /** When set, only this kind is returned — used by the `بیمار:` prefix. */
  kind?: GlobalResultKind | null
}

export function rankResults(
  query: string,
  records: SearchableRecord[],
  options: RankOptions = {},
): GlobalResult[] {
  const { limit = 8, kind = null } = options
  const out: GlobalResult[] = []
  for (const rec of records) {
    if (kind && rec.kind !== kind) continue
    const scored = scoreRecord(query, rec)
    if (scored) out.push(scored)
  }
  out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'fa'))
  return out.slice(0, limit)
}

/** Prefixes that narrow the search, e.g. "بیمار: احمدی". Typing the
 * prefix alone is treated as an empty query rather than a literal search
 * for the word, which would otherwise return nothing and look broken. */
const KIND_PREFIXES: Record<string, GlobalResultKind> = {
  'بیمار': 'patient',
  'نوبت': 'appointment',
  'درمان': 'treatment',
  'لابراتوار': 'labOrder',
  'پرداخت': 'payment',
  'صفحه': 'page',
}

export interface ParsedQuery {
  kind: GlobalResultKind | null
  text: string
}

export function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim()
  const colon = trimmed.indexOf(':')
  if (colon === -1) return { kind: null, text: trimmed }

  const head = normalizeText(trimmed.slice(0, colon))
  const kind = KIND_PREFIXES[head]
  if (!kind) return { kind: null, text: trimmed }
  return { kind, text: trimmed.slice(colon + 1).trim() }
}

/** Groups results for a sectioned list while preserving rank order
 * inside and between groups. */
export function groupByKind(results: GlobalResult[]): { kind: GlobalResultKind; items: GlobalResult[] }[] {
  const order: GlobalResultKind[] = []
  const buckets = new Map<GlobalResultKind, GlobalResult[]>()
  for (const r of results) {
    if (!buckets.has(r.kind)) { buckets.set(r.kind, []); order.push(r.kind) }
    buckets.get(r.kind)!.push(r)
  }
  return order.map((kind) => ({ kind, items: buckets.get(kind)! }))
}
