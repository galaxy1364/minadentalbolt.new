/**
 * MOD-TEST-006 | تست‌های سیستم حرکت
 *
 * تمرکز: قوانین حرکت که اگر نقض شوند رابط کاربری «کند» یا
 * «پرشی» حس می‌شود — و هیچ‌کدام با نگاه کردن به کد آشکار نیستند.
 */
import { describe, it, expect } from 'vitest'
import {
  DURATIONS, EASINGS, EXIT_RATIO, exitDuration,
  durationForTravel, staggerDelay, isGpuSafe,
  TRAVEL_MIN_FACTOR, TRAVEL_MAX_FACTOR,
  type Duration,
} from './motion'

describe('پله‌های مدت', () => {
  it('پله‌ها باید اکیداً صعودی باشند', () => {
    const order: Duration[] = ['instant', 'fast', 'base', 'slow']
    for (let i = 1; i < order.length; i++) {
      expect(DURATIONS[order[i]]).toBeGreaterThan(DURATIONS[order[i - 1]])
    }
  })

  /**
   * بازخورد فشردن باید زیر ۱۰۰ms باشد. بالاتر از آن، لمس «بی‌جواب»
   * حس می‌شود — کاربر شک می‌کند که آیا اصلاً زده یا نه و دوباره می‌زند.
   */
  it('بازخورد فشردن باید زیر آستانه‌ی ۱۰۰ میلی‌ثانیه باشد', () => {
    expect(DURATIONS.instant).toBeLessThan(100)
  })

  /**
   * حرکت بالای ۴۰۰ms در رابط کاربری کند حس می‌شود، مگر برای
   * جابه‌جایی‌های واقعاً بزرگ.
   */
  it('هیچ مدتی نباید از آستانه‌ی کندی عبور کند', () => {
    for (const d of Object.values(DURATIONS)) {
      expect(d).toBeLessThanOrEqual(400)
    }
  })
})

describe('عدم تقارن ورود و خروج', () => {
  it('خروج همیشه سریع‌تر از ورود متناظرش است', () => {
    for (const key of Object.keys(DURATIONS) as Duration[]) {
      expect(exitDuration(key)).toBeLessThan(DURATIONS[key])
    }
  })

  it('نسبت خروج در بازه‌ی معقول است (نه آنی، نه کند)', () => {
    expect(EXIT_RATIO).toBeGreaterThan(0.5)
    expect(EXIT_RATIO).toBeLessThan(1)
  })

  /**
   * منحنی خروج نباید کشش (overshoot) داشته باشد. کشش در خروج یعنی
   * عنصری که دارد می‌رود، برمی‌گردد — که آشفته به‌نظر می‌رسد.
   */
  it('منحنی خروج نباید کشش داشته باشد', () => {
    // در cubic-bezier، مقدار y بزرگ‌تر از ۱ یعنی کشش
    const exitYValues = EASINGS.exit.match(/[\d.]+/g)!.map(Number)
    expect(Math.max(...exitYValues)).toBeLessThanOrEqual(1)
    // در مقابل، منحنی تأکیدی عمداً کشش دارد
    const emphYValues = EASINGS.emphasized.match(/[\d.]+/g)!.map(Number)
    expect(Math.max(...emphYValues)).toBeGreaterThan(1)
  })
})

describe('مدت وابسته به مسافت', () => {
  it('مسافت بیشتر، مدت بیشتر می‌دهد', () => {
    expect(durationForTravel('base', 400)).toBeGreaterThan(durationForTravel('base', 100))
  })

  /**
   * رشد باید زیرخطی باشد: مسافت ۴ برابر نباید مدت ۴ برابر بدهد،
   * وگرنه جابه‌جایی‌های بلند غیرقابل‌تحمل کند می‌شوند.
   */
  it('رشد باید زیرخطی باشد نه خطی', () => {
    const short = durationForTravel('base', 160)
    const fourTimesFarther = durationForTravel('base', 640)
    expect(fourTimesFarther).toBeLessThan(short * 4)
    expect(fourTimesFarther).toBeGreaterThan(short)
  })

  it('ضریب هرگز از محدوده خارج نمی‌شود', () => {
    const tiny = durationForTravel('base', 1)
    const huge = durationForTravel('base', 100000)
    expect(tiny).toBeGreaterThanOrEqual(Math.round(DURATIONS.base * TRAVEL_MIN_FACTOR))
    expect(huge).toBeLessThanOrEqual(Math.round(DURATIONS.base * TRAVEL_MAX_FACTOR))
  })

  it('مسافت صفر یا منفی، مدت پایه را برمی‌گرداند', () => {
    expect(durationForTravel('fast', 0)).toBe(DURATIONS.fast)
    expect(durationForTravel('fast', -50)).toBe(DURATIONS.fast)
  })
})

describe('تأخیر پلکانی فهرست', () => {
  it('اولین آیتم بدون تأخیر است', () => {
    expect(staggerDelay(0)).toBe(0)
  })

  it('تأخیر با اندیس افزایش می‌یابد', () => {
    expect(staggerDelay(3)).toBeGreaterThan(staggerDelay(1))
  })

  /**
   * حیاتی برای فهرست‌های بلند: تأخیر باید افت کند. با تأخیر خطی،
   * آیتم پنجاهم دو ثانیه دیر ظاهر می‌شود که یعنی فهرست «کند بارگذاری
   * می‌شود» — دقیقاً برعکس هدف انیمیشن.
   */
  it('تأخیر باید با افزایش اندیس افت کند نه خطی بماند', () => {
    const linear50 = staggerDelay(1) * 50
    expect(staggerDelay(50)).toBeLessThan(linear50)
  })

  it('حتی در فهرست بسیار بلند، تأخیر معقول می‌ماند', () => {
    expect(staggerDelay(100)).toBeLessThan(3000)
  })
})

describe('ایمنی GPU', () => {
  it('transform و opacity امن هستند', () => {
    expect(isGpuSafe('transform')).toBe(true)
    expect(isGpuSafe('opacity')).toBe(true)
  })

  /**
   * این خواص بازمحاسبه‌ی چیدمان می‌خواهند و باعث پرش می‌شوند.
   * یک نمونه‌ی واقعی از همین اپ رفع شد: نشانگر تب `width` را
   * انیمیت می‌کرد.
   */
  it('خواص چیدمانی باید ناامن تشخیص داده شوند', () => {
    for (const prop of ['width', 'height', 'margin', 'padding', 'top', 'left']) {
      expect(isGpuSafe(prop)).toBe(false)
    }
  })

  it('فاصله‌ی اضافی نباید تشخیص را بشکند', () => {
    expect(isGpuSafe('  transform  ')).toBe(true)
  })
})
