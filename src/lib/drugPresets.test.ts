import { describe, it, expect } from 'vitest'
import { DENTAL_DRUG_PRESETS } from './drugPresets'

describe('DENTAL_DRUG_PRESETS', () => {
  it('contains essential clinical prescription categories', () => {
    expect(DENTAL_DRUG_PRESETS.length).toBeGreaterThanOrEqual(4)
    const ids = DENTAL_DRUG_PRESETS.map((p) => p.id)
    expect(ids).toContain('post_wisdom_surgery')
    expect(ids).toContain('acute_dental_abscess')
    expect(ids).toContain('acute_pulpitis_endo')
    expect(ids).toContain('pediatric_dental_pack')
  })

  it('all presets have non-empty items and required fields', () => {
    for (const preset of DENTAL_DRUG_PRESETS) {
      expect(preset.title.trim().length).toBeGreaterThan(0)
      expect(preset.items.length).toBeGreaterThan(0)
      for (const item of preset.items) {
        expect(item.drug_name.trim().length).toBeGreaterThan(0)
        expect(item.dosage.trim().length).toBeGreaterThan(0)
        expect(item.frequency.trim().length).toBeGreaterThan(0)
        expect(item.instructions.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('pediatric preset items have clear pediatric labeling', () => {
    const ped = DENTAL_DRUG_PRESETS.find((p) => p.id === 'pediatric_dental_pack')
    expect(ped).toBeDefined()
    expect(ped?.category).toBe('pediatric')
    expect(ped?.items.some((i) => i.drug_name.includes('سوسپانسیون') || i.drug_name.includes('شربت'))).toBe(true)
  })
})
