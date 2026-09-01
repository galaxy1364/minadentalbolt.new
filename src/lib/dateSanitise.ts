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
 * MOD-FIX-021: `isRetryableError` و `explainSyncError` از این‌جا برداشته
 * شدند. همان کار را `classifySyncFailure` در `syncErrors.ts` می‌کند —
 * دقیق‌تر، چون خطای **دسترسی** (RLS) را از خطای **داده** جدا می‌کند.
 * نسخه‌ی قبلی هر دو را «غیرقابل‌تلاش‌مجدد» می‌دید و بعد پیشنهاد می‌داد
 * «تاریخ نامعتبرش پاک شود» — که برای رد شدن به‌خاطر سیاست دسترسی، هیچ
 * ربطی ندارد.
 *
 * دو طبقه‌بند موازی، همان «دو مسیر برای یک مقصد» است که استاندارد پروژه
 * ممنوع کرده. `sanitiseDates` و `isValidISODate` سر جایشان ماندند.
 */
