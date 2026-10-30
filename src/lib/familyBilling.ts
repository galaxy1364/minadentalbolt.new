/**
 * familyBilling.ts — Household Master Account & Family Billing Hub
 *
 * Implements aggregated financial tracking, debt rollup, and consolidated
 * family billing statements for dental patients and their family dependents.
 *
 * References:
 * - AUDIT-WORLD-CLASS.md Section 2 (Item 2: Household Master Account)
 * - ISO 13606 / HL7 FHIR RelatedPerson financial accountability standard
 */

import { Patient, Payment, Treatment, ImplantCase } from '../types'
import { calcPatientBalance, PatientBalance } from './finance'
import { resolveFamilyHousehold } from './familyLinkage'
import { formatCurrency, toPersianDigits, toJalaliStringPretty } from './persianDate'
import { escapeHtml, buildPrintDocument } from './printDocument'

export interface MemberFinancialBreakdown {
  patient: Patient
  relationshipLabel: string
  isHead: boolean
  grossCost: number
  insuranceShare: number
  balance: PatientBalance
}

export interface HouseholdFinancialProfile {
  head: Patient
  members: MemberFinancialBreakdown[]
  totalCost: number
  totalInsurance: number
  totalPatientShare: number
  totalPaid: number
  netRemaining: number
  status: 'cleared' | 'debtor' | 'creditor'
}

/**
 * Computes consolidated household balance across the head of household and all linked dependents.
 */
export function calculateHouseholdBalance(
  patientOrId: string | Patient,
  allPatients: Patient[],
  payments: Payment[],
  treatments: Treatment[],
  implantCases: ImplantCase[] = [],
): HouseholdFinancialProfile | null {
  const currentPatient =
    typeof patientOrId === 'string'
      ? allPatients.find((p) => p.id === patientOrId)
      : patientOrId

  if (!currentPatient) return null

  const household = resolveFamilyHousehold(currentPatient, allPatients)
  if (!household.headPatient || household.totalMembersCount <= 1) return null

  // Ensure unique members list (head + all dependents)
  const allMembersMap = new Map<string, Patient>()
  allMembersMap.set(household.headPatient.id, household.headPatient)

  for (const m of household.members) {
    allMembersMap.set(m.patient.id, m.patient)
  }
  // Also add current patient
  allMembersMap.set(currentPatient.id, currentPatient)

  const members: MemberFinancialBreakdown[] = []
  let totalCost = 0
  let totalInsurance = 0
  let totalPatientShare = 0
  let totalPaid = 0
  let netRemaining = 0

  for (const member of allMembersMap.values()) {
    const memPayments = payments.filter((p) => p.patient_id === member.id && (p as any).is_active !== false)
    const memTreatments = treatments.filter((t) => t.patient_id === member.id && t.status !== 'cancelled')
    const memImplants = implantCases.filter((c) => c.patient_id === member.id && (c as any).is_active !== false)

    const bal = calcPatientBalance(memPayments, memTreatments, memImplants)

    const memGross =
      memTreatments.reduce((s, t) => s + ((t as any).cost || t.total_price || 0), 0) +
      memImplants.reduce((s, c) => s + (c.total_cost || 0), 0)
    const memIns = memTreatments.reduce((s, t) => s + (t.insurance_share || 0), 0)

    totalCost += memGross
    totalInsurance += memIns
    totalPatientShare += bal.totalCost
    totalPaid += bal.paid
    netRemaining += bal.balance

    const isHead = member.id === household.headPatient.id
    const relKey = member.family_relationship || (isHead ? 'head' : 'other')
    const relationshipLabel =
      relKey === 'head'
        ? 'سرپرست خانوار'
        : relKey === 'spouse'
          ? 'همسر'
          : relKey === 'child'
            ? 'فرزند'
            : relKey === 'parent'
              ? 'والدین'
              : relKey === 'sibling'
                ? 'خواهر/برادر'
                : 'تحت تکفل'

    members.push({
      patient: member,
      relationshipLabel,
      isHead,
      grossCost: memGross,
      insuranceShare: memIns,
      balance: bal,
    })
  }

  const status: 'cleared' | 'debtor' | 'creditor' =
    netRemaining > 0 ? 'debtor' : netRemaining < 0 ? 'creditor' : 'cleared'

  return {
    head: household.headPatient,
    members,
    totalCost,
    totalInsurance,
    totalPatientShare,
    totalPaid,
    netRemaining,
    status,
  }
}

/**
 * Generates official printable HTML document for consolidated household dental statement.
 */
