// periodontal.ts — Comprehensive 6-Point Periodontal Examination Logic & AAP/EFP 2018 Analytics
// Standard 6-site probing: Distobuccal (DB), Midbuccal (B), Mesiobuccal (MB), Distolingual (DL), Midlingual (L), Mesiolingual (ML)

import { PerioToothData, PerioSiteData, Patient } from '../types'
import { toPersianDigits } from './persianDate'

export const UPPER_PERIO_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
export const LOWER_PERIO_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export interface AAPClassification {
  stage: 'Health' | 'Gingivitis' | 'Stage I' | 'Stage II' | 'Stage III' | 'Stage IV'
  stageLabel: string
  stageDescription: string
  extent: 'Localized' | 'Generalized'
  extentLabel: string
  grade: 'Grade A' | 'Grade B' | 'Grade C'
  gradeLabel: string
  gradeDescription: string
  riskModifiers: string[]
  treatmentProtocols: string[]
}

export interface PerioStatistics {
  totalTeethExamined: number
  totalSites: number
  deepPocketsCount: number // PD >= 4 mm
  deepPocketsPercentage: number
  severePocketsCount: number // PD >= 6 mm
  severePocketsPercentage: number
  bopCount: number // Bleeding on probing
  bopPercentage: number
  suppurationCount: number
  furcationCount: number
  mobilityCount: number
  diagnosisGrade: {
    title: string
    color: 'success' | 'warning' | 'error' | 'accent'
    description: string
  }
  aapClassification: AAPClassification
}

export function createEmptyPerioToothData(toothNumber: number): PerioToothData {
  const emptySite = (): PerioSiteData => ({ pd: 2, bop: false, suppuration: false, gm: 0, cal: 2 })
  return {
    tooth_number: toothNumber,
    db: emptySite(),
    b: emptySite(),
    mb: emptySite(),
    dl: emptySite(),
    l: emptySite(),
    ml: emptySite(),
    mobility: 0,
    furcation: 0,
  }
}

export function computeCAL(pd: number, gm: number): number {
  return Math.max(0, pd + (gm || 0))
}

