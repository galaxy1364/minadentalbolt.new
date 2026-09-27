/**
 * MOD-FEAT-002 | ورود دسته‌ای طرح درمان
 *
 * ### مشکل (نیمه‌ی دوم درخواست AUD-010)
 * نمای پیشرفت ساخته شد (MOD-FEAT-001)، ولی ثبت اولیه‌ی ۴۰ کار
 * همچنان یعنی ۴۰ بار باز کردن ویزارد ۴ مرحله‌ای. یعنی دقیقاً همان
 * مرحله‌ای که کاربر گفت «بیمار یک بار می‌آید» عملاً غیرعملی بود.
 *
 * ### راه‌حل: سبد
 * دندانپزشک به‌ترتیب «دندان، بعد کار» فکر می‌کند. این ماژول همان
 * را مدل می‌کند: اقلام در یک سبد جمع می‌شوند، جمع کل زنده محاسبه
 * می‌شود، و در پایان **یک‌جا** ذخیره می‌شوند.
 *
 * منطق جدا از UI است تا قابل تست باشد — به‌ویژه محاسبه‌ی مالی که
 * طبق استاندارد پروژه باید دقیق باشد.
 */

export interface BasketItem {
  /** شناسه‌ی موقت فقط برای React key و حذف — به دیتابیس نمی‌رود */
  tempId: string
  toothNumber: string
  procedureCode: string
  procedureName: string
  unitPrice: number
  quantity: number
  discount: number
}

/** جمع یک قلم پس از تخفیف — هرگز منفی نمی‌شود */
export function itemTotal(item: BasketItem): number {
  const gross = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)
  const discount = Number(item.discount) || 0
  return Math.max(0, gross - discount)
}

/** جمع کل سبد */
export function basketTotal(items: BasketItem[]): number {
  return items.reduce((sum, i) => sum + itemTotal(i), 0)
}

/** تعداد دندان‌های درگیر — برای نمایش خلاصه */
export function distinctTeeth(items: BasketItem[]): number {
  return new Set(items.filter((i) => i.toothNumber.trim()).map((i) => i.toothNumber.trim())).size
}

/**
 * آیا این قلم دقیقاً تکراری است؟
 *
 * چرا فقط هشدار و نه مسدودسازی: دو ترمیم روی یک دندان در دو سطح
 * مختلف کاملاً واقعی است (مثلاً مزیال و دیستال). ولی دو بار ثبت
 * اتفاقی همان رویه روی همان دندان هم رایج است. پس تشخیص می‌دهیم
 * و به کاربر می‌گوییم، ولی تصمیم با اوست.
 */
export function findDuplicate(items: BasketItem[], candidate: Omit<BasketItem, 'tempId'>): BasketItem | null {
  return items.find(
    (i) =>
      i.toothNumber.trim() === candidate.toothNumber.trim() &&
      i.procedureCode === candidate.procedureCode,
  ) ?? null
}

/**
 * اعتبارسنجی قبل از ذخیره.
 * طبق ممنوعیت‌های پروژه: فیلد اجباری باید واقعاً جلوی ادامه را
 * بگیرد، نه فقط هشدار بدهد.
 */
export function validateBasket(items: BasketItem[]): string | null {
  if (items.length === 0) return 'حداقل یک درمان به سبد اضافه کنید'
  for (const i of items) {
    if (!i.procedureName.trim()) return 'یکی از اقلام رویه‌ی درمانی ندارد'
    if (!(Number(i.unitPrice) > 0)) return `قیمت «${i.procedureName}» وارد نشده است`
    if (!(Number(i.quantity) > 0)) return `تعداد «${i.procedureName}» نامعتبر است`
    if (Number(i.discount) < 0) return `تخفیف «${i.procedureName}» نمی‌تواند منفی باشد`
    if (itemTotal(i) === 0 && Number(i.discount) > 0) {
      return `تخفیف «${i.procedureName}» از مبلغ کل بیشتر است`
    }
  }
  return null
}

/** شناسه‌ی موقت یکتا برای اقلام سبد */
export function makeTempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
