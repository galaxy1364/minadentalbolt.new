/**
 * MOD-TEST-003 | تست‌های کنترل دسترسی نقش‌محور
 *
 * این تست‌ها امنیتی هستند: هر تست یک نشتی دسترسی واقعی را می‌بندد.
 * مثلاً دستیار نباید بتواند حقوق پرسنل یا مالی شخصی مالک را ببیند.
 */
import { describe, it, expect } from 'vitest'
import { canAccess, ROLES, allowedPaths } from './permissions'

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
    // MOD-FIX-017: کلید نقش از 'lab' به 'lab_technician' رسید — همان
    // مقداری که جدول staff واقعاً ذخیره می‌کند. کلید قدیمی در هیچ
    // رکوردی نبود، پس این تست مرزی را می‌سنجید که هیچ‌کس رویش نبود.
    expect(canAccess('lab_technician', '/patients')).toBe(false)
    expect(canAccess('lab_technician', '/billing')).toBe(false)
    // فقط کار خودش
    expect(canAccess('lab_technician', '/laboratory')).toBe(true)
    expect(canAccess('lab_technician', '/implants')).toBe(true)
    // کلید قدیمی دیگر وجود ندارد و نباید دسترسی بدهد.
    expect(canAccess('lab', '/laboratory')).toBe(false)
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

/**
 * MOD-FIX-017 | یک واژگان نقش
 *
 * در دیتابیس زنده پنج کارمند بودند و **سه نفرشان** نقشی داشتند که فقط در
 * `Staff.tsx` تعریف شده بود — مدیر، و دو تکنسین لابراتوار. هیچ‌کدام در
 * نقشه‌ی دسترسی نبودند، پس `canAccess` برایشان فقط داشبورد برمی‌گرداند.
 *
 * هر دو فهرست به‌تنهایی کامل به نظر می‌رسیدند؛ به همین دلیل هیچ‌کدام
 * غلط خوانده نمی‌شد.
 */
import staffPage from '../pages/Staff.tsx?raw'

describe('🔴 هر نقشی که کارکنان می‌سازد، دسترسی تعریف‌شده دارد', () => {
  it('نقش‌های واقعیِ دیتابیس شناخته‌شده‌اند', () => {
    // این چهار مقدار امروز در جدول staff هستند.
    for (const role of ['doctor', 'assistant', 'manager', 'lab_technician']) {
      expect(Object.keys(ROLES), role).toContain(role)
    }
  })

  it('🔴 هیچ نقشی بی‌صدا به داشبورد محدود نمی‌شود', () => {
    // نقشی که در نقشه نباشد، همان حالتی است که سه نفر را قفل کرد.
    for (const role of Object.keys(ROLES)) {
      const paths = allowedPaths(role)
      expect(paths.length, role).toBeGreaterThan(0)
    }
  })

  it('نقش‌های غیربالینی عمداً فقط داشبورد دارند', () => {
    // فهرست خالیِ عمدی، تصمیم است؛ نبودن از نقشه، اشتباه.
    for (const role of ['cleaner', 'security', 'other']) {
      expect(allowedPaths(role), role).toEqual(['/'])
    }
  })

  it('صفحه‌ی کارکنان فهرست دوم نمی‌سازد', () => {
    expect(staffPage).toContain('Object.entries(ROLES)')
    expect(staffPage).not.toMatch(/\{ value: 'doctor', label: 'پزشک'/)
  })
})

describe('دسترسی هر نقش منطقی است', () => {
  it('مدیر همه‌جا می‌رود جز دفتر شخصی مالک', () => {
    expect(canAccess('manager', '/staff')).toBe(true)
    expect(canAccess('manager', '/personal-finance')).toBe(false)
  })

  it('🔴 پزشک سفارش لابراتواری که خودش فرستاده را می‌بیند', () => {
    // فرم درمان سفارش را می‌سازد؛ پیش از این پزشک نمی‌توانست بعداً
    // نگاهش کند.
    expect(canAccess('doctor', '/laboratory')).toBe(true)
  })

  it('تکنسین لابراتوار به پرونده‌ی مالی بیماران نمی‌رود', () => {
    expect(canAccess('lab_technician', '/laboratory')).toBe(true)
    expect(canAccess('lab_technician', '/billing')).toBe(false)
    expect(canAccess('lab_technician', '/patients')).toBe(false)
  })

  it('بهداشتکار مثل دستیار است، نه بیشتر', () => {
    expect(canAccess('hygienist', '/treatments')).toBe(true)
    expect(canAccess('hygienist', '/billing')).toBe(false)
  })

  it('حسابدار به درمان دسترسی ندارد', () => {
    expect(canAccess('accountant', '/billing')).toBe(true)
    expect(canAccess('accountant', '/treatments')).toBe(false)
  })

  it('نظافتچی جایی جز داشبورد باز نمی‌کند', () => {
    expect(canAccess('cleaner', '/')).toBe(true)
    expect(canAccess('cleaner', '/patients')).toBe(false)
  })
})
