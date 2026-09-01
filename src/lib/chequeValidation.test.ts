/**
 * MOD-FEAT-029 | تست قانون ثبت چک
 *
 * قانونی که مهدی تعریف کرد:
 *
 *   «یه گزینه به عنوان ضمانت بذار که وقتی فعالش کردیم اون چک بابت
 *    ضمانته و اقساط بتونیم تعیین بکنیم — مبلغ دلخواه و جمع کل دلخواه.
 *    در صورتی که گزینه ضمانت رو نزدیم، یعنی اون چک باید حتماً پر بشه و
 *    حتماً پاس بشه.»
 *
 * تا امروز فرم چک `purpose: 'payment'` را **ثابت** می‌نوشت. چک ضمانت
 * چیزی بود که نوع داده می‌شناخت و فهرست نمایشش می‌داد، ولی هیچ‌جای
 * برنامه نمی‌توانست بسازدش — پس هر ضمانت واقعی مجبور بود به‌عنوان چک
 * پرداخت ثبت شود، یعنی همان نوعی که انتظار می‌رود پاس شود.
 */
import { describe, it, expect } from 'vitest'
import { validateCheque, chequeModeHint } from './chequeValidation'

const draft = (over: Partial<Parameters<typeof validateCheque>[0]> = {}) => ({
  patient_id: 'p1', amount: '5000000', isGuarantee: false,
  cheque_number: '123456', bank_name: 'ملت', due_date: '2026-10-01',
  payment_plan_id: null, ...over,
})

describe('🔴 چک پرداخت باید کامل باشد — چون قرار است پاس شود', () => {
  it('چک کامل قابل ثبت است', () => {
    expect(validateCheque(draft()).error).toBeNull()
    expect(validateCheque(draft()).purpose).toBe('payment')
  })

  it('بدون شماره چک ثبت نمی‌شود', () => {
    expect(validateCheque(draft({ cheque_number: '' })).error).toContain('شماره چک')
  })

  it('بدون نام بانک ثبت نمی‌شود', () => {
    expect(validateCheque(draft({ bank_name: '  ' })).error).toContain('نام بانک')
  })

  it('بدون تاریخ سررسید ثبت نمی‌شود', () => {
    expect(validateCheque(draft({ due_date: null })).error).toContain('سررسید')
  })

  it('🔴 جلوی ثبت را می‌گیرد، نه اینکه فقط هشدار بدهد', () => {
    // استاندارد پروژه: فیلد اجباری که فقط هشدار بدهد ممنوع است.
    expect(validateCheque(draft({ cheque_number: '' })).error).not.toBeNull()
  })
})

describe('🔴 چک ضمانت — طرح قسطی لازم دارد، مشخصات بانکی نه', () => {
  it('با طرح قسطی قابل ثبت است', () => {
    const v = validateCheque(draft({ isGuarantee: true, payment_plan_id: 'plan-1' }))
    expect(v.error).toBeNull()
    expect(v.purpose).toBe('guarantee')
  })

  it('🔴 بدون طرح قسطی ثبت نمی‌شود', () => {
    // گرفتن ضمانت نصف کار است؛ وثیقه‌ای بدون برنامه‌ی وصولی، وثیقه‌ای
    // است که کسی وصولش نمی‌کند.
    const v = validateCheque(draft({ isGuarantee: true, payment_plan_id: null }))
    expect(v.error).toContain('طرح قسطی')
  })

  it('بدون شماره چک و بانک هم قابل ثبت است', () => {
    // نگه داشته می‌شود، خرج نمی‌شود — پس این‌ها لازم نیستند.
    const v = validateCheque(draft({
      isGuarantee: true, payment_plan_id: 'plan-1',
      cheque_number: '', bank_name: '', due_date: '',
    }))
    expect(v.error).toBeNull()
  })

  it('مبلغ ضمانت آزاد است — می‌تواند بسیار بیشتر از اقساط باشد', () => {
    // «مبلغ دلخواه و جمع کل دلخواه» — وثیقه‌ی پنجاه میلیونی در برابر
    // اقساط دو میلیونی طبیعی است.
    const v = validateCheque(draft({ isGuarantee: true, payment_plan_id: 'plan-1', amount: '500000000' }))
    expect(v.error).toBeNull()
  })
})

describe('قواعد مشترک هر دو نوع', () => {
  it('بدون بیمار هیچ‌کدام ثبت نمی‌شوند', () => {
    expect(validateCheque(draft({ patient_id: '' })).error).toContain('بیمار')
    expect(validateCheque(draft({ patient_id: '', isGuarantee: true })).error).toContain('بیمار')
  })

  it('مبلغ صفر یا منفی رد می‌شود', () => {
    for (const amount of ['0', '', '-500']) {
      expect(validateCheque(draft({ amount })).error, amount).toContain('مبلغ')
    }
  })

  it('مبلغ با جداکننده هم خوانده می‌شود', () => {
    expect(validateCheque(draft({ amount: '5,000,000' })).error).toBeNull()
  })
})

describe('مرحله‌ی اعتبارسنجی', () => {
  it('در گام اول، نبودِ مشخصات بانکی ایراد نیست', () => {
    // فرم هنوز آن فیلدها را نشان نداده؛ رد کردنشان یعنی گلایه از چیزی
    // که کاربر ندیده است.
    const v = validateCheque(draft({ cheque_number: '', bank_name: '' }), 'basics')
    expect(v.error).toBeNull()
  })

  it('در گام اول، ضمانت بدون طرح همچنان رد می‌شود', () => {
    // آن انتخاب در همین گام است.
    const v = validateCheque(draft({ isGuarantee: true, payment_plan_id: null }), 'basics')
    expect(v.error).toContain('طرح قسطی')
  })
})

describe('توضیح هر حالت', () => {
  it('حالت پرداخت می‌گوید باید پاس شود', () => {
    expect(chequeModeHint(false)).toContain('پاس')
  })

  it('حالت ضمانت می‌گوید خرج نمی‌شود', () => {
    expect(chequeModeHint(true)).toContain('خرج نمی‌شود')
  })
})

/** قفل ساختاری: گزینه واقعاً در فرم هست و purpose ثابت نیست. */
import billing from '../pages/Billing.tsx?raw'

describe('🔴 گزینه‌ی ضمانت در فرم وجود دارد', () => {
  it('چک‌باکس ضمانت هست', () => {
    expect(billing).toContain('این چک ضمانت است')
  })

  it("purpose دیگر ثابت 'payment' نوشته نمی‌شود", () => {
    expect(billing).not.toContain("purpose: 'payment', payment_plan_id: null,")
    expect(billing).toContain("chequeForm.isGuarantee ? 'guarantee' : 'payment'")
  })

  it('اعتبارسنجی از قانون مشترک می‌آید، نه شرط درون‌خطی', () => {
    expect(billing).toContain('validateCheque(')
  })
})
