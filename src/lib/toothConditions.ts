/**
 * MOD-FEAT-024 | واژگان مشترک وضعیت دندان
 *
 * These types and the colour map used to sit inside DentalChart.tsx.
 * Extracting the tooth drawing into its own component meant the drawing
 * would have had to import from the chart while the chart imports the
 * drawing — a cycle. Both belong here instead: they describe a tooth,
 * not a chart.
 *
 * The colour map stays a single object so the glyph, the legend and the
 * surface targets can never disagree about what a colour means.
 */

export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'restored'
  | 'rct'
  | 'post'
  | 'pin'
  | 'crown'
  | 'implant'
  | 'extraction'
  | 'missing'
  | 'bridge'
  | 'veneer'
  | 'sealant'

export type ToothSurface = 'occlusal' | 'mesial' | 'distal' | 'buccal' | 'lingual'

export interface ToothSurfaceCondition {
  surface: ToothSurface
  condition: ToothCondition
  treatmentId?: string
  date?: string
}

export const conditionMeta: Record<ToothCondition, { label: string; color: string; bg: string; border: string; dot: string; dotHex: string }> = {
  healthy: { label: 'سالم', color: 'text-slate-600', bg: 'bg-white', border: 'border-slate-200', dot: 'bg-slate-300', dotHex: '#cbd5e1' },
  caries: { label: 'پوسیدگی', color: 'text-error-700', bg: 'bg-error-50', border: 'border-error-300', dot: 'bg-error-500', dotHex: '#ef4444' },
  restored: { label: 'ترمیم شده', color: 'text-primary-700', bg: 'bg-primary-50', border: 'border-primary-300', dot: 'bg-primary-500', dotHex: '#0d9488' },
  rct: { label: 'عصب‌کشی', color: 'text-warning-700', bg: 'bg-warning-50', border: 'border-warning-400', dot: 'bg-warning-500', dotHex: '#f59e0b' },
  post: { label: 'پست', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400', dot: 'bg-orange-500', dotHex: '#f97316' },
  pin: { label: 'پین', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', dot: 'bg-orange-400', dotHex: '#fb923c' },
  crown: { label: 'روکش', color: 'text-accent-700', bg: 'bg-accent-50', border: 'border-accent-400', dot: 'bg-accent-500', dotHex: '#f97316' },
  implant: { label: 'ایمپلنت', color: 'text-secondary-700', bg: 'bg-secondary-50', border: 'border-secondary-400', dot: 'bg-secondary-500', dotHex: '#64748b' },
  extraction: { label: 'کشیده شده', color: 'text-slate-500', bg: 'bg-slate-200', border: 'border-slate-400', dot: 'bg-slate-500', dotHex: '#64748b' },
  missing: { label: 'مفقود', color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-300', dot: 'bg-slate-400', dotHex: '#94a3b8' },
  bridge: { label: 'بریج', color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-400', dot: 'bg-primary-400', dotHex: '#2dd4bf' },
  veneer: { label: 'ونیر', color: 'text-accent-600', bg: 'bg-accent-50', border: 'border-accent-300', dot: 'bg-accent-400', dotHex: '#fb923c' },
  sealant: { label: 'سیلنت', color: 'text-success-700', bg: 'bg-success-50', border: 'border-success-300', dot: 'bg-success-500', dotHex: '#22c55e' },
}
