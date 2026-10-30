// fuzzySearch.test.ts -- Persian-aware fuzzy search engine (no fake assertions)
import { describe, it, expect } from 'vitest'
import { normalizeText, fuzzyScore, scoreFields, matchRanges } from './fuzzySearch'

// normalizeText
describe('normalizeText', () => {
  it('lowercases Latin text', () => {
    expect(normalizeText('Hello World')).toBe('hello world')
  })
  it('converts Arabic ya to Persian ya', () => {
    expect(normalizeText('علي')).toBe('علی')
  })
  it('converts Arabic kaf to Persian kaf', () => {
    expect(normalizeText('بانك')).toBe('بانک')
  })
  it('converts Persian digits to Latin digits', () => {
    expect(normalizeText('۰۱۲۳')).toBe('0123')
  })
  it('strips Arabic diacritics', () => {
    expect(normalizeText('مَرحَبا')).toBe('مرحبا')
  })
  it('collapses multiple whitespace to single space', () => {
    expect(normalizeText('علی    احمدی')).toBe('علی احمدی')
  })
  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  سارا  ')).toBe('سارا')
  })
  it('converts Arabic ta marbuta to ha', () => {
    const result = normalizeText('طبيعة')
    expect(result.endsWith('ه')).toBe(true)
  })
})

// fuzzyScore
describe('fuzzyScore', () => {
  it('returns 0 for empty query', () => {
    expect(fuzzyScore('', 'علی احمدی')).toBe(0)
  })
  it('returns null for empty target', () => {
    expect(fuzzyScore('علی', '')).toBeNull()
  })
  it('scores exact substring match higher than subsequence match', () => {
    const exact = fuzzyScore('علی', 'علی احمدی')!
    const subseq = fuzzyScore('عاد', 'علی احمدی')!
    expect(exact).toBeGreaterThan(subseq)
  })
  it('gives bonus for match at start of string', () => {
    const atStart = fuzzyScore('سا', 'سارا حسینی')!
    const inMiddle = fuzzyScore('را', 'سارا حسینی')!
    expect(atStart).toBeGreaterThan(inMiddle)
  })
  it('returns null when no subsequence match', () => {
    expect(fuzzyScore('zzz', 'علی احمدی')).toBeNull()
  })
  it('normalises Arabic ya before matching', () => {
    expect(fuzzyScore('علي', 'علی احمدی')).not.toBeNull()
  })
  it('normalises Persian digits before matching', () => {
    expect(fuzzyScore('۱۲۳', '0123456789')).not.toBeNull()
  })
  it('is case-insensitive for Latin chars', () => {
    expect(fuzzyScore('SARA', 'sara hosseini')).toBe(fuzzyScore('sara', 'sara hosseini'))
  })
})

// scoreFields
describe('scoreFields', () => {
  it('returns null when no field matches', () => {
    const r = scoreFields('xyz', [{ value: 'علی احمدی' }, { value: '09123456789' }])
    expect(r).toBeNull()
  })
  it('applies weight multiplier', () => {
    const heavy = scoreFields('علی', [{ value: 'علی احمدی', weight: 3 }])!
    const light = scoreFields('علی', [{ value: 'علی احمدی', weight: 1 }])!
    expect(heavy).toBeGreaterThan(light)
  })
  it('matches on second field when first does not match', () => {
    const r = scoreFields('09123', [
      { value: 'علی احمدی', weight: 1 },
      { value: '09123456789', weight: 0.8 },
    ])
    expect(r).not.toBeNull()
  })
  it('returns highest weighted score across competing fields', () => {
    const highWeight = 5
    const r = scoreFields('علی', [
      { value: 'علی رضایی', weight: 0.5 },
      { value: 'علی', weight: highWeight },
    ])!
    const expected = fuzzyScore('علی', 'علی')! * highWeight
    expect(r).toBeCloseTo(expected, 1)
  })
})

// matchRanges
describe('matchRanges', () => {
  it('returns empty array for empty query', () => {
    expect(matchRanges('', 'علی احمدی')).toEqual([])
  })
  it('returns [start, end) range for exact match', () => {
    const [[start, end]] = matchRanges('علی', 'علی احمدی')
    expect(start).toBe(0)
    expect(end - start).toBe(3)
  })
  it('returns empty when query not found', () => {
    expect(matchRanges('xyz', 'علی احمدی')).toEqual([])
  })
  it('handles normalization for Arabic ya', () => {
    const ranges = matchRanges('علي', 'علی احمدی')
    expect(ranges).toHaveLength(1)
  })
  it('range is non-zero offset for mid-string match', () => {
    const [[start]] = matchRanges('احمدی', 'علی احمدی')
    expect(start).toBeGreaterThan(0)
  })
})
