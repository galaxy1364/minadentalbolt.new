/**
 * MOD-FEAT-040 | اقلام هزینه‌ی ایمپلنت
 *
 * فهرست مهدی: کشیدن، پودر استخوان، ممبران، سینوس لیفت، جراحی لثه، بازسازی
 * استخوان، بارگذاری فوری، جراحی فک — هر کدام با قیمت خودش. دستمزد جراح.
 * و برای پروتزکار: دستمزد، تعداد روکش، پونتیک، نوع روکش (PFM، زیرکونیا،
 * IPS)، چسبی یا پیچ‌شونده. «و بقیه‌ی اپشن‌ها.»
 *
 * The case row had six booleans and two cost columns. A boolean cannot
 * carry a price, a column per option cannot carry "and the rest", and
 * neither could say who earns the money. Migration 035 replaced them
 * with one line per priced thing; this file is the vocabulary those
 * lines speak and the arithmetic over them.
 *
 * `kind` is what the app knows. `label` is what the clinic wrote. A kind
 * the app has not heard of yet is still a valid line — the clinic's
 * word is recorded, not refused.
 */

export type CostGroup = 'surgical' | 'fee' | 'prosthetic'

export interface CostKind {
  kind: string
  label: string
  group: CostGroup
  /** آیا تعداد معنی دارد — روکش و پونتیک بله، سینوس لیفت نه. */
  countable?: boolean
  /** آیا نوع نگهداری (چسبی/پیچ) معنی دارد. */
  hasRetention?: boolean
}

export const COST_KINDS: readonly CostKind[] = [
  // ── جراحی ─────────────────────────────────────────────
  { kind: 'extraction',        label: 'کشیدن دندان',            group: 'surgical' },
  { kind: 'bone_graft',        label: 'پیوند استخوان (پودر)',   group: 'surgical' },
  { kind: 'membrane',          label: 'ممبران',                  group: 'surgical' },
  { kind: 'sinus_lift',        label: 'سینوس لیفت',              group: 'surgical' },
  { kind: 'gum_surgery',       label: 'جراحی لثه',               group: 'surgical' },
  { kind: 'gbr',               label: 'بازسازی استخوان (GBR)',  group: 'surgical' },
  { kind: 'immediate_loading', label: 'بارگذاری فوری',           group: 'surgical' },
  { kind: 'jaw_surgery',       label: 'جراحی فک',                group: 'surgical' },
  // ── دستمزد ────────────────────────────────────────────
  { kind: 'surgeon_fee',       label: 'دستمزد جراح',             group: 'fee' },
  { kind: 'prosthodontist_fee',label: 'دستمزد پروتزکار',         group: 'fee' },
  // ── پروتز ─────────────────────────────────────────────
  { kind: 'crown_pfm',         label: 'روکش PFM',                group: 'prosthetic', countable: true, hasRetention: true },
  { kind: 'crown_zirconia',    label: 'روکش زیرکونیا',           group: 'prosthetic', countable: true, hasRetention: true },
  { kind: 'crown_ips',         label: 'روکش IPS',                group: 'prosthetic', countable: true, hasRetention: true },
  { kind: 'pontic',            label: 'پونتیک',                  group: 'prosthetic', countable: true },
  { kind: 'abutment',          label: 'اباتمنت',                 group: 'prosthetic', countable: true },
  // ── سایر ──────────────────────────────────────────────
  { kind: 'other',             label: 'سایر',                    group: 'surgical' },
] as const

export const RETENTION_LABELS: Record<string, string> = {
  cemented: 'چسبی',
  screw: 'پیچ‌شونده',
}

export const GROUP_LABELS: Record<CostGroup, string> = {
  surgical: 'جراحی',
  fee: 'دستمزد',
  prosthetic: 'پروتز',
}

export function costKindMeta(kind: string): CostKind {
  return COST_KINDS.find((k) => k.kind === kind)
    ?? { kind, label: kind, group: 'surgical' }
}

export interface CostItemLike {
  id?: string
  kind: string
  label: string
  variant?: string | null
  quantity: number
  unit_price: number
  doctor_id?: string | null
  is_active?: boolean | null
}

export function lineTotal(item: CostItemLike): number {
  const q = Math.max(1, Math.floor(Number(item.quantity) || 1))
  const p = Math.max(0, Number(item.unit_price) || 0)
  return q * p
}

/** جمع همه‌ی اقلام فعال. */
export function itemsTotal(items: CostItemLike[]): number {
  return items.filter((i) => i.is_active !== false).reduce((s, i) => s + lineTotal(i), 0)
}

/**
 * The full price of a case: the fixture itself plus every line.
 *
 * `total_cost` stays on the case as the implant's own price — it was
 * always that, and the lines are what sits around it.
 */
export function caseTotal(fixturePrice: number | null | undefined, items: CostItemLike[]): number {
  return Math.max(0, Number(fixturePrice) || 0) + itemsTotal(items)
}

/** جمع هر گروه، برای نمایش تفکیکی. */
export function totalsByGroup(items: CostItemLike[]): Record<CostGroup, number> {
  const out: Record<CostGroup, number> = { surgical: 0, fee: 0, prosthetic: 0 }
  for (const i of items) {
    if (i.is_active === false) continue
    out[costKindMeta(i.kind).group] += lineTotal(i)
  }
  return out
}

