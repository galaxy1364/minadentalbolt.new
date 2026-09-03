/**
 * MOD-FEAT-039 | تست زنجیره‌ی ایمپلنت
 *
 * گزارش مهدی: «تمام مراحل ایمپلنت: نوبت‌دهی و جراحی و تایم بستن هیلینگ
 * و تایم نوبت برای قالب‌گیری و یادآوری گرفتن عکس OPG و بعد ارسال به
 * لابراتوار و بعد پیگیری و تحویل از لابراتوار و تحویل به بیمار.»
 *
 * `stage` دستی جلو می‌رفت و می‌گفت آخرین بار چه چیزی کلیک شده، نه چه
 * اتفاقی افتاده. این‌ها از تاریخ‌ها مشتق می‌شوند.
 */
import { describe, it, expect } from 'vitest'
import {
  healingEndDate, healingComplete, implantMilestones, nextImplantAction, implantDeadline,
} from './implantMilestones'

const TODAY = '2026-09-04'
const c = (over: Record<string, unknown> = {}) => ({
  surgery_date: null, healing_months: null, opg_reminder_date: null,
  impression_date: null, lab_order_id: null, crown_delivery_date: null,
  success_status: 'pending', surgery_appointment_id: null, ...over,
}) as never

describe('🔴 هیلینگ یک انتظار با طول معلوم است', () => {
  it('پایان هیلینگ = جراحی + ماه‌ها', () => {
    expect(healingEndDate(c({ surgery_date: '2026-06-01', healing_months: 3 }))).toBe('2026-09-01')
  })

  it('روز ۳۱ به آخر ماه کوتاه چسبانده می‌شود، نه پرتاب به ماه بعد', () => {
    // همان کلاس باگی که در اقساط بود؛ اینجا از اول درست است.
    expect(healingEndDate(c({ surgery_date: '2026-01-31', healing_months: 1 }))).toBe('2026-02-28')
  })

  it('بدون جراحی یا بدون مدت، پایانی نیست', () => {
    expect(healingEndDate(c({ healing_months: 3 }))).toBeNull()
    expect(healingEndDate(c({ surgery_date: '2026-06-01' }))).toBeNull()
    expect(healingEndDate(c({ surgery_date: '2026-06-01', healing_months: 0 }))).toBeNull()
  })

  it('🔴 هیلینگ وقتی تمام است که انتظار تمام شده، نه وقتی تنظیم شده', () => {
    expect(healingComplete(c({ surgery_date: '2026-06-01', healing_months: 3 }), TODAY)).toBe(true)
    expect(healingComplete(c({ surgery_date: '2026-08-01', healing_months: 3 }), TODAY)).toBe(false)
  })
})

