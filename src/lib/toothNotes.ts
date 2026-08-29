// toothNotes.ts — pure domain logic for tooth-scoped clinical notes.
// Kept free of React and Dexie so every rule below is unit-testable
// without a browser, per the project's testing standard.
import type { ToothNote, ToothNoteKind } from '../types'

/** Hard ceiling on a voice memo. Matches the competitor's 90s limit and,
 * more importantly, keeps a single base64 clip small enough that it does
 * not bloat the offline IndexedDB store or a later sync payload. */
export const MAX_AUDIO_SECONDS = 90

/** Palette offered in the UI. Stored as a plain hex string so adding or
 * removing a colour later never invalidates existing rows. */
export const NOTE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
] as const

export const KIND_LABELS: Record<ToothNoteKind, string> = {
  text: 'یادداشت متنی',
  drawing: 'یادداشت قلم',
  audio: 'یادداشت صوتی',
}

export interface ToothNoteDraft {
  kind: ToothNoteKind
  body: string
  toothFdi: string | null
  attachmentDataUrl: string | null
  durationSec: number | null
  color: string | null
}

export function emptyDraft(toothFdi: string | null = null): ToothNoteDraft {
  return { kind: 'text', body: '', toothFdi, attachmentDataUrl: null, durationSec: null, color: null }
}

/**
 * Validation. Returns [] when the draft may be saved.
 *
 * A required field must actually block saving — the project forbids
 * fields that merely warn — so the UI disables its save button purely
 * on this result rather than re-deciding the rules itself.
 */
export function validateDraft(d: ToothNoteDraft): string[] {
  const errors: string[] = []

  if (d.kind === 'text') {
    if (!d.body.trim()) errors.push('متن یادداشت را وارد کنید')
  } else {
    if (!d.attachmentDataUrl) {
      errors.push(d.kind === 'drawing' ? 'ابتدا یادداشت را رسم کنید' : 'ابتدا صدا را ضبط کنید')
    }
  }

  if (d.kind === 'audio') {
    if (d.durationSec === null || d.durationSec <= 0) {
      errors.push('مدت ضبط نامعتبر است')
    } else if (d.durationSec > MAX_AUDIO_SECONDS) {
      errors.push(`حداکثر مدت ضبط ${MAX_AUDIO_SECONDS} ثانیه است`)
    }
  }

  // A tooth number is optional (general notes are allowed) but when it IS
  // present it must be a real FDI position, otherwise the per-tooth
  // filter would quietly hide the note forever.
  if (d.toothFdi !== null && !isValidFdi(d.toothFdi)) {
    errors.push('شماره دندان نامعتبر است')
  }

  if (d.color !== null && !(NOTE_COLORS as readonly string[]).includes(d.color)) {
    errors.push('رنگ انتخابی نامعتبر است')
  }

  return errors
}

/** Permanent dentition 11–48 and primary dentition 51–85, matching the
 * ranges PalmerToothPicker already emits elsewhere in the app. */
export function isValidFdi(fdi: string): boolean {
  if (!/^\d{2}$/.test(fdi)) return false
  const n = Number(fdi)
  const quadrant = Math.floor(n / 10)
  const position = n % 10
  if (quadrant >= 1 && quadrant <= 4) return position >= 1 && position <= 8
  if (quadrant >= 5 && quadrant <= 8) return position >= 1 && position <= 5
  return false
}

/** Only notes that are still active are ever shown; soft-deleted ones
 * stay in the store for the audit trail but never surface in the UI. */
export function visibleNotes(notes: ToothNote[]): ToothNote[] {
  return notes.filter((n) => n.is_active)
}

/** Newest first — chairside, the last thing recorded is what matters. */
export function sortByNewest(notes: ToothNote[]): ToothNote[] {
  return [...notes].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export interface NoteFilter {
  /** null = show every note; a FDI string = only that tooth. */
  toothFdi: string | null
  /** null = every kind. */
  kind: ToothNoteKind | null
  /** Free-text match against the note body. */
  query: string
}

export function filterNotes(notes: ToothNote[], f: NoteFilter): ToothNote[] {
  const q = f.query.trim().toLowerCase()
  return sortByNewest(visibleNotes(notes)).filter((n) => {
    if (f.toothFdi !== null && n.tooth_fdi !== f.toothFdi) return false
    if (f.kind !== null && n.kind !== f.kind) return false
    if (q && !(n.body || '').toLowerCase().includes(q)) return false
    return true
  })
}

/** Count of active notes per tooth, used to badge the mini tooth chart so
 * a doctor can see at a glance which teeth already carry notes. */
export function countByTooth(notes: ToothNote[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const n of visibleNotes(notes)) {
    if (!n.tooth_fdi) continue
    counts[n.tooth_fdi] = (counts[n.tooth_fdi] || 0) + 1
  }
  return counts
}

export function formatDuration(sec: number): string {
  const safe = Math.max(0, Math.floor(sec))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Rough byte size of a data URL, for warning before a huge attachment
 * is queued for sync. base64 encodes 3 bytes into 4 characters. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return 0
  const payload = dataUrl.slice(comma + 1)
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}
