// DentalChart.tsx — Professional interactive dental chart with SVG tooth shapes
// Supports: FDI numbering, surfaces, conditions, treatment history, primary teeth
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Smile, Plus, Activity, AlertCircle, Clock, Grid3x3 } from 'lucide-react'
import { h } from '../lib/haptics'
import { ToothRecord, Treatment } from '../types'
import { toPersianDigits, toJalaliStringPretty } from '../lib/persianDate'
import { toothShape, hasRootFilling, hasCrownCap, toothKind, isUpperTooth, toothVisualLabel } from '../lib/toothVisual'
import { surfaceSectors, centreLetter } from '../lib/surfaceGlyph'
import { Badge } from './ui'

// ── Types ─────────────────────────────────────────────────────
export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'restored'
  | 'rct'
  | 'post'
  | 'pin'
  | 'crown'
  | 'implant'
  | 'extraction'
  | 'missing'
  | 'bridge'
  | 'veneer'
  | 'sealant'

export type ToothSurface = 'occlusal' | 'mesial' | 'distal' | 'buccal' | 'lingual'

interface ToothSurfaceCondition {
  surface: ToothSurface
  condition: ToothCondition
  treatmentId?: string
  date?: string
}

interface ToothData {
  number: number
  condition: ToothCondition
  surfaces: ToothSurfaceCondition[]
  notes?: string
  record?: ToothRecord
  treatments: Treatment[]
  /** True when this tooth's condition comes from treatment(s) that are
   * still 'planned'/'in_progress' — none of them actually completed
   * yet. Lets the chart show real progress (upcoming work looks
   * different from finished work) instead of coloring a not-yet-done
   * treatment identically to a completed one. */
  isPlannedOnly?: boolean
}

// ── Constants ─────────────────────────────────────────────────
const upperRight = [18, 17, 16, 15, 14, 13, 12, 11]
const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28]
const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38]
const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41]

// Palmer notation: each quadrant uses 1-8, displayed with quadrant symbols
// Upper Right ┘, Upper Left └, Lower Left ┐, Lower Right ┌
const palmerUpperRight = [8, 7, 6, 5, 4, 3, 2, 1]
const palmerUpperLeft = [1, 2, 3, 4, 5, 6, 7, 8]
const palmerLowerLeft = [1, 2, 3, 4, 5, 6, 7, 8]
const palmerLowerRight = [8, 7, 6, 5, 4, 3, 2, 1]

const palmerPrimaryUpperRight = ['E', 'D', 'C', 'B', 'A']
const palmerPrimaryUpperLeft = ['A', 'B', 'C', 'D', 'E']
const palmerPrimaryLowerLeft = ['A', 'B', 'C', 'D', 'E']
const palmerPrimaryLowerRight = ['E', 'D', 'C', 'B', 'A']

const palmerSymbols: Record<string, string> = {
  upperRight: '└', upperLeft: '┘', lowerLeft: '┐', lowerRight: '┌',
  primaryUpperRight: '└', primaryUpperLeft: '┘', primaryLowerLeft: '┐', primaryLowerRight: '┌',
}

// Convert FDI number to Palmer display string
function fdiToPalmer(fdi: number): string {
  const quad = Math.floor(fdi / 10)
  const num = fdi % 10
  if (fdi >= 51 && fdi <= 85) {
    // Primary teeth: FDI 51-55=UR, 61-65=UL, 71-75=LL, 81-85=LR
    const primaryMap: Record<number, string> = {
      51: 'A', 52: 'B', 53: 'C', 54: 'D', 55: 'E',
      61: 'A', 62: 'B', 63: 'C', 64: 'D', 65: 'E',
      71: 'A', 72: 'B', 73: 'C', 74: 'D', 75: 'E',
      81: 'A', 82: 'B', 83: 'C', 84: 'D', 85: 'E',
    }
    return primaryMap[fdi] || String(num)
  }
  return String(num)
}

const primaryUpperRight = [55, 54, 53, 52, 51]
const primaryUpperLeft = [61, 62, 63, 64, 65]
const primaryLowerLeft = [71, 72, 73, 74, 75]
const primaryLowerRight = [85, 84, 83, 82, 81]

/** `dot` is a Tailwind class for the legend; `dotHex` is the same colour
 * as a literal, because SVG fill cannot take a class. Kept in one table
 * so the glyph and the legend can never disagree about what a colour
 * means. */
