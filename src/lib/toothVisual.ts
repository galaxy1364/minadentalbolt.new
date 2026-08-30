// toothVisual.ts — how a tooth should be DRAWN, decided separately from
// how it is coloured.
//
// Until now the chart drew every present tooth with the same anatomical
// outline and only changed the fill colour. Colour alone cannot say
// "this is an implant": an implant is not a tooth with a different
// tint, it is a threaded post in the bone. A dentist scanning an arch
// reads shape before colour, and reading the arch at a glance is the
// entire job of the chart.
//
// Competitor reference: COMP-19 (a real icon per status), COMP-20
// (implant drawn as a screw), COMP-22 (crown drawn as a filled cap),
// COMP-106 (state carried by shape, not colour).
//
// Kept as pure functions so the mapping is pinned by tests: a future
// condition added to the union without a drawing decision should be
// caught here, not discovered on an arch that renders wrong.

import type { ToothCondition } from '../components/DentalChart'

/** The three fundamentally different things that can occupy a socket. */
export type ToothShape =
  /** Draw the anatomical tooth outline. */
  | 'tooth'
  /** Draw a threaded post — there is no crown-and-root here. */
  | 'implant'
  /** Draw nothing but the number: the socket is empty. */
  | 'absent'

export function toothShape(condition: ToothCondition): ToothShape {
  if (condition === 'implant') return 'implant'
  if (condition === 'missing' || condition === 'extraction') return 'absent'
  return 'tooth'
}

/**
 * True when the roots should be drawn filled rather than outlined.
 *
 * A root-treated tooth looks normal from the crown; the whole point of
 * marking it is that the canals are obturated. Drawing that on the root
 * is the difference between "this tooth is orange" and "this tooth has
 * been treated".
 */
export function hasRootFilling(condition: ToothCondition): boolean {
  // post and pin are anchors cemented INSIDE the canal, which means the
  // canal was treated first. Drawing them with an outlined root would
  // show an untreated root holding a post, which is not a thing.
  return condition === 'rct' || condition === 'post' || condition === 'pin'
}

/**
 * True when the crown should be drawn as a solid cap covering the whole
 * anatomy, rather than as an outlined natural crown.
 *
 * Crowns, veneers and bridge units all cover the tooth. Grouping them is
 * deliberate: they differ in what they are made of and how they are
 * billed, but on a chart they all mean "the natural crown is no longer
 * what you are looking at".
 */
export function hasCrownCap(condition: ToothCondition): boolean {
  return condition === 'crown' || condition === 'veneer' || condition === 'bridge'
}

export type ToothKind = 'molar' | 'premolar' | 'canine' | 'incisor'

/**
 * Tooth kind from an FDI number, for both permanent (11–48) and primary
 * (51–85) teeth.
 *
 * The position within the quadrant is the last digit, which is why this
 * works for primary teeth too: 54 is a first primary molar and 5 is a
 * molar position. Primary quadrants only run to 5, so nothing above that
 * can appear.
 */
export function toothKind(fdi: number): ToothKind {
  const position = fdi % 10
  const isPrimary = fdi >= 51 && fdi <= 85
  if (isPrimary) {
    // Primary: 1–2 incisors, 3 canine, 4–5 molars. There are no primary
    // premolars at all — calling 54 a premolar would draw the wrong
    // number of roots.
    if (position >= 4) return 'molar'
    if (position === 3) return 'canine'
    return 'incisor'
  }
  if (position >= 6) return 'molar'
  if (position >= 4) return 'premolar'
  if (position === 3) return 'canine'
  return 'incisor'
}

/** True for the upper arch, in both permanent and primary numbering. */
export function isUpperTooth(fdi: number): boolean {
  const quadrant = Math.floor(fdi / 10)
  return quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6
}

/**
 * A one-line description of what is drawn, used as the SVG's accessible
 * title. Screen readers otherwise get a bare number with no indication
 * that the tooth is missing or replaced.
 */
export function toothVisualLabel(fdi: number, condition: ToothCondition): string {
  const shape = toothShape(condition)
  if (shape === 'implant') return `دندان ${fdi} — ایمپلنت`
  if (shape === 'absent') return `دندان ${fdi} — کشیده شده`
  if (hasCrownCap(condition)) return `دندان ${fdi} — روکش`
  if (hasRootFilling(condition)) return `دندان ${fdi} — عصب‌کشی شده`
  return `دندان ${fdi}`
}
