/**
 * MOD-FEAT-026 | سطوح دندان — نماد ترکیبی استاندارد
 *
 * ممیزی مورد ۳ با یک ستون گم‌شده شروع شد و به چیز بزرگ‌تری رسید:
 * `treatments.tooth_surface` **یک** سطح را به صورت یک کلمه‌ی انگلیسی
 * نگه می‌داشت (`occlusal`)، و `lab_orders` اصلاً سطحی نداشت.
 *
 * A restoration is routinely a COMBINATION. «MOD» — mesio-occluso-distal
 * — is among the commonest restorations there is, and a single-valued
 * field cannot express it at all. The clinic simply had no way to record
 * what was actually done to the tooth.
 *
 * The international convention writes the combination as letters in one
 * fixed order: M, O, D, B, L. That order is not alphabetical and not
 * arbitrary — it runs mesial, occlusal, distal across the tooth and then
 * outward, and every dentist reads «MOD» the same way. Storing the
 * canonical string means the database column reads the same as the note
 * on paper.
 *
 * The parser still accepts the old long words so records written before
 * migration 033 keep working, but nothing writes them any more.
 */

export type SurfaceCode = 'M' | 'O' | 'D' | 'B' | 'L'

/**
 * ترتیب متعارف — نه الفبایی. «MOD» به این ترتیب خوانده می‌شود و
 * «DOM» یا «OMD» برای هیچ دندانپزشکی معنی ندارد.
 */
export const SURFACE_ORDER: readonly SurfaceCode[] = ['M', 'O', 'D', 'B', 'L'] as const

export const SURFACE_NAMES: Record<SurfaceCode, string> = {
  M: 'مزیال',
  O: 'اکلوزال',
  D: 'دیستال',
  B: 'باکال',
  L: 'لینگوال',
}

/** نام‌های قدیمی، برای رکوردهای پیش از migration 033. */
const LEGACY_NAMES: Record<string, SurfaceCode> = {
  mesial: 'M', occlusal: 'O', distal: 'D', buccal: 'B', lingual: 'L',
}

/**
 * Reads any stored value into a set of surfaces.
 *
 * Accepts a canonical code ('MOD'), a legacy long word ('occlusal'), and
 * a comma-separated list, because all three exist in real data or in
 * form state at some point. Unknown letters are dropped rather than
 * throwing: a malformed surface should not stop a treatment from
 * loading.
 */
export function parseSurfaces(value: string | null | undefined): SurfaceCode[] {
  if (!value) return []
  const raw = String(value).trim()
  if (!raw) return []

  const legacy = LEGACY_NAMES[raw.toLowerCase()]
  if (legacy) return [legacy]

  const parts = raw.includes(',')
    ? raw.split(',').flatMap((p) => {
        const one = LEGACY_NAMES[p.trim().toLowerCase()]
        return one ? [one] : p.trim().toUpperCase().split('')
      })
    : raw.toUpperCase().split('')

  const found = new Set<SurfaceCode>()
  for (const ch of parts) {
    if ((SURFACE_ORDER as readonly string[]).includes(ch)) found.add(ch as SurfaceCode)
  }
  return SURFACE_ORDER.filter((s) => found.has(s))
}

/**
 * The canonical string for storage: sorted into conventional order and
 * de-duplicated, so «DM» and «MDM» both become «MD» and the column never
 * holds two spellings of one thing.
 */
export function formatSurfaces(surfaces: SurfaceCode[] | string | null | undefined): string {
  const list = Array.isArray(surfaces) ? surfaces : parseSurfaces(surfaces)
  const found = new Set(list)
  return SURFACE_ORDER.filter((s) => found.has(s)).join('')
}

/** «مزیال، اکلوزال، دیستال» — برای جایی که کد به‌تنهایی گویا نیست. */
export function surfacesInPersian(value: string | SurfaceCode[] | null | undefined): string {
  const list = Array.isArray(value) ? value : parseSurfaces(value)
  return SURFACE_ORDER.filter((s) => list.includes(s)).map((s) => SURFACE_NAMES[s]).join('، ')
}

/** «MOD — مزیال، اکلوزال، دیستال» */
export function surfaceLabel(value: string | SurfaceCode[] | null | undefined): string {
  const code = formatSurfaces(Array.isArray(value) ? value : parseSurfaces(value))
  if (!code) return ''
  return `${code} — ${surfacesInPersian(code)}`
}

/** افزودن یا برداشتن یک سطح، همیشه با خروجی مرتب. */
export function toggleSurface(current: string | null | undefined, surface: SurfaceCode): string {
  const list = parseSurfaces(current)
  const next = list.includes(surface) ? list.filter((s) => s !== surface) : [...list, surface]
  return formatSurfaces(next)
}
