export type TileColor = 'violet' | 'lime' | 'teal' | 'sky' | 'pink' | 'amber' | 'indigo' | 'emerald' | 'rose'

export interface TileThemeDefinition {
  bg: string
  blob: string
  iconBg: string
  gradient: [string, string]
  solidColor: string
  text: string
  sparkColor: string
  ring: string
  border: string
  capsuleBg: string
  capsuleBorder: string
  capsuleText: string
  accentColor: string
}

export const tileThemes: Record<TileColor, TileThemeDefinition> = {
  violet: {
    bg: 'from-violet-50/70 via-white/80 to-purple-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-violet-950/40',
    blob: 'from-violet-400/50 via-purple-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    gradient: ['#a78bfa', '#9333ea'],
    solidColor: '#8b5cf6',
    text: 'text-violet-700 dark:text-violet-300',
    sparkColor: '#8b5cf6',
    capsuleBg: 'bg-violet-50 dark:bg-violet-950/60',
    capsuleBorder: 'border-violet-200 dark:border-violet-800',
    capsuleText: 'text-violet-800 dark:text-violet-200',
    accentColor: '#8b5cf6',
    border: 'border-violet-200/80 dark:border-violet-900/50',
    ring: 'focus:ring-violet-400',
  },
  lime: {
    bg: 'from-lime-50/70 via-white/80 to-emerald-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-lime-950/40',
    blob: 'from-lime-400/50 via-emerald-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-lime-500 to-green-600',
    gradient: ['#a3e635', '#16a34a'],
    solidColor: '#84cc16',
    text: 'text-lime-700 dark:text-lime-300',
    sparkColor: '#84cc16',
    capsuleBg: 'bg-lime-50 dark:bg-lime-950/60',
    capsuleBorder: 'border-lime-200 dark:border-lime-800',
    capsuleText: 'text-lime-800 dark:text-lime-200',
    accentColor: '#84cc16',
    border: 'border-lime-200/80 dark:border-lime-900/50',
    ring: 'focus:ring-lime-400',
  },
  teal: {
    bg: 'from-teal-50/70 via-white/80 to-emerald-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-teal-950/40',
    blob: 'from-teal-400/50 via-emerald-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600',
    gradient: ['#2dd4bf', '#0d9488'],
    solidColor: '#0d9488',
    text: 'text-teal-700 dark:text-teal-300',
    sparkColor: '#0d9488',
    capsuleBg: 'bg-teal-50 dark:bg-teal-950/60',
    capsuleBorder: 'border-teal-200 dark:border-teal-800',
    capsuleText: 'text-teal-800 dark:text-teal-200',
    accentColor: '#0d9488',
    border: 'border-teal-200/80 dark:border-teal-900/50',
    ring: 'focus:ring-teal-400',
  },
  sky: {
    bg: 'from-sky-50/70 via-white/80 to-blue-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-sky-950/40',
    blob: 'from-sky-400/50 via-blue-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',
    gradient: ['#38bdf8', '#2563eb'],
    solidColor: '#0ea5e9',
    text: 'text-sky-700 dark:text-sky-300',
    sparkColor: '#0ea5e9',
    capsuleBg: 'bg-sky-50 dark:bg-sky-950/60',
    capsuleBorder: 'border-sky-200 dark:border-sky-800',
    capsuleText: 'text-sky-800 dark:text-sky-200',
    accentColor: '#0284c7',
    border: 'border-sky-200/80 dark:border-sky-900/50',
    ring: 'focus:ring-sky-400',
  },
  pink: {
    bg: 'from-pink-50/70 via-white/80 to-fuchsia-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-pink-950/40',
    blob: 'from-pink-400/50 via-fuchsia-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-pink-500 to-fuchsia-600',
    gradient: ['#f472b6', '#c026d3'],
    solidColor: '#ec4899',
    text: 'text-pink-700 dark:text-pink-300',
    sparkColor: '#ec4899',
    capsuleBg: 'bg-pink-50 dark:bg-pink-950/60',
    capsuleBorder: 'border-pink-200 dark:border-pink-800',
    capsuleText: 'text-pink-800 dark:text-pink-200',
    accentColor: '#db2777',
    border: 'border-pink-200/80 dark:border-pink-900/50',
    ring: 'focus:ring-pink-400',
  },
  amber: {
    bg: 'from-amber-50/70 via-white/80 to-orange-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-amber-950/40',
    blob: 'from-amber-400/50 via-orange-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    gradient: ['#fbbf24', '#ea580c'],
    solidColor: '#f59e0b',
    text: 'text-amber-700 dark:text-amber-300',
    sparkColor: '#f59e0b',
    capsuleBg: 'bg-amber-50 dark:bg-amber-950/60',
    capsuleBorder: 'border-amber-200 dark:border-amber-800',
    capsuleText: 'text-amber-800 dark:text-amber-200',
    accentColor: '#d97706',
    border: 'border-amber-200/80 dark:border-amber-900/50',
    ring: 'focus:ring-amber-400',
  },
  indigo: {
    bg: 'from-indigo-50/70 via-white/80 to-slate-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40',
    blob: 'from-indigo-400/50 via-blue-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    gradient: ['#818cf8', '#4338ca'],
    solidColor: '#4f46e5',
    text: 'text-indigo-700 dark:text-indigo-300',
    sparkColor: '#4f46e5',
    capsuleBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    capsuleBorder: 'border-indigo-200 dark:border-indigo-800',
    capsuleText: 'text-indigo-800 dark:text-indigo-200',
    accentColor: '#4f46e5',
    border: 'border-indigo-200/80 dark:border-indigo-900/50',
    ring: 'focus:ring-indigo-400',
  },
  emerald: {
    bg: 'from-emerald-50/70 via-white/80 to-green-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/40',
    blob: 'from-emerald-400/50 via-green-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
    gradient: ['#34d399', '#059669'],
    solidColor: '#059669',
    text: 'text-emerald-700 dark:text-emerald-300',
    sparkColor: '#059669',
    capsuleBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    capsuleBorder: 'border-emerald-200 dark:border-emerald-800',
    capsuleText: 'text-emerald-800 dark:text-emerald-200',
    accentColor: '#059669',
    border: 'border-emerald-200/80 dark:border-emerald-900/50',
    ring: 'focus:ring-emerald-400',
  },
  rose: {
    bg: 'from-rose-50/70 via-white/80 to-red-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-rose-950/40',
    blob: 'from-rose-400/50 via-pink-400/40 to-transparent',
    iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',
    gradient: ['#fb7185', '#dc2626'],
    solidColor: '#f43f5e',
    text: 'text-rose-700 dark:text-rose-300',
    sparkColor: '#f43f5e',
    capsuleBg: 'bg-rose-50 dark:bg-rose-950/60',
    capsuleBorder: 'border-rose-200 dark:border-rose-800',
    capsuleText: 'text-rose-800 dark:text-rose-200',
    accentColor: '#e11d48',
    border: 'border-rose-200/80 dark:border-rose-900/50',
    ring: 'focus:ring-rose-400',
  },
}

const tileColorsList: TileColor[] = ['violet', 'teal', 'sky', 'pink', 'amber', 'indigo', 'emerald', 'rose']

export function getHashColor(str: string): TileColor {
  if (!str) return 'teal'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return tileColorsList[Math.abs(hash) % tileColorsList.length]
}
