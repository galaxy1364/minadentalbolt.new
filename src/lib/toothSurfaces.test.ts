/**
 * MOD-FEAT-026 | تست نماد ترکیبی سطوح
 *
 * ممیزی مورد ۳: `treatments.tooth_surface` **یک** سطح را به صورت یک
 * کلمه‌ی انگلیسی نگه می‌داشت و `lab_orders` اصلاً سطحی نداشت.
 *
 * ترمیم معمولاً **ترکیب** سطوح است. «MOD» — مزیو-اکلوزو-دیستال — یکی از
 * رایج‌ترین ترمیم‌هاست و با یک فیلد تک‌مقداری اصلاً قابل ثبت نبود.
 */
import { describe, it, expect } from 'vitest'
import {
  SURFACE_ORDER, parseSurfaces, formatSurfaces, surfacesInPersian,
  surfaceLabel, toggleSurface,
} from './toothSurfaces'

describe('🔴 ترکیب سطوح قابل ثبت است', () => {
  it('MOD خوانده و نوشته می‌شود', () => {
    expect(parseSurfaces('MOD')).toEqual(['M', 'O', 'D'])
    expect(formatSurfaces(['M', 'O', 'D'])).toBe('MOD')
  })

  it('هر پنج سطح با هم', () => {
    expect(formatSurfaces(['L', 'B', 'D', 'O', 'M'])).toBe('MODBL')
  })

  it('یک سطح تنها هم درست کار می‌کند', () => {
    expect(formatSurfaces(['O'])).toBe('O')
  })
})

describe('🔴 ترتیب متعارف است، نه الفبایی', () => {
  it('ترتیب استاندارد M O D B L است', () => {
    expect([...SURFACE_ORDER]).toEqual(['M', 'O', 'D', 'B', 'L'])
  })

  it('ورودی نامرتب، خروجی مرتب می‌دهد', () => {
    // «DOM» برای هیچ دندانپزشکی معنی ندارد.
    expect(formatSurfaces(['D', 'O', 'M'])).toBe('MOD')
    expect(formatSurfaces('DOM')).toBe('MOD')
  })

  it('تکرار حذف می‌شود', () => {
    // ستون نباید دو املای یک چیز را نگه دارد.
    expect(formatSurfaces('MDM')).toBe('MD')
  })
})

describe('سازگاری با داده‌ی قدیمی', () => {
  it('نام بلند انگلیسی هنوز خوانده می‌شود', () => {
    // رکوردهای پیش از migration 033
    expect(parseSurfaces('occlusal')).toEqual(['O'])
    expect(parseSurfaces('mesial')).toEqual(['M'])
    expect(parseSurfaces('lingual')).toEqual(['L'])
  })

  it('فهرست جداشده با کاما هم خوانده می‌شود', () => {
    expect(parseSurfaces('mesial,occlusal')).toEqual(['M', 'O'])
    expect(parseSurfaces('M,O,D')).toEqual(['M', 'O', 'D'])
  })

  it('نام قدیمی به کد تبدیل می‌شود، نه اینکه همان بماند', () => {
    expect(formatSurfaces('occlusal')).toBe('O')
  })
})

describe('ورودی نامعتبر برنامه را نمی‌شکند', () => {
  it('خالی، خالی می‌ماند', () => {
    for (const v of ['', '   ', null, undefined]) {
      expect(parseSurfaces(v as never)).toEqual([])
      expect(formatSurfaces(v as never)).toBe('')
    }
  })

  it('حرف ناشناخته دور ریخته می‌شود، نه اینکه خطا بدهد', () => {
    // سطح خراب نباید جلوی بارگذاری یک درمان را بگیرد.
    expect(parseSurfaces('MXZ')).toEqual(['M'])
    expect(parseSurfaces('XYZ')).toEqual([])
  })

  it('حروف کوچک هم پذیرفته می‌شوند', () => {
    expect(formatSurfaces('mod')).toBe('MOD')
  })
})

describe('نمایش فارسی', () => {
  it('نام‌ها به ترتیب متعارف می‌آیند', () => {
    expect(surfacesInPersian('MOD')).toBe('مزیال، اکلوزال، دیستال')
  })

  it('برچسب کامل، کد و نام را با هم دارد', () => {
    expect(surfaceLabel('MO')).toBe('MO — مزیال، اکلوزال')
  })

  it('خالی برچسبی نمی‌سازد', () => {
    expect(surfaceLabel('')).toBe('')
  })
})

describe('افزودن و برداشتن سطح', () => {
  it('سطح جدید در جای درست می‌نشیند', () => {
    expect(toggleSurface('O', 'M')).toBe('MO')
    expect(toggleSurface('MO', 'D')).toBe('MOD')
  })

  it('زدن دوباره، سطح را برمی‌دارد', () => {
    expect(toggleSurface('MOD', 'O')).toBe('MD')
  })

  it('برداشتن آخرین سطح، خالی می‌دهد', () => {
    expect(toggleSurface('O', 'O')).toBe('')
  })

  it('از مقدار قدیمی هم شروع می‌شود', () => {
    expect(toggleSurface('occlusal', 'M')).toBe('MO')
  })
})

/** قفل ساختاری: یک انتخابگر سطح، نه کرکره‌ی تک‌مقداری. */
import treatments from '../pages/Treatments.tsx?raw'
import laboratory from '../pages/Laboratory.tsx?raw'

describe('🔴 انتخاب سطح در هر دو فرم یکی است', () => {
  it('هر دو از کامپوننت مشترک استفاده می‌کنند', () => {
    expect(treatments).toContain('SurfaceSelect')
    expect(laboratory).toContain('SurfaceSelect')
  })

  it('کرکره‌ی تک‌مقداری سطح دیگر وجود ندارد', () => {
    // یک <Select> فقط یک مقدار برمی‌گرداند و «MOD» را نمی‌تواند بسازد.
    expect(treatments).not.toContain('label="سطح دندان"')
  })

  it('سفارش لابراتوار سطح را ذخیره می‌کند', () => {
    expect(laboratory).toContain('tooth_surface: formatSurfaces(')
  })
})
