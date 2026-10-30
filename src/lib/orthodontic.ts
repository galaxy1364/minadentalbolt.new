// orthodontic.ts — Orthodontic & Occlusal Bite Analysis Engine
// Implements Angle's Classification of Malocclusion, ABO & ADA CDT Standards (D8000 series)

import {
  OrthoExam,
  OrthoExamInput,
  AngleMolarClass,
  AngleCanineClass,
  ArchDiscrepancyDegree,
  FacialProfileType,
  LipCompetenceType,
  TmjStatusType,
  OrthoTreatmentStage,
  OrthoApplianceType,
  Patient,
  Doctor,
} from '../types'
import { toPersianDigits, toJalaliStringPretty } from './persianDate'
import { calculateAge } from './patientUtils'

// ============================================================================
// Clinical Dictionaries & Persian Terminology
// ============================================================================

export const ANGLE_MOLAR_LABELS: Record<AngleMolarClass, { label: string; short: string; desc: string }> = {
  class_1: {
    label: 'کلاس I (نوترواکلوژن / نرمال مولار)',
    short: 'Class I',
    desc: 'کاسپ مزیوباکال مولار اول بالا در شیار باکال مولار اول پایین قرار دارد.',
  },
  class_2_div_1: {
    label: 'کلاس II بخش ۱ (دیستواکلوژن با شیب لبی سنترال‌ها)',
    short: 'Class II Div 1',
    desc: 'مولار پایین به سمت عقب (دیستال) است؛ دندان‌های پیشین فک بالا پروکلاین و اورجت زیاد است.',
  },
  class_2_div_2: {
    label: 'کلاس II بخش ۲ (دیستواکلوژن با رتروکلاینیشن سنترال‌ها)',
    short: 'Class II Div 2',
    desc: 'مولار پایین دیستال است؛ سنترال‌های بالا به سمت عقب (رتروکلاین) و لترال‌ها لبیال هستند، معمولاً با دیپ بایت شدید.',
  },
  class_3: {
    label: 'کلاس III (مزیواکلوژن / جلوآمدگی فک پایین)',
    short: 'Class III',
    desc: 'شیار باکال مولار اول پایین مزیال‌تر از کاسپ مزیوباکال مولار اول بالا است.',
  },
  not_applicable: {
    label: 'نامشخص / از دست رفته یا غایب',
    short: 'N/A',
    desc: 'دندان مولار اول به علت کشیده شدن یا نهفتگی قابل ارزیابی نیست.',
  },
}

export const ANGLE_CANINE_LABELS: Record<AngleCanineClass, { label: string; short: string }> = {
  class_1: {
    label: 'کلاس I کانین (نوتروکپ)',
    short: 'Canine Class I',
  },
  class_2: {
    label: 'کلاس II کانین (دیستوکپ)',
    short: 'Canine Class II',
  },
  class_3: {
    label: 'کلاس III کانین (مزیوکپ)',
    short: 'Canine Class III',
  },
  not_applicable: {
    label: 'نامشخص / غایب',
    short: 'N/A',
  },
}

export const ARCH_DISCREPANCY_LABELS: Record<ArchDiscrepancyDegree, { label: string; mmRange: string }> = {
  none: { label: 'ندارد / بدون ناهماهنگی', mmRange: '۰ میلی‌متر' },
  mild: { label: 'خفیف', mmRange: 'کمتر از ۳ میلی‌متر' },
  moderate: { label: 'متوسط', mmRange: '۴ تا ۷ میلی‌متر' },
  severe: { label: 'شدید', mmRange: '۸ میلی‌متر و بیشتر' },
}

export const FACIAL_PROFILE_LABELS: Record<FacialProfileType, { label: string; clinical: string }> = {
  straight: { label: 'مستقیم (Straight / Orthognathic)', clinical: 'پروفایل هماهنگ اسکلتی فکین' },
  convex: { label: 'محدب (Convex Profile)', clinical: 'نشان‌دهنده رتروگناتیسم مندیبل یا پروگناتیسم ماگزیلا (اسکلتال کلاس ۲)' },
  concave: { label: 'مقعر (Concave Profile)', clinical: 'نشان‌دهنده پروگناتیسم مندیبل یا هیپوپلازی ماگزیلا (اسکلتال کلاس ۳)' },
}

export const LIP_COMPETENCE_LABELS: Record<LipCompetenceType, string> = {
  competent: 'کامپتنت (بسته شدن طبیعی لب‌ها در حالت استراحت)',
  incompetent: 'این‌کامپتنت (فاصله لب‌ها در استراحت > 3-4mm و انقباض عضله چونگی)',
  potentially_competent: 'پتانسیل کامپتنت (با مهار پروکلاینیشن دندانی بسته می‌شود)',
}

