import { describe, it, expect } from 'vitest'
import {
  normalizeClinicalText, isNegativeValue, splitClinicalField,
  debtItems, buildPatientAlerts, alertChips,
} from './patientAlerts'
import type { AlertPatientFields } from './patientAlerts'

function pat(over: Partial<AlertPatientFields> = {}): AlertPatientFields {
  return { id: 'p1', ...over }
}

describe('normalizeClinicalText', () => {
  it('folds Arabic yeh and kaf onto their Persian forms', () => {
    expect(normalizeClinicalText('نداري')).toBe(normalizeClinicalText('نداری'))
    expect(normalizeClinicalText('كلي')).toBe(normalizeClinicalText('کلی'))
  })

  it('collapses whitespace and case', () => {
    expect(normalizeClinicalText('  NO   ')).toBe('no')
  })
})

describe('isNegativeValue', () => {
  it('treats an empty field as nothing to report', () => {
    expect(isNegativeValue(null)).toBe(true)
    expect(isNegativeValue('')).toBe(true)
    expect(isNegativeValue('   ')).toBe(true)
  })

  it('recognises the fillers clinics actually type', () => {
    for (const v of ['-', 'ندارد', 'نداره', 'خیر', 'هیچ', 'none', 'N/A', 'موردی ندارد']) {
      expect(isNegativeValue(v)).toBe(true)
    }
  })

  it('does not swallow a real finding', () => {
    for (const v of ['پنی‌سیلین', 'وارفارین', 'دیابت', 'penicillin']) {
      expect(isNegativeValue(v)).toBe(false)
    }
  })

  it('a filler with different spelling is still a filler', () => {
    // The whole point of normalising before the lookup.
    expect(isNegativeValue('نداري')).toBe(true)
  })
})

describe('splitClinicalField', () => {
  it('splits on every separator a human might use', () => {
    expect(splitClinicalField('قلبی، دیابت; فشار خون/آسم')).toEqual([
      'قلبی', 'دیابت', 'فشار خون', 'آسم',
    ])
  })

  it('keeps a sentence without separators whole', () => {
    expect(splitClinicalField('سابقه جراحی قلب باز در سال ۹۸')).toEqual([
      'سابقه جراحی قلب باز در سال ۹۸',
    ])
  })

  it('drops fillers mixed in with real findings', () => {
    // "دیابت، ندارد" is a half-edited field; the filler must not become
    // a chip sitting next to a real condition.
    expect(splitClinicalField('دیابت، ندارد')).toEqual(['دیابت'])
  })

  it('returns nothing for a field that only says nothing', () => {
    expect(splitClinicalField('ندارد')).toEqual([])
    expect(splitClinicalField('-')).toEqual([])
  })
})

describe('buildPatientAlerts', () => {
  it('raises no alert for a patient with clean fields and no debt', () => {
    expect(buildPatientAlerts(pat({ allergies: 'ندارد', medications: '-' }), { balance: 0 })).toEqual([])
  })

  it('a filled field with only fillers must not produce a red card', () => {
    // The regression this module exists to prevent: an alert reading
    // «حساسیت: ندارد» teaches staff that red cards are noise.
    const alerts = buildPatientAlerts(pat({ allergies: 'ندارد', medical_conditions: 'خیر' }), null)
    expect(alerts).toEqual([])
  })

  it('puts the allergy above the debt, never the other way round', () => {
    const alerts = buildPatientAlerts(
      pat({ allergies: 'پنی‌سیلین' }),
      { balance: 5_000_000 },
    )
    expect(alerts.map((a) => a.kind)).toEqual(['allergy', 'debt'])
  })

  it('orders all four kinds clinically first, money last', () => {
    const alerts = buildPatientAlerts(
      pat({
        allergies: 'پنی‌سیلین',
        medical_conditions: 'قلبی',
        medications: 'وارفارین',
      }),
      { balance: 1_000 },
    )
    expect(alerts.map((a) => a.kind)).toEqual(['allergy', 'condition', 'medication', 'debt'])
  })

  it('merges the two condition fields and drops the duplicate', () => {
    const alerts = buildPatientAlerts(
      pat({ medical_conditions: 'دیابت', medical_history: 'دیابت، فشار خون' }),
      null,
    )
    const condition = alerts.find((a) => a.kind === 'condition')
    expect(condition?.items).toEqual(['دیابت', 'فشار خون'])
  })

  it('reads a condition recorded in the history field alone', () => {
    // Clinics disagree about which field to use; reading only the tidy
    // one would miss the alert on half the files.
    const alerts = buildPatientAlerts(pat({ medical_history: 'صرع' }), null)
    expect(alerts.map((a) => a.kind)).toEqual(['condition'])
  })

  it('does not warn about money the patient does not owe', () => {
    expect(buildPatientAlerts(pat(), { balance: 0 })).toEqual([])
    // A negative balance means the clinic owes the patient — not a warning.
    expect(buildPatientAlerts(pat(), { balance: -250_000 })).toEqual([])
  })

  it('handles a missing balance without throwing', () => {
    expect(buildPatientAlerts(pat({ allergies: 'لاتکس' }), null).map((a) => a.kind)).toEqual(['allergy'])
  })

  it('gives every alert an id stable within the patient', () => {
    const a = buildPatientAlerts(pat({ allergies: 'لاتکس' }), null)
    const b = buildPatientAlerts(pat({ allergies: 'لاتکس' }), null)
    expect(a[0].id).toBe(b[0].id)
    expect(a[0].id).toContain('p1')
  })
})

describe('debtItems', () => {
  it('states the balance', () => {
    expect(debtItems(1_500_000, null)[0]).toContain('1,500,000')
  })

  it('adds a second line only when the credit limit is passed', () => {
    expect(debtItems(500_000, 1_000_000)).toHaveLength(1)
    expect(debtItems(1_500_000, 1_000_000)).toHaveLength(2)
  })

  it('ignores a zero or absent credit limit', () => {
    expect(debtItems(1_500_000, 0)).toHaveLength(1)
    expect(debtItems(1_500_000, null)).toHaveLength(1)
  })
})

describe('alertChips', () => {
  it('shows clinical facts but leaves money to its own card', () => {
    const alerts = buildPatientAlerts(
      pat({ allergies: 'پنی‌سیلین', medications: 'وارفارین' }),
      { balance: 9_000 },
    )
    const chips = alertChips(alerts)
    expect(chips).toContain('پنی‌سیلین')
    expect(chips).toContain('وارفارین')
    expect(chips.some((c) => c.includes('مانده'))).toBe(false)
  })

  it('caps how many chips one field can contribute', () => {
    const alerts = buildPatientAlerts(pat({ allergies: 'a،b،c،d،e' }), null)
    expect(alertChips(alerts, 2)).toHaveLength(2)
  })
})
