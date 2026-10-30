/**
 * MOD-UI-003 | سیستم توکن حرکت
 *
 * بر پایه‌ی اجماع ۲۰۲۶ (جستجوشده):
 * ۱. توکن معنایی به‌جای عدد خام — `fast` نه `200ms`
 * ۲. خروج سریع‌تر و صاف‌تر از ورود است: ورود چیزی را معرفی می‌کند،
 *    خروج چیزی را که کاربر کارش با آن تمام شده برمی‌دارد — خروج کند
 *    مثل کندی سیستم حس می‌شود، نه ظرافت
 * ۳. فقط `transform` و `opacity` روی GPU اجرا می‌شوند. انیمیت کردن
 *    width/height/margin/top/left باعث بازمحاسبه‌ی چیدمان و پرش می‌شود
 * ۴. مدت باید با مسافت رشد کند، ولی زیرخطی — وگرنه جابه‌جایی بلند
 *    بی‌نهایت کند حس می‌شود
 * ۵. الگوی ضریب‌مدت: هر مدت در یک ضریب سراسری ضرب می‌شود که در حالت
 *    کاهش حرکت صفر می‌شود — یعنی رعایت دسترس‌پذیری خودکار است و
 *    امکان فراموش کردنش وجود ندارد
 */

/** مدت‌های پایه بر حسب میلی‌ثانیه — چهار پله، نه بیشتر */
export const DURATIONS = {
  instant: 80,   // بازخورد فشردن — زیر ۱۰۰ms وگرنه لمس «بی‌جواب» حس می‌شود
  fast: 160,     // تغییر وضعیت، هاور
  base: 240,     // ورود و خروج معمول
  slow: 360,     // جابه‌جایی بزرگ، صفحه‌ی کامل
} as const

export type Duration = keyof typeof DURATIONS

/**
 * منحنی‌ها. ورودی‌ها از `emphasized` استفاده می‌کنند (کمی کشش دارد،
 * حس زنده)، خروجی‌ها از `exit` که عمداً بدون کشش است.
 */
export const EASINGS = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  decelerate: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const

export type Easing = keyof typeof EASINGS

/** نسبت مدت خروج به ورود — خروج باید محسوس سریع‌تر باشد */
export const EXIT_RATIO = 0.7

export function exitDuration(d: Duration): number {
  return Math.round(DURATIONS[d] * EXIT_RATIO)
}

/**
 * مدت را بر اساس مسافت جابه‌جایی تنظیم می‌کند.
 * فرمول: duration × (travel / 160)^0.5 با محدوده‌ی ۰.۶ تا ۱.۸ برابر.
 * ریشه‌ی دوم عمدی است — رابطه‌ی خطی باعث می‌شود جابه‌جایی بلند
 * غیرقابل‌تحمل کند شود.
 *
 * فقط برای حرکاتی که واقعاً مسافت طی می‌کنند. پر شدن یک چک‌باکس
 * مسافتی ندارد و نباید از این تابع استفاده کند.
 */
export const TRAVEL_REFERENCE_PX = 160
export const TRAVEL_MIN_FACTOR = 0.6
export const TRAVEL_MAX_FACTOR = 1.8

export function durationForTravel(d: Duration, travelPx: number): number {
  if (travelPx <= 0) return DURATIONS[d]
  const raw = Math.sqrt(travelPx / TRAVEL_REFERENCE_PX)
  const factor = Math.min(TRAVEL_MAX_FACTOR, Math.max(TRAVEL_MIN_FACTOR, raw))
  return Math.round(DURATIONS[d] * factor)
}

/**
 * تأخیر پلکانی برای ورود فهرست‌ها.
 * توان ۰.۸۵ باعث می‌شود تأخیر با افزایش تعداد کاهش پیدا کند —
 * وگرنه یک فهرست ۵۰ تایی چند ثانیه طول می‌کشد تا کامل ظاهر شود.
 */
export const STAGGER_OFFSET_MS = 40
export const STAGGER_FALLOFF = 0.85

export function staggerDelay(index: number): number {
  if (index <= 0) return 0
  return Math.round(STAGGER_OFFSET_MS * Math.pow(index, STAGGER_FALLOFF))
}

/**
 * خواص امن برای انیمیشن (شتاب‌گرفته با GPU).
 * هر خاصیت دیگری بازمحاسبه‌ی چیدمان یا رنگ‌آمیزی مجدد می‌خواهد.
 */
export const GPU_SAFE_PROPERTIES = ['transform', 'opacity', 'filter'] as const

export function isGpuSafe(property: string): boolean {
  return (GPU_SAFE_PROPERTIES as readonly string[]).includes(property.trim())
}
