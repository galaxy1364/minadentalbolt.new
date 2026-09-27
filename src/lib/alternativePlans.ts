/**
 * alternativePlans.ts — موتور مدیریت و مقایسه طرح‌های درمان جایگزین (Alternative Treatment Plans)
 *
 * در دندانپزشکی، بیمار ممکن است بین گزینه‌های مختلف (مثلاً طرح الف: ایمپلنت در برابر طرح ب: بریج دندانی)
 * نیاز به تصمیم‌گیری بالینی و مالی داشته باشد. این ماژول گروه‌بندی، مقایسه و صدور سند رسمی مقایسه‌ای را
 * انجام می‌دهد.
 */

import type { TreatmentPhase, Patient } from '../types'
import { phasePlanProgress, PhasePlanProgress } from './phases'
import { toPersianDigits, formatCurrency, toJalaliStringPretty } from './persianDate'

export interface PlanOptionSummary {
  optionKey: string // 'A' | 'B' | 'C'
  title: string
  isAccepted: boolean
  phases: TreatmentPhase[]
  progress: PhasePlanProgress
}

export interface PlanComparisonResult {
  optionA: PlanOptionSummary | null
  optionB: PlanOptionSummary | null
  costDifference: number
  durationDifferenceDays: number
  recommendedOption: string | null
  savingsMessage: string | null
}

const DEFAULT_PLAN_TITLES: Record<string, string> = {
  A: 'طرح الف (پیشنهاد اصلی / استاندارد)',
  B: 'طرح ب (جایگزین / محافظه‌کارانه)',
  C: 'طرح ج (طرح اقتصادی یا موقت)',
}

export function getPlanOptionTitle(key: string, customName?: string | null): string {
  if (customName && customName.trim()) return customName.trim()
  return DEFAULT_PLAN_TITLES[key.toUpperCase()] || `طرح ${key}`
}

/**
 * فازهای درمان را بر اساس گزینه طرح ('A', 'B', 'C') تفکیک و گروه‌بندی می‌کند
 */
export function groupPhasesByPlan(phases: TreatmentPhase[]): PlanOptionSummary[] {
  const map = new Map<string, TreatmentPhase[]>()

  for (const ph of phases) {
    if (ph.status === 'cancelled') continue
    const key = (ph.plan_option?.trim().toUpperCase()) || 'A'
    const list = map.get(key) || []
    list.push(ph)
    map.set(key, list)
  }

  // اگر هیچ فازی وجود نداشت، یک طرح الف خالی پیشنهاد بده
  if (map.size === 0) {
    return [
      {
        optionKey: 'A',
        title: DEFAULT_PLAN_TITLES.A,
        isAccepted: true,
        phases: [],
        progress: phasePlanProgress([]),
      },
    ]
  }

  const result: PlanOptionSummary[] = []
  const sortedKeys = Array.from(map.keys()).sort()

  for (const key of sortedKeys) {
    const list = map.get(key)!.sort((a, b) => (a.phase_number || 0) - (b.phase_number || 0))
    const firstCustomName = list.find((p) => p.plan_name)?.plan_name
    const isAccepted = list.some((p) => p.is_accepted === true)

    result.push({
      optionKey: key,
      title: getPlanOptionTitle(key, firstCustomName),
      isAccepted,
      phases: list,
      progress: phasePlanProgress(list),
    })
  }

  return result
}

/**
 * مقایسه فنی و مالی میان دو طرح درمان (معمولاً طرح الف و طرح ب)
 */
