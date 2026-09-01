// syncErrors.ts — error classification for the sync loop.
//
// Kept in its own module, free of the Supabase client, so the rules can
// be unit-tested without constructing a real connection.

/**
 * Whether an error means "this table does not exist server-side yet".
 *
 * Both pull and push consult this, so the rule lives in exactly one
 * place — two copies would inevitably drift apart.
 *
 * Deliberately narrow. A permission error or a missing *column* is a
 * real problem that must surface; only a wholly absent table is treated
 * as "the app is simply ahead of its migrations".
 */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string }
  if (e.code === '42P01' || e.code === 'PGRST205') return true
  // 42703 is undefined_column — a genuine schema mismatch, not this case.
  if (e.code === '42703') return false
  const msg = e.message || ''
  return /relation .*does not exist|could not find the table/i.test(msg)
}

/**
 * MOD-FIX-020 | خطای شبکه یا خطای داده؟
 *
 * پنل «همگام‌سازی‌های ناموفق» به هر رکورد گیرکرده یک جمله می‌گفت:
 * «معمولاً با اتصال اینترنت بهتر و تلاش مجدد حل می‌شود».
 *
 * برای دو رکوردی که با `date/time field value out of range: "2-00-02"`
 * گیر کرده بودند، این حرف **هرگز** درست نمی‌شد: سرور داده را می‌بیند و
 * پس می‌زند. تلاش مجدد فقط شمارنده را بالا می‌برد. کاربری که پیام را
 * باور کند، بی‌نهایت بار دکمه را می‌زند و هیچ‌وقت نمی‌فهمد باید خودِ داده
 * را اصلاح کند.
 *
 * تابع خالص و بدون کلاینت سوپابیس، تا بشود واقعاً تستش کرد.
 */
export type SyncFailureKind = 'network' | 'data' | 'permission' | 'unknown'

export interface SyncFailureAdvice {
  kind: SyncFailureKind
  /** آیا «تلاش مجدد» به‌تنهایی می‌تواند جواب بدهد؟ */
  retryable: boolean
  title: string
  advice: string
}

/**
 * Postgres classes that mean "the server understood the request and
 * rejected the value". Retrying an unchanged row can never clear these.
 *   22xxx = data exception (out of range, invalid format, …)
 *   23xxx = integrity constraint violation (not-null, FK, unique, …)
 */
const DATA_ERROR_CODE = /^(22|23)\d{3}$/
const DATA_ERROR_TEXT =
  /out of range|invalid input syntax|violates .*constraint|not-null|duplicate key|invalid date|type .* does not exist/i
const NETWORK_TEXT =
  /failed to fetch|network|load failed|timeout|timed out|ECONN|ENOTFOUND|socket|offline|ERR_/i
const PERMISSION_TEXT = /row-level security|permission denied|not authorized|jwt|apikey|api key/i

export function classifySyncFailure(err: unknown): SyncFailureAdvice {
  const e = (err && typeof err === 'object' ? err : {}) as { code?: string; message?: string }
  const msg = typeof err === 'string' ? err : e.message || ''
  const code = e.code || ''

  if (DATA_ERROR_CODE.test(code) || DATA_ERROR_TEXT.test(msg)) {
    return {
      kind: 'data',
      retryable: false,
      title: 'داده‌ی این رکورد پذیرفته نشد',
      advice:
        'سرور این رکورد را دیده و به‌خاطر مقدارِ خودش پس زده — «تلاش مجدد» هر بار همین جواب را می‌گیرد. ' +
        'داده را با «کپی داده» ببینید، رکورد را در برنامه باز و مقدار اشتباه را اصلاح کنید، بعد دوباره ذخیره کنید.',
    }
  }

  if (PERMISSION_TEXT.test(msg) || code === '42501') {
    return {
      kind: 'permission',
      retryable: false,
      title: 'اجازه‌ی نوشتن نبود',
      advice: 'حساب شما اجازه‌ی ثبت این رکورد را نداشت. یک بار خارج و دوباره وارد شوید؛ اگر تکرار شد با مدیر کلینیک تماس بگیرید.',
    }
  }

  if (NETWORK_TEXT.test(msg) || !msg) {
    return {
      kind: 'network',
      retryable: true,
      title: 'به سرور نرسید',
      advice: 'این رکورد اصلاً به سرور نرسید. با اتصال اینترنت بهتر، «تلاش مجدد» معمولاً حلش می‌کند.',
    }
  }

  return {
    kind: 'unknown',
    retryable: true,
    title: 'خطای ناشناخته',
    advice: 'یک بار «تلاش مجدد» بزنید. اگر دوباره همین خطا آمد، «کپی داده» را برای بررسی نگه دارید.',
  }
}
