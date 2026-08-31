import type { Patient } from '../types'

/**
 * MOD-FIX-017 | یک قانون برای هویت بیمار، نه دو تا
 *
 * ثبت بیمار (`Patients.tsx`) پنج فیلد را اجباری می‌کرد و کد ملی تکراری را
 * مسدود می‌کرد. ویرایش همان بیمار (`PatientDetail.tsx`) فقط نام و نام
 * خانوادگی را می‌سنجید. یعنی منشی بیماری می‌ساخت که مجبور بود موبایل و کد
 * ملی بدهد، بعد همان پرونده را باز می‌کرد، هر دو را پاک می‌کرد و ذخیره
 * می‌شد — بدون هیچ هشداری.
 *
 * دو چیز از این راه بیرون می‌رفت:
 *   • موبایل، که به گفته‌ی خود کد «پایه‌ی یادآوری‌ها و پیامک‌هاست»
 *   • کد ملی، که تنها کلید تشخیص پرونده‌ی تکراری است
 *
 * «دو مسیر برای یک کار» در ENGINEERING-STANDARD.md ممنوع است. پس قانون
 * یک‌جا نوشته می‌شود و هر دو مسیر همین را صدا می‌زنند.
 */

/** فیلدهایی که هویت یک بیمار را می‌سازند و هر دو فرم می‌گیرند. */
export interface PatientIdentityDraft {
  first_name: string
  last_name: string
  phone: string
  national_id: string
  phone2: string
}

/** فیلدهای اجباری، به همان ترتیبی که در فرم دیده می‌شوند. */
export const REQUIRED_IDENTITY_FIELDS = ['first_name', 'last_name', 'national_id', 'phone', 'phone2'] as const

/**
 * اولین ایراد را برمی‌گرداند، یا null اگر هویت کامل باشد.
 *
 * پیام‌ها عمداً می‌گویند **چرا** فیلد لازم است: «دوباره تلاش کنید» یک بار
 * سه ساعت عیب‌یابی را کور کرد (START-HERE.md §۴).
 */
export function validatePatientIdentity(draft: PatientIdentityDraft): string | null {
  if (!draft.first_name.trim() || !draft.last_name.trim()) return 'نام و نام خانوادگی الزامی است'
  // Phone is used everywhere downstream — SMS reminders, appointment
  // confirmations, the whole notification system assumes every patient has
  // one. Letting it be skipped meant some patients could silently never
  // receive any reminder the rest of the app promises.
  if (!draft.phone.trim()) return 'شماره تلفن الزامی است — پایه‌ی یادآوری‌ها و پیامک‌هاست'
  if (!draft.national_id.trim()) return 'کد ملی الزامی است'
  if (!draft.phone2.trim()) return 'شماره منزل الزامی است'
  return null
}

/**
 * پرونده‌ی دیگری با همین کد ملی، یا null.
 *
 * کد ملی شناسه‌ی حقوقی یکتاست — دو آدم واقعاً متفاوت هرگز یکی ندارند، پس
 * برخورد همیشه یعنی پرونده‌ی تکراری و باید **مسدود** شود، نه هشدار.
 * تلفن این‌طور نیست: یک خانواده می‌تواند یک خط ثابت مشترک داشته باشد.
 */
export function findNationalIdDuplicate(
  nationalId: string,
  patients: Patient[],
  currentPatientId?: string | null,
): Patient | null {
  const value = nationalId.trim()
  if (!value) return null
  return patients.find((p) => p.national_id === value && p.id !== currentPatientId) || null
}

/** پیام مسدودکننده‌ی کد ملی تکراری — یک متن، در هر دو مسیر. */
export function duplicateNationalIdMessage(other: Patient): string {
  return `این کد ملی قبلاً برای «${other.first_name} ${other.last_name}» ثبت شده — کد ملی نمی‌تواند تکراری باشد`
}
