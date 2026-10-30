// insurance.ts — how an insurance policy actually splits a treatment cost.
//
// The rule that matters, and that the app previously had no concept of:
// a policy carries a **ceiling** (سقف تعهد). Once cumulative approved
// claims reach it, the insurer pays nothing more and the remainder falls
// on the patient — even mid-treatment. Without this, the app would quote
// a covered price the insurer will refuse, and the clinic eats the gap.
import type { InsuranceClaim, InsuranceCompany } from '../types'
import { buildPrintDocument, escapeHtml } from './printDocument'
import { toPersianDigits, formatCurrency, toJalaliStringPretty } from './persianDate'

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
  /** Tier of insurance: 'primary' (پایه: تامین اجتماعی، سلامت و...) vs 'supplementary' (تکمیلی: ایران، دانا، البرز و...) */
  tier?: 'primary' | 'supplementary' | null
  /** Franchise/deductible percentage (فرانشیز مثلاً ۱۰٪ یا ۲۰٪) */
  deductible_percentage?: number | null
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
  if (p.deductible_percentage !== null && p.deductible_percentage !== undefined) {
    if (p.deductible_percentage < 0 || p.deductible_percentage > 100) {
      errors.push('درصد فرانشیز باید بین ۰ تا ۱۰۰ باشد')
    }
  }
  return errors
}

export interface MultiTierCoverageSplit {
  totalCost: number
  primaryShare: number
  supplementaryShare: number
  totalInsuranceShare: number
  patientShare: number
  franchiseAmount: number
  primaryPolicy: PatientPolicy | null
  supplementaryPolicy: PatientPolicy | null
  primaryCapped: boolean
  supplementaryCapped: boolean
  primaryRemainingAfter: number | null
  supplementaryRemainingAfter: number | null
  warning: string | null
  breakdownSummary: string
}

/**
 * Split treatment cost across multi-tier insurance (Primary + Supplementary).
 *
 * Clinical Rule:
 * 1. Primary insurance covers first according to its coverage percentage up to its remaining ceiling.
 * 2. Supplementary insurance covers the remainder up to its coverage percentage,
 *    applying the deductible/franchise percentage, bounded by its remaining ceiling.
 * 3. Patient pays whatever remains after both insurance contributions.
 */
