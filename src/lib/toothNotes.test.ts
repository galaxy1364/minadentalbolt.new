import { describe, it, expect } from 'vitest'
import {
  MAX_AUDIO_SECONDS, NOTE_COLORS, emptyDraft, validateDraft, isValidFdi,
  visibleNotes, sortByNewest, filterNotes, countByTooth, formatDuration,
  dataUrlBytes,
} from './toothNotes'
import type { ToothNote, ToothNoteKind } from '../types'

function note(over: Partial<ToothNote> = {}): ToothNote {
  return {
    id: over.id || 'n1',
    clinic_id: 'c1',
    patient_id: 'p1',
    tooth_fdi: over.tooth_fdi !== undefined ? over.tooth_fdi : '16',
    kind: (over.kind || 'text') as ToothNoteKind,
    body: over.body !== undefined ? over.body : 'پوسیدگی عمیق',
    attachment_data_url: over.attachment_data_url ?? null,
    duration_sec: over.duration_sec ?? null,
    color: over.color ?? null,
    author_name: over.author_name ?? 'دکتر',
    is_active: over.is_active !== undefined ? over.is_active : true,
    created_at: over.created_at || '2026-08-01T10:00:00.000Z',
    updated_at: over.updated_at || '2026-08-01T10:00:00.000Z',
    sync_version: 1,
  }
}

describe('isValidFdi', () => {
  it('accepts permanent dentition positions 1-8', () => {
    expect(isValidFdi('11')).toBe(true)
    expect(isValidFdi('18')).toBe(true)
    expect(isValidFdi('48')).toBe(true)
  })

  it('accepts primary dentition positions 1-5 only', () => {
    expect(isValidFdi('55')).toBe(true)
    expect(isValidFdi('85')).toBe(true)
    // A primary quadrant has no 6th tooth — accepting it would create a
    // note pinned to a tooth the chart can never render.
    expect(isValidFdi('56')).toBe(false)
  })

  it('rejects out-of-range and malformed values', () => {
    expect(isValidFdi('10')).toBe(false)
    expect(isValidFdi('19')).toBe(false)
    expect(isValidFdi('91')).toBe(false)
    expect(isValidFdi('1')).toBe(false)
    expect(isValidFdi('161')).toBe(false)
    expect(isValidFdi('')).toBe(false)
    expect(isValidFdi('ab')).toBe(false)
  })
})

describe('validateDraft', () => {
  it('accepts a minimal valid text note', () => {
    const d = { ...emptyDraft('16'), body: 'تست' }
    expect(validateDraft(d)).toEqual([])
  })

  it('blocks an empty text note — whitespace is not content', () => {
    expect(validateDraft({ ...emptyDraft(), body: '   ' })).toContain('متن یادداشت را وارد کنید')
  })

  it('blocks a drawing note with no sketch', () => {
    const d = { ...emptyDraft(), kind: 'drawing' as const }
    expect(validateDraft(d)).toContain('ابتدا یادداشت را رسم کنید')
  })

  it('blocks an audio note with no recording', () => {
    const d = { ...emptyDraft(), kind: 'audio' as const, durationSec: 10 }
    expect(validateDraft(d)).toContain('ابتدا صدا را ضبط کنید')
  })

  it('enforces the 90 second recording ceiling', () => {
    const base = { ...emptyDraft(), kind: 'audio' as const, attachmentDataUrl: 'data:audio/webm;base64,AAA=' }
    expect(validateDraft({ ...base, durationSec: MAX_AUDIO_SECONDS })).toEqual([])
    expect(validateDraft({ ...base, durationSec: MAX_AUDIO_SECONDS + 1 }))
      .toContain(`حداکثر مدت ضبط ${MAX_AUDIO_SECONDS} ثانیه است`)
  })

  it('rejects a zero or negative recording length', () => {
    const base = { ...emptyDraft(), kind: 'audio' as const, attachmentDataUrl: 'data:audio/webm;base64,AAA=' }
    expect(validateDraft({ ...base, durationSec: 0 })).toContain('مدت ضبط نامعتبر است')
    expect(validateDraft({ ...base, durationSec: -5 })).toContain('مدت ضبط نامعتبر است')
  })

  it('allows a general note with no tooth attached', () => {
    expect(validateDraft({ ...emptyDraft(null), body: 'کلی' })).toEqual([])
  })

  it('rejects an invalid tooth number', () => {
    expect(validateDraft({ ...emptyDraft('99'), body: 'x' })).toContain('شماره دندان نامعتبر است')
  })

  it('rejects a colour outside the palette', () => {
    expect(validateDraft({ ...emptyDraft('16'), body: 'x', color: '#123456' }))
      .toContain('رنگ انتخابی نامعتبر است')
    expect(validateDraft({ ...emptyDraft('16'), body: 'x', color: NOTE_COLORS[0] })).toEqual([])
  })

  it('reports every problem at once rather than one at a time', () => {
    const d = { ...emptyDraft('99'), kind: 'audio' as const, durationSec: 200, color: '#000000' }
    expect(validateDraft(d).length).toBeGreaterThanOrEqual(4)
  })
})