export function calculatePerioStatistics(
  teethData: Record<number, PerioToothData>,
  patient?: Partial<Patient> | null,
): PerioStatistics {
  const teeth = Object.values(teethData)
  let totalSites = 0
  let deepPocketsCount = 0
  let severePocketsCount = 0
  let bopCount = 0
  let suppurationCount = 0
  let furcationCount = 0
  let mobilityCount = 0
  let maxPD = 0
  let maxCAL = 0
  let maxMobility = 0
  let maxFurcation = 0
  let affectedTeethCount = 0

  for (const t of teeth) {
    let toothHasDeepPocket = false
    if (t.mobility && t.mobility > 0) {
      mobilityCount++
      if (t.mobility > maxMobility) maxMobility = t.mobility
    }
    if (t.furcation && t.furcation > 0) {
      furcationCount++
      if (t.furcation > maxFurcation) maxFurcation = t.furcation
    }

    const sites: PerioSiteData[] = [t.db, t.b, t.mb, t.dl, t.l, t.ml]
    for (const s of sites) {
      if (!s) continue
      totalSites++
      const pd = s.pd || 0
      const cal = computeCAL(pd, s.gm || 0)
      if (pd > maxPD) maxPD = pd
      if (cal > maxCAL) maxCAL = cal

      if (pd >= 4) {
        deepPocketsCount++
        toothHasDeepPocket = true
      }
      if (pd >= 6) severePocketsCount++
      if (s.bop) bopCount++
      if (s.suppuration) suppurationCount++
    }
    if (toothHasDeepPocket) affectedTeethCount++
  }

  const deepPocketsPercentage = totalSites > 0 ? Math.round((deepPocketsCount / totalSites) * 100) : 0
  const severePocketsPercentage = totalSites > 0 ? Math.round((severePocketsCount / totalSites) * 100) : 0
  const bopPercentage = totalSites > 0 ? Math.round((bopCount / totalSites) * 100) : 0

  // ── Backward-compatible diagnosisGrade ──
  let diagnosisGrade: PerioStatistics['diagnosisGrade'] = {
    title: 'سلامت پریودنتال (Periodontal Health)',
    color: 'success',
    description: 'عمق پروبینگ در محدوده طبیعی (۱ تا ۳ میلی‌متر) و شاخص خونریزی کمتر از ۱۰٪.',
  }

  if (bopPercentage >= 10 && deepPocketsCount === 0) {
    diagnosisGrade = {
      title: 'ژنژیویت ناشی از پلاک دندانی (Gingivitis)',
      color: 'warning',
      description: 'خونریزی حین پروبینگ بیش از ۱۰٪ بدون تشکیل پاکت استخوانی (نیاز به جرم‌گیری و آموزش بهداشت).',
    }
  } else if (severePocketsCount > 0 || deepPocketsPercentage >= 30) {
    diagnosisGrade = {
      title: 'پریودنتیت پیشرفته (Stage III/IV Severe Periodontitis)',
      color: 'error',
      description: 'وجود پاکت‌های عمیق (≥۶mm) یا درگیری بیش از ۳۰٪ سطوح دهان (نیاز به جراحی فلپ لثه و درمان تخصصی).',
    }
  } else if (deepPocketsCount > 0) {
    diagnosisGrade = {
      title: 'پریودنتیت خفیف تا متوسط (Stage I/II Periodontitis)',
      color: 'accent',
      description: 'پاکت‌های پریودنتال ۴ تا ۵ میلی‌متری (نیاز به روت پلنینگ SRP و فالوآپ ۳ ماهه).',
    }
  }

  // ── 2018 AAP / EFP World Workshop Classification ──
  let stage: AAPClassification['stage'] = 'Health'
  let stageLabel = 'سلامت بافت پریودنتال'
  let stageDescription = 'بدون از دست رفتن اتصال بالینی (CAL)، عمق پروبینگ کمتر از ۴mm و عدم وجود خونریزی فعال.'

  if (deepPocketsCount === 0 && severePocketsCount === 0) {
    if (bopPercentage >= 10) {
      stage = 'Gingivitis'
      stageLabel = 'ژنژیویت ناشی از پلاک بیوفیلم (Gingivitis)'
      stageDescription = 'التهاب موضعی یا منتشر لثه بدون تخریب استخوان نگهدارنده یا اتصالات پریودنتال.'
    }
  } else {
    // Staging based on CAL / Probing Depth / Tooth mobility / Furcation
    if (maxMobility >= 2 || (maxFurcation >= 2 && maxPD >= 6)) {
      stage = 'Stage IV'
      stageLabel = 'استیج ۴: پریودنتیت بسیار پیشرفته (Stage IV)'
      stageDescription = 'تخریب شدید پریودنتال با لقی دندانی و خطر به هم ریختگی یا از دست رفتن کل فانکشن قوس دندانی.'
    } else if (maxPD >= 6 || maxCAL >= 5 || maxFurcation >= 2 || severePocketsCount > 0) {
      stage = 'Stage III'
      stageLabel = 'استیج ۳: پریودنتیت شدید (Stage III)'
      stageDescription = 'پاکت‌های عمیق استخوانی (≥۶mm) و خطر از دست رفتن دندان‌های درگیر در صورت عدم مداخله تخصصی.'
    } else if (maxPD === 5 || maxCAL >= 3) {
      stage = 'Stage II'
      stageLabel = 'استیج ۲: پریودنتیت متوسط (Stage II)'
      stageDescription = 'تخریب افقی استخوان تا یک‌سوم میانی ریشه با پاکت‌های ۵ میلی‌متری.'
    } else {
      stage = 'Stage I'
      stageLabel = 'استیج ۱: پریودنتیت اولیه (Stage I)'
      stageDescription = 'تخریب استخوانی خفیف با پاکت‌های ۴ میلی‌متری و CAL حدود ۱ تا ۲ میلی‌متر.'
    }
  }

  // Extent: Localized vs. Generalized (Threshold: 30% of examined teeth)
  const teethRatio = teeth.length > 0 ? affectedTeethCount / teeth.length : 0
  const extent: AAPClassification['extent'] = teethRatio >= 0.3 ? 'Generalized' : 'Localized'
  const extentLabel =
    extent === 'Generalized'
      ? `منتشر (Generalized — درگیری ${toPersianDigits(Math.round(teethRatio * 100))}٪ دندان‌ها)`
      : `موضعی (Localized — کمتر از ۳۰٪ دندان‌ها)`

  // Grade: Progression Rate & Systemic Risk Modifiers (Smoking & Diabetes)
  let grade: AAPClassification['grade'] = 'Grade B'
  let gradeLabel = 'گرید B: سرعت پیشرفت متوسط (Moderate Rate)'
  let gradeDescription = 'تخریب پریودنتال متناسب با رسوبات پلاک و بیوفیلم با پاسخ متوسط به درمان.'
  const riskModifiers: string[] = []

  // Check Patient Diabetes HbA1c
  if (patient?.diabetes_hba1c != null) {
    if (patient.diabetes_hba1c >= 7.0) {
      grade = 'Grade C'
      riskModifiers.push(`دیابت کنترل‌نشده با شاخص HbA1c: ${toPersianDigits(patient.diabetes_hba1c)}٪ (ریسک پیشرفت سریع)`)
    } else if (patient.diabetes_hba1c > 0) {
      riskModifiers.push(`دیابت کنترل‌شده با HbA1c: ${toPersianDigits(patient.diabetes_hba1c)}٪`)
    }
  }

  // Check Smoking in medical history or conditions
  const medText = `${patient?.medical_conditions || ''} ${patient?.medical_history || ''}`.toLowerCase()
  if (medText.includes('سیگار') || medText.includes('قلیان') || medText.includes('smok') || medText.includes('tobacco')) {
    grade = 'Grade C'
    riskModifiers.push('مصرف دخانیات / سیگار (کاهش خون‌رسانی مویرگی لثه و ارتقای ریسک به گرید C)')
  }

  if (grade === 'Grade C') {
    gradeLabel = 'گرید C: سرعت پیشرفت سریع و تهاجمی (Rapid Progression)'
    gradeDescription = 'وجود عوامل خطر سیستمیک (دیابت یا دخانیات) یا تخریب استخوانی نامتناسب با میزان پلاک.'
  } else if (stage === 'Stage I' && deepPocketsPercentage < 15 && riskModifiers.length === 0) {
    grade = 'Grade A'
    gradeLabel = 'گرید A: سرعت پیشرفت کند (Slow Rate)'
    gradeDescription = 'تخریب ناچیز در طول زمان با مقاومت بافتی بالا و بدون عوامل خطر سیستمیک.'
  }

  // Clinical Treatment Protocols
  const treatmentProtocols: string[] = []
  if (stage === 'Health') {
    treatmentProtocols.push('آموزش بهداشت دهان و دندان (OHI)', 'معاینه و بازبینی دوره‌ای ۶ ماهه')
  } else if (stage === 'Gingivitis') {
    treatmentProtocols.push(
      'جرم‌گیری کامل فک بالا و فک پایین (Ultrasonic Scaling)',
      'پالیشینگ دندان‌ها با بروساژ',
      'آموزش دقیق مسواک‌زدن Bass و نخ دندان روزانه',
      'ویزیت مجدد پس از ۳ الی ۴ هفته',
    )
  } else if (stage === 'Stage I' || stage === 'Stage II') {
    treatmentProtocols.push(
      'جرم‌گیری زیرلثه‌ای و روت پلنینگ ربع‌به‌ربع (SRP - Scaling & Root Planing)',
      'شستشوی پاکت‌ها با دهان‌شویه کلرهگزیدین ۰.۲٪',
      'اصلاح پُرکردگی‌های با لبه‌های گیردار (Overhang) و عوامل تجمع پلاک',
      'ارزیابی مجدد عمق پروبینگ پس از ۶ تا ۸ هفته',
      'نگهداری پریودنتال تخصصی (SPT) هر ۳ ماه یک‌بار',
    )
  } else {
    // Stage III & IV
    treatmentProtocols.push(
      'جرم‌گیری زیرلثه‌ای عمیق و تسطیح ریشه (Full Mouth SRP)',
      'درمان دارویی کمکی ضدمیکروبی سیستمیک یا موضعی',
      'جراحی فلپ پریودنتال دسترسی به ریشه (Access Flap Surgery)',
      'بازسازی هدایت‌شده بافت و استخوان (GTR/Bone Graft) در پاکت‌های عمودی',
      'اسپلینت موقت یا دائم دندان‌های دارای لقی درجه ۲ و ۳',
      'اصلاح پلان اکلوژن و تداخلات ترومای اکلوزال',
      'برنامه فالوآپ و مراقبت پریودنتال فشرده (۳ ماهه)',
    )
  }

  const aapClassification: AAPClassification = {
    stage,
    stageLabel,
    stageDescription,
    extent,
    extentLabel,
    grade,
    gradeLabel,
    gradeDescription,
    riskModifiers,
    treatmentProtocols,
  }

  return {
    totalTeethExamined: teeth.length,
    totalSites,
    deepPocketsCount,
    deepPocketsPercentage,
    severePocketsCount,
    severePocketsPercentage,
    bopCount,
    bopPercentage,
    suppurationCount,
    furcationCount,
    mobilityCount,
    diagnosisGrade,
    aapClassification,
  }
}