/**
 * چه کسی چقدر می‌گیرد.
 *
 * Only fee lines are attributed — a membrane is a cost to the patient,
 * not income to a doctor. Lines with no doctor go under `unassigned` so
 * the total still reconciles instead of silently losing money.
 */
export function feesByDoctor(items: CostItemLike[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const i of items) {
    if (i.is_active === false) continue
    if (costKindMeta(i.kind).group !== 'fee') continue
    const key = i.doctor_id || 'unassigned'
    out[key] = (out[key] || 0) + lineTotal(i)
  }
  return out
}

/** «۲ × روکش زیرکونیا (پیچ‌شونده)» */
export function describeItem(item: CostItemLike): string {
  const meta = costKindMeta(item.kind)
  const label = item.label || meta.label
  const qty = meta.countable && item.quantity > 1 ? `${item.quantity} × ` : ''
  const ret = item.variant && RETENTION_LABELS[item.variant] ? ` (${RETENTION_LABELS[item.variant]})` : ''
  return `${qty}${label}${ret}`
}

/**
 * OPG یادآوری، هم‌زمان با تعیین هیلینگ.
 *
 * Mehdi: «در مرحله ثبت تاریخ OPG همزمان با نوبت‌دهی هیلینگ باید یادآوری
 * شود.» The X-ray is what tells the surgeon healing actually worked, so
 * its reminder belongs to the same decision as the healing length —
 * not a separate field someone has to remember to fill.
 *
 * Two weeks before healing ends: early enough to book the slot, late
 * enough that the bone has had its time.
 */
export function suggestOpgDate(healingEndISO: string | null): string | null {
  if (!healingEndISO) return null
  const d = new Date(`${String(healingEndISO).slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() - 14)
  return d.toISOString().slice(0, 10)
}

/**
 * MOD-FEAT-041 | از ایمپلنت به لابراتوار
 *
 * گزارش مهدی (سه بار): «قالب‌گیری و ارسال به لابراتوار و ردیابی خطی و
 * دریافت و نوبت تحویل هم داشته باشد.»
 *
 * The implant card knew "next: send to lab" and offered no way to do it.
 * The lab order form asked for everything again — patient, doctor,
 * tooth, work type, material — all of which the implant case already
 * knew. Retyping is where the crown ends up ordered for the wrong tooth.
 *
 * This derives the order from the case and its priced lines. The
 * material comes from the crown line; a case with a zirconia crown
 * priced on it sends a zirconia order. If nothing is priced yet, the
 * order still goes out as a generic implant crown — the lab needs it,
 * and the clinic can fix the material before it ships.
 */
export interface ImplantCaseForLab {
  id: string
  patient_id: string
  doctor_id?: string | null
  prosthesis_doctor_id?: string | null
  tooth_number?: string | null
}

const CROWN_MATERIAL: Record<string, string> = {
  crown_pfm: 'pfm',
  crown_zirconia: 'zirconia',
  crown_ips: 'ips_emax',
}

export interface DerivedLabOrder {
  patient_id: string
  doctor_id: string | null
  tooth_number: string | null
  work_type: string
  material: string | null
  /** تعداد واحدهای پروتز — روکش‌ها + پونتیک‌ها. */
  units: number
  /** یادداشت برای لابراتوار: چه چیزی، چند تا، چه نوع نگهداری. */
  notes: string
}

export function deriveLabOrderFromImplant(
  c: ImplantCaseForLab,
  items: CostItemLike[],
): DerivedLabOrder {
  const active = items.filter((i) => i.is_active !== false)
  const crowns = active.filter((i) => i.kind in CROWN_MATERIAL)
  const pontics = active.filter((i) => i.kind === 'pontic')

  // The prosthodontist owns the crown; fall back to the surgeon only when
  // no one else is named, so the order is never doctor-less.
  const doctor_id = c.prosthesis_doctor_id || c.doctor_id || null

  const crownUnits = crowns.reduce((s, i) => s + Math.max(1, Math.floor(Number(i.quantity) || 1)), 0)
  const ponticUnits = pontics.reduce((s, i) => s + Math.max(1, Math.floor(Number(i.quantity) || 1)), 0)

  // One material per order. With mixed crown types the first priced
  // wins and the note says the rest — a lab reads notes, not enums.
  const material = crowns.length ? CROWN_MATERIAL[crowns[0].kind] : null
  const retention = crowns.find((i) => i.variant)?.variant ?? null

  const parts: string[] = []
  for (const i of crowns) parts.push(describeItem(i))
  if (ponticUnits > 0) parts.push(`${ponticUnits} × پونتیک`)
  if (retention) parts.push(`نگهداری: ${RETENTION_LABELS[retention] ?? retention}`)
  const notes = parts.length ? `روکش ایمپلنت — ${parts.join('، ')}` : 'روکش ایمپلنت'

  return {
    patient_id: c.patient_id,
    doctor_id,
    tooth_number: c.tooth_number ?? null,
    work_type: crownUnits + ponticUnits > 1 ? 'bridge' : 'implant_crown',
    material,
    units: Math.max(1, crownUnits + ponticUnits),
    notes,
  }
}
