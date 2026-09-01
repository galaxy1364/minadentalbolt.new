/**
 * MOD-FEAT-028 | خلاصه‌ی چک‌های یک بیمار
 *
 * قانونی که مهدی تعریف کرد:
 *
 *   «کلاً چک تا پاس نشه بدهی حساب بشود… دو مدل چک داریم: یکی که بیمار
 *    ماه‌به‌ماه پرداخت می‌کنه و خودش پاس می‌شه، و یکی چک ضمانت که ما
 *    خرجش نمی‌کنیم — براش اقساط تعریف می‌شه و تا تسویه‌ی کامل بدهی
 *    محسوب می‌شه… ولی قابل مدیریت باشه.»
 *
 * **هیچ‌کدام از این‌ها ریاضی مانده را عوض نمی‌کند.** `calcPatientBalance`
 * فقط پرداخت‌های ثبت‌شده را می‌شمارد، و یک چک تنها وقتی به پرداخت تبدیل
 * می‌شود که پاس شود. آن رفتار از قبل با قانون بالا می‌خواند.
 *
 * What was missing is not the arithmetic — it is the answer to «has this
 * patient given us a cheque, and when is it due?». A balance of five
 * million means something very different when two million of it is
 * sitting in a cheque dated next month, and the screens showed no
 * difference at all.
 *
 * A guarantee cheque with no payment plan behind it is flagged, because
 * the whole point of taking one is that instalments are then defined
 * against it. A guarantee held with no schedule is collateral nobody is
 * collecting on.
 */

export interface ChequeLike {
  id: string
  patient_id: string
  amount: number
  due_date: string
  status: string
  purpose: 'payment' | 'guarantee'
  payment_plan_id: string | null
}

/** وضعیت‌هایی که یعنی چک هنوز در جریان است. */
const IN_FLIGHT = ['pending', 'deposited']

export interface ChequeGroup {
  count: number
  total: number
  /** نزدیک‌ترین سررسید، برای اینکه بشود گفت «کِی». */
  nextDue: string | null
}

export interface ChequeSummary {
  /** چک‌های پرداخت که هنوز پاس نشده‌اند — بخشی از بدهی، ولی در راه. */
  inFlight: ChequeGroup
  /** چک‌های ضمانت — خرج نمی‌شوند و هرگز پرداخت حساب نمی‌شوند. */
  guarantee: ChequeGroup
  /** چک ضمانتی که هیچ طرح قسطی پشتش نیست — وثیقه‌ای که کسی وصولش نمی‌کند. */
  guaranteeWithoutPlan: number
  /** چک برگشتی — بدهی سر جایش است و کسی باید پیگیری کند. */
  bounced: ChequeGroup
  /** آیا اصلاً چکی از این بیمار هست. */
  hasAny: boolean
}

function group(list: ChequeLike[]): ChequeGroup {
  const dues = list.map((c) => c.due_date).filter(Boolean).sort()
  return {
    count: list.length,
    total: list.reduce((sum, c) => sum + (c.amount || 0), 0),
    nextDue: dues[0] ?? null,
  }
}

export function summariseCheques(cheques: ChequeLike[], patientId: string): ChequeSummary {
  const mine = cheques.filter((c) => c.patient_id === patientId)

  const inFlight = mine.filter((c) => c.purpose === 'payment' && IN_FLIGHT.includes(c.status))
  // A cancelled guarantee is no longer held, so it is not collateral.
  const guarantee = mine.filter((c) => c.purpose === 'guarantee' && c.status !== 'cancelled')
  const bounced = mine.filter((c) => c.status === 'bounced')

  return {
    inFlight: group(inFlight),
    guarantee: group(guarantee),
    guaranteeWithoutPlan: guarantee.filter((c) => !c.payment_plan_id).length,
    bounced: group(bounced),
    hasAny: mine.length > 0,
  }
}

/**
 * A one-line answer to «does this patient owe us anything on paper?».
 * Returns null when there is nothing worth saying, so a caller can drop
 * the row entirely rather than render an empty label.
 */
export function chequeHeadline(summary: ChequeSummary): string | null {
  if (summary.bounced.count > 0) return 'چک برگشتی دارد'
  if (summary.inFlight.count > 0) return 'چک در جریان دارد'
  if (summary.guarantee.count > 0) return 'چک ضمانت سپرده'
  return null
}