export const TMJ_STATUS_LABELS: Record<TmjStatusType, string> = {
  normal: 'طبیعی بدون صدا، انحراف یا درد مفصل گیجگاهی-فکی',
  clicking_right: 'کلیک و صدای تق‌تق در مفصل سمت راست',
  clicking_left: 'کلیک و صدای تق‌تق در مفصل سمت چپ',
  clicking_bilateral: 'کلیک دوطرفه مفاصل فک',
  pain: 'درد هنگام لمس مفصل یا عضلات ماضغه',
  limited_opening: 'محدودیت در باز کردن دهان (کمتر از ۳۵ میلی‌متر)',
}

export const HABIT_LABELS: Record<string, string> = {
  bruxism: 'دندان‌قروچه شبانه یا ساییدن دندان‌ها (Bruxism)',
  mouth_breathing: 'تنفس دهانی مداوم (Mouth Breathing)',
  tongue_thrust: 'رانش غیرطبیعی زبان حین بلع (Tongue Thrust)',
  thumb_sucking: 'مکیدن شست یا انگشتان (Thumb Sucking)',
  clenching: 'فشردن دندان‌ها در طول روز (Clenching)',
  lip_biting: 'گاز گرفتن لب پایین (Lip Biting)',
}

export const TREATMENT_STAGE_LABELS: Record<OrthoTreatmentStage, string> = {
  initial_consult: 'مشاوره و ارزیابی اولیه',
  records_taken: 'ثبت مدارک (فتوگرافی، رادیوگرافی، کست تشخیصی)',
  in_treatment: 'در حال درمان فعال ارتودنسی',
  retention: 'فاز نگه‌داری (ریتنشن)',
  completed: 'درمان کامل و خاتمه‌یافته',
}

export const APPLIANCE_TYPE_LABELS: Record<OrthoApplianceType, string> = {
  fixed_metal: 'ارتودنسی ثابت براکت فلزی',
  fixed_ceramic: 'ارتودنسی ثابت براکت سرامیکی شفاف',
  clear_aligners: 'ارتودنسی نامرئی / الاینر شفاف',
  removable_functional: 'پلاک متحرک فانکشنال (ارتقای رشد فک)',
  palatal_expander: 'پهن‌کننده کام (RPE / Quad-Helix)',
  orthognathic_surgery: 'ارتوسرجری / ترکیب با جراحی ارتوگناتیک',
  other: 'سایر ابزارها و فضا نگه‌دارنده‌ها',
}

// ============================================================================
// Qualitative Sagittal & Vertical Occlusion Analysis
// ============================================================================

export interface OverjetAnalysis {
  category: 'reverse' | 'edge_to_edge' | 'normal' | 'increased' | 'excessive'
  label: string
  isCrossbite: boolean
  isIncreased: boolean
}

export function analyzeOverjet(overjetMm: number): OverjetAnalysis {
  if (overjetMm < 0) {
    return {
      category: 'reverse',
      label: `کراس‌بایت قدامی معکوس (${toPersianDigits(Math.abs(overjetMm))} میلی‌متر معکوس)`,
      isCrossbite: true,
      isIncreased: false,
    }
  }
  if (overjetMm === 0) {
    return {
      category: 'edge_to_edge',
      label: 'لبه به لبه (Edge-to-Edge)',
      isCrossbite: false,
      isIncreased: false,
    }
  }
  if (overjetMm <= 3.5) {
    return {
      category: 'normal',
      label: `نرمال و فیزیولوژیک (${toPersianDigits(overjetMm)} میلی‌متر)`,
      isCrossbite: false,
      isIncreased: false,
    }
  }
  if (overjetMm <= 6) {
    return {
      category: 'increased',
      label: `اورجت افزایش‌یافته (${toPersianDigits(overjetMm)} میلی‌متر)`,
      isCrossbite: false,
      isIncreased: true,
    }
  }
  return {
    category: 'excessive',
    label: `اورجت شدید (${toPersianDigits(overjetMm)} میلی‌متر - خطر ترومای دندانی)`,
    isCrossbite: false,
    isIncreased: true,
  }
}

export interface OverbiteAnalysis {
  category: 'open_bite' | 'edge_to_edge' | 'normal' | 'deep_bite' | 'severe_deep'
  label: string
  isOpenBite: boolean
  isDeepBite: boolean
}

