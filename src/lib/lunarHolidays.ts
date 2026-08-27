/**
 * MOD-DATA-001 | محاسبه‌ی تعطیلات قمری
 *
 * ### مشکل
 * جدول تعطیلات در `persianDate.ts` برای سال‌های ۱۴۰۳، ۱۴۰۴، ۱۴۰۶ و
 * ۱۴۰۷ همان ماه/روز ۱۴۰۵ را تکرار می‌کرد. تعطیلات قمری هر سال شمسی
 * حدود ۱۱ روز عقب می‌روند، پس این الگو **ریاضی‌وار تضمین‌شده غلط**
 * بود برای هر سالی جز یکی.
 *
 * این داده مستقیم در صفحه‌ی نوبت‌دهی نمایش داده می‌شود — یعنی
 * تاریخ غلط یعنی نوبت دادن در روز تعطیل، یا بستن مطب در روز کاری.
 *
 * ### چرا محاسبه به‌جای هاردکد
 * هاردکد کردن دستی هر سال یعنی همین باگ سال بعد دوباره برمی‌گردد.
 * تعطیلات قمری در تقویم هجری قمری **تاریخ ثابت** دارند (عاشورا
 * همیشه ۱۰ محرم است)، پس با `Intl` که در همه‌ی مرورگرهای مدرن و
 * Node موجود است، برای هر سالی قابل محاسبه‌اند — بدون وابستگی جدید.
 *
 * ### محدودیت صادقانه
 * ایران تقویم قمری را بر پایه‌ی **رؤیت هلال** تعیین می‌کند، نه
 * محاسبه‌ی نجومی. تقویم ام‌القری که `Intl` استفاده می‌کند معمولاً
 * ۰ تا ۱ روز با اعلام رسمی ایران فرق دارد. بنابراین این تاریخ‌ها
 * **تقریبی** علامت‌گذاری می‌شوند و رابط کاربری باید این عدم‌قطعیت
 * را نشان دهد. تاریخ تقریبیِ صادقانه بسیار بهتر از تاریخ غلطِ
 * قطعی‌نما است.
 */

/** تعطیلات رسمی ایران که تاریخ ثابت در تقویم قمری دارند */
export const LUNAR_HOLIDAYS: { month: number; day: number; title: string }[] = [
  { month: 1,  day: 9,  title: 'تاسوعای حسینی' },
  { month: 1,  day: 10, title: 'عاشورای حسینی' },
  { month: 2,  day: 20, title: 'اربعین حسینی' },
  { month: 2,  day: 28, title: 'رحلت پیامبر اکرم (ص) و شهادت امام حسن (ع)' },
  { month: 2,  day: 30, title: 'شهادت امام رضا (ع)' },
  { month: 3,  day: 8,  title: 'شهادت امام حسن عسکری (ع)' },
  { month: 3,  day: 17, title: 'ولادت پیامبر اکرم (ص) و امام جعفر صادق (ع)' },
  { month: 6,  day: 3,  title: 'شهادت حضرت فاطمه زهرا (س)' },
  { month: 7,  day: 13, title: 'ولادت امام علی (ع) — روز پدر' },
  { month: 7,  day: 27, title: 'مبعث پیامبر اکرم (ص)' },
  { month: 8,  day: 15, title: 'ولادت امام زمان (عج) — نیمه شعبان' },
  { month: 9,  day: 21, title: 'شهادت امام علی (ع)' },
  { month: 10, day: 1,  title: 'عید سعید فطر' },
  { month: 10, day: 2,  title: 'تعطیل به مناسبت عید فطر' },
  { month: 10, day: 25, title: 'شهادت امام جعفر صادق (ع)' },
  { month: 12, day: 10, title: 'عید سعید قربان' },
  { month: 12, day: 18, title: 'عید سعید غدیر خم' },
]

/** ماه و روز قمری یک تاریخ میلادی را برمی‌گرداند */
export function gregorianToHijri(isoDate: string): { year: number; month: number; day: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).formatToParts(new Date(`${isoDate}T12:00:00Z`))

    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
    const year = get('year'), month = get('month'), day = get('day')
    if (!year || !month || !day) return null
    return { year, month, day }
  } catch {
    // مرورگر بدون پشتیبانی تقویم قمری — بی‌صدا رد می‌شود تا
    // بقیه‌ی تقویم همچنان کار کند
    return null
  }
}

/**
 * اگر این تاریخ میلادی یکی از تعطیلات قمری باشد، عنوانش را
 * برمی‌گرداند. مقدار بازگشتی همیشه تقریبی است (رؤیت هلال).
 */
export function getLunarHoliday(isoDate: string): string | null {
  const hijri = gregorianToHijri(isoDate)
  if (!hijri) return null
  const match = LUNAR_HOLIDAYS.find((h) => h.month === hijri.month && h.day === hijri.day)
  return match ? match.title : null
}

/** آیا این تاریخ تعطیل قمری است؟ */
export function isLunarHoliday(isoDate: string): boolean {
  return getLunarHoliday(isoDate) !== null
}
