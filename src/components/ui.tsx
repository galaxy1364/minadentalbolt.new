import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, CheckCircle2, Info, Loader2, ChevronRight, ChevronLeft, ChevronDown, Layers } from 'lucide-react'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { toPersianDigits } from '../lib/persianDate'
import { matchRanges } from '../lib/fuzzySearch'

export function Spinner({ size = 24 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-primary-500 mx-auto" />
}

export function Card({ children, className = '', style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <div style={style} onClick={onClick} className={`gemini-ambient-card rounded-card border border-slate-200/60 dark:border-slate-700/60 card-shadow dark:card-shadow transition-all duration-200 ${className}`}>{children}</div>
}

export function StatCard({ icon, title, value, color = 'primary', subtitle }: { icon: React.ReactNode; title: string; value: string | number; color?: string; subtitle?: string }) {
  const colorMap: Record<string, string> = {
    primary: 'from-primary-500 to-primary-700',
    success: 'from-success-500 to-success-700',
    warning: 'from-warning-500 to-warning-700',
    error: 'from-error-500 to-error-700',
    accent: 'from-accent-500 to-accent-700',
    secondary: 'from-secondary-500 to-secondary-700',
  }
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.primary} flex items-center justify-center text-white flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">{title}</p>
          <p className="text-lg font-bold text-slate-800 truncate">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
    </Card>
  )
}

