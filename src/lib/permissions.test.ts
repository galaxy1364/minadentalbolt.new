/**
 * MOD-TEST-003 | تست‌های کنترل دسترسی نقش‌محور
 *
 * این تست‌ها امنیتی هستند: هر تست یک نشتی دسترسی واقعی را می‌بندد.
 * مثلاً دستیار نباید بتواند حقوق پرسنل یا مالی شخصی مالک را ببیند.
 */
import { describe, it, expect } from 'vitest'
import { canAccess, ROLES } from './permissions'

describe('canAccess — کاربر بدون نقش', () => {
  it('کاربر بدون نقش فقط به داشبورد دسترسی دارد', () => {
    expect(canAccess(null, '/')).toBe(true)
    expect(canAccess(null, '/patients')).toBe(false)
    expect(canAccess(undefined, '/billing')).toBe(false)
  })

  /**
   * نشتی امنیتی احتمالی: نقشی که در سیستم تعریف نشده نباید
   * به‌طور پیش‌فرض دسترسی بگیرد (fail-closed نه fail-open).
   */
  it('نقش ناشناس نباید دسترسی پیش‌فرض بگیرد', () => {
    expect(canAccess('hacker', '/patients')).toBe(false)
    expect(canAccess('', '/staff')).toBe(false)
  })
})

describe('canAccess — مرزهای واقعی هر نقش', () => {
  it('مالک کلینیک به همه‌ی بخش‌ها دسترسی دارد', () => {
    for (const path of ['/patients', '/billing', '/staff', '/personal-finance', '/reports']) {
      expect(canAccess('owner', path)).toBe(true)
    }
  })

  it('دستیار نباید به مالی، حقوق پرسنل یا گزارش‌ها دسترسی داشته باشد', () => {
    expect(canAccess('assistant', '/billing')).toBe(false)
    expect(canAccess('assistant', '/staff')).toBe(false)
    expect(canAccess('assistant', '/reports')).toBe(false)
    // ولی به کار روزمره‌ی خودش دسترسی دارد
    expect(canAccess('assistant', '/patients')).toBe(true)
    expect(canAccess('assistant', '/appointments')).toBe(true)
  })

  it('تکنسین لابراتوار نباید پرونده‌ی بیماران یا مالی را ببیند', () => {
    expect(canAccess('lab', '/patients')).toBe(false)
    expect(canAccess('lab', '/billing')).toBe(false)
    // فقط کار خودش
    expect(canAccess('lab', '/laboratory')).toBe(true)
    expect(canAccess('lab', '/implants')).toBe(true)
  })

  it('حسابدار نباید به پرونده‌ی درمانی بیمار دسترسی داشته باشد', () => {
    expect(canAccess('accountant', '/treatments')).toBe(false)
    expect(canAccess('accountant', '/patients')).toBe(false)
    expect(canAccess('accountant', '/billing')).toBe(true)
  })

  /**
   * مالی شخصیِ مالک کلینیک است — هیچ نقش دیگری نباید ببیندش.
   */
  it('مالی شخصی فقط برای مالک و حسابدار باز است', () => {
    expect(canAccess('owner', '/personal-finance')).toBe(true)
    expect(canAccess('accountant', '/personal-finance')).toBe(true)
    expect(canAccess('doctor', '/personal-finance')).toBe(false)
    expect(canAccess('assistant', '/personal-finance')).toBe(false)
    expect(canAccess('receptionist', '/personal-finance')).toBe(false)
    expect(canAccess('lab', '/personal-finance')).toBe(false)
  })
})

describe('canAccess — مسیرهای پویا', () => {
  /**
   * محافظت از دور زدن دسترسی: /patients/<id> باید همان قانون
   * /patients را داشته باشد، وگرنه نقشی که نباید بیمار ببیند
   * می‌تواند با لینک مستقیم وارد پرونده شود.
   */
  it('پرونده‌ی یک بیمار خاص، همان قانون لیست بیماران را دارد', () => {
    expect(canAccess('doctor', '/patients/abc-123')).toBe(true)
    expect(canAccess('lab', '/patients/abc-123')).toBe(false)
    expect(canAccess('accountant', '/patients/abc-123')).toBe(false)
  })

  it('داشبورد برای هر نقش شناخته‌شده‌ای باز است', () => {
    for (const role of Object.keys(ROLES)) {
      expect(canAccess(role, '/')).toBe(true)
    }
  })
})
