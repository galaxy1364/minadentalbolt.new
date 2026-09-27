import type { CSSProperties } from 'react'
import { Award, Banknote, CalendarDays, ClipboardPlus, Clock3, CreditCard, FileHeart, FlaskConical, HeartPulse, Plus, Stethoscope } from 'lucide-react'

export function ImplantIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M5.5 3.8c1.8-1.5 3.8-.7 6.5-.7s4.7-.8 6.5.7c2.4 2.2 1.1 6.1-.8 8.5-.9 1.2-1.6 1.1-2.3-.3l-1.1-2.3c-.9-1.7-3.7-1.7-4.6 0L8.6 12c-.7 1.4-1.4 1.5-2.3.3-1.9-2.4-3.2-6.3-.8-8.5Z"/>
    <path d="M9.5 13h5M9.5 15h5M10 17h4M10.5 19h3M11.5 21h1"/>
  </svg>
}

export const patientConcepts = {
  directory: { icon: FileHeart, rgb: '13, 148, 136', color: 'text-teal-700 dark:text-teal-300' },
  debt: { icon: Banknote, rgb: '225, 29, 72', color: 'text-rose-700 dark:text-rose-300' },
  plans: { icon: CreditCard, rgb: '217, 119, 6', color: 'text-amber-800 dark:text-amber-300' },
  implants: { icon: ImplantIcon, rgb: '79, 70, 229', color: 'text-indigo-700 dark:text-indigo-300' },
  lab: { icon: FlaskConical, rgb: '8, 145, 178', color: 'text-cyan-700 dark:text-cyan-300' },
  appointments: { icon: CalendarDays, rgb: '37, 99, 235', color: 'text-blue-700 dark:text-blue-300' },
  vip: { icon: Award, rgb: '180, 83, 9', color: 'text-amber-800 dark:text-amber-300' },
  intake: { icon: ClipboardPlus, rgb: '5, 150, 105', color: 'text-emerald-700 dark:text-emerald-300' },
  recall: { icon: Clock3, rgb: '147, 51, 234', color: 'text-purple-700 dark:text-purple-300' },
  clinical: { icon: Stethoscope, rgb: '5, 150, 105', color: 'text-emerald-700 dark:text-emerald-300' },
  perio: { icon: HeartPulse, rgb: '225, 29, 72', color: 'text-rose-700 dark:text-rose-300' },
  create: { icon: Plus, rgb: '5, 150, 105', color: 'text-emerald-700 dark:text-emerald-300' },
} as const

export type PatientConcept = keyof typeof patientConcepts
export function conceptStyle(concept: PatientConcept): CSSProperties {
  return { '--tile-rgb': patientConcepts[concept].rgb } as CSSProperties
}
/** Stable, curated record tints; never depend on list ordering or session state. */
const recordPalette = ['79, 70, 229', '8, 145, 178', '180, 83, 9', '147, 51, 234', '5, 150, 105', '190, 61, 106', '37, 99, 235'] as const
export function patientRecordStyle(id: string): CSSProperties {
  let hash = 0
  for (const char of id) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0
  return { '--tile-rgb': recordPalette[(hash >>> 0) % recordPalette.length] } as CSSProperties
}