const conditionMeta: Record<ToothCondition, { label: string; color: string; bg: string; border: string; dot: string; dotHex: string }> = {
  healthy: { label: 'سالم', color: 'text-slate-600', bg: 'bg-white', border: 'border-slate-200', dot: 'bg-slate-300', dotHex: '#cbd5e1' },
  caries: { label: 'پوسیدگی', color: 'text-error-700', bg: 'bg-error-50', border: 'border-error-300', dot: 'bg-error-500', dotHex: '#ef4444' },
  restored: { label: 'ترمیم شده', color: 'text-primary-700', bg: 'bg-primary-50', border: 'border-primary-300', dot: 'bg-primary-500', dotHex: '#0d9488' },
  rct: { label: 'عصب‌کشی', color: 'text-warning-700', bg: 'bg-warning-50', border: 'border-warning-400', dot: 'bg-warning-500', dotHex: '#f59e0b' },
  post: { label: 'پست', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400', dot: 'bg-orange-500', dotHex: '#f97316' },
  pin: { label: 'پین', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', dot: 'bg-orange-400', dotHex: '#fb923c' },
  crown: { label: 'روکش', color: 'text-accent-700', bg: 'bg-accent-50', border: 'border-accent-400', dot: 'bg-accent-500', dotHex: '#f97316' },
  implant: { label: 'ایمپلنت', color: 'text-secondary-700', bg: 'bg-secondary-50', border: 'border-secondary-400', dot: 'bg-secondary-500', dotHex: '#64748b' },
  extraction: { label: 'کشیده شده', color: 'text-slate-500', bg: 'bg-slate-200', border: 'border-slate-400', dot: 'bg-slate-500', dotHex: '#64748b' },
  missing: { label: 'مفقود', color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-300', dot: 'bg-slate-400', dotHex: '#94a3b8' },
  bridge: { label: 'بریج', color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-400', dot: 'bg-primary-400', dotHex: '#2dd4bf' },
  veneer: { label: 'ونیر', color: 'text-accent-600', bg: 'bg-accent-50', border: 'border-accent-300', dot: 'bg-accent-400', dotHex: '#fb923c' },
  sealant: { label: 'سیلنت', color: 'text-success-700', bg: 'bg-success-50', border: 'border-success-300', dot: 'bg-success-500', dotHex: '#22c55e' },
}

const surfaceLabels: Record<ToothSurface, string> = {
  occlusal: 'اکلوزال (جونده)',
  mesial: 'مزیال',
  distal: 'دیستال',
  buccal: 'باکال (بیرونی)',
  lingual: 'لینگوال (داخلی)',
}

const conditionOptions: { value: ToothCondition; label: string }[] = [
  { value: 'healthy', label: 'سالم' },
  { value: 'caries', label: 'پوسیدگی' },
  { value: 'restored', label: 'ترمیم شده' },
  { value: 'rct', label: 'عصب‌کشی' },
  { value: 'post', label: 'پست' },
  { value: 'pin', label: 'پین' },
  { value: 'crown', label: 'روکش' },
  { value: 'implant', label: 'ایمپلنت' },
  { value: 'extraction', label: 'کشیده شده' },
  { value: 'missing', label: 'مفقود' },
  { value: 'bridge', label: 'بریج' },
  { value: 'veneer', label: 'ونیر' },
  { value: 'sealant', label: 'سیلنت' },
]

// ── SVG Tooth Component ──────────────────────────────────────
function ToothSVG({
  number,
  condition,
  surfaces,
  size = 48,
  onClick,
  selected,
  labelOverride,
}: {
  number: number
  condition: ToothCondition
  surfaces: ToothSurfaceCondition[]
  size?: number
  onClick?: () => void
  selected?: boolean
  labelOverride?: string
}) {
  const meta = conditionMeta[condition]
  // Derived in lib/toothVisual so the chart and anything else that needs
  // to know what kind of tooth this is agree by construction. The inline
  // `number % 10` versions that used to live here were a second source
  // of truth, and they got primary teeth wrong: 54 is a primary molar,
  // not a premolar.
  const kind = toothKind(number)
  const isUpper = isUpperTooth(number)
  const isMolar = kind === 'molar'
  const isPremolar = kind === 'premolar'
  const isAnterior = kind === 'canine' || kind === 'incisor'

  // Colors based on condition
  // Reported from the device: the arch was almost invisible — white
  // crowns outlined in #cbd5e1 on a white card, with roots drawn at 0.5
  // opacity, so a dentist saw faint cups and no anatomy at all.
  //
  // The fills stay pale, because a tooth is pale; what changed is that
  // every one now sits on an ivory tint rather than pure white, and the
  // outlines carry real contrast. Colour still says the state, but the
  // tooth is legible before you read the colour.
  const fillColors: Record<ToothCondition, string> = {
    healthy: '#fdfdfb',
    caries: '#fef2f2',
    restored: '#eff6ff',
    rct: '#fffbeb',
    post: '#fff7ed',
    pin: '#fff7ed',
    crown: '#f0fdfa',
    implant: '#f5f3ff',
    extraction: '#e2e8f0',
    missing: '#f1f5f9',
    bridge: '#eff6ff',
    veneer: '#f0fdfa',
    sealant: '#f0fdf4',
  }

  // Outlines are a full step darker than before. #cbd5e1 on white is
  // roughly 1.3:1 — below anything a person can pick out at 48px on a
  // phone held at arm's length in a surgery.
  const strokeColors: Record<ToothCondition, string> = {
    healthy: '#64748b',
    caries: '#dc2626',
    restored: '#2563eb',
    rct: '#d97706',
    post: '#c2410c',
    pin: '#c2410c',
    crown: '#0891b2',
    implant: '#7c3aed',
    extraction: '#475569',
    missing: '#94a3b8',
    bridge: '#2563eb',
    veneer: '#0891b2',
    sealant: '#16a34a',
  }

  const fillColor = fillColors[condition]
  const strokeColor = strokeColors[condition]
  const sw = selected ? 3 : 1.9
  // Subtle depth/gloss — a soft drop-shadow plus a light highlight
  // ellipse on the crown gives these flat SVG shapes a dimensional,
  // glossy-porcelain feel without needing full WebGL 3D rendering.
  const dropShadowStyle = { filter: selected ? 'drop-shadow(0 3px 5px rgba(13,148,136,0.35))' : 'drop-shadow(0 1.5px 2px rgba(15,23,42,0.12))' }

  // Surface fill colors (for caries on specific surfaces)
  /** True when this surface carries a condition of its own. Used to keep
   * a surface invisible unless something was actually recorded on it —
   * painting every surface faintly would turn a healthy tooth into a
   * patchwork. */
  const hasSurface = (surface: ToothSurface): boolean => {
    const sc = surfaces.find((x) => x.surface === surface)
    return !!sc && sc.condition !== 'healthy'
  }

  const getSurfaceFill = (surface: ToothSurface): string => {
    const sc = surfaces.find((s) => s.surface === surface)
    if (!sc || sc.condition === 'healthy') return fillColor
    return fillColors[sc.condition] || fillColor
  }

  const shape = toothShape(condition)
  const a11yTitle = toothVisualLabel(number, condition)
  // COMP-22 / COMP-106: a crowned tooth is drawn as a solid cap, and a
  // root-treated one with obturated canals. Colour alone said "this
  // tooth is orange"; shape says "this tooth has been treated".
  const rootFilled = hasRootFilling(condition)
  const crowned = hasCrownCap(condition)

  // COMP-20 / COMP-106: an implant is not a tooth in another colour, it
  // is a threaded post in the bone. Drawn as its own geometry so an arch
  // can be read by shape before colour.
  if (shape === 'implant') {
    const threads = [26, 30, 34, 38, 42]
    return (
      <svg width={size} height={size * 1.2} viewBox="0 0 48 56" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle} role="img" aria-label={a11yTitle}>
        <title>{a11yTitle}</title>
        {/* Abutment: the part above the gum that carries the crown. */}
        <path d="M 17 8 L 31 8 L 29 20 L 19 20 Z" fill={crowned ? strokeColor : fillColor} stroke={strokeColor} strokeWidth={sw} strokeLinejoin="round" />
        <ellipse cx="21" cy="11" rx="3" ry="1.6" fill="white" opacity="0.4" />
        {/* Neck */}
        <rect x="20" y="20" width="8" height="4" rx="1" fill={crowned ? strokeColor : fillColor} stroke={strokeColor} strokeWidth={sw} />
        {/* Body, tapering to an apex the way a real fixture does. */}
        <path d="M 19 24 L 29 24 L 26 46 Q 24 49, 22 46 Z" fill={crowned ? strokeColor : fillColor} stroke={strokeColor} strokeWidth={sw} strokeLinejoin="round" />
        {/* Threads — the single detail that makes it read as a screw. */}
        {threads.map((y, idx) => (
          <line
            key={y}
            x1={19.6 + idx * 0.6}
            y1={y}
            x2={28.4 - idx * 0.6}
            y2={y + 2}
            stroke={strokeColor}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.75"
          />
        ))}
        <text x="24" y="54" textAnchor="middle" fontSize="9" fill={strokeColor} fontWeight="700">
          {labelOverride || toPersianDigits(number)}
        </text>
      </svg>
    )
  }

  if (shape === 'absent') {
    return (
      <svg width={size} height={size * 1.2} viewBox="0 0 48 56" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle}>
        <g opacity="0.4">
          <text x="24" y="30" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="bold">
            ✕
          </text>
        </g>
        <text x="24" y="50" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">
          {labelOverride || toPersianDigits(number)}
        </text>
      </svg>
    )
  }

  // Draw tooth based on type
  if (isMolar) {
    // Molar: wide crown with multiple cusps
    return (
      <svg width={size} height={size * 1.2} viewBox="0 0 48 56" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle}>
        {/* Root */}
        <path
          d="M 14 28 Q 12 40, 16 48 M 34 28 Q 36 40, 32 48"
          fill="none"
          stroke={strokeColor}
          strokeWidth={rootFilled ? sw * 2.2 : sw}
          strokeLinecap="round"
          opacity={rootFilled ? 1 : 0.85}
        />
        {/* Crown outline */}
        <path
          d="M 8 14 Q 6 8, 12 6 L 36 6 Q 42 8, 40 14 L 40 26 Q 38 30, 34 28 L 14 28 Q 10 30, 8 26 Z"
          fill={crowned ? strokeColor : fillColor}
          stroke={strokeColor}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        {/* Gloss highlight — gives the flat crown a subtle porcelain sheen */}
        <ellipse cx="17" cy="11" rx="6" ry="3" fill="white" opacity="0.35" transform="rotate(-20 17 11)" />
        {/* Occlusal surface (center) */}
        <ellipse cx="24" cy="17" rx="10" ry="6" fill={getSurfaceFill('occlusal')} stroke={strokeColor} strokeWidth="0.8" opacity="0.7" />
        {/* Cusps */}
        <circle cx="16" cy="13" r="2.5" fill={getSurfaceFill('occlusal')} stroke={strokeColor} strokeWidth="0.6" opacity="0.5" />
        <circle cx="32" cy="13" r="2.5" fill={getSurfaceFill('occlusal')} stroke={strokeColor} strokeWidth="0.6" opacity="0.5" />
        <circle cx="16" cy="22" r="2.5" fill={getSurfaceFill('occlusal')} stroke={strokeColor} strokeWidth="0.6" opacity="0.5" />
        <circle cx="32" cy="22" r="2.5" fill={getSurfaceFill('occlusal')} stroke={strokeColor} strokeWidth="0.6" opacity="0.5" />
        {/* Mesial (right side) — a band rather than a hairline, so a
            mesial restoration is visible at 48px instead of being a
            slightly darker edge nobody notices. */}
        <path d="M 37 12 L 40 14 L 40 26 L 37 27 Z" fill={getSurfaceFill('mesial')} stroke="none" opacity={hasSurface('mesial') ? 0.9 : 0} />
        <line x1="40" y1="14" x2="40" y2="26" stroke={strokeColor} strokeWidth="1" opacity="0.3" />
        {/* Distal (left side) */}
        <path d="M 11 12 L 8 14 L 8 26 L 11 27 Z" fill={getSurfaceFill('distal')} stroke="none" opacity={hasSurface('distal') ? 0.9 : 0} />
        <line x1="8" y1="14" x2="8" y2="26" stroke={strokeColor} strokeWidth="1" opacity="0.3" />
        {/* Buccal (front face) and lingual (back edge) */}
        <path d="M 12 24 L 36 24 L 34 28 L 14 28 Z" fill={getSurfaceFill('buccal')} stroke="none" opacity={hasSurface('buccal') ? 0.9 : 0} />
        <path d="M 12 8 L 36 8 L 36 11 L 12 11 Z" fill={getSurfaceFill('lingual')} stroke="none" opacity={hasSurface('lingual') ? 0.9 : 0} />
        {/* Number */}
        <text x="24" y="50" textAnchor="middle" fontSize="9" fill={strokeColor} fontWeight="700">
          {labelOverride || toPersianDigits(number)}
        </text>
      </svg>
    )
  } else if (isPremolar) {
    // Premolar: smaller crown, 2 cusps
    return (
      <svg width={size} height={size * 1.2} viewBox="0 0 48 56" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle}>
        {/* Root */}
        <path d="M 20 28 Q 18 42, 22 48 M 28 28 Q 30 42, 26 48" fill="none" stroke={strokeColor} strokeWidth={rootFilled ? sw * 2.2 : sw} strokeLinecap="round" opacity={rootFilled ? 1 : 0.85} />
        {/* Crown */}
        <path
          d="M 12 12 Q 10 6, 16 5 L 32 5 Q 38 6, 36 12 L 36 26 Q 34 30, 30 28 L 18 28 Q 14 30, 12 26 Z"
          fill={crowned ? strokeColor : fillColor}
          stroke={strokeColor}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <ellipse cx="19" cy="10" rx="5" ry="2.5" fill="white" opacity="0.35" transform="rotate(-20 19 10)" />
        {/* Occlusal */}
        <ellipse cx="24" cy="16" rx="7" ry="5" fill={getSurfaceFill('occlusal')} stroke={strokeColor} strokeWidth="0.8" opacity="0.7" />
        <path d="M 33 12 L 36 14 L 36 25 L 33 26 Z" fill={getSurfaceFill('mesial')} stroke="none" opacity={hasSurface('mesial') ? 0.9 : 0} />
        <path d="M 15 12 L 12 14 L 12 25 L 15 26 Z" fill={getSurfaceFill('distal')} stroke="none" opacity={hasSurface('distal') ? 0.9 : 0} />
        <path d="M 16 24 L 32 24 L 30 28 L 18 28 Z" fill={getSurfaceFill('buccal')} stroke="none" opacity={hasSurface('buccal') ? 0.9 : 0} />
        <path d="M 16 7 L 32 7 L 32 10 L 16 10 Z" fill={getSurfaceFill('lingual')} stroke="none" opacity={hasSurface('lingual') ? 0.9 : 0} />
        {/* 2 cusps */}
        <circle cx="18" cy="13" r="2" fill={getSurfaceFill('occlusal')} stroke={strokeColor} strokeWidth="0.5" opacity="0.5" />
        <circle cx="30" cy="13" r="2" fill={getSurfaceFill('occlusal')} stroke={strokeColor} strokeWidth="0.5" opacity="0.5" />
        <text x="24" y="50" textAnchor="middle" fontSize="9" fill={strokeColor} fontWeight="700">
          {labelOverride || toPersianDigits(number)}
        </text>
      </svg>
    )
  } else {
    // Anterior (incisor/canine): single root, narrow crown
    const isCanine = kind === 'canine'
    return (
      <svg width={size} height={size * 1.2} viewBox="0 0 48 56" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle}>
        {/* Root */}
        <path
          d={isCanine ? "M 24 28 Q 22 44, 24 50" : "M 20 28 Q 18 44, 22 50 M 28 28 Q 30 44, 26 50"}
          fill="none"
          stroke={strokeColor}
          strokeWidth={rootFilled ? sw * 2.2 : sw}
          strokeLinecap="round"
          opacity={rootFilled ? 1 : 0.85}
        />
        {/* Crown */}
        {isCanine ? (
          <path
            d="M 16 8 Q 14 4, 20 3 L 28 3 Q 34 4, 32 8 L 30 28 Q 24 32, 18 28 Z"
            fill={crowned ? strokeColor : fillColor}
            stroke={strokeColor}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M 14 6 Q 12 3, 18 2 L 30 2 Q 36 3, 34 6 L 32 28 Q 24 31, 16 28 Z"
            fill={crowned ? strokeColor : fillColor}
            stroke={strokeColor}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        )}
        <ellipse cx="21" cy="8" rx="4" ry="2" fill="white" opacity="0.35" transform="rotate(-15 21 8)" />

        {/* Surfaces. Anteriors previously drew none at all, so an incisor
            with a mesial caries looked identical to a healthy one — and
            anteriors are most of what is visible on a phone-width arch.
            Molars and premolars only ever showed the occlusal, so a
            buccal restoration was invisible there too.

            Laid out the way the surface picker labels them: incisal
            across the biting edge, mesial and distal down the sides,
            buccal across the front. */}
        <path
          d={isCanine ? "M 16 8 Q 14 4, 20 3 L 28 3 Q 34 4, 32 8 Z" : "M 14 6 Q 12 3, 18 2 L 30 2 Q 36 3, 34 6 Z"}
          fill={getSurfaceFill('occlusal')}
          stroke="none"
          opacity={hasSurface('occlusal') ? 0.85 : 0}
        />
        <path
          d="M 16 8 L 18 28 Q 21 30, 22 29 L 21 8 Z"
          fill={getSurfaceFill('mesial')}
          stroke="none"
          opacity={hasSurface('mesial') ? 0.85 : 0}
        />
        <path
          d="M 32 8 L 30 28 Q 27 30, 26 29 L 27 8 Z"
          fill={getSurfaceFill('distal')}
          stroke="none"
          opacity={hasSurface('distal') ? 0.85 : 0}
        />
        <path
          d="M 21 14 L 27 14 L 26 28 Q 24 30, 22 28 Z"
          fill={getSurfaceFill('buccal')}
          stroke="none"
          opacity={hasSurface('buccal') ? 0.85 : 0}
        />
        {/* Lingual surface (back) */}
        <path d="M 18 8 Q 24 12, 30 8" fill="none" stroke={hasSurface('lingual') ? getSurfaceFill('lingual') : strokeColor} strokeWidth={hasSurface('lingual') ? 2.5 : 0.8} opacity={hasSurface('lingual') ? 0.9 : 0.4} />
        <text x="24" y="50" textAnchor="middle" fontSize="9" fill={strokeColor} fontWeight="700">
          {labelOverride || toPersianDigits(number)}
        </text>
      </svg>
    )
  }
}

