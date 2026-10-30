// drugSafety.ts — Dental Drug Safety, Allergy & Contraindication Engine
// Cross-references patient allergies and medical conditions against dental prescriptions

export interface DrugAlert {
  id: string
  severity: 'high' | 'medium' | 'low'
  drugName: string
  matchedTerm: string
  title: string
  description: string
  alternativeSuggestion?: string
}

export interface PediatricDosageCalc {
  drug: 'amoxicillin' | 'ibuprofen' | 'acetaminophen'
  weightKg: number
  recommendedSingleDoseMg: number
  dailyFrequency: string
  maxDailyMg: number
  suspensionNote?: string
}

// Common dental allergy cross-reactions
const ALLERGY_RULES: Array<{
  keywords: string[]
  drugPatterns: string[]
  title: string
  description: string
  alternative: string
}> = [
  {
    keywords: ['پنی‌سیلین', 'پنیسیلین', 'penicillin', 'آمپی‌سیلین', 'آمپی سیلین'],
    drugPatterns: ['آموکسی', 'کلاو', 'کوآموکسی', 'پنی‌سیلین', 'پنیسیلین', 'آمپی‌سیلین', 'سفالکسین', 'سفیکسیم', 'سفازولین'],
    title: 'خطر آنافیلاکسی: حساسیت به مشتقات پنی‌سیلین',
    description: 'بیمار دارای سابقه حساسیت به پنی‌سیلین است. تجویز بتالاکتام‌ها (آموکسی‌سیلین و سفالوسپورین‌ها) می‌تواند شوک آنافیلاکسی ایجاد کند.',
    alternative: 'کلیندامایسین (۳۰۰mg) یا آزیترومایسین (۵۰۰mg) یا اریترومایسین',
  },
  {
    keywords: ['آسپرین', 'aspirin', 'nsaid', 'بروفن', 'ژلوفن'],
    drugPatterns: ['ایبوپروفن', 'ژلوفن', 'مفنامیک', 'ناپروکسن', 'دیکلوفناک', 'ملوکسیکام', 'آسپرین', 'کتورولاک', 'ایندومتاسین'],
    title: 'حساسیت به ضدالتهاب‌های غیراستروئیدی (NSAIDs)',
    description: 'بیمار به آسپرین یا NSAIDها حساسیت دارد. مصرف این داروها ممکن است باعث برونکواسپاسم شدید یا راش جلدی شود.',
    alternative: 'استامینوفن ساده یا استامینوفن کدئین',
  },
  {
    keywords: ['سولفا', 'کوتریموکسازول', 'sulfa'],
    drugPatterns: ['سولفا', 'کوتریموکسازول', 'سلکوکسیب'],
    title: 'حساسیت به داروهای حاوی سولفونامید',
    description: 'بیمار سابقه حساسیت به سولفا دارد. سلکوکسیب و کوتریموکسازول کنترااندیکه هستند.',
    alternative: 'سایر مسکن‌های غیرسولفایی',
  },
  {
    keywords: ['کدئین', 'codeine', 'مرفین', 'ترپین'],
    drugPatterns: ['کدئین', 'ترامادول', 'اکسی‌کدون', 'مرفین'],
    title: 'حساسیت به اپیوئیدها و مشتقات تریاک',
    description: 'بیمار به کدئین یا اپیوئیدها حساسیت دارد. داروهای مسکن ترکیبی دارای کدئین ممنوع است.',
    alternative: 'ایبوپروفن یا استامینوفن ساده',
  },
  {
    keywords: ['مترونیدازول', 'metronidazole'],
    drugPatterns: ['مترونیدازول'],
    title: 'حساسیت به مترونیدازول',
    description: 'سابقه عدم تحمل یا آلرژی به ترکیبات ایمیدازول.',
    alternative: 'آموکسی‌سیلین یا کلیندامایسین',
  },
]

