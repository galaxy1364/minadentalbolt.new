/**
 * MOD-FEAT-040 | گزینه‌های جراحی ایمپلنت، هر کدام با قیمت خودش
 *
 * گزارش مهدی: «برای کشیدن، پودر استخوان، ممبران، سینوس لیفت، جراحی لثه،
 * بازسازی استخوان، بارگذاری فوری و بقیه اپشن‌ها باید بشود قیمت جداگانه ثبت
 * کرد، و دستمزد هم اضافه شود با قیمت، و جراحی فک.»
 *
 * The case had six yes/no flags and prices for two of them. Extraction,
 * membrane, GBR and immediate loading were a checkbox with no number:
 * their cost went into the total by hand, or nowhere. Gum surgery, jaw
 * surgery and the surgeon's own fee did not exist.
 *
 * One itemised list instead of sixteen columns. The catalogue below is
 * the vocabulary; a case stores `[{key, label, cost}]` so the label
 * survives if the catalogue is renamed and «سایر» can carry free text.
 */

export type ExtraKey =
  | 'extraction' | 'bone_graft' | 'membrane' | 'sinus_lift' | 'gum_surgery'
  | 'gbr' | 'immediate_loading' | 'jaw_surgery' | 'surgeon_fee' | 'other'

export interface ImplantExtra {
  key: ExtraKey
  label: string
  cost: number
}

/** ترتیب کاتالوگ همان ترتیب فرم است — از رایج به نادر، دستمزد آخر. */
export const EXTRA_CATALOG: { key: ExtraKey; label: string }[] = [
  { key: 'extraction', label: 'کشیدن دندان' },
  { key: 'bone_graft', label: 'پودر استخوان' },
  { key: 'membrane', label: 'ممبران' },
  { key: 'sinus_lift', label: 'سینوس لیفت' },
  { key: 'gum_surgery', label: 'جراحی لثه' },
  { key: 'gbr', label: 'بازسازی استخوان (GBR)' },
  { key: 'immediate_loading', label: 'بارگذاری فوری' },
  { key: 'jaw_surgery', label: 'جراحی فک' },
  { key: 'surgeon_fee', label: 'دستمزد جراح' },
  { key: 'other', label: 'سایر' },
]

const KNOWN = new Set(EXTRA_CATALOG.map((e) => e.key))

/**
 * Reads whatever is stored — a JSON string from Dexie, an array from
 * Postgres, or nothing — into a clean list. Unknown keys are kept, not
 * dropped: a cost recorded under a key this build does not recognise is
 * still money the patient was charged.
 */
export function parseExtras(value: unknown): ImplantExtra[] {
  let raw: unknown = value
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { return [] }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      key: (KNOWN.has(String(x.key) as ExtraKey) ? String(x.key) : 'other') as ExtraKey,
      label: String(x.label ?? EXTRA_CATALOG.find((e) => e.key === x.key)?.label ?? 'سایر'),
      cost: Number.isFinite(Number(x.cost)) ? Math.max(0, Number(x.cost)) : 0,
    }))
}

/** جمع آیتم‌ها — عددی که به هزینه‌ی پایه اضافه می‌شود. */
export function extrasTotal(extras: ImplantExtra[] | unknown): number {
  const list = Array.isArray(extras) && extras.every((e) => e && typeof e === 'object' && 'cost' in e)
    ? (extras as ImplantExtra[])
    : parseExtras(extras)
  return list.reduce((sum, e) => sum + (Number(e.cost) || 0), 0)
}

/**
 * Full cost of a case: the base implant plus every extra. This is the
 * one place that adds them, so the card, the balance bar and billing
 * cannot disagree about what the patient owes.
 */
export function implantCaseTotal(c: { total_cost?: number | null; extras?: unknown }): number {
  return Number(c.total_cost || 0) + extrasTotal(c.extras)
}

/** افزودن یا برداشتن یک آیتم — همیشه با برچسب کاتالوگ. */
export function toggleExtra(list: ImplantExtra[], key: ExtraKey): ImplantExtra[] {
  if (list.some((e) => e.key === key) && key !== 'other') return list.filter((e) => e.key !== key)
  const label = EXTRA_CATALOG.find((e) => e.key === key)?.label ?? 'سایر'
  return [...list, { key, label, cost: 0 }]
}

export function setExtraCost(list: ImplantExtra[], index: number, cost: number): ImplantExtra[] {
  return list.map((e, i) => (i === index ? { ...e, cost: Math.max(0, Number(cost) || 0) } : e))
}

export function setExtraLabel(list: ImplantExtra[], index: number, label: string): ImplantExtra[] {
  return list.map((e, i) => (i === index ? { ...e, label } : e))
}
