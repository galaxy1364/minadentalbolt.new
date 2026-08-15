import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Check, X, AlertTriangle, Loader2, Trash2, Edit2, Plus, Eye,
  ChevronLeft, ShieldCheck, Sparkles, Zap,
} from 'lucide-react'
import { h, startContinuousHaptic, stopContinuousHaptic } from '../lib/haptics'

// ─────────────────────────────────────────────────────────────────
// Enterprise Multi-Step Wizard System
// Flow: 1. Preview → 2. Confirm (hold-to-commit) → 3. Executing → 4. Done
// iOS 27 liquid-glass aesthetic with morphing transitions
// ─────────────────────────────────────────────────────────────────

export type ConfirmActionType = 'create' | 'edit' | 'delete' | 'status'

export interface PreviewField {
  label: string
  value: string | React.ReactNode
  icon?: React.ReactNode
  highlight?: boolean
}

export interface ConfirmActionConfig {
  type: ConfirmActionType
  title: string
  fields: PreviewField[]
  onConfirm: () => Promise<void>
  confirmLabel?: string
  warning?: string
}

const typeMeta = {
  create: { icon: <Plus size={26} />, color: 'from-teal-500 to-teal-700', bg: 'bg-teal-50', text: 'text-teal-700', ring: 'ring-teal-200', label: 'ثبت جدید' },
  edit:   { icon: <Edit2 size={26} />, color: 'from-sky-500 to-sky-700', bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200', label: 'ویرایش' },
  delete: { icon: <Trash2 size={26} />, color: 'from-rose-500 to-rose-700', bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', label: 'حذف' },
  status: { icon: <Check size={26} />, color: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'تغییر وضعیت' },
}

type WizardStep = 'preview' | 'confirm' | 'executing' | 'done'

const stepOrder: WizardStep[] = ['preview', 'confirm', 'executing', 'done']
const stepLabels = ['پیش‌نمایش', 'تایید', 'اجرا', 'اتمام']

export function ConfirmAction({ config, onClose }: { config: ConfirmActionConfig | null; onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>('preview')
  const [executing, setExecuting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [holdProgress, setHoldProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdDone = useRef(false)

  useEffect(() => {
    if (config) {
      setStep('preview'); setExecuting(false); setProgress(0); setHoldProgress(0); setError(null); holdDone.current = false
    }
  }, [config])

  // Escape closes the confirmation (unless mid-execution, to avoid
  // interrupting a save that's already running).
  useEffect(() => {
    if (!config) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'executing') { h.cancel(); onClose() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [config, step, onClose])

  // ── Progress bar animation during execution ──
  useEffect(() => {
    if (step === 'executing') {
      setProgress(0)
      const t = setInterval(() => setProgress((p) => Math.min(p + 4, 90)), 50)
      return () => clearInterval(t)
    }
  }, [step])

  const goToConfirm = useCallback(() => {
    h.transition()
    setStep('confirm')
  }, [])

  const goBackToPreview = useCallback(() => {
    h.cancel()
    setStep('preview')
  }, [])

  const handleExecute = useCallback(async () => {
    if (!config || holdDone.current) return
    holdDone.current = true
    h.confirm()
    setStep('executing')
    setExecuting(true)
    try {
      await config.onConfirm()
      setProgress(100)
      h.success()
      setStep('done')
      setTimeout(() => { h.release(); onClose() }, 1100)
    } catch (err: any) {
      h.error()
      setError(err?.message || 'خطای ناشناخته')
      setStep('preview')
      setExecuting(false)
      holdDone.current = false
    }
  }, [config, onClose])

  // ── Hold-to-commit gesture (iOS 27 "prepared" haptic) ──
  const startHold = useCallback(() => {
    if (!config || holdDone.current) return
    holdDone.current = false
    setHoldProgress(0)
    startContinuousHaptic('soft', 60)
    let p = 0
    holdTimer.current = setInterval(() => {
      p += 4
      setHoldProgress(p)
      if (p >= 100) {
        if (holdTimer.current) clearInterval(holdTimer.current)
        stopContinuousHaptic()
        h.confirm()
        handleExecute()
      }
    }, 22)
  }, [config, handleExecute])

  const cancelHold = useCallback(() => {
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null }
    if (!holdDone.current) {
      stopContinuousHaptic()
      h.cancel()
      setHoldProgress(0)
    }
  }, [])

  useEffect(() => {
    return () => { if (holdTimer.current) clearInterval(holdTimer.current) }
  }, [])

  if (!config) return null
  const meta = typeMeta[config.type]
  const currentStepIdx = stepOrder.indexOf(step)

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={executing ? undefined : onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" onClick={executing ? undefined : onClose} />

      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-ios-xl overflow-hidden wizard-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header with gradient + glass ── */}
        <div className={`relative px-6 pt-6 pb-5 ${meta.bg} overflow-hidden`}>
          {/* Decorative blur orbs */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/20 blur-xl" />

          <div className="relative flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white shadow-lg press-scale-lg ring-4 ring-white/50`}>
              {step === 'done' ? <Check size={26} /> : step === 'executing' ? <Loader2 size={26} className="animate-spin" /> : meta.icon}
            </div>
            <div className="flex-1">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${meta.text}`}>{meta.label}</p>
              <h3 className="text-lg font-extrabold text-slate-800 leading-tight">{config.title}</h3>
            </div>
            {!executing && step !== 'done' && (
              <button onClick={() => { h.cancel(); onClose() }} className="p-2 rounded-xl bg-white/60 text-slate-500 hover:bg-white transition-all-smooth press-scale">
                <X size={18} />
              </button>
            )}
          </div>

          {/* ── Step progress dots ── */}
          {step !== 'done' && (
            <div className="relative flex items-center gap-1.5 mt-4">
              {stepOrder.slice(0, 3).map((s, i) => {
                const idx = i
                const isCurrent = idx === currentStepIdx
                const isDone = idx < currentStepIdx
                return (
                  <React.Fragment key={s}>
                    <div className={`h-1.5 rounded-full transition-all-spring ${isCurrent ? 'w-8 bg-slate-700' : isDone ? 'w-4 bg-slate-400' : 'w-4 bg-slate-300/60'}`} />
                  </React.Fragment>
                )
              })}
              <span className="text-[10px] font-bold text-slate-500 mr-auto">{stepLabels[currentStepIdx]}</span>
            </div>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 wizard-slide-up">
            <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
            <p className="text-xs text-rose-700 font-medium">{error}</p>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && (
          <div className="px-6 py-5 max-h-[45vh] overflow-y-auto wizard-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">پیش‌نمایش اطلاعات</p>
            </div>
            <div className="space-y-2">
              {config.fields.map((f, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl field-stagger ${f.highlight ? `${meta.bg} border ${meta.ring} ring-1` : 'bg-slate-50'}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {f.icon && <div className={`flex-shrink-0 ${f.highlight ? meta.text : 'text-slate-400'}`}>{f.icon}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500 font-medium">{f.label}</p>
                    <p className={`text-sm font-bold ${f.highlight ? 'text-slate-800' : 'text-slate-700'} truncate`}>{f.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {config.warning && (
              <div className="flex items-start gap-2 mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 wizard-slide-up" style={{ animationDelay: `${config.fields.length * 60}ms` }}>
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">{config.warning}</p>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={() => { h.cancel(); onClose() }} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all-smooth press-scale">
                انصراف
              </button>
              <button onClick={goToConfirm} className={`flex-1 py-3.5 rounded-2xl font-bold text-sm text-white transition-all-smooth press-scale bg-gradient-to-br ${meta.color} shadow-lg`}>
                ادامه و تایید
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Confirm (hold-to-commit) ── */}
        {step === 'confirm' && (
          <div className="px-6 py-6 wizard-slide-up">
            <div className="flex flex-col items-center text-center mb-5">
              <div className={`w-16 h-16 rounded-full ${meta.bg} flex items-center justify-center mb-3 ring-4 ring-white shadow-lg`}>
                <ShieldCheck size={30} className={meta.text} />
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">تایید نهایی</p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[260px]">
                {config.type === 'delete'
                  ? 'برای اجرای قطعی این عملیات، دکمه را نگه دارید'
                  : 'برای ثبت قطعی، دکمه را فشار داده و نگه دارید'}
              </p>
            </div>

            {/* Mini summary */}
            <div className="flex flex-wrap gap-1.5 mb-5 justify-center">
              {config.fields.slice(0, 3).map((f, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                  {f.label}: {typeof f.value === 'string' ? f.value : '...'}
                </span>
              ))}
            </div>

            {/* Hold-to-commit button */}
            <div className="relative">
              <button
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                className={`relative w-full py-4 rounded-2xl font-bold text-sm text-white overflow-hidden transition-all-smooth bg-gradient-to-br ${meta.color} shadow-lg select-none touch-none ${holdProgress > 0 ? 'scale-[0.98]' : 'press-scale'}`}
              >
                {/* Fill overlay */}
                <div
                  className={`absolute inset-0 bg-white/25 transition-none`}
                  style={{ clipPath: `inset(0 ${100 - holdProgress}% 0 0)` }}
                />
                <div className="relative flex items-center justify-center gap-2">
                  {holdProgress > 0 ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>در حال آماده‌سازی... {Math.round(holdProgress)}%</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>{config.confirmLabel || 'تایید و اجرا'} — نگه دارید</span>
                    </>
                  )}
                </div>
              </button>

              {/* Progress ring around button during hold */}
              {holdProgress > 0 && holdProgress < 100 && (
                <div className="absolute -inset-1 rounded-[20px] pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect x="2" y="2" width="96" height="96" rx="18" ry="18" fill="none" stroke="currentColor" strokeWidth="1" className={meta.text} strokeDasharray={`${holdProgress * 3.84} 384`} strokeLinecap="round" opacity="0.3" />
                  </svg>
                </div>
              )}
            </div>

            <button onClick={goBackToPreview} className="w-full mt-3 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
              <ChevronLeft size={14} />
              بازگشت به پیش‌نمایش
            </button>
          </div>
        )}

        {/* ── Step: Executing ── */}
        {step === 'executing' && (
          <div className="px-6 py-10 flex flex-col items-center">
            {/* Circular progress */}
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100" />
                <circle
                  cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6"
                  className={meta.text}
                  strokeDasharray={`${progress * 2.76} 276`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={28} className={`animate-spin ${meta.text}`} />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-700">در حال اجرای عملیات...</p>
            <p className="text-xs text-slate-400 mt-1">{Math.round(progress)}%</p>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className="px-6 py-12 flex flex-col items-center wizard-done-pop">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${meta.color} flex items-center justify-center mb-4 shadow-xl ring-4 ring-white`}>
              <Check size={36} className="text-white" />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={14} className={meta.text} />
              <p className="text-base font-extrabold text-slate-800">با موفقیت انجام شد</p>
            </div>
            <p className="text-xs text-slate-400">عملیات تکمیل شد</p>

            {/* Confetti sparkles */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['#0d9488', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'][i],
                  top: `${20 + Math.random() * 40}%`,
                  left: `${15 + Math.random() * 70}%`,
                  animation: `sparkle-out 0.8s ${i * 0.06}s ease-out both`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Hook ─────────────────────────────────────────────────────────

export function useConfirmAction() {
  const [config, setConfig] = useState<ConfirmActionConfig | null>(null)

  const confirmAction = useCallback((cfg: ConfirmActionConfig) => {
    h.impact()
    setConfig(cfg)
  }, [])

  const close = useCallback(() => setConfig(null), [])

  return { config, confirmAction, close, ConfirmActionModal: <ConfirmAction config={config} onClose={close} /> }
}
