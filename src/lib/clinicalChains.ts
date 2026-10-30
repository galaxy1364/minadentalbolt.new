// src/lib/clinicalChains.ts — ADA CDT Procedure Chains & Smart Clinical Next-Step Advisor
import type { Treatment, Procedure } from '../types'
import { toothLabel } from './toothLabel'

export interface ClinicalNextStepRecommendation {
  id: string
  title: string
  procedureName: string
  procedureCode?: string | null
  procedureCategory: string
  toothNumber?: string | null
  rationale: string
  estimatedPrice?: number | null
  urgency: 'routine' | 'recommended' | 'critical'
  targetProcedureId?: string | null
}

const ENDO_KEYWORDS = ['عصب‌کشی', 'عصب کشی', 'درمان ریشه', 'اندو', 'endo', 'pulpectomy', 'پالپکتومی', 'rct', 'روت کانال']
const BUILDUP_KEYWORDS = ['بیلداپ', 'buildup', 'ترمیم تاج', 'بازسازی تاج', 'core buildup']
const POST_KEYWORDS = ['پست و کور', 'پست', 'فایبرپست', 'فایبر پست', 'post & core', 'post and core', 'fiber post', 'cast post']
const CROWN_KEYWORDS = ['روکش', 'crown', 'بریج', 'bridge', 'پروتز ثابت', 'روکش تمام سرامیک', 'زیرکونیا', 'pfm', 'اینله', 'انله']
const IMPLANT_SURGERY_KEYWORDS = ['کاشت ایمپلنت', 'جراحی ایمپلنت', 'فیکسچر', 'fixture', 'implant placement', 'کاشت دندان']
const IMPLANT_HEALING_KEYWORDS = ['هیلینگ', 'healing', 'آنکاور', 'uncovery', 'بستن هیلینگ']
const IMPLANT_PROSTHO_KEYWORDS = ['روکش ایمپلنت', 'پروتز ایمپلنت', 'اباتمنت', 'abutment', 'تحویل روکش ایمپلنت', 'implant crown']
const PERIO_CLEANING_KEYWORDS = ['جرم‌گیری', 'جرم گیری', 'بروساژ', 'scaling', 'srp', 'کورتاژ']
const PERIO_REEVAL_KEYWORDS = ['ارزیابی مجدد پریو', 'معاینه مجدد لثه', 'perio re-eval', 'چکاپ پریو', 'پریودنتال']
const EXTRACTION_KEYWORDS = ['کشیدن دندان', 'کشیدن', 'اکسترکشن', 'extraction', 'خارج کردن ریشه', 'جراحی دندان']

function matchesKeywords(text: string | null | undefined, keywords: string[]): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw.toLowerCase()))
}

function findMatchingClinicProcedure(
  queryKeywords: string[],
  categoryName: string,
  clinicProcedures: Procedure[] = [],
): Procedure | undefined {
  return clinicProcedures.find(
    (p) =>
      p.is_active !== false &&
      (matchesKeywords(p.name, queryKeywords) ||
        (p.category && p.category.toLowerCase().includes(categoryName.toLowerCase()))),
  )
}

/**
 * Evaluates a completed or recorded treatment against ADA CDT clinical protocols
 * and returns recommended next procedures for the tooth/patient.
 */
