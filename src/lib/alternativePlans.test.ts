/**
 * MOD-TEST-032 | آزمون‌های موتور طرح‌های درمانی جایگزین و مقایسه
 */
import { describe, it, expect } from 'vitest'
import {
  groupPhasesByPlan,
  comparePlanOptions,
  getPlanOptionTitle,
  generateComparativePlanHtml,
} from './alternativePlans'
import type { TreatmentPhase, Patient } from '../types'

const mkPhase = (
  num: number,
  title: string,
  cost: number,
  option: string = 'A',
  isAccepted: boolean = false,
  durationDays: number = 10,
): TreatmentPhase => ({
  id: `ph-${option}-${num}`,
  phase_number: num,
  title,
  estimated_cost: cost,
  plan_option: option,
  is_accepted: isAccepted,
  estimated_duration_days: durationDays,
  status: 'planned',
  clinic_id: 'c1',
  patient_id: 'p1',
  doctor_id: 'd1',
  procedures: null,
  description: null,
  actual_cost: null,
  start_date: null,
  end_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

describe('گروه‌بندی فازها بر اساس گزینه طرح (Plan Options)', () => {
  it('فازهای بدون plan_option به‌طور خودکار در طرح الف (A) قرار می‌گیرند', () => {
    const phases = [
      mkPhase(1, 'جرم‌گیری', 1_000_000, 'A'),
      { ...mkPhase(2, 'پر کردن', 2_000_000, 'A'), plan_option: null },
    ]

    const groups = groupPhasesByPlan(phases)
    expect(groups.length).toBe(1)
    expect(groups[0].optionKey).toBe('A')
    expect(groups[0].phases.length).toBe(2)
    expect(groups[0].progress.estimatedCost).toBe(3_000_000)
  })

  it('فازهای طرح الف و طرح ب را به‌درستی تفکیک می‌کند', () => {
    const phases = [
      mkPhase(1, 'کاشت فیکسچر ایمپلنت', 15_000_000, 'A', true, 60),
      mkPhase(2, 'تحویل روکش ایمپلنت', 10_000_000, 'A', true, 15),
      mkPhase(1, 'عصب‌کشی پایه‌ها', 6_000_000, 'B', false, 14),
      mkPhase(2, 'تحویل بریج ۳ واحدی', 12_000_000, 'B', false, 21),
    ]

    const groups = groupPhasesByPlan(phases)
    expect(groups.length).toBe(2)

    const planA = groups.find((g) => g.optionKey === 'A')!
    const planB = groups.find((g) => g.optionKey === 'B')!

    expect(planA.phases.length).toBe(2)
    expect(planA.progress.estimatedCost).toBe(25_000_000)
    expect(planA.isAccepted).toBe(true)

    expect(planB.phases.length).toBe(2)
    expect(planB.progress.estimatedCost).toBe(18_000_000)
    expect(planB.isAccepted).toBe(false)
  })
})

describe('مقایسه مشخصات و هزینه‌های دو طرح درمان', () => {
  it('اختلاف هزینه و زمان را دقیق محاسبه می‌کند', () => {
    const phasesA = [mkPhase(1, 'ایمپلنت', 20_000_000, 'A', false, 60)]
    const phasesB = [mkPhase(1, 'بریج', 12_000_000, 'B', false, 20)]

    const groups = groupPhasesByPlan([...phasesA, ...phasesB])
    const planA = groups.find((g) => g.optionKey === 'A')!
    const planB = groups.find((g) => g.optionKey === 'B')!

    const comp = comparePlanOptions(planA, planB)
    expect(comp.costDifference).toBe(8_000_000)
    expect(comp.durationDifferenceDays).toBe(40)
    expect(comp.savingsMessage).toContain('اقتصادی‌تر است')
  })
})

describe('تولید سند رسمی مقایسه طرح‌های جایگزین', () => {
  it('خروجی HTML دارای مشخصات بیمار و جدول مقایسه‌ای است', () => {
    const patient: Patient = {
      id: 'pat-101',
      first_name: 'رضا',
      last_name: 'محمدی',
      national_id: '0012345678',
      phone: '09121234567',
      clinic_id: 'c1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_version: 1,
    } as Patient

    const phases = [
      mkPhase(1, 'کاشت ایمپلنت', 20_000_000, 'A', true),
      mkPhase(1, 'بریج ۳ واحدی', 14_000_000, 'B', false),
    ]
    const groups = groupPhasesByPlan(phases)
    const html = generateComparativePlanHtml(patient, groups, 'کلینیک دندانپزشکی مینا')

    expect(html).toContain('رضا محمدی')
    expect(html).toContain('۰۰۱۲۳۴۵۶۷۸')
    expect(html).toContain('مورد تأیید بیمار')
    expect(html).toContain('کاشت ایمپلنت')
    expect(html).toContain('بریج ۳ واحدی')
    expect(html).toContain('امضا و اعلام انتخاب بیمار')
  })
})
