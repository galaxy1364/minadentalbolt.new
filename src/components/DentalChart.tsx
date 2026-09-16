// DentalChart.tsx — Professional interactive dental chart with SVG tooth shapes
// Supports: FDI numbering, surfaces, conditions, treatment history, primary teeth
import { useState, useMemo, useEffect, useRef } from 'react'
import { conditionMeta, deriveToothConditions } from '../lib/toothConditions'
import type { ToothCondition, ToothSurface, ToothSurfaceCondition } from '../lib/toothConditions'
// MOD-FEAT-024: the tooth drawing now lives in its own file so every
// tooth-selection surface can use the same picture.
import { ToothGlyph as ToothSVG } from './ToothGlyph'
import { toothLabel } from '../lib/toothLabel'
import { createPortal } from 'react-dom'
import { Smile, Plus, Activity, AlertCircle, Clock, Grid3x3, Sparkles, Image as ImageIcon, Mic, MicOff } from 'lucide-react'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { ToothRecord, Treatment, RadiologyImage } from '../types'
import { matchesRadiologyTooth } from '../lib/radiologyExport'
import { toPersianDigits, toJalaliStringPretty } from '../lib/persianDate'
import { toothShape, hasRootFilling, hasCrownCap, toothKind, isUpperTooth, toothVisualLabel } from '../lib/toothVisual'
import { surfaceSectors, centreLetter } from '../lib/surfaceGlyph'
import { parseDentalVoiceExam } from '../lib/persianClinicNlp'
import { Badge, showToast } from './ui'

// ── Types ─────────────────────────────────────────────────────

interface ToothData {
  number: number
  condition: ToothCondition
  surfaces: ToothSurfaceCondition[]
  notes?: string
  record?: ToothRecord
  treatments: Treatment[]
  /** True when this tooth's condition comes from treatment(s) that are
   * still 'planned'/'in_progress' — none of them actually completed
   * yet. Lets the chart show real progress (upcoming work looks
   * different from finished work) instead of coloring a not-yet-done
   * treatment identically to a completed one. */
  isPlannedOnly?: boolean
  /** Number of radiology images/photographs attached to this tooth */
  radiologyCount?: number
}

// ── Constants ─────────────────────────────────────────────────
const upperRight = [18, 17, 16, 15, 14, 13, 12, 11]
const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28]
const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38]
const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41]

// Palmer notation: each quadrant uses 1-8, displayed with quadrant symbols
// Upper Right ┘, Upper Left └, Lower Left ┐, Lower Right ┌
const palmerUpperRight = [8, 7, 6, 5, 4, 3, 2, 1]
const palmerUpperLeft = [1, 2, 3, 4, 5, 6, 7, 8]
const palmerLowerLeft = [1, 2, 3, 4, 5, 6, 7, 8]
const palmerLowerRight = [8, 7, 6, 5, 4, 3, 2, 1]

const palmerPrimaryUpperRight = ['E', 'D', 'C', 'B', 'A']
const palmerPrimaryUpperLeft = ['A', 'B', 'C', 'D', 'E']
const palmerPrimaryLowerLeft = ['A', 'B', 'C', 'D', 'E']
const palmerPrimaryLowerRight = ['E', 'D', 'C', 'B', 'A']

const palmerSymbols: Record<string, string> = {
  upperRight: '┘', upperLeft: '└', lowerRight: '┐', lowerLeft: '┌',
  primaryUpperRight: '┘', primaryUpperLeft: '└', primaryLowerRight: '┐', primaryLowerLeft: '┌',
}

// Convert FDI number to Palmer display string
function fdiToPalmer(fdi: number): string {
  const quad = Math.floor(fdi / 10)
  const num = fdi % 10
  if (fdi >= 51 && fdi <= 85) {
    // Primary teeth: FDI 51-55=UR, 61-65=UL, 71-75=LL, 81-85=LR
    const primaryMap: Record<number, string> = {
      51: 'A', 52: 'B', 53: 'C', 54: 'D', 55: 'E',
      61: 'A', 62: 'B', 63: 'C', 64: 'D', 65: 'E',
      71: 'A', 72: 'B', 73: 'C', 74: 'D', 75: 'E',
      81: 'A', 82: 'B', 83: 'C', 84: 'D', 85: 'E',
    }
    return primaryMap[fdi] || String(num)
  }
  return String(num)
}

const primaryUpperRight = [55, 54, 53, 52, 51]
const primaryUpperLeft = [61, 62, 63, 64, 65]
const primaryLowerLeft = [71, 72, 73, 74, 75]
const primaryLowerRight = [85, 84, 83, 82, 81]

/** `dot` is a Tailwind class for the legend; `dotHex` is the same colour
 * as a literal, because SVG fill cannot take a class. Kept in one table
 * so the glyph and the legend can never disagree about what a colour
 * means. */

const surfaceLabels: Record<ToothSurface, string> = {
  occlusal: 'اکلوزال (جونده)',
  mesial: 'مزیال',
  distal: 'دیستال',
  buccal: 'باکال (بیرونی)',
  lingual: 'لینگوال (داخلی)',
}

