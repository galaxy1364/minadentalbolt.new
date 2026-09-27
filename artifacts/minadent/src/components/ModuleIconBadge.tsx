// ModuleIconBadge.tsx — iOS 27 3D Tactile Module Squircle Badge
// High-visibility, prominent 3D icon with specular highlight rim and ambient colored elevation
import type { ReactNode } from 'react'

interface ModuleIconBadgeProps {
  color: string
  gradient?: [string, string]
  size?: number
  rounded?: string
  className?: string
  children: ReactNode
}

export function ModuleIconBadge({
  color,
  gradient,
  size = 52,
  rounded = 'rounded-[20px]',
  className = '',
  children,
}: ModuleIconBadgeProps) {
  const bgStyle = gradient
    ? `linear-gradient(145deg, ${gradient[0]}, ${gradient[1]})`
    : `color-mix(in srgb, ${color} 16%, rgba(255, 255, 255, 0.94))`

  return (
    <div
      className={`shrink-0 flex items-center justify-center ${rounded} relative overflow-hidden transition-all-smooth card-tactile-3d ${className}`}
      style={{
        width: size,
        height: size,
        background: bgStyle,
        color: gradient ? '#ffffff' : color,
        boxShadow: `0 8px 22px -4px ${color}35, 0 2px 6px rgba(0,0,0,0.06)`,
        borderTop: '1.5px solid rgba(255, 255, 255, 0.75)',
        borderBottom: '2px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Specular Ambient Light Flare */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
        style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.95), transparent 60%)',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

