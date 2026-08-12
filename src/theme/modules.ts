import {
  Gauge, UserRound, CalendarClock, Stethoscope, Wallet, Microscope,
  Bone, ShieldCheck, Boxes, Pill, ScanLine, IdCard,
  PieChart, Hourglass, SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ModuleIdentity {
  path: string
  label: string
  icon: LucideIcon
  color: string
  colorLight: string
  colorDark: string
  gradient: [string, string]
}

export const modules: Record<string, ModuleIdentity> = {
  dashboard: {
    path: '/',
    label: 'داشبورد',
    icon: Gauge,
    color: '#0d9488',
    colorLight: '#f0fdfa',
    colorDark: '#134e4a',
    gradient: ['#14b8a6', '#0d9488'],
  },
  patients: {
    path: '/patients',
    label: 'بیماران',
    icon: UserRound,
    color: '#0284c7',
    colorLight: '#f0f9ff',
    colorDark: '#0c4a6e',
    gradient: ['#38bdf8', '#0284c7'],
  },
  appointments: {
    path: '/appointments',
    label: 'نوبت‌دهی',
    icon: CalendarClock,
    color: '#d97706',
    colorLight: '#fffbeb',
    colorDark: '#78350f',
    gradient: ['#fbbf24', '#d97706'],
  },
  treatments: {
    path: '/treatments',
    label: 'درمان',
    icon: Stethoscope,
    color: '#e11d48',
    colorLight: '#fff1f2',
    colorDark: '#881337',
    gradient: ['#fb7185', '#e11d48'],
  },
  billing: {
    path: '/billing',
    label: 'مالی',
    icon: Wallet,
    color: '#059669',
    colorLight: '#ecfdf5',
    colorDark: '#064e3b',
    gradient: ['#34d399', '#059669'],
  },
  laboratory: {
    path: '/laboratory',
    label: 'لابراتوار',
    icon: Microscope,
    color: '#0891b2',
    colorLight: '#ecfeff',
    colorDark: '#164e63',
    gradient: ['#22d3ee', '#0891b2'],
  },
  implants: {
    path: '/implants',
    label: 'ایمپلنت',
    icon: Bone,
    color: '#2563eb',
    colorLight: '#eff6ff',
    colorDark: '#1e3a8a',
    gradient: ['#60a5fa', '#2563eb'],
  },
  insurance: {
    path: '/insurance',
    label: 'بیمه',
    icon: ShieldCheck,
    color: '#16a34a',
    colorLight: '#f0fdf4',
    colorDark: '#14532d',
    gradient: ['#4ade80', '#16a34a'],
  },
  inventory: {
    path: '/inventory',
    label: 'انبار',
    icon: Boxes,
    color: '#ea580c',
    colorLight: '#fff7ed',
    colorDark: '#7c2d12',
    gradient: ['#fb923c', '#ea580c'],
  },
  prescriptions: {
    path: '/prescriptions',
    label: 'نسخه',
    icon: Pill,
    color: '#dc2626',
    colorLight: '#fef2f2',
    colorDark: '#7f1d1d',
    gradient: ['#f87171', '#dc2626'],
  },
  radiology: {
    path: '/radiology',
    label: 'رادیولوژی',
    icon: ScanLine,
    color: '#db2777',
    colorLight: '#fdf2f8',
    colorDark: '#831843',
    gradient: ['#f472b6', '#db2777'],
  },
  staff: {
    path: '/staff',
    label: 'پرسنل',
    icon: IdCard,
    color: '#65a30d',
    colorLight: '#f7fee7',
    colorDark: '#365314',
    gradient: ['#a3e635', '#65a30d'],
  },
  reports: {
    path: '/reports',
    label: 'گزارش‌ها',
    icon: PieChart,
    color: '#1d4ed8',
    colorLight: '#eff6ff',
    colorDark: '#1e3a8a',
    gradient: ['#3b82f6', '#1d4ed8'],
  },
  waitingList: {
    path: '/waiting-list',
    label: 'انتظار',
    icon: Hourglass,
    color: '#ca8a04',
    colorLight: '#fefce8',
    colorDark: '#713f12',
    gradient: ['#facc15', '#ca8a04'],
  },
  settings: {
    path: '/settings',
    label: 'تنظیمات',
    icon: SlidersHorizontal,
    color: '#475569',
    colorLight: '#f8fafc',
    colorDark: '#1e293b',
    gradient: ['#64748b', '#475569'],
  },
}

export const primaryModuleKeys = ['dashboard', 'patients', 'appointments', 'treatments', 'billing', 'laboratory']
export const secondaryModuleKeys = ['implants', 'insurance', 'inventory', 'prescriptions', 'radiology', 'staff', 'reports', 'waitingList', 'settings']

export const primaryModules = primaryModuleKeys.map(k => modules[k])
export const secondaryModules = secondaryModuleKeys.map(k => modules[k])
export const allModules = [...primaryModules, ...secondaryModules]

export function getModuleByPath(pathname: string): ModuleIdentity | undefined {
  if (pathname === '/') return modules.dashboard
  return allModules.find(m => pathname.startsWith(m.path))
}

export function setModuleTheme(mod: ModuleIdentity | undefined) {
  const root = document.documentElement
  if (!mod) { root.removeAttribute('data-module'); return }
  root.setAttribute('data-module', mod.path)
  root.style.setProperty('--module-color', mod.color)
  root.style.setProperty('--module-color-light', mod.colorLight)
  root.style.setProperty('--module-color-dark', mod.colorDark)
  root.style.setProperty('--module-gradient-from', mod.gradient[0])
  root.style.setProperty('--module-gradient-to', mod.gradient[1])
}