// Systemic condition contraindications
const CONDITION_RULES: Array<{
  conditionKeywords: string[]
  drugPatterns: string[]
  title: string
  description: string
  alternative: string
  severity: 'high' | 'medium'
}> = [
  {
    conditionKeywords: ['زخم معده', 'خونریزی گوارشی', 'گاستریت', 'ulcer', 'peptic'],
    drugPatterns: ['ایبوپروفن', 'ژلوفن', 'آسپرین', 'ناپروکسن', 'مفنامیک', 'کتورولاک', 'دیکلوفناک'],
    title: 'کنترااندیکاسیون NSAID: سابقه زخم یا خونریزی معده',
    description: 'داروهای NSAID سد مخاطی معده را تضعیف کرده و احتمال عود خونریزی گوارشی حاد را به شدت بالا می‌برند.',
    alternative: 'استامینوفن (حداکثر ۳ تا ۴ گرم در روز) + محافظ معده مانند پنتوپرازول در صورت نیاز ضروری',
    severity: 'high',
  },
  {
    conditionKeywords: ['آسم', 'تنگی نفس', 'asthma'],
    drugPatterns: ['ایبوپروفن', 'ژلوفن', 'آسپرین', 'ناپروکسن', 'مفنامیک اسید'],
    title: 'احتیاط: آسم ناشی از آسپرین و ضدالتهاب‌ها (Triad Asthma)',
    description: 'در بیماران مبتلا به آسم، NSAIDها می‌توانند باعث اسپاسم حاد مجاری هوایی شوند.',
    alternative: 'استامینوفن ساده ترجیح داده می‌شود.',
    severity: 'medium',
  },
  {
    conditionKeywords: ['فشار خون', 'فشارخون', 'hypertension', 'قلب', 'نارسایی قلبی', 'ایسکمیک'],
    drugPatterns: ['اپی‌نفرین', 'آدرنالین', 'نوراپینفرین'],
    title: 'کنترااندیکاسیون وازوکانستریکتور: بیماری قلبی / هایپرتنشن کنترل‌نشده',
    description: 'در بی‌حسی موضعی باید از داروی بدون آدرنالین (مانند مپیواکائین ۳٪ یا پریلوکائین) استفاده شود.',
    alternative: 'مپیواکائین بدون اپی‌نفرین (Mepivacaine 3% plain)',
    severity: 'high',
  },
  {
    conditionKeywords: ['بارداری', 'حامله', 'pregnancy', 'حاملگی'],
    drugPatterns: ['دگزامتازون', 'بتامتازون', 'سیپروفلوکساسین', 'داکسی‌سایکلین', 'تتراسایکلین', 'مترونیدازول'],
    title: 'احتیاط دوران بارداری: تراتوژنیسیته دارویی',
    description: 'تتراسایکلین‌ها باعث تغییر رنگ دائمی دندان‌های جنین و هیپوپلازی مینا می‌شوند. فلوروکینولون‌ها غضروف مفاصل را آسیب می‌زنند.',
    alternative: 'آموکسی‌سیلین و استامینوفن در گروه B مجاز هستند.',
    severity: 'high',
  },
  {
    conditionKeywords: ['فاویسم', 'g6pd', 'فاویسمی'],
    drugPatterns: ['آسپرین', 'کوتریموکسازول', 'سولفونامید', 'پریلوکائین'],
    title: 'خطر همولیز حاد: کمبود آنزیم G6PD (فاویسم)',
    description: 'مصرف داروهای اکسیدان می‌تواند باعث تخریب گلبول‌های قرمز و زردی و کم‌خونی همولیتیک حاد شود.',
    alternative: 'استامینوفن یا ایبوپروفن و آنتی‌بیوتیک‌های پنی‌سیلینی بدون خطر هستند.',
    severity: 'high',
  },
  {
    conditionKeywords: ['دیابت', 'قند خون', 'diabetes'],
    drugPatterns: ['دگزامتازون', 'بتامتازون', 'پردنیزولون', 'هیدروکورتیزون'],
    title: 'هشدار هایپرگلیسمی: کورتیکواستروئیدها در دیابت',
    description: 'کورتون‌ها سطح قند خون را شدیداً افزایش داده و کنترل دیابت را برهم می‌زنند و التیام زخم را به تاخیر می‌اندازند.',
    alternative: 'استفاده از داروهای ضدالتهاب غیرکورتونی و نظارت بر قند خون',
    severity: 'medium',
  },
]

/**
 * Checks a prescription text or drug list against the patient's recorded allergies and medical conditions
 */
