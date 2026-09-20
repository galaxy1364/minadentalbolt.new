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

  // Color mapping for clinical tabs
  const colorMap: Record<string, { activeBg: string; activeText: string; activeBorder: string; iconColor: string; inactiveHover: string }> = {
    teal: {
      activeBg: 'bg-teal-600 text-white shadow-teal-500/25',
      activeText: 'text-white',
      activeBorder: 'border-teal-500',
      iconColor: 'text-teal-600 dark:text-teal-400',
      inactiveHover: 'hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300',
    },
    blue: {
      activeBg: 'bg-blue-600 text-white shadow-blue-500/25',
      activeText: 'text-white',
      activeBorder: 'border-blue-500',
      iconColor: 'text-blue-600 dark:text-blue-400',
      inactiveHover: 'hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300',
    },
    purple: {
      activeBg: 'bg-purple-600 text-white shadow-purple-500/25',
      activeText: 'text-white',
      activeBorder: 'border-purple-500',
      iconColor: 'text-purple-600 dark:text-purple-400',
      inactiveHover: 'hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-300',
    },
    amber: {
      activeBg: 'bg-amber-600 text-white shadow-amber-500/25',
      activeText: 'text-white',
      activeBorder: 'border-amber-500',
      iconColor: 'text-amber-600 dark:text-amber-400',
      inactiveHover: 'hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300',
    },
    emerald: {
      activeBg: 'bg-emerald-600 text-white shadow-emerald-500/25',
      activeText: 'text-white',
      activeBorder: 'border-emerald-500',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      inactiveHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300',
    },
    rose: {
      activeBg: 'bg-rose-600 text-white shadow-rose-500/25',
      activeText: 'text-white',
      activeBorder: 'border-rose-500',
      iconColor: 'text-rose-600 dark:text-rose-400',
      inactiveHover: 'hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300',
    },
    indigo: {
      activeBg: 'bg-indigo-600 text-white shadow-indigo-500/25',
      activeText: 'text-white',
      activeBorder: 'border-indigo-500',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      inactiveHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300',
    },
    cyan: {
      activeBg: 'bg-cyan-600 text-white shadow-cyan-500/25',
      activeText: 'text-white',
      activeBorder: 'border-cyan-500',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      inactiveHover: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-700 dark:hover:text-cyan-300',
    },
    violet: {
      activeBg: 'bg-violet-600 text-white shadow-violet-500/25',
      activeText: 'text-white',
      activeBorder: 'border-violet-500',
      iconColor: 'text-violet-600 dark:text-violet-400',
      inactiveHover: 'hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-300',
    },
  }

  const defaultTheme = {
    activeBg: 'bg-primary-600 text-white shadow-primary-500/25',
    activeText: 'text-white',
    activeBorder: 'border-primary-500',
    iconColor: 'text-primary-600 dark:text-primary-400',
    inactiveHover: 'hover:bg-white/60 dark:hover:bg-slate-700/60 hover:text-primary-700 dark:hover:text-primary-300',
  }

  // Auto-scroll active tab into center view
  useEffect(() => {
    const activeEl = tabButtonRefs.current[active]
    if (activeEl && scrollStripRef.current) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
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
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuickMenuOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickMenuOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKey)
    }
  }, [quickMenuOpen])

  return (
    <div className={`relative group/tabs ${quickMenuOpen ? 'z-50' : 'z-20'} ${className}`} ref={containerRef}>
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
                    : `bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 ${theme.inactiveHover}`
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
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
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

            {/* Quick Menu Popover / Mobile Sheet */}
            {quickMenuOpen && (
              <>
                {/* Click outside backdrop */}
                <div
                  className="fixed inset-0 z-40 bg-black/30 sm:bg-black/10 backdrop-blur-2xs"
                  onClick={() => setQuickMenuOpen(false)}
                />
                <div
                  className="fixed inset-x-3 bottom-24 sm:static sm:absolute sm:left-0 sm:top-full sm:bottom-auto sm:mt-2 sm:w-72 max-h-[72vh] sm:max-h-96 overflow-y-auto dock-scroll p-3 bg-white/98 dark:bg-slate-850/98 backdrop-blur-2xl rounded-3xl sm:rounded-2xl shadow-2xl border-2 border-primary-500/40 dark:border-primary-500/50 z-50 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-2 duration-200"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers size={14} className="text-primary-600 dark:text-primary-400" />
                      <span>دسترسی سریع به بخش‌های پرونده:</span>
                    </span>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300">
                      {toPersianDigits(tabs.length)} بخش
                    </span>
                  </div>
                  <div className="space-y-1">
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
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all-smooth text-right ${
                            isCurrent
                              ? `${theme.activeBg} shadow-xs font-black`
                              : `text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80`
                          }`}
                        >
                          {tab.icon && (
                            <span className={`shrink-0 ${isCurrent ? 'text-white' : theme.iconColor}`}>
                              {tab.icon}
                            </span>
                          )}
                          <span className="truncate flex-1">{tab.label}</span>
                          {tab.badge !== undefined && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">
                              {toPersianDigits(String(tab.badge))}
                            </span>
                          )}
                          {isCurrent && <CheckCircle2 size={14} className="text-white shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
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
