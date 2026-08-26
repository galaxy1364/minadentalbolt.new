/**
 * MOD-UI-001 | سیستم متریال iOS 27
 *
 * چرا این ماژول وجود دارد:
 * iOS 26 زبان طراحی «Liquid Glass» را آورد — شفاف، عمق‌دار، پویا.
 * ولی در WWDC 2026 اپل عمداً عقب‌نشینی کرد: iOS 27 یک «نوار تنظیم
 * شفافیت» اضافه کرد چون شفافیت زیاد خوانایی را خراب می‌کرد.
 *
 * برای یک نرم‌افزار پزشکی این فقط زیبایی‌شناسی نیست — ایمنی است.
 * اگر مبلغ یا شماره‌ی دندان روی پس‌زمینه‌ی شلوغ خوانا نباشد، خطای
 * درمانی یا مالی رخ می‌دهد. پس دقیقاً همان مسیر اپل را می‌رویم:
 * شیشه‌ای زیبا، ولی با کنترل واقعی در دست کاربر.
 */

/** سطوح شفافیت — از کاملاً مات تا شیشه‌ای کامل */
export const MATERIAL_LEVELS = {
  solid: 'مات (بیشترین خوانایی)',
  subtle: 'ملایم',
  standard: 'استاندارد',
  vivid: 'شیشه‌ای کامل',
} as const

export type MaterialLevel = keyof typeof MATERIAL_LEVELS

/**
 * مقادیر هر سطح. blur و saturate بر حسب مقدار خام CSS.
 * opacity هرچه بالاتر = مات‌تر = خواناتر.
 *
 * توجه: مقادیر solid عمداً blur صفر دارد — نه فقط blur کم. اگر
 * backdrop-filter اصلاً اعمال نشود، مرورگر می‌تواند کل لایه‌ی
 * ترکیب را حذف کند که روی دستگاه‌های ضعیف تفاوت محسوسی در
 * روانی اسکرول دارد.
 */
export const MATERIAL_VALUES: Record<MaterialLevel, { blur: number; opacity: number; saturate: number }> = {
  solid:    { blur: 0,  opacity: 1.00, saturate: 100 },
  subtle:   { blur: 12, opacity: 0.92, saturate: 140 },
  standard: { blur: 28, opacity: 0.78, saturate: 180 },
  vivid:    { blur: 44, opacity: 0.62, saturate: 220 },
}

const STORAGE_KEY = 'minadent_material_level'
export const DEFAULT_LEVEL: MaterialLevel = 'standard'

/** آیا مقدار ذخیره‌شده یک سطح معتبر است؟ */
export function isValidLevel(value: unknown): value is MaterialLevel {
  return typeof value === 'string' && value in MATERIAL_VALUES
}

/**
 * سطح ذخیره‌شده را می‌خواند. اگر مقدار خراب یا نامعتبر بود (مثلاً
 * از نسخه‌ی قدیمی‌تر برنامه یا دستکاری دستی)، به‌جای خطا دادن به
 * پیش‌فرض برمی‌گردد — رابط کاربری هرگز نباید به‌خاطر یک مقدار
 * ذخیره‌شده‌ی نامعتبر از کار بیفتد.
 */
export function getMaterialLevel(): MaterialLevel {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isValidLevel(stored) ? stored : DEFAULT_LEVEL
  } catch {
    return DEFAULT_LEVEL
  }
}

export function setMaterialLevel(level: MaterialLevel): void {
  try {
    localStorage.setItem(STORAGE_KEY, level)
  } catch {
    // حالت خصوصی مرورگر: ذخیره ممکن نیست ولی اعمال ظاهری باید کار کند
  }
  applyMaterialLevel(level)
}

/**
 * سطح را روی متغیرهای CSS ریشه اعمال می‌کند. چون همه‌ی کلاس‌های
 * شیشه‌ای از همین متغیرها مشتق می‌شوند، یک بار نوشتن اینجا کل
 * برنامه را هم‌زمان تغییر می‌دهد — بدون رندر مجدد React.
 */
export function applyMaterialLevel(level: MaterialLevel): void {
  const v = MATERIAL_VALUES[isValidLevel(level) ? level : DEFAULT_LEVEL]
  const root = document.documentElement
  root.style.setProperty('--glass-blur', `${v.blur}px`)
  root.style.setProperty('--glass-opacity', String(v.opacity))
  root.style.setProperty('--glass-saturate', `${v.saturate}%`)
  root.dataset.material = level
}

/**
 * تشخیص ترجیح سیستمی کاربر برای کاهش شفافیت.
 * این یک استاندارد دسترس‌پذیری است (همان چیزی که اپل در
 * Settings > Accessibility > Reduce Transparency دارد) و طبق
 * راهنمای رابط انسانی اپل باید محترم شمرده شود.
 */
export function prefersReducedTransparency(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-transparency: reduce)').matches
  } catch {
    return false
  }
}

/**
 * در شروع برنامه صدا زده می‌شود. اگر کاربر در سطح سیستم‌عامل
 * کاهش شفافیت را فعال کرده باشد، آن ترجیح بر تنظیم ذخیره‌شده
 * اولویت دارد — دسترس‌پذیری بر زیبایی مقدم است.
 */
export function initMaterialSystem(): MaterialLevel {
  const level = prefersReducedTransparency() ? 'solid' : getMaterialLevel()
  applyMaterialLevel(level)
  return level
}
