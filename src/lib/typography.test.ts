/**
 * MOD-TEST-005 | تست‌های مقیاس تایپوگرافی
 *
 * تمرکز اصلی: تضمین ریاضی سلسله‌مراتب. اگر روزی کسی نسبت یا یک
 * توکن را دستکاری کند و تیتر کوچک‌تر از متن شود، رابط کاربری
 * بی‌معنا می‌شود — این تست‌ها جلوی آن را می‌گیرند.
 */
import { describe, it, expect } from 'vitest'
import {
  SCALE_RATIO, TYPE_TOKENS, scaleStep, lineHeightFor, fluidClamp,
  BASE_MIN_PX, BASE_MAX_PX, type TypeToken,
} from './typography'

describe('مقیاس مدولار', () => {
  it('پله‌ی صفر همان اندازه‌ی پایه است', () => {
    expect(scaleStep(0)).toBe(1)
  })

  it('هر پله‌ی مثبت دقیقاً به نسبت مقیاس بزرگ‌تر می‌شود', () => {
    expect(scaleStep(1)).toBeCloseTo(SCALE_RATIO, 4)
    expect(scaleStep(2)).toBeCloseTo(SCALE_RATIO ** 2, 4)
  })

  it('پله‌ی منفی کوچک‌تر از پایه است', () => {
    expect(scaleStep(-1)).toBeLessThan(1)
    expect(scaleStep(-2)).toBeLessThan(scaleStep(-1))
  })
})

describe('سلسله‌مراتب توکن‌ها — تضمین ریاضی', () => {
  /**
   * مهم‌ترین تست این فایل: ترتیب باید همیشه نزولی باشد. اگر کسی
   * مقادیر را دستی عوض کند و مثلاً caption از body بزرگ‌تر شود،
   * این تست می‌شکند.
   */
  it('توکن‌ها باید به‌ترتیب اکید نزولی باشند', () => {
    const order: TypeToken[] = ['display', 'title-lg', 'title', 'heading', 'body', 'caption', 'micro']
    for (let i = 1; i < order.length; i++) {
      expect(TYPE_TOKENS[order[i]]).toBeLessThan(TYPE_TOKENS[order[i - 1]])
    }
  })

  it('متن پایه دقیقاً ۱rem است تا تنظیمات مرورگر کاربر محترم بماند', () => {
    expect(TYPE_TOKENS.body).toBe(1)
  })

  it('هیچ توکنی نباید صفر یا منفی باشد', () => {
    for (const v of Object.values(TYPE_TOKENS)) {
      expect(v).toBeGreaterThan(0)
    }
  })

  /**
   * ریزترین متن نباید آن‌قدر کوچک شود که غیرقابل‌خواندن باشد.
   * ۰.۶۴rem روی پایه‌ی ۱۵px حدود ۹.۶px است — مرز پایین قابل قبول.
   */
  it('ریزترین توکن نباید زیر آستانه‌ی خوانایی برود', () => {
    expect(TYPE_TOKENS.micro * BASE_MIN_PX).toBeGreaterThanOrEqual(9)
  })
})

describe('line-height نسبتی', () => {
  it('تیتر بزرگ فشرده‌تر از متن است', () => {
    expect(lineHeightFor(TYPE_TOKENS.display)).toBeLessThan(lineHeightFor(TYPE_TOKENS.body))
  })

  it('متن ریز بازتر از متن اصلی است', () => {
    expect(lineHeightFor(TYPE_TOKENS.micro)).toBeGreaterThan(lineHeightFor(TYPE_TOKENS.body))
  })

  /**
   * فارسی به فضای عمودی بیشتری نیاز دارد. حد پایین ۱.۶ عمدی است
   * (توصیه‌ی استاندارد لاتین ۱.۴ است).
   */
  it('متن اصلی برای خط فارسی حداقل ۱.۶ فاصله دارد', () => {
    expect(lineHeightFor(TYPE_TOKENS.body)).toBeGreaterThanOrEqual(1.6)
  })

  it('هیچ line-height ای خارج از بازه‌ی معقول نیست', () => {
    for (const size of Object.values(TYPE_TOKENS)) {
      const lh = lineHeightFor(size)
      expect(lh).toBeGreaterThanOrEqual(1.1)
      expect(lh).toBeLessThanOrEqual(2)
    }
  })
})

describe('fluidClamp — دسترس‌پذیری زوم', () => {
  /**
   * حیاتی: اگر clamp فقط vw داشته باشد، زوم مرورگر بی‌اثر می‌شود و
   * کاربری که برای خواندن زوم می‌کند هیچ تغییری نمی‌بیند. جمله‌ی
   * rem اجباری است.
   */
  it('حتماً باید جمله‌ی rem داشته باشد وگرنه زوم می‌شکند', () => {
    const result = fluidClamp(BASE_MIN_PX, BASE_MAX_PX)
    expect(result).toContain('rem')
    expect(result).toMatch(/rem\s*\+/) // جمله‌ی rem در بخش میانی
  })

  it('ساختار clamp با سه مقدار تولید می‌شود', () => {
    const result = fluidClamp(15, 17)
    expect(result.startsWith('clamp(')).toBe(true)
    expect(result.split(',').length).toBe(3)
  })

  it('حد پایین کوچک‌تر از حد بالا است', () => {
    const result = fluidClamp(15, 17)
    const min = parseFloat(result.match(/clamp\(([\d.]+)rem/)![1])
    const max = parseFloat(result.match(/,\s*([\d.]+)rem\)$/)![1])
    expect(min).toBeLessThan(max)
  })
})
