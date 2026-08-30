// surfaceGlyph.ts — the five-part target that sits under each tooth.
//
// Recording which SURFACE is affected currently costs a modal: tap the
// tooth, wait for the panel, find the surface row, tap, close. A chart
// is meant to be read and marked at the speed of an examination, and
// five taps per tooth is not that speed.
//
// The competitor puts a small divided circle directly beneath every
// tooth (COMP-103), so a surface is one tap from the arch. This computes
// the geometry for that, kept out of the component so the shape can be
// tested and so both the chart and the detail panel can draw the same
// target rather than two that drift apart.
//
// Layout follows the anatomical convention the surface picker labels:
//
//        mesial
//   buccal  O  lingual      (O = occlusal / incisal, the centre)
//        distal
//
// Mesial is toward the midline. On the patient's LEFT quadrants that is
// screen-right; on the RIGHT quadrants it is screen-left. Getting this
// backwards would put a filling on the wrong side of the tooth in the
// record, so the side is derived from the FDI number rather than
// assumed.

import type { ToothSurface } from '../components/DentalChart'

export interface SurfaceSector {
  surface: ToothSurface
  /** SVG path for the sector, in a 0 0 24 24 viewBox. */
  d: string
  /** Where to put a one-letter label. */
  labelX: number
  labelY: number
  /** M / D / B / L / O — the letters clinicians already use. */
  letter: string
}

const CX = 12
const CY = 12
const R_OUTER = 11
const R_INNER = 4.6

/** A quadrant wedge of the ring, from `fromDeg` to `toDeg` clockwise
 * with 0° pointing up. */
function wedge(fromDeg: number, toDeg: number): string {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const p = (r: number, d: number) => `${(CX + r * Math.cos(rad(d))).toFixed(2)} ${(CY + r * Math.sin(rad(d))).toFixed(2)}`
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0
  return [
    `M ${p(R_INNER, fromDeg)}`,
    `L ${p(R_OUTER, fromDeg)}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${p(R_OUTER, toDeg)}`,
    `L ${p(R_INNER, toDeg)}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${p(R_INNER, fromDeg)}`,
    'Z',
  ].join(' ')
}

/** True when this tooth's mesial side faces screen-right.
 *
 * FDI quadrants 1 and 4 are the patient's right, drawn on the viewer's
 * left in a chart laid out as if facing the patient — so for those the
 * midline, and therefore mesial, is to the screen-right. */
export function mesialOnRight(fdi: number): boolean {
  const q = Math.floor(fdi / 10)
  return q === 1 || q === 4 || q === 5 || q === 8
}

/**
 * The five sectors for one tooth.
 *
 * The centre is a disc rather than a wedge because occlusal (or incisal
 * on an anterior) is the surface marked most often, and a centre target
 * is the easiest thing to hit with a thumb.
 */
export function surfaceSectors(fdi: number): SurfaceSector[] {
  const rightIsMesial = mesialOnRight(fdi)
  const mesial: SurfaceSector = {
    surface: 'mesial',
    d: wedge(45, 135),
    labelX: rightIsMesial ? 19 : 5,
    labelY: 13,
    letter: 'M',
  }
  const distal: SurfaceSector = {
    surface: 'distal',
    d: wedge(225, 315),
    labelX: rightIsMesial ? 5 : 19,
    labelY: 13,
    letter: 'D',
  }

  // Swap which screen side each occupies, without swapping the labels —
  // the letter must stay with its surface.
  const right = rightIsMesial ? mesial : distal
  const left = rightIsMesial ? distal : mesial

  return [
    { ...right, d: wedge(45, 135) },
    { ...left, d: wedge(225, 315) },
    { surface: 'buccal', d: wedge(135, 225), labelX: 12, labelY: 21, letter: 'B' },
    { surface: 'lingual', d: wedge(315, 45), labelX: 12, labelY: 6, letter: 'L' },
    {
      surface: 'occlusal',
      d: `M ${CX} ${CY - R_INNER} A ${R_INNER} ${R_INNER} 0 1 1 ${CX - 0.01} ${CY - R_INNER} Z`,
      labelX: 12,
      labelY: 13,
      letter: 'O',
    },
  ]
}

/** Anteriors bite with an edge, not a table. Using the right word keeps
 * the chart speaking the language of the person reading it. */
export function centreLetter(fdi: number): string {
  const position = fdi % 10
  const isPrimary = fdi >= 51 && fdi <= 85
  const anterior = isPrimary ? position <= 3 : position <= 3
  return anterior ? 'I' : 'O'
}
