/**
 * MOD-FIX-011 | تست پوسته‌ی اسناد چاپی
 *
 * گزارش مهدی روی گوشی: «پرینت وارد می‌شم، گزینه پرینت یا دانلود یا ارسال
 * نداره، و گزینه برگشت نداره — باید برنامه را ببندم و دوباره وارد شوم.»
 *
 * این تست‌ها همان دام را قفل می‌کنند: هیچ سند چاپی نباید بدون راه خروج
 * ساخته شود.
 */
import { describe, it, expect } from 'vitest'
import { buildPrintDocument, escapeHtml } from './printDocument'

const doc = (over: Partial<Parameters<typeof buildPrintDocument>[0]> = {}) =>
  buildPrintDocument({ title: 'سند', styles: 'body{}', bodyHtml: '<p>محتوا</p>', ...over })

describe('🔴 هر سند چاپی راه خروج دارد', () => {
  it('دکمه‌ی بازگشت همیشه هست', () => {
    expect(doc()).toContain('بازگشت')
    expect(doc()).toContain('mndBack()')
  })

  it('اگر بستن پنجره کار نکرد، تاریخچه امتحان می‌شود', () => {
    expect(doc()).toContain('window.history.back()')
  })

  it('اگر هیچ‌کدام کار نکرد، به کاربر توضیح داده می‌شود', () => {
    // سکوت، همان چیزی بود که دام را ساخت.
    expect(doc()).toContain('mnd-hint')
    expect(doc()).toContain('برای بازگشت')
  })

  it('دکمه‌ی چاپ هست', () => {
    expect(doc()).toContain('mndPrint()')
    expect(doc()).toContain('>چاپ<')
  })
})

describe('نوار ابزار روی کاغذ نمی‌آید', () => {
  it('در حالت چاپ پنهان می‌شود', () => {
    expect(doc()).toMatch(/@media print \{[^}]*\.mnd-bar \{ display: none/)
  })
})

describe('اشتراک‌گذاری فقط وقتی معنی دارد', () => {
  it('بدون متن، دکمه‌ی ارسال ساخته نمی‌شود', () => {
    // دکمه‌ای که کاری نمی‌کند از نبودنش بدتر است.
    expect(doc()).not.toContain('ارسال برای بیمار')
  })

  it('با متن، دکمه‌ی ارسال هست', () => {
    expect(doc({ shareText: 'خلاصه' })).toContain('ارسال برای بیمار')
  })

  it('اگر اشتراک‌گذاری نبود، متن کپی می‌شود', () => {
    expect(doc({ shareText: 'خلاصه' })).toContain('navigator.clipboard')
  })
})

describe('محتوای بیمار نمی‌تواند سند را بشکند', () => {
  it('نقل‌قول و خط جدید در متن اشتراک، اسکریپت را خراب نمی‌کند', () => {
    const out = doc({ shareText: 'او گفت "سلام"\nخط دوم' })
    expect(out).toContain('\\"سلام\\"')
    expect(out).toContain('\\n')
  })

  it('بستن اسکریپت داخل متن بیمار خنثی می‌شود', () => {
    const out = doc({ shareText: '</script><script>alert(1)</script>' })
    expect(out).toContain('\\u003c/script')
    expect(out).not.toContain('<script>alert(1)')
  })

  it('عنوان در HTML امن است', () => {
    expect(doc({ title: '<img src=x onerror=1>' })).toContain('&lt;img')
  })

  it('escapeHtml همه‌ی نویسه‌های خطرناک را می‌گیرد', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
  })
})

describe('ساختار سند', () => {
  it('بدنه و استایل داده‌شده حفظ می‌شوند', () => {
    const out = doc({ styles: '.x{color:red}', bodyHtml: '<h1>سلام</h1>' })
    expect(out).toContain('.x{color:red}')
    expect(out).toContain('<h1>سلام</h1>')
  })

  it('راست‌به‌چپ و فارسی است', () => {
    expect(doc()).toContain('dir="rtl"')
    expect(doc()).toContain('lang="fa"')
  })

  it('روی گوشی مقیاس درست دارد', () => {
    expect(doc()).toContain('width=device-width')
  })

  it('چاپ خودکار انجام نمی‌شود', () => {
    // روی iOS بی‌صدا شکست می‌خورد و صفحه فقط «گیرکرده» به نظر می‌رسد.
    expect(doc()).not.toMatch(/setTimeout\([^)]*print/)
  })
})

/**
 * قفل ساختاری: هیچ صفحه‌ای اجازه ندارد دوباره سند چاپی دستی بسازد.
 * چهار جا این کار را می‌کردند و هر چهارتا همان دام بی‌راه‌خروج را داشتند.
 */
import billing from '../pages/Billing.tsx?raw'
import prescriptions from '../pages/Prescriptions.tsx?raw'
import patientDetail from '../pages/PatientDetail.tsx?raw'

describe('🔴 هیچ صفحه‌ای سند چاپی دستی نمی‌سازد', () => {
  const PAGES: [string, string][] = [
    ['Billing', billing], ['Prescriptions', prescriptions], ['PatientDetail', patientDetail],
  ]

  it('همه از پوسته‌ی مشترک استفاده می‌کنند', () => {
    for (const [name, src] of PAGES) {
      expect(src, name).toContain('buildPrintDocument')
    }
  })

  it('هیچ‌کدام DOCTYPE دستی نمی‌نویسند', () => {
    for (const [name, src] of PAGES) {
      expect(src, `${name} هنوز سند دستی می‌سازد`).not.toContain('<!DOCTYPE html>')
    }
  })

  it('هیچ‌کدام چاپ خودکار زمان‌دار ندارند', () => {
    for (const [name, src] of PAGES) {
      expect(src, name).not.toMatch(/setTimeout\(\(\) => win\.print\(\)/)
    }
  })
})
