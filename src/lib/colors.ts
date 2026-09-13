export type TileColor = 'violet' | 'lime' | 'sky' | 'pink' | 'amber' | 'rose'

export const tileThemes: Record<TileColor, { bg: string; blob: string; iconBg: string; gradient: [string, string]; solidColor: string; text: string; sparkColor: string; ring: string; border: string }> = {
  violet: { bg: 'from-white to-violet-100 dark:from-slate-800 dark:to-violet-950/50', blob: 'from-violet-400/60 dark:from-violet-500/40', iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600', gradient: ['#a78bfa', '#9333ea'], solidColor: '#8b5cf6', text: 'text-violet-700 dark:text-violet-300', sparkColor: '#8b5cf6', ring: 'focus:ring-violet-300', border: 'border border-violet-100 dark:border-violet-900/50' },
  lime:   { bg: 'from-white to-lime-100 dark:from-slate-800 dark:to-lime-950/40',     blob: 'from-lime-400/60 dark:from-lime-500/35',     iconBg: 'bg-gradient-to-br from-lime-500 to-green-600',   gradient: ['#a3e635', '#16a34a'], solidColor: '#84cc16', text: 'text-lime-700 dark:text-lime-300',   sparkColor: '#84cc16', ring: 'focus:ring-lime-300', border: 'border border-lime-100 dark:border-lime-900/50' },
  sky:    { bg: 'from-white to-sky-100 dark:from-slate-800 dark:to-sky-950/50',       blob: 'from-sky-400/60 dark:from-sky-500/40',       iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600',     gradient: ['#38bdf8', '#2563eb'], solidColor: '#0ea5e9', text: 'text-sky-700 dark:text-sky-300',     sparkColor: '#0ea5e9', ring: 'focus:ring-sky-300', border: 'border border-sky-100 dark:border-sky-900/50' },
  pink:   { bg: 'from-white to-pink-100 dark:from-slate-800 dark:to-pink-950/50',     blob: 'from-pink-400/60 dark:from-pink-500/40',     iconBg: 'bg-gradient-to-br from-pink-500 to-fuchsia-600', gradient: ['#f472b6', '#c026d3'], solidColor: '#ec4899', text: 'text-pink-700 dark:text-pink-300',   sparkColor: '#ec4899', ring: 'focus:ring-pink-300', border: 'border border-pink-100 dark:border-pink-900/50' },
  amber:  { bg: 'from-white to-amber-100 dark:from-slate-800 dark:to-amber-950/50',   blob: 'from-amber-400/60 dark:from-amber-500/40',   iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600', gradient: ['#fbbf24', '#ea580c'], solidColor: '#f59e0b', text: 'text-amber-700 dark:text-amber-300', sparkColor: '#f59e0b', ring: 'focus:ring-amber-300', border: 'border border-amber-100 dark:border-amber-900/50' },
  rose:   { bg: 'from-white to-rose-100 dark:from-slate-800 dark:to-rose-950/50',     blob: 'from-rose-400/60 dark:from-rose-500/40',     iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',     gradient: ['#fb7185', '#dc2626'], solidColor: '#f43f5e', text: 'text-rose-700 dark:text-rose-300',   sparkColor: '#f43f5e', ring: 'focus:ring-rose-300', border: 'border border-rose-100 dark:border-rose-900/50' },
}

const tileColorsList: TileColor[] = ['violet', 'lime', 'sky', 'pink', 'amber', 'rose']

export function getHashColor(str: string): TileColor {
  if (!str) return 'sky'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return tileColorsList[Math.abs(hash) % tileColorsList.length]
}
