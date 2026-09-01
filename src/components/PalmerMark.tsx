import { toothQuadrantOf, palmerSymbol } from '../lib/toothLabel'
import { toPersianDigits } from '../lib/persianDate'

/**
 * MOD-FEAT-033 | براکت پالمر، کشیده‌شده نه تایپ‌شده
 *
 * گزارش مهدی: «کاملاً درست، ولی شکل بزرگ‌تر و عدد عین خود عکس شود.»
 *
 * `MOD-DOC-008` نگاشت را درست کرد و مهدی تأییدش کرد، ولی شکل هنوز یک
 * کاراکتر ترسیم‌جعبه (`┘`) کنار رقم بود — یک گوشه‌ی کوچک، نه براکتی که
 * او روی کاغذ کشید.
 *
 * A box-drawing character is the wrong tool twice over: its size is
 * whatever the font decides, and its arms are short because it was
 * designed to join other box characters, not to span a digit. Drawing
 * two lines gives the real proportions and puts the digit exactly where
 * the handwriting puts it — tucked into the corner.
 *
 * قاعده، از نقاشی دوم مهدی:
 *   خط افقی = صفحه‌ی اکلوزال. دندان بالا رویش می‌نشیند (خط زیرش)،
 *   دندان پایین زیرش است (خط رویش).
 *   خط عمودی = خط وسط دهان، سمتی که رو به آن است.
 */

export interface PalmerMarkProps {
  /** شماره‌ی FDI. */
  fdi: number | string
  /** ارتفاع کل نشانه به پیکسل. */
  size?: number
  color?: string
}

export function PalmerMark({ fdi, size = 20, color = 'currentColor' }: PalmerMarkProps) {
  const quadrant = toothQuadrantOf(fdi)
  const symbol = toPersianDigits(palmerSymbol(Number(fdi)))

  // No quadrant means the value is not a real FDI tooth — show it as it
  // was typed rather than draw a bracket around something meaningless.
  if (!quadrant) return <span>{String(fdi)}</span>

  const upper = quadrant === 'UR' || quadrant === 'UL'
  const verticalOnRight = quadrant === 'UR' || quadrant === 'LR'

  const W = size * 1.1
  const H = size
  const stroke = Math.max(1.2, size * 0.075)
  const pad = stroke / 2

  // The occlusal line sits under an upper tooth and over a lower one.
  const lineY = upper ? H - pad : pad
  // The midline runs down the side facing it.
  const lineX = verticalOnRight ? W - pad : pad

  // The digit occupies the corner opposite the two strokes.
  const textX = verticalOnRight ? W * 0.42 : W * 0.58
  const textY = upper ? H * 0.72 : H * 0.94

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`دندان ${quadrant}${symbol}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Occlusal plane — deliberately spans the full width, the way it
          is drawn by hand. A short tick reads as punctuation. */}
      <line x1={0} y1={lineY} x2={W} y2={lineY} stroke={color} strokeWidth={stroke} strokeLinecap="square" />
      {/* Midline */}
      <line x1={lineX} y1={0} x2={lineX} y2={H} stroke={color} strokeWidth={stroke} strokeLinecap="square" />
      <text
        x={textX}
        y={textY}
        textAnchor="middle"
        fontSize={size * 0.62}
        fontWeight="700"
        fill={color}
      >
        {symbol}
      </text>
    </svg>
  )
}

export default PalmerMark
