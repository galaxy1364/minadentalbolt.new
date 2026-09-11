// periodontal.ts — Comprehensive 6-Point Periodontal Examination Logic & Analytics
// Standard 6-site probing: Distobuccal (DB), Midbuccal (B), Mesiobuccal (MB), Distolingual (DL), Midlingual (L), Mesiolingual (ML)

import { PerioExam, PerioToothData, PerioSiteData } from '../types'

export const UPPER_PERIO_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
export const LOWER_PERIO_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

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

export function calculatePerioStatistics(teethData: Record<number, PerioToothData>): PerioStatistics {
  const teeth = Object.values(teethData)
  let totalSites = 0
  let deepPocketsCount = 0
  let severePocketsCount = 0
  let bopCount = 0
  let suppurationCount = 0
  let furcationCount = 0
  let mobilityCount = 0

  for (const t of teeth) {
    if (t.mobility && t.mobility > 0) mobilityCount++
    if (t.furcation && t.furcation > 0) furcationCount++

    const sites: PerioSiteData[] = [t.db, t.b, t.mb, t.dl, t.l, t.ml]
    for (const s of sites) {
      if (!s) continue
      totalSites++
      const pd = s.pd || 0
      if (pd >= 4) deepPocketsCount++
      if (pd >= 6) severePocketsCount++
      if (s.bop) bopCount++
      if (s.suppuration) suppurationCount++
    }
  }

  const deepPocketsPercentage = totalSites > 0 ? Math.round((deepPocketsCount / totalSites) * 100) : 0
  const severePocketsPercentage = totalSites > 0 ? Math.round((severePocketsCount / totalSites) * 100) : 0
  const bopPercentage = totalSites > 0 ? Math.round((bopCount / totalSites) * 100) : 0

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
  }
}