export function checkDrugInteractions(params: {
  allergies?: string | null
  medicalConditions?: string | null
  medicationsText: string
}): DrugAlert[] {
  const alerts: DrugAlert[] = []
  const text = (params.medicationsText || '').toLowerCase()
  const allergies = (params.allergies || '').toLowerCase()
  const conditions = (params.medicalConditions || '').toLowerCase()

  if (!text.trim()) return alerts

  // 1. Check Allergies
  if (allergies.trim()) {
    for (const rule of ALLERGY_RULES) {
      const matchAllergy = rule.keywords.some((kw) => allergies.includes(kw.toLowerCase()))
      if (matchAllergy) {
        for (const drugPat of rule.drugPatterns) {
          if (text.includes(drugPat.toLowerCase())) {
            alerts.push({
              id: `allergy-${drugPat}-${Date.now()}`,
              severity: 'high',
              drugName: drugPat,
              matchedTerm: allergies,
              title: rule.title,
              description: rule.description,
              alternativeSuggestion: rule.alternative,
            })
            break
          }
        }
      }
    }
  }

  // 2. Check Conditions
  if (conditions.trim()) {
    for (const rule of CONDITION_RULES) {
      const matchCondition = rule.conditionKeywords.some((kw) => conditions.includes(kw.toLowerCase()))
      if (matchCondition) {
        for (const drugPat of rule.drugPatterns) {
          if (text.includes(drugPat.toLowerCase())) {
            alerts.push({
              id: `cond-${drugPat}-${Date.now()}`,
              severity: rule.severity,
              drugName: drugPat,
              matchedTerm: conditions,
              title: rule.title,
              description: rule.description,
              alternativeSuggestion: rule.alternative,
            })
            break
          }
        }
      }
    }
  }

  return alerts
}

/**
 * Pediatric Dosage Calculator for Dental Practice
 * Standard dental antibiotic and analgesic regimens for children
 */
export function calculatePediatricDosage(
  drug: 'amoxicillin' | 'ibuprofen' | 'acetaminophen',
  weightKg: number
): PediatricDosageCalc {
  const safeWeight = Math.max(3, Math.min(60, weightKg))

  if (drug === 'amoxicillin') {
    // Standard dental infection: 40-50 mg/kg/day divided in 3 doses (every 8 hours)
    const singleDoseMg = Math.round((safeWeight * 45) / 3)
    return {
      drug,
      weightKg: safeWeight,
      recommendedSingleDoseMg: singleDoseMg,
      dailyFrequency: 'هر ۸ ساعت (۳ بار در روز) به مدت ۵ الی ۷ روز',
      maxDailyMg: Math.min(1500, Math.round(safeWeight * 50)),
      suspensionNote: singleDoseMg <= 250
        ? `شربت ۱۲۵mg/5ml: حدود ${Math.round((singleDoseMg / 125) * 5)} سی‌سی هر ۸ ساعت`
        : `شربت ۲۵۰mg/5ml: حدود ${Math.round((singleDoseMg / 250) * 5)} سی‌سی هر ۸ ساعت`,
    }
  }

  if (drug === 'ibuprofen') {
    // 5-10 mg/kg per dose, every 6-8 hours (max 40 mg/kg/day)
    const singleDoseMg = Math.round(safeWeight * 8)
    return {
      drug,
      weightKg: safeWeight,
      recommendedSingleDoseMg: singleDoseMg,
      dailyFrequency: 'هر ۶ تا ۸ ساعت در صورت درد و تب (همراه با غذا یا شیر)',
      maxDailyMg: Math.min(1200, Math.round(safeWeight * 30)),
      suspensionNote: `شربت ایبوپروفن ۱۰۰mg/5ml: حدود ${Math.round((singleDoseMg / 100) * 5)} سی‌سی هر ۶-۸ ساعت`,
    }
  }

  // Acetaminophen: 10-15 mg/kg per dose, every 4-6 hours (max 60 mg/kg/day)
  const singleDoseMg = Math.round(safeWeight * 12.5)
  return {
    drug: 'acetaminophen',
    weightKg: safeWeight,
    recommendedSingleDoseMg: singleDoseMg,
    dailyFrequency: 'هر ۴ تا ۶ ساعت در صورت درد و تب',
    maxDailyMg: Math.min(2000, Math.round(safeWeight * 60)),
    suspensionNote: singleDoseMg <= 160
      ? `شربت ۱۲۰mg/5ml: حدود ${Math.round((singleDoseMg / 120) * 5)} سی‌سی هر ۶ ساعت`
      : `قطره یا سوسپانسیون غلیظ بر اساس دستور`,
  }
}
