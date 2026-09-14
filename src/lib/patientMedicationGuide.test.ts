// src/lib/patientMedicationGuide.test.ts
import { describe, it, expect } from 'vitest'
import {
  matchDrugAdvice,
  buildPatientMedicationGuideDocument,
  DENTAL_DRUG_ADVICES,
  POST_OP_CARE_RULES,
} from './patientMedicationGuide'

describe('patientMedicationGuide', () => {
  it('correctly matches antibiotics and retrieves safety warnings', () => {
    const amox = matchDrugAdvice('کپسول آموکسی‌سیلین ۵۰۰')
    expect(amox).not.toBeNull()
    expect(amox?.category).toBe('antibiotic')
    expect(amox?.warning).toContain('دوره درمان')

    const metro = matchDrugAdvice('قرص مترونیدازول ۲۵۰')
    expect(metro).not.toBeNull()
    expect(metro?.warning).toContain('الکل')
  })

  it('correctly matches analgesics and anti-inflammatory warnings', () => {
    const gelofen = matchDrugAdvice('کپسول ژلوفن ۴۰۰')
    expect(gelofen).not.toBeNull()
    expect(gelofen?.category).toBe('analgesic')
    expect(gelofen?.warning).toContain('معده')

    const naproxen = matchDrugAdvice('قرص ناپروکسن ۵۰۰')
    expect(naproxen).not.toBeNull()
    expect(naproxen?.warning).toContain('۱۲ ساعت')
  })

  it('correctly matches mouthwashes with timing rules', () => {
    const chx = matchDrugAdvice('دهانشویه کلرهگزیدین ۰.۲٪')
    expect(chx).not.toBeNull()
    expect(chx?.category).toBe('mouthwash')
    expect(chx?.tips.some((t) => t.includes('مسواک'))).toBe(true)
  })

  it('contains essential post-op care rules preventing dry socket', () => {
    expect(POST_OP_CARE_RULES.some((r) => r.includes('تف کردن'))).toBe(true)
    expect(POST_OP_CARE_RULES.some((r) => r.includes('کمپرس یخ'))).toBe(true)
    expect(POST_OP_CARE_RULES.some((r) => r.includes('نی'))).toBe(true)
  })

  it('generates a complete, printable patient leaflet HTML document', () => {
    const html = buildPatientMedicationGuideDocument({
      patientName: 'سارا رضایی',
      doctorName: 'دکتر علوی',
      createdDate: '2026-03-20',
      medications: [
        {
          name: 'آموکسی‌سیلین ۵۰۰ میلی‌گرم',
          dose: 'کپسول ۵۰۰mg',
          frequency: 'هر ۸ ساعت',
          instructions: 'یک عدد با آب کامل',
        },
        {
          name: 'ژلوفن ۴۰۰ میلی‌گرم',
          dose: 'کپسول ژلاتینی',
          frequency: 'هر ۸ ساعت بعد از غذا',
        },
      ],
      notes: 'لطفاً ۴۸ ساعت دیگر جهت ویزیت کنترل تشریف بیاورید.',
    })

    expect(html).toContain('سارا رضایی')
    expect(html).toContain('دکتر علوی')
    expect(html).toContain('آموکسی‌سیلین')
    expect(html).toContain('ژلوفن')
    expect(html).toContain('توصیه اختصاصی دندانپزشک')
    expect(html).toContain('دستورات طلایی مراقبت پس از درمان')
    expect(html).toContain('mnd-bar')
  })
})