export function comparePlanOptions(
  optionA: PlanOptionSummary | null,
  optionB: PlanOptionSummary | null,
): PlanComparisonResult {
  const costA = optionA?.progress.estimatedCost || 0
  const costB = optionB?.progress.estimatedCost || 0
  const costDiff = costA - costB

  const durationA = optionA?.phases.reduce((sum, p) => sum + (p.estimated_duration_days || 0), 0) || 0
  const durationB = optionB?.phases.reduce((sum, p) => sum + (p.estimated_duration_days || 0), 0) || 0
  const durationDiff = durationA - durationB

  let savingsMessage: string | null = null
  if (costDiff > 0) {
    savingsMessage = `طرح ب مبلغ ${formatCurrency(costDiff)} تومان (${toPersianDigits(Math.round((costDiff / (costA || 1)) * 100))}٪) اقتصادی‌تر است.`
  } else if (costDiff < 0) {
    savingsMessage = `طرح الف مبلغ ${formatCurrency(Math.abs(costDiff))} تومان اقتصادی‌تر است.`
  }

  return {
    optionA,
    optionB,
    costDifference: costDiff,
    durationDifferenceDays: durationDiff,
    recommendedOption: optionA?.isAccepted ? 'A' : optionB?.isAccepted ? 'B' : null,
    savingsMessage,
  }
}

export interface ComparativePlanPrintData {
  title: string
  styles: string
  bodyHtml: string
  shareText: string
}

