import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, CheckCircle2, Info, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { h } from '../lib/haptics'
import { toPersianDigits } from '../lib/persianDate'
import { matchRanges } from '../lib/fuzzySearch'

export function Spinner({ size = 24 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-primary-500 mx-auto" />
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white dark:bg-slate-800 rounded-2xl card-shadow dark:card-shadow ${className}`}>{children}</div>
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

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; size?: 'sm' | 'md' | 'lg'; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  const variants: Record<string, string> = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300',
    danger: 'bg-error-600 hover:bg-error-700 text-white',
    success: 'bg-success-600 hover:bg-success-700 text-white',
  }
  const sizes: Record<string, string> = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button
      type={type}
      onClick={() => { if (!disabled) { h.tap(); onClick?.() } }}
      disabled={disabled}
      className={`rounded-xl font-medium transition-all-smooth press-scale disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, placeholder, type = 'text', className = '', error, dir }: { label?: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; error?: string; dir?: string }) {
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
        className={`w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-700 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all-smooth ${error ? 'border-error-300 dark:border-error-600' : 'border-slate-200 dark:border-slate-600'}`}
      />
      {error && <p className="text-xs text-error-500 mt-1">{error}</p>}
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
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all-smooth"
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
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all-smooth resize-none"
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
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color] || colorMap.slate}`}>{children}</span>
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">{icon}</div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{title}</p>
      {description && <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{description}</p>}
      {action}
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
                i < step ? 'bg-primary-600 text-white' :
                i === step ? 'bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900/40 pulse-glow' :
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

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; icon?: React.ReactNode }[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-x-auto dock-scroll">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => { h.select(); onChange(tab.key) }}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all-smooth press-scale ${active === tab.key ? 'bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-400 card-shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          {tab.icon}{tab.label}
        </button>
      ))}
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
  if (type === 'success') h.success()
  else if (type === 'error') h.error()
  else h.light()
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
