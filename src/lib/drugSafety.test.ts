import { describe, it, expect } from 'vitest'
import { checkDrugInteractions, calculatePediatricDosage } from './drugSafety'

describe('drugSafety — Dental Drug Safety Engine', () => {
  it('detects penicillin allergy when prescribing Amoxicillin', () => {
    const alerts = checkDrugInteractions({
      allergies: 'سابقه حساسیت شدید به پنی‌سیلین و راش',
      medicalConditions: '',
      medicationsText: 'آموکسی‌سیلین | ۵۰۰mg | ۳ بار در روز',
    })

    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts[0].severity).toBe('high')
    expect(alerts[0].title).toContain('پنی‌سیلین')
    expect(alerts[0].alternativeSuggestion).toContain('کلیندامایسین')
  })

  it('detects peptic ulcer contraindication with Ibuprofen / NSAIDs', () => {
    const alerts = checkDrugInteractions({
      allergies: '',
      medicalConditions: 'زخم معده و ریفلاکس گوارشی',
      medicationsText: 'ژلوفن | ۴۰۰mg | هر ۶ ساعت',
    })

    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts[0].severity).toBe('high')
    expect(alerts[0].title).toContain('زخم یا خونریزی معده')
  })

  it('detects G6PD deficiency (Favism) contraindication with Aspirin', () => {
    const alerts = checkDrugInteractions({
      allergies: '',
      medicalConditions: 'کمبود آنزیم فاویسم G6PD',
      medicationsText: 'آسپرین ۸۰ | روزی یک عدد',
    })

    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts[0].severity).toBe('high')
    expect(alerts[0].title).toContain('فاویسم')
  })

  it('returns no alerts when prescription is safe', () => {
    const alerts = checkDrugInteractions({
      allergies: 'پنی‌سیلین',
      medicalConditions: '',
      medicationsText: 'کلیندامایسین | ۳۰۰mg | ۴ بار در روز',
    })

    expect(alerts.length).toBe(0)
  })

  it('calculates pediatric amoxicillin dose correctly', () => {
    const calc = calculatePediatricDosage('amoxicillin', 20) // 20 kg
    expect(calc.weightKg).toBe(20)
    // 20 * 45 / 3 = 300 mg per dose
    expect(calc.recommendedSingleDoseMg).toBe(300)
    expect(calc.suspensionNote).toBeDefined()
  })

  it('calculates pediatric ibuprofen dose correctly', () => {
    const calc = calculatePediatricDosage('ibuprofen', 15) // 15 kg
    expect(calc.recommendedSingleDoseMg).toBe(120) // 15 * 8
  })
})