export const COMPARATIVE_PLAN_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0; padding: 20px; color: #1e293b; background: #fff; line-height: 1.5; font-size: 11pt;
  }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px;
  }
  .clinic-title { font-size: 16pt; font-weight: 800; color: #0369a1; }
  .doc-badge {
    background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 10pt;
  }
  .patient-box {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; font-size: 9.5pt;
  }
  .plans-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;
  }
  .plan-card {
    border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 12px; position: relative;
    background: #ffffff;
  }
  .plan-card.accepted {
    border-color: #10b981; background: #f0fdf4;
  }
  .plan-header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;
  }
  .plan-title { font-size: 12pt; font-weight: 800; color: #0f172a; }
  .badge-accepted {
    background: #10b981; color: white; font-size: 8pt; padding: 2px 8px; border-radius: 4px; font-weight: bold;
  }
  .phase-row {
    display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 9pt;
  }
  .phase-title { font-weight: 600; color: #334155; }
  .phase-desc { color: #64748b; font-size: 8pt; margin-top: 1px; }
  .plan-footer {
    margin-top: 10px; padding-top: 8px; border-top: 2px solid #e2e8f0;
    display: flex; justify-content: space-between; align-items: center; font-weight: 800;
  }
  .total-price { font-size: 12pt; color: #0369a1; }
  .signatures {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px;
  }
  .sign-box {
    border: 1px dashed #94a3b8; border-radius: 8px; height: 90px; padding: 8px; font-size: 8.5pt; color: #64748b;
  }
  .notice {
    background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px 12px; font-size: 8pt; color: #92400e; margin-top: 12px;
  }
`

export function generateComparativePlanPrintData(
  patient: Patient,
  planGroups: PlanOptionSummary[],
  clinicName: string = 'کلینیک تخصصی دندانپزشکی مینا',
): ComparativePlanPrintData {
  const todayJalali = toJalaliStringPretty(new Date().toISOString().slice(0, 10))
  const title = `برگه مقایسه و انتخاب طرح درمان — ${patient.first_name || ''} ${patient.last_name || ''}`

  const bodyHtml = `
  <div class="header">
    <div>
      <div class="clinic-title">${clinicName}</div>
      <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">برگه راهنمای گزینه‌ها و مقایسه طرح‌های درمان پیشنهادی</div>
    </div>
    <div style="text-align: left;">
      <div class="doc-badge">طرح‌های درمانی بالینی</div>
      <div style="font-size: 8.5pt; color: #64748b; margin-top: 4px;">تاریخ صدور: ${todayJalali}</div>
    </div>
  </div>

  <div class="patient-box">
    <div><strong>نام بیمار:</strong> ${patient.first_name || ''} ${patient.last_name || ''}</div>
    <div><strong>کد ملی:</strong> ${toPersianDigits(patient.national_id || '-')}</div>
    <div><strong>شماره تماس:</strong> ${toPersianDigits(patient.phone || '-')}</div>
    <div><strong>کد پرونده:</strong> ${toPersianDigits(patient.id?.slice(0, 8) || '-')}</div>
  </div>

  <div class="plans-grid">
    ${planGroups
      .map(
        (group) => `
      <div class="plan-card ${group.isAccepted ? 'accepted' : ''}">
        <div class="plan-header">
          <div class="plan-title">${group.title}</div>
          ${group.isAccepted ? '<span class="badge-accepted">✓ مورد تأیید بیمار</span>' : '<span style="font-size: 8pt; color: #64748b;">گزینه پیشنهادی</span>'}
        </div>

        <div style="margin-bottom: 8px;">
          ${
            group.phases.length === 0
              ? '<div style="font-size: 9pt; color: #94a3b8; padding: 10px 0;">مرحله‌ای برای این طرح تعریف نشده است.</div>'
              : group.phases
                  .map(
                    (ph) => `
              <div class="phase-row">
                <div>
                  <div class="phase-title">فاز ${toPersianDigits(ph.phase_number)}: ${ph.title || 'رویه‌های درمانی'}</div>
                  ${ph.description ? `<div class="phase-desc">${ph.description}</div>` : ''}
                  ${ph.estimated_duration_days ? `<div class="phase-desc">طول درمان تقریبی: ${toPersianDigits(ph.estimated_duration_days)} روز</div>` : ''}
                </div>
                <div style="text-align: left; font-weight: bold; color: #0f172a;">
                  ${ph.estimated_cost ? `${formatCurrency(ph.estimated_cost)} ت` : '-'}
                </div>
              </div>
            `,
                  )
                  .join('')
          }
        </div>

        <div class="plan-footer">
          <span>مجموع برآورد هزینه:</span>
          <span class="total-price">${formatCurrency(group.progress.estimatedCost)} تومان</span>
        </div>
      </div>
    `,
      )
      .join('')}
  </div>

  <div class="notice">
    <strong>توضیحات بالینی:</strong> هزینه‌ها و مدت زمان درج‌شده بر مبنای برآورد بالینی اولیه تدوین شده‌اند و بر حسب شرایط بیولوژیک استخوان یا بافت نرم حین درمان ممکن است تغییرات جزئی داشته باشند. بیمار حق انتخاب آگاهانه هر یک از گزینه‌های فوق را پس از مشاوره با دندانپزشک دارد.
  </div>

  <div class="signatures">
    <div class="sign-box">
      <strong>تأیید دندانپزشک معالج:</strong><br>
      نام و امضا:
    </div>
    <div class="sign-box">
      <strong>امضا و اعلام انتخاب بیمار:</strong><br>
      اینجانب پس از دریافت توضیحات کامل در خصوص مزایا، معایب و هزینه‌ها، <strong>طرح .............</strong> را انتخاب می‌نمایم.<br>
      امضا و اثر انگشت:
    </div>
  </div>
  `

  const shareText = `طرح‌های درمان پیشنهادی کلینیک برای ${patient.first_name || ''} ${patient.last_name || ''}\n` +
    planGroups.map((g) => `${g.title}: ${formatCurrency(g.progress.estimatedCost)} تومان`).join('\n')

  return {
    title,
    styles: COMPARATIVE_PLAN_STYLES,
    bodyHtml,
    shareText,
  }
}

/**
 * تولید سند HTML کامل جهت استفاده در نمایشگرهای مستقل
 */
export function generateComparativePlanHtml(
  patient: Patient,
  planGroups: PlanOptionSummary[],
  clinicName: string = 'کلینیک تخصصی دندانپزشکی مینا',
): string {
  const data = generateComparativePlanPrintData(patient, planGroups, clinicName)
  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${data.title}</title>
  <style>${data.styles}</style>
</head>
<body>
  ${data.bodyHtml}
</body>
</html>
`
}
