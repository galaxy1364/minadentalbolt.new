import { describe, it, expect } from 'vitest'
import {
  createEmptyPerioToothData,
  computeCAL,
  calculatePerioStatistics,
  UPPER_PERIO_TEETH,
  LOWER_PERIO_TEETH,
} from './periodontal'

describe('periodontal — 6-Point Periodontal Examination Logic', () => {
  it('has correct adult teeth numbers in upper and lower arches', () => {
    expect(UPPER_PERIO_TEETH.length).toBe(16)
    expect(LOWER_PERIO_TEETH.length).toBe(16)
    expect(UPPER_PERIO_TEETH).toContain(16)
    expect(LOWER_PERIO_TEETH).toContain(46)
  })

  it('computes Clinical Attachment Level (CAL = PD + Recession)', () => {
    expect(computeCAL(3, 2)).toBe(5)
    expect(computeCAL(4, 0)).toBe(4)
    expect(computeCAL(3, -1)).toBe(2)
  })

  it('initializes empty tooth data with 6 standard sites', () => {
    const t = createEmptyPerioToothData(16)
    expect(t.tooth_number).toBe(16)
    expect(t.db).toBeDefined()
    expect(t.b).toBeDefined()
    expect(t.mb).toBeDefined()
    expect(t.dl).toBeDefined()
    expect(t.l).toBeDefined()
    expect(t.ml).toBeDefined()
    expect(t.db.pd).toBe(2)
  })

  it('detects healthy periodontal status when all depths <= 3mm and bop < 10%', () => {
    const data: Record<number, any> = {
      11: createEmptyPerioToothData(11),
      21: createEmptyPerioToothData(21),
    }
    const stats = calculatePerioStatistics(data)
    expect(stats.totalSites).toBe(12)
    expect(stats.deepPocketsCount).toBe(0)
    expect(stats.diagnosisGrade.color).toBe('success')
  })

  it('detects severe periodontitis when pockets >= 6mm exist', () => {
    const tooth16 = createEmptyPerioToothData(16)
    tooth16.mb.pd = 7
    tooth16.mb.bop = true
    const data: Record<number, any> = { 16: tooth16 }

    const stats = calculatePerioStatistics(data)
    expect(stats.severePocketsCount).toBe(1)
    expect(stats.diagnosisGrade.color).toBe('error')
    expect(stats.diagnosisGrade.title).toContain('پریودنتیت پیشرفته')
  })
})
