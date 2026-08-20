// ModuleIconBadge.tsx — a shared, premium icon treatment for every
// module's icon across the app (ModuleHeader, stat cards, quick
// actions, etc.), matching the same hand-crafted depth techniques used
// on the app logo and dental-chart teeth this session: a rich 3-stop
// gradient (not flat), a soft glass highlight top-left, an inner rim
// stroke, and a real drop-shadow under the icon itself — not AI-
// generated artwork, just careful CSS/SVG layering applied
// consistently everywhere a module's icon appears.
import type { ReactNode } from 'react'

interface ModuleIconBadgeProps {
  color: string
  gradient: [string, string]
  size?: number
  rounded?: string
  children: ReactNode
}

// Darkens a hex color by a percentage, for the gradient's third
// (deepest) stop — gives real richness instead of a flat 2-stop fade.
function darken(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - amount)
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) - amount)
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) - amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function ModuleIconBadge({ color, gradient, size = 48, rounded = '30%', children }: ModuleIconBadgeProps) {
  const deepStop = darken(gradient[1], 40)
  const uid = `${gradient[0]}${gradient[1]}`.replace(/[^a-zA-Z0-9]/g, '')

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        background: `linear-gradient(150deg, ${gradient[0]} 0%, ${gradient[1]} 55%, ${deepStop} 100%)`,
        boxShadow: `0 ${Math.max(2, size * 0.08)}px ${size * 0.22}px -${size * 0.08}px ${color}66, inset 0 1px 0 rgba(255,255,255,0.35)`,
      }}
    >
      {/* Glass highlight — soft radial glow, top-left */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: rounded,
          background: 'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.45), rgba(255,255,255,0.05) 45%, transparent 65%)',
        }}
      />
      {/* Inner rim stroke for a glass-edge feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ borderRadius: rounded, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}
      />
      {/* Icon itself gets a subtle drop-shadow for real lift off the background */}
      <div className="relative text-white" style={{ filter: 'drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.25))' }}>
        {children}
      </div>
      <span className="sr-only" id={uid} />
    </div>
  )
}
