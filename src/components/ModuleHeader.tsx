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
    <div
      className="relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
    >
      <div
        className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-2xl pointer-events-none breathe-slow"
        style={{ background: `radial-gradient(circle, ${mod.color}66, transparent 70%)` }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white"
          style={{ background: `linear-gradient(135deg, ${mod.gradient[0]}, ${mod.gradient[1]})` }}
        >
          <Icon size={26} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="relative shrink-0">{action}</div>}
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
      className="relative overflow-hidden rounded-2xl p-3.5 border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all-smooth press-scale"
    >
      <div
        className="absolute -top-6 -left-6 w-24 h-24 rounded-full blur-xl pointer-events-none breathe-slow"
        style={{ background: `radial-gradient(circle, ${mod.color}55, transparent 70%)` }}
      />
      <div className="relative flex items-center gap-2.5">
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
