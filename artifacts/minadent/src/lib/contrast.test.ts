/**
 * MOD-TEST-007 | ممیزی کنتراست پالت واقعی
 *
 * این تست‌ها فقط ریاضی را نمی‌سنجند — **پالت واقعی همین برنامه** را
 * در برابر WCAG 2.2 AA می‌سنجند. اگر روزی کسی رنگی را عوض کند و
 * خوانایی بشکند، بیلد شکست می‌خورد، نه اینکه کاربر متوجه شود.
 */
import { describe, it, expect } from 'vitest'
import {
  WCAG, hexToRgb, relativeLuminance, contrastRatio,
  passesAA, passesUI, contrastReport, PALETTE,
} from './contrast'

describe('صحت ریاضی — در برابر مقادیر مرجع W3C', () => {
  it('سیاه روی سفید بیشترین کنتراست ممکن (۲۱:۱) را می‌دهد', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21)
  })

  it('رنگ یکسان کنتراست ۱:۱ می‌دهد', () => {
    expect(contrastRatio('#0d9488', '#0d9488')).toBe(1)
  })

  it('ترتیب رنگ‌ها در نتیجه اثری ندارد', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(contrastRatio('#ffffff', '#000000'))
  })

  it('روشنایی سفید ۱ و سیاه ۰ است', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 4)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 4)
  })

  it('hex سه‌رقمی هم پشتیبانی می‌شود', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('رنگ نامعتبر خطای واضح می‌دهد نه نتیجه‌ی اشتباه', () => {
    expect(() => hexToRgb('#xyz123')).toThrow()
    expect(() => hexToRgb('نارنجی')).toThrow()
  })
})

describe('ممیزی پالت واقعی — متن اصلی', () => {
  /**
   * پرکاربردترین ترکیب کل برنامه: متن تیره روی کارت سفید.
   */
  it('متن اصلی روی سفید باید AA را پاس کند', () => {
    const r = contrastReport(PALETTE.slate[800], PALETTE.white)
    expect(r.aaNormal, `نسبت واقعی: ${r.ratio}`).toBe(true)
  })

  it('متن ثانویه روی سفید باید AA را پاس کند', () => {
    const r = contrastReport(PALETTE.slate[600], PALETTE.white)
    expect(r.aaNormal, `نسبت واقعی: ${r.ratio}`).toBe(true)
  })

  /**
   * slate-500 برای توضیحات ریز زیاد استفاده می‌شود. اگر AA را
   * رد کند، باید یا تیره‌تر شود یا فقط برای متن بزرگ به‌کار رود.
   */
  it('متن کم‌رنگ روی سفید — سنجش صریح', () => {
    const r = contrastReport(PALETTE.slate[500], PALETTE.white)
    expect(r.ratio).toBeGreaterThanOrEqual(WCAG.AA_LARGE)
  })

  /**
   * slate-400 در برنامه برای متن ریز راهنما استفاده شده. این تست
   * صریحاً ثبت می‌کند که برای متن معمولی کافی **نیست** — تا کسی
   * به‌اشتباه آن را برای متن اصلی به‌کار نبرد.
   */
  it('slate-400 برای متن معمولی کافی نیست — ثبت‌شده و آگاهانه', () => {
    expect(passesAA(PALETTE.slate[400], PALETTE.white, 'normal')).toBe(false)
  })
})

describe('ممیزی پالت واقعی — رنگ برند', () => {
  /**
   * دکمه‌های اصلی برنامه: متن سفید روی سبزآبی.
   *
   * یافته‌ی واقعی این ممیزی: primary-600 با متن سفید فقط **۳.۷۴:۱**
   * می‌دهد که زیر آستانه‌ی ۴.۵:۱ است — یعنی مهم‌ترین دکمه‌های برنامه
   * WCAG AA را رد می‌کردند. به primary-700 (۵.۴۷:۱) تغییر کرد.
   */
  it('متن سفید روی دکمه‌ی اصلی (primary-700) باید AA را پاس کند', () => {
    const r = contrastReport(PALETTE.white, PALETTE.primary[700])
    expect(r.aaNormal, `نسبت واقعی: ${r.ratio}`).toBe(true)
  })

  it('primary-800 حتی امن‌تر از primary-700 است (حالت هاور)', () => {
    expect(contrastRatio(PALETTE.white, PALETTE.primary[800]))
      .toBeGreaterThan(contrastRatio(PALETTE.white, PALETTE.primary[700]))
  })

  /**
   * ثبت صریح شکست‌های کشف‌شده تا کسی دوباره به‌اشتباه از آن‌ها برای
   * پس‌زمینه‌ی دکمه با متن سفید استفاده نکند. اگر روزی پالت اصلاح
   * شود، این تست‌ها می‌شکنند و یادآوری می‌کنند که به‌روزرسانی شوند.
   */
  it('primary-600 برای متن سفید کافی نیست — ثبت‌شده', () => {
    expect(passesAA(PALETTE.white, PALETTE.primary[600], 'normal')).toBe(false)
  })

  it('primary-500 حتی برای اجزای رابط هم کافی نیست — ثبت‌شده', () => {
    expect(passesUI(PALETTE.white, PALETTE.primary[500])).toBe(false)
  })
})