export function splitMultiTierCoverage(
  cost: number,
  policies: PatientPolicy[],
  claims: InsuranceClaim[],
  onDate: string,
  companies?: InsuranceCompany[],
): MultiTierCoverageSplit {
  const safeCost = Math.max(0, toRial(cost))
  const validPolicies = policies.filter((p) => isPolicyValidOn(p, onDate))

  const getPolicyTier = (p: PatientPolicy): 'primary' | 'supplementary' => {
    if (p.tier) return p.tier
    if (companies && p.company_id) {
      const co = companies.find((c) => c.id === p.company_id)
      if (co?.tier) return co.tier
      const name = (co?.name || '').toLowerCase()
      if (
        name.includes('تامین اجتماعی') ||
        name.includes('سلامت') ||
        name.includes('نیروهای مسلح') ||
        name.includes('خدمات درمانی')
      ) {
        return 'primary'
      }
    }
    return 'supplementary'
  }

  const primaryCandidates = validPolicies.filter((p) => getPolicyTier(p) === 'primary')
  const suppCandidates = validPolicies.filter((p) => getPolicyTier(p) === 'supplementary')

  let primaryPolicy: PatientPolicy | null = null
  let suppPolicy: PatientPolicy | null = null

  if (primaryCandidates.length > 0) {
    primaryPolicy = selectApplicablePolicy(primaryCandidates, claims, onDate)
  }
  if (suppCandidates.length > 0) {
    suppPolicy = selectApplicablePolicy(suppCandidates, claims, onDate)
  }

  // If unclassified and only one exists, treat it as supplementary (or single)
  if (!primaryPolicy && !suppPolicy && validPolicies.length > 0) {
    suppPolicy = selectApplicablePolicy(validPolicies, claims, onDate)
  }

  let primaryShare = 0
  let primaryCapped = false
  let primaryRemainingAfter: number | null = null

  if (primaryPolicy) {
    const pct = Math.min(100, Math.max(0, primaryPolicy.coverage_percentage || 0))
    const uncappedPrimary = toRial((safeCost * pct) / 100)
    const rem = remainingCeiling(primaryPolicy, claims)

    if (rem === null) {
      primaryShare = uncappedPrimary
      primaryRemainingAfter = null
    } else if (rem <= 0) {
      primaryShare = 0
      primaryCapped = true
      primaryRemainingAfter = 0
    } else {
      primaryShare = Math.min(uncappedPrimary, rem)
      primaryCapped = primaryShare < uncappedPrimary
      primaryRemainingAfter = Math.max(0, rem - primaryShare)
    }
  }

  const remainingAfterPrimary = Math.max(0, safeCost - primaryShare)

  let suppShare = 0
  let franchiseAmount = 0
  let suppCapped = false
  let suppRemainingAfter: number | null = null

  if (suppPolicy && remainingAfterPrimary > 0) {
    const covPct = Math.min(100, Math.max(0, suppPolicy.coverage_percentage || 0))
    const dedPct = Math.min(100, Math.max(0, suppPolicy.deductible_percentage || 0))

    const grossSupp = toRial((remainingAfterPrimary * covPct) / 100)
    franchiseAmount = dedPct > 0 ? toRial((grossSupp * dedPct) / 100) : 0
    const uncappedSupp = Math.max(0, grossSupp - franchiseAmount)

    const rem = remainingCeiling(suppPolicy, claims)
    if (rem === null) {
      suppShare = uncappedSupp
      suppRemainingAfter = null
    } else if (rem <= 0) {
      suppShare = 0
      suppCapped = true
      suppRemainingAfter = 0
    } else {
      suppShare = Math.min(uncappedSupp, rem)
      suppCapped = suppShare < uncappedSupp
      suppRemainingAfter = Math.max(0, rem - suppShare)
    }
  }

  const totalInsuranceShare = primaryShare + suppShare
  const patientShare = Math.max(0, safeCost - totalInsuranceShare)

  const warnings: string[] = []
  if (primaryCapped) {
    warnings.push('سقف تعهد بیمه پایه پر شده است.')
  }
  if (suppCapped) {
    warnings.push('سقف تعهد بیمه تکمیلی تکمیل یا محدود شده است.')
  }

  const parts: string[] = []
  if (primaryShare > 0) {
    parts.push(`بیمه پایه: ${formatCurrency(primaryShare)} ت`)
  }
  if (suppShare > 0) {
    parts.push(`بیمه تکمیلی: ${formatCurrency(suppShare)} ت`)
  }
  if (franchiseAmount > 0) {
    parts.push(`فرانشیز: ${formatCurrency(franchiseAmount)} ت`)
  }
  parts.push(`سهم نهایی بیمار: ${formatCurrency(patientShare)} ت`)

  return {
    totalCost: safeCost,
    primaryShare,
    supplementaryShare: suppShare,
    totalInsuranceShare,
    patientShare,
    franchiseAmount,
    primaryPolicy,
    supplementaryPolicy: suppPolicy,
    primaryCapped,
    supplementaryCapped: suppCapped,
    primaryRemainingAfter,
    supplementaryRemainingAfter: suppRemainingAfter,
    warning: warnings.length > 0 ? warnings.join(' ') : null,
    breakdownSummary: parts.join(' | '),
  }
}

export interface DentalClaimItem {
  toothNumber?: number | string | null
  procedureCode?: string | null
  procedureName: string
  date?: string | null
  totalFee: number
  primaryDeduction?: number | null
  supplementaryClaimed?: number | null
  patientPaid?: number | null
}

export interface DentalInsuranceClaimOptions {
  claimNumber?: string | null
  clinicName?: string
  clinicPhone?: string
  clinicAddress?: string
  clinicLicense?: string
  patientName: string
  nationalId?: string | null
  insuranceCompany: string
  tierLabel?: string
  policyNumber?: string | null
  claimDate?: string
  doctorName?: string | null
  doctorMedicalCouncilId?: string | null
  items: DentalClaimItem[]
  notes?: string | null
}

/**
 * Builds the official Certificate of Dental Treatment & Insurance Claim Document (HTML)
 * in compliance with Iranian Ministry of Health & Supplementary Insurance guidelines.
 */