describe('🔴 یک اقدام بعدی — و در هیلینگ، هیچ', () => {
  it('بدون جراحی: نوبت جراحی', () => {
    expect(nextImplantAction(c(), TODAY)!.key).toBe('surgery_booked')
  })

  it('جراحی در آینده: در انتظار، نه اقدام', () => {
    expect(nextImplantAction(c({ surgery_date: '2026-10-01' }), TODAY)!.label).toContain('انتظار')
  })

  it('جراحی شده ولی مدت هیلینگ تعیین نشده', () => {
    expect(nextImplantAction(c({ surgery_date: '2026-08-01' }), TODAY)!.key).toBe('healing')
  })

  it('🔴 در هیلینگ، پاسخ «صبر» است با تاریخ شمسی', () => {
    // کارتی که در انتظار اجباری دکمه بدهد، دعوت به کار اشتباه است.
    const n = nextImplantAction(c({ surgery_date: '2026-08-01', healing_months: 3 }), TODAY)!
    expect(n.key).toBe('wait')
    expect(n.label).toContain('هیلینگ تا')
    expect(n.label).toMatch(/آبان|مهر|آذر/)
    expect(n.label).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('بعد از هیلینگ: OPG، قالب‌گیری، لابراتوار، تحویل — به ترتیب', () => {
    const base = { surgery_date: '2026-05-01', healing_months: 3 }
    expect(nextImplantAction(c(base), TODAY)!.key).toBe('opg')
    expect(nextImplantAction(c({ ...base, opg_reminder_date: '2026-08-15' }), TODAY)!.key).toBe('impression')
    expect(nextImplantAction(c({ ...base, opg_reminder_date: '2026-08-15', impression_date: '2026-08-20' }), TODAY)!.key).toBe('lab')
    expect(nextImplantAction(c({ ...base, opg_reminder_date: '2026-08-15', impression_date: '2026-08-20', lab_order_id: 'lo' }), TODAY)!.key).toBe('delivered')
  })

  it('روکش تحویل‌شده، اقدامی ندارد', () => {
    expect(nextImplantAction(c({
      surgery_date: '2026-05-01', healing_months: 3, opg_reminder_date: '2026-08-15',
      impression_date: '2026-08-20', lab_order_id: 'lo', crown_delivery_date: '2026-09-01',
    }), TODAY)).toBeNull()
  })

  it('مورد ناموفق، اقدامی ندارد', () => {
    expect(nextImplantAction(c({ success_status: 'failed' }), TODAY)).toBeNull()
  })
})

describe('حلقه‌ها', () => {
  it('هفت حلقه به ترتیب', () => {
    expect(implantMilestones(c(), TODAY).map((m) => m.key))
      .toEqual(['surgery_booked', 'surgery', 'healing', 'opg', 'impression', 'lab', 'delivered'])
  })

  it('جراحیِ آینده، انجام‌شده نیست', () => {
    const m = implantMilestones(c({ surgery_date: '2026-10-01' }), TODAY)
    expect(m.find((x) => x.key === 'surgery_booked')!.done).toBe(true)
    expect(m.find((x) => x.key === 'surgery')!.done).toBe(false)
  })

  it('🔴 هیچ حلقه‌ای به ستون stage نگاه نمی‌کند', () => {
    // یک مورد با stage='completed' ولی بدون هیچ تاریخی، همچنان اول
    // زنجیره است — چون واقعاً هیچ اتفاقی نیفتاده.
    const m = implantMilestones(c({ stage: 'completed' }), TODAY)
    expect(m.filter((x) => x.done).map((x) => x.key)).toEqual([])
  })
})

describe('رنگ کارت از موعد بعدی', () => {
  it('هیلینگ تمام‌شده و قالب‌گیری نشده: دیرکرد', () => {
    expect(implantDeadline(c({ surgery_date: '2026-05-01', healing_months: 3 }), TODAY).kind).toBe('late')
  })

  it('هیلینگ در جریان: سر وقت', () => {
    expect(implantDeadline(c({ surgery_date: '2026-08-15', healing_months: 3 }), TODAY).kind).toBe('ontime')
  })
})

/** قفل ساختاری: صفحه از زنجیره‌ی مشتق‌شده استفاده می‌کند. */
import implantsPage from '../pages/Implants.tsx?raw'

describe('🔴 صفحه‌ی ایمپلنت زنجیره‌ی مشتق‌شده را نشان می‌دهد', () => {
  it('از implantMilestones و nextImplantAction استفاده می‌کند', () => {
    expect(implantsPage).toContain('implantMilestones(')
    expect(implantsPage).toContain('nextImplantAction(')
  })
})

describe('🔴 یک نوار پیشرفت، و راهی به مالی', () => {
  it('نوار قدیمیِ مبتنی بر stage حذف شده', () => {
    // دو نوار روی یک کارت: یکی می‌گفت چه اتفاقی افتاده، دیگری چه چیزی
    // آخرین بار کلیک شده.
    expect(implantsPage).not.toContain('renderProgressBar(')
    expect(implantsPage).not.toContain('function getStageIndex')
  })

  it('هر کارت ایمپلنت میان‌بر پرداخت دارد', () => {
    // «هر کدام از این مراحل باید قابلیت ارسال به مالی وجود داشته باشد»
    expect(implantsPage).toContain('<PatientDebtBar')
    // MOD-FEAT-040: the two cost columns became lines; the total now
    // comes from caseTotal over the lines, not from adding the columns.
    expect(implantsPage).toContain('caseTotal(c.total_cost')
  })
})
