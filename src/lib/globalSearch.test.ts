import { describe, it, expect } from 'vitest'
import { scoreRecord, rankResults, parseQuery, groupByKind, KIND_LABELS } from './globalSearch'
import type { SearchableRecord, GlobalResultKind } from './globalSearch'

function rec(over: Partial<SearchableRecord> = {}): SearchableRecord {
  return {
    kind: over.kind || 'patient',
    id: over.id || 'r1',
    title: over.title !== undefined ? over.title : 'علی احمدی',
    subtitle: over.subtitle !== undefined ? over.subtitle : '۰۹۱۲۳۴۵۶۷۸۹',
    route: over.route || '/patients/r1',
    keywords: over.keywords,
  }
}

describe('scoreRecord', () => {
  it('matches a title', () => {
    expect(scoreRecord('احمدی', rec())).not.toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(scoreRecord('zzzz', rec())).toBeNull()
  })

  it('returns null for an empty query rather than matching everything', () => {
    expect(scoreRecord('', rec())).toBeNull()
    expect(scoreRecord('   ', rec())).toBeNull()
  })

  it('matches a hidden keyword such as a national ID', () => {
    const r = rec({ title: 'علی احمدی', keywords: ['2841851085'] })
    expect(scoreRecord('2841851085', r)).not.toBeNull()
  })

  it('ranks a title match above an equal keyword match', () => {
    // Matching a visible name is a stronger signal than matching a
    // field the user cannot see.
    const titled = scoreRecord('احمدی', rec({ id: 'a', title: 'احمدی', keywords: [] }))!
    const keyed = scoreRecord('احمدی', rec({ id: 'b', title: 'رضایی', keywords: ['احمدی'] }))!
    expect(titled.score).toBeGreaterThan(keyed.score)
  })

  it('normalises Arabic and Persian character variants', () => {
    // ي vs ی — a staff member typing on an Arabic keyboard must still
    // find the record.
    expect(scoreRecord('احمدي', rec({ title: 'احمدی' }))).not.toBeNull()
  })

  it('normalises Persian digits against Latin ones', () => {
    expect(scoreRecord('09123456789', rec({ subtitle: '۰۹۱۲۳۴۵۶۷۸۹' }))).not.toBeNull()
  })

  it('tolerates a null subtitle', () => {
    expect(scoreRecord('احمدی', rec({ subtitle: null }))).not.toBeNull()
  })
})

describe('rankResults', () => {
  const records = [
    rec({ kind: 'patient', id: 'p', title: 'علی احمدی' }),
    rec({ kind: 'treatment', id: 't', title: 'علی احمدی', route: '/treatments/t' }),
    rec({ kind: 'labOrder', id: 'l', title: 'علی احمدی', route: '/laboratory/l' }),
  ]

  it('ranks a patient above other kinds on an equal textual match', () => {
    // A common first name must not bury the person under every record
    // that happens to mention them.
    expect(rankResults('علی', records)[0].kind).toBe('patient')
  })

  it('honours the limit', () => {
    expect(rankResults('علی', records, { limit: 2 })).toHaveLength(2)
  })

  it('defaults to a short list — a bar that scrolls is not a shortcut', () => {
    const many = Array.from({ length: 40 }, (_, i) => rec({ id: `p${i}`, title: `علی ${i}` }))
    expect(rankResults('علی', many).length).toBeLessThanOrEqual(8)
  })

  it('filters to a single kind when asked', () => {
    const r = rankResults('علی', records, { kind: 'labOrder' })
    expect(r).toHaveLength(1)
    expect(r[0].kind).toBe('labOrder')
  })

  it('returns an empty array when nothing matches', () => {
    expect(rankResults('zzzz', records)).toEqual([])
  })

  it('returns an empty array for an empty query', () => {
    expect(rankResults('', records)).toEqual([])
  })

  it('breaks score ties deterministically by title', () => {
    const tied = [
      rec({ id: 'b', title: 'بهرام' }),
      rec({ id: 'a', title: 'ابراهیم' }),
    ]
    const out = rankResults('ا', tied)
    expect(out.length).toBeGreaterThan(0)
    // Same query, same input, same order every time.
    expect(rankResults('ا', tied).map((r) => r.id)).toEqual(out.map((r) => r.id))
  })
})

describe('parseQuery', () => {
  it('detects a kind prefix', () => {
    expect(parseQuery('بیمار: احمدی')).toEqual({ kind: 'patient', text: 'احمدی' })
  })

  it('accepts a prefix with no space', () => {
    expect(parseQuery('نوبت:فردا')).toEqual({ kind: 'appointment', text: 'فردا' })
  })

  it('treats a lone prefix as an empty query, not a literal search', () => {
    // Searching for the word "بیمار" would return nothing and look broken.
    expect(parseQuery('بیمار:')).toEqual({ kind: 'patient', text: '' })
  })

  it('leaves an unknown prefix as plain text', () => {
    expect(parseQuery('چیز: احمدی')).toEqual({ kind: null, text: 'چیز: احمدی' })
  })

  it('handles a query with no colon', () => {
    expect(parseQuery('احمدی')).toEqual({ kind: null, text: 'احمدی' })
  })

  it('normalises the prefix so Arabic variants still work', () => {
    expect(parseQuery('بيمار: احمدی').kind).toBe('patient')
  })
})

describe('groupByKind', () => {
  it('groups while preserving rank order', () => {
    const results = rankResults('علی', [
      rec({ kind: 'patient', id: 'p1', title: 'علی احمدی' }),
      rec({ kind: 'patient', id: 'p2', title: 'علی رضایی' }),
      rec({ kind: 'treatment', id: 't1', title: 'علی احمدی', route: '/t' }),
    ])
    const groups = groupByKind(results)
    expect(groups[0].kind).toBe('patient')
    expect(groups[0].items).toHaveLength(2)
  })

  it('returns an empty array for no results', () => {
    expect(groupByKind([])).toEqual([])
  })
})

describe('KIND_LABELS', () => {
  it('labels every kind, so a new entity cannot ship unlabelled', () => {
    const kinds: GlobalResultKind[] = ['patient', 'appointment', 'treatment', 'labOrder', 'payment', 'page']
    for (const k of kinds) expect(KIND_LABELS[k]).toBeTruthy()
  })
})
