/**
 * MOD-FEAT-029 | قانون ثبت چک — پرداخت در برابر ضمانت
 *
 * قانونی که مهدی تعریف کرد:
 *
 *   «یه گزینه به عنوان ضمانت بذار که وقتی فعالش کردیم اون چک بابت
 *    ضمانته و اقساط بتونیم تعیین بکنیم — مبلغ دلخواه و جمع کل دلخواه که
 *    باید پاس بشه. در صورتی که گزینه ضمانت رو نزدیم، یعنی اون چک باید
 *    حتماً پر بشه و حتماً پاس بشه.»
 *
 * Until now the cheque form wrote `purpose: 'payment'` as a literal.
 * A guarantee cheque was a thing the data model knew about and the list
 * could display, but that nothing in the app could actually create — so
 * every real guarantee had to be recorded as a payment cheque, which is
 * the one kind that is expected to clear.
 *
 * The two kinds carry genuinely different obligations, so they are
 * validated differently rather than sharing one lenient rule:
 *
 *   • **پرداخت** — this cheque is going to be banked. Its number, bank
 *     and due date are what the clinic will chase, so they are required.
 *
 *   • **ضمانت** — held, not banked. What matters is the schedule it
 *     secures, so a payment plan is required and the banking details are
 *     not. Amounts on that plan are free: collateral of fifty million
 *     against instalments of two is normal.
 *
 * The project standard forbids a required field that merely warns, so
 * each of these blocks the save rather than colouring the input red.
 */

export interface ChequeDraft {
  patient_id: string
  amount: string | number
  cheque_number?: string | null
  bank_name?: string | null
  due_date?: string | null
  /** شناسه ۱۶ رقمی صیادی */
  sayad_id?: string | null
  /** گزینه‌ی «این چک ضمانت است». */
  isGuarantee: boolean
  /** طرح قسطی که این ضمانت پشتش است. */
  payment_plan_id?: string | null
}

export type SayadCreditStatus = 'white' | 'yellow' | 'orange' | 'brown' | 'red'

export interface SayadStatusConfig {
  label: string
  color: string
  bgClass: string
  borderClass: string
  textClass: string
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'blocked'
}

export const SAYAD_STATUS_CONFIG: Record<SayadCreditStatus, SayadStatusConfig> = {
  white: {
    label: 'سفید (خوش‌حساب — بدون چک برگشتی)',
    color: '#10b981',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    riskLevel: 'safe',
  },
  yellow: {
    label: 'زرد (کم‌ریسک — ۱ فقره برگشتی)',
    color: '#eab308',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
    textClass: 'text-amber-700 dark:text-amber-300',
    riskLevel: 'low',
  },
  orange: {
    label: 'نارنجی (ریسک متوسط — ۲ فقره برگشتی)',
    color: '#f97316',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    borderClass: 'border-orange-200 dark:border-orange-800',
    textClass: 'text-orange-700 dark:text-orange-300',
    riskLevel: 'medium',
  },
  brown: {
    label: 'قهوه‌ای (پرریسک — ۳ تا ۴ فقره برگشتی)',
    color: '#a16207',
    bgClass: 'bg-yellow-900/10 dark:bg-yellow-950/40',
    borderClass: 'border-yellow-700/30 dark:border-yellow-700/60',
    textClass: 'text-yellow-800 dark:text-yellow-200',
    riskLevel: 'high',
  },
  red: {
    label: 'قرمز (بسیار پرخطر — ۵+ فقره برگشتی)',
    color: '#ef4444',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    borderClass: 'border-rose-200 dark:border-rose-800',
    textClass: 'text-rose-700 dark:text-rose-300',
    riskLevel: 'blocked',
  },
}

/** Validates 16-digit Iranian Sayad Cheque ID. */
export function validateSayadId(sayadId: string | null | undefined): { isValid: boolean; error: string | null } {
  if (!sayadId || !String(sayadId).trim()) {
    return { isValid: true, error: null }
  }
  const cleaned = String(sayadId).replace(/[\s-]/g, '')
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: 'شناسه صیاد فقط باید شامل ارقام باشد' }
  }
  if (cleaned.length !== 16) {
    return { isValid: false, error: 'شناسه صیاد باید دقیقاً ۱۶ رقم باشد' }
  }
  return { isValid: true, error: null }
}

/** Formats a 16-digit Sayad ID as 4-4-4-4 (e.g. 1234-5678-9012-3456). */
export function formatSayadId(sayadId: string | null | undefined): string {
  if (!sayadId) return ''
  const digits = String(sayadId).replace(/\D/g, '').slice(0, 16)
  if (!digits) return ''
  const chunks: string[] = []
  for (let i = 0; i < digits.length; i += 4) {
    chunks.push(digits.slice(i, i + 4))
  }
  return chunks.join('-')
}

export interface ChequeValidation {
  /** اولین خطا، یا null اگر قابل ثبت باشد. */
  error: string | null
  /** مقدار `purpose` که باید ذخیره شود. */
  purpose: 'payment' | 'guarantee'
}

function amountOf(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * `stage` exists because the form asks for the money on one step and the
 * banking details on the next. Validating everything on step one would
 * reject a cheque for a missing field the person has not been shown yet.
 */
export function validateCheque(
  draft: ChequeDraft,
  stage: 'basics' | 'banking' | 'all' = 'all',
): ChequeValidation {
  const purpose: 'payment' | 'guarantee' = draft.isGuarantee ? 'guarantee' : 'payment'

  if (!draft.patient_id) return { error: 'انتخاب بیمار الزامی است', purpose }
  if (amountOf(draft.amount) <= 0) return { error: 'مبلغ چک باید بیشتر از صفر باشد', purpose }

  if (draft.isGuarantee) {
    // Taking the cheque is only half the act; without a schedule it is
    // collateral nobody is collecting on.
    if (!draft.payment_plan_id) {
      return { error: 'برای چک ضمانت باید یک طرح قسطی انتخاب یا ساخته شود', purpose }
    }
    return { error: null, purpose }
  }

  if (stage === 'basics') return { error: null, purpose }

  // A payment cheque is going to be banked, so the details the clinic
  // will need in order to bank it are not optional.
  if (!String(draft.cheque_number ?? '').trim()) {
    return { error: 'شماره چک برای چک پرداخت الزامی است', purpose }
  }
  if (!String(draft.bank_name ?? '').trim()) {
    return { error: 'نام بانک برای چک پرداخت الزامی است', purpose }
  }
  if (!String(draft.due_date ?? '').trim()) {
    return { error: 'تاریخ سررسید برای چک پرداخت الزامی است', purpose }
  }

  if (draft.sayad_id) {
    const sayadCheck = validateSayadId(draft.sayad_id)
    if (!sayadCheck.isValid) {
      return { error: sayadCheck.error, purpose }
    }
  }

  return { error: null, purpose }
}

export function chequeModeHint(isGuarantee: boolean): string {
  return isGuarantee
    ? 'نگه داشته می‌شود و خرج نمی‌شود. بدهی تا تسویه‌ی کامل اقساط باقی می‌ماند.'
    : 'این چک باید پاس شود. وقتی پاس شد، به‌عنوان پرداخت ثبت می‌شود و از بدهی کم می‌شود.'
}

