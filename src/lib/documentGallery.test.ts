import { describe, it, expect } from 'vitest'
import {
  categoryOf, toothCodesOf, filterDocuments, documentCountByTooth,
  countByCategory, toggleSelection, isAllSelected, toggleSelectAll,
  pruneSelection, emptyGalleryFilter,
} from './documentGallery'
import type { RadiologyImage } from '../types'

function img(over: Partial<RadiologyImage> = {}): RadiologyImage {
  return {
    id: over.id || 'i1',
    clinic_id: 'c1',
    patient_id: over.patient_id || 'p1',
    doctor_id: null,
    encounter_id: null,
    image_type: over.image_type !== undefined ? over.image_type : 'periapical',
    tooth_number: over.tooth_number !== undefined ? over.tooth_number : '16',
    image_url: over.image_url ?? 'https://x/i.png',
    description: over.description !== undefined ? over.description : 'پوسیدگی',
    taken_at: over.taken_at !== undefined ? over.taken_at : '2026-08-01',
    notes: over.notes ?? null,
    is_active: over.is_active !== undefined ? over.is_active : true,
    created_at: over.created_at || '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  }
}

describe('categoryOf', () => {
  it('maps every radiograph modality into one bucket', () => {
    for (const t of ['panoramic', 'periapical', 'cephalometric', 'bitewing', 'cbct']) {
      expect(categoryOf(t)).toBe('radiograph')
    }
  })

  it('maps clinical photography', () => {
    expect(categoryOf('intraoral')).toBe('photo')
    expect(categoryOf('extraoral')).toBe('photo')
  })

  it('recognises stylus notes and attachments', () => {
    expect(categoryOf('pen_note')).toBe('penNote')
    expect(categoryOf('file')).toBe('attachment')
  })

  it('is case-insensitive', () => {
    expect(categoryOf('PANORAMIC')).toBe('radiograph')
  })

  it('files unknown or null types under attachments instead of dropping them', () => {
    // A record matching no tab would be invisible — effectively lost.
    expect(categoryOf('something-new')).toBe('attachment')
    expect(categoryOf(null)).toBe('attachment')
  })
})

describe('toothCodesOf', () => {
  it('parses a single code', () => {
    expect(toothCodesOf(img({ tooth_number: '16' }))).toEqual(['16'])
  })

  it('parses comma, space and Persian-comma separated lists', () => {
    expect(toothCodesOf(img({ tooth_number: '16,26 36،46' }))).toEqual(['16', '26', '36', '46'])
  })

  it('drops invalid codes rather than creating phantom teeth', () => {
    expect(toothCodesOf(img({ tooth_number: '16, 99, abc, 56' }))).toEqual(['16'])
  })

  it('returns an empty list for a record with no tooth', () => {
    expect(toothCodesOf(img({ tooth_number: null }))).toEqual([])
    expect(toothCodesOf(img({ tooth_number: '   ' }))).toEqual([])
  })
})

describe('filterDocuments', () => {
  const list = [
    img({ id: 'a', image_type: 'periapical', tooth_number: '16', taken_at: '2026-08-03' }),
    img({ id: 'b', image_type: 'panoramic', tooth_number: '16,26,36', taken_at: '2026-08-02' }),
    img({ id: 'c', image_type: 'intraoral', tooth_number: null, description: 'لبخند', taken_at: '2026-08-01' }),
    img({ id: 'd', image_type: 'periapical', tooth_number: '16', is_active: false }),
  ]

  it('shows every active document newest first', () => {
    expect(filterDocuments(list, emptyGalleryFilter).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('never shows an archived document', () => {
    const all = filterDocuments(list, emptyGalleryFilter)
    expect(all.find((i) => i.id === 'd')).toBeUndefined()
  })

  it('filters by category', () => {
    expect(filterDocuments(list, { ...emptyGalleryFilter, category: 'photo' }).map((i) => i.id)).toEqual(['c'])
  })

  it('filters by tooth, including multi-tooth records', () => {
    // The panoramic covers 16 too, so it must appear alongside the PA.
    expect(filterDocuments(list, { ...emptyGalleryFilter, toothFdi: '16' }).map((i) => i.id)).toEqual(['a', 'b'])
    expect(filterDocuments(list, { ...emptyGalleryFilter, toothFdi: '26' }).map((i) => i.id)).toEqual(['b'])
  })

  it('excludes documents with no tooth once a tooth filter is set', () => {
    expect(filterDocuments(list, { ...emptyGalleryFilter, toothFdi: '16' }).find((i) => i.id === 'c')).toBeUndefined()
  })

  it('combines category and tooth filters', () => {
    const r = filterDocuments(list, { ...emptyGalleryFilter, category: 'radiograph', toothFdi: '26' })
    expect(r.map((i) => i.id)).toEqual(['b'])
  })

  it('searches description, notes and tooth text', () => {
    expect(filterDocuments(list, { ...emptyGalleryFilter, query: 'لبخند' }).map((i) => i.id)).toEqual(['c'])
    expect(filterDocuments(list, { ...emptyGalleryFilter, query: '26' }).map((i) => i.id)).toEqual(['b'])
  })

  it('can search the patient name through the resolver', () => {
    const nameOf = (i: RadiologyImage) => (i.id === 'c' ? 'شاهان افشار' : 'دیگری')
    expect(filterDocuments(list, { ...emptyGalleryFilter, query: 'شاهان' }, nameOf).map((i) => i.id)).toEqual(['c'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterDocuments(list, { ...emptyGalleryFilter, query: 'zzz' })).toEqual([])
  })
})

describe('documentCountByTooth', () => {
  it('counts a multi-tooth record once per tooth and skips archived', () => {
    const counts = documentCountByTooth([
      img({ id: 'a', tooth_number: '16' }),
      img({ id: 'b', tooth_number: '16,26' }),
      img({ id: 'c', tooth_number: '36', is_active: false }),
      img({ id: 'd', tooth_number: null }),
    ])
    expect(counts).toEqual({ '16': 2, '26': 1 })
  })
})

describe('countByCategory', () => {
  it('counts each bucket and always returns all four keys', () => {
    const counts = countByCategory([
      img({ id: 'a', image_type: 'panoramic' }),
      img({ id: 'b', image_type: 'intraoral' }),
      img({ id: 'c', image_type: 'panoramic', is_active: false }),
    ])
    expect(counts).toEqual({ radiograph: 1, photo: 1, penNote: 0, attachment: 0 })
  })
})

describe('bulk selection', () => {
  const visible = [img({ id: 'a' }), img({ id: 'b' }), img({ id: 'c' })]

  it('toggles a single id on and off', () => {
    expect(toggleSelection([], 'a')).toEqual(['a'])
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('is not "all selected" on an empty screen', () => {
    // Otherwise the header checkbox reads as checked while showing nothing.
    expect(isAllSelected([], [])).toBe(false)
    expect(isAllSelected([], ['a'])).toBe(false)
  })

  it('detects a full selection', () => {
    expect(isAllSelected(visible, ['a', 'b', 'c'])).toBe(true)
    expect(isAllSelected(visible, ['a', 'b'])).toBe(false)
  })

  it('select-all adds every visible id', () => {
    expect(toggleSelectAll(visible, []).sort()).toEqual(['a', 'b', 'c'])
  })

  it('select-all deselects when already full, keeping off-screen picks', () => {
    const result = toggleSelectAll(visible, ['a', 'b', 'c', 'z'])
    expect(result).toEqual(['z'])
  })

  it('does not duplicate ids already selected', () => {
    expect(toggleSelectAll(visible, ['a']).sort()).toEqual(['a', 'b', 'c'])
  })

  it('pruning drops ids that left the current filter', () => {
    // A bulk archive must never touch a record the user cannot see.
    expect(pruneSelection(['a', 'z'], visible)).toEqual(['a'])
  })
})