const conditionOptions: { value: ToothCondition; label: string }[] = [
  { value: 'healthy', label: 'سالم' },
  { value: 'caries', label: 'پوسیدگی' },
  { value: 'restored', label: 'ترمیم شده' },
  { value: 'rct', label: 'عصب‌کشی' },
  { value: 'post', label: 'پست' },
  { value: 'pin', label: 'پین' },
  { value: 'crown', label: 'روکش' },
  { value: 'implant', label: 'ایمپلنت' },
  { value: 'extraction', label: 'کشیده شده' },
  { value: 'missing', label: 'مفقود' },
  { value: 'bridge', label: 'بریج' },
  { value: 'veneer', label: 'ونیر' },
  { value: 'sealant', label: 'سیلنت' },
]

// ── SVG Tooth Component ──────────────────────────────────────

// ── Tooth Detail Panel ────────────────────────────────────────
function ToothDetailPanel({
  tooth,
  onClose,
  onUpdate,
  onAddTreatment,
  onAddLabOrder,
  onAddImplantCase,
  onViewRadiology,
}: {
  tooth: ToothData
  onClose: () => void
  onUpdate: (condition: ToothCondition, surfaceConditions: ToothSurfaceCondition[], notes: string) => void
  onAddTreatment?: (toothNumber: string, surface?: string | null, condition?: ToothCondition) => void
  /** MOD-FEAT-022: the chart is the natural starting point for lab work
   *  and implants too, not only treatments. */
  onAddLabOrder?: (toothNumber: string, surface?: string | null, condition?: ToothCondition) => void
  onAddImplantCase?: (toothNumber: string, surface?: string | null, condition?: ToothCondition) => void
  onViewRadiology?: (toothNumber: string) => void
}) {
  const [condition, setCondition] = useState<ToothCondition>(tooth.condition)
  const [surfaceConditions, setSurfaceConditions] = useState<ToothSurfaceCondition[]>(tooth.surfaces)

  // MOD-FEAT-022: the first surface the user has actually marked as
  // something other than healthy. That is the surface they came here
  // about, and carrying it forward is what stops the next form asking
  // for it a second time.
  const firstSurface = surfaceConditions.find((sc) => sc.condition && sc.condition !== 'healthy')?.surface || null
  const [notes, setNotes] = useState(tooth.notes || '')
  const [activeSurface, setActiveSurface] = useState<ToothSurface | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const toggleSurfaceCondition = (surface: ToothSurface, cond: ToothCondition) => {
    setSurfaceConditions((prev) => {
      const existing = prev.find((s) => s.surface === surface)
      if (existing && existing.condition === cond) {
        return prev.filter((s) => s.surface !== surface)
      }
      if (existing) {
        return prev.map((s) => (s.surface === surface ? { ...s, condition: cond } : s))
      }
      return [...prev, { surface, condition: cond }]
    })
  }

  const getSurfaceCondition = (surface: ToothSurface): ToothCondition => {
    return surfaceConditions.find((s) => s.surface === surface)?.condition || 'healthy'
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Compact quadrant indicator — from a direct request with a
                handwritten diagram: instead of a generic icon, show which
                of the 4 real jaw quadrants this specific tooth sits in at
                a glance (matches the number shown right next to it), not
                the full 32-tooth chart. A text label rather than a
                spatial grid deliberately — a mirrored left/right grid
                risks being genuinely misread in a clinical context, and
                that's worse than not showing one at all. FDI numbering:
                first digit 1/2 = upper right/left, 3/4 = lower left/
                right; primary (baby) teeth 5/6/7/8 map the same way. */}
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex flex-col items-center justify-center px-1 text-center">
              <span className="text-[9px] font-bold text-primary-600 leading-tight">
                {(() => {
                  const q = Math.floor(tooth.number / 10)
                  const norm = q >= 5 ? q - 4 : q
                  return norm === 1 ? 'بالا راست' : norm === 2 ? 'بالا چپ' : norm === 3 ? 'پایین چپ' : 'پایین راست'
                })()}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">دندان {toothLabel(tooth.number)}</h3>
              <p className="text-xs text-slate-500">{conditionMeta[condition].label}</p>
            </div>
          </div>
          <button
            onClick={() => {
              h.tap()
              chimes.playPop()
              onClose()
            }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-all press-scale"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Tooth Visual */}
          <div className="flex justify-center py-2">
            <div className="bg-slate-50 rounded-2xl p-4">
              <ToothSVG number={tooth.number} condition={condition} surfaces={surfaceConditions} size={80} />
            </div>
          </div>

          {/* Overall Condition */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-2">وضعیت کلی دندان</h4>
            <div className="grid grid-cols-3 gap-2">
              {conditionOptions.map((opt) => {
                const meta = conditionMeta[opt.value]
                const isActive = condition === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      h.select()
                      chimes.playPop()
                      setCondition(opt.value)
                    }}
                    className={`min-h-[48px] flex items-center justify-center px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all-smooth press-scale ${
                      isActive ? `${meta.bg} ${meta.border} ${meta.color} scale-105` : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${meta.dot} ml-1`} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Surface Conditions — redesigned: previously every one of the
              5 surfaces repeated all 11 condition buttons (55 tiny
              buttons total), which is exactly the "گیج‌کننده" clutter
              reported. Now: tap a surface chip to select it (its current
              condition color shows right there), then one shared
              condition panel appears below for just that surface —
              collapses to 5 chips + up to 11 options shown only when
              actually needed, with a smooth expand/collapse instead of
              everything visible and competing for attention at once.
          {/* Surface Conditions — with fast clinical presets (O, MO, DO, MOD, B, L) */}
          {condition !== 'missing' && condition !== 'extraction' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  سطوح دندان — انتخاب تکی یا الگوهای بالینی سریع
                </h4>
                {surfaceConditions.some((s) => s.condition !== 'healthy') && (
                  <button
                    type="button"
                    onClick={() => {
                      h.tap()
                      setSurfaceConditions([])
                    }}
                    className="text-[11px] text-primary-600 hover:text-primary-700 font-bold"
                  >
                    پاکسازی همه سطوح
                  </button>
                )}
              </div>

              {/* Fast Clinical Presets (O, MO, DO, MOD, B, L) */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-r from-teal-50/70 via-white to-teal-50/70 dark:from-slate-800/80 dark:via-slate-850 dark:to-slate-800/80 border border-teal-200/70 dark:border-teal-800/50 space-y-2">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 block">
                  الگوهای سریع بالینی (تک‌کلیک):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'O (تک‌سطحی)', surfaces: ['occlusal'] as ToothSurface[], desc: 'اکلوزال' },
                    { label: 'MO (۲ سطحی)', surfaces: ['mesial', 'occlusal'] as ToothSurface[], desc: 'مزیو-اکلوزال' },
                    { label: 'DO (۲ سطحی)', surfaces: ['distal', 'occlusal'] as ToothSurface[], desc: 'دیستو-اکلوزال' },
                    { label: 'MOD (۳ سطحی)', surfaces: ['mesial', 'occlusal', 'distal'] as ToothSurface[], desc: 'مزیو-اکلوزو-دیستال' },
                    { label: 'B (طوق/باکال)', surfaces: ['buccal'] as ToothSurface[], desc: 'باکال' },
                    { label: 'L (لینگوال)', surfaces: ['lingual'] as ToothSurface[], desc: 'لینگوال' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        h.tap()
                        chimes.playPop()
                        setSurfaceConditions(preset.surfaces.map((s) => ({ surface: s, condition: 'caries' })))
                        showToast('info', `الگوی ${preset.label} به عنوان پوسیدگی ثبت شد.`)
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 border border-teal-300/80 dark:border-teal-700 shadow-2xs hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 transition-all press-scale"
                      title={preset.desc}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Quick 1-click batch actions on active surface set */}
                {surfaceConditions.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-teal-100 dark:border-teal-800/40">
                    <span className="text-[10px] text-slate-500">اعمال بر سطوح فعال:</span>
                    <button
                      type="button"
                      onClick={() => {
                        h.select()
                        chimes.playPop()
                        setSurfaceConditions((prev) => prev.map((s) => ({ ...s, condition: 'caries' })))
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold border border-rose-200"
                    >
                      پوسیدگی
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        h.select()
                        chimes.playSuccess()
                        setSurfaceConditions((prev) => prev.map((s) => ({ ...s, condition: 'restored' })))
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold border border-blue-200"
                    >
                      ترمیم کامپوزیت
                    </button>
                  </div>
                )}
              </div>

              {/* Individual Surface Buttons */}
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(surfaceLabels) as ToothSurface[]).map((surface) => {
                  const sc = getSurfaceCondition(surface)
                  const meta = conditionMeta[sc]
                  const isActive = activeSurface === surface
                  return (
                    <button
                      key={surface}
                      onClick={() => {
                        h.tap()
                        chimes.playPop()
                        setActiveSurface(isActive ? null : surface)
                      }}
                      className={`min-h-[48px] flex flex-col justify-center items-center gap-1 py-2 rounded-xl border-2 transition-all-smooth press-scale ${
                        isActive ? 'border-primary-400 bg-primary-50 scale-105' : `${meta.border} ${meta.bg}`
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
                      <span className="text-[10px] font-bold text-slate-600 leading-tight text-center">
                        {surfaceLabels[surface]}
                      </span>
                    </button>
                  )
                })}
              </div>

              {activeSurface && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 animate-scale-in">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    وضعیت سطح «{surfaceLabels[activeSurface]}»:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {conditionOptions
                      .filter((o) => o.value !== 'missing' && o.value !== 'extraction')
                      .map((opt) => {
                        const isSelected = getSurfaceCondition(activeSurface) === opt.value
                        const optMeta = conditionMeta[opt.value]
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              h.select()
                              chimes.playPop()
                              toggleSurfaceCondition(activeSurface, opt.value)
                              setActiveSurface(null)
                            }}
                            className={`min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all-smooth press-scale ${
                              isSelected
                                ? `${optMeta.bg} ${optMeta.border} ${optMeta.color}`
                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${optMeta.dot}`} />
                            {opt.label}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Treatment History */}
          {tooth.treatments.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                <Activity size={14} /> تاریخچه درمان
              </h4>
              <div className="space-y-2">
                {tooth.treatments.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <p className="text-sm text-slate-700">{t.procedure_name || t.description || 'درمان'}</p>
                      <p className="text-xs text-slate-400">{toJalaliStringPretty(t.created_at)}</p>
                    </div>
                    {t.total_price != null && (
                      <span className="text-xs font-bold text-slate-600">{toPersianDigits(t.total_price.toLocaleString('en-US'))} ت</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-2">یادداشت</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="یادداشت درباره این دندان..."
              className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Save */}
          <button
            onClick={() => {
              h.confirm()
              chimes.playSuccess()
              onUpdate(condition, surfaceConditions, notes)
            }}
            className="w-full py-3 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-all-smooth press-scale shadow-sm active:scale-95"
          >
            ذخیره تغییرات
          </button>

          {/* The surface the user just marked here, carried onward so the
              next form doesn't ask for it again. */}
          {/* MOD-FEAT-022: three doors out of a tooth, not one. Lab work
              and implants used to be reachable only by opening their own
              module and picking the same tooth again from a blank Palmer
              picker. The surface goes along too, so what was just recorded
              here isn't asked for a second time. */}
          {(onAddTreatment || onAddLabOrder || onAddImplantCase || onViewRadiology) && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                برای دندان {toothLabel(tooth.number)}:
              </p>
              {onAddTreatment && (
                <button
                  onClick={() => {
                    h.tap()
                    chimes.playPop()
                    onAddTreatment(String(tooth.number), firstSurface, condition)
                    onClose()
                  }}
                  className="w-full py-3 rounded-xl bg-accent-50 text-accent-700 font-medium text-sm hover:bg-accent-100 transition-all-smooth flex items-center justify-center gap-1.5 border border-accent-200 press-scale"
                >
                  <Plus size={16} /> افزودن درمان
                </button>
              )}
              {onAddLabOrder && (
                <button
                  onClick={() => {
                    h.tap()
                    chimes.playPop()
                    onAddLabOrder(String(tooth.number), firstSurface, condition)
                    onClose()
                  }}
                  className="w-full py-3 rounded-xl bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 transition-all-smooth flex items-center justify-center gap-1.5 border border-primary-200 press-scale"
                >
                  <Plus size={16} /> سفارش لابراتوار
                </button>
              )}
              {onAddImplantCase && (
                <button
                  onClick={() => {
                    h.tap()
                    chimes.playPop()
                    onAddImplantCase(String(tooth.number), firstSurface, condition)
                    onClose()
                  }}
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-all-smooth flex items-center justify-center gap-1.5 border border-slate-300 press-scale"
                >
                  <Plus size={16} /> مورد ایمپلنت
                </button>
              )}
              {onViewRadiology && (
                <button
                  onClick={() => {
                    h.tap()
                    chimes.playPop()
                    onViewRadiology(String(tooth.number))
                    onClose()
                  }}
                  className="w-full py-3 rounded-xl bg-sky-50 text-sky-700 font-medium text-sm hover:bg-sky-100 transition-all-smooth flex items-center justify-center gap-1.5 border border-sky-200 press-scale"
                >
                  <ImageIcon size={16} /> مشاهده تصاویر و رادیولوژی دندان
                  {tooth.radiologyCount ? ` (${toPersianDigits(tooth.radiologyCount)})` : ''}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main Component ────────────────────────────────────────────
interface DentalChartProps {
  toothRecords: ToothRecord[]
  treatments: Treatment[]
  onUpdateTooth: (toothNumber: string, data: { is_missing: boolean; is_implant: boolean; notes: string; condition?: string; surfaces?: string }) => void
  onAddTreatment?: (toothNumber: string, surface?: string | null, condition?: ToothCondition) => void
  /** MOD-FEAT-022: the chart is the natural starting point for lab work
   *  and implants too, not only treatments. */
  onAddLabOrder?: (toothNumber: string, surface?: string | null, condition?: ToothCondition) => void
  onAddImplantCase?: (toothNumber: string, surface?: string | null, condition?: ToothCondition) => void
  /** Fires every time a tooth gets clicked/selected on the chart — lets
   * the parent remember "the last tooth someone actually pointed at"
   * so the general '+ درمان جدید' button (not the per-tooth one, which
   * already carries the number correctly) can default to it too instead
   * of opening blank. Direct fix for "دندونی که تو ویزیت انتخاب کردیم
   * باید خودکار پر بشه" — marking a condition on a tooth should count
   * as "selecting" it for this purpose, not just clicking the dedicated
   * per-tooth treatment button. */
  onToothSelect?: (toothNumber: string) => void
  onViewRadiology?: (toothNumber: string) => void
  /** Optional list of patient radiology images to visually link to teeth */
  radiologyImages?: RadiologyImage[]
}

export default function DentalChart({
  toothRecords,
  treatments,
  onUpdateTooth,
  onAddTreatment,
  onAddLabOrder,
  onAddImplantCase,
  onToothSelect,
  onViewRadiology,
  radiologyImages = [],
}: DentalChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<ToothData | null>(null)
  const [showPrimary, setShowPrimary] = useState(false)
  const [jawView, setJawView] = useState<'all' | 'upper' | 'lower'>('all')
  const [chairsideMode, setChairsideMode] = useState(false)
  const [activeStamp, setActiveStamp] = useState<ToothCondition | null>('caries')

  // ── Hands-Free Clinical Voice Dictation ──────────────────────────
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [lastVoiceAction, setLastVoiceAction] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      showToast('info', 'قابلیت تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود (از مرورگر کروم استفاده نمایید)')
      return
    }

    try {
      const rec = new SpeechRecognition()
      rec.lang = 'fa-IR'
      rec.continuous = true
      rec.interimResults = false

      rec.onstart = () => {
        setIsListening(true)
        h.confirm()
        chimes.playPop()
        showToast('info', 'دیکته صوتی بالینی فعال شد (بگویید: دندان ۱۶ پوسیدگی)')
      }

      rec.onresult = (event: any) => {
        const lastIndex = event.results.length - 1
        const transcript = event.results[lastIndex][0]?.transcript || ''
        setVoiceTranscript(transcript)

        const parsed = parseDentalVoiceExam(transcript)
        if (parsed) {
          h.confirm()
          chimes.playSuccess()
          setLastVoiceAction(parsed.actionDescription)

          const toothData = getToothData(parsed.toothNumber)
          const surfaces = parsed.surface
            ? [{ surface: parsed.surface as ToothSurface, condition: parsed.condition as ToothCondition }]
            : toothData.surfaces

          onUpdateTooth(String(parsed.toothNumber), {
            is_missing: parsed.condition === 'missing' || parsed.condition === 'extraction',
            is_implant: parsed.condition === 'implant',
            condition: parsed.condition,
            notes: toothData.notes || '',
            surfaces: JSON.stringify(surfaces),
          })
          onToothSelect?.(String(parsed.toothNumber))
          showToast('success', `✓ ${parsed.actionDescription} با صدا ثبت شد`)
        } else {
          h.tap()
        }
      }

      rec.onerror = (err: any) => {
        console.warn('Speech recognition error:', err)
        if (err.error !== 'no-speech') {
          setIsListening(false)
        }
      }

      rec.onend = () => {
        if (recognitionRef.current) {
          try {
            rec.start()
          } catch {
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = rec
      rec.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setIsListening(false)
    }
  }

  const toggleVoiceDictation = () => {
    h.toggle()
    if (isListening) {
      stopListening()
      showToast('info', 'دیکته صوتی متوقف شد')
    } else {
      startListening()
    }
  }

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [])

  const handleToothClick = (data: ToothData, num: number) => {
    onToothSelect?.(String(num))
    if (chairsideMode && activeStamp) {
      h.select()
      chimes.playSuccess()
      onUpdateTooth(String(num), {
        is_missing: activeStamp === 'missing' || activeStamp === 'extraction',
        is_implant: activeStamp === 'implant',
        condition: activeStamp,
        notes: data.notes || '',
        surfaces: JSON.stringify(data.surfaces),
      })
      showToast('info', `دندان ${toothLabel(num)}: ${conditionMeta[activeStamp].label} ثبت شد`)
      return
    }
    h.tap()
    chimes.playPop()
    setSelectedTooth(data)
  }

  const allTeeth = useMemo(() => {
    const permanent = [...upperRight, ...upperLeft, ...lowerLeft, ...lowerRight]
    const primary = [...primaryUpperRight, ...primaryUpperLeft, ...primaryLowerLeft, ...primaryLowerRight]
    return showPrimary ? [...permanent, ...primary] : permanent
  }, [showPrimary])

  const toothConditionsMap = useMemo(() => {
    return deriveToothConditions(toothRecords, treatments)
  }, [toothRecords, treatments])

  const getToothData = (number: number): ToothData => {
    const record = toothRecords.find((r) => r.tooth_number === String(number))
    const toothTreatments = treatments.filter((t) => String(t.tooth_number) === String(number))

    const derived = toothConditionsMap[number]
    const condition: ToothCondition = derived?.condition ?? 'healthy'
    const savedSurfaces: ToothSurfaceCondition[] = derived?.surfaces ?? []

    // Only meaningful for conditions DERIVED from treatments (not a
    // manually-set record condition like missing/implant) — true when
    // every matching treatment is still planned/in_progress, i.e.
    // nothing for this tooth has actually been completed yet.
    const derivedFromTreatments = !record?.is_missing && !record?.is_implant && (!record?.condition || record.condition === 'healthy')
    const isPlannedOnly = derivedFromTreatments && toothTreatments.length > 0 && toothTreatments.every((t) => t.status !== 'completed')

    const radCount = radiologyImages.filter((img) => matchesRadiologyTooth(img.tooth_number, String(number))).length

    return {
      number,
      condition,
      surfaces: savedSurfaces,
      notes: record?.notes || '',
      record,
      treatments: toothTreatments,
      isPlannedOnly,
      radiologyCount: radCount,
    }
  }

  /**
   * Cycles one surface between healthy and the tooth's own condition.
   *
   * Writes through onUpdateTooth like every other edit rather than
   * opening a second save path — two routes to one destination is the
   * fault this project keeps being bitten by. A tooth still marked
   * healthy defaults the surface to caries, because that is what a
   * clinician is recording when they tap a surface during an exam.
   */
  const handleSurfaceToggle = (toothNumber: string, surface: ToothSurface) => {
    h.tap()
    chimes.playPop()
    const data = getToothData(Number(toothNumber))
    const existing = data.surfaces.find((x) => x.surface === surface)
    const target: ToothCondition = data.condition === 'healthy' ? 'caries' : data.condition

    const next = existing && existing.condition !== 'healthy'
      ? data.surfaces.filter((x) => x.surface !== surface)
      : [...data.surfaces.filter((x) => x.surface !== surface), { surface, condition: target }]

    onUpdateTooth(toothNumber, {
      is_missing: data.condition === 'missing' || data.condition === 'extraction',
      is_implant: data.condition === 'implant',
      notes: data.notes || '',
      // A surface can only be marked on a tooth that has a condition, so
      // marking the first one promotes the tooth itself out of healthy.
      condition: data.condition === 'healthy' && next.length > 0 ? target : data.condition,
      surfaces: JSON.stringify(next),
    })
  }

  const handleUpdate = (condition: ToothCondition, surfaces: ToothSurfaceCondition[], notes: string) => {
    if (!selectedTooth) return
    h.confirm()
    chimes.playSuccess()
    onUpdateTooth(String(selectedTooth.number), {
      is_missing: condition === 'missing' || condition === 'extraction',
      is_implant: condition === 'implant',
      notes,
      condition,
      surfaces: JSON.stringify(surfaces),
    })
    setSelectedTooth(null)
  }

  /**
   * MOD-FEAT-023: the label now comes from src/lib/toothLabel.ts.
   *
   * It used to be defined right here, inside the component, which meant
   * no other screen could reach it — so treatments, payments, lab orders
   * and receipts all printed the raw FDI number instead. The chart said
   * «UR1» and the payment said «دندان ۱۱» for the same tooth. Its own
   * test copied this function rather than importing it, which was the
   * clearest possible sign it was in the wrong file.
   */
  const getToothLabel = (fdiNumber: number): string => toothLabel(fdiNumber)

  /** COMP-103 — the five-surface target under each tooth.
   *
   * Recording a surface used to cost five taps: open the tooth, wait for
   * the panel, find the row, tap, close. An examination does not move at
   * that speed. One tap from the arch does.
   *
   * Only drawn for the selected tooth: sixteen of these across an arch
   * would be unreadable at phone width, and would make the teeth
   * themselves harder to see — which is the fault MOD-UI-006 just fixed. */
  const renderSurfaceGlyph = (num: number, data: ToothData) => {
    const sectors = surfaceSectors(num)
    const currentOf = (surface: ToothSurface): ToothCondition =>
      data.surfaces.find((x) => x.surface === surface)?.condition || 'healthy'

    return (
      <svg
        viewBox="0 0 24 24"
        className="w-9 h-9 mx-auto mt-0.5"
        role="group"
        aria-label={`انتخاب سطح دندان ${num}`}
      >
        {sectors.map((sec) => {
          const cond = currentOf(sec.surface)
          const marked = cond !== 'healthy'
          const letter = sec.surface === 'occlusal' ? centreLetter(num) : sec.letter
          return (
            <g key={sec.surface}>
              <path
                d={sec.d}
                fill={marked ? conditionMeta[cond].dotHex : '#ffffff'}
                stroke="#94a3b8"
                strokeWidth="0.6"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSurfaceToggle(String(num), sec.surface)
                }}
              >
                <title>{`${letter} — ${conditionMeta[cond].label}`}</title>
              </path>
              <text
                x={sec.labelX}
                y={sec.labelY}
                textAnchor="middle"
                fontSize="5"
                fontWeight="700"
                fill={marked ? '#ffffff' : '#94a3b8'}
                pointerEvents="none"
              >
                {letter}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  const glyphSize = jawView === 'all' ? 36 : 44

  const renderQuadrant = (teeth: number[]) => (
    <div className="flex items-center gap-0.5 relative shrink-0">
      {teeth.map((num) => {
        const data = getToothData(num)
        return (
          <div
            key={num}
            onClick={() => handleToothClick(data, num)}
            className={`relative rounded-lg p-0.5 cursor-pointer transition-all-smooth hover:bg-slate-100 shrink-0 press-scale ${selectedTooth?.number === num ? 'bg-primary-50 ring-2 ring-primary-300' : ''} ${data.isPlannedOnly ? 'opacity-60' : ''}`}
          >
            <ToothSVG
              number={num}
              condition={data.condition}
              surfaces={data.surfaces}
              size={glyphSize}
              selected={selectedTooth?.number === num}
            />
            {data.isPlannedOnly && (
              <span className="absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full bg-warning-400 border border-white flex items-center justify-center" title="برنامه‌ریزی‌شده — هنوز انجام نشده">
                <Clock size={8} className="text-white" />
              </span>
            )}
            {data.radiologyCount && data.radiologyCount > 0 ? (
              <span
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-sky-500 border border-white dark:border-slate-900 flex items-center justify-center shadow-xs"
                title={`${toPersianDigits(data.radiologyCount)} تصویر رادیولوژی`}
              >
                <ImageIcon size={8} className="text-white" />
              </span>
            ) : null}
            {selectedTooth?.number === num && renderSurfaceGlyph(num, data)}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Legend — maps over every key in conditionMeta rather than a
          hardcoded list, so a newly added condition (like پست/پین just
          now) can never again silently go missing here the way this
          list previously excluded them, along with bridge/veneer/sealant
          which had been missing from it long before that. */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {(Object.keys(conditionMeta) as ToothCondition[]).map((c) => {
          const meta = conditionMeta[c]
          return (
            <span key={c} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded ${meta.dot}`} />
              <span className="text-slate-600">{meta.label}</span>
            </span>
          )
        })}
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-warning-400 flex items-center justify-center"><Clock size={7} className="text-white" /></span>
          <span className="text-slate-600">برنامه‌ریزی‌شده (انجام‌نشده)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center"><ImageIcon size={8} className="text-white" /></span>
          <span className="text-slate-600">دارای تصویر رادیولوژی</span>
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-bold">
            <Grid3x3 size={13} /> نماد پالمر (Palmer)
          </div>

          {/* Segmented Jaw Switcher */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => {
                chimes.playPop()
                h.select()
                setJawView('all')
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all-smooth ${
                jawView === 'all'
                  ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 font-bold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              هر دو فک
            </button>
            <button
              type="button"
              aria-label="نمایش فقط فک بالا"
              onClick={() => {
                chimes.playPop()
                h.select()
                setJawView('upper')
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all-smooth ${
                jawView === 'upper'
                  ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 font-bold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              فک بالا
            </button>
            <button
              type="button"
              aria-label="نمایش فقط فک پایین"
              onClick={() => {
                chimes.playPop()
                h.select()
                setJawView('lower')
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all-smooth ${
                jawView === 'lower'
                  ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 font-bold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              فک پایین
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              h.toggle()
              chimes.playPop()
              setChairsideMode(!chairsideMode)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all press-scale border ${
              chairsideMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles size={14} className={chairsideMode ? 'animate-spin' : ''} />
            {chairsideMode ? '✓ حالت کنار یونیت فعال' : 'حالت کنار یونیت'}
          </button>

          <button
            type="button"
            onClick={toggleVoiceDictation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all press-scale border ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 shadow-md animate-pulse'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
            title="ثبت وضعیت دندان‌ها با گفتار بدون نیاز به لمس موس و کیبورد"
          >
            {isListening ? <MicOff size={14} className="text-white" /> : <Mic size={14} className="text-indigo-600 dark:text-indigo-400" />}
            {isListening ? 'در حال شنیدن دیکته صوتی...' : 'معاینه صوتی (هندزفری)'}
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showPrimary}
            onChange={(e) => {
              h.toggle()
              chimes.playPop()
              setShowPrimary(e.target.checked)
            }}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          نمایش دندان‌های شیری
        </label>
      </div>

      {/* Hands-Free Voice Dictation Live Banner */}
      {isListening && (
        <div className="p-3 bg-gradient-to-r from-rose-500/15 via-indigo-500/10 to-sky-500/15 dark:from-rose-950/40 dark:to-indigo-950/40 border-2 border-rose-400/60 rounded-2xl space-y-1.5 animate-scale-in">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span>دیکته صوتی بالینی فعال است — دستکش‌ها استریل بماند و با صدای رسا صحبت کنید:</span>
            </div>
            <button
              onClick={stopListening}
              className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 text-[11px] font-bold hover:bg-rose-200"
            >
              قطع میکروفون
            </button>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">الگوهای قابل تشخیص:</span>
            <code className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border text-[11px]">«دندان ۱۶ پوسیدگی دیستال»</code>
            <code className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border text-[11px]">«دندان ۴۶ عصب‌کشی»</code>
            <code className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border text-[11px]">«دندان ۳۸ کشیده شده»</code>
            <code className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border text-[11px]">«دندان ۲۱ سالم»</code>
          </div>
          {(voiceTranscript || lastVoiceAction) && (
            <div className="pt-1 flex items-center gap-2 text-xs">
              <span className="text-slate-500">آخرین دریافت:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 bg-white/70 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border">
                {voiceTranscript || '...'}
              </span>
              {lastVoiceAction && (
                <Badge color="success">
                  ✓ {lastVoiceAction}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chairside Quick Stamp Bar */}
      {chairsideMode && (
        <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500/50 rounded-2xl space-y-2 animate-scale-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              حالت ثبت سریع لمسی کنار یونیت (با ۱ لمس روی هر دندان، وضعیت انتخاب‌شده ثبت می‌شود):
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'healthy', label: 'سالم' },
              { value: 'caries', label: 'پوسیدگی' },
              { value: 'restored', label: 'ترمیم' },
              { value: 'rct', label: 'عصب‌کشی' },
              { value: 'crown', label: 'روکش' },
              { value: 'extraction', label: 'کشیده' },
              { value: 'implant', label: 'ایمپلنت' },
            ].map((stamp) => {
              const meta = conditionMeta[stamp.value as ToothCondition]
              const isCurrent = activeStamp === stamp.value
              return (
                <button
                  key={stamp.value}
                  type="button"
                  onClick={() => {
                    h.tap()
                    chimes.playPop()
                    setActiveStamp(stamp.value as ToothCondition)
                  }}
                  className={`min-h-[48px] flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all press-scale border ${
                    isCurrent
                      ? `${meta.bg} ${meta.color} ${meta.border} ring-2 ring-amber-500 shadow-sm`
                      : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                  {stamp.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Permanent Teeth Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6">
        {/* Upper Jaw */}
        {(jawView === 'all' || jawView === 'upper') && (
          <div className={jawView === 'all' ? 'mb-6' : ''}>
            <p className="text-xs text-slate-400 mb-3 text-center font-medium">فک بالا (ماکسیلاری)</p>
            <div dir="ltr" className="flex flex-col xl:flex-row items-center gap-4 xl:gap-1 px-1 py-1 justify-center overflow-x-auto dock-scroll">
              <div className="flex items-center gap-1">
                {renderQuadrant(upperRight)}
                <span className="text-2xl font-bold text-slate-400 select-none ml-2 xl:ml-0">{palmerSymbols.upperRight}</span>
              </div>
              <div className="hidden xl:block w-px h-12 bg-slate-200 mx-1" />
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-slate-400 select-none mr-2 xl:mr-0">{palmerSymbols.upperLeft}</span>
                {renderQuadrant(upperLeft)}
              </div>
            </div>
          </div>
        )}

        {/* Lower Jaw */}
        {(jawView === 'all' || jawView === 'lower') && (
          <div>
            <p className="text-xs text-slate-400 mb-3 text-center font-medium">فک پایین (ماندیبول)</p>
            <div dir="ltr" className="flex flex-col xl:flex-row items-center gap-4 xl:gap-1 px-1 py-1 justify-center overflow-x-auto dock-scroll">
              <div className="flex items-center gap-1">
                {renderQuadrant(lowerRight)}
                <span className="text-2xl font-bold text-slate-400 select-none ml-2 xl:ml-0">{palmerSymbols.lowerRight}</span>
              </div>
              <div className="hidden xl:block w-px h-12 bg-slate-200 mx-1" />
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-slate-400 select-none mr-2 xl:mr-0">{palmerSymbols.lowerLeft}</span>
                {renderQuadrant(lowerLeft)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Teeth Chart */}
      {showPrimary && (
        <div className="bg-amber-50/30 rounded-2xl border border-amber-100 p-4 md:p-6 space-y-4">
          <p className="text-xs text-amber-600 mb-3 text-center font-medium">دندان‌های شیری</p>
          {(jawView === 'all' || jawView === 'upper') && (
            <div className={jawView === 'all' ? 'mb-4' : ''}>
              <div dir="ltr" className="flex flex-col xl:flex-row items-center gap-4 xl:gap-1 px-1 py-1 justify-center overflow-x-auto dock-scroll">
                <div className="flex items-center gap-1">
                  {renderQuadrant(primaryUpperRight)}
                  <span className="text-xl font-bold text-amber-500 select-none ml-2 xl:ml-0">{palmerSymbols.primaryUpperRight}</span>
                </div>
                <div className="hidden xl:block w-px h-10 bg-amber-200 mx-1" />
                <div className="flex items-center gap-1">
                  <span className="text-xl font-bold text-amber-500 select-none mr-2 xl:mr-0">{palmerSymbols.primaryUpperLeft}</span>
                  {renderQuadrant(primaryUpperLeft)}
                </div>
              </div>
            </div>
          )}
          {(jawView === 'all' || jawView === 'lower') && (
            <div>
              <div dir="ltr" className="flex flex-col xl:flex-row items-center gap-4 xl:gap-1 px-1 py-1 justify-center overflow-x-auto dock-scroll">
                <div className="flex items-center gap-1">
                  {renderQuadrant(primaryLowerRight)}
                  <span className="text-xl font-bold text-amber-500 select-none ml-2 xl:ml-0">{palmerSymbols.primaryLowerRight}</span>
                </div>
                <div className="hidden xl:block w-px h-10 bg-amber-200 mx-1" />
                <div className="flex items-center gap-1">
                  <span className="text-xl font-bold text-amber-500 select-none mr-2 xl:mr-0">{palmerSymbols.primaryLowerLeft}</span>
                  {renderQuadrant(primaryLowerLeft)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['caries', 'rct', 'crown', 'implant'] as ToothCondition[]).map((c) => {
          const count = allTeeth.filter((n) => getToothData(n).condition === c).length
          const meta = conditionMeta[c]
          return (
            <div key={c} className={`p-3 rounded-xl ${meta.bg} border ${meta.border}`}>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${meta.dot}`} />
                <span className="text-xs text-slate-600">{meta.label}</span>
              </div>
              <p className={`text-xl font-bold ${meta.color} mt-1`}>{toPersianDigits(count)}</p>
            </div>
          )
        })}
      </div>

      {/* Tooth Detail Panel */}
      {selectedTooth && (
        <ToothDetailPanel
          tooth={selectedTooth}
          onClose={() => setSelectedTooth(null)}
          onUpdate={handleUpdate}
          onAddTreatment={onAddTreatment}
          onAddLabOrder={onAddLabOrder}
          onAddImplantCase={onAddImplantCase}
          onViewRadiology={onViewRadiology}
        />
      )}
    </div>
  )
}