export function generateHouseholdStatementHtml(profile: HouseholdFinancialProfile): string {
  const headName = `${profile.head.first_name || ''} ${profile.head.last_name || ''}`.trim()
  const statusLabel =
    profile.status === 'debtor'
      ? `بدهکار (${formatCurrency(profile.netRemaining)} تومان)`
      : profile.status === 'creditor'
        ? `بستانکار (${formatCurrency(Math.abs(profile.netRemaining))} تومان)`
        : 'تسویه کامل'
  const statusColor = profile.status === 'debtor' ? '#dc2626' : profile.status === 'creditor' ? '#2563eb' : '#16a34a'

  const memberRows = profile.members
    .map((m, idx) => {
      const name = `${m.patient.first_name || ''} ${m.patient.last_name || ''}`.trim()
      const bal = m.balance
      const memberStatus =
        bal.balance > 0
          ? `${formatCurrency(bal.balance)} بدهکار`
          : bal.balance < 0
            ? `${formatCurrency(Math.abs(bal.balance))} بستانکار`
            : 'تسویه'

      return `
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${toPersianDigits(idx + 1)}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">
          ${escapeHtml(name)}
          ${m.isHead ? ' <span style="font-size: 10px; color: #0d9488; background: #ccfbf1; padding: 2px 6px; border-radius: 4px;">سرپرست</span>' : ''}
        </td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${escapeHtml(m.relationshipLabel)}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${toPersianDigits(m.patient.national_id || '-')}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${toPersianDigits(formatCurrency(m.grossCost))} تومان</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #0d9488;">${toPersianDigits(formatCurrency(m.insuranceShare))} تومان</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${toPersianDigits(formatCurrency(bal.paid))} تومان</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${bal.balance > 0 ? '#dc2626' : '#16a34a'};">
          ${toPersianDigits(memberStatus)}
        </td>
      </tr>
    `
    })
    .join('')

  const bodyContent = `
    <div style="font-family: Tahoma, 'Segoe UI', Arial, sans-serif; direction: rtl; text-align: right; color: #1e293b; max-width: 850px; margin: 0 auto; padding: 24px;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0 0 6px; color: #0f766e; font-size: 20px; font-weight: bold;">صورت‌حساب مالی تجمیعی خانوار (Household Account)</h1>
          <p style="margin: 0; font-size: 13px; color: #64748b;">کلینیک دندانپزشکی مینادنت — سیستم حسابرسی تجمیعی مراجعین</p>
        </div>
        <div style="text-align: left; font-size: 12px; color: #64748b;">
          <div>تاریخ صدور: <b>${toJalaliStringPretty(new Date().toISOString())}</b></div>
          <div style="margin-top: 4px;">تعداد اعضا: <b>${toPersianDigits(profile.members.length)} نفر</b></div>
        </div>
      </div>

      <!-- Household Meta Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 13px;">
          <div>سرپرست خانوار: <b style="color: #0f766e;">${escapeHtml(headName)}</b></div>
          <div>کد ملی سرپرست: <b>${toPersianDigits(profile.head.national_id || '-')}</b></div>
          <div>شماره تماس: <b dir="ltr">${toPersianDigits(profile.head.phone || '-')}</b></div>
        </div>
      </div>

      <!-- Summary Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">کل خدمات درمان خانوار</div>
          <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${toPersianDigits(formatCurrency(profile.totalCost))} تومان</div>
        </div>
        <div style="background: #f0fdfa; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #0d9488; margin-bottom: 4px;">مجموع سهم بیمه</div>
          <div style="font-size: 14px; font-weight: bold; color: #0f766e;">${toPersianDigits(formatCurrency(profile.totalInsurance))} تومان</div>
        </div>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #16a34a; margin-bottom: 4px;">کل پرداختی‌های خانوار</div>
          <div style="font-size: 14px; font-weight: bold; color: #15803d;">${toPersianDigits(formatCurrency(profile.totalPaid))} تومان</div>
        </div>
        <div style="background: ${profile.status === 'debtor' ? '#fef2f2' : '#f0fdf4'}; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid ${statusColor};">
          <div style="font-size: 11px; color: ${statusColor}; margin-bottom: 4px;">مانده حساب نهایی خانوار</div>
          <div style="font-size: 14px; font-weight: bold; color: ${statusColor};">${toPersianDigits(statusLabel)}</div>
        </div>
      </div>

      <!-- Members Table -->
      <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin: 0 0 10px;">ریز حساب مالی به تفکیک اعضای خانواده:</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px;">
        <thead>
          <tr style="background: #f8fafc; color: #475569;">
            <th style="padding: 8px; border: 1px solid #e2e8f0;">ردیف</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">نام عضو</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">نسبت</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">کد ملی</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">کل خدمات</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">سهم بیمه</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">پرداختی</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">وضعیت مانده</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows}
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div style="margin-top: 40px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 12px; text-align: center;">
        <div>
          <p style="margin: 0 0 45px; color: #475569;">امضای سرپرست خانوار / بیمار:</p>
          <p style="margin: 0; color: #94a3b8;">...........................................</p>
        </div>
        <div>
          <p style="margin: 0 0 45px; color: #475569;">تأیید امور مالی و صندوق کلینیک:</p>
          <p style="margin: 0; color: #94a3b8;">...........................................</p>
        </div>
      </div>
    </div>
  `

  return buildPrintDocument({
    title: `صورت‌حساب خانوادگی — ${headName}`,
    styles: `
      body { font-family: Tahoma, 'Segoe UI', Arial, sans-serif; color: #1e293b; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e2e8f0; }
    `,
    bodyHtml: bodyContent,
  })
}

/**
 * Formats a payment note when a family head or member pays for another dependent's treatment.
 */
export function formatCrossFamilyPaymentNote(payerName: string, beneficiaryName: string, relationLabel: string): string {
  return `پرداخت اشتراکی خانوادگی: توسط ${payerName} (سرپرست/عضو خانواده) بابت هزینه‌های ${beneficiaryName} (${relationLabel})`
}