describe('ممیزی پالت واقعی — رنگ‌های وضعیت', () => {
  /**
   * حیاتی برای ایمنی: هشدار و خطا باید حتماً خوانده شوند.
   * یک هشدار محو در نرم‌افزار پزشکی یعنی هشداری که دیده نمی‌شود.
   */
  it('متن خطا روی پس‌زمینه‌ی روشنش باید AA را پاس کند', () => {
    const r = contrastReport(PALETTE.error[700], PALETTE.error[50])
    expect(r.aaNormal, `نسبت واقعی: ${r.ratio}`).toBe(true)
  })

  it('متن هشدار روی پس‌زمینه‌ی روشنش باید AA را پاس کند', () => {
    const r = contrastReport(PALETTE.warning[700], PALETTE.warning[50])
    expect(r.aaNormal, `نسبت واقعی: ${r.ratio}`).toBe(true)
  })

  it('متن موفقیت روی پس‌زمینه‌ی روشنش باید AA را پاس کند', () => {
    const r = contrastReport(PALETTE.success[700], PALETTE.success[50])
    expect(r.aaNormal, `نسبت واقعی: ${r.ratio}`).toBe(true)
  })

  /**
   * رنگ ۶۰۰ روی پس‌زمینه‌ی ۵۰ رایج‌ترین الگوی نشان‌ها (badge) در
   * برنامه است — صریحاً سنجیده می‌شود.
   */
  it('نشان‌های وضعیت (۶۰۰ روی ۵۰) حداقل معیار اجزای رابط را دارند', () => {
    for (const [name, pair] of [
      ['خطا', [PALETTE.error[600], PALETTE.error[50]]],
      ['هشدار', [PALETTE.warning[600], PALETTE.warning[50]]],
      ['موفقیت', [PALETTE.success[600], PALETTE.success[50]]],
    ] as const) {
      const r = contrastReport(pair[0], pair[1])
      expect(r.aaUI, `${name}: نسبت واقعی ${r.ratio}`).toBe(true)
    }
  })
})

describe('حالت تیره', () => {
  it('متن روشن روی پس‌زمینه‌ی تیره باید AA را پاس کند', () => {
    const r = contrastReport('#e2e8f0', PALETTE.slate[900])
    expect(r.aaNormal, `نسبت واقعی: ${r.ratio}`).toBe(true)
  })

  it('متن ثانویه در حالت تیره — سنجش صریح', () => {
    const r = contrastReport(PALETTE.slate[400], PALETTE.slate[900])
    expect(r.ratio).toBeGreaterThanOrEqual(WCAG.AA_LARGE)
  })
})

describe('اجزای رابط و فوکوس (WCAG 2.2 — معیار ۲.۴.۱۱)', () => {
  /**
   * معیار ۲.۴.۱۱ تازه در WCAG 2.2 اضافه شده و طبق منابع «بسیاری از
   * استایل‌های پیش‌فرض مرورگر را رد می‌کند». حلقه‌ی فوکوس برنامه
   * باید حداقل ۳:۱ با پس‌زمینه‌ی مجاورش کنتراست داشته باشد.
   */
  it('حلقه‌ی فوکوس روی سفید باید ۳:۱ داشته باشد', () => {
    expect(passesUI(PALETTE.primary[600], PALETTE.white)).toBe(true)
  })

  it('حلقه‌ی فوکوس روی کارت خاکستری روشن هم باید کافی باشد', () => {
    expect(passesUI(PALETTE.primary[600], PALETTE.slate[50])).toBe(true)
  })
})
