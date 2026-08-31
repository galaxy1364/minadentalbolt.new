/**
 * MOD-FIX-009 | تست صداقت پیام ثبت پرسنل
 *
 * باگ واقعی که مهدی گزارش کرد: «داخل برنامه تعریف می‌کنم که این جیمیل با
 * این رمز وارد بشه، ولی با همان رمز وارد نمی‌شود.»
 *
 * علتش این بود که ذخیره‌ی پرسنل و ساخت حساب ورود دو نوشتن جدا هستند، و
 * توست سبز **بین** آن دو شلیک می‌شد — قبل از اینکه دومی حتی امتحان شود.
 * پس وقتی ساخت حساب شکست می‌خورد، کاربر یک سبز می‌دید و پرسنل هم در
 * فهرست ظاهر می‌شد؛ یعنی همه‌ی نشانه‌های موفقیت، بدون حسابی که کل هدف
 * فرم بود.
 */
import { describe, it, expect } from 'vitest'
import { staffSaveMessage } from './staffSaveOutcome'

describe('وقتی حساب ورود خواسته نشده', () => {
  it('ثبت ساده موفق است', () => {
    expect(staffSaveMessage('created', 'not_requested')).toEqual({ type: 'success', text: 'پرسنل ثبت شد' })
  })

  it('ویرایش ساده موفق است', () => {
    expect(staffSaveMessage('updated', 'not_requested').type).toBe('success')
  })

  it('وعده‌ی حساب ورود نمی‌دهد', () => {
    expect(staffSaveMessage('created', 'not_requested').text).not.toContain('حساب ورود')
  })
})

describe('وقتی حساب ورود ساخته شد', () => {
  it('هر دو بخش گزارش می‌شوند', () => {
    const m = staffSaveMessage('created', 'created')
    expect(m.type).toBe('success')
    expect(m.text).toContain('حساب ورود ساخته شد')
  })
})

describe('🔴 وقتی حساب ورود ساخته نشد', () => {
  it('نتیجه خطاست، نه موفقیت', () => {
    // قلب باگ: این حالت قبلاً سبز گزارش می‌شد.
    expect(staffSaveMessage('created', 'failed').type).toBe('error')
  })

  it('صریح می‌گوید این شخص نمی‌تواند وارد شود', () => {
    expect(staffSaveMessage('created', 'failed').text).toContain('نمی‌تواند وارد شود')
  })

  it('هرگز نمی‌گوید حساب ورود ساخته شد', () => {
    expect(staffSaveMessage('created', 'failed').text).not.toContain('حساب ورود ساخته شد')
  })

  it('دلیل واقعی سرور را نشان می‌دهد', () => {
    const m = staffSaveMessage('created', 'failed', 'فقط مدیر کلینیک می‌تواند حساب کاربری بسازد')
    expect(m.text).toContain('فقط مدیر کلینیک')
    expect(m.type).toBe('error')
  })

  it('دلیل خالی یا فاصله‌ای پیام را بی‌معنی نمی‌کند', () => {
    for (const reason of ['', '   ', undefined]) {
      const m = staffSaveMessage('created', 'failed', reason)
      expect(m.type).toBe('error')
      expect(m.text).toContain('نمی‌تواند وارد شود')
      expect(m.text).not.toMatch(/:\s*$/)
    }
  })

  it('ذخیره شدن پرسنل هم گفته می‌شود — کار نصفه گم نمی‌شود', () => {
    // رکورد پرسنل واقعاً نوشته شده؛ پنهان کردنش باعث ثبت دوباره می‌شود.
    expect(staffSaveMessage('created', 'failed').text).toContain('پرسنل ثبت شد')
    expect(staffSaveMessage('updated', 'failed').text).toContain('پرسنل ویرایش شد')
  })
})
