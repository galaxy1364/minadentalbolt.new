/**
 * MOD-FEAT-034 | تست زنجیره‌ی مطب
 *
 * گزارش مهدی: «روند پرسلن‌گذاری و روند داخل لابراتوار برای اکانت
 * لابراتوار است، نه برای مطب. اینا با هم قاطی شدن.»
 *
 * مطب پنج حلقه دارد و هر کدام کاری است که منشی یا انجامش می‌دهد یا
 * منتظرش است. هیچ‌کدام از این تست‌ها به `stage` نگاه نمی‌کند.
 */
import { describe, it, expect } from 'vitest'
import {
  clinicMilestones, nextClinicAction, daysUntilDue, needsAttention,
} from './labClinicMilestones'

const TODAY = '2026-09-01'
const order = (over: Record<string, unknown> = {}) => ({
  sent_at: null, deadline: null, received_at: null,
  delivered: false, delivery_appointment_id: null, ...over,
})

describe('🔴 زنجیره‌ی مطب، نه زنجیره‌ی لابراتوار', () => {
  it('پنج حلقه به ترتیبی که مطب زندگی می‌کند', () => {
    expect(clinicMilestones(order()).map((m) => m.key))
      .toEqual(['sent', 'due', 'arrived', 'booked', 'delivered'])
  })

  it('هیچ مرحله‌ی داخلی لابراتوار در فهرست نیست', () => {
    // پخت، پرسلن‌گذاری، CAD/CAM و کنترل کیفی داخل ساختمان لابراتوارند.
    const labels = clinicMilestones(order()).map((m) => m.label).join(' ')
    for (const inside of ['پرسلن', 'CAD', 'کنترل کیفی', 'پیک']) {
      expect(labels, inside).not.toContain(inside)
    }
  })

  it('سفارش تازه هیچ حلقه‌ای کامل ندارد', () => {
    expect(clinicMilestones(order()).every((m) => !m.done)).toBe(true)
  })

  it('🔴 «موعد» با رسیدن کار تمام‌شده حساب می‌شود', () => {
    // تاریخی که واقعیت از آن جلو زده، دیگر چیزی نیست که کسی منتظرش باشد.
    const m = clinicMilestones(order({ deadline: '2026-09-20', received_at: '2026-09-05' }))
    expect(m.find((x) => x.key === 'due')!.done).toBe(true)
  })
})

describe('🔴 یک اقدام بعدی، نه چهارتا', () => {
  it('اول ارسال', () => {
    expect(nextClinicAction(order())!.key).toBe('sent')
  })

  it('بعد از ارسال، رسیدن', () => {
    expect(nextClinicAction(order({ sent_at: '2026-08-25' }))!.key).toBe('arrived')
  })

  it('🔴 بعد از رسیدن، نوبت — نه تحویل', () => {
    // کار اینجاست و بیمار نیست؛ همان شکافی که یک روکش آماده را سه هفته
    // در کشو نگه می‌دارد.
    const next = nextClinicAction(order({ sent_at: '2026-08-25', received_at: '2026-09-01' }))
    expect(next!.key).toBe('booked')
  })

  it('بعد از نوبت، تحویل', () => {
    const next = nextClinicAction(order({
      sent_at: '2026-08-25', received_at: '2026-09-01', delivery_appointment_id: 'apt-1',
    }))
    expect(next!.key).toBe('delivered')
  })

  it('زنجیره‌ی کامل، اقدامی ندارد', () => {
    expect(nextClinicAction(order({
      sent_at: '2026-08-25', received_at: '2026-09-01',
      delivery_appointment_id: 'apt-1', delivered: true,
    }))).toBeNull()
  })
})

describe('شمارش تا موعد', () => {
  it('روزهای مانده را می‌دهد', () => {
    expect(daysUntilDue(order({ deadline: '2026-09-11' }), TODAY)).toBe(10)
  })

  it('دیرکرد منفی می‌شود', () => {
    expect(daysUntilDue(order({ deadline: '2026-08-25' }), TODAY)).toBe(-7)
  })

  it('بعد از رسیدن، شمارش معنی ندارد', () => {
    // موعد گذشته تاریخ است؛ شمردنش نویز است.
    expect(daysUntilDue(order({ deadline: '2026-09-11', received_at: '2026-09-01' }), TODAY)).toBeNull()
  })

  it('بدون موعد، چیزی شمرده نمی‌شود', () => {
    expect(daysUntilDue(order(), TODAY)).toBeNull()
  })
})

describe('🔴 چه چیزی امروز به توجه نیاز دارد', () => {
  it('سفارش دیرکرده', () => {
    expect(needsAttention(order({ deadline: '2026-08-25' }), TODAY)).toBe(true)
  })

  it('🔴 رسیده ولی نوبتی گذاشته نشده', () => {
    // کار در کشوست و کسی نمی‌داند.
    expect(needsAttention(order({ received_at: '2026-09-01' }), TODAY)).toBe(true)
  })

  it('رسیده و نوبت دارد — نیازی نیست', () => {
    expect(needsAttention(order({ received_at: '2026-09-01', delivery_appointment_id: 'a' }), TODAY)).toBe(false)
  })

  it('تحویل‌شده نیازی ندارد', () => {
    expect(needsAttention(order({ received_at: '2026-09-01', delivered: true }), TODAY)).toBe(false)
  })

  it('در راه و سر وقت، نیازی ندارد', () => {
    expect(needsAttention(order({ sent_at: '2026-08-25', deadline: '2026-09-20' }), TODAY)).toBe(false)
  })
})

/** قفل ساختاری: مراحل داخلی لابراتوار از برنامه‌ی مطب برداشته شدند. */
import laboratory from '../pages/Laboratory.tsx?raw'

describe('🔴 مراحل داخلی لابراتوار در کارت مطب نیستند', () => {
  it('کارت از زنجیره‌ی مطب استفاده می‌کند', () => {
    expect(laboratory).toContain('clinicMilestones(order)')
    expect(laboratory).toContain('nextClinicAction(order)')
  })

  it('واژگان پایپ‌لاین لابراتوار دیگر تعریف نشده', () => {
    // کد یتیم ممنوع است؛ ستون stage در دیتابیس دست‌نخورده ماند.
    expect(laboratory).not.toContain('const LAB_STAGES')
    expect(laboratory).not.toContain('const advanceStage')
  })
})