export function analyzeOverbite(overbitePercent: number): OverbiteAnalysis {
  if (overbitePercent < 0) {
    return {
      category: 'open_bite',
      label: `اپن بایت قدامی (${toPersianDigits(Math.abs(overbitePercent))}٪ فاصله)`,
      isOpenBite: true,
      isDeepBite: false,
    }
  }
  if (overbitePercent === 0) {
    return {
      category: 'edge_to_edge',
      label: 'لبه به لبه عمودی (۰٪ هم‌پوشانی)',
      isOpenBite: false,
      isDeepBite: false,
    }
  }
  if (overbitePercent <= 40) {
    return {
      category: 'normal',
      label: `هم‌پوشانی نرمال (${toPersianDigits(overbitePercent)}٪)`,
      isOpenBite: false,
      isDeepBite: false,
    }
  }
  if (overbitePercent <= 70) {
    return {
      category: 'deep_bite',
      label: `دیپ بایت متوسط (${toPersianDigits(overbitePercent)}٪ هم‌پوشانی)`,
      isOpenBite: false,
      isDeepBite: true,
    }
  }
  return {
    category: 'severe_deep',
    label: `دیپ بایت شدید / خطر آسیب به کام (${toPersianDigits(overbitePercent)}٪)`,
    isOpenBite: false,
    isDeepBite: true,
  }
}

// ============================================================================
// Complexity Score & Malocclusion Severity Index (0 - 100)
// ============================================================================

export interface OrthoComplexity {
  score: number // 0 to 100
  tier: 'mild' | 'moderate' | 'complex' | 'severe'
  tierLabel: string
  color: 'success' | 'info' | 'warning' | 'error'
  riskFactors: string[]
  recommendedDurationMonths: number
  primaryCdtCode: string
  primaryCdtTitle: string
}

