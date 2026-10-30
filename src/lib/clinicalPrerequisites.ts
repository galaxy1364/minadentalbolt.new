/**
 * clinicalPrerequisites.ts — موتور اعتبارسنجی پیش‌نیازهای بالینی دندانپزشکی
 *
 * انطباق با الزامات ADA CDT، ITI Dental Implantology و راهنماهای بالینی:
 * ۱. منع یا هشدار تحویل روکش (Crown) قبل از اتمام عصب‌کشی (Endodontics) یا بیلداپ (Core Buildup).
 * ۲. منع قراردهی پست داخل کانال (Post & Core) قبل از اتمام عصب‌کشی و آبچوریشن کامل ریشه.
 * ۳. منع تحویل یا قالب‌گیری روکش ایمپلنت قبل از جراحی موفق کاشت فیکسچر (Fixture Placement).
 * ۴. هشدار درمان‌های زیبایی (Veneer / Bleaching) قبل از کنترل پوسیدگی‌ها و جرم‌گیری لثه.
 *
 * امکان ثبت تایید پزشک (Clinical Override) با ثبت علت پزشکی در پرونده وجود دارد.
 */

import type { Treatment } from '../types'

export type PrerequisiteSeverity = 'none' | 'info' | 'warning' | 'error'

export interface PrerequisiteEvaluation {
  allowed: boolean
  severity: PrerequisiteSeverity
  ruleId: string | null
  ruleTitle: string | null
  message: string | null
  missingStep: string | null
  recommendation: string | null
  canOverride: boolean
}

// کلمات کلیدی برای تشخیص انواع رویه‌ها
const ENDO_KEYWORDS = ['عصب‌کشی', 'عصب کشی', 'درمان ریشه', 'اندو', 'endo', 'pulpectomy', 'پالپکتومی', 'rct', 'روت کانال']
const POST_KEYWORDS = ['پست و کور', 'پست', 'فایبرپست', 'فایبر پست', 'post & core', 'post and core', 'fiber post', 'cast post']
const CROWN_KEYWORDS = ['روکش', 'crown', 'بریج', 'bridge', 'پروتز ثابت', 'روکش تمام سرامیک', 'زیرکونیا', 'pfm', 'اینله', 'انله']
const IMPLANT_SURGERY_KEYWORDS = ['کاشت ایمپلنت', 'جراحی ایمپلنت', 'فیکسچر', 'fixture', 'implant placement', 'کاشت دندان']
const IMPLANT_PROSTHO_KEYWORDS = ['روکش ایمپلنت', 'پروتز ایمپلنت', 'اباتمنت', 'abutment', 'تحویل روکش ایمپلنت', 'implant crown']
const AESTHETIC_KEYWORDS = ['بلیچینگ', 'bleaching', 'ونیر', 'کامپوزیت ونیر', 'لمینت', 'laminate', 'veneer']
const PERIO_CLEANING_KEYWORDS = ['جرم‌گیری', 'جرم گیری', 'بروساژ', 'scaling', 'srp', 'کورتاژ']

function matchesKeywords(text: string | null | undefined, keywords: string[]): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw.toLowerCase()))
}

export function isEndoProcedure(nameOrCode?: string | null): boolean {
  return matchesKeywords(nameOrCode, ENDO_KEYWORDS)
}

export function isPostProcedure(nameOrCode?: string | null): boolean {
  return matchesKeywords(nameOrCode, POST_KEYWORDS)
}

export function isCrownProcedure(nameOrCode?: string | null): boolean {
  return matchesKeywords(nameOrCode, CROWN_KEYWORDS) && !matchesKeywords(nameOrCode, ['ایمپلنت', 'implant'])
}

export function isImplantSurgery(nameOrCode?: string | null): boolean {
  return matchesKeywords(nameOrCode, IMPLANT_SURGERY_KEYWORDS)
}

export function isImplantProstho(nameOrCode?: string | null): boolean {
  return matchesKeywords(nameOrCode, IMPLANT_PROSTHO_KEYWORDS)
}

export function isAestheticProcedure(nameOrCode?: string | null): boolean {
  return matchesKeywords(nameOrCode, AESTHETIC_KEYWORDS)
}

