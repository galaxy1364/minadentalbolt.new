import type { ReactNode } from 'react'
import { modules } from '../theme/modules'

export function ModuleHeader({ moduleKey, title, subtitle, action }: {
  moduleKey: keyof typeof modules
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  const mod = modules[moduleKey]
  if (!mod) return null
  const Icon = mod.icon

  return (
    <div className="module-banner p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
        >
          <Icon size={26} className="text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-white/80 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function ModuleStatCard({ moduleKey, icon, label, value }: {
  moduleKey: keyof typeof modules
  icon: ReactNode
  label: string
  value: string | number
}) {
  const mod = modules[moduleKey]
  if (!mod) return null

  return (
    <div
      className="rounded-2xl p-3.5 transition-all-smooth press-scale"
      style={{
        background: `linear-gradient(135deg, ${mod.colorLight}, #fff)`,
        border: `1px solid ${mod.color}20`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${mod.gradient[0]}, ${mod.gradient[1]})`, color: '#fff' }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 truncate">{value}</p>
        </div>
      </div>
    </div>
  )
}