export function calculateOrthoComplexity(exam: Partial<OrthoExam>, patient?: Patient | null): OrthoComplexity {
  let score = 0
  const riskFactors: string[] = []

  // 1. Molar relationship
  const rMolar = exam.molar_class_right || 'class_1'
  const lMolar = exam.molar_class_left || 'class_1'

  if (rMolar === 'class_2_div_1' || lMolar === 'class_2_div_1') {
    score += 15
    riskFactors.push('مال‌اکلوژن کلاس II بخش ۱')
  }
  if (rMolar === 'class_2_div_2' || lMolar === 'class_2_div_2') {
    score += 16
    riskFactors.push('مال‌اکلوژن کلاس II بخش ۲')
  }
  if (rMolar === 'class_3' || lMolar === 'class_3') {
    score += 20
    riskFactors.push('مال‌اکلوژن کلاس III (گرایش مزیال فکین)')
  }
  if (rMolar !== lMolar && rMolar !== 'not_applicable' && lMolar !== 'not_applicable') {
    score += 8
    riskFactors.push('عدم تقارن طرفین در روابط مولار')
  }

  // 2. Overjet
  const oj = exam.overjet_mm ?? 2
  if (oj < 0) {
    score += 18
    riskFactors.push(`کراس‌بایت قدامی (${Math.abs(oj)}mm معکوس)`)
  } else if (oj > 6) {
    score += 15
    riskFactors.push(`اورجت زیاد (${oj}mm)`)
  } else if (oj > 3.5) {
    score += 6
  }

  // 3. Overbite
  const ob = exam.overbite_percent ?? 25
  if (ob < 0) {
    score += 18
    riskFactors.push(`اپن بایت قدامی (${Math.abs(ob)}٪)`)
  } else if (ob > 70) {
    score += 12
    riskFactors.push(`دیپ بایت شدید تروماتیک (${ob}٪)`)
  } else if (ob > 40) {
    score += 5
  }

  // 4. Crossbites
  if (exam.crossbite_anterior) {
    score += 10
    riskFactors.push('کراس‌بایت قدامی فعال')
  }
  if (exam.crossbite_posterior_right && exam.crossbite_posterior_left) {
    score += 16
    riskFactors.push('کراس‌بایت خلفی دوطرفه (تنگی عرضی ماگزیلا)')
  } else if (exam.crossbite_posterior_right || exam.crossbite_posterior_left) {
    score += 10
    riskFactors.push('کراس‌بایت خلفی یک‌طرفه')
  }

  // 5. Crowding & Spacing
  const crowdScores: Record<ArchDiscrepancyDegree, number> = { none: 0, mild: 4, moderate: 8, severe: 14 }
  const upperCrowd = exam.crowding_upper || 'none'
  const lowerCrowd = exam.crowding_lower || 'none'
  score += crowdScores[upperCrowd] || 0
  score += crowdScores[lowerCrowd] || 0

  if (upperCrowd === 'severe' || lowerCrowd === 'severe') {
    riskFactors.push('کراودینگ و بی‌نظمی شدید دندان‌ها')
  }

  // 6. Facial Profile & TMJ
  if (exam.facial_profile === 'concave') {
    score += 12
    riskFactors.push('پروفایل مقعر اسکلتال (احتمال نیاز به ارتوسرجری)')
  } else if (exam.facial_profile === 'convex') {
    score += 8
    riskFactors.push('پروفایل محدب اسکلتال')
  }

  if (exam.tmj_status && exam.tmj_status !== 'normal') {
    score += 10
    riskFactors.push(`علائم فکی گیجگاهی: ${TMJ_STATUS_LABELS[exam.tmj_status] || ''}`)
  }

  // 7. Habits
  const habits = exam.habits || []
  if (habits.length > 0) {
    score += Math.min(12, habits.length * 4)
    habits.forEach((h) => {
      if (HABIT_LABELS[h]) riskFactors.push(`عادت مخرب: ${HABIT_LABELS[h]}`)
    })
  }

  // Clamp 0 to 100
  score = Math.min(100, Math.max(0, score))

  // Estimate duration and tier
  let tier: OrthoComplexity['tier'] = 'mild'
  let tierLabel = 'ناهنجاری خفیف (Mild)'
  let color: OrthoComplexity['color'] = 'success'
  let recommendedDurationMonths = 9

  if (score >= 70) {
    tier = 'severe'
    tierLabel = 'بسیار پیچیده / نیاز به جراحی یا دستگاه تخصصی (Severe)'
    color = 'error'
    recommendedDurationMonths = 24
  } else if (score >= 45) {
    tier = 'complex'
    tierLabel = 'ناهنجاری پیچیده و چندبعدی (Complex)'
    color = 'warning'
    recommendedDurationMonths = 18
  } else if (score >= 20) {
    tier = 'moderate'
    tierLabel = 'ناهنجاری متوسط (Moderate)'
    color = 'info'
    recommendedDurationMonths = 14
  }

  // Age based CDT
  const age = patient?.birth_date ? (calculateAge(patient.birth_date) ?? 20) : 20
  let primaryCdtCode = 'D8080'
  let primaryCdtTitle = 'Comprehensive Orthodontic Treatment of Adolescent Dentition'

  if (age < 7) {
    primaryCdtCode = 'D8010'
    primaryCdtTitle = 'Limited Orthodontic Treatment of the Primary Dentition'
  } else if (age < 12) {
    primaryCdtCode = score > 45 ? 'D8070' : 'D8020'
    primaryCdtTitle = score > 45
      ? 'Comprehensive Orthodontic Treatment of Transitional Dentition'
      : 'Limited Orthodontic Treatment of Transitional Dentition'
  } else if (age >= 19) {
    primaryCdtCode = 'D8090'
    primaryCdtTitle = 'Comprehensive Orthodontic Treatment of the Adult Dentition'
  }

  return {
    score,
    tier,
    tierLabel,
    color,
    riskFactors,
    recommendedDurationMonths,
    primaryCdtCode,
    primaryCdtTitle,
  }
}

// ============================================================================
// Factory Helper
// ============================================================================

export function createEmptyOrthoExam(patientId: string): OrthoExamInput {
  return {
    patient_id: patientId,
    doctor_id: null,
    exam_date: new Date().toISOString().slice(0, 10),
    molar_class_right: 'class_1',
    molar_class_left: 'class_1',
    canine_class_right: 'class_1',
    canine_class_left: 'class_1',
    overjet_mm: 2,
    overbite_percent: 25,
    midline_shift_upper_mm: 0,
    midline_shift_lower_mm: 0,
    crossbite_anterior: false,
    crossbite_posterior_right: false,
    crossbite_posterior_left: false,
    crowding_upper: 'none',
    crowding_lower: 'none',
    spacing_upper: 'none',
    spacing_lower: 'none',
    diastema_mm: 0,
    facial_profile: 'straight',
    lip_competence: 'competent',
    habits: [],
    tmj_status: 'normal',
    treatment_stage: 'initial_consult',
    appliance_type: 'fixed_metal',
    estimated_duration_months: 18,
    notes: '',
  }
}

// ============================================================================
// Printable Orthodontic Case Summary & Referral HTML
// ============================================================================

