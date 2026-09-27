import { useState } from 'react'
import type { ReactNode } from 'react'
import { isValidElement, cloneElement } from 'react'
import { ChevronLeft, Settings2 } from 'lucide-react'
import { modules } from '../theme/modules'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { ModuleIconBadge } from './ModuleIconBadge'

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
      className="relative overflow-hidden rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3.5 border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl card-tactile-3d shadow-md"
    >
      <div
        className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none breathe-slow"
        style={{ background: `radial-gradient(circle, ${mod.color}55, transparent 70%)` }}
      />
      <div className="relative flex items-center gap-3.5">
        <ModuleIconBadge color={mod.color} gradient={mod.gradient} size={56} rounded="rounded-2xl">
          <Icon size={34} strokeWidth={2} />
        </ModuleIconBadge>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="relative shrink-0 flex items-center gap-2">{action}</div>}
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
      className="relative overflow-hidden rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md card-tactile-3d shadow-sm transition-all-smooth press-scale"
    >
      <div
        className="absolute -top-8 -left-8 w-28 h-28 rounded-full blur-2xl pointer-events-none breathe-slow"
        style={{ background: `radial-gradient(circle, ${mod.color}45, transparent 70%)` }}
      />
      <div className="relative flex items-center gap-3">
        <ModuleIconBadge color={mod.color} gradient={mod.gradient} size={44} rounded="rounded-xl">
          {isValidElement(icon) ? cloneElement(icon as React.ReactElement<any>, { size: 26 }) : icon}
        </ModuleIconBadge>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-base font-black text-slate-900 dark:text-slate-100 truncate">{value}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Reusable customizable-layout grid — same manual-reorder pattern built
 * for the Dashboard's quick actions, generalized so every module's stat
 * card row can use it instead of a fixed grid. Order persists per
 * module in localStorage under its own storageKey.
 */
export function ReorderableStatGrid({ storageKey, items, className = 'flex items-stretch gap-3 overflow-x-auto dock-scroll -mx-1 px-1 pb-1' }: {
  storageKey: string
  items: { key: string; node: ReactNode }[]
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const fullKey = `minadent-layout-${storageKey}`
  const [order, setOrder] = useState<string[] | null>(() => {
    try {
      const stored = localStorage.getItem(fullKey)
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const defaultOrder = items.map((i) => i.key)
  const effectiveOrder = order && order.length === items.length && order.every((k) => defaultOrder.includes(k)) ? order : defaultOrder
  const sorted = [...items].sort((a, b) => effectiveOrder.indexOf(a.key) - effectiveOrder.indexOf(b.key))

  const move = (key: string, dir: -1 | 1) => {
    const idx = effectiveOrder.indexOf(key)
    const swap = idx + dir
    if (swap < 0 || swap >= effectiveOrder.length) return
    const next = [...effectiveOrder]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setOrder(next)
    localStorage.setItem(fullKey, JSON.stringify(next))
    chimes.playPop()
    h.tap()
  }

  if (items.length <= 1) {
    return <div className={className}>{items.map((i) => <div key={i.key}>{i.node}</div>)}</div>
  }

  return (
    <div>
      <div className="flex justify-end mb-1.5">
        <button
          onClick={() => {
            chimes.playPop()
            h.tap()
            setEditing(!editing)
          }}
          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all-smooth press-scale ${editing ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-slate-400 dark:text-slate-500 hover:text-primary-500'}`}
        >
          <Settings2 size={12} />
          {editing ? 'پایان چیدمان' : 'تنظیم چیدمان'}
        </button>
      </div>
      <div className={className}>
        {sorted.map((item, i) => (
          <div key={item.key} className="relative shrink-0 w-[min(168px,45vw)]">
            {item.node}
            {editing && (
              <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); move(item.key, 1) }}
                  disabled={i === sorted.length - 1}
                  aria-label="جابجایی به چپ"
                  className="pointer-events-auto w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center text-slate-500 disabled:opacity-30 press-scale"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); move(item.key, -1) }}
                  disabled={i === 0}
                  aria-label="جابجایی به راست"
                  className="pointer-events-auto w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center text-slate-500 disabled:opacity-30 press-scale"
                >
                  <ChevronLeft size={13} className="rotate-180" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
