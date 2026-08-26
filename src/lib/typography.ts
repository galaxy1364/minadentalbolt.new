/**
 * MOD-UI-002 | مقیاس تایپوگرافی سیال
 *
 * بر پایه‌ی اجماع طراحی ۲۰۲۶ (جستجوشده، نه حدس):
 * ۱. اندازه‌های ثابت px منسوخ‌اند — clamp() سیال جایگزین شده
 * ۲. «نسبت» تُکِن می‌شود، نه «اندازه» — تغییر یک عدد، کل سلسله‌مراتب
 * ۳. حتماً باید جمله‌ی rem در clamp باشد وگرنه زوم مرورگر می‌شکند
 *    (این یک الزام دسترس‌پذیری است، نه سلیقه)
 * ۴. line-height نسبتی: ۱.۴–۱.۶ برای متن، ۱.۱–۱.۲۵ برای تیتر
 *
 * نکته‌ی مخصوص فارسی: خط فارسی به‌خاطر زیرنویس‌ها و کشیدگی حروف
 * (ی، ج، ع) به فضای عمودی بیشتری از لاتین نیاز دارد. مقادیر
 * line-height این فایل عمداً از توصیه‌ی لاتین کمی بازتر است.
 */

/** نسبت مقیاس — «سوم بزرگ» (Major Third). تغییر این یک عدد، کل هرم را جابه‌جا می‌کند. */
export const SCALE_RATIO = 1.25

/** اندازه‌ی پایه بر حسب rem در کوچک‌ترین و بزرگ‌ترین نمای صفحه */
export const BASE_MIN_PX = 15
export const BASE_MAX_PX = 17
export const VIEWPORT_MIN_PX = 320
export const VIEWPORT_MAX_PX = 1280

/**
 * یک پله از مقیاس را برمی‌گرداند. پله ۰ = اندازه‌ی متن پایه.
 * پله‌های مثبت بزرگ‌تر (تیترها)، منفی کوچک‌تر (توضیحات ریز).
 */
export function scaleStep(step: number, base = 1): number {
  return Number((base * Math.pow(SCALE_RATIO, step)).toFixed(4))
}

/**
 * line-height مناسب برای یک اندازه. متن کوچک به نسبت بازتر و تیتر
 * بزرگ به نسبت بسته‌تر نیاز دارد — این یک قانون تایپوگرافی است،
 * نه سلیقه: خطوط بلندِ کوچک بدون فضای کافی خسته‌کننده می‌شوند و
 * تیتر بزرگ با فضای زیاد از هم می‌پاشد.
 */
export function lineHeightFor(remSize: number): number {
  if (remSize >= 1.75) return 1.2   // تیتر بزرگ
  if (remSize >= 1.25) return 1.35  // تیتر متوسط
  if (remSize >= 1) return 1.65     // متن اصلی (کمی بازتر از لاتین، برای فارسی)
  return 1.75                        // متن ریز
}

/**
 * عبارت clamp() برای مقیاس‌بندی سیال می‌سازد.
 * فرمول شیب خطی بین دو نقطه‌ی نمای صفحه، به‌همراه جمله‌ی rem
 * تا زوم مرورگر همچنان کار کند.
 */
export function fluidClamp(minPx: number, maxPx: number): string {
  const slope = (maxPx - minPx) / (VIEWPORT_MAX_PX - VIEWPORT_MIN_PX)
  const yAxisIntersection = -VIEWPORT_MIN_PX * slope + minPx
  const remIntercept = Number((yAxisIntersection / 16).toFixed(4))
  const vwSlope = Number((slope * 100).toFixed(4))
  return `clamp(${minPx / 16}rem, ${remIntercept}rem + ${vwSlope}vw, ${maxPx / 16}rem)`
}

/** توکن‌های معنایی — نام بر اساس نقش، نه اندازه */
export const TYPE_TOKENS = {
  'display': scaleStep(4),
  'title-lg': scaleStep(3),
  'title': scaleStep(2),
  'heading': scaleStep(1),
  'body': scaleStep(0),
  'caption': scaleStep(-1),
  'micro': scaleStep(-2),
} as const

export type TypeToken = keyof typeof TYPE_TOKENS
