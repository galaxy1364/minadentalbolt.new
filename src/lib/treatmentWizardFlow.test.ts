/**
 * MOD-FEAT-021 | تست ترتیب چارت‌محور
 *
 * سناریوی واقعی: پزشک روی چارت دندان ۳۸ را می‌زند و «درمان جدید» را
 * می‌زند. تا v1.181 ویزارد روی گام «رویه درمانی» باز می‌شد و گام بعد
 * دوباره کل چارت پالمر را نشان می‌داد تا همان دندان را دوباره انتخاب کند.
 */
import { describe, it, expect } from 'vitest'
import {
  TREATMENT_STEP_ORDER, startingStepIndex, toothStepMode,
  surfaceAlreadyKnown, seededSummary,
} from './treatmentWizardFlow'

const label = (v: string) => ({ occlusal: 'اکلوزال', distal: 'دیستال' }[v] || v)

describe('🔴 دندان قبل از رویه پرسیده می‌شود', () => {
  it('اولین گام، دندان است', () => {
    expect(TREATMENT_STEP_ORDER[0]).toBe('tooth')
  })

  it('رویه بعد از دندان می‌آید', () => {
    // کار از دندان شروع می‌شود، نه از رویه.
    expect(TREATMENT_STEP_ORDER.indexOf('tooth')).toBeLessThan(TREATMENT_STEP_ORDER.indexOf('procedure'))
  })

  it('ترتیب کامل و بدون تکرار است', () => {
    expect([...TREATMENT_STEP_ORDER]).toEqual(['tooth', 'procedure', 'handoff', 'notes'])
    expect(new Set(TREATMENT_STEP_ORDER).size).toBe(TREATMENT_STEP_ORDER.length)
  })
})

describe('🔴 دندانی که از چارت آمده دوباره پرسیده نمی‌شود', () => {
  it('ویزارد مستقیم روی گام رویه باز می‌شود', () => {
    expect(startingStepIndex({ toothNumber: '38' })).toBe(1)
  })

  it('بدون دندان، از گام اول شروع می‌شود', () => {
    expect(startingStepIndex({})).toBe(0)
    expect(startingStepIndex({ toothNumber: null })).toBe(0)
    expect(startingStepIndex({ toothNumber: '   ' })).toBe(0)
  })

  it('گام دندان به حالت «تأیید» می‌رود، نه انتخاب دوباره', () => {
    expect(toothStepMode({ toothNumber: '38' })).toBe('confirm')
  })

  it('بدون دندان، انتخابگر کامل نشان داده می‌شود', () => {
    expect(toothStepMode({})).toBe('pick')
  })

  it('🔴 دندان پنهان نمی‌شود — فقط دوباره پرسیده نمی‌شود', () => {
    // ویزاردی که دندانی نامرئی با خودش حمل کند، همان جایی است که
    // دندان اشتباه صورتحساب می‌شود.
    expect(seededSummary({ toothNumber: '38' }, label)).toBe('دندان 38')
  })

  it('سطح هم اگر آمده باشد در خلاصه دیده می‌شود', () => {
    expect(seededSummary({ toothNumber: '6', toothSurface: 'distal' }, label))
      .toBe('دندان 6 — دیستال')
  })

  it('بدون دندان خلاصه‌ای ساخته نمی‌شود', () => {
    expect(seededSummary({}, label)).toBeNull()
  })
})

describe('ویرایش، رفتار متفاوتی دارد', () => {
  it('ویرایش همیشه از گام اول شروع می‌شود', () => {
    // کاربر آمده چیزی را عوض کند و شاید نداند در کدام گام است.
    expect(startingStepIndex({ toothNumber: '38', isEditing: true })).toBe(0)
  })

  it('در ویرایش، انتخابگر کامل دندان در دسترس است', () => {
    expect(toothStepMode({ toothNumber: '38', isEditing: true })).toBe('pick')
  })
})

describe('تشخیص اینکه سطح از قبل معلوم است', () => {
  it('سطح موجود شناسایی می‌شود', () => {
    expect(surfaceAlreadyKnown({ toothSurface: 'occlusal' })).toBe(true)
  })

  it('سطح خالی، فاصله‌دار یا null یعنی نامعلوم', () => {
    for (const v of ['', '   ', null, undefined]) {
      expect(surfaceAlreadyKnown({ toothSurface: v as never })).toBe(false)
    }
  })
})

/**
 * قفل ساختاری روی خودِ صفحه: ترتیب گام‌ها و نبودِ پرسش دوباره،
 * چیزی است که به‌راحتی در بازآرایی بعدی برمی‌گردد.
 */
import treatmentsPage from '../pages/Treatments.tsx?raw'

describe('🔴 صفحه‌ی درمان‌ها ترتیب چارت‌محور را حفظ می‌کند', () => {
  it('گام «دندان و سطح» قبل از «رویه و هزینه» تعریف شده', () => {
    const tooth = treatmentsPage.indexOf("label: 'دندان و سطح'")
    const procedure = treatmentsPage.indexOf("label: 'رویه و هزینه'")
    expect(tooth).toBeGreaterThan(-1)
    expect(procedure).toBeGreaterThan(-1)
    expect(tooth).toBeLessThan(procedure)
  })

  it('گام قدیمی «دندان و هزینه» دیگر وجود ندارد', () => {
    // قیمت به گام رویه رفت؛ قیمت‌گذاری پیش از دانستن رویه بی‌معنی بود.
    expect(treatmentsPage).not.toContain("label: 'دندان و هزینه'")
  })

  it('ورود از چارت، گام دندان را رد می‌کند', () => {
    expect(treatmentsPage).toContain('setTreatWizardStep(startingStepIndex(')
  })

  it('انتخابگر پالمر پشت شرط «تأیید یا انتخاب» است', () => {
    expect(treatmentsPage).toContain('toothStepMode(')
  })

  it('امکان تغییر دندان باقی می‌ماند', () => {
    expect(treatmentsPage).toContain('تغییر دندان')
  })
})