// `title`/`aria-label` are accepted because icon-only Buttons are real
// in this app — a <Button> whose whole content is a 14px glyph has no
// accessible name at all without one, and no tooltip on desktop either.
export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled, title, 'aria-label': ariaLabel }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; size?: 'sm' | 'md' | 'lg'; className?: string; type?: 'button' | 'submit'; disabled?: boolean; title?: string; 'aria-label'?: string }) {
  const variants: Record<string, string> = {
    // primary-700, not 600: white text on primary-600 measures 3.74:1,
    // below the WCAG 2.2 AA floor of 4.5:1 for normal text. 700 gives
    // 5.47:1. Caught by an automated contrast test against the real
    // palette (src/lib/contrast.test.ts), not by eye — this is exactly
    // the kind of failure that looks fine to someone with good vision
    // on a bright screen and is unreadable in sunlight or with low
    // vision. Hover goes darker still to keep the state change visible.
    primary: 'bg-primary-700 hover:bg-primary-800 text-white',
    secondary: 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300',
    danger: 'bg-error-600 hover:bg-error-700 text-white',
    success: 'bg-success-600 hover:bg-success-700 text-white',
  }
  // Ensure touch targets are at least 48px for glove-friendly UX (WCAG 2.2 AA)
  // min-h-[44px] for sm (44px is acceptable for dense areas), min-h-[48px] for md/lg
  const sizes: Record<string, string> = { 
    sm: 'px-3 py-1.5 text-xs min-h-[44px]', 
    md: 'px-4 py-2 text-sm min-h-[48px]', 
    lg: 'px-6 py-3 text-base min-h-[48px]'
  }
  return (
    <button
      type={type}
      onClick={() => { if (!disabled) { h.tap(); onClick?.() } }}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`rounded-button font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, placeholder, type = 'text', className = '', error, dir, hint }: { label?: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; error?: string; dir?: string; hint?: string }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => h.light()}
        placeholder={placeholder}
        dir={dir}
        className={`w-full px-3 py-2 rounded-input border bg-slate-50 dark:bg-slate-700 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all-smooth ${error ? 'border-error-300 dark:border-error-600' : 'border-slate-200 dark:border-slate-600'}`}
      />
      {error && <p className="text-xs text-error-500 mt-1">{error}</p>}
      {!error && hint && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

export function Select({ label, value, onChange, options, className = '', placeholder }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string; placeholder?: string }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
      <select
        value={value}
        onChange={(e) => { h.select(); onChange(e.target.value) }}
        className="w-full px-3 py-2 rounded-input border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all-smooth"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

export function Textarea({ label, value, onChange, placeholder, rows = 3, className = '' }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => h.light()}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-input border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all-smooth resize-none"
      />
    </div>
  )
}

export function Badge({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
    success: 'bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300',
    warning: 'bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-300',
    error: 'bg-error-100 dark:bg-error-900/40 text-error-700 dark:text-error-300',
    accent: 'bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300',
    secondary: 'bg-secondary-100 dark:bg-secondary-900/40 text-secondary-700 dark:text-secondary-300',
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium ${colorMap[color] || colorMap.slate}`}>{children}</span>
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center relative overflow-hidden rounded-dialog group">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50 transition-colors duration-500" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary-400/10 dark:bg-primary-500/10 rounded-full blur-3xl breathe-slow mix-blend-multiply dark:mix-blend-screen pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative z-10">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 transition-transform duration-500 group-hover:scale-110"
          style={{ background: 'color-mix(in srgb, var(--module-color, #64748b) 14%, white)', color: 'var(--module-color, #64748b)' }}
        >
          {icon}
        </div>
        <p className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">{title}</p>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'full', footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; footer?: React.ReactNode }) {
  // Escape closes the modal — standard keyboard behavior expected in every
  // modal/dialog worldwide; previously only mouse/touch could close these.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { h.cancel(); onClose() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null
  const sizes: Record<string, string> = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-none' }
  const isFull = size === 'full'
  // Rendered via portal directly under <body> so this overlay is always
  // positioned against the real viewport — never against a transformed
  // ancestor (e.g. the page-transition wrapper), which would otherwise
  // trap this "fixed" overlay inside the page content and leave the app
  // header visible above it / cause horizontal clipping.
  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm ${isFull ? '' : 'p-4'}`} onClick={() => { h.cancel(); onClose() }}>
      <div
        className={`w-full ${sizes[size]} bg-white dark:bg-slate-800 card-shadow-lg dark:card-shadow-lg overflow-y-auto ${isFull ? 'h-[100dvh] rounded-none fullmodal-in' : 'rounded-3xl max-h-[90vh] modal-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 ${isFull ? '' : 'rounded-t-3xl'}`}>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={() => { h.cancel(); onClose() }} aria-label="بستن" className="p-1.5 hover:bg-error-50 dark:hover:bg-error-900/30 rounded-lg transition-all-smooth press-scale text-slate-400 dark:text-slate-500 hover:text-error-600 dark:hover:text-error-400"><X size={18} /></button>
        </div>
        <div className={`${isFull ? 'p-4 sm:p-6 max-w-3xl mx-auto' : 'p-5'}`}>
          {children}
        </div>
        {footer && (
          <div className="sticky bottom-0 px-4 sm:px-6 py-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-700 pb-safe">
            <div className="max-w-3xl mx-auto">{footer}</div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export interface WizardStep {
  label: string
  content: React.ReactNode
  /** Return an error message to block moving to the next step, or null/undefined if valid. */
  validate?: () => string | null
}

/**
 * Shared multi-step "wizard" shell — progress header + stepped content + sticky
 * bottom navigation. Mirrors the نوبت‌دهی (Appointments) booking flow so every
 * module's create/edit forms feel consistent: one focused step at a time,
 * no long vertically-scrolling forms, no horizontal overflow.
 */
export function Wizard({
  open, onClose, title, steps, step, onStepChange, onFinish, finishLabel = 'ثبت', saving = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  steps: WizardStep[]
  step: number
  onStepChange: (step: number) => void
  onFinish: () => void
  finishLabel?: string
  saving?: boolean
}) {
  if (!open) return null
  const last = steps.length - 1

  const goNext = () => {
    const err = steps[step]?.validate?.()
    if (err) { h.error(); showToast('error', err); return }
    h.tap()
    onStepChange(Math.min(step + 1, last))
  }
  const goPrev = () => { h.cancel(); onStepChange(Math.max(step - 1, 0)) }
  const goTo = (i: number) => { if (i < step) { h.tap(); onStepChange(i) } }

  return (
    <Modal open={open} onClose={onClose} title={title} size="full">
      <div className="space-y-5">
        {/* Step indicators */}
        <div className="flex items-center gap-1 sm:gap-2">
          {steps.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`flex-1 flex flex-col items-center gap-1.5 min-w-0 ${i > step ? 'opacity-40' : ''}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all-smooth shrink-0 ${
                i < step ? 'bg-primary-700 text-white' :
                i === step ? 'bg-primary-700 text-white ring-4 ring-primary-100 dark:ring-primary-900/40 pulse-glow' :
                'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}>
                {i < step ? <CheckCircle2 size={18} /> : toPersianDigits(i + 1)}
              </div>
              <span className={`text-[10px] sm:text-[11px] font-semibold text-center leading-tight truncate w-full ${i <= step ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-gradient-to-l from-primary-400 to-primary-600 rounded-full transition-all-smooth" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        {/* Active step content */}
        <div className="space-y-3 min-w-0">
          {steps[step]?.content}
        </div>

        {/* Navigation — sticky bottom bar */}
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-6 px-4 sm:px-6 py-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 pb-safe">
          <Button variant="secondary" onClick={goPrev} disabled={step === 0}>
            <ChevronRight size={16} /> قبلی
          </Button>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all-smooth ${i === step ? 'w-6 bg-primary-600' : i < step ? 'w-1.5 bg-primary-400' : 'w-1.5 bg-slate-200 dark:bg-slate-600'}`} />
            ))}
          </div>
          {step < last ? (
            <Button variant="primary" onClick={goNext}>
              بعدی <ChevronLeft size={16} />
            </Button>
          ) : (
            <Button variant="primary" onClick={onFinish} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {finishLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export interface TabItem {
  key: string
  label: string
  icon?: React.ReactNode
  color?: string
  badge?: string | number
}

export function Tabs({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: (TabItem | { key: string; label: string; icon?: React.ReactNode; color?: string; badge?: string | number })[]
  active: string
  onChange: (key: string) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollStripRef = useRef<HTMLDivElement | null>(null)
  const [quickMenuOpen, setQuickMenuOpen] = useState(false)
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftState, setScrollLeftState] = useState(0)

  // Color mapping for clinical tabs - active and vibrant inactive styling
  const colorMap: Record<
    string,
    {
      activeBg: string
      activeText: string
      activeBorder: string
      iconColor: string
      inactiveBg: string
      inactiveBorder: string
      inactiveText: string
      inactiveHover: string
      badgeInactive: string
    }
  > = {
    teal: {
      activeBg: 'bg-teal-600 text-white shadow-teal-500/25',
      activeText: 'text-white',
      activeBorder: 'border-teal-500',
      iconColor: 'text-teal-600 dark:text-teal-400',
      inactiveBg: 'bg-teal-50/90 dark:bg-teal-950/40',
      inactiveBorder: 'border-teal-200/90 dark:border-teal-800/60',
      inactiveText: 'text-teal-800 dark:text-teal-200',
      inactiveHover: 'hover:bg-teal-100/90 dark:hover:bg-teal-900/60',
      badgeInactive: 'bg-teal-200/70 dark:bg-teal-800/60 text-teal-900 dark:text-teal-100',
    },
    blue: {
      activeBg: 'bg-blue-600 text-white shadow-blue-500/25',
      activeText: 'text-white',
      activeBorder: 'border-blue-500',
      iconColor: 'text-blue-600 dark:text-blue-400',
      inactiveBg: 'bg-blue-50/90 dark:bg-blue-950/40',
      inactiveBorder: 'border-blue-200/90 dark:border-blue-800/60',
      inactiveText: 'text-blue-800 dark:text-blue-200',
      inactiveHover: 'hover:bg-blue-100/90 dark:hover:bg-blue-900/60',
      badgeInactive: 'bg-blue-200/70 dark:bg-blue-800/60 text-blue-900 dark:text-blue-100',
    },
    purple: {
      activeBg: 'bg-purple-600 text-white shadow-purple-500/25',
      activeText: 'text-white',
      activeBorder: 'border-purple-500',
      iconColor: 'text-purple-600 dark:text-purple-400',
      inactiveBg: 'bg-purple-50/90 dark:bg-purple-950/40',
      inactiveBorder: 'border-purple-200/90 dark:border-purple-800/60',
      inactiveText: 'text-purple-800 dark:text-purple-200',
      inactiveHover: 'hover:bg-purple-100/90 dark:hover:bg-purple-900/60',
      badgeInactive: 'bg-purple-200/70 dark:bg-purple-800/60 text-purple-900 dark:text-purple-100',
    },
    amber: {
      activeBg: 'bg-amber-600 text-white shadow-amber-500/25',
      activeText: 'text-white',
      activeBorder: 'border-amber-500',
      iconColor: 'text-amber-600 dark:text-amber-400',
      inactiveBg: 'bg-amber-50/90 dark:bg-amber-950/40',
      inactiveBorder: 'border-amber-200/90 dark:border-amber-800/60',
      inactiveText: 'text-amber-800 dark:text-amber-200',
      inactiveHover: 'hover:bg-amber-100/90 dark:hover:bg-amber-900/60',
      badgeInactive: 'bg-amber-200/70 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100',
    },
    emerald: {
      activeBg: 'bg-emerald-600 text-white shadow-emerald-500/25',
      activeText: 'text-white',
      activeBorder: 'border-emerald-500',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      inactiveBg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
      inactiveBorder: 'border-emerald-200/90 dark:border-emerald-800/60',
      inactiveText: 'text-emerald-800 dark:text-emerald-200',
      inactiveHover: 'hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60',
      badgeInactive: 'bg-emerald-200/70 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100',
    },
    rose: {
      activeBg: 'bg-rose-600 text-white shadow-rose-500/25',
      activeText: 'text-white',
      activeBorder: 'border-rose-500',
      iconColor: 'text-rose-600 dark:text-rose-400',
      inactiveBg: 'bg-rose-50/90 dark:bg-rose-950/40',
      inactiveBorder: 'border-rose-200/90 dark:border-rose-800/60',
      inactiveText: 'text-rose-800 dark:text-rose-200',
      inactiveHover: 'hover:bg-rose-100/90 dark:hover:bg-rose-900/60',
      badgeInactive: 'bg-rose-200/70 dark:bg-rose-800/60 text-rose-900 dark:text-rose-100',
    },
    indigo: {
      activeBg: 'bg-indigo-600 text-white shadow-indigo-500/25',
      activeText: 'text-white',
      activeBorder: 'border-indigo-500',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      inactiveBg: 'bg-indigo-50/90 dark:bg-indigo-950/40',
      inactiveBorder: 'border-indigo-200/90 dark:border-indigo-800/60',
      inactiveText: 'text-indigo-800 dark:text-indigo-200',
      inactiveHover: 'hover:bg-indigo-100/90 dark:hover:bg-indigo-900/60',
      badgeInactive: 'bg-indigo-200/70 dark:bg-indigo-800/60 text-indigo-900 dark:text-indigo-100',
    },
    cyan: {
      activeBg: 'bg-cyan-600 text-white shadow-cyan-500/25',
      activeText: 'text-white',
      activeBorder: 'border-cyan-500',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      inactiveBg: 'bg-cyan-50/90 dark:bg-cyan-950/40',
      inactiveBorder: 'border-cyan-200/90 dark:border-cyan-800/60',
      inactiveText: 'text-cyan-800 dark:text-cyan-200',
      inactiveHover: 'hover:bg-cyan-100/90 dark:hover:bg-cyan-900/60',
      badgeInactive: 'bg-cyan-200/70 dark:bg-cyan-800/60 text-cyan-900 dark:text-cyan-100',
    },
    sky: {
      activeBg: 'bg-sky-600 text-white shadow-sky-500/25',
      activeText: 'text-white',
      activeBorder: 'border-sky-500',
      iconColor: 'text-sky-600 dark:text-sky-400',
      inactiveBg: 'bg-sky-50/90 dark:bg-sky-950/40',
      inactiveBorder: 'border-sky-200/90 dark:border-sky-800/60',
      inactiveText: 'text-sky-800 dark:text-sky-200',
      inactiveHover: 'hover:bg-sky-100/90 dark:hover:bg-sky-900/60',
      badgeInactive: 'bg-sky-200/70 dark:bg-sky-800/60 text-sky-900 dark:text-sky-100',
    },
    fuchsia: {
      activeBg: 'bg-fuchsia-600 text-white shadow-fuchsia-500/25',
      activeText: 'text-white',
      activeBorder: 'border-fuchsia-500',
      iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
      inactiveBg: 'bg-fuchsia-50/90 dark:bg-fuchsia-950/40',
      inactiveBorder: 'border-fuchsia-200/90 dark:border-fuchsia-800/60',
      inactiveText: 'text-fuchsia-800 dark:text-fuchsia-200',
      inactiveHover: 'hover:bg-fuchsia-100/90 dark:hover:bg-fuchsia-900/60',
      badgeInactive: 'bg-fuchsia-200/70 dark:bg-fuchsia-800/60 text-fuchsia-900 dark:text-fuchsia-100',
    },
    orange: {
      activeBg: 'bg-orange-600 text-white shadow-orange-500/25',
      activeText: 'text-white',
      activeBorder: 'border-orange-500',
      iconColor: 'text-orange-600 dark:text-orange-400',
      inactiveBg: 'bg-orange-50/90 dark:bg-orange-950/40',
      inactiveBorder: 'border-orange-200/90 dark:border-orange-800/60',
      inactiveText: 'text-orange-800 dark:text-orange-200',
      inactiveHover: 'hover:bg-orange-100/90 dark:hover:bg-orange-900/60',
      badgeInactive: 'bg-orange-200/70 dark:bg-orange-800/60 text-orange-900 dark:text-orange-100',
    },
    lime: {
      activeBg: 'bg-lime-600 text-white shadow-lime-500/25',
      activeText: 'text-white',
      activeBorder: 'border-lime-500',
      iconColor: 'text-lime-700 dark:text-lime-400',
      inactiveBg: 'bg-lime-50/90 dark:bg-lime-950/40',
      inactiveBorder: 'border-lime-200/90 dark:border-lime-800/60',
      inactiveText: 'text-lime-900 dark:text-lime-200',
      inactiveHover: 'hover:bg-lime-100/90 dark:hover:bg-lime-900/60',
      badgeInactive: 'bg-lime-200/70 dark:bg-lime-800/60 text-lime-950 dark:text-lime-100',
    },
    mint: {
      activeBg: 'bg-emerald-500 text-white shadow-emerald-500/25',
      activeText: 'text-white',
      activeBorder: 'border-emerald-400',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      inactiveBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
      inactiveBorder: 'border-emerald-200/90 dark:border-emerald-800/60',
      inactiveText: 'text-emerald-800 dark:text-emerald-200',
      inactiveHover: 'hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50',
      badgeInactive: 'bg-emerald-200/60 dark:bg-emerald-800/50 text-emerald-900 dark:text-emerald-100',
    },
    slate: {
      activeBg: 'bg-slate-700 text-white shadow-slate-600/25',
      activeText: 'text-white',
      activeBorder: 'border-slate-600',
      iconColor: 'text-slate-600 dark:text-slate-400',
      inactiveBg: 'bg-slate-100/90 dark:bg-slate-800/60',
      inactiveBorder: 'border-slate-300/90 dark:border-slate-700/60',
      inactiveText: 'text-slate-800 dark:text-slate-200',
      inactiveHover: 'hover:bg-slate-200/90 dark:hover:bg-slate-700/60',
      badgeInactive: 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100',
    },
    yellow: {
      activeBg: 'bg-yellow-500 text-slate-950 shadow-yellow-500/25 font-black',
      activeText: 'text-slate-950 font-black',
      activeBorder: 'border-yellow-400',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      inactiveBg: 'bg-yellow-50/90 dark:bg-yellow-950/40',
      inactiveBorder: 'border-yellow-300/90 dark:border-yellow-700/60',
      inactiveText: 'text-yellow-900 dark:text-yellow-200',
      inactiveHover: 'hover:bg-yellow-100/90 dark:hover:bg-yellow-900/60',
      badgeInactive: 'bg-yellow-200/80 dark:bg-yellow-800/60 text-yellow-950 dark:text-yellow-100',
    },
    pink: {
      activeBg: 'bg-pink-600 text-white shadow-pink-500/25',
      activeText: 'text-white',
      activeBorder: 'border-pink-500',
      iconColor: 'text-pink-600 dark:text-pink-400',
      inactiveBg: 'bg-pink-50/90 dark:bg-pink-950/40',
      inactiveBorder: 'border-pink-200/90 dark:border-pink-800/60',
      inactiveText: 'text-pink-800 dark:text-pink-200',
      inactiveHover: 'hover:bg-pink-100/90 dark:hover:bg-pink-900/60',
      badgeInactive: 'bg-pink-200/70 dark:bg-pink-800/60 text-pink-900 dark:text-pink-100',
    },
    violet: {
      activeBg: 'bg-violet-600 text-white shadow-violet-500/25',
      activeText: 'text-white',
      activeBorder: 'border-violet-500',
      iconColor: 'text-violet-600 dark:text-violet-400',
      inactiveBg: 'bg-violet-50/90 dark:bg-violet-950/40',
      inactiveBorder: 'border-violet-200/90 dark:border-violet-800/60',
      inactiveText: 'text-violet-800 dark:text-violet-200',
      inactiveHover: 'hover:bg-violet-100/90 dark:hover:bg-violet-900/60',
      badgeInactive: 'bg-violet-200/70 dark:bg-violet-800/60 text-violet-900 dark:text-violet-100',
    },
  }

  const defaultTheme = {
    activeBg: 'bg-primary-600 text-white shadow-primary-500/25',
    activeText: 'text-white',
    activeBorder: 'border-primary-500',
    iconColor: 'text-primary-600 dark:text-primary-400',
    inactiveBg: 'bg-primary-50/90 dark:bg-primary-950/40',
    inactiveBorder: 'border-primary-200/90 dark:border-primary-800/60',
    inactiveText: 'text-primary-800 dark:text-primary-200',
    inactiveHover: 'hover:bg-primary-100/90 dark:hover:bg-primary-900/60',
    badgeInactive: 'bg-primary-200/70 dark:bg-primary-800/60 text-primary-900 dark:text-primary-100',
  }

  // Auto-scroll active tab into center view — strictly internal container scroll, NEVER touches window/page layout
  useEffect(() => {
    const container = scrollStripRef.current
    const activeEl = tabButtonRefs.current[active]
    if (!container || !activeEl) return

    // Calculate relative offset within the scroll strip container only
    const containerRect = container.getBoundingClientRect()
    const elRect = activeEl.getBoundingClientRect()

    const offset = (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2)

    if (Math.abs(offset) > 4) {
      container.scrollBy({
        left: offset,
        behavior: 'smooth',
      })
    }

    // Defensive guarantee: ensure window horizontal scroll never deviates from 0
    if (typeof window !== 'undefined' && window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY)
    }
  }, [active])

  // Mouse scroll helper (arrow buttons)
  const handleScrollBy = (offset: number) => {
    if (scrollStripRef.current) {
      scrollStripRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  // Mouse Wheel horizontal scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollStripRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollStripRef.current.scrollLeft += e.deltaY * 0.8
    }
  }

  // Mouse Drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollStripRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - scrollStripRef.current.offsetLeft)
    setScrollLeftState(scrollStripRef.current.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollStripRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollStripRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollStripRef.current.scrollLeft = scrollLeftState - walk
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  // Close quick menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!quickMenuOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickMenuOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
    }
  }, [quickMenuOpen])

  return (
    <div className={`relative group/tabs z-20 ${className}`} ref={containerRef}>
      <div className="relative flex items-center gap-1.5 p-1.5 bg-gradient-to-r from-slate-100/90 via-white/80 to-slate-100/90 dark:from-slate-850/90 dark:via-slate-800/90 dark:to-slate-850/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        {/* Scroll Left Button (Rightwards in RTL) */}
        <button
          type="button"
          onClick={() => handleScrollBy(180)}
          title="پیمایش به راست"
          aria-label="پیمایش به راست"
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-700/70 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs border border-slate-200/60 dark:border-slate-600/60 transition-all shrink-0 press-scale"
        >
          <ChevronRight size={16} />
        </button>

        {/* Scrollable Tab Strip with Mouse Drag and Wheel Support */}
        <div
          ref={scrollStripRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex-1 flex gap-1.5 overflow-x-auto tabs-scroll-container scroll-smooth py-1 px-0.5 select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {tabs.map((tab) => {
            const isCurrent = active === tab.key
            const theme = (tab.color && colorMap[tab.color]) || defaultTheme

            return (
              <button
                key={tab.key}
                ref={(el) => {
                  tabButtonRefs.current[tab.key] = el
                }}
                type="button"
                onClick={() => {
                  h.select()
                  onChange(tab.key)
                }}
                className={`flex-shrink-0 min-h-[42px] flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 press-scale border ${
                  isCurrent
                    ? `${theme.activeBg} ${theme.activeBorder} shadow-md scale-[1.02]`
                    : `${theme.inactiveBg} ${theme.inactiveBorder} ${theme.inactiveText} ${theme.inactiveHover}`
                }`}
              >
                {tab.icon && (
                  <span
                    className={`shrink-0 transition-transform duration-200 ${
                      isCurrent ? 'scale-110 text-white' : theme.iconColor
                    }`}
                  >
                    {tab.icon}
                  </span>
                )}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : theme.badgeInactive
                    }`}
                  >
                    {toPersianDigits(String(tab.badge))}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Scroll Right Button (Leftwards in RTL) */}
        <button
          type="button"
          onClick={() => handleScrollBy(-180)}
          title="پیمایش به چپ"
          aria-label="پیمایش به چپ"
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-700/70 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs border border-slate-200/60 dark:border-slate-600/60 transition-all shrink-0 press-scale"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Quick-Jump Dropdown Button for extensive tab bars (> 6 tabs) */}
        {tabs.length > 6 && (
          <div className="relative shrink-0 border-r border-slate-300/80 dark:border-slate-700/80 pr-1.5 mr-0.5">
            <button
              type="button"
              onClick={() => {
                h.tap()
                setQuickMenuOpen((prev) => !prev)
              }}
              title="دسترسی سریع به تمام تب‌ها"
              aria-label="دسترسی سریع به تمام تب‌ها"
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all-smooth press-scale border ${
                quickMenuOpen
                  ? 'bg-primary-600 text-white shadow-sm border-primary-500'
                  : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border-slate-200/80 dark:border-slate-600/80 shadow-2xs'
              }`}
            >
              <ChevronDown size={17} className={`transition-transform duration-200 ${quickMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Quick Menu Navigator: rendered via Portal directly to body to guarantee ZERO page layout shift or overflow bugs */}
      {quickMenuOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              h.cancel()
              setQuickMenuOpen(false)
            }
          }}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-primary-500/30 dark:border-primary-500/40 overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="دسترسی سریع به بخش‌های پرونده"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    دسترسی سریع به بخش‌های پرونده
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    انتخاب مستقیم از میان {toPersianDigits(tabs.length)} بخش تخصصی بالینی
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  h.cancel()
                  setQuickMenuOpen(false)
                }}
                className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all press-scale"
                aria-label="بستن"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs Grid: 100% Colorful tactile pills */}
            <div className="p-4 overflow-y-auto dock-scroll grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh]">
              {tabs.map((tab) => {
                const isCurrent = active === tab.key
                const theme = (tab.color && colorMap[tab.color]) || defaultTheme
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      h.select()
                      onChange(tab.key)
                      setQuickMenuOpen(false)
                    }}
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl text-xs font-bold transition-all press-scale border ${
                      isCurrent
                        ? `${theme.activeBg} ${theme.activeBorder} shadow-md font-black scale-[1.01]`
                        : `${theme.inactiveBg} ${theme.inactiveBorder} ${theme.inactiveText} ${theme.inactiveHover}`
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {tab.icon && (
                        <span className={`shrink-0 ${isCurrent ? 'text-white' : theme.iconColor}`}>
                          {tab.icon}
                        </span>
                      )}
                      <span className="truncate">{tab.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {tab.badge !== undefined && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black font-mono ${
                            isCurrent
                              ? 'bg-white/20 text-white'
                              : theme.badgeInactive
                          }`}
                        >
                          {toPersianDigits(String(tab.badge))}
                        </span>
                      )}
                      {isCurrent && <CheckCircle2 size={16} className="text-white shrink-0" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => { h.cancel(); onClose() }}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl card-shadow-lg dark:card-shadow-lg p-5 modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-error-100 dark:bg-error-900/40 flex items-center justify-center text-error-600 dark:text-error-400"><AlertCircle size={20} /></div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => { h.cancel(); onClose() }}>انصراف</Button>
          <Button variant="danger" onClick={() => { h.delete(); onConfirm(); onClose() }}>تایید</Button>
        </div>
      </div>
    </div>
  )
}

type ToastMsg = { id: number; type: 'success' | 'error' | 'info'; message: string }
let toastId = 0
const toastListeners: ((toasts: ToastMsg[]) => void)[] = []
let currentToasts: ToastMsg[] = []

export function HighlightText({ text, query, className = '' }: { text: string; query: string; className?: string }) {
  if (!query.trim()) return <span className={className}>{text}</span>
  const ranges = matchRanges(query, text)
  if (ranges.length === 0) return <span className={className}>{text}</span>
  const [start, end] = ranges[0]
  return (
    <span className={className}>
      {text.slice(0, start)}
      <mark className="bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 rounded px-0.5">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </span>
  )
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 card-shadow ${className}`}>
      <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-2.5 w-3/5 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  )
}

export function showToast(type: 'success' | 'error' | 'info', message: string) {
  const id = ++toastId
  currentToasts = [...currentToasts, { id, type, message }]
  toastListeners.forEach((l) => l(currentToasts))
  // Haptic + sound on toast
  if (type === 'success') {
    h.success()
    chimes.playSuccess()
  } else if (type === 'error') {
    h.error()
    chimes.playWarning()
  } else {
    h.light()
    chimes.playPop()
  }
  setTimeout(() => {
    currentToasts = currentToasts.filter((t) => t.id !== id)
    toastListeners.forEach((l) => l(currentToasts))
  }, 3000)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  useEffect(() => {
    toastListeners.push(setToasts)
    return () => { const idx = toastListeners.indexOf(setToasts); if (idx >= 0) toastListeners.splice(idx, 1) }
  }, [])
  const icons = { success: <CheckCircle2 size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} /> }
  const colors = { success: 'bg-success-50 dark:bg-success-900/40 text-success-700 dark:text-success-300 border-success-200 dark:border-success-700', error: 'bg-error-50 dark:bg-error-900/40 text-error-700 dark:text-error-300 border-error-200 dark:border-error-700', info: 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700' }
  return (
    <div className="fixed bottom-24 left-4 z-[60] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${colors[t.type]} card-shadow-lg animate-in`}>
          {icons[t.type]}<span className="text-sm font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export function MultiSelectChips({ 
  label, 
  options, 
  value, 
  onChange,
  allowCustom = true,
  placeholder = "افزودن مورد جدید..."
}: { 
  label: string; 
  options: string[]; 
  value: string; 
  onChange: (val: string) => void;
  allowCustom?: boolean;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('')
  
  // Parse comma-separated value into array, trimming whitespace and filtering empty
  const selectedItems = (value || '').split(',').map(s => s.trim()).filter(Boolean)
  
  const toggleItem = (item: string) => {
    h.light()
    if (selectedItems.includes(item)) {
      onChange(selectedItems.filter(i => i !== item).join(', '))
    } else {
      onChange([...selectedItems, item].join(', '))
    }
  }

  const handleAddCustom = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      const newItem = inputValue.trim()
      if (!selectedItems.includes(newItem)) {
        h.medium()
        onChange([...selectedItems, newItem].join(', '))
      }
      setInputValue('')
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {options.map(opt => {
          const isSelected = selectedItems.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleItem(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all-smooth border ${
                isSelected 
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm' 
                  : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary-300'
              }`}
            >
              {opt}
            </button>
          )
        })}
        {selectedItems.filter(item => !options.includes(item)).map(customOpt => (
          <button
            key={customOpt}
            type="button"
            onClick={() => toggleItem(customOpt)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all-smooth border bg-primary-600 border-primary-600 text-white shadow-sm"
          >
            {customOpt}
            <X size={12} className="opacity-70 hover:opacity-100" />
          </button>
        ))}
      </div>
      {allowCustom && (
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleAddCustom}
          placeholder={placeholder}
          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all-smooth text-slate-900 dark:text-white"
        />
      )}
    </div>
  )
}
