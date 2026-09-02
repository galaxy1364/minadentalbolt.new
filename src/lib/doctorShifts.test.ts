/**
 * MOD-FEAT-036 | شیفت پیش‌فرض و تداخل هم‌زمانی
 *
 * گزارش مهدی: «معمولاً همزمان دو تا پزشک فعال هست… هر روز کاری وجود داره
 * از ساعت ۸ صبح تا ۲۳ برای همه پزشک‌ها فعاله، ولی تداخل و اینها باید
 * رعایت بشه.»
 *
 * دو ادعا اینجا قفل می‌شوند: دکمه‌ی شیفت پیش‌فرض هفت روز را با همان
 * ساعت‌ها پر می‌کند، و **اشتراک ساعت بین دو پزشک تداخل نیست**.
 */
import { describe, it, expect } from 'vitest'
import settings from '../pages/Settings.tsx?raw'
import api from './api.ts?raw'

describe('🔴 شیفت پیش‌فرض هفت‌روزه', () => {
  it('دکمه با ساعت اعلام‌شده وجود دارد', () => {
    expect(settings).toContain('همه‌ی روزها ۸ تا ۲۳')
    expect(settings).toContain("start: '08:00', end: '23:00'")
  })

  it('هر هفت روز را پر می‌کند، نه فقط روزهای هفته', () => {
    // مهدی گفت مطب هر روز باز است؛ روزی که واقعاً تعطیل باشد با یک لمس
    // خاموش می‌شود، که ارزان‌تر از اضافه کردن شش روز است.
    expect(settings).toContain('weekdays.map((_, day) => ({')
  })

  it('از همان کدگذاری روز هفته استفاده می‌کند', () => {
    // index آرایه همان day_of_week ذخیره‌شده است — شنبه صفر.
    expect(settings).toContain("day_of_week: day")
  })
})

describe('🔴 دو پزشک هم‌زمان، تداخل نیست', () => {
  it('تداخل جدا برای پزشک و جدا برای یونیت سنجیده می‌شود', () => {
    // اگر بررسی سراسری بود، دومین پزشک هرگز نمی‌توانست در همان ساعت
    // نوبت بگیرد — دقیقاً برعکس چیزی که مطب لازم دارد.
    expect(api).toContain("a.doctor_id === doctorId && overlaps(a)")
    expect(api).toContain("a.unit_id === unitId && overlaps(a)")
  })

  it('نوبت لغو‌شده تداخل نمی‌سازد', () => {
    expect(api).toContain("a.status !== 'cancelled'")
  })

  it('ویرایش یک نوبت، خودش را تداخل نمی‌بیند', () => {
    expect(api).toContain('a.id !== excludeId')
  })
})
