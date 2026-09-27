import { describe, it, expect } from 'vitest'
import { surfaceSectors, mesialOnRight, centreLetter } from './surfaceGlyph'
import type { ToothSurface } from './toothConditions'

const ALL: ToothSurface[] = ['mesial', 'distal', 'buccal', 'lingual', 'occlusal']

describe('mesialOnRight', () => {
  it('puts mesial screen-right for the patient’s right quadrants', () => {
    // Quadrants 1 and 4 are the patient's right, drawn on the viewer's
    // left, so the midline — and therefore mesial — is screen-right.
    expect(mesialOnRight(16)).toBe(true)
    expect(mesialOnRight(46)).toBe(true)
  })

  it('puts mesial screen-left for the patient’s left quadrants', () => {
    expect(mesialOnRight(26)).toBe(false)
    expect(mesialOnRight(36)).toBe(false)
  })

  it('follows the same rule for primary teeth', () => {
    expect(mesialOnRight(55)).toBe(true)
    expect(mesialOnRight(85)).toBe(true)
    expect(mesialOnRight(65)).toBe(false)
    expect(mesialOnRight(75)).toBe(false)
  })
})

describe('surfaceSectors', () => {
  it('produces exactly the five surfaces, once each', () => {
    const s = surfaceSectors(16)
    expect(s).toHaveLength(5)
    expect(new Set(s.map((x) => x.surface))).toEqual(new Set(ALL))
  })

  it('gives every sector a drawable path', () => {
    for (const sector of surfaceSectors(16)) {
      expect(sector.d.startsWith('M ')).toBe(true)
      expect(sector.d).not.toContain('NaN')
    }
  })

  it('mirrors mesial and distal between opposite quadrants', () => {
    // Getting this backwards records a filling on the wrong side of the
    // tooth, which is why the side comes from the FDI number.
    const right = surfaceSectors(16)
    const left = surfaceSectors(26)
    const mesialRight = right.find((s) => s.surface === 'mesial')!
    const mesialLeft = left.find((s) => s.surface === 'mesial')!
    expect(mesialRight.labelX).toBeGreaterThan(12)
    expect(mesialLeft.labelX).toBeLessThan(12)
  })

  it('keeps each letter with its own surface after the mirror', () => {
    for (const fdi of [16, 26, 36, 46]) {
      const s = surfaceSectors(fdi)
      expect(s.find((x) => x.surface === 'mesial')!.letter).toBe('M')
      expect(s.find((x) => x.surface === 'distal')!.letter).toBe('D')
      expect(s.find((x) => x.surface === 'buccal')!.letter).toBe('B')
      expect(s.find((x) => x.surface === 'lingual')!.letter).toBe('L')
    }
  })

  it('never overlaps mesial and distal on the same side', () => {
    for (const fdi of [11, 16, 26, 31, 36, 46]) {
      const s = surfaceSectors(fdi)
      const m = s.find((x) => x.surface === 'mesial')!
      const d = s.find((x) => x.surface === 'distal')!
      expect(m.labelX).not.toBe(d.labelX)
    }
  })

  it('puts buccal below and lingual above', () => {
    const s = surfaceSectors(16)
    expect(s.find((x) => x.surface === 'buccal')!.labelY).toBeGreaterThan(12)
    expect(s.find((x) => x.surface === 'lingual')!.labelY).toBeLessThan(12)
  })

  it('centres the occlusal target', () => {
    // A centre disc rather than a wedge: it is the surface marked most
    // often and the easiest thing to hit with a thumb.
    const o = surfaceSectors(16).find((x) => x.surface === 'occlusal')!
    expect(o.labelX).toBe(12)
    expect(o.labelY).toBe(13)
  })
})

describe('centreLetter', () => {
  it('says incisal on an anterior and occlusal on a posterior', () => {
    // Anteriors bite with an edge, not a table. Using the right word
    // keeps the chart speaking the reader's language.
    expect(centreLetter(11)).toBe('I')
    expect(centreLetter(13)).toBe('I')
    expect(centreLetter(14)).toBe('O')
    expect(centreLetter(16)).toBe('O')
  })

  it('applies the same distinction to primary teeth', () => {
    expect(centreLetter(51)).toBe('I')
    expect(centreLetter(54)).toBe('O')
  })
})