export function isPerioCleaning(nameOrCode?: string | null): boolean {
  return matchesKeywords(nameOrCode, PERIO_CLEANING_KEYWORDS)
}

/**
 * بررسی سوابق درمان‌های فعال روی یک دندان خاص
 */
export function getToothTreatments(
  toothNumber: string | null | undefined,
  allTreatments: Treatment[],
): Treatment[] {
  if (!toothNumber || !toothNumber.trim()) return []
  const target = toothNumber.trim()
  return allTreatments.filter(
    (t) => t.status !== 'cancelled' && t.tooth_number?.trim() === target,
  )
}

/**
 * اعتبارسنجی پیش‌نیازهای بالینی هنگام ثبت یا پیشبرد وضعیت یک درمان
 */
export function evaluateClinicalPrerequisites(
  target: Partial<Treatment>,
  allPatientTreatments: Treatment[],
): PrerequisiteEvaluation {
  const tooth = target.tooth_number?.trim()
  const procName = target.procedure_name || target.description || ''
  const targetId = target.id

  // اگر درمان قبلاً توسط پزشک تایید استثناء شده باشد (Override)
  if (target.prerequisite_override) {
    return {
      allowed: true,
      severity: 'info',
      ruleId: 'OVERRIDDEN',
      ruleTitle: 'استثناء بالینی تأیید شده',
      message: `این درمان با تأیید پزشک ثبت شده است${target.prerequisite_override_reason ? `: ${target.prerequisite_override_reason}` : ''}`,
      missingStep: null,
      recommendation: null,
      canOverride: true,
    }
  }

  // درمان‌های روی همان دندان
  const toothTreatments = tooth
    ? allPatientTreatments.filter((t) => t.id !== targetId && t.status !== 'cancelled' && t.tooth_number?.trim() === tooth)
    : []

  // ── قانون ۱: پست و کور (Post & Core) قبل از اتمام عصب‌کشی ──
  if (isPostProcedure(procName)) {
    if (tooth) {
      const completedEndo = toothTreatments.find((t) => isEndoProcedure(t.procedure_name) && t.status === 'completed')
      if (!completedEndo) {
        const pendingEndo = toothTreatments.find((t) => isEndoProcedure(t.procedure_name))
        return {
          allowed: false,
          severity: 'error',
          ruleId: 'PREREQ-POST-REQUIRES-ENDO',
          ruleTitle: 'ضرورت اتمام درمان ریشه قبل از پست و کور',
          message: pendingEndo
            ? `عصب‌کشی دندان ${tooth} هنوز تکمیل نشده است (وضعیت فعلی: ${pendingEndo.status === 'in_progress' ? 'در حال انجام' : 'برنامه‌ریزی‌شده'}).`
            : `هیچ سابقه عصب‌کشی تکمیل‌شده‌ای برای دندان ${tooth} ثبت نشده است. قراردهی پست نیازمند آماده‌سازی و آبچوریشن کانال ریشه است.`,
          missingStep: `تکمیل عصب‌کشی دندان ${tooth}`,
          recommendation: 'ابتدا عصب‌کشی دندان را تکمیل کرده و پس از آبچوریشن کامل، اقدام به کارگذاری پست و کور نمایید.',
          canOverride: true,
        }
      }
    }
  }

  // ── قانون ۲: روکش دندان (Crown) قبل از عصب‌کشی یا بیلداپ در صورت وجود سابقه عصب‌کشی ──
  if (isCrownProcedure(procName)) {
    if (tooth) {
      // آیا برای این دندان عصب‌کشی تعریف شده ولی هنوز تمام نشده؟
      const pendingEndo = toothTreatments.find(
        (t) => isEndoProcedure(t.procedure_name) && t.status !== 'completed',
      )
      if (pendingEndo) {
        return {
          allowed: false,
          severity: 'error',
          ruleId: 'PREREQ-CROWN-PENDING-ENDO',
          ruleTitle: 'منع تحویل روکش قبل از اتمام عصب‌کشی',
          message: `دندان ${tooth} دارای رویه عصب‌کشی ناتمام است. تحویل یا تراش نهایی روکش قبل از تکمیل درمان ریشه مجاز نیست.`,
          missingStep: `تکمیل عصب‌کشی دندان ${tooth}`,
          recommendation: 'قبل از آماده‌سازی و چسباندن نهایی روکش، درمان ریشه را به وضعیت تکمیل‌شده تغییر دهید.',
          canOverride: true,
        }
      }

      // اگر عصب‌کشی تمام شده، آیا بیلداپ/پست ثبت شده است؟
      const completedEndo = toothTreatments.find(
        (t) => isEndoProcedure(t.procedure_name) && t.status === 'completed',
      )
      const hasBuildup = toothTreatments.some(
        (t) => (isPostProcedure(t.procedure_name) || matchesKeywords(t.procedure_name, ['بیلداپ', 'buildup', 'ترمیم تاج'])) && t.status === 'completed',
      )

      if (completedEndo && !hasBuildup) {
        return {
          allowed: true, // هشدار بالینی می‌دهد اما مسدود کامل نمی‌کند
          severity: 'warning',
          ruleId: 'PREREQ-CROWN-NEEDS-BUILDUP',
          ruleTitle: 'پیشنهاد بازسازی تاج قبل از روکش',
          message: `برای دندان عصب‌کشی‌شده ${tooth}، هنوز بیلداپ تاج یا پست و کور ثبت نشده است.`,
          missingStep: `بیلداپ یا پست و کور دندان ${tooth}`,
          recommendation: 'جهت جلوگیری از شکستگی دندان تحت فشار اکلوژن، بازسازی تاج (Core Buildup) توصیه می‌شود.',
          canOverride: true,
        }
      }
    }
  }

  // ── قانون ۳: پروتز و روکش ایمپلنت (Implant Prosthetics) قبل از جراحی کاشت فیکسچر ──
  if (isImplantProstho(procName)) {
    if (tooth) {
      const completedSurgery = toothTreatments.find(
        (t) => isImplantSurgery(t.procedure_name) && t.status === 'completed',
      )
      if (!completedSurgery) {
        const pendingSurgery = toothTreatments.find((t) => isImplantSurgery(t.procedure_name))
        return {
          allowed: false,
          severity: 'error',
          ruleId: 'PREREQ-IMPLANT-PROSTHO-REQUIRES-SURGERY',
          ruleTitle: 'ضرورت کاشت فیکسچر قبل از پروتز ایمپلنت',
          message: pendingSurgery
            ? `جراحی فیکسچر ایمپلنت دندان ${tooth} هنوز تکمیل نشده است.`
            : `هیچ سابقه جراحی فیکسچر ایمپلنتی برای دندان ${tooth} یافت نشد.`,
          missingStep: `کاشت فیکسچر ایمپلنت دندان ${tooth}`,
          recommendation: 'پروتز و اباتمنت ایمپلنت تنها پس از جراحی کاشت فیکسچر و طی دوره استئواینتگریشن قابل اجراست.',
          canOverride: true,
        }
      }
    }
  }

  // ── قانون ۴: درمان‌های زیبایی در حضور پوسیدگی‌های شدید یا عدم بهداشت دهان ──
  if (isAestheticProcedure(procName)) {
    const hasActiveDecay = allPatientTreatments.some(
      (t) => t.status !== 'cancelled' && t.status !== 'completed' && matchesKeywords(t.procedure_name, ['پوسیدگی', 'عمیق', 'آبسه', 'اورژانس']),
    )
    if (hasActiveDecay) {
      return {
        allowed: true,
        severity: 'warning',
        ruleId: 'PREREQ-AESTHETIC-ACTIVE-DISEASE',
        ruleTitle: 'اولویت درمان‌های درمانی قبل از زیبایی',
        message: 'بیمار دارای پوسیدگی فعال یا درمان اورژانسی ناتمام است.',
        missingStep: 'تکمیل درمان‌های تسکینی و پوسیدگی‌های فعال',
        recommendation: 'بر اساس استانداردهای اخلاق پزشکی و بالینی، درمان‌های درمانی و تسکین درد بر درمان‌های صرفاً زیبایی مقدم هستند.',
        canOverride: true,
      }
    }
  }

  // همه پیش‌نیازها رعایت شده‌اند
  return {
    allowed: true,
    severity: 'none',
    ruleId: null,
    ruleTitle: null,
    message: null,
    missingStep: null,
    recommendation: null,
    canOverride: true,
  }
}
