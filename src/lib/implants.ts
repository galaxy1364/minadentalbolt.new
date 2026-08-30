// implants.ts — the money and the workflow rules for an implant case.
//
// Both lived inside Implants.tsx: the surgeon's share was computed in a
// page-level function with no test, and the stage workflow had no rules
// at all, so a case could jump from "planned" straight to "completed"
// without a surgery ever being recorded.
//
// An implant is the most expensive thing a clinic sells and the longest
// running, so both of those matter more here than anywhere else.

export interface ImplantComponentLike {
  component_type?: string | null
  cost?: number | null
  include_in_doctor_share?: boolean | null
}

export interface ImplantCaseLike {
  total_cost?: number | null
  paid_amount?: number | null
  surgery_fee_mode?: 'formula' | 'negotiated' | null
  surgery_fee_amount?: number | null
  prosthesis_fee_amount?: number | null
  bone_graft_cost?: number | null
  sinus_lift_cost?: number | null
  components?: ImplantComponentLike[]
  stage?: string | null
  surgery_date?: string | null
  healing_abutment_date?: string | null
  impression_date?: string | null
  crown_delivery_date?: string | null
}

/**
 * Component costs deducted before the surgeon's split.
 *
 * The fixture is always excluded, whatever its include flag says: it is
 * billed to the patient separately and was never part of the surgeon's
 * deduction base. Making that unconditional here rather than trusting a
 * per-component checkbox means a mis-ticked box cannot quietly change
 * what a surgeon is paid.
 */
export function deductibleComponentCost(components: ImplantComponentLike[] = []): number {
  return components
    .filter((c) => c.component_type !== 'fixture' && c.include_in_doctor_share !== false)
    .reduce((sum, c) => sum + (c.cost || 0), 0)
}

/**
 * The surgeon's share.
 *
 * Negotiated cases return the agreed figure untouched — that is the
 * point of negotiating one. Formula cases take half of what is left
 * after deductible components.
 *
 * Rounded to whole toman. The previous version returned `net / 2`
 * unrounded, so an odd net produced half a toman that then appeared in
 * a currency field and in whatever total it fed. Clinic money is not
 * paid in fractions.
 *
 * Never negative: if components cost more than the case was sold for,
 * the clinic absorbs that. Handing the surgeon a negative share would
 * mean billing them for the privilege of operating.
 */
export function calcSurgeryShare(c: ImplantCaseLike): number {
  if (c.surgery_fee_mode === 'negotiated') return Math.round(c.surgery_fee_amount || 0)
  const net = (c.total_cost || 0) - deductibleComponentCost(c.components)
  return Math.max(0, Math.round(net / 2))
}

/** The prosthetics doctor's share is always a negotiated figure — there
 * is no formula for it — so this exists only to round consistently. */
export function calcProsthesisShare(c: ImplantCaseLike): number {
  return Math.max(0, Math.round(c.prosthesis_fee_amount || 0))
}

export interface CaseFinancials {
  totalCost: number
  paid: number
  remaining: number
  surgeryShare: number
  prosthesisShare: number
  /** What is left for the clinic after both doctors are paid. */
  clinicShare: number
}

export function caseFinancials(c: ImplantCaseLike): CaseFinancials {
  const totalCost = Math.round(c.total_cost || 0)
  const paid = Math.round(c.paid_amount || 0)
  const surgeryShare = calcSurgeryShare(c)
  const prosthesisShare = calcProsthesisShare(c)
  return {
    totalCost,
    paid,
    remaining: totalCost - paid,
    surgeryShare,
    prosthesisShare,
    clinicShare: totalCost - surgeryShare - prosthesisShare,
  }
}

/** The linear workflow. `failed` sits outside it: a case can fail from
 * any stage, and nothing follows it. */
export const IMPLANT_STAGES = [
  'planned', 'surgery_done', 'healing', 'impression', 'crown_delivery', 'completed',
] as const

export type ImplantStage = typeof IMPLANT_STAGES[number] | 'failed'

export function stageIndex(stage: string | null | undefined): number {
  const i = IMPLANT_STAGES.indexOf((stage || 'planned') as never)
  return i === -1 ? 0 : i
}

export interface StageMoveCheck {
  allowed: boolean
  reason: string | null
}

/**
 * Whether a case may move from one stage to another.
 *
 * Forward one step, or back to correct a mistake, or to `failed` from
 * anywhere. What is refused is SKIPPING: marking a case "completed"
 * while no surgery was ever recorded leaves a file claiming an implant
 * was delivered that has no operation behind it, and that file is what
 * a clinic would rely on years later in a warranty argument.
 *
 * Going backwards is deliberately allowed. Staff mis-tap, and forcing
 * them to live with a wrong stage is how a record stops being trusted.
 */
export function canMoveStage(from: string | null | undefined, to: string): StageMoveCheck {
  if (to === 'failed') return { allowed: true, reason: null }
  if (from === 'failed') {
    return to === 'planned'
      ? { allowed: true, reason: null }
      : { allowed: false, reason: 'پرونده ناموفق فقط به «برنامه‌ریزی شده» برمی‌گردد' }
  }
  if (!(IMPLANT_STAGES as readonly string[]).includes(to)) {
    return { allowed: false, reason: 'مرحله نامعتبر است' }
  }

  const a = stageIndex(from)
  const b = stageIndex(to)
  if (b <= a) return { allowed: true, reason: null }
  if (b === a + 1) return { allowed: true, reason: null }
  return {
    allowed: false,
    reason: 'نمی‌توان از روی مراحل پرید — مرحله‌ها باید به‌ترتیب ثبت شوند',
  }
}

/**
 * Chronological order of the recorded dates.
 *
 * Returned as errors so the caller refuses. A crown delivered before the
 * surgery is not a typo the clinic can shrug at: those dates drive the
 * warranty window and the healing interval.
 */
export function validateImplantDates(c: ImplantCaseLike): string[] {
  const errors: string[] = []
  const steps: [string, string | null | undefined][] = [
    ['جراحی', c.surgery_date],
    ['هیلینگ آباتمنت', c.healing_abutment_date],
    ['قالب‌گیری', c.impression_date],
    ['تحویل روکش', c.crown_delivery_date],
  ]

  let lastLabel: string | null = null
  let lastDate: string | null = null
  for (const [label, date] of steps) {
    if (!date) continue
    if (lastDate && date < lastDate) {
      errors.push(`تاریخ ${label} نمی‌تواند قبل از تاریخ ${lastLabel} باشد`)
    }
    lastLabel = label
    lastDate = date
  }
  return errors
}

/** Blocking validation for the case form. */
export function validateImplantCase(c: ImplantCaseLike): string[] {
  const errors = validateImplantDates(c)
  if ((c.total_cost || 0) < 0) errors.push('هزینه کل نمی‌تواند منفی باشد')
  if ((c.paid_amount || 0) < 0) errors.push('مبلغ پرداختی نمی‌تواند منفی باشد')
  if (c.surgery_fee_mode === 'negotiated' && (c.surgery_fee_amount || 0) < 0) {
    errors.push('حق‌الزحمه توافقی نمی‌تواند منفی باشد')
  }
  return errors
}
