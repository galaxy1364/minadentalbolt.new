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
  rounded = '',
  className = '',
  children,
}: ModuleIconBadgeProps) {
  return (
    <div
      className={`module-art shrink-0 flex items-center justify-center ${rounded} relative ${className}`}
      style={{
        width: size,
        height: size,
        color: gradient ? gradient[1] : color,
      }}
    >
      {children}
    </div>
  )
}