export function getChainedNextSteps(
  completedTreatment: Treatment,
  toothHistory: Treatment[] = [],
  clinicProcedures: Procedure[] = [],
): ClinicalNextStepRecommendation[] {
  const procName = completedTreatment.procedure_name || ''
  const tooth = completedTreatment.tooth_number
  const recommendations: ClinicalNextStepRecommendation[] = []

  // Check which procedures already exist in the tooth's history (planned, in_progress, or completed)
  const existingTreatmentsOnTooth = tooth
    ? toothHistory.filter((t) => t.tooth_number === tooth && t.status !== 'cancelled')
    : []

  const hasExistingBuildup = existingTreatmentsOnTooth.some((t) => matchesKeywords(t.procedure_name, BUILDUP_KEYWORDS))
  const hasExistingPost = existingTreatmentsOnTooth.some((t) => matchesKeywords(t.procedure_name, POST_KEYWORDS))
  const hasExistingCrown = existingTreatmentsOnTooth.some((t) => matchesKeywords(t.procedure_name, CROWN_KEYWORDS))
  const hasExistingHealing = existingTreatmentsOnTooth.some((t) => matchesKeywords(t.procedure_name, IMPLANT_HEALING_KEYWORDS))
  const hasExistingImplantProstho = existingTreatmentsOnTooth.some((t) => matchesKeywords(t.procedure_name, IMPLANT_PROSTHO_KEYWORDS))

  // 1. عصب‌کشی (Endodontics) → بیلداپ یا پست‌و‌کور → روکش
  if (matchesKeywords(procName, ENDO_KEYWORDS)) {
    if (!hasExistingBuildup && !hasExistingPost) {
      const match = findMatchingClinicProcedure(BUILDUP_KEYWORDS, 'ترمیم', clinicProcedures)
      recommendations.push({
        id: 'CHAIN-ENDO-BUILDUP',
        title: 'بازسازی تاج (Core Buildup)',
        procedureName: match?.name || 'بیلداپ کامپوزیت / آمالگام تاج دندان',
        procedureCode: match?.code || 'CDT-D2950',
        procedureCategory: match?.category || 'ترمیم',
        toothNumber: tooth,
        rationale: 'بازسازی ساختار کرونال از دست رفته دندان جهت آماده‌سازی روکش و جلوگیری از نشت باکتریایی',
        estimatedPrice: match?.default_price || null,
        urgency: 'critical',
        targetProcedureId: match?.id || null,
      })

      const postMatch = findMatchingClinicProcedure(POST_KEYWORDS, 'ترمیم', clinicProcedures)
      recommendations.push({
        id: 'CHAIN-ENDO-POST',
        title: 'پست و کور (Post & Core)',
        procedureName: postMatch?.name || 'پست داخل کانال و بازسازی کور',
        procedureCode: postMatch?.code || 'CDT-D2954',
        procedureCategory: postMatch?.category || 'ترمیم',
        toothNumber: tooth,
        rationale: 'تامین گیر و ثبات در دندان‌های با تخریب بیش از ۵۰٪ بافت سالم تاج',
        estimatedPrice: postMatch?.default_price || null,
        urgency: 'recommended',
        targetProcedureId: postMatch?.id || null,
      })
    }

    if (!hasExistingCrown) {
      const crownMatch = findMatchingClinicProcedure(CROWN_KEYWORDS, 'پروتز', clinicProcedures)
      recommendations.push({
        id: 'CHAIN-ENDO-CROWN',
        title: 'روکش دندان (Crown)',
        procedureName: crownMatch?.name || 'روکش تمام سرامیک / زیرکونیا',
        procedureCode: crownMatch?.code || 'CDT-D2740',
        procedureCategory: crownMatch?.category || 'پروتز ثابت',
        toothNumber: tooth,
        rationale: 'حفاظت در برابر شکستگی تحت فشارهای سنگین اکلوزال و بازگرداندن زیبایی و فانکشن',
        estimatedPrice: crownMatch?.default_price || null,
        urgency: 'recommended',
        targetProcedureId: crownMatch?.id || null,
      })
    }
  }

  // 2. بیلداپ تاج یا پست‌و‌کور → روکش
  else if (matchesKeywords(procName, BUILDUP_KEYWORDS) || matchesKeywords(procName, POST_KEYWORDS)) {
    if (!hasExistingCrown) {
      const crownMatch = findMatchingClinicProcedure(CROWN_KEYWORDS, 'پروتز', clinicProcedures)
      recommendations.push({
        id: 'CHAIN-BUILDUP-CROWN',
        title: 'قالب‌گیری و ساخت روکش (Crown)',
        procedureName: crownMatch?.name || 'روکش تمام سرامیک / زیرکونیا',
        procedureCode: crownMatch?.code || 'CDT-D2740',
        procedureCategory: crownMatch?.category || 'پروتز ثابت',
        toothNumber: tooth,
        rationale: 'پوشش کامل تاج بازسازی‌شده جهت پیشگیری از شکستن دیواره‌های باقیمانده دندان',
        estimatedPrice: crownMatch?.default_price || null,
        urgency: 'critical',
        targetProcedureId: crownMatch?.id || null,
      })
    }
  }

  // 3. جراحی کاشت ایمپلنت → هیلینگ اباتمنت → روکش ایمپلنت
  else if (matchesKeywords(procName, IMPLANT_SURGERY_KEYWORDS)) {
    if (!hasExistingHealing) {
      const healMatch = findMatchingClinicProcedure(IMPLANT_HEALING_KEYWORDS, 'ایمپلنت', clinicProcedures)
      recommendations.push({
        id: 'CHAIN-IMPLANT-HEALING',
        title: 'بستن هیلینگ اباتمنت (Uncovery & Healing)',
        procedureName: healMatch?.name || 'جراحی مرحله دوم و بستن پیچ هیلینگ',
        procedureCode: healMatch?.code || 'CDT-D6010-H',
        procedureCategory: healMatch?.category || 'ایمپلنت',
        toothNumber: tooth,
        rationale: 'فرم‌دهی بافت نرم اطراف ایمپلنت پس از پایان دوره استئواینتگریشن',
        estimatedPrice: healMatch?.default_price || null,
        urgency: 'recommended',
        targetProcedureId: healMatch?.id || null,
      })
    }

    if (!hasExistingImplantProstho) {
      const impCrownMatch = findMatchingClinicProcedure(IMPLANT_PROSTHO_KEYWORDS, 'پروتز', clinicProcedures)
      recommendations.push({
        id: 'CHAIN-IMPLANT-CROWN',
        title: 'روکش و پروتز ایمپلنت (Implant Crown)',
        procedureName: impCrownMatch?.name || 'قالب‌گیری، اباتمنت و روکش ایمپلنت',
        procedureCode: impCrownMatch?.code || 'CDT-D6058',
        procedureCategory: impCrownMatch?.category || 'پروتز ایمپلنت',
        toothNumber: tooth,
        rationale: 'تکمیل درمان ایمپلنت با پروتز دائمی و بازگرداندن جویدن و زیبایی',
        estimatedPrice: impCrownMatch?.default_price || null,
        urgency: 'routine',
        targetProcedureId: impCrownMatch?.id || null,
      })
    }
  }

  // 4. جرم‌گیری عمیق / درمان لثه → ارزیابی مجدد پریو (Perio Re-evaluation)
  else if (matchesKeywords(procName, PERIO_CLEANING_KEYWORDS)) {
    const reevalMatch = findMatchingClinicProcedure(PERIO_REEVAL_KEYWORDS, 'پریو', clinicProcedures)
    recommendations.push({
      id: 'CHAIN-PERIO-REEVAL',
      title: 'معاینه و ارزیابی مجدد لثه (Perio Re-eval)',
      procedureName: reevalMatch?.name || 'معاینه مجدد لثه و کنترل عمق پاکت‌ها (۴ الی ۶ هفته بعد)',
      procedureCode: reevalMatch?.code || 'CDT-D0180',
      procedureCategory: reevalMatch?.category || 'پریودنتیکس',
      toothNumber: null, // دهان کامل
      rationale: 'ارزیابی پاسخ بافت لثه به جرم‌گیری، بهبود عمق پروب و کنترل پلاک',
      estimatedPrice: reevalMatch?.default_price || 0,
      urgency: 'recommended',
      targetProcedureId: reevalMatch?.id || null,
    })
  }

  // 5. کشیدن دندان (به استثنای دندان‌های عقل ۱۸, ۲۸, ۳۸, ۴۸) → ایمپلنت جایگزین
  else if (matchesKeywords(procName, EXTRACTION_KEYWORDS)) {
    const isWisdom = tooth && ['18', '28', '38', '48'].includes(tooth.replace(/\D/g, ''))
    if (!isWisdom && tooth) {
      const implantMatch = findMatchingClinicProcedure(IMPLANT_SURGERY_KEYWORDS, 'ایمپلنت', clinicProcedures)
      recommendations.push({
        id: 'CHAIN-EXTRACTION-IMPLANT',
        title: 'کاشت ایمپلنت جایگزین',
        procedureName: implantMatch?.name || 'کاشت فیکسچر ایمپلنت در جایگاه دندان کشیده شده',
        procedureCode: implantMatch?.code || 'CDT-D6010',
        procedureCategory: implantMatch?.category || 'ایمپلنت',
        toothNumber: tooth,
        rationale: 'جلوگیری از تحلیل استخوان آلوئولار و حفظ نظم دندان‌های مجاور و مقابل',
        estimatedPrice: implantMatch?.default_price || null,
        urgency: 'recommended',
        targetProcedureId: implantMatch?.id || null,
      })
    }
  }

  return recommendations
}
