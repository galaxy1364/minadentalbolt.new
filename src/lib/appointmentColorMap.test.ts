import { describe, it, expect } from 'vitest'
import { detectSpecialty, SPECIALTY_VISUAL_MAP, CANCELLATION_REASONS } from './appointmentColorMap'

describe('appointmentColorMap', () => {
  it('maps dental surgery terms to surgery specialty visual', () => {
    expect(detectSpecialty('جراحی دندان عقل').key).toBe('surgery')
    expect(detectSpecialty('کشیدن ریشه').key).toBe('surgery')
    expect(detectSpecialty('surgical extraction').key).toBe('surgery')
  })

  it('maps endodontic terms to endo specialty visual', () => {
    expect(detectSpecialty('عصب‌کشی کانال ۳').key).toBe('endo')
    expect(detectSpecialty('درمان ریشه').key).toBe('endo')
    expect(detectSpecialty('root canal therapy').key).toBe('endo')
  })

  it('maps implant terms to implant specialty visual', () => {
    expect(detectSpecialty('کاشت فیکسچر ایمپلنت').key).toBe('implant')
    expect(detectSpecialty('قالب‌گیری ایمپلنت').key).toBe('implant')
  })

  it('maps pediatric and restorative terms correctly', () => {
    expect(detectSpecialty('ترمیم کامپوزیت').key).toBe('restorative')
    expect(detectSpecialty('دندانپزشکی اطفال دندان شیری').key).toBe('pediatric')
  })

  it('falls back to exam for unspecified or null text', () => {
    expect(detectSpecialty(null).key).toBe('exam')
    expect(detectSpecialty('').key).toBe('exam')
    expect(detectSpecialty('ویزیت دوره‌ای').key).toBe('exam')
  })

  it('defines structured standard cancellation reasons', () => {
    expect(CANCELLATION_REASONS.length).toBeGreaterThanOrEqual(6)
    const reasonIds = CANCELLATION_REASONS.map((r) => r.id)
    expect(reasonIds).toContain('patient_illness')
    expect(reasonIds).toContain('doctor_unavailable')
    expect(reasonIds).toContain('rescheduled_request')
  })
})
