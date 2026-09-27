/**
 * MOD-FIX-007 | تست همگامی درمان و سفارش لابراتوار
 *
 * سناریوی واقعی که این تست جلوی برگشتش را می‌گیرد:
 * دکتر یک «بیلدآپ» ثبت می‌کند بدون لابراتوار. بعد پشیمان می‌شود، درمان را
 * ویرایش می‌کند و «ارسال به لابراتوار» را می‌زند. چیپ «لابراتوار» روی
 * ردیف درمان ظاهر می‌شود — ولی هیچ سفارشی برای لابراتوار ساخته نمی‌شود.
 * تا وقتی روکش نرسد کسی نمی‌فهمد.
 */
import { describe, it, expect } from 'vitest'
import { findLinkedLabOrder, decideLabHandoff, LabOrderLike } from './labHandoff'

const order = (over: Partial<LabOrderLike> = {}): LabOrderLike => ({
  id: 'o1', encounter_id: 'e1', lab_id: 'lab-a', tooth_number: '38', status: 'pending', ...over,
})

const treatment = (over: Partial<Parameters<typeof findLinkedLabOrder>[1]> = {}) => ({
  encounter_id: 'e1', lab_id: 'lab-a', tooth_number: '38', ...over,
})

describe('پیدا کردن سفارش لابراتوارِ یک درمان', () => {
  it('سفارش هم‌ویزیت، هم‌لابراتوار و هم‌دندان را پیدا می‌کند', () => {
    expect(findLinkedLabOrder([order()], treatment())?.id).toBe('o1')
  })

  it('درمان بدون لابراتوار هیچ پیوندی ندارد', () => {
    expect(findLinkedLabOrder([order()], treatment({ lab_id: null }))).toBeUndefined()
  })

  it('سفارش ویزیت دیگر را برنمی‌دارد', () => {
    expect(findLinkedLabOrder([order({ encounter_id: 'e2' })], treatment())).toBeUndefined()
  })

  it('سفارش لابراتوار دیگر را برنمی‌دارد', () => {
    expect(findLinkedLabOrder([order({ lab_id: 'lab-b' })], treatment())).toBeUndefined()
  })

  it('🔴 دو درمان در یک ویزیت به یک لابراتوار قاطی نمی‌شوند', () => {
    // بدون شرط دندان، لغو یکی سفارش آن یکی را لغو می‌کرد.
    const orders = [order({ id: 'o-38', tooth_number: '38' }), order({ id: 'o-11', tooth_number: '11' })]
    expect(findLinkedLabOrder(orders, treatment({ tooth_number: '11' }))?.id).toBe('o-11')
    expect(findLinkedLabOrder(orders, treatment({ tooth_number: '38' }))?.id).toBe('o-38')
  })

  it('رشته‌ی خالی و null برای دندان یکی حساب می‌شوند', () => {
    expect(findLinkedLabOrder([order({ tooth_number: '' })], treatment({ tooth_number: null }))?.id).toBe('o1')
  })

  it('سفارش لغوشده یا تحویل‌شده پیوند زنده نیست', () => {
    for (const status of ['cancelled', 'delivered']) {
      expect(findLinkedLabOrder([order({ status })], treatment())).toBeUndefined()
    }
  })

  it('سفارش در جریان، در هر مرحله‌ای، پیوند زنده است', () => {
    for (const status of ['pending', 'in_progress', 'ready']) {
      expect(findLinkedLabOrder([order({ status })], treatment())?.id).toBe('o1')
    }
  })
})

describe('تصمیم هنگام ذخیره‌ی درمان', () => {
  it('🔴 ویرایش و زدن تیک لابراتوار → سفارش ساخته می‌شود', () => {
    // همان باگ: قبلاً اینجا هیچ اتفاقی نمی‌افتاد.
    expect(decideLabHandoff(null, 'lab-a', false)).toBe('create')
  })

  it('ثبت درمان جدید با لابراتوار → سفارش ساخته می‌شود', () => {
    expect(decideLabHandoff(null, 'lab-a', false)).toBe('create')
  })

  it('برداشتن تیک لابراتوار → سفارش موجود لغو می‌شود', () => {
    expect(decideLabHandoff('lab-a', null, true)).toBe('cancel')
  })

  it('عوض کردن لابراتوار → قبلی لغو، جدید ساخته می‌شود', () => {
    expect(decideLabHandoff('lab-a', 'lab-b', true)).toBe('replace')
  })

  it('ویرایش بدون تغییر لابراتوار → سفارش تکراری ساخته نمی‌شود', () => {
    expect(decideLabHandoff('lab-a', 'lab-a', true)).toBe('none')
  })

  it('درمان بدون لابراتوار و بدون سفارش → کاری لازم نیست', () => {
    expect(decideLabHandoff(null, null, false)).toBe('none')
  })

  it('اگر سفارش قبلی گم شده باشد، دوباره ساخته می‌شود', () => {
    // درمان lab_id دارد ولی سفارشش لغو شده — نباید بی‌سفارش بماند.
    expect(decideLabHandoff('lab-a', 'lab-a', false)).toBe('create')
  })

  it('رشته‌ی خالی مثل «بدون لابراتوار» رفتار می‌کند', () => {
    expect(decideLabHandoff('', '', false)).toBe('none')
    expect(decideLabHandoff('lab-a', '', true)).toBe('cancel')
  })
})
