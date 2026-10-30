/**
 * MOD-TEST-004 | تست‌های سیستم متریال iOS 27
 *
 * تمرکز: هیچ ورودی خرابی نباید رابط کاربری را از کار بیندازد، و
 * ترتیب خوانایی سطوح باید ریاضی‌وار تضمین شود — چون در یک نرم‌افزار
 * پزشکی، خوانا نبودن یعنی خطای درمانی.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MATERIAL_VALUES, DEFAULT_LEVEL, isValidLevel,
  getMaterialLevel, setMaterialLevel, applyMaterialLevel,
  prefersReducedTransparency, initMaterialSystem,
  type MaterialLevel,
} from './materials'

// شبیه‌سازی محیط مرورگر (Vitest به‌صورت پیش‌فرض در Node اجرا می‌شود)
const store: Record<string, string> = {}
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
  const styleProps: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
  })
  vi.stubGlobal('document', {
    documentElement: {
      style: {
        setProperty: (k: string, v: string) => { styleProps[k] = v },
        _props: styleProps,
      },
      dataset: {} as Record<string, string>,
    },
  })
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false }),
  })
})

describe('اعتبارسنجی سطح متریال', () => {
  it('سطوح معتبر پذیرفته می‌شوند', () => {
    for (const level of Object.keys(MATERIAL_VALUES)) {
      expect(isValidLevel(level)).toBe(true)
    }
  })

  it('مقادیر نامعتبر رد می‌شوند', () => {
    expect(isValidLevel('ultra-glass')).toBe(false)
    expect(isValidLevel(null)).toBe(false)
    expect(isValidLevel(42)).toBe(false)
    expect(isValidLevel(undefined)).toBe(false)
  })
})

describe('خوانایی — تضمین ریاضی ترتیب سطوح', () => {
  /**
   * این مهم‌ترین تست این فایل است. اگر روزی کسی مقادیر را دستکاری
   * کند و مثلاً «مات» شفاف‌تر از «شیشه‌ای» شود، رابط کاربری بی‌معنا
   * می‌شود. این تست جلوی آن را می‌گیرد.
   */
  it('هرچه از solid به vivid می‌رویم، شفافیت باید یکنواخت بیشتر شود', () => {
    const order: MaterialLevel[] = ['solid', 'subtle', 'standard', 'vivid']
    for (let i = 1; i < order.length; i++) {
      expect(MATERIAL_VALUES[order[i]].opacity)
        .toBeLessThan(MATERIAL_VALUES[order[i - 1]].opacity)
      expect(MATERIAL_VALUES[order[i]].blur)
        .toBeGreaterThan(MATERIAL_VALUES[order[i - 1]].blur)
    }
  })

  it('سطح مات باید کاملاً کدر و بدون blur باشد', () => {
    expect(MATERIAL_VALUES.solid.opacity).toBe(1)
    expect(MATERIAL_VALUES.solid.blur).toBe(0)
  })

  it('هیچ سطحی نباید شفافیت خارج از بازه‌ی معتبر داشته باشد', () => {
    for (const v of Object.values(MATERIAL_VALUES)) {
      expect(v.opacity).toBeGreaterThan(0)
      expect(v.opacity).toBeLessThanOrEqual(1)
      expect(v.blur).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('ذخیره و بازیابی', () => {
  it('بدون مقدار ذخیره‌شده، پیش‌فرض برمی‌گردد', () => {
    expect(getMaterialLevel()).toBe(DEFAULT_LEVEL)
  })

  it('مقدار ذخیره‌شده بازیابی می‌شود', () => {
    setMaterialLevel('vivid')
    expect(getMaterialLevel()).toBe('vivid')
  })

  /**
   * محافظت از باگ واقعی: اگر نسخه‌ی قدیمی برنامه مقدار دیگری ذخیره
   * کرده باشد یا کاربر دستی دستکاری کند، رابط کاربری نباید بشکند.
   */
  it('مقدار ذخیره‌شده‌ی خراب نباید برنامه را بشکند', () => {
    store['minadent_material_level'] = 'مقدار-نامعتبر'
    expect(getMaterialLevel()).toBe(DEFAULT_LEVEL)
  })
})

describe('اعمال روی متغیرهای CSS', () => {
  it('هر سه متغیر روی ریشه نوشته می‌شوند', () => {
    applyMaterialLevel('vivid')
    const props = (document.documentElement.style as unknown as { _props: Record<string, string> })._props
    expect(props['--glass-blur']).toBe('44px')
    expect(props['--glass-opacity']).toBe('0.62')
    expect(props['--glass-saturate']).toBe('220%')
  })

  it('سطح نامعتبر باعث خطا نمی‌شود و به پیش‌فرض برمی‌گردد', () => {
    expect(() => applyMaterialLevel('خراب' as MaterialLevel)).not.toThrow()
    const props = (document.documentElement.style as unknown as { _props: Record<string, string> })._props
    expect(props['--glass-opacity']).toBe(String(MATERIAL_VALUES[DEFAULT_LEVEL].opacity))
  })
})

describe('دسترس‌پذیری — کاهش شفافیت سیستمی', () => {
  it('وقتی کاربر کاهش شفافیت را فعال کرده، به مات اجبار می‌شود', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    store['minadent_material_level'] = 'vivid' // کاربر شیشه‌ای انتخاب کرده بود
    expect(initMaterialSystem()).toBe('solid') // ولی دسترس‌پذیری مقدم است
  })

  it('بدون ترجیح سیستمی، انتخاب کاربر محترم شمرده می‌شود', () => {
    store['minadent_material_level'] = 'vivid'
    expect(initMaterialSystem()).toBe('vivid')
  })

  it('نبود matchMedia (مرورگر قدیمی) نباید خطا بدهد', () => {
    vi.stubGlobal('window', {})
    expect(() => prefersReducedTransparency()).not.toThrow()
    expect(prefersReducedTransparency()).toBe(false)
  })
})