export function generateOrthoReportHtml(
  exam: OrthoExam,
  patient: Patient,
  doctor?: Doctor | null
): string {
  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'بیمار بدون نام'
  const doctorName = doctor?.name ? `دکتر ${doctor.name}` : 'متخصص ارتودنسی کلینیک'
  const dateStr = toJalaliStringPretty(exam.exam_date || new Date().toISOString())
  const oj = analyzeOverjet(exam.overjet_mm ?? 2)
  const ob = analyzeOverbite(exam.overbite_percent ?? 25)
  const complexity = calculateOrthoComplexity(exam, patient)

  return `
    <div style="direction: rtl; font-family: Tahoma, 'IRANSans', Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 24px;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #6366f1; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="color: #4338ca; font-size: 22px; font-weight: 800; margin: 0 0 6px 0;">گزارش ارزیابی تخصصی ارتودنسی و آنالیز بایت</h1>
          <p style="font-size: 12px; color: #64748b; margin: 0;">Comprehensive Orthodontic & Occlusal Bite Analysis Summary</p>
        </div>
        <div style="text-align: left; font-size: 12px; color: #334155;">
          <div><b>تاریخ معاینه:</b> ${dateStr}</div>
          <div><b>کد بین‌المللی ADA:</b> <span style="font-family: monospace; font-weight: bold; color: #4338ca;">${complexity.primaryCdtCode}</span></div>
        </div>
      </div>

      <!-- Patient & Doctor Meta -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 18px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 12px;">
        <div>نام بیمار: <b>${patientName}</b></div>
        <div>شماره پرونده: <b>${patient.file_number ? toPersianDigits(patient.file_number) : '—'}</b></div>
        <div>پزشک معالج: <b>${doctorName}</b></div>
        <div>مرحله درمان: <b>${TREATMENT_STAGE_LABELS[exam.treatment_stage] || '—'}</b></div>
      </div>

      <!-- Complexity & Key Highlights Banner -->
      <div style="background: ${complexity.score >= 50 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${complexity.score >= 50 ? '#fecaca' : '#bbf7d0'}; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: ${complexity.score >= 50 ? '#991b1b' : '#166534'};">
            سطح پیچیدگی درمان: ${complexity.tierLabel} (شاخص: ${toPersianDigits(complexity.score)} از ۱۰۰)
          </span>
          <span style="font-size: 12px; background: #ffffff; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
            مدت زمان تخمینی درمان: <b>${toPersianDigits(exam.estimated_duration_months || complexity.recommendedDurationMonths)} ماه</b>
          </span>
        </div>
        ${complexity.riskFactors.length > 0 ? `
          <div style="margin-top: 8px; font-size: 11px; color: #475569;">
            <b>یافته‌های شاخص بالینی:</b> ${complexity.riskFactors.join(' • ')}
          </div>
        ` : ''}
      </div>

      <!-- Angle's Classification Table -->
      <h3 style="font-size: 14px; color: #334155; margin: 0 0 8px 0; border-right: 3px solid #6366f1; padding-right: 8px;">
        ۱. طبقه‌بندی اکلوژن انگل (Angle's Classification)
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; text-align: center;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 8px;">ناحیه دندانی</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">سمت راست (Right)</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">سمت چپ (Left)</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">توضیحات تشخیصی</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; background: #f8fafc;">مولار اول دائمی (First Molar)</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">${ANGLE_MOLAR_LABELS[exam.molar_class_right]?.label || '—'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">${ANGLE_MOLAR_LABELS[exam.molar_class_left]?.label || '—'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-size: 10px; color: #64748b;">
              ${ANGLE_MOLAR_LABELS[exam.molar_class_right]?.desc || ''}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; background: #f8fafc;">دندان نیش (Canine)</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">${ANGLE_CANINE_LABELS[exam.canine_class_right]?.label || '—'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">${ANGLE_CANINE_LABELS[exam.canine_class_left]?.label || '—'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-size: 10px; color: #64748b;">
              تناسب راهنمای کانین و روابط طرفی
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Sagittal, Vertical & Transverse Measurements -->
      <h3 style="font-size: 14px; color: #334155; margin: 0 0 8px 0; border-right: 3px solid #6366f1; padding-right: 8px;">
        ۲. اندازه‌گیری‌های ساژیتال، ورتیکال و عرضی (Bite Parameters)
      </h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 11px; margin-bottom: 20px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #ffffff;">
          <div style="color: #64748b; margin-bottom: 4px;">اورجت افقی (Overjet)</div>
          <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${toPersianDigits(exam.overjet_mm)} میلی‌متر</div>
          <div style="color: #6366f1; font-weight: 500; margin-top: 4px;">${oj.label}</div>
        </div>
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #ffffff;">
          <div style="color: #64748b; margin-bottom: 4px;">اوربایت عمودی (Overbite)</div>
          <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${toPersianDigits(exam.overbite_percent)}٪</div>
          <div style="color: #6366f1; font-weight: 500; margin-top: 4px;">${ob.label}</div>
        </div>
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #ffffff;">
          <div style="color: #64748b; margin-bottom: 4px;">کراس‌بایت‌ها (Crossbites)</div>
          <div>قدامی: <b>${exam.crossbite_anterior ? 'دارد' : 'ندارد'}</b></div>
          <div>خلفی راست: <b>${exam.crossbite_posterior_right ? 'دارد' : 'ندارد'}</b></div>
          <div>خلفی چپ: <b>${exam.crossbite_posterior_left ? 'دارد' : 'ندارد'}</b></div>
        </div>
      </div>

      <!-- Arch Discrepancies & Profile -->
      <h3 style="font-size: 14px; color: #334155; margin: 0 0 8px 0; border-right: 3px solid #6366f1; padding-right: 8px;">
        ۳. ناهماهنگی‌های قوسی، وضعیت بافت نرم و مفصل گیجگاهی (TMJ)
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; background: #f8fafc; width: 25%;">کراودینگ فک بالا / پایین:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; width: 25%;">
              بالا: ${ARCH_DISCREPANCY_LABELS[exam.crowding_upper]?.label || '—'} | پایین: ${ARCH_DISCREPANCY_LABELS[exam.crowding_lower]?.label || '—'}
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; background: #f8fafc; width: 25%;">پروفایل صورتی:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; width: 25%;">
              ${FACIAL_PROFILE_LABELS[exam.facial_profile]?.label || '—'}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; background: #f8fafc;">دیاستم و فاصله‌داری:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">
              ${exam.diastema_mm > 0 ? `${toPersianDigits(exam.diastema_mm)} میلی‌متر` : 'ندارد'}
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; background: #f8fafc;">کفایت لب‌ها (Lip Competence):</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">
              ${LIP_COMPETENCE_LABELS[exam.lip_competence] || '—'}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; background: #f8fafc;">مفصل گیجگاهی-فکی (TMJ):</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;" colspan="3">
              ${TMJ_STATUS_LABELS[exam.tmj_status] || 'طبیعی'}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Appliance & Plan -->
      <div style="border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 24px; font-size: 11px;">
        <div style="margin-bottom: 4px;"><b>دستگاه ارتودنسی پیشنهادی / فعال:</b> ${APPLIANCE_TYPE_LABELS[exam.appliance_type] || '—'}</div>
        ${exam.notes ? `<div><b>یادداشت‌ها و پلن اختصاصی درمان:</b> ${exam.notes}</div>` : ''}
      </div>

      <!-- Signatures Footer -->
      <div style="margin-top: 36px; display: flex; justify-content: space-between; font-size: 12px; padding: 0 20px;">
        <div style="text-align: center;">
          <div>امضای بیمار / ولی قانونی:</div>
          <div style="margin-top: 40px; color: #94a3b8;">..........................................</div>
        </div>
        <div style="text-align: center;">
          <div>مهر و امضای متخصص ارتودنسی:</div>
          <div style="margin-top: 10px; font-weight: bold; color: #1e293b;">${doctorName}</div>
          <div style="margin-top: 25px; color: #94a3b8;">..........................................</div>
        </div>
      </div>
    </div>
  `
}