// ── Tooth Detail Panel ────────────────────────────────────────
function ToothDetailPanel({
  tooth,
  onClose,
  onUpdate,
  onAddTreatment,
  onAddLabOrder,
  onAddImplantCase,
}: {
  tooth: ToothData
  onClose: () => void
  onUpdate: (condition: ToothCondition, surfaceConditions: ToothSurfaceCondition[], notes: string) => void
  onAddTreatment?: (toothNumber: string, surface?: string | null) => void
  /** MOD-FEAT-022: the chart is the natural starting point for lab work
   *  and implants too, not only treatments. */
  onAddLabOrder?: (toothNumber: string, surface?: string | null) => void
  onAddImplantCase?: (toothNumber: string, surface?: string | null) => void
}) {
  const [condition, setCondition] = useState<ToothCondition>(tooth.condition)
  const [surfaceConditions, setSurfaceConditions] = useState<ToothSurfaceCondition[]>(tooth.surfaces)

  // MOD-FEAT-022: the first surface the user has actually marked as
  // something other than healthy. That is the surface they came here
  // about, and carrying it forward is what stops the next form asking
  // for it a second time.
  const firstSurface = surfaceConditions.find((sc) => sc.condition && sc.condition !== 'healthy')?.surface || null
  const [notes, setNotes] = useState(tooth.notes || '')
  const [activeSurface, setActiveSurface] = useState<ToothSurface | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const toggleSurfaceCondition = (surface: ToothSurface, cond: ToothCondition) => {
    setSurfaceConditions((prev) => {
      const existing = prev.find((s) => s.surface === surface)
      if (existing && existing.condition === cond) {
        return prev.filter((s) => s.surface !== surface)
      }
      if (existing) {
        return prev.map((s) => (s.surface === surface ? { ...s, condition: cond } : s))
      }
      return [...prev, { surface, condition: cond }]
    })
  }

  const getSurfaceCondition = (surface: ToothSurface): ToothCondition => {
    return surfaceConditions.find((s) => s.surface === surface)?.condition || 'healthy'
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Compact quadrant indicator — from a direct request with a
                handwritten diagram: instead of a generic icon, show which
                of the 4 real jaw quadrants this specific tooth sits in at
                a glance (matches the number shown right next to it), not
                the full 32-tooth chart. A text label rather than a
                spatial grid deliberately — a mirrored left/right grid
                risks being genuinely misread in a clinical context, and
                that's worse than not showing one at all. FDI numbering:
                first digit 1/2 = upper right/left, 3/4 = lower left/
                right; primary (baby) teeth 5/6/7/8 map the same way. */}
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex flex-col items-center justify-center px-1 text-center">
              <span className="text-[9px] font-bold text-primary-600 leading-tight">
                {(() => {
                  const q = Math.floor(tooth.number / 10)
                  const norm = q >= 5 ? q - 4 : q
                  return norm === 1 ? 'بالا راست' : norm === 2 ? 'بالا چپ' : norm === 3 ? 'پایین چپ' : 'پایین راست'
                })()}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">دندان {toPersianDigits(tooth.number)}</h3>
              <p className="text-xs text-slate-500">{conditionMeta[condition].label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <span className="text-xl">✕</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Tooth Visual */}
          <div className="flex justify-center py-2">
            <div className="bg-slate-50 rounded-2xl p-4">
              <ToothSVG number={tooth.number} condition={condition} surfaces={surfaceConditions} size={80} />
            </div>
          </div>

          {/* Overall Condition */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-2">وضعیت کلی دندان</h4>
            <div className="grid grid-cols-3 gap-2">
              {conditionOptions.map((opt) => {
                const meta = conditionMeta[opt.value]
                const isActive = condition === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCondition(opt.value)}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all-smooth ${
                      isActive ? `${meta.bg} ${meta.border} ${meta.color} scale-105` : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${meta.dot} ml-1`} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Surface Conditions — redesigned: previously every one of the
              5 surfaces repeated all 11 condition buttons (55 tiny
              buttons total), which is exactly the "گیج‌کننده" clutter
              reported. Now: tap a surface chip to select it (its current
              condition color shows right there), then one shared
              condition panel appears below for just that surface —
              collapses to 5 chips + up to 11 options shown only when
              actually needed, with a smooth expand/collapse instead of
              everything visible and competing for attention at once.
              Reuses `activeSurface` state that already existed but was
              never wired to anything. */}
          {condition !== 'missing' && condition !== 'extraction' && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2">سطوح دندان — روی هر سطح بزنید تا وضعیتش را تنظیم کنید</h4>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {(Object.keys(surfaceLabels) as ToothSurface[]).map((surface) => {
                  const sc = getSurfaceCondition(surface)
                  const meta = conditionMeta[sc]
                  const isActive = activeSurface === surface
                  return (
                    <button
                      key={surface}
                      onClick={() => setActiveSurface(isActive ? null : surface)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all-smooth ${isActive ? 'border-primary-400 bg-primary-50 scale-105' : `${meta.border} ${meta.bg}`}`}
                    >
                      <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
                      <span className="text-[10px] font-bold text-slate-600 leading-tight text-center">{surfaceLabels[surface]}</span>
                    </button>
                  )
                })}
              </div>
              {activeSurface && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 animate-scale-in">
                  <p className="text-[11px] text-slate-500 mb-2">وضعیت سطح «{surfaceLabels[activeSurface]}»:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {conditionOptions.filter((o) => o.value !== 'missing' && o.value !== 'extraction').map((opt) => {
                      const isSelected = getSurfaceCondition(activeSurface) === opt.value
                      const optMeta = conditionMeta[opt.value]
                      return (
                        <button
                          key={opt.value}
                          onClick={() => { toggleSurfaceCondition(activeSurface, opt.value); setActiveSurface(null) }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all-smooth ${
                            isSelected ? `${optMeta.bg} ${optMeta.border} border ${optMeta.color}` : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${optMeta.dot}`} />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Treatment History */}
          {tooth.treatments.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                <Activity size={14} /> تاریخچه درمان
              </h4>
              <div className="space-y-2">
                {tooth.treatments.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <p className="text-sm text-slate-700">{t.procedure_name || t.description || 'درمان'}</p>
                      <p className="text-xs text-slate-400">{toJalaliStringPretty(t.created_at)}</p>
                    </div>
                    {t.total_price != null && (
                      <span className="text-xs font-bold text-slate-600">{toPersianDigits(t.total_price.toLocaleString('en-US'))} ت</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-2">یادداشت</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="یادداشت درباره این دندان..."
              className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Save */}
          <button
            onClick={() => onUpdate(condition, surfaceConditions, notes)}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-all-smooth"
          >
            ذخیره تغییرات
          </button>

          {/* The surface the user just marked here, carried onward so the
              next form doesn't ask for it again. */}
          {/* MOD-FEAT-022: three doors out of a tooth, not one. Lab work
              and implants used to be reachable only by opening their own
              module and picking the same tooth again from a blank Palmer
              picker. The surface goes along too, so what was just recorded
              here isn't asked for a second time. */}
          {(onAddTreatment || onAddLabOrder || onAddImplantCase) && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                برای دندان {toPersianDigits(tooth.number)}:
              </p>
              {onAddTreatment && (
                <button
                  onClick={() => { onAddTreatment(String(tooth.number), firstSurface); onClose() }}
                  className="w-full py-3 rounded-xl bg-accent-50 text-accent-700 font-medium text-sm hover:bg-accent-100 transition-all-smooth flex items-center justify-center gap-1.5 border border-accent-200"
                >
                  <Plus size={16} /> افزودن درمان
                </button>
              )}
              {onAddLabOrder && (
                <button
                  onClick={() => { onAddLabOrder(String(tooth.number), firstSurface); onClose() }}
                  className="w-full py-3 rounded-xl bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition-all-smooth flex items-center justify-center gap-1.5 border border-primary-200"
                >
                  <Plus size={16} /> سفارش لابراتوار
                </button>
              )}
              {onAddImplantCase && (
                <button
                  onClick={() => { onAddImplantCase(String(tooth.number), firstSurface); onClose() }}
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-all-smooth flex items-center justify-center gap-1.5 border border-slate-300"
                >
                  <Plus size={16} /> مورد ایمپلنت
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main Component ────────────────────────────────────────────
interface DentalChartProps {
  toothRecords: ToothRecord[]
  treatments: Treatment[]
  onUpdateTooth: (toothNumber: string, data: { is_missing: boolean; is_implant: boolean; notes: string; condition?: string; surfaces?: string }) => void
  onAddTreatment?: (toothNumber: string, surface?: string | null) => void
  /** MOD-FEAT-022: the chart is the natural starting point for lab work
   *  and implants too, not only treatments. */
  onAddLabOrder?: (toothNumber: string, surface?: string | null) => void
  onAddImplantCase?: (toothNumber: string, surface?: string | null) => void
  /** Fires every time a tooth gets clicked/selected on the chart — lets
   * the parent remember "the last tooth someone actually pointed at"
   * so the general '+ درمان جدید' button (not the per-tooth one, which
   * already carries the number correctly) can default to it too instead
   * of opening blank. Direct fix for "دندونی که تو ویزیت انتخاب کردیم
   * باید خودکار پر بشه" — marking a condition on a tooth should count
   * as "selecting" it for this purpose, not just clicking the dedicated
   * per-tooth treatment button. */
  onToothSelect?: (toothNumber: string) => void
}

export default function DentalChart({ toothRecords, treatments, onUpdateTooth, onAddTreatment, onToothSelect }: DentalChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<ToothData | null>(null)
  const [showPrimary, setShowPrimary] = useState(false)

  const allTeeth = useMemo(() => {
    const permanent = [...upperRight, ...upperLeft, ...lowerLeft, ...lowerRight]
    const primary = [...primaryUpperRight, ...primaryUpperLeft, ...primaryLowerLeft, ...primaryLowerRight]
    return showPrimary ? [...permanent, ...primary] : permanent
  }, [showPrimary])

  const getToothData = (number: number): ToothData => {
    const record = toothRecords.find((r) => r.tooth_number === String(number))
    const toothTreatments = treatments.filter((t) => String(t.tooth_number) === String(number))

    // Load saved surfaces from record
    let savedSurfaces: ToothSurfaceCondition[] = []
    try {
      if (record?.surfaces) {
        const parsed = JSON.parse(record.surfaces)
        if (Array.isArray(parsed)) savedSurfaces = parsed
      }
    } catch {}

    // Load saved condition from record, fall back to derivation from treatments
    let condition: ToothCondition = 'healthy'
    if (record?.condition && record.condition !== 'healthy') {
      condition = record.condition as ToothCondition
    } else if (record?.is_missing) {
      condition = 'missing'
    } else if (record?.is_implant) {
      condition = 'implant'
    } else if (toothTreatments.some((t) => t.procedure_name?.includes('عصب') || t.description?.includes('RCT'))) {
      condition = 'rct'
    } else if (toothTreatments.some((t) => t.procedure_name?.includes('روکش') || t.description?.includes('crown'))) {
      condition = 'crown'
    } else if (toothTreatments.some((t) => t.procedure_name?.includes('ترمیم') || t.description?.includes('restoration'))) {
      condition = 'restored'
    } else if (toothTreatments.some((t) => t.procedure_name?.includes('کشید') || t.description?.includes('extract'))) {
      condition = 'extraction'
    }

    // Only meaningful for conditions DERIVED from treatments (not a
    // manually-set record condition like missing/implant) — true when
    // every matching treatment is still planned/in_progress, i.e.
    // nothing for this tooth has actually been completed yet.
    const derivedFromTreatments = !record?.is_missing && !record?.is_implant && (!record?.condition || record.condition === 'healthy')
    const isPlannedOnly = derivedFromTreatments && toothTreatments.length > 0 && toothTreatments.every((t) => t.status !== 'completed')

    return {
      number,
      condition,
      surfaces: savedSurfaces,
      notes: record?.notes || '',
      record,
      treatments: toothTreatments,
      isPlannedOnly,
    }
  }

  /**
   * Cycles one surface between healthy and the tooth's own condition.
   *
   * Writes through onUpdateTooth like every other edit rather than
   * opening a second save path — two routes to one destination is the
   * fault this project keeps being bitten by. A tooth still marked
   * healthy defaults the surface to caries, because that is what a
   * clinician is recording when they tap a surface during an exam.
   */
  const handleSurfaceToggle = (toothNumber: string, surface: ToothSurface) => {
    const data = getToothData(Number(toothNumber))
    const existing = data.surfaces.find((x) => x.surface === surface)
    const target: ToothCondition = data.condition === 'healthy' ? 'caries' : data.condition

    const next = existing && existing.condition !== 'healthy'
      ? data.surfaces.filter((x) => x.surface !== surface)
      : [...data.surfaces.filter((x) => x.surface !== surface), { surface, condition: target }]

    onUpdateTooth(toothNumber, {
      is_missing: data.condition === 'missing' || data.condition === 'extraction',
      is_implant: data.condition === 'implant',
      notes: data.notes || '',
      // A surface can only be marked on a tooth that has a condition, so
      // marking the first one promotes the tooth itself out of healthy.
      condition: data.condition === 'healthy' && next.length > 0 ? target : data.condition,
      surfaces: JSON.stringify(next),
    })
  }

  const handleUpdate = (condition: ToothCondition, surfaces: ToothSurfaceCondition[], notes: string) => {
    if (!selectedTooth) return
    onUpdateTooth(String(selectedTooth.number), {
      is_missing: condition === 'missing' || condition === 'extraction',
      is_implant: condition === 'implant',
      notes,
      condition,
      surfaces: JSON.stringify(surfaces),
    })
    setSelectedTooth(null)
  }

  /**
   * برچسب دندان با پیشوند ربع (UR/UL/LR/LL).
   *
   * چرا: در نماد پالمر خالص، هر ربع دوباره از ۱ شماره‌گذاری می‌شود،
   * بنابراین چهار دندان مختلف همگی «۱» نامیده می‌شوند و در کنار هم
   * روی صفحه، جفتِ «۱ ۱» وسط چارت به‌طور مکرر به‌عنوان تکرار یا
   * خطا خوانده می‌شد. رقیب (مینادنت.ir) دقیقاً همین را با پیشوند
   * ربع حل کرده و در بررسی ویدیوی واقعی برنامه‌شان تأیید شد.
   *
   * FDI: رقم اول ربع را می‌دهد — ۱=بالا راست، ۲=بالا چپ،
   * ۳=پایین چپ، ۴=پایین راست. دندان‌های شیری (۵۱-۸۵) با همان
   * ترتیب، چهار واحد بالاتر شماره‌گذاری می‌شوند.
   */
  const getToothLabel = (fdiNumber: number): string => {
    const rawQuadrant = Math.floor(fdiNumber / 10)
    const quadrant = rawQuadrant >= 5 ? rawQuadrant - 4 : rawQuadrant
    const prefix = quadrant === 1 ? 'UR' : quadrant === 2 ? 'UL' : quadrant === 3 ? 'LL' : 'LR'
    return `${prefix}${fdiToPalmer(fdiNumber)}`
  }

  /** COMP-103 — the five-surface target under each tooth.
   *
   * Recording a surface used to cost five taps: open the tooth, wait for
   * the panel, find the row, tap, close. An examination does not move at
   * that speed. One tap from the arch does.
   *
   * Only drawn for the selected tooth: sixteen of these across an arch
   * would be unreadable at phone width, and would make the teeth
   * themselves harder to see — which is the fault MOD-UI-006 just fixed. */
  const renderSurfaceGlyph = (num: number, data: ToothData) => {
    const sectors = surfaceSectors(num)
    const currentOf = (surface: ToothSurface): ToothCondition =>
      data.surfaces.find((x) => x.surface === surface)?.condition || 'healthy'

    return (
      <svg
        viewBox="0 0 24 24"
        className="w-9 h-9 mx-auto mt-0.5"
        role="group"
        aria-label={`انتخاب سطح دندان ${num}`}
      >
        {sectors.map((sec) => {
          const cond = currentOf(sec.surface)
          const marked = cond !== 'healthy'
          const letter = sec.surface === 'occlusal' ? centreLetter(num) : sec.letter
          return (
            <g key={sec.surface}>
              <path
                d={sec.d}
                fill={marked ? conditionMeta[cond].dotHex : '#ffffff'}
                stroke="#94a3b8"
                strokeWidth="0.6"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSurfaceToggle(String(num), sec.surface)
                }}
              >
                <title>{`${letter} — ${conditionMeta[cond].label}`}</title>
              </path>
              <text
                x={sec.labelX}
                y={sec.labelY}
                textAnchor="middle"
                fontSize="5"
                fontWeight="700"
                fill={marked ? '#ffffff' : '#94a3b8'}
                pointerEvents="none"
              >
                {letter}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  const renderQuadrant = (teeth: number[]) => (
    <div className="flex items-center gap-0.5 relative shrink-0">
      {teeth.map((num) => {
        const data = getToothData(num)
        return (
          <div
            key={num}
            onClick={() => { setSelectedTooth(data); onToothSelect?.(String(num)) }}
            className={`relative rounded-lg p-0.5 cursor-pointer transition-all-smooth hover:bg-slate-100 shrink-0 ${selectedTooth?.number === num ? 'bg-primary-50 ring-2 ring-primary-300' : ''} ${data.isPlannedOnly ? 'opacity-60' : ''}`}
          >
            <ToothSVG
              number={num}
              condition={data.condition}
              surfaces={data.surfaces}
              size={36}
              selected={selectedTooth?.number === num}
              labelOverride={getToothLabel(num)}
            />
            {data.isPlannedOnly && (
              <span className="absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full bg-warning-400 border border-white flex items-center justify-center" title="برنامه‌ریزی‌شده — هنوز انجام نشده">
                <Clock size={8} className="text-white" />
              </span>
            )}
            {selectedTooth?.number === num && renderSurfaceGlyph(num, data)}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Legend — maps over every key in conditionMeta rather than a
          hardcoded list, so a newly added condition (like پست/پین just
          now) can never again silently go missing here the way this
          list previously excluded them, along with bridge/veneer/sealant
          which had been missing from it long before that. */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {(Object.keys(conditionMeta) as ToothCondition[]).map((c) => {
          const meta = conditionMeta[c]
          return (
            <span key={c} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded ${meta.dot}`} />
              <span className="text-slate-600">{meta.label}</span>
            </span>
          )
        })}
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-warning-400 flex items-center justify-center"><Clock size={7} className="text-white" /></span>
          <span className="text-slate-600">برنامه‌ریزی‌شده (انجام‌نشده)</span>
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-bold">
          <Grid3x3 size={13} /> نماد پالمر (Palmer)
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showPrimary}
            onChange={(e) => setShowPrimary(e.target.checked)}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          نمایش دندان‌های شیری
        </label>
      </div>

      {/* Permanent Teeth Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6">
        {/* Upper Jaw */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 mb-3 text-center font-medium">فک بالا (ماکسیلاری)</p>
          {/* Was flex-wrap — on a phone-width screen, 16 tooth icons plus
              the divider don't fit on one line, so the browser wrapped it
              into two stacked rows (right quadrant on its own line, left
              quadrant below it) instead of the intended single continuous
              row with the divider sitting at the real midline — exactly
              what a handwritten diagram showed this should look like
              instead: one unbroken row, scrolling horizontally if it
              doesn't fit rather than breaking into two lines. */}
          <div className="flex items-center gap-1 overflow-x-auto dock-scroll px-1 py-1">
            {renderQuadrant(upperRight)}
            {/* Explicit sibling elements right at the midline, in a fixed
                DOM order — was previously rendered from inside
                renderQuadrant itself, whose internal element order
                stopped reliably mapping to visual position once this row
                became RTL + horizontally-scrollable (a known cross-
                browser inconsistency for that specific combination): the
                left-quadrant symbol was landing at the far outer edge
                behind tooth 8 instead of at the midline it belongs at,
                confirmed exactly by a screenshot. Two plain siblings next
                to the divider can't be misplaced this way regardless of
                directionality quirks. */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-2xl font-bold text-slate-400 select-none">{palmerSymbols.upperRight}</span>
              <div className="w-px h-12 bg-slate-200 mx-1" />
              <span className="text-2xl font-bold text-slate-400 select-none">{palmerSymbols.upperLeft}</span>
            </div>
            {renderQuadrant(upperLeft)}
          </div>
        </div>

        {/* Lower Jaw */}
        <div>
          <p className="text-xs text-slate-400 mb-3 text-center font-medium">فک پایین (ماندیبول)</p>
          <div className="flex items-center gap-1 overflow-x-auto dock-scroll px-1 py-1">
            {renderQuadrant(lowerRight)}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-2xl font-bold text-slate-400 select-none">{palmerSymbols.lowerRight}</span>
              <div className="w-px h-12 bg-slate-200 mx-1" />
              <span className="text-2xl font-bold text-slate-400 select-none">{palmerSymbols.lowerLeft}</span>
            </div>
            {renderQuadrant(lowerLeft)}
          </div>
        </div>
      </div>

      {/* Primary Teeth Chart */}
      {showPrimary && (
        <div className="bg-amber-50/30 rounded-2xl border border-amber-100 p-4 md:p-6">
          <p className="text-xs text-amber-600 mb-3 text-center font-medium">دندان‌های شیری</p>
          <div className="mb-4">
            <div className="flex items-center gap-1 overflow-x-auto dock-scroll px-1 py-1">
              {renderQuadrant(primaryUpperRight)}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xl font-bold text-amber-500 select-none">{palmerSymbols.primaryUpperRight}</span>
                <div className="w-px h-10 bg-amber-200 mx-1" />
                <span className="text-xl font-bold text-amber-500 select-none">{palmerSymbols.primaryUpperLeft}</span>
              </div>
              {renderQuadrant(primaryUpperLeft)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 overflow-x-auto dock-scroll px-1 py-1">
              {renderQuadrant(primaryLowerRight)}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xl font-bold text-amber-500 select-none">{palmerSymbols.primaryLowerRight}</span>
                <div className="w-px h-10 bg-amber-200 mx-1" />
                <span className="text-xl font-bold text-amber-500 select-none">{palmerSymbols.primaryLowerLeft}</span>
              </div>
              {renderQuadrant(primaryLowerLeft)}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['caries', 'rct', 'crown', 'implant'] as ToothCondition[]).map((c) => {
          const count = allTeeth.filter((n) => getToothData(n).condition === c).length
          const meta = conditionMeta[c]
          return (
            <div key={c} className={`p-3 rounded-xl ${meta.bg} border ${meta.border}`}>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
                <span className="text-xs text-slate-600">{meta.label}</span>
              </div>
              <p className={`text-xl font-bold ${meta.color} mt-1`}>{toPersianDigits(count)}</p>
            </div>
          )
        })}
      </div>

      {/* Tooth Detail Panel */}
      {selectedTooth && (
        <ToothDetailPanel
          tooth={selectedTooth}
          onClose={() => setSelectedTooth(null)}
          onUpdate={handleUpdate}
          onAddTreatment={onAddTreatment}
        />
      )}
    </div>
  )
}
