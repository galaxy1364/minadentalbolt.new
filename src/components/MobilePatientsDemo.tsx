import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, Phone, MessageSquare, Calendar, ChevronLeft,
  ChevronRight, Filter, Eye, EyeOff, FileText, Sparkles, Check, AlertCircle,
  X, CreditCard, Users, Banknote, FlaskConical, Clock, ShieldAlert,
  ArrowRight, HeartHandshake, PhoneCall
} from 'lucide-react'
import { toPersianDigits, formatCurrency } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { usePrivacyMode } from '../lib/privacyMask'
import { Patient, Treatment, Payment, ImplantCase, Cheque } from '../types'

interface MobilePatientsDemoProps {
  patients: Patient[]
  patientFinances: Map<string, { balance: number; paid: number; totalCost: number }>
  patientChequesMap: Map<string, number>
  patientPlansMap: Map<string, number>
  patientImplantsMap: Map<string, number>
  onOpenCreate: () => void
  onOpenEdit: (p: Patient) => void
}

type FullScreenView = 'none' | 'directory' | 'debtors' | 'plans' | 'implants' | 'lab' | 'vip' | 'recall'

export function MobilePatientsDemo({
  patients,
  patientFinances,
  patientChequesMap,
  patientPlansMap,
  patientImplantsMap,
  onOpenCreate,
  onOpenEdit,
}: MobilePatientsDemoProps) {
  const navigate = useNavigate()
  const { privacyMode, togglePrivacyMode, maskPhoneNumber } = usePrivacyMode()

  // Full-screen drilldown state
  const [activeFullScreen, setActiveFullScreen] = useState<FullScreenView>('none')
  const [searchQuery, setSearchQuery] = useState('')

  // Aggregated clinic metrics
  const metrics = useMemo(() => {
    let totalDebt = 0
    let debtorsCount = 0
    let vipCount = 0
    let withPlansCount = 0
    let withChequesCount = 0
    let withImplantsCount = 0

    for (const p of patients) {
      if (!p.is_active) continue
      const fin = patientFinances.get(p.id)
      if (fin && fin.balance > 0) {
        totalDebt += fin.balance
        debtorsCount++
      }
      if ((p.vip_level ?? 0) > 0) vipCount++
      if ((patientPlansMap.get(p.id) || 0) > 0) withPlansCount++
      if ((patientChequesMap.get(p.id) || 0) > 0) withChequesCount++
      if ((patientImplantsMap.get(p.id) || 0) > 0) withImplantsCount++
    }

    return {
      totalPatients: patients.filter((p) => p.is_active).length,
      debtorsCount,
      totalDebt,
      vipCount,
      withPlansCount,
      withChequesCount,
      withImplantsCount,
    }
  }, [patients, patientFinances, patientPlansMap, patientChequesMap, patientImplantsMap])

  // Filtered patients for active drill-down
  const activeList = useMemo(() => {
    let list = patients.filter((p) => p.is_active)

    if (activeFullScreen === 'debtors') {
      list = list.filter((p) => (patientFinances.get(p.id)?.balance || 0) > 0)
    } else if (activeFullScreen === 'plans') {
      list = list.filter((p) => (patientPlansMap.get(p.id) || 0) > 0 || (patientChequesMap.get(p.id) || 0) > 0)
    } else if (activeFullScreen === 'implants') {
      list = list.filter((p) => (patientImplantsMap.get(p.id) || 0) > 0)
    } else if (activeFullScreen === 'vip') {
      list = list.filter((p) => (p.vip_level ?? 0) > 0)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((p) => {
        const name = `${p.first_name} ${p.last_name}`.toLowerCase()
        const phone = (p.phone || '').toLowerCase()
        const file = (p.file_number || '').toLowerCase()
        const nid = (p.national_id || '').toLowerCase()
        return name.includes(q) || phone.includes(q) || file.includes(q) || nid.includes(q)
      })
    }

    return list
  }, [patients, activeFullScreen, searchQuery, patientFinances, patientPlansMap, patientChequesMap, patientImplantsMap])

  // 4-Card Hub Grid definitions (High data density, low margins, iOS 27 Liquid Glass)
  const hubCards = [
    {
      id: 'directory' as FullScreenView,
      title: 'پرونده بیماران',
      badge: `${toPersianDigits(metrics.totalPatients)} نفر`,
      sub: 'جستجوی هوشمند و بیوگرافی',
      gradient: 'from-teal-600 to-emerald-600',
      bgLight: 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200/70 dark:border-teal-800/40 text-teal-900 dark:text-teal-200',
      icon: <Users size={22} className="text-teal-600 dark:text-teal-400" />,
      accentColor: 'text-teal-700 dark:text-teal-300',
    },
    {
      id: 'debtors' as FullScreenView,
      title: 'بدهکاران مالی',
      badge: `${toPersianDigits(metrics.debtorsCount)} بدهکار`,
      sub: `${formatCurrency(metrics.totalDebt)} ت`,
      gradient: 'from-rose-600 to-red-600',
      bgLight: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-800/40 text-rose-900 dark:text-rose-200',
      icon: <AlertCircle size={22} className="text-rose-600 dark:text-rose-400" />,
      accentColor: 'text-rose-700 dark:text-rose-300',
    },
    {
      id: 'plans' as FullScreenView,
      title: 'اقساط و چک صیاد',
      badge: `${toPersianDigits(metrics.withPlansCount + metrics.withChequesCount)} مورد`,
      sub: 'کنترل وصولی و تعهدات',
      gradient: 'from-amber-600 to-orange-600',
      bgLight: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/40 text-amber-900 dark:text-amber-200',
      icon: <CreditCard size={22} className="text-amber-600 dark:text-amber-400" />,
      accentColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      id: 'implants' as FullScreenView,
      title: 'ایمپلنت و جراحی',
      badge: `${toPersianDigits(metrics.withImplantsCount)} پاسپورت`,
      sub: 'شناسنامه قطعات و جراحی',
      gradient: 'from-indigo-600 to-sky-600',
      bgLight: 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200',
      icon: <Sparkles size={22} className="text-indigo-600 dark:text-indigo-400" />,
      accentColor: 'text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'lab' as FullScreenView,
      title: 'کارهای لابراتوار',
      badge: 'روکش و پروتز',
      sub: 'ارسال، ساخت و تحویل',
      gradient: 'from-blue-600 to-cyan-600',
      bgLight: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-800/40 text-blue-900 dark:text-blue-200',
      icon: <FlaskConical size={22} className="text-blue-600 dark:text-blue-400" />,
      accentColor: 'text-blue-700 dark:text-blue-300',
    },
    {
      id: 'recall' as FullScreenView,
      title: 'پیگیری و ریکال',
      badge: 'مراقبت درمان',
      sub: 'کشیدن بخیه و چکاپ',
      gradient: 'from-purple-600 to-pink-600',
      bgLight: 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/70 dark:border-purple-800/40 text-purple-900 dark:text-purple-200',
      icon: <Clock size={22} className="text-purple-600 dark:text-purple-400" />,
      accentColor: 'text-purple-700 dark:text-purple-300',
    },
    {
      id: 'vip' as FullScreenView,
      title: 'بیماران ویژه VIP',
      badge: `${toPersianDigits(metrics.vipCount)} پرونده`,
      sub: 'طرح درمان‌های جامع',
      gradient: 'from-yellow-500 to-amber-600',
      bgLight: 'bg-yellow-50/70 dark:bg-yellow-950/30 border-yellow-200/70 dark:border-yellow-800/40 text-yellow-900 dark:text-yellow-200',
      icon: <ShieldAlert size={22} className="text-amber-500" />,
      accentColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      id: 'none' as FullScreenView,
      title: 'پذیرش بیمار جدید',
      badge: '+ پذیرش فوری',
      sub: 'ثبت بدون فوت وقت',
      gradient: 'from-emerald-600 to-teal-600',
      bgLight: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200',
      icon: <Plus size={22} className="text-emerald-600 dark:text-emerald-400" />,
      accentColor: 'text-emerald-700 dark:text-emerald-300',
      onClickCustom: () => { h.pop(); onOpenCreate() },
    },
  ]

  // Recent patients list for quick bottom bar
  const recentPatients = useMemo(() => {
    return patients.filter((p) => p.is_active).slice(0, 4)
  }, [patients])

  return (
    <div className="w-full flex flex-col space-y-2.5 pb-20 select-none">
      {/* ── TOP ESSENTIAL BAR: Compact Status + Search + Privacy (Zero Space Wasted) ── */}
      <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>مرکز جامع بیماران</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
              {toPersianDigits(metrics.totalPatients)}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Privacy Toggle */}
          <button
            onClick={() => { h.tap(); togglePrivacyMode() }}
            aria-label="ماسک حریم خصوصی"
            className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center border transition-all press-scale shadow-xs ${
              privacyMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-400 dark:bg-emerald-950/50'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {privacyMode ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>

          {/* Quick Create Patient button */}
          <button
            onClick={() => { h.pop(); onOpenCreate() }}
            className="flex items-center gap-1 px-3 min-h-[40px] rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-black shadow-xs press-scale"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>پذیرش</span>
          </button>
        </div>
      </div>

      {/* ── TOP ESSENTIAL HORIZONTAL DOCK-SCROLL CHIP RAIL (چپ و راست روان با ۱ لمس) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto dock-scroll no-scrollbar -mx-2 px-2 py-1">
        <button
          onClick={() => { h.select(); setActiveFullScreen('directory') }}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-teal-600 text-white text-xs font-bold shrink-0 press-scale shadow-xs"
        >
          <Search size={14} />
          <span>جستجوی پرونده</span>
        </button>

        <button
          onClick={() => { h.select(); setActiveFullScreen('debtors') }}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold shrink-0 press-scale shadow-xs"
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>بدهکاران ({toPersianDigits(metrics.debtorsCount)})</span>
        </button>

        <button
          onClick={() => {
            h.select()
            navigate('/appointments')
          }}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900 text-xs font-bold shrink-0 press-scale shadow-xs"
        >
          <Calendar size={14} />
          <span>نوبت‌های امروز</span>
        </button>

        <button
          onClick={() => { h.select(); setActiveFullScreen('plans') }}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-xs font-bold shrink-0 press-scale shadow-xs"
        >
          <CreditCard size={14} />
          <span>اقساط و چک</span>
        </button>

        <button
          onClick={() => { h.select(); setActiveFullScreen('implants') }}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 text-xs font-bold shrink-0 press-scale shadow-xs"
        >
          <Sparkles size={14} />
          <span>ایمپلنت‌ها</span>
        </button>

        <button
          onClick={() => { h.select(); setActiveFullScreen('vip') }}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 text-xs font-bold shrink-0 press-scale shadow-xs"
        >
          <span>⭐ VIP</span>
        </button>
      </div>

      {/* ── HIGH DENSITY 4-CARD / 2x4 APP LAUNCHER GRID (در نگاه اول بدون اسکرول) ── */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        {hubCards.map((card) => (
          <div
            key={card.title}
            onClick={() => {
              if (card.onClickCustom) {
                card.onClickCustom()
              } else {
                h.select()
                chimes.playPop()
                setActiveFullScreen(card.id)
              }
            }}
            className={`p-3 rounded-2xl border transition-all active:scale-[0.97] cursor-pointer flex flex-col justify-between min-h-[92px] shadow-xs hover:shadow-md ${card.bgLight}`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 shadow-2xs">
                {card.icon}
              </div>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/80 shadow-2xs ${card.accentColor}`}>
                {card.badge}
              </span>
            </div>

            <div className="mt-2 text-right">
              <h3 className="text-xs font-black leading-tight text-slate-900 dark:text-slate-100">
                {card.title}
              </h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5" dir="rtl">
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── RECENT / QUICK ACCESS PATIENTS (دسترسی فوری به آخرین مراجعین) ── */}
      <div className="pt-2">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-xs font-black text-slate-700 dark:text-slate-300">
            آخرین مراجعین فعال
          </span>
          <button
            onClick={() => { h.tap(); setActiveFullScreen('directory') }}
            className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-0.5"
          >
            <span>مشاهده همه</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="space-y-1.5">
          {recentPatients.map((patient) => {
            const fin = patientFinances.get(patient.id) || { balance: 0, paid: 0, totalCost: 0 }
            const isDebtor = fin.balance > 0

            return (
              <div
                key={patient.id}
                onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs active:scale-[0.985] cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {patient.first_name?.[0] || 'ب'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      #{toPersianDigits(patient.file_number || '')} · {privacyMode ? maskPhoneNumber(patient.phone || '') : toPersianDigits(patient.phone || '')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isDebtor ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                      {formatCurrency(fin.balance)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700">
                      تسویه
                    </span>
                  )}

                  {patient.phone && (
                    <a
                      href={`tel:${patient.phone}`}
                      onClick={() => { h.tap(); chimes.playPop() }}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center press-scale"
                    >
                      <Phone size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
                    className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center press-scale"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── FULL-SCREEN DRILLDOWN VIEW (فول‌اسکرین به سبک iOS 27 بدون اسکرول سردرگم) ── */}
      {activeFullScreen !== 'none' && (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-in fade-in slide-in-from-bottom duration-250">
          {/* Fullscreen Sticky Header */}
          <div className="px-3.5 pt-safe pb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={() => { h.cancel(); chimes.playPop(); setActiveFullScreen('none') }}
              className="flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-black text-xs press-scale"
            >
              <ChevronRight size={18} />
              <span>بازگشت به مرکز</span>
            </button>

            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              {activeFullScreen === 'directory' && 'فهرست پرونده‌های بیماران'}
              {activeFullScreen === 'debtors' && 'لیست بدهکاران کلینیک'}
              {activeFullScreen === 'plans' && 'چک‌ها و تعهدات اقساطی'}
              {activeFullScreen === 'implants' && 'شناسنامه و پرونده‌های ایمپلنت'}
              {activeFullScreen === 'vip' && 'بیماران ویژه VIP'}
              {activeFullScreen === 'lab' && 'سفارش‌های پروتز و لابراتوار'}
              {activeFullScreen === 'recall' && 'پیگیری‌های پس از درمان'}
            </h3>

            <span className="text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              {toPersianDigits(activeList.length)}
            </span>
          </div>

          {/* Fullscreen Live Search Box */}
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div className="relative">
              <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام بیمار، کدملی، شماره پرونده یا تلفن..."
                className="w-full h-11 pr-11 pl-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Fullscreen Scrollable Content List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {activeList.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-slate-500">موردی یافت نشد</p>
              </div>
            ) : (
              activeList.map((p) => {
                const fin = patientFinances.get(p.id) || { balance: 0, paid: 0, totalCost: 0 }
                const isDebtor = fin.balance > 0

                return (
                  <div
                    key={p.id}
                    onClick={() => { h.tap(); navigate(`/patients/${p.id}`) }}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col space-y-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center">
                          {p.first_name?.[0] || 'ب'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            پرونده #{toPersianDigits(p.file_number || '')} · {privacyMode ? maskPhoneNumber(p.phone || '') : toPersianDigits(p.phone || '')}
                          </p>
                        </div>
                      </div>

                      {isDebtor ? (
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                          بدهی: {formatCurrency(fin.balance)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700">
                          تسویه
                        </span>
                      )}
                    </div>

                    {/* Quick Sterile Touch Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {p.phone && (
                          <>
                            <a
                              href={`tel:${p.phone}`}
                              onClick={() => { h.tap(); chimes.playPop() }}
                              className="px-3 min-h-[38px] rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 text-xs font-bold"
                            >
                              <Phone size={14} />
                              <span>تماس</span>
                            </a>
                            <a
                              href={`sms:${p.phone}`}
                              onClick={() => { h.tap(); chimes.playPop() }}
                              className="px-3 min-h-[38px] rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1 text-xs font-bold"
                            >
                              <MessageSquare size={14} />
                              <span>پیامک</span>
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => {
                            h.tap()
                            navigate('/appointments', {
                              state: { quickStartPatientId: p.id, quickStartDoctorId: p.primary_doctor_id, openWizard: true }
                            })
                          }}
                          className="px-3 min-h-[38px] rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 text-xs font-bold"
                        >
                          <Calendar size={14} />
                          <span>+ نوبت</span>
                        </button>
                      </div>

                      <button
                        onClick={() => { h.tap(); navigate(`/patients/${p.id}`) }}
                        className="px-3 min-h-[38px] rounded-xl bg-slate-900 text-white flex items-center gap-1 text-xs font-bold"
                      >
                        <span>پرونده</span>
                        <ChevronLeft size={15} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
