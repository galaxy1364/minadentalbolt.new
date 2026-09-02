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

/**
 * MOD-FEAT-035 | آلارم خودکار و بستن حلقه
 *
 * گزارش مهدی: «وقتی که تحویل گرفته شد باید برنامه اتوماتیک آلارم بده که
 * باید برای این بیمار وقت گذاشته بشه برای نوبت‌دهی برای تحویل کار.»
 *
 * این همان شکافی است که یک روکش آماده را در کشو نگه می‌دارد: سفارش دیگر
 * **دیرکرد ندارد** — لابراتوار کارش را کرده — پس هشدار دیرکرد دقیقاً
 * لحظه‌ای ساکت می‌شود که مطب باید اقدام کند. هیچ‌چیز دیگری نگاه نمی‌کرد.
 */
import { findLabAwaitingDeliveryAppointment, buildClinicalFollowUps } from './followUps'

const labOrder = (over: Record<string, unknown> = {}) => ({
  id: 'lo1', patient_id: 'p1', status: 'ordered',
  deadline: null, received_at: null, delivered: false,
  delivery_appointment_id: null, description: 'روکش زیرکونیا', ...over,
}) as never

describe('🔴 آلارم: کار رسیده و نوبتی گذاشته نشده', () => {
  it('کارِ رسیده بدون نوبت، هشدار می‌گیرد', () => {
    const out = findLabAwaitingDeliveryAppointment([labOrder({ received_at: '2026-08-25' })], TODAY)
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('lab_awaiting_delivery')
    expect(out[0].detail).toContain('نوبت تحویل گذاشته نشده')
  })

  it('🔴 با ثبت نوبت، هشدار خودش محو می‌شود', () => {
    // مشتق‌شده است، نه ذخیره‌شده — یادآور نوشته‌شده باید دستی پاک شود و
    // آنکه پاک نمی‌شود، نویزی است که آدم را به نادیده گرفتن فهرست عادت
    // می‌دهد.
    const out = findLabAwaitingDeliveryAppointment(
      [labOrder({ received_at: '2026-08-25', delivery_appointment_id: 'apt-1' })], TODAY)
    expect(out).toEqual([])
  })

  it('کاری که هنوز نرسیده، کارِ این هشدار نیست', () => {
    expect(findLabAwaitingDeliveryAppointment([labOrder({ deadline: '2026-08-20' })], TODAY)).toEqual([])
  })

  it('کار تحویل‌شده هشدار نمی‌گیرد', () => {
    expect(findLabAwaitingDeliveryAppointment(
      [labOrder({ received_at: '2026-08-25', delivered: true })], TODAY)).toEqual([])
  })

  it('سفارش لغو‌شده هشدار نمی‌گیرد', () => {
    expect(findLabAwaitingDeliveryAppointment(
      [labOrder({ received_at: '2026-08-25', status: 'cancelled' })], TODAY)).toEqual([])
  })

  it('🔴 هرچه بیشتر مانده، فوری‌تر', () => {
    // روکشی که سه هفته پیش رسیده باید بالاتر از دیروزی باشد.
    const [old_, recent] = [
      findLabAwaitingDeliveryAppointment([labOrder({ id: 'a', received_at: '2026-08-11' })], TODAY)[0],
      findLabAwaitingDeliveryAppointment([labOrder({ id: 'b', received_at: '2026-08-31' })], TODAY)[0],
    ]
    expect(old_.daysLate).toBeGreaterThan(recent.daysLate)
  })

  it('در فهرست کلی پیگیری‌ها هم می‌آید', () => {
    const all = buildClinicalFollowUps([labOrder({ received_at: '2026-08-25' })], [], [], TODAY)
    expect(all.some((f) => f.kind === 'lab_awaiting_delivery')).toBe(true)
  })
})

/** قفل ساختاری: فرستنده حالا گیرنده دارد. */
import appointments from '../pages/Appointments.tsx?raw'

