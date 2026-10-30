import { describe, it, expect } from 'vitest'
import {
  toothShape, hasRootFilling, hasCrownCap, toothKind,
  isUpperTooth, toothVisualLabel,
} from './toothVisual'
import type { ToothCondition } from './toothConditions'

/**
 * Every member of the union.
 *
 * Typed as a Record key set rather than a plain array on purpose: the
 * first version of this list was written from memory and silently missed
 * 'post' and 'pin', so the "exhaustiveness" test was not exhaustive. As
 * a Record the compiler refuses to build until every condition is
 * listed, which is a guarantee a hand-written array cannot give.
 */
const CONDITION_SET: Record<ToothCondition, true> = {
  healthy: true, caries: true, restored: true, rct: true, post: true,
  pin: true, crown: true, implant: true, extraction: true, missing: true,
  bridge: true, veneer: true, sealant: true,
}
const ALL_CONDITIONS = Object.keys(CONDITION_SET) as ToothCondition[]

describe('toothShape', () => {
  it('draws an implant as a post, not as a tooth', () => {
    // The whole point of COMP-20: an implant is not a tooth in another
    // colour, it is a threaded post in the bone.
    expect(toothShape('implant')).toBe('implant')
  })

  it('draws nothing in an empty socket', () => {
    expect(toothShape('missing')).toBe('absent')
    expect(toothShape('extraction')).toBe('absent')
  })

  it('draws everything else as a tooth', () => {
    const drawnAsTooth = ALL_CONDITIONS.filter(
      (c) => c !== 'implant' && c !== 'missing' && c !== 'extraction',
    )
    for (const c of drawnAsTooth) {
      expect(toothShape(c)).toBe('tooth')
    }
  })

  it('a post or pin is still a tooth — the anchor sits inside the root', () => {
    expect(toothShape('post')).toBe('tooth')
    expect(toothShape('pin')).toBe('tooth')
  })

  it('returns a known shape for every condition in the union', () => {
    for (const c of ALL_CONDITIONS) {
      expect(['tooth', 'implant', 'absent']).toContain(toothShape(c))
    }
  })
})

describe('hasRootFilling', () => {
  it('marks root-treated teeth', () => {
    expect(hasRootFilling('rct')).toBe(true)
  })

  it('also marks a post or pin — the canal was treated to hold it', () => {
    // An outlined root holding a post would depict an untreated canal
    // with an anchor cemented into it, which is not a thing.
    expect(hasRootFilling('post')).toBe(true)
    expect(hasRootFilling('pin')).toBe(true)
  })

  it('leaves every other condition unmarked', () => {
    const marked = new Set(['rct', 'post', 'pin'])
    for (const c of ALL_CONDITIONS.filter((c) => !marked.has(c))) {
      expect(hasRootFilling(c)).toBe(false)
    }
  })
})

describe('hasCrownCap', () => {
  it('covers crowns, veneers and bridge units alike', () => {
    // They differ in material and billing, but on a chart they all mean
    // the natural crown is not what you are looking at.
    expect(hasCrownCap('crown')).toBe(true)
    expect(hasCrownCap('veneer')).toBe(true)
    expect(hasCrownCap('bridge')).toBe(true)
  })

  it('does not cap a filling or a sealant', () => {
    expect(hasCrownCap('restored')).toBe(false)
    expect(hasCrownCap('sealant')).toBe(false)
    expect(hasCrownCap('healthy')).toBe(false)
  })

  it('an implant is not a crown cap — it has its own shape', () => {
    expect(hasCrownCap('implant')).toBe(false)
  })
})

describe('toothKind', () => {
  it('reads permanent teeth from the position digit', () => {
    expect(toothKind(11)).toBe('incisor')
    expect(toothKind(12)).toBe('incisor')
    expect(toothKind(13)).toBe('canine')
    expect(toothKind(14)).toBe('premolar')
    expect(toothKind(15)).toBe('premolar')
    expect(toothKind(16)).toBe('molar')
    expect(toothKind(48)).toBe('molar')
  })

  it('never calls a primary tooth a premolar', () => {
    // There are no primary premolars. Treating 54 as one would draw the
    // wrong number of roots on a child's chart.
    expect(toothKind(54)).toBe('molar')
    expect(toothKind(55)).toBe('molar')
    expect(toothKind(75)).toBe('molar')
    expect(toothKind(53)).toBe('canine')
    expect(toothKind(51)).toBe('incisor')
  })
})


describe('isUpperTooth', () => {
  it('splits the permanent arches', () => {
    expect(isUpperTooth(11)).toBe(true)
    expect(isUpperTooth(28)).toBe(true)
    expect(isUpperTooth(31)).toBe(false)
    expect(isUpperTooth(48)).toBe(false)
  })

  it('splits the primary arches too', () => {
    expect(isUpperTooth(51)).toBe(true)
    expect(isUpperTooth(65)).toBe(true)
    expect(isUpperTooth(71)).toBe(false)
    expect(isUpperTooth(85)).toBe(false)
  })
})


describe('toothVisualLabel', () => {
  it('says what a screen reader cannot see from the shape', () => {
    expect(toothVisualLabel(16, 'implant')).toContain('ایمپلنت')
    expect(toothVisualLabel(16, 'missing')).toContain('کشیده')
    expect(toothVisualLabel(16, 'crown')).toContain('روکش')
    expect(toothVisualLabel(16, 'rct')).toContain('عصب‌کشی')
  })

  it('falls back to the plain number for an ordinary tooth', () => {
    expect(toothVisualLabel(16, 'healthy')).toBe('دندان 16')
  })
})
