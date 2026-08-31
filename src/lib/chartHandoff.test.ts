/**
 * MOD-FEAT-022 | تست تحویل دندان از چارت
 *
 * ممیزی MOD-TEST-001: چارت فقط `onAddTreatment` داشت. لابراتوار و
 * ایمپلنت هیچ دری از چارت نداشتند، پس همان دندانی که پزشک لمس کرده بود
 * در ماژول بعدی از صفر دوباره پرسیده می‌شد.
 */
import { describe, it, expect } from 'vitest'
import { buildChartHandoff, readChartHandoff } from './chartHandoff'

const ctx = { toothNumber: '38', surface: 'distal', patientId: 'pat-1', doctorId: 'doc-1' }

describe('🔴 چارت حالا به لابراتوار و ایمپلنت هم در دارد', () => {
  it('لابراتوار مقصد درست را می‌گیرد', () => {
    expect(buildChartHandoff('lab', ctx)?.path).toBe('/laboratory')
  })

  it('ایمپلنت مقصد درست را می‌گیرد', () => {
    expect(buildChartHandoff('implant', ctx)?.path).toBe('/implants')
  })

  it('دندان و سطح هر دو منتقل می‌شوند', () => {
    const h = buildChartHandoff('lab', ctx)!
    expect(h.state.quickStartToothNumber).toBe('38')
    expect(h.state.quickStartToothSurface).toBe('distal')
  })

  it('بیمار و پزشک هم همراه می‌روند', () => {
    const h = buildChartHandoff('implant', ctx)!
    expect(h.state.quickStartPatientId).toBe('pat-1')
    expect(h.state.quickStartDoctorId).toBe('doc-1')
  })
})

describe('درمان از چارت جابه‌جا نمی‌شود', () => {
  it('برای درمان مقصدی ساخته نمی‌شود', () => {
    // درمان داخل همان ویزیتِ باز ثبت می‌شود؛ رفتن به صفحه‌ی دیگر
    // یعنی رها کردن ویزیت.
    expect(buildChartHandoff('treatment', ctx)).toBeNull()
  })
})

describe('تحویل ناقص ساخته نمی‌شود', () => {
  it('بدون دندان، تحویلی در کار نیست', () => {
    expect(buildChartHandoff('lab', { ...ctx, toothNumber: '' })).toBeNull()
  })

  it('بدون بیمار، تحویلی در کار نیست', () => {
    expect(buildChartHandoff('lab', { ...ctx, patientId: '' })).toBeNull()
  })

  it('نبودِ سطح مانع نیست — فقط null منتقل می‌شود', () => {
    const h = buildChartHandoff('lab', { ...ctx, surface: null })!
    expect(h.state.quickStartToothSurface).toBeNull()
    expect(h.state.quickStartToothNumber).toBe('38')
  })
})

describe('صفحه‌ی مقصد تحویل را می‌خواند', () => {
  it('رفت و برگشت کامل سالم است', () => {
    const h = buildChartHandoff('implant', ctx)!
    expect(readChartHandoff(h.state)).toEqual({
      toothNumber: '38', surface: 'distal', patientId: 'pat-1', doctorId: 'doc-1',
    })
  })

  it('🔴 تحویل نصفه رد می‌شود، نه اینکه نصفه پر شود', () => {
    // فرمی که خودش با نصف جواب باز شود، بدتر از فرمی است که کاربر
    // عمداً بازش کرده — چون معلوم نیست چه چیزی پر شده و چه چیزی نه.
    expect(readChartHandoff({ quickStartToothNumber: '38' })).toBeNull()
    expect(readChartHandoff({ quickStartPatientId: 'pat-1' })).toBeNull()
  })

  it('ورودی نامعتبر برنامه را نمی‌شکند', () => {
    for (const bad of [null, undefined, 'رشته', 42, [], {}]) {
      expect(readChartHandoff(bad)).toBeNull()
    }
  })

  it('ورود عادی به صفحه (بدون تحویل) چیزی را باز نمی‌کند', () => {
    expect(readChartHandoff({ someOtherState: true })).toBeNull()
  })
})

/**
 * قفل ساختاری: چارت باید هر سه در را داشته باشد و هر دو ماژول مقصد
 * باید تحویل را بخوانند. حذف بی‌صدای هر کدام، تست را می‌شکند.
 */
import dentalChart from '../components/DentalChart.tsx?raw'
import treatmentsPage from '../pages/Treatments.tsx?raw'
import laboratoryPage from '../pages/Laboratory.tsx?raw'
import implantsPage from '../pages/Implants.tsx?raw'

describe('🔴 چارت سه در دارد، نه یکی', () => {
  it('هر سه callback در چارت تعریف شده‌اند', () => {
    for (const cb of ['onAddTreatment', 'onAddLabOrder', 'onAddImplantCase']) {
      expect(dentalChart, cb).toContain(cb)
    }
  })

  it('هر سه دکمه در ویرایشگر دندان هستند', () => {
    for (const label of ['افزودن درمان', 'سفارش لابراتوار', 'مورد ایمپلنت']) {
      expect(dentalChart, label).toContain(label)
    }
  })

  it('سطح دندان هم همراه شماره منتقل می‌شود', () => {
    expect(dentalChart).toContain('firstSurface')
    expect(dentalChart).toMatch(/onAddLabOrder\(String\(tooth\.number\), firstSurface\)/)
  })

  it('صفحه‌ی ویزیت هر دو در جدید را وصل کرده', () => {
    expect(treatmentsPage).toContain('onAddLabOrder=')
    expect(treatmentsPage).toContain('onAddImplantCase=')
  })

  it('هر دو ماژول مقصد تحویل را می‌خوانند', () => {
    expect(laboratoryPage).toContain('readChartHandoff')
    expect(implantsPage).toContain('readChartHandoff')
  })
})