// ============================================================================
// IOTN (Index of Orthodontic Treatment Need) - Dental Health Component (DHC)
// ============================================================================

export interface IotnResult {
  grade: 1 | 2 | 3 | 4 | 5
  gradeLabel: string
  needLevel: 'none' | 'mild' | 'moderate' | 'great' | 'very_great'
  needText: string
  color: 'success' | 'info' | 'warning' | 'error'
  rationales: string[]
}

export function calculateIotnGrade(exam: Partial<OrthoExamInput>): IotnResult {
  const rationales: string[] = []
  const oj = exam.overjet_mm ?? 2
  const ob = exam.overbite_percent ?? 25
  const hasCrossbite = exam.crossbite_anterior || exam.crossbite_posterior_right || exam.crossbite_posterior_left

  // Grade 5: Very Great Need
  if (oj > 9) {
    rationales.push(`اورجت بسیار شدید (${toPersianDigits(oj)}mm > 9mm) با ریسک ترومای حاد دندانی (Grade 5a)`)
  }
  if (oj < -3.5) {
    rationales.push(`کراس‌بایت قدامی معکوس شدید (${toPersianDigits(Math.abs(oj))}mm > 3.5mm) با اختلال عملکردی (Grade 5m)`)
  }
  if (rationales.length > 0) {
    return {
      grade: 5,
      gradeLabel: 'گرید ۵ (Very Great Need)',
      needLevel: 'very_great',
      needText: 'نیاز حیاتی و بسیار شدید به درمان ارتودنسی',
      color: 'error',
      rationales,
    }
  }

  // Grade 4: Great Need
  if (oj > 6 && oj <= 9) {
    rationales.push(`اورجت افزایش‌یافته قابل‌توجه (${toPersianDigits(oj)}mm) با خطر آسیب دندانی (Grade 4a)`)
  }
  if (oj < 0 && oj >= -3.5) {
    rationales.push(`کراس‌بایت معکوس قدامی (${toPersianDigits(Math.abs(oj))}mm) (Grade 4m)`)
  }
  if (ob >= 75) {
    rationales.push(`دیپ بایت شدید با ترومای لثه‌ای یا کانتکت پالاتال (${toPersianDigits(ob)}٪) (Grade 4f)`)
  }
  if (ob < -20) {
    rationales.push(`اپن بایت قدامی بارز (${toPersianDigits(Math.abs(ob))}٪) (Grade 4e)`)
  }
  if (exam.crowding_upper === 'severe' || exam.crowding_lower === 'severe') {
    rationales.push('کراودینگ شدید قوس با کمبود فضای بیش از ۴ میلی‌متر (Grade 4d)')
  }
  if (hasCrossbite && exam.midline_shift_upper_mm && Math.abs(exam.midline_shift_upper_mm) > 2) {
    rationales.push('کراس‌بایت همراه با شیفت اکلوزال و انحراف خط میانی (Grade 4c)')
  }
  if (rationales.length > 0) {
    return {
      grade: 4,
      gradeLabel: 'گرید ۴ (Great Need)',
      needLevel: 'great',
      needText: 'نیاز قطعی و بالا به مداخله ارتودنسی',
      color: 'error',
      rationales,
    }
  }

  // Grade 3: Borderline Need
  if (oj > 3.5 && oj <= 6) {
    rationales.push(`اورجت متوسط (${toPersianDigits(oj)}mm) با احتمال بی‌کفایتی لب‌ها (Grade 3a)`)
  }
  if (ob >= 50 && ob < 75) {
    rationales.push(`دیپ بایت متوسط بدون آسیب لثه‌ای (${toPersianDigits(ob)}٪) (Grade 3f)`)
  }
  if (ob < 0 && ob >= -20) {
    rationales.push('اپن بایت قدامی خفیف تا متوسط (Grade 3e)')
  }
  if (hasCrossbite) {
    rationales.push('کراس‌بایت قدامی یا خلفی بدون جابجایی شدید مندیبل (Grade 3c)')
  }
  if (exam.crowding_upper === 'moderate' || exam.crowding_lower === 'moderate') {
    rationales.push('کراودینگ متوسط قوس دندانی (Grade 3d)')
  }
  if (rationales.length > 0) {
    return {
      grade: 3,
      gradeLabel: 'گرید ۳ (Borderline Need)',
      needLevel: 'moderate',
      needText: 'نیاز حدواسط / انتخابی با ارزیابی زیبایی و تمایل بیمار',
      color: 'warning',
      rationales,
    }
  }

  // Grade 2: Little Need
  if (exam.crowding_upper === 'mild' || exam.crowding_lower === 'mild' || exam.spacing_upper === 'mild' || exam.spacing_lower === 'mild') {
    rationales.push('نامنظمی یا فاصله خفیف دندان‌ها کمتر از ۲ تا ۳ میلی‌متر (Grade 2d)')
  }
  if (rationales.length > 0) {
    return {
      grade: 2,
      gradeLabel: 'گرید ۲ (Little Need)',
      needLevel: 'mild',
      needText: 'ناهنجاری خفیف / نیاز اندک بالینی',
      color: 'info',
      rationales,
    }
  }

  // Grade 1: No Need
  return {
    grade: 1,
    gradeLabel: 'گرید ۱ (No Need)',
    needLevel: 'none',
    needText: 'اکلوژن ایده‌آل و طبیعی / بدون نیاز بالینی به درمان ارتودنسی',
    color: 'success',
    rationales: ['اکلوژن در محدوده نرمال فیزیولوژیک'],
  }
}

