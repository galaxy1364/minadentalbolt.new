// src/lib/appointmentColorMap.ts — Visual specialty taxonomy & smart duration estimates for appointments

export interface SpecialtyVisualInfo {
  key: string
  label: string
  badgeClass: string
  accentColor: string
  borderClass: string
  defaultDurationMin: number
}

export const SPECIALTY_VISUAL_MAP: Record<string, SpecialtyVisualInfo> = {
  surgery: {
    key: 'surgery',
    label: 'جراحی و کشیدن',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
    accentColor: '#f43f5e',
    borderClass: 'border-l-4 border-l-rose-500',
    defaultDurationMin: 45,
  },
  endo: {
    key: 'endo',
    label: 'درمان ریشه (عصب‌کشی)',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60',
    accentColor: '#a855f7',
    borderClass: 'border-l-4 border-l-purple-500',
    defaultDurationMin: 60,
  },
  implant: {
    key: 'implant',
    label: 'ایمپلنت و جراحی فک',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
    accentColor: '#10b981',
    borderClass: 'border-l-4 border-l-emerald-500',
    defaultDurationMin: 60,
  },
  restorative: {
    key: 'restorative',
    label: 'ترمیم و زیبایی',
    badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60',
    accentColor: '#0284c7',
    borderClass: 'border-l-4 border-l-sky-500',
    defaultDurationMin: 45,
  },
  ortho: {
    key: 'ortho',
    label: 'ارتودنسی',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
    accentColor: '#6366f1',
    borderClass: 'border-l-4 border-l-indigo-500',
    defaultDurationMin: 30,
  },
  perio: {
    key: 'perio',
    label: 'پریودنتال و لثه',
    badgeClass: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60',
    accentColor: '#0d9488',
    borderClass: 'border-l-4 border-l-teal-500',
    defaultDurationMin: 45,
  },
  prostho: {
    key: 'prostho',
    label: 'پروتز و روکش',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
    accentColor: '#f59e0b',
    borderClass: 'border-l-4 border-l-amber-500',
    defaultDurationMin: 45,
  },
  pediatric: {
    key: 'pediatric',
    label: 'دندانپزشکی اطفال',
    badgeClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/60',
    accentColor: '#f97316',
    borderClass: 'border-l-4 border-l-orange-500',
    defaultDurationMin: 30,
  },
  exam: {
    key: 'exam',
    label: 'معاینه و چکاپ',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60',
    accentColor: '#64748b',
    borderClass: 'border-l-4 border-l-slate-400',
    defaultDurationMin: 20,
  },
}

/**
 * Detect specialty from appointment type or notes or procedure title
 */
export function detectSpecialty(text?: string | null): SpecialtyVisualInfo {
  if (!text) return SPECIALTY_VISUAL_MAP.exam

  const norm = text.toLowerCase().trim()

  if (/جراحی|کشیدن|عقل|اکسترکشن|surgery|extract/i.test(norm)) return SPECIALTY_VISUAL_MAP.surgery
  if (/عصب|اندو|ریشه|root|endo|پالپ/i.test(norm)) return SPECIALTY_VISUAL_MAP.endo
  if (/ایمپلنت|کاشت|پروتز ثابت|implant|پیچ/i.test(norm)) return SPECIALTY_VISUAL_MAP.implant
  if (/ارتو|سیم|براکت|ortho/i.test(norm)) return SPECIALTY_VISUAL_MAP.ortho
  if (/پریو|لثه|جرمگیری|بروساژ|کورتاژ|perio|scaling/i.test(norm)) return SPECIALTY_VISUAL_MAP.perio
  if (/ترمیم|کامپوزیت|لمینت|ونیر|پرکردن|بیلداپ|restor|composite/i.test(norm)) return SPECIALTY_VISUAL_MAP.restorative
  if (/روکش|قالب|پروتز|کرون|crown|bridge|prostho/i.test(norm)) return SPECIALTY_VISUAL_MAP.prostho
  if (/کودک|اطفال|شیری|pedo/i.test(norm)) return SPECIALTY_VISUAL_MAP.pediatric

  return SPECIALTY_VISUAL_MAP.exam
}

export const CANCELLATION_REASONS = [
  { id: 'patient_illness', label: 'بیماری یا کسالت بیمار' },
  { id: 'patient_schedule', label: 'تداخل برنامه کاری/شخصی بیمار' },
  { id: 'doctor_unavailable', label: 'عدم حضور یا مرخصی پزشک' },
  { id: 'financial_delay', label: 'مسائل مالی و تعویق درمان' },
  { id: 'weather_emergency', label: 'شرایط جوی نامساعد یا ترافیک شدید' },
  { id: 'rescheduled_request', label: 'درخواست جابجایی به زمان دیگر' },
  { id: 'no_answer', label: 'عدم پاسخگویی در تماس یادآوری' },
  { id: 'other', label: 'سایر موارد' },
] as const
