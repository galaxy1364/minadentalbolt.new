/**
 * MOD-FIX-015 | تاریخ خراب در صف همگام‌سازی
 *
 * دو رکورد واقعی روی گوشی مهدی گیر کرده بودند — یک سفارش لابراتوار و یک
 * فاز درمان — با این خطا:
 *
 *     date/time field value out of range: "2-00-02"
 *
 * ماه صفر است. چنین ماهی وجود ندارد.
 *
 * Two separate faults produced and then trapped that record.
 *
 * MAKING IT — `jalaliToGregorian` guarded only against non-finite
 * numbers. `2`, `0` and `2` are all finite, so a year-2 month-0 date
 * passed the check and was written into a Postgres `date` column.
 *
 * TRAPPING IT — `retryFailedEntry` resets the counter and re-sends the
 * *same payload*. For a network failure that is exactly right. For a
 * malformed value it can never succeed, so the record sat there being
 * retried ten times and then parked forever. The panel even told the
 * user "usually fixed by a better connection and Retry", which for this
 * class of error is advice that cannot work.
 *
 * An invalid date is cleared to null rather than guessed. A silently
 * wrong delivery date on a lab order is worse than an empty one: the
 * empty one gets noticed and re-entered, the wrong one gets trusted.
 */

/** آیا این رشته یک تاریخ ISO معتبر است. */
export function isValidISODate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (y < 1900 || y > 2200) return false
  if (mo < 1 || mo > 12) return false
  if (d < 1 || d > 31) return false
  // Rejects 31 April and 30 February, which Postgres rejects too.
  const probe = new Date(Date.UTC(y, mo - 1, d))
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d
}

/**
 * Anything that *looks* like a date string. Deliberately loose: the whole
 * point is to catch the malformed ones, and "2-00-02" would not match a
 * strict pattern.
 */
function looksLikeDate(value: string): boolean {
  return /^\d{1,4}-\d{1,2}-\d{1,2}(T|$)/.test(value)
}

export interface SanitiseResult<T> {
  cleaned: T
  /** نام فیلدهایی که پاک شدند، برای گفتن به کاربر. */
  clearedFields: string[]
}

/**
 * Clears every date-shaped field whose value Postgres would reject.
 *
 * Shallow by design: sync payloads are flat table rows, and walking
 * arbitrary depth would risk touching a JSON column whose contents are
 * the clinic's own data rather than a column value.
 */
export function sanitiseDates<T extends Record<string, unknown>>(payload: T): SanitiseResult<T> {
  const cleared: string[] = []
  const cleaned = { ...payload }

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value !== 'string' || !looksLikeDate(value)) continue
    const datePart = value.slice(0, 10)
    if (isValidISODate(datePart)) continue
    ;(cleaned as Record<string, unknown>)[key] = null
    cleared.push(key)
  }

  return { cleaned, clearedFields: cleared }
}

/**
 * Whether an error is worth retrying at all.
 *
 * A network failure clears on its own; a rejected value never will.
 * Telling someone to retry a value error is how a record gets stuck for
 * a week while the person dutifully presses the button.
 */
export function isRetryableError(message: string): boolean {
  return !/out of range|invalid input syntax|violates|malformed|invalid text representation/i.test(message)
}

/** پیام فارسی مناسب هر کلاس خطا. */
export function explainSyncError(message: string): string {
  if (!isRetryableError(message)) {
    return 'مقدار این رکورد برای سرور معتبر نیست — «تلاش مجدد» تنهایی حلش نمی‌کند. با «اصلاح و ارسال» تاریخ نامعتبرش پاک و دوباره فرستاده می‌شود.'
  }
  return 'به سرور نرسید. معمولاً با اتصال بهتر و «تلاش مجدد» حل می‌شود.'
}
