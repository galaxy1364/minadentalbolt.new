import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, Settings2 } from 'lucide-react'
import { modules } from '../theme/modules'
import { h } from '../lib/haptics'
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
      className="relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
    >
      <div
        className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-2xl pointer-events-none breathe-slow"
        style={{ background: `radial-gradient(circle, ${mod.color}66, transparent 70%)` }}
      />
      <div className="relative flex items-center gap-3">
        <ModuleIconBadge color={mod.color} gradient={mod.gradient} size={48} rounded="26%">
          <Icon size={26} strokeWidth={2} />
        </ModuleIconBadge>
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
        <ModuleIconBadge color={mod.color} gradient={mod.gradient} size={40} rounded="28%">
          {icon}
        </ModuleIconBadge>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 truncate">{value}</p>
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
export function ReorderableStatGrid({ storageKey, items, className = 'grid grid-cols-2 lg:grid-cols-4 gap-3' }: {
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
    h.tap()
  }

  if (items.length <= 1) {
    return <div className={className}>{items.map((i) => <div key={i.key}>{i.node}</div>)}</div>
  }

  return (
    <div>
      <div className="flex justify-end mb-1.5">
        <button
          onClick={() => { h.tap(); setEditing(!editing) }}
          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition-all-smooth ${editing ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'text-slate-400 dark:text-slate-500 hover:text-primary-500'}`}
        >
          <Settings2 size={12} />
          {editing ? 'پایان چیدمان' : 'تنظیم چیدمان'}
        </button>
      </div>
      <div className={className}>
        {sorted.map((item, i) => (
          <div key={item.key} className="relative">
            {item.node}
            {editing && (
              <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); move(item.key, 1) }}
                  disabled={i === sorted.length - 1}
                  aria-label="جابجایی به چپ"
                  className="pointer-events-auto w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); move(item.key, -1) }}
                  disabled={i === 0}
                  aria-label="جابجایی به راست"
                  className="pointer-events-auto w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center text-slate-500 disabled:opacity-30"
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
