import { describe, it, expect } from 'vitest'
import {
  VITA_SHADES,
  VITA_GROUPS,
  getVitaShade,
  isValidVitaShade,
} from './vitaShade'

describe('vitaShade', () => {
  it('contains exactly 20 standard shades (16 Classical + 4 Bleach)', () => {
    expect(VITA_SHADES.length).toBe(20)
  })

  it('contains 5 groups (A, B, C, D, BL)', () => {
    expect(VITA_GROUPS.length).toBe(5)
    expect(VITA_GROUPS.map((g) => g.id)).toEqual(['A', 'B', 'C', 'D', 'BL'])
  })

  it('finds shades case-insensitively', () => {
    const a2 = getVitaShade('a2')
    expect(a2).toBeDefined()
    expect(a2?.code).toBe('A2')
    expect(a2?.group).toBe('A')

    const bl1 = getVitaShade('bl1')
    expect(bl1).toBeDefined()
    expect(bl1?.code).toBe('BL1')

    const trimmed = getVitaShade('  c3  ')
    expect(trimmed?.code).toBe('C3')
  })

  it('returns undefined for unknown shades', () => {
    expect(getVitaShade('XYZ')).toBeUndefined()
    expect(getVitaShade('')).toBeUndefined()
    expect(getVitaShade(null)).toBeUndefined()
  })

  it('validates shades accurately with isValidVitaShade', () => {
    expect(isValidVitaShade('A1')).toBe(true)
    expect(isValidVitaShade('A3.5')).toBe(true)
    expect(isValidVitaShade('B2')).toBe(true)
    expect(isValidVitaShade('BL4')).toBe(true)
    expect(isValidVitaShade('E3')).toBe(false)
    expect(isValidVitaShade('')).toBe(false)
  })

  it('ensures each shade has hexColor and enamelHex for realistic rendering', () => {
    for (const shade of VITA_SHADES) {
      expect(shade.hexColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(shade.enamelHex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})
