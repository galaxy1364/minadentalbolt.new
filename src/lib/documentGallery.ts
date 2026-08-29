// documentGallery.ts — pure logic behind the patient document gallery
// (radiographs, clinical photos, stylus notes, file attachments).
//
// Split out of Radiology.tsx so the filtering rules — especially the
// per-tooth one, which is easy to get subtly wrong — are unit-testable
// without rendering a page.
import type { RadiologyImage } from '../types'
import { isValidFdi } from './toothNotes'

/** Four buckets the doctor actually thinks in, mirroring how a chart-side
 * gallery is organised. Each maps onto one or more stored `image_type`
 * values so no existing row has to be migrated. */
export type DocCategory = 'radiograph' | 'photo' | 'penNote' | 'attachment'

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  radiograph: 'رادیوگرافی',
  photo: 'فتوگرافی',
  penNote: 'یادداشت قلم نوری',
  attachment: 'ضمائم',
}

const RADIOGRAPH_TYPES = ['panoramic', 'periapical', 'cephalometric', 'bitewing', 'cbct']
const PHOTO_TYPES = ['intraoral', 'photo', 'extraoral']
const PEN_NOTE_TYPES = ['pen_note']
const ATTACHMENT_TYPES = ['attachment', 'file']

/** Anything unrecognised falls into 'attachment' rather than vanishing —
 * an image that matches no tab would be invisible and effectively lost. */
export function categoryOf(imageType: string | null): DocCategory {
  const t = (imageType || '').toLowerCase()
  if (RADIOGRAPH_TYPES.includes(t)) return 'radiograph'
  if (PHOTO_TYPES.includes(t)) return 'photo'
  if (PEN_NOTE_TYPES.includes(t)) return 'penNote'
  if (ATTACHMENT_TYPES.includes(t)) return 'attachment'
  return 'attachment'
}

/** A record may cover several teeth (a panoramic covers the whole arch),
 * stored as a comma/space separated list. Returns only valid FDI codes so
 * a typo can never create a phantom tooth in the filter chart. */
export function toothCodesOf(img: RadiologyImage): string[] {
  const raw = img.tooth_number || ''
  return raw
    .split(/[,\s،]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && isValidFdi(s))
}

export interface GalleryFilter {
  category: DocCategory | null
  /** null = every tooth. A record with no tooth is excluded once a tooth
   * is chosen — the doctor asked about that tooth specifically. */
  toothFdi: string | null
  query: string
}

export const emptyGalleryFilter: GalleryFilter = { category: null, toothFdi: null, query: '' }

export function filterDocuments(
  images: RadiologyImage[],
  filter: GalleryFilter,
  nameOf: (img: RadiologyImage) => string = () => '',
): RadiologyImage[] {
  const q = filter.query.trim().toLowerCase()
  return images
    .filter((img) => {
      // Archived records stay in the store for the legal retention trail
      // but must never appear in the gallery.
      if (!img.is_active) return false
      if (filter.category && categoryOf(img.image_type) !== filter.category) return false
      if (filter.toothFdi && !toothCodesOf(img).includes(filter.toothFdi)) return false
      if (q) {
        const haystack = [
          img.description || '',
          img.notes || '',
          img.tooth_number || '',
          nameOf(img),
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => (b.taken_at || b.created_at || '').localeCompare(a.taken_at || a.created_at || ''))
}

/** Documents per tooth, for badging the mini chart used as a filter. */
export function documentCountByTooth(images: RadiologyImage[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const img of images) {
    if (!img.is_active) continue
    for (const code of toothCodesOf(img)) counts[code] = (counts[code] || 0) + 1
  }
  return counts
}

export function countByCategory(images: RadiologyImage[]): Record<DocCategory, number> {
  const counts: Record<DocCategory, number> = { radiograph: 0, photo: 0, penNote: 0, attachment: 0 }
  for (const img of images) {
    if (!img.is_active) continue
    counts[categoryOf(img.image_type)] += 1
  }
  return counts
}

// ── Bulk selection ──────────────────────────────────────────────────────
// Selection is kept as a plain id array so it survives re-filtering; the
// helpers below keep it consistent with what is actually on screen.

export function toggleSelection(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
}

/** True only when every currently visible row is selected — and never for
 * an empty list, otherwise the "select all" box reads as checked on a
 * screen showing nothing. */
export function isAllSelected(visible: RadiologyImage[], selected: string[]): boolean {
  if (visible.length === 0) return false
  return visible.every((v) => selected.includes(v.id))
}

export function toggleSelectAll(visible: RadiologyImage[], selected: string[]): string[] {
  if (isAllSelected(visible, selected)) {
    const visibleIds = new Set(visible.map((v) => v.id))
    // Preserve anything selected outside the current filter.
    return selected.filter((id) => !visibleIds.has(id))
  }
  const merged = new Set(selected)
  for (const v of visible) merged.add(v.id)
  return [...merged]
}

/** Drops ids that are no longer visible//existing, so a bulk action can
 * never touch a record the user cannot currently see. */
export function pruneSelection(selected: string[], visible: RadiologyImage[]): string[] {
  const visibleIds = new Set(visible.map((v) => v.id))
  return selected.filter((id) => visibleIds.has(id))
}