describe('visibleNotes', () => {
  it('hides soft-deleted notes but does not mutate the input', () => {
    const input = [note({ id: 'a' }), note({ id: 'b', is_active: false })]
    expect(visibleNotes(input).map((n) => n.id)).toEqual(['a'])
    expect(input.length).toBe(2)
  })
})

describe('sortByNewest', () => {
  it('puts the most recent note first', () => {
    const list = [
      note({ id: 'old', created_at: '2026-01-01T00:00:00.000Z' }),
      note({ id: 'new', created_at: '2026-08-01T00:00:00.000Z' }),
    ]
    expect(sortByNewest(list).map((n) => n.id)).toEqual(['new', 'old'])
  })

  it('does not mutate the original array', () => {
    const list = [
      note({ id: 'old', created_at: '2026-01-01T00:00:00.000Z' }),
      note({ id: 'new', created_at: '2026-08-01T00:00:00.000Z' }),
    ]
    sortByNewest(list)
    expect(list[0].id).toBe('old')
  })
})

describe('filterNotes', () => {
  const notes = [
    note({ id: 'a', tooth_fdi: '16', kind: 'text', body: 'پوسیدگی', created_at: '2026-08-03T00:00:00.000Z' }),
    note({ id: 'b', tooth_fdi: '26', kind: 'audio', body: null, created_at: '2026-08-02T00:00:00.000Z' }),
    note({ id: 'c', tooth_fdi: null, kind: 'text', body: 'یادداشت کلی', created_at: '2026-08-01T00:00:00.000Z' }),
    note({ id: 'd', tooth_fdi: '16', kind: 'text', body: 'حذف شده', is_active: false }),
  ]

  it('returns every active note when nothing is filtered', () => {
    expect(filterNotes(notes, { toothFdi: null, kind: null, query: '' }).map((n) => n.id))
      .toEqual(['a', 'b', 'c'])
  })

  it('narrows to a single tooth', () => {
    expect(filterNotes(notes, { toothFdi: '16', kind: null, query: '' }).map((n) => n.id)).toEqual(['a'])
  })

  it('a general note is not returned when filtering by a tooth', () => {
    expect(filterNotes(notes, { toothFdi: '26', kind: null, query: '' }).map((n) => n.id)).toEqual(['b'])
  })

  it('narrows by kind', () => {
    expect(filterNotes(notes, { toothFdi: null, kind: 'audio', query: '' }).map((n) => n.id)).toEqual(['b'])
  })

  it('searches the body and tolerates a null body', () => {
    expect(filterNotes(notes, { toothFdi: null, kind: null, query: 'کلی' }).map((n) => n.id)).toEqual(['c'])
    expect(filterNotes(notes, { toothFdi: null, kind: null, query: 'zzz' })).toEqual([])
  })

  it('never surfaces a soft-deleted note even on an exact match', () => {
    expect(filterNotes(notes, { toothFdi: '16', kind: null, query: 'حذف' })).toEqual([])
  })
})

describe('countByTooth', () => {
  it('counts active notes per tooth and ignores general ones', () => {
    const counts = countByTooth([
      note({ id: 'a', tooth_fdi: '16' }),
      note({ id: 'b', tooth_fdi: '16' }),
      note({ id: 'c', tooth_fdi: null }),
      note({ id: 'd', tooth_fdi: '26', is_active: false }),
    ])
    expect(counts).toEqual({ '16': 2 })
  })
})

describe('formatDuration', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(9)).toBe('00:09')
    expect(formatDuration(65)).toBe('01:05')
    expect(formatDuration(MAX_AUDIO_SECONDS)).toBe('01:30')
  })

  it('clamps nonsense input instead of rendering NaN', () => {
    expect(formatDuration(-5)).toBe('00:00')
    expect(formatDuration(12.7)).toBe('00:12')
  })
})

describe('dataUrlBytes', () => {
  it('estimates the decoded size of a data URL', () => {
    // "AAAA" decodes to 3 bytes with no padding.
    expect(dataUrlBytes('data:image/png;base64,AAAA')).toBe(3)
    expect(dataUrlBytes('data:image/png;base64,AAA=')).toBe(2)
    expect(dataUrlBytes('data:image/png;base64,AA==')).toBe(1)
  })

  it('returns zero for a malformed value rather than throwing', () => {
    expect(dataUrlBytes('not-a-data-url')).toBe(0)
    expect(dataUrlBytes('')).toBe(0)
  })
})
