/**
 * MOD-FEAT-021 | ترتیب چارت‌محور در ثبت درمان
 *
 * گزارش مهدی: «اول جای چارت و رویه و روند درست تغییر بده. بعد انتخاب هر
 * دندان و سطح، دیگه بابت اون دندان دوباره پرسش نشود.»
 *
 * Two separate faults, one shared cause.
 *
 * ORDER — the wizard asked for the procedure first and the tooth second.
 * That is backwards from how the work actually happens: the dentist is
 * looking at a tooth and then decides what to do about it. Asking for
 * «بیلدآپ» before «which tooth» forces the clinician to hold the answer
 * in their head while they answer a question that depends on it.
 *
 * REPETITION — tapping a tooth on the chart already passed that tooth
 * into the form (Treatments.tsx:1161), yet the wizard still opened on
 * step 1 and then presented a full Palmer picker on step 2, asking again
 * for something the doctor had just tapped. The information was there;
 * the flow simply ignored it.
 *
 * The rule below is the whole fix: when the tooth is already known, that
 * step is a confirmation, not a question, and the wizard opens past it.
 */

export type TreatmentStepId = 'tooth' | 'procedure' | 'handoff' | 'notes'

/** ترتیب گام‌ها — دندان اول، چون کار از دندان شروع می‌شود. */
export const TREATMENT_STEP_ORDER: readonly TreatmentStepId[] = [
  'tooth', 'procedure', 'handoff', 'notes',
] as const

export interface WizardSeed {
  /** دندانی که از چارت انتخاب شده، اگر شده باشد. */
  toothNumber?: string | null
  /** سطح، اگر از چارت آمده باشد. */
  toothSurface?: string | null
  /** ویرایش یک درمان موجود، نه ثبت جدید. */
  isEditing?: boolean
}

function hasTooth(seed: WizardSeed): boolean {
  return !!(seed.toothNumber && String(seed.toothNumber).trim())
}

/**
 * Where the wizard opens.
 *
 * A tooth arriving from the chart means the first question is already
 * answered, so opening on it would be asking twice. Editing always starts
 * at the beginning: the person came to change something and may not know
 * which step holds it.
 */
export function startingStepIndex(seed: WizardSeed): number {
  if (seed.isEditing) return 0
  return hasTooth(seed) ? TREATMENT_STEP_ORDER.indexOf('procedure') : 0
}

/**
 * 'confirm' shows the tooth as settled with a way to change it.
 * 'pick' shows the full Palmer picker.
 *
 * Confirm rather than hide: a wizard that silently carries an invisible
 * tooth is how the wrong tooth gets billed. It must stay visible and
 * correctable — just not re-asked.
 */
export function toothStepMode(seed: WizardSeed): 'pick' | 'confirm' {
  return hasTooth(seed) && !seed.isEditing ? 'confirm' : 'pick'
}

/** آیا سطح دندان هم از چارت آمده و نباید دوباره پرسیده شود. */
export function surfaceAlreadyKnown(seed: WizardSeed): boolean {
  return !!(seed.toothSurface && String(seed.toothSurface).trim())
}

/**
 * A short line summarising what the chart already told us, so the doctor
 * can see it was carried over instead of wondering whether it was lost.
 */
export function seededSummary(
  seed: WizardSeed,
  surfaceLabel: (value: string) => string,
): string | null {
  if (!hasTooth(seed)) return null
  const surface = surfaceAlreadyKnown(seed) ? ` — ${surfaceLabel(seed.toothSurface as string)}` : ''
  return `دندان ${seed.toothNumber}${surface}`
}

/**
 * زنجیره‌های هوشمند رویه‌های بالینی دندانپزشکی
 *
 * وقتی دندانپزشک عصب‌کشی را انتخاب می‌کند، نیازی به ثبت و پر کردن دوباره
 * دندان یا جستجوی مجدد رویه نیست؛ مراحل بعدی (پست، بیلداپ، روکش) به صورت
 * زنجیره منطقی پیشنهاد داده می‌شوند.
 */
export interface ProcedureChainStep {
  name: string
  category: 'endo' | 'restorative' | 'prostho' | 'surgery' | 'perio'
  defaultDaysLater?: number
  needsLab?: boolean
  description: string
}

export interface ProcedureChain {
  id: string
  name: string
  triggerKeywords: string[]
  steps: ProcedureChainStep[]
}

export const DENTAL_PROCEDURE_CHAINS: readonly ProcedureChain[] = [
  {
    id: 'endo-crown',
    name: 'زنجیره درمان ریشه و روکش (عصب‌کشی → پست و کور → روکش)',
    triggerKeywords: ['عصب‌کشی', 'درمان ریشه', 'اندو', 'endo', 'pulpectomy', 'عصب کشی'],
    steps: [
      {
        name: 'عصب‌کشی / پاکسازی و پر کردن کانال‌ها',
        category: 'endo',
        description: 'پالپکتومی، پاکسازی و شکل‌دهی کانال ریشه و آبچوریشن',
      },
      {
        name: 'پست و کور / بیلداپ تاج',
        category: 'restorative',
        defaultDaysLater: 7,
        description: 'بازسازی تاج دندان عصب‌کشی‌شده با فایبرپست و کامپوزیت بیلداپ',
      },
      {
        name: 'تراش، قالب‌گیری و روکش دندان (Crown)',
        category: 'prostho',
        defaultDaysLater: 14,
        needsLab: true,
        description: 'تراش، قالب‌گیری دیجیتال/آنالوگ، ارسال به لابراتوار و تحویل روکش',
      },
    ],
  },
  {
    id: 'implant-prostho',
    name: 'زنجیره پروتز ایمپلنت (کاشت فیکسچر → هیلینگ → اباتمنت و روکش)',
    triggerKeywords: ['ایمپلنت', 'کاشت دندان', 'implant', 'fixture', 'فیکسچر'],
    steps: [
      {
        name: 'جراحی کاشت فیکسچر ایمپلنت',
        category: 'surgery',
        description: 'قراردهی فیکسچر در استخوان فک با رعایت تورک جراحی',
      },
      {
        name: 'بستن هیلینگ اباتمنت (Healing Cap)',
        category: 'surgery',
        defaultDaysLater: 60,
        description: 'فرم‌دهی بافت لثه پس از استئواینتگریشن',
      },
      {
        name: 'قالب‌گیری و بستن اباتمنت نهایی',
        category: 'prostho',
        defaultDaysLater: 75,
        needsLab: true,
        description: 'انتخاب اباتمنت و ارسال قالب به لابراتوار جهت ساخت روکش',
      },
      {
        name: 'تحویل و سمان روکش نهایی ایمپلنت',
        category: 'prostho',
        defaultDaysLater: 90,
        description: 'امتحان بایت و تحویل روکش زیرکونیا/پیچ‌شونده به بیمار',
      },
    ],
  },
]

/** Finds a matching procedure chain if the procedure matches clinical keywords. */
export function findProcedureChain(procedureNameOrCode: string | null | undefined): ProcedureChain | null {
  if (!procedureNameOrCode || !String(procedureNameOrCode).trim()) return null
  const query = String(procedureNameOrCode).toLowerCase()
  for (const chain of DENTAL_PROCEDURE_CHAINS) {
    if (chain.triggerKeywords.some((kw) => query.includes(kw.toLowerCase()))) {
      return chain
    }
  }
  return null
}

