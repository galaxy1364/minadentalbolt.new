/**
 * MOD-FIX-021 | داشبورد و مالی، یک عدد
 *
 * گزارش مهدی: «در داشبورد زنده مانده ۵ میلیون ولی داخل مالی بدهی نداریم.
 * تست کامل.»
 *
 * دیتابیس زنده مانده‌ی واقعی را ۵۰۰,۰۰۰ می‌گفت. ۵ میلیون مانده‌ی صبح همان
 * روزِ یک بیمار بود، پیش از اینکه پرداخت‌ها عوض شوند. داشبورد یک بار موقع
 * باز شدن بار می‌شد و بعد از همگام‌سازی تازه نمی‌شد.
 *
 * ریاضی هیچ‌وقت غلط نبود. این تست‌ها دو چیز را قفل می‌کنند: هر دو صفحه
 * از **یک** تابع با **یک** فیلتر می‌خوانند، و داشبورد به پایان همگام‌سازی
 * گوش می‌دهد.
 */
import { describe, it, expect } from 'vitest'
import { calcAllPatientBalances } from './finance'
import dashboard from '../pages/Dashboard.tsx?raw'
import billing from '../pages/Billing.tsx?raw'

describe('🔴 یک محاسبه، دو صفحه', () => {
  it('هر دو از calcAllPatientBalances می‌خوانند', () => {
    expect(dashboard).toContain('calcAllPatientBalances(')
    expect(billing).toContain('calcAllPatientBalances(')
  })

  it('هیچ‌کدام محاسبه‌ی محلی مانده ندارند', () => {
    // یک جمع دستی روی payments در هر صفحه، همان دو عددی است که از هم
    // می‌افتند.
    for (const [name, src] of [['Dashboard', dashboard], ['Billing', billing]] as const) {
      expect(src, name).not.toMatch(/reduce\([^)]*\.amount/)
    }
  })

  it('داشبورد ایمپلنت را هم می‌فرستد، مثل مالی', () => {
    // اگر یکی ایمپلنت را بفرستد و دیگری نه، همان تابع دو جواب می‌دهد.
    expect(dashboard).toContain('calcAllPatientBalances(pays, trts, implCases)')
    expect(billing).toContain('calcAllPatientBalances(payments, treatments, implantCases)')
  })
})

describe('🔴 داشبورد بعد از همگام‌سازی تازه می‌شود', () => {
  it('به پایان همگام‌سازی گوش می‌دهد', () => {
    expect(dashboard).toContain('subscribeSync(')
  })

  it('فقط روی گذار از syncing به حالت آرام، نه هر تیک', () => {
    // وگرنه هر تغییر وضعیت یک بارگذاری کامل می‌شود.
    expect(dashboard).toContain("last === 'syncing' && status !== 'syncing'")
  })

  it('بارگذاری بی‌صداست — کاربر درخواستی نکرده', () => {
    expect(dashboard).toContain('loadData(true, true)')
  })
})

describe('مانده با داده‌ی واقعی امروز', () => {
  // همان سه بیمار، همان اعداد دیتابیس زنده در ۱۴۰۵/۰۶/۱۲.
  const treatments = [
    { patient_id: 'arad', total_price: 27_000_000, status: 'completed' },
    { patient_id: 'aba', total_price: 6_000_000, status: 'completed' },
    { patient_id: 'mehdi', total_price: 30_500_000, status: 'completed' },
  ] as never
  const payments = [
    { patient_id: 'arad', amount: 26_500_000, status: 'completed', implant_case_id: null },
    { patient_id: 'aba', amount: 6_000_000, status: 'completed', implant_case_id: null },
    { patient_id: 'aba', amount: 1_000_000, status: 'pending', implant_case_id: null },
    { patient_id: 'mehdi', amount: 50_500_000, status: 'completed', implant_case_id: null },
  ] as never
  const implants = [{ patient_id: 'mehdi', total_cost: null, paid_amount: null }] as never

  it('مجموع بدهی ۵۰۰ هزار است، نه ۵ میلیون', () => {
    const { totalOutstanding } = calcAllPatientBalances(payments, treatments, implants)
    expect(totalOutstanding).toBe(500_000)
  })

  it('پرداخت در انتظار در مانده اثر ندارد', () => {
    // چکِ پاس‌نشده بدهی است — همان قانون مهدی. ابا امیری تسویه است، نه
    // یک میلیون اضافه‌پرداخت.
    const { byPatient } = calcAllPatientBalances(payments, treatments, implants)
    expect(byPatient.get('aba')!.balance).toBe(0)
  })

  it('اضافه‌پرداخت به مجموع بدهی اضافه نمی‌شود', () => {
    // مهدی امیری ۲۰ میلیون اضافه داده؛ آن نباید بدهی کس دیگری را جبران
    // کند.
    const { byPatient, totalOutstanding } = calcAllPatientBalances(payments, treatments, implants)
    expect(byPatient.get('mehdi')!.balance).toBeLessThan(0)
    expect(totalOutstanding).toBe(500_000)
  })
})
