/**
 * MOD-FEAT-042 | تست گروه‌بندی پرونده‌ی بیمار
 *
 * قلبِ این ویژگی این است که درمان‌های یک بیمار زیر یک پرونده جمع شوند و
 * تصویر مالی‌اش (کل، پرداختی، بدهی، چک، اقساط) و تعویض پزشک درست محاسبه
 * شود. چون این منطق پیش‌تر داخل کامپوننت بود و سه بار باگ ساخت، اینجا
 * به‌صورت تابع خالص تست می‌شود.
 */
import { describe, it, expect } from 'vitest'
import { groupPatientTreatments } from './patientTreatmentGroups'
import type { Payment, Treatment, Cheque, Installment } from '../types'

const enc = (over: Partial<any>): any => ({
  id: 'e', patient_id: 'p1', doctor_id: 'd1', encounter_date: '2026-01-10', status: 'completed', total_amount: 0, ...over,
})
const tret = (over: Partial<Treatment>): Treatment => ({
  id: 't', encounter_id: 'e', clinic_id: 'c', patient_id: 'p1', doctor_id: 'd1',
  tooth_number: '11', tooth_surface: null, procedure_code: null, procedure_name: 'x',
  description: null, quantity: 1, unit_price: 0, discount: 0, total_price: 0,
  lab_id: null, lab_cost: null, status: 'completed', notes: null,
  created_at: '', updated_at: '', sync_version: 1, procedure_category: null,
  doctor_share: null, doctor_share_calculated: null, ...over,
})
const pay = (over: Partial<Payment>): Payment => ({
  id: 'pay', clinic_id: 'c', patient_id: 'p1', encounter_id: null, implant_case_id: null,
  treatment_id: null, doctor_id: null, amount: 0, payment_method: 'cash', reference: null,
  notes: null, status: 'completed', payment_date: '2026-01-10', created_by: null,
  created_at: '', updated_at: '', sync_version: 1, ...over,
})

describe('گروه‌بندی درمان‌ها به پرونده‌ی بیمار', () => {
  it('ده ویزیت یک بیمار = یک پرونده، نه ده ردیف', () => {
    const encounters = Array.from({ length: 10 }, (_, i) => enc({ id: `e${i}`, encounter_date: `2026-01-${10 + i}` }))
    const groups = groupPatientTreatments({ encounters, treatments: [], payments: [] })
    expect(groups).toHaveLength(1)
    expect(groups[0].encounters).toHaveLength(10)
    // مرتب‌شده نزولی: تازه‌ترین ویزیت اول
    expect(groups[0].encounters[0].encounter_date).toBe('2026-01-19')
    expect(groups[0].lastVisitDate).toBe('2026-01-19')
  })

  it('مالیِ پرونده: کل − پرداختی = بدهی', () => {
    const groups = groupPatientTreatments({
      encounters: [enc({})],
      treatments: [tret({ total_price: 12_000_000 })],
      payments: [pay({ amount: 5_000_000 })],
    })
    expect(groups[0].finance.totalCost).toBe(12_000_000)
    expect(groups[0].finance.paid).toBe(5_000_000)
    expect(groups[0].finance.balance).toBe(7_000_000)
  })

  it('درمان لغو‌شده در بدهی حساب نمی‌شود ولی پرونده می‌ماند', () => {
    const groups = groupPatientTreatments({
      encounters: [enc({})],
      treatments: [tret({ total_price: 12_000_000, status: 'cancelled' })],
      payments: [],
    })
    expect(groups[0].treatmentCount).toBe(0)
    expect(groups[0].finance.balance).toBe(0)
  })

  it('🔴 تعویض پزشک: بیش از یک پزشک روی کار بیمار → پرچم', () => {
    const groups = groupPatientTreatments({
      encounters: [enc({ id: 'e1', doctor_id: 'd1', encounter_date: '2026-01-10' }), enc({ id: 'e2', doctor_id: 'd2', encounter_date: '2026-01-20' })],
      treatments: [],
      payments: [],
    })
    expect(groups[0].doctorChanged).toBe(true)
    // ترتیب اولین‌دیده: d1 قبل از d2 (قدیمی‌تر اول)
    expect(groups[0].doctorIds).toEqual(['d1', 'd2'])
  })

  it('یک پزشک → پرچم تعویض روشن نمی‌شود', () => {
    const groups = groupPatientTreatments({ encounters: [enc({})], treatments: [tret({})], payments: [] })
    expect(groups[0].doctorChanged).toBe(false)
    expect(groups[0].doctorIds).toEqual(['d1'])
  })

  it('چک در انتظار و اقساط باقی‌مانده شمرده می‌شوند، پرداخت‌شده‌ها نه', () => {
    const cheques: Cheque[] = [
      { id: 'c1', clinic_id: 'c', patient_id: 'p1', amount: 3_000_000, bank_name: null, branch: null, cheque_number: null, account_number: null, issue_date: '', due_date: '2026-02-01', payee_name: null, status: 'pending', created_at: '', updated_at: '', sync_version: 1 } as Cheque,
      { id: 'c2', clinic_id: 'c', patient_id: 'p1', amount: 9_000_000, bank_name: null, branch: null, cheque_number: null, account_number: null, issue_date: '', due_date: '2026-01-01', payee_name: null, status: 'cleared', created_at: '', updated_at: '', sync_version: 1 } as Cheque,
    ]
    const installments: Installment[] = [
      { id: 'i1', payment_plan_id: 'pp', clinic_id: 'c', patient_id: 'p1', installment_number: 1, amount: 2_000_000, due_date: '2026-02-01', payment_date: null, status: 'pending', reminder_sent: null, notes: null, created_at: '', updated_at: '', sync_version: 1 },
      { id: 'i2', payment_plan_id: 'pp', clinic_id: 'c', patient_id: 'p1', installment_number: 2, amount: 2_000_000, due_date: '2026-01-01', payment_date: '2026-01-01', status: 'paid', reminder_sent: null, notes: null, created_at: '', updated_at: '', sync_version: 1 },
    ]
    const groups = groupPatientTreatments({ encounters: [enc({})], treatments: [], payments: [], cheques, installments })
    expect(groups[0].finance.pendingChequeCount).toBe(1)
    expect(groups[0].finance.pendingChequeAmount).toBe(3_000_000)
    expect(groups[0].finance.remainingInstallmentCount).toBe(1)
    expect(groups[0].finance.remainingInstallmentAmount).toBe(2_000_000)
  })

  it('بیمار با درمان ولی بدون ویزیت هم پرونده می‌گیرد', () => {
    const groups = groupPatientTreatments({ encounters: [], treatments: [tret({ patient_id: 'p9', total_price: 1_000_000 })], payments: [] })
    expect(groups).toHaveLength(1)
    expect(groups[0].patientId).toBe('p9')
    expect(groups[0].lastVisitDate).toBeNull()
  })
})
