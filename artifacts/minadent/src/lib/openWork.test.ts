/**
 * MOD-FEAT-037 | تست کار باز و رنگ فوریت
 *
 * گزارش مهدی: «هر ماژول که کار باز دارد گزینه بالای لوگو داک پایین اضافه
 * شود و اگر از موعدش بگذرد رنگش از سبز به زرد و قرمز تبدیل شود.»
 */
import { describe, it, expect } from 'vitest'
import { labOpenWork, appointmentsOpenWork, billingOpenWork, LEVEL_COLORS } from './openWork'

const TODAY = '2026-09-03'
const order = (over: Record<string, unknown> = {}) => ({
  status: 'ordered', deadline: null, received_at: null, delivered: false,
  delivery_appointment_id: null, ...over,
})

describe('🔴 لابراتوار — سبز، زرد، قرمز', () => {
  it('سفارش سر وقت، سبز', () => {
    const w = labOpenWork([order({ deadline: '2026-09-20' })], TODAY)
    expect(w).toEqual({ count: 1, level: 'ok' })
  })

  it('موعد امروز، زرد', () => {
    expect(labOpenWork([order({ deadline: TODAY })], TODAY).level).toBe('warn')
  })

  it('از موعد گذشته، قرمز', () => {
    expect(labOpenWork([order({ deadline: '2026-08-30' })], TODAY).level).toBe('late')
  })

  it('🔴 بدترین حالت برنده است، نه میانگین', () => {
    // یک روکش دیرکرده میان ده روکش سر وقت، هنوز یک روکش دیرکرده است.
    const many = [
      ...Array.from({ length: 10 }, (_, i) => order({ deadline: '2026-09-20', id: i })),
      order({ deadline: '2026-08-30' }),
    ]
    const w = labOpenWork(many, TODAY)
    expect(w.count).toBe(11)
    expect(w.level).toBe('late')
  })

  it('🔴 رسیده و بدون نوبت، قرمز — کار گیرکرده', () => {
    expect(labOpenWork([order({ received_at: '2026-09-01' })], TODAY).level).toBe('late')
  })

  it('رسیده با نوبت، دیگر گیر نیست', () => {
    expect(labOpenWork([order({ received_at: '2026-09-01', delivery_appointment_id: 'a' })], TODAY).level).toBe('ok')
  })

  it('تحویل‌شده و لغو‌شده شمرده نمی‌شوند', () => {
    const w = labOpenWork([
      order({ delivered: true }),
      order({ status: 'delivered' }),
      order({ status: 'cancelled', deadline: '2026-01-01' }),
    ], TODAY)
    expect(w.count).toBe(0)
    expect(w.level).toBe('ok')
  })
})

describe('نوبت‌های امروز', () => {
  it('فقط امروز، فقط تمام‌نشده', () => {
    const w = appointmentsOpenWork([
      { date: TODAY, status: 'scheduled' },
      { date: TODAY, status: 'completed' },
      { date: TODAY, status: 'cancelled' },
      { date: '2026-09-04', status: 'scheduled' },
    ], TODAY)
    expect(w.count).toBe(1)
  })

  it('نوبت امروز هرگز «دیر» نیست', () => {
    // خودِ روز، سررسید است.
    expect(appointmentsOpenWork([{ date: TODAY, status: 'scheduled' }], TODAY).level).toBe('ok')
  })
})

describe('مالی', () => {
  it('بدهکار همیشه قرمز — پول سررسید ندارد', () => {
    expect(billingOpenWork(3)).toEqual({ count: 3, level: 'late' })
    expect(billingOpenWork(0)).toEqual({ count: 0, level: 'ok' })
  })
})

describe('رنگ‌ها یک زبان دارند', () => {
  it('سه سطح، سه رنگ متمایز', () => {
    const vals = Object.values(LEVEL_COLORS)
    expect(new Set(vals).size).toBe(3)
  })
})

/** قفل ساختاری: نوار پایین دیگر فقط مالی را نشان نمی‌دهد. */
import layout from '../components/Layout.tsx?raw'
import laboratory from '../pages/Laboratory.tsx?raw'

describe('🔴 نشان روی هر ماژول با کار باز', () => {
  it('نوار پایین از نقشه‌ی عمومی می‌خواند', () => {
    expect(layout).toContain("'/laboratory': labOpenWork(")
    expect(layout).toContain("'/appointments': appointmentsOpenWork(")
    expect(layout).toContain('LEVEL_COLORS[w.level]')
  })

  it('شرط قدیمیِ «فقط مالی» حذف شده', () => {
    expect(layout).not.toContain("item.path === '/billing' && debtorCount")
  })

  it('نوار روند هر حلقه رنگ خودش را دارد و دیرکرد قرمز می‌شود', () => {
    expect(laboratory).toContain('MILESTONE_COLORS[m.key]')
    expect(laboratory).toContain('late ? LEVEL_COLORS.late')
  })

  it('اقدام بعدی یک دکمه‌ی واقعی است، نه متن ۱۱ پیکسلی', () => {
    expect(laboratory).toContain('backgroundColor: MILESTONE_COLORS[next.key]')
  })
})