// ============================================================================
// Orthodontic Voice Dictation NLP Parser (Persian Clinical Speech)
// ============================================================================

export function parseOrthoVoiceExam(transcript: string): Partial<OrthoExamInput> {
  const result: Partial<OrthoExamInput> = {}
  if (!transcript || typeof transcript !== 'string') return result

  const text = transcript
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .toLowerCase()

  // 1. Molar Classes
  if (text.includes('کلاس دو بخش یک') || text.includes('کلاس ۲ بخش ۱') || text.includes('کلاس دو دیویژن یک') || text.includes('کلاس ۲ دیویژن ۱') || text.includes('کلاس دو یک')) {
    result.molar_class_right = 'class_2_div_1'
    result.molar_class_left = 'class_2_div_1'
  } else if (text.includes('کلاس دو بخش دو') || text.includes('کلاس ۲ بخش ۲') || text.includes('کلاس دو دیویژن دو') || text.includes('کلاس ۲ دیویژن ۲') || text.includes('کلاس دو دو')) {
    result.molar_class_right = 'class_2_div_2'
    result.molar_class_left = 'class_2_div_2'
  } else if (text.includes('کلاس سه') || text.includes('کلاس ۳')) {
    result.molar_class_right = 'class_3'
    result.molar_class_left = 'class_3'
  } else if (text.includes('کلاس یک') || text.includes('کلاس ۱') || text.includes('نرمال مولار')) {
    result.molar_class_right = 'class_1'
    result.molar_class_left = 'class_1'
  }

  // 2. Overjet (اورجت)
  const ojMatch = text.match(/اورجت\s*(منفی|-)?\s*(\d+(?:\.\d+)?)/)
  if (ojMatch) {
    const isNeg = !!ojMatch[1]
    const val = parseFloat(ojMatch[2])
    result.overjet_mm = isNeg ? -val : val
  } else if (text.includes('لبه به لبه')) {
    result.overjet_mm = 0
    result.overbite_percent = 0
  }

  // 3. Overbite (اوربایت)
  const obMatch = text.match(/اوربایت\s*(منفی|-)?\s*(\d+)/)
  if (obMatch) {
    const isNeg = !!obMatch[1]
    const val = parseInt(obMatch[2], 10)
    result.overbite_percent = isNeg ? -val : val
  } else if (text.includes('اپن بایت')) {
    result.overbite_percent = -30
  } else if (text.includes('دیپ بایت شدید')) {
    result.overbite_percent = 85
  } else if (text.includes('دیپ بایت')) {
    result.overbite_percent = 60
  }

  // 4. Crossbites (کراس بایت)
  if (text.includes('کراس بایت قدامی') || text.includes('کراس‌بایت قدامی')) {
    result.crossbite_anterior = true
  }
  if (text.includes('کراس بایت خلفی راست') || text.includes('کراس‌بایت خلفی راست')) {
    result.crossbite_posterior_right = true
  }
  if (text.includes('کراس بایت خلفی چپ') || text.includes('کراس‌بایت خلفی چپ')) {
    result.crossbite_posterior_left = true
  }

  // 5. Crowding & Spacing
  const isCrowdUpper = text.includes('کراودینگ') || text.includes('کراویدینگ') || text.includes('کرادینگ')
  if (isCrowdUpper && (text.includes('شدید بالا') || text.includes('بالا شدید'))) {
    result.crowding_upper = 'severe'
  } else if (isCrowdUpper && (text.includes('متوسط بالا') || text.includes('بالا متوسط'))) {
    result.crowding_upper = 'moderate'
  } else if (isCrowdUpper && (text.includes('خفیف بالا') || text.includes('بالا خفیف'))) {
    result.crowding_upper = 'mild'
  }

  if (isCrowdUpper && (text.includes('شدید پایین') || text.includes('پایین شدید'))) {
    result.crowding_lower = 'severe'
  } else if (isCrowdUpper && (text.includes('متوسط پایین') || text.includes('پایین متوسط'))) {
    result.crowding_lower = 'moderate'
  } else if (isCrowdUpper && (text.includes('خفیف پایین') || text.includes('پایین خفیف'))) {
    result.crowding_lower = 'mild'
  }

  // 6. Facial Profile
  if (text.includes('پروفایل محدب')) {
    result.facial_profile = 'convex'
  } else if (text.includes('پروفایل مقعر')) {
    result.facial_profile = 'concave'
  } else if (text.includes('پروفایل مستقیم') || text.includes('پروفایل صاف')) {
    result.facial_profile = 'straight'
  }

  return result
}

