/**
 * MOD-FEAT-024 | نمایش دندان — یک تصویر، همه‌جا
 *
 * گزارش مهدی: «همه جا که باید دندون انتخاب بکنم با همین شکل واقعی نشون
 * بده، یک‌پارچه همه جا.»
 *
 * تا امروز دو انتخابگر دندان مستقل وجود داشت:
 *   • `DentalChart` — تصویری، فقط داخل ویزیت
 *   • `PalmerToothPicker` — دکمه‌های عددی، در ثبت درمان، لابراتوار و ایمپلنت
 *
 * یعنی پزشک در چارت یک دندان تصویری می‌دید و دو صفحه بعد همان دندان را
 * از یک ردیف عدد انتخاب می‌کرد. دو زبان برای یک کار.
 *
 * The drawing itself lived as a private function inside DentalChart.tsx,
 * which is why nothing else could use it — the same pattern that hid the
 * Palmer label (MOD-FEAT-023) and the arch rows (MOD-FIX-006). Moving it
 * to its own file is what makes "the same tooth everywhere" possible at
 * all; nothing about the drawing changed.
 */
import { toothShape, hasRootFilling, hasCrownCap, toothKind, isUpperTooth, toothVisualLabel } from '../lib/toothVisual'
import { toPersianDigits } from '../lib/persianDate'
import { conditionMeta } from '../lib/toothConditions'
import type { ToothCondition, ToothSurface, ToothSurfaceCondition } from '../lib/toothConditions'


/**
 * MOD-FEAT-033 | براکت پالمر داخل خودِ گلیف دندان
 *
 * The label used to be a single `<text>` holding a box-drawing character
 * beside the digit. That made its size a font decision and its arms too
 * short to read as a bracket at 40px. Drawing the two strokes here keeps
 * the proportions the same on every tooth and at every size.
 *
 * قاعده (نقاشی مهدی): خط افقی = صفحه‌ی اکلوزال — زیر دندان بالا، روی
 * دندان پایین. خط عمودی = خط وسط دهان.
 */
function PalmerLabel({ fdi, cx, cy, color }: { fdi: number; cx: number; cy: number; color: string }) {
  const q = Math.floor(fdi / 10)
  const quadrant = q >= 5 ? q - 4 : q
  if (quadrant < 1 || quadrant > 4) return null

  const upper = quadrant === 1 || quadrant === 2
  const verticalOnRight = quadrant === 1 || quadrant === 4
  const n = fdi % 10
  const symbol = fdi >= 51 && fdi <= 85
    ? ({ 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' } as Record<number, string>)[n] || String(n)
    : toPersianDigits(String(n))

  // MOD-FEAT-033 (v1.211): «شکل بزرگ‌تر و عدد عین خود عکس شود». At the
  // previous size the digit was ~7px on a phone and the arms read as a
  // tick rather than a bracket. The canvas grew from 56 to 68 units to
  // give the label its own band, which also ends a long-standing overlap
  // with the tooth root — the label used to be drawn on top of it.
  const halfW = 10
  const halfH = 8
  const lineY = upper ? cy + halfH : cy - halfH
  const lineX = verticalOnRight ? cx + halfW : cx - halfW
  const textX = verticalOnRight ? cx - 2 : cx + 2
  const textY = upper ? cy + 4.5 : cy + 6.5

  return (
    <g>
      <line x1={cx - halfW} y1={lineY} x2={cx + halfW} y2={lineY} stroke={color} strokeWidth="1.1" strokeLinecap="square" />
      <line x1={lineX} y1={cy - halfH} x2={lineX} y2={cy + halfH} stroke={color} strokeWidth="1.1" strokeLinecap="square" />
      <text x={textX} y={textY} textAnchor="middle" fontSize="13" fill={color} fontWeight="700">{symbol}</text>
    </g>
  )
}

export function ToothGlyph({
  number,
  condition,
  surfaces,
  size = 48,
  onClick,
  selected,
}: {
  number: number
  condition: ToothCondition
  surfaces: ToothSurfaceCondition[]
  size?: number
  onClick?: () => void
  selected?: boolean
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
      <svg width={size} height={size * 1.42} viewBox="0 0 48 68" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle} role="img" aria-label={a11yTitle}>
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
        <PalmerLabel fdi={number} cx={24} cy={58} color={strokeColor} />
      </svg>
    )
  }

  if (shape === 'absent') {
    return (
      <svg width={size} height={size * 1.42} viewBox="0 0 48 68" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle}>
        <g opacity="0.4">
          <text x="24" y="30" textAnchor="middle" fontSize="14" fill="#94a3b8" fontWeight="bold">
            ✕
          </text>
        </g>
        <PalmerLabel fdi={number} cx={24} cy={58} color="#94a3b8" />
      </svg>
    )
  }

  // Draw tooth based on type
  if (isMolar) {
    // Molar: wide crown with multiple cusps
    return (
      <svg width={size} height={size * 1.42} viewBox="0 0 48 68" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle}>
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
        <PalmerLabel fdi={number} cx={24} cy={58} color={strokeColor} />
      </svg>
    )
  } else if (isPremolar) {
    // Premolar: smaller crown, 2 cusps
    return (
      <svg width={size} height={size * 1.42} viewBox="0 0 48 68" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle}>
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
        <PalmerLabel fdi={number} cx={24} cy={58} color={strokeColor} />
      </svg>
    )
  } else {
    // Anterior (incisor/canine): single root, narrow crown
    const isCanine = kind === 'canine'
    return (
      <svg width={size} height={size * 1.42} viewBox="0 0 48 68" onClick={onClick} className="cursor-pointer transition-all" style={dropShadowStyle}>
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
        <PalmerLabel fdi={number} cx={24} cy={58} color={strokeColor} />
      </svg>
    )
  }
}
