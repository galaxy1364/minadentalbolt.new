/**
 * MOD-FEAT-020 | تست «این پرداخت بابت چه بود»
 *
 * داده‌ی این تست از دیتابیس زنده در ۱۴۰۵/۰۶/۱۰ گرفته شده: «مهدی امیری»
 * دو بیلدآپ دارد — دندان ۱۱ به مبلغ ۱۰,۵۰۰,۰۰۰ و دندان ۳۸ به مبلغ
 * ۱۲,۰۰۰,۰۰۰ — و پنج پرداخت که هیچ‌کدام نمی‌گفتند بابت کدام‌اند.
 */
import { describe, it, expect } from 'vitest'
import {
  resolveAttribution, attributableTreatments, treatmentRemaining,
  TreatmentRef, DoctorRef,
} from './paymentAttribution'

const mina: DoctorRef = { id: 'doc-mina', name: 'مینا مازندارنی' }
const other: DoctorRef = { id: 'doc-2', name: 'سعید نوری' }
const doctors = [mina, other]

const t11: TreatmentRef = {
  id: 't-11', procedure_name: 'بیلدآپ', tooth_number: '11',
  doctor_id: 'doc-mina', total_price: 10_500_000, status: 'in_progress',
}
const t38: TreatmentRef = {
  id: 't-38', procedure_name: 'بیلدآپ', tooth_number: '38',
  doctor_id: 'doc-2', total_price: 12_000_000, status: 'planned',
}
const treatments = [t11, t38]

describe('🔴 پرداخت می‌گوید بابت کدام دندان و کدام پزشک', () => {
  it('دندان، رویه و پزشک را از درمان می‌خواند', () => {
    const a = resolveAttribution({ treatment_id: 't-11' }, treatments, doctors)
    expect(a.toothNumber).toBe('11')
    expect(a.procedureName).toBe('بیلدآپ')
    expect(a.doctorName).toBe('مینا مازندارنی')
  })

  it('یک خط خوانا برای فهرست و رسید می‌سازد', () => {
    expect(resolveAttribution({ treatment_id: 't-38' }, treatments, doctors).label)
      .toBe('بیلدآپ — دندان LL۸ — دکتر سعید نوری')  // MOD-FEAT-023: پالمر، نه FDI
  })

  it('دو بیلدآپ روی دو دندان از هم قابل تشخیص‌اند', () => {
    // بدون این، دو درمان هم‌نام در یک پرونده یکی به نظر می‌رسیدند.
    const a = resolveAttribution({ treatment_id: 't-11' }, treatments, doctors)
    const b = resolveAttribution({ treatment_id: 't-38' }, treatments, doctors)
    expect(a.label).not.toBe(b.label)
  })
})

describe('پرداخت بدون درمان مشخص', () => {
  it('اگر درمانی وصل نباشد، صریح می‌گوید مشخص نشده', () => {
    expect(resolveAttribution({}, treatments, doctors).label).toBe('بابت مشخص نشده')
  })

  it('پزشکِ خودِ پرداخت وقتی درمانی نیست استفاده می‌شود', () => {
    const a = resolveAttribution({ doctor_id: 'doc-mina' }, treatments, doctors)
    expect(a.doctorName).toBe('مینا مازندارنی')
    expect(a.toothNumber).toBeNull()
  })

  it('پزشکِ درمان بر پزشکِ پرداخت اولویت دارد', () => {
    // درمان، سند واقعی این است که کار را چه کسی انجام داده.
    const a = resolveAttribution({ treatment_id: 't-11', doctor_id: 'doc-2' }, treatments, doctors)
    expect(a.doctorName).toBe('مینا مازندارنی')
  })

  it('ارجاع به درمان ناموجود، برنامه را نمی‌شکند', () => {
    expect(resolveAttribution({ treatment_id: 'ندارد' }, treatments, doctors).label)
      .toBe('بابت مشخص نشده')
  })

  it('پزشک ناموجود، نام جعلی نمی‌سازد', () => {
    expect(resolveAttribution({ doctor_id: 'ندارد' }, treatments, doctors).doctorName).toBeNull()
  })
})

describe('کدام درمان‌ها قابل انتخاب‌اند', () => {
  it('فقط درمان‌های همین بیمار', () => {
    const list = attributableTreatments(treatments, ['t-11'])
    expect(list.map((t) => t.id)).toEqual(['t-11'])
  })

  it('🔴 درمان لغو‌شده قابل انتخاب نیست', () => {
    // وصل کردن پول به کاری که لغو شده، یعنی ثبت بازپرداخت به‌عنوان درآمد.
    const cancelled = [{ ...t11, status: 'cancelled' }, t38]
    expect(attributableTreatments(cancelled, ['t-11', 't-38']).map((t) => t.id)).toEqual(['t-38'])
  })

  it('اگر پرداخت از قبل به درمان لغو‌شده وصل بوده، پیوندش گم نمی‌شود', () => {
    const cancelled = [{ ...t11, status: 'cancelled' }, t38]
    const list = attributableTreatments(cancelled, ['t-11', 't-38'], 't-11')
    expect(list.map((t) => t.id)).toEqual(['t-11', 't-38'])
  })
})

describe('باقی‌مانده‌ی هر درمان', () => {
  const pay = (treatment_id: string | null, amount: number, status = 'completed') =>
    ({ treatment_id, amount, status })

  it('بدون پرداخت، کل مبلغ باقی است', () => {
    expect(treatmentRemaining(t11, [])).toBe(10_500_000)
  })

  it('پرداخت جزئی کم می‌شود', () => {
    expect(treatmentRemaining(t11, [pay('t-11', 4_000_000)])).toBe(6_500_000)
  })

  it('پرداخت درمان دیگر شمرده نمی‌شود', () => {
    expect(treatmentRemaining(t11, [pay('t-38', 12_000_000)])).toBe(10_500_000)
  })

  it('🔴 چک در انتظار، پول داده‌شده است', () => {
    // اگر «در انتظار» را بدهی حساب کنیم، از بیمار دو بار پول می‌گیریم.
    expect(treatmentRemaining(t11, [pay('t-11', 10_500_000, 'pending')])).toBe(0)
  })

  it('پرداخت لغو‌شده شمرده نمی‌شود', () => {
    expect(treatmentRemaining(t11, [pay('t-11', 10_500_000, 'cancelled')])).toBe(10_500_000)
  })

  it('اضافه‌پرداخت منفی می‌شود، نه صفر', () => {
    // پنهان کردنش با clamp، همان ۲۰ میلیونی است که ماه‌ها دیده نشد.
    expect(treatmentRemaining(t11, [pay('t-11', 12_000_000)])).toBe(-1_500_000)
  })
})
