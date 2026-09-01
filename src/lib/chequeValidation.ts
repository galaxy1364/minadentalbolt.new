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
  /** گزینه‌ی «این چک ضمانت است». */
  isGuarantee: boolean
  /** طرح قسطی که این ضمانت پشتش است. */
  payment_plan_id?: string | null
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

  return { error: null, purpose }
}

/** توضیح یک‌خطی هر حالت، برای نمایش کنار خود گزینه. */
export function chequeModeHint(isGuarantee: boolean): string {
  return isGuarantee
    ? 'نگه داشته می‌شود و خرج نمی‌شود. بدهی تا تسویه‌ی کامل اقساط باقی می‌ماند.'
    : 'این چک باید پاس شود. وقتی پاس شد، به‌عنوان پرداخت ثبت می‌شود و از بدهی کم می‌شود.'
}
