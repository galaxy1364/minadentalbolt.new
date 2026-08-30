// insurance.ts — how an insurance policy actually splits a treatment cost.
//
// The rule that matters, and that the app previously had no concept of:
// a policy carries a **ceiling** (سقف تعهد). Once cumulative approved
// claims reach it, the insurer pays nothing more and the remainder falls
// on the patient — even mid-treatment. Without this, the app would quote
// a covered price the insurer will refuse, and the clinic eats the gap.
import type { InsuranceClaim } from '../types'

/** A patient's policy with one insurer. A patient may hold several. */
export interface PatientPolicy {
  id: string
  clinic_id: string
  patient_id: string
  company_id: string | null
  policy_number: string | null
  /** ISO date (yyyy-mm-dd) or null for open-ended. */
  start_date: string | null
  end_date: string | null
  /** Insurer's share of a covered treatment, 0–100. */
  coverage_percentage: number
  /** Maximum total the insurer will ever pay under this policy.
   * null = no ceiling. */
  ceiling_amount: number | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

/** Rial is the smallest unit in use — fractions of a rial do not exist,
 * so every monetary result is rounded once, here, rather than being
 * allowed to drift through repeated float arithmetic. */
export function toRial(n: number): number {
  return Math.round(n)
}

/** Claim statuses that consume ceiling. A rejected claim never did, and a
 * pending one has not yet — counting either would understate what the
 * patient can still claim and wrongly push cost onto them. */
const CONSUMING_STATUSES = ['approved', 'paid', 'settled']

export function isConsumingClaim(status: string | null): boolean {
  return CONSUMING_STATUSES.includes((status || '').toLowerCase())
}

/** Total the insurer has already committed under this policy. Uses the
 * approved amount when present — the insurer's own figure — and falls
 * back to the submitted amount only when it has not answered yet. */
export function usedCeiling(claims: InsuranceClaim[], companyId: string | null): number {
  return toRial(
    claims
      .filter((c) => isConsumingClaim(c.status))
      .filter((c) => companyId === null || c.company_id === companyId)
      .reduce((sum, c) => sum + (c.approved_amount ?? c.amount ?? 0), 0),
  )
}

export function remainingCeiling(policy: PatientPolicy, claims: InsuranceClaim[]): number | null {
  if (policy.ceiling_amount === null) return null // unlimited
  const used = usedCeiling(claims, policy.company_id)
  return Math.max(0, toRial(policy.ceiling_amount - used))
}

/** A policy only covers work done inside its validity window. `onDate`
 * is an ISO date string so callers pass the treatment date, not "today" —
 * back-dating a treatment must use the policy that was live back then. */
export function isPolicyValidOn(policy: PatientPolicy, onDate: string): boolean {
  if (!policy.is_active) return false
  const d = onDate.slice(0, 10)
  if (policy.start_date && d < policy.start_date.slice(0, 10)) return false
  if (policy.end_date && d > policy.end_date.slice(0, 10)) return false
  return true
}

export interface CoverageSplit {
  /** What the insurer pays, after the ceiling is applied. */
  insuranceShare: number
  /** What the patient pays. Always cost - insuranceShare. */
  patientShare: number
  /** What the insurer would have paid with no ceiling in the way. */
  uncappedInsuranceShare: number
  /** True when the ceiling reduced the insurer's share. */
  cappedByCeiling: boolean
  /** Remaining ceiling after this treatment; null when unlimited. */
  remainingAfter: number | null
  /** Persian message to surface when something limited the cover. */
  warning: string | null
}

/**
 * Split one treatment cost between insurer and patient.
 *
 * Every branch below returns a fully-formed split with the patient owing
 * the whole cost, rather than returning null — a caller that forgets to
 * null-check must not end up quoting zero.
 */
export function splitCoverage(
  cost: number,
  policy: PatientPolicy | null,
  claims: InsuranceClaim[],
  onDate: string,
): CoverageSplit {
  const safeCost = Math.max(0, toRial(cost))
  const none = (warning: string | null): CoverageSplit => ({
    insuranceShare: 0,
    patientShare: safeCost,
    uncappedInsuranceShare: 0,
    cappedByCeiling: false,
    remainingAfter: null,
    warning,
  })

  if (!policy) return none(null)
  if (!isPolicyValidOn(policy, onDate)) return none('بیمه در تاریخ این درمان معتبر نیست — کل هزینه آزاد محاسبه می‌شود')

  const pct = Math.min(100, Math.max(0, policy.coverage_percentage || 0))
  const uncapped = toRial((safeCost * pct) / 100)

  const remaining = remainingCeiling(policy, claims)
  if (remaining === null) {
    return {
      insuranceShare: uncapped,
      patientShare: safeCost - uncapped,
      uncappedInsuranceShare: uncapped,
      cappedByCeiling: false,
      remainingAfter: null,
      warning: null,
    }
  }

  if (remaining <= 0) {
    return {
      insuranceShare: 0,
      patientShare: safeCost,
      uncappedInsuranceShare: uncapped,
      cappedByCeiling: true,
      remainingAfter: 0,
      warning: 'سقف تعهد بیمه به‌طور کامل مصرف شده — کل هزینه بصورت آزاد محاسبه می‌گردد',
    }
  }

  const insuranceShare = Math.min(uncapped, remaining)
  const capped = insuranceShare < uncapped
  return {
    insuranceShare,
    patientShare: safeCost - insuranceShare,
    uncappedInsuranceShare: uncapped,
    cappedByCeiling: capped,
    remainingAfter: Math.max(0, remaining - insuranceShare),
    warning: capped
      ? 'به دلیل محدودیت سقف تعهد، بخشی از هزینه بصورت آزاد محاسبه می‌گردد'
      : null,
  }
}

/** Percentage of the ceiling consumed, for a progress bar. Returns null
 * when the policy is unlimited (there is nothing to fill up). */
export function ceilingUsagePercent(policy: PatientPolicy, claims: InsuranceClaim[]): number | null {
  if (!policy.ceiling_amount || policy.ceiling_amount <= 0) return null
  const used = usedCeiling(claims, policy.company_id)
  return Math.min(100, Math.round((used / policy.ceiling_amount) * 100))
}

/** Picks the policy to apply to a treatment: valid on the date, and among
 * those, the one with the most ceiling left — so a patient with two
 * policies is not blocked by an exhausted one while another has room. */
export function selectApplicablePolicy(
  policies: PatientPolicy[],
  claims: InsuranceClaim[],
  onDate: string,
): PatientPolicy | null {
  const valid = policies.filter((p) => isPolicyValidOn(p, onDate))
  if (valid.length === 0) return null
  return valid.reduce((best, p) => {
    const bestRem = remainingCeiling(best, claims)
    const pRem = remainingCeiling(p, claims)
    if (bestRem === null) return best // unlimited already wins
    if (pRem === null) return p
    return pRem > bestRem ? p : best
  })
}

export function validatePolicy(p: Partial<PatientPolicy>): string[] {
  const errors: string[] = []
  const pct = p.coverage_percentage
  if (pct === undefined || pct === null || Number.isNaN(pct)) {
    errors.push('درصد پوشش بیمه الزامی است')
  } else if (pct < 0 || pct > 100) {
    errors.push('درصد پوشش باید بین ۰ تا ۱۰۰ باشد')
  }
  if (p.ceiling_amount !== null && p.ceiling_amount !== undefined && p.ceiling_amount < 0) {
    errors.push('سقف تعهد نمی‌تواند منفی باشد')
  }
  if (p.start_date && p.end_date && p.start_date.slice(0, 10) > p.end_date.slice(0, 10)) {
    errors.push('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد')
  }
  return errors
}