describe('🔴 حلقه بسته می‌شود', () => {
  it('نوبت‌دهی ورودی سفارش لابراتوار را می‌خواند', () => {
    expect(appointments).toContain('labOrderId')
    expect(appointments).toContain('pendingLabOrderId')
  })

  it('پس از ثبت نوبت، پیوند به سفارش نوشته می‌شود', () => {
    expect(appointments).toContain('delivery_appointment_id: created.id')
  })

  it('شکست پیوند، ثبت نوبت را شکست‌خورده نشان نمی‌دهد', () => {
    // نوبت در هر حال ذخیره شده؛ پیام باید همان را بگوید.
    expect(appointments).toContain('نوبت ثبت شد ولی به سفارش لابراتوار وصل نشد')
  })
})

/**
 * MOD-FIX-018 | موعد یک روز است، نه یک لحظه
 *
 * در عکس مهدی: نواری زرد روی سفارشی که «هنوز ارسال نشده» بود و می‌گفت
 * «علی‌رغم موعد — ۰ روز تاخیر».
 *
 * علت: `new Date(deadline) < new Date()`. سررسید تاریخِ بدون ساعت است و
 * نیمه‌شب خوانده می‌شود؛ طرف دیگر لحظه‌ی جاری است. پس **هر سفارشی از یک
 * دقیقه بعد از نیمه‌شبِ روزِ سررسیدش دیرکرده حساب می‌شد** — و همان
 * حساب، صفر روز تاخیر گزارش می‌کرد، که خودش می‌گفت هیچ تاخیری نیست.
 */
import { deadlineState } from './labClinicMilestones'

describe('🔴 وضعیت موعد', () => {
  it('🔴 سفارشی که امروز موعدش است، دیرکرده نیست', () => {
    // همان حالتی که «۰ روز تاخیر» تولید می‌کرد.
    const st = deadlineState({ deadline: TODAY } as never, TODAY)
    expect(st.kind).toBe('due_today')
    expect(st.days).toBe(0)
  })

  it('دیروز، یک روز تاخیر', () => {
    const st = deadlineState({ deadline: '2026-08-31' } as never, TODAY)
    expect(st.kind).toBe('late')
    expect(st.days).toBe(1)
  })

  it('فردا، یک روز مانده', () => {
    const st = deadlineState({ deadline: '2026-09-02' } as never, TODAY)
    expect(st.kind).toBe('ontime')
    expect(st.days).toBe(1)
  })

  it('روزهای تاخیر همیشه مثبت گزارش می‌شود', () => {
    // کارت «۳ روز تاخیر» می‌نویسد، نه «−۳».
    expect(deadlineState({ deadline: '2026-08-29' } as never, TODAY).days).toBe(3)
  })

  it('بدون موعد، وضعیتی نیست', () => {
    expect(deadlineState({} as never, TODAY).kind).toBe('none')
    expect(deadlineState({ deadline: 'خراب' } as never, TODAY).kind).toBe('none')
  })

  it('ساعت روی نتیجه اثر ندارد', () => {
    // همان تاریخ، با و بدون بخش زمان، باید یکی باشد.
    expect(deadlineState({ deadline: `${TODAY}T23:59:00Z` } as never, TODAY).kind).toBe('due_today')
  })
})

/** قفل ساختاری: مقایسه‌ی لحظه‌ای و عبارت غلط برنگردند. */
import laboratoryPage from '../pages/Laboratory.tsx?raw'

describe('🔴 صفحه‌ی لابراتوار از منطق مشترک استفاده می‌کند', () => {
  it('مقایسه‌ی تاریخ با لحظه‌ی جاری حذف شده', () => {
    expect(laboratoryPage).not.toContain('return deadline < now')
  })

  it('از deadlineState استفاده می‌کند', () => {
    expect(laboratoryPage).toContain('deadlineState(order as never')
  })

  it('«علی‌رغم موعد» دیگر به کاربر نشان داده نمی‌شود', () => {
    // یعنی «با وجودِ موعد» — چیزی که برای سفارش دیرکرده معنی نمی‌دهد.
    // فقط رشته‌های داخل JSX و برچسب‌ها سنجیده می‌شوند؛ کامنتی که توضیح
    // می‌دهد چرا عبارت عوض شد باید بماند.
    const codeOnly = laboratoryPage
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n')
    expect(codeOnly).not.toContain('علی‌رغم موعد')
    expect(codeOnly).toContain('از موعد گذشته')
  })
})
