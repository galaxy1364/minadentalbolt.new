// ModuleIconBadge.tsx — v3: frameless. User explicitly wants icons to
// match the bottom nav bar's plain style everywhere (ModuleHeader,
// stat cards, the "همه ماژول‌ها" sheet) — no colored background box,
// no gradient frame, no shadow ring. Just the module's own custom
// glyph, rendered directly in its own color, sized up for presence
// since there's no background box to give it visual weight anymore.
import type { ReactNode } from 'react'

interface ModuleIconBadgeProps {
  color: string
  gradient?: [string, string]
  size?: number
  rounded?: string
  children: ReactNode
}

export function ModuleIconBadge({ color, size = 48, children }: ModuleIconBadgeProps) {
  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{ width: size, height: size, color }}
    >
      {children}
    </div>
  )
}