export function generateInsuranceClaimHtml(opts: DentalInsuranceClaimOptions): string {
  const clinicName = escapeHtml(opts.clinicName || 'کلینیک دندانپزشکی مینا')
  const clinicPhone = escapeHtml(opts.clinicPhone || '۰۲۱-۸۸۸۸۸۸۸۸')
  const clinicAddress = escapeHtml(opts.clinicAddress || 'تهران، خیابان ولیعصر')
  const clinicLicense = escapeHtml(opts.clinicLicense || '۱۲۳۴۵۶')
  const patientName = escapeHtml(opts.patientName || 'بیمار گرامی')
  const nationalId = escapeHtml(toPersianDigits(opts.nationalId || '-'))
  const insuranceCompany = escapeHtml(opts.insuranceCompany || 'بیمه‌گر طرف قرارداد')
  const tierLabel = escapeHtml(opts.tierLabel || 'بیمه تکمیلی درمان')
  const policyNumber = escapeHtml(toPersianDigits(opts.policyNumber || '-'))
  const claimNumber = escapeHtml(toPersianDigits(opts.claimNumber || 'CLM-' + Date.now().toString().slice(-6)))
  const claimDate = escapeHtml(toPersianDigits(opts.claimDate ? toJalaliStringPretty(opts.claimDate) : toJalaliStringPretty(new Date().toISOString())))
  const doctorName = escapeHtml(opts.doctorName ? `دکتر ${opts.doctorName}` : 'دندانپزشک معالج')
  const doctorId = escapeHtml(toPersianDigits(opts.doctorMedicalCouncilId || 'نظام‌پزشکی ثبت‌شده'))
  const notes = opts.notes ? escapeHtml(opts.notes) : ''

  const totalFees = opts.items.reduce((sum, it) => sum + (it.totalFee || 0), 0)
  const totalPrimary = opts.items.reduce((sum, it) => sum + (it.primaryDeduction || 0), 0)
  const totalSupp = opts.items.reduce((sum, it) => sum + (it.supplementaryClaimed || 0), 0)
  const totalPatient = opts.items.reduce((sum, it) => sum + (it.patientPaid ?? Math.max(0, it.totalFee - (it.primaryDeduction || 0) - (it.supplementaryClaimed || 0))), 0)

  const rows = opts.items.map((it, idx) => {
    const rowNum = toPersianDigits(idx + 1)
    const tooth = it.toothNumber ? `دندان ${toPersianDigits(it.toothNumber)}` : '-'
    const code = it.procedureCode ? toPersianDigits(it.procedureCode) : '-'
    const proc = escapeHtml(it.procedureName)
    const date = it.date ? toPersianDigits(toJalaliStringPretty(it.date)) : claimDate
    const fee = toPersianDigits(formatCurrency(it.totalFee))
    const prim = it.primaryDeduction ? toPersianDigits(formatCurrency(it.primaryDeduction)) : '۰'
    const supp = it.supplementaryClaimed ? toPersianDigits(formatCurrency(it.supplementaryClaimed)) : toPersianDigits(formatCurrency(Math.max(0, it.totalFee - (it.primaryDeduction || 0))))
    const pat = it.patientPaid !== undefined && it.patientPaid !== null
      ? toPersianDigits(formatCurrency(it.patientPaid))
      : toPersianDigits(formatCurrency(Math.max(0, it.totalFee - (it.primaryDeduction || 0) - (it.supplementaryClaimed || 0))))

    return `
      <tr>
        <td style="text-align: center; font-weight: bold;">${rowNum}</td>
        <td style="text-align: center; direction: ltr; font-weight: bold;">${tooth}</td>
        <td style="text-align: center; direction: ltr; font-family: monospace;">${code}</td>
        <td>${proc}</td>
        <td style="text-align: center; font-size: 11px;">${date}</td>
        <td style="text-align: left; direction: ltr;">${fee} ت</td>
        <td style="text-align: left; direction: ltr; color: #0284c7;">${prim} ت</td>
        <td style="text-align: left; direction: ltr; color: #059669; font-weight: bold;">${supp} ت</td>
        <td style="text-align: left; direction: ltr;">${pat} ت</td>
      </tr>
    `
  }).join('')

  return `
    <div class="claim-document" dir="rtl" style="font-family: 'Vazirmatn', system-ui, sans-serif; padding: 24px; max-width: 900px; margin: 0 auto; color: #1e293b;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a;">${clinicName}</h1>
          <p style="margin: 0; font-size: 12px; color: #64748b;">پروانه بهره‌برداری / کد نظام‌پزشکی: ${clinicLicense} | تلفن: ${clinicPhone}</p>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #64748b;">نشانی: ${clinicAddress}</p>
        </div>
        <div style="text-align: left; border-right: 1px solid #e2e8f0; padding-right: 16px;">
          <div style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; margin-bottom: 4px;">
            ${tierLabel}
          </div>
          <div style="font-size: 12px; color: #475569;">شماره رهگیری ادعا: <b>${claimNumber}</b></div>
          <div style="font-size: 12px; color: #475569;">تاریخ صدور: <b>${claimDate}</b></div>
        </div>
      </div>

      <!-- Title -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #1e3a8a; background: #f8fafc; border: 1px solid #cbd5e1; display: inline-block; padding: 6px 24px; border-radius: 20px;">
          گواهی تأیید انجام خدمات دندانپزشکی و معرفی‌نامه پرداخت خسارت بیمه
        </h2>
      </div>

      <!-- Patient & Insurance Details Box -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 13px;">
        <div>نام و نام خانوادگی بیمار: <b>${patientName}</b></div>
        <div>کد ملی: <b style="font-family: monospace;">${nationalId}</b></div>
        <div>شرکت بیمه‌گر: <b style="color: #0369a1;">${insuranceCompany}</b></div>
        <div>شماره بیمه‌نامه / پرسنلی: <b>${policyNumber}</b></div>
        <div>پزشک معالج: <b>${doctorName}</b></div>
        <div>شماره نظام پزشکی: <b>${doctorId}</b></div>
      </div>

      <!-- Table of Procedures -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #94a3b8; color: #334155;">
            <th style="padding: 8px; text-align: center; width: 35px;">ردیف</th>
            <th style="padding: 8px; text-align: center; width: 65px;">شماره دندان</th>
            <th style="padding: 8px; text-align: center; width: 60px;">کد رویه</th>
            <th style="padding: 8px; text-align: right;">شرح خدمات تشخیصی و درمانی</th>
            <th style="padding: 8px; text-align: center; width: 75px;">تاریخ</th>
            <th style="padding: 8px; text-align: left; width: 85px;">تعرفه کل</th>
            <th style="padding: 8px; text-align: left; width: 85px;">سهم پایه</th>
            <th style="padding: 8px; text-align: left; width: 95px;">سهم بیمه مکمل</th>
            <th style="padding: 8px; text-align: left; width: 85px;">سهم بیمار</th>
          </tr>
        </thead>
        <tbody style="border-bottom: 2px solid #cbd5e1;">
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #94a3b8; color: #0f172a;">
            <td colspan="5" style="padding: 10px; text-align: right;">جمع کل خدمات صورت‌گرفته:</td>
            <td style="padding: 10px; text-align: left; direction: ltr;">${toPersianDigits(formatCurrency(totalFees))} ت</td>
            <td style="padding: 10px; text-align: left; direction: ltr; color: #0284c7;">${toPersianDigits(formatCurrency(totalPrimary))} ت</td>
            <td style="padding: 10px; text-align: left; direction: ltr; color: #059669;">${toPersianDigits(formatCurrency(totalSupp))} ت</td>
            <td style="padding: 10px; text-align: left; direction: ltr;">${toPersianDigits(formatCurrency(totalPatient))} ت</td>
          </tr>
        </tfoot>
      </table>

      <!-- Attestation Paragraph -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-bottom: 24px; font-size: 12px; line-height: 1.8; color: #166534;">
        <b>گواهی دندانپزشک:</b>
        بدین‌وسیله گواهی می‌شود کلیه خدمات تشخیصی و درمانی فوق با مشخصات و تعرفه مصوب قانونی جهت بیمار محترم در این مرکز با موفقیت انجام پذیرفته و مدارک کلینیکی (گرافی‌ها و پرونده) موجود می‌باشد. خواهشمند است وفق ضوابط قرارداد، اقدامات لازم جهت پرداخت و تسویه سهم بیمه مبذول فرمایید.
        ${notes ? `<br /><b>توضیحات تکمیلی:</b> ${notes}` : ''}
      </div>

      <!-- Signatures Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-top: 30px; font-size: 12px;">
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; min-height: 100px;">
          <div style="font-weight: 700; margin-bottom: 6px; color: #475569;">امضای بیمار / بیمه‌شده</div>
          <div style="font-size: 11px; color: #94a3b8;">تأیید دریافت خدمات مندرج</div>
        </div>
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; min-height: 100px;">
          <div style="font-weight: 700; margin-bottom: 6px; color: #475569;">امضا و مهر دندانپزشک معالج</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: bold;">${doctorName}</div>
          <div style="font-size: 10px; color: #64748b;">نظام پزشکی: ${doctorId}</div>
        </div>
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; min-height: 100px;">
          <div style="font-weight: 700; margin-bottom: 6px; color: #475569;">مهر و امضای حسابداری کلینیک</div>
          <div style="font-size: 11px; color: #94a3b8;">تأیید امور مالی و تعرفه‌ها</div>
        </div>
      </div>
    </div>
  `
}

/**
 * Wraps the insurance claim HTML into a compliant PWA print document.
 */
export function generateInsuranceClaimPrintData(opts: DentalInsuranceClaimOptions): string {
  const bodyHtml = generateInsuranceClaimHtml(opts)
  return buildPrintDocument({
    title: `گواهی بیمه - ${opts.patientName}`,
    styles: `
      @page { size: A4 portrait; margin: 12mm; }
      @media print {
        body { background: #fff !important; }
        .claim-document { padding: 0 !important; max-width: 100% !important; }
      }
    `,
    bodyHtml,
    shareText: `گواهی خدمات دندانپزشکی جهت بیمه ${opts.insuranceCompany} - بیمار: ${opts.patientName}`,
  })
}
