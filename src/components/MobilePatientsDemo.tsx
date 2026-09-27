import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, Phone, MessageSquare, Calendar, ChevronLeft,
  ChevronRight, Filter, Eye, EyeOff, FileText, Sparkles, Check, AlertCircle,
  X, CreditCard, Users, Banknote, FlaskConical, Clock, ShieldAlert,
  ArrowRight, HeartHandshake, PhoneCall, FileSearch, Award
} from 'lucide-react'
import { toPersianDigits, formatCurrency } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { usePrivacyMode } from '../lib/privacyMask'
import { Patient, Treatment, Payment, Cheque, Installment, PaymentPlan, LabOrder } from '../types'
import { summariseCheques } from '../lib/chequeSummary'
import { planProgress } from '../lib/installments'
import { summariseLab } from '../lib/labShelf'
import { toothLabel } from '../lib/toothLabel'
import { patientConcepts, conceptStyle, patientRecordStyle, type PatientConcept } from './patientConcepts'

interface MobilePatientsDemoProps {
  patients: Patient[]
  patientFinances: Map<string, { balance: number; paid: number; totalCost: number }>
  patientChequesMap: Map<string, number>
  patientPlansMap: Map<string, number>
  patientImplantsMap: Map<string, number>
  patientLabOrdersMap: Map<string, number>
  cheques: Cheque[]
  installments: Installment[]
  paymentPlans: PaymentPlan[]
  labOrders: LabOrder[]
  treatments: Treatment[]
  payments: Payment[]
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
  patientLabOrdersMap,
  cheques,
  installments,
  paymentPlans,
  labOrders,
  treatments,
  payments,
  onOpenCreate,
  onOpenEdit,
}: MobilePatientsDemoProps) {
  const navigate = useNavigate()
  const { privacyMode, togglePrivacyMode, maskPhoneNumber } = usePrivacyMode()

  // Full-screen drilldown state
  const [activeFullScreen, setActiveFullScreen] = useState<FullScreenView>('none')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null)
  const todayISO = new Date().toISOString().slice(0, 10)

  const clinicalSummary = useMemo(() => {
    const map = new Map<string, {
      cheques: ReturnType<typeof summariseCheques>
      plan: ReturnType<typeof planProgress>
      lab: ReturnType<typeof summariseLab>
      items: Treatment[]
      receipts: Payment[]
    }>()
    const byPatient = <T extends { patient_id: string }>(items: T[]) => {
      const groups = new Map<string, T[]>()
      for (const item of items) groups.set(item.patient_id, [...(groups.get(item.patient_id) || []), item])
      return groups
    }
    const groupedCheques = byPatient(cheques)
    const groupedInstallments = byPatient(installments)
    const groupedLab = byPatient(labOrders)
    const groupedTreatments = byPatient(treatments)
    const groupedPayments = byPatient(payments)
    for (const p of patients) {
      const activePlanIds = new Set(paymentPlans.filter((plan) => plan.patient_id === p.id && plan.status === 'active').map((plan) => plan.id))
      map.set(p.id, {
        cheques: summariseCheques(groupedCheques.get(p.id) || [], p.id),
        plan: planProgress((groupedInstallments.get(p.id) || []).filter((inst) => activePlanIds.has(inst.payment_plan_id)), todayISO),
        lab: summariseLab((groupedLab.get(p.id) || []).filter((o) => o.status !== 'delivered'), todayISO),
        items: (groupedTreatments.get(p.id) || []).filter((t) => t.status !== 'cancelled'),
        receipts: (groupedPayments.get(p.id) || []).filter((py) => py.status === 'completed'),
      })
    }
    return map
  }, [patients, cheques, installments, paymentPlans, labOrders, treatments, payments, todayISO])

  // Aggregated clinic metrics
  const metrics = useMemo(() => {
    let totalDebt = 0
    let debtorsCount = 0
    let vipCount = 0
    let withPlansCount = 0
    let withChequesCount = 0
    let withImplantsCount = 0
    let withLabCount = 0

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
      if ((patientLabOrdersMap.get(p.id) || 0) > 0) withLabCount++
    }

    return {
      totalPatients: patients.filter((p) => p.is_active).length,
      debtorsCount,
      totalDebt,
      vipCount,
      withPlansCount,
      withChequesCount,
      withImplantsCount,
      withLabCount,
    }
  }, [patients, patientFinances, patientPlansMap, patientChequesMap, patientImplantsMap, patientLabOrdersMap])

  // Filtered patients for active drill-down
  const activeList = useMemo(() => {
    let list = patients.filter((p) => p.is_active)

    if (activeFullScreen === 'debtors') {
      list = list.filter((p) => (patientFinances.get(p.id)?.balance || 0) > 0)
    } else if (activeFullScreen === 'plans') {
      list = list.filter((p) => (patientPlansMap.get(p.id) || 0) > 0 || (patientChequesMap.get(p.id) || 0) > 0)
    } else if (activeFullScreen === 'implants') {
      list = list.filter((p) => (patientImplantsMap.get(p.id) || 0) > 0)
    } else if (activeFullScreen === 'lab') {
      list = list.filter((p) => (patientLabOrdersMap.get(p.id) || 0) > 0)
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
  }, [patients, activeFullScreen, searchQuery, patientFinances, patientPlansMap, patientChequesMap, patientImplantsMap, patientLabOrdersMap])

  const hubCards: { id: FullScreenView; title: string; badge: string; sub: string; concept: PatientConcept; onClickCustom?: () => void }[] = [
    { id: 'directory', title: 'پرونده بیماران', badge: `${toPersianDigits(metrics.totalPatients)} نفر`, sub: 'همه پرونده‌ها، یک‌جا', concept: 'directory' },
    { id: 'debtors', title: 'بدهکاران مالی', badge: `${toPersianDigits(metrics.debtorsCount)} بدهکار`, sub: `${formatCurrency(metrics.totalDebt)} تومان مانده`, concept: 'debt' },
    { id: 'plans', title: 'اقساط و چک صیاد', badge: `${toPersianDigits(metrics.withPlansCount + metrics.withChequesCount)} مورد`, sub: 'وصولی‌ها و تعهدات', concept: 'plans' },
    { id: 'implants', title: 'ایمپلنت و جراحی', badge: `${toPersianDigits(metrics.withImplantsCount)} پرونده`, sub: 'شناسنامه قطعات و جراحی', concept: 'implants' },
    { id: 'lab', title: 'کارهای لابراتوار', badge: `${toPersianDigits(metrics.withLabCount)} سفارش`, sub: 'ارسال، ساخت و تحویل', concept: 'lab' },
    { id: 'recall', title: 'پیگیری و ریکال', badge: 'مراقبت درمان', sub: 'کشیدن بخیه و چکاپ', concept: 'recall' },
    { id: 'vip', title: 'بیماران ویژه', badge: `${toPersianDigits(metrics.vipCount)} پرونده`, sub: 'طرح درمان‌های جامع', concept: 'vip' },
    { id: 'none', title: 'پذیرش بیمار جدید', badge: 'پذیرش فوری', sub: 'ایجاد پرونده تازه', concept: 'intake', onClickCustom: () => { h.pop(); onOpenCreate() } },
  ]

  // Recent patients list for quick bottom bar
  const recentPatients = useMemo(() => {
    return patients.filter((p) => p.is_active).slice(0, 4)
  }, [patients])

  return (
    <div className="w-full flex flex-col gap-5 pb-20 select-none" dir="rtl">
      {/* ── TOP ESSENTIAL BAR: Compact Status + Search + Privacy (Zero Space Wasted) ── */}
      <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
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
            className="raised-surface breathing-surface flex items-center gap-1 px-3 min-h-[40px] rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-black press-scale"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>پذیرش</span>
          </button>
        </div>
      </div>

      {/* ── TOP ESSENTIAL HORIZONTAL DOCK-SCROLL CHIP RAIL (چپ و راست روان با ۱ لمس) ── */}
      <div className="scroll-rail-affordance flex items-center gap-1.5 overflow-x-auto dock-scroll no-scrollbar -mx-2 px-2 py-1">
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
          className="raised-surface breathing-surface flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900 text-xs font-bold shrink-0 press-scale"
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
          <patientConcepts.implants.icon size={14} />
          <span>ایمپلنت‌ها</span>
        </button>

        <button
          onClick={() => { h.select(); setActiveFullScreen('vip') }}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 text-xs font-bold shrink-0 press-scale shadow-xs"
        >
          <Award size={14} />
          <span>VIP</span>
        </button>
      </div>

      {/* ── HIGH DENSITY 4-CARD / 2x4 APP LAUNCHER GRID (در نگاه اول بدون اسکرول) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 pt-1">
        {hubCards.map((card) => {
          const Icon = patientConcepts[card.concept].icon
          return <button
            key={card.title}
            type="button"
            onClick={() => {
              if (card.onClickCustom) {
                card.onClickCustom()
              } else {
                h.select()
                chimes.playPop()
                setActiveFullScreen(card.id)
              }
            }}
            style={conceptStyle(card.concept)}
            className={`patient-tile p-3.5 sm:p-5 rounded-[22px] cursor-pointer flex flex-col gap-2.5 text-right group ${card.concept === 'intake' ? 'breathing-surface' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`concept-icon p-2.5 sm:p-3 rounded-2xl shrink-0 ${patientConcepts[card.concept].color}`}>
                <Icon size={26} />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <h3 className="text-sm sm:text-base font-black leading-tight text-slate-900 dark:text-slate-100 truncate">
                  {card.title}
                </h3>
                <p className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5" dir="rtl">
                  {card.sub}
                </p>
              </div>
            </div>
            <span className={`concept-icon self-start text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl ${patientConcepts[card.concept].color}`}>
              {card.badge}
            </span>
          </button>
        })}
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
          {recentPatients.map((patient) => {
            const fin = patientFinances.get(patient.id) || { balance: 0, paid: 0, totalCost: 0 }
            const isDebtor = fin.balance > 0

            return (
              <div
                key={patient.id}
                style={patientRecordStyle(patient.id)}
                onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
                className="patient-tile flex items-center justify-between p-3 rounded-2xl active:scale-[0.985] cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {patient.first_name?.[0] || 'ب'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="patient-file-badge text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 rounded-md px-1.5 py-0.5 mt-0.5">
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

                  {(patientLabOrdersMap.get(patient.id) || 0) > 0 && <button title="سفارش‌های لابراتوار" aria-label="سفارش‌های لابراتوار" onClick={() => navigate(`/patients/${patient.id}`, { state: { initialTab: 'labOrders' } })} style={conceptStyle('lab')} className="patient-tile icon-blink w-9 h-9 rounded-xl flex items-center justify-center text-cyan-700"><patientConcepts.lab.icon size={16} /></button>}
                  {(patientImplantsMap.get(patient.id) || 0) > 0 && <button title="پرونده ایمپلنت" aria-label="پرونده ایمپلنت" onClick={() => navigate(`/patients/${patient.id}`, { state: { initialTab: 'implants' } })} style={conceptStyle('implants')} className="patient-tile icon-blink w-9 h-9 rounded-xl flex items-center justify-center text-indigo-700"><patientConcepts.implants.icon size={17} /></button>}
                  {patient.phone && (
                    <a
                      href={`tel:${patient.phone}`}
                      onClick={() => { h.tap(); chimes.playPop() }}
                      className="patient-tile icon-blink w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center press-scale"
                    >
                      <PhoneCall size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
                    aria-label="باز کردن پرونده بیمار"
                    className="file-action breathing-surface w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center press-scale"
                  >
                    <FileSearch size={16} />
                    <ChevronLeft size={12} />
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
           <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {activeList.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-slate-500">موردی یافت نشد</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 max-w-[1600px] mx-auto">
              {activeList.map((p) => {
                const fin = patientFinances.get(p.id) || { balance: 0, paid: 0, totalCost: 0 }
                const isDebtor = fin.balance > 0
                const clinical = clinicalSummary.get(p.id)
                const expanded = expandedPatientId === p.id

                return (
                  <div
                    key={p.id}
                    style={patientRecordStyle(p.id)}
                    className="patient-tile p-3 rounded-[20px] flex flex-col gap-2"
                  >
                    <button type="button" onClick={() => { h.tap(); setExpandedPatientId(expanded ? null : p.id) }}
                      aria-expanded={expanded} aria-label={`جزئیات مالی و درمانی ${p.first_name} ${p.last_name}`}
                      className="flex items-start justify-between gap-2 w-full text-right">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 min-w-[36px] rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center">
                          {p.first_name?.[0] || 'ب'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="inline-block text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 mt-1 font-mono">
                            پرونده #{toPersianDigits(p.file_number || '')} · {privacyMode ? maskPhoneNumber(p.phone || '') : toPersianDigits(p.phone || '')}
                          </p>
                        </div>
                      </div>

                      {isDebtor ? (
                        <span className="text-[10px] font-black px-2 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                          مانده {formatCurrency(fin.balance)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700">
                          تسویه
                        </span>
                      )}
                      <ChevronLeft size={15} className={`text-teal-700 transition-transform ${expanded ? '-rotate-90' : ''}`} />
                    </button>

                    {clinical && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold leading-5">
                        {clinical.cheques.inFlight.count > 0 && <span className="px-2 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">چک در جریان {toPersianDigits(clinical.cheques.inFlight.count)} · {formatCurrency(clinical.cheques.inFlight.total)} ت</span>}
                        {clinical.cheques.guarantee.count > 0 && <span className="px-2 rounded-lg bg-violet-100 text-violet-900 border border-violet-300">ضمانت {toPersianDigits(clinical.cheques.guarantee.count)} · {formatCurrency(clinical.cheques.guarantee.total)} ت</span>}
                        {clinical.cheques.bounced.count > 0 && <span className="px-2 rounded-lg bg-rose-100 text-rose-900 border border-rose-300">برگشتی {toPersianDigits(clinical.cheques.bounced.count)}</span>}
                        {clinical.plan.total > 0 && <span className="px-2 rounded-lg bg-sky-100 text-sky-900 border border-sky-300">اقساط {toPersianDigits(clinical.plan.paidCount)} پرداخت / {toPersianDigits(clinical.plan.dueCount)} مانده · {formatCurrency(clinical.plan.remaining)} ت</span>}
                        {clinical.lab.total > 0 && <span className="px-2 rounded-lg bg-cyan-100 text-cyan-900 border border-cyan-300">لابراتوار {toPersianDigits(clinical.lab.total)} · {clinical.lab.readyForDelivery > 0 ? `${toPersianDigits(clinical.lab.readyForDelivery)} آماده` : 'در جریان'}{clinical.lab.overdueAlarms > 0 ? ` · ${toPersianDigits(clinical.lab.overdueAlarms)} معوق` : ''}</span>}
                        {(patientImplantsMap.get(p.id) || 0) > 0 && <span className="px-2 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-300">ایمپلنت {toPersianDigits(patientImplantsMap.get(p.id) || 0)}</span>}
                      </div>
                    )}

                    {expanded && clinical && (
                      <div className="rounded-xl bg-sky-50/80 dark:bg-slate-800/80 border border-sky-200 dark:border-slate-600 p-2.5 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
                        <p className="font-black text-sky-900 dark:text-sky-200">ریز درمان و پرداخت</p>
                        {clinical.items.length ? clinical.items.map((item) => {
                          const cost = item.patient_share ?? item.total_price ?? 0
                          const paid = clinical.receipts.filter((payment) => payment.treatment_id === item.id).reduce((sum, payment) => sum + payment.amount, 0)
                          return <div key={item.id} className="flex justify-between items-start gap-2 border-b border-sky-200/80 pb-1.5 text-slate-800 dark:text-slate-100">
                            <span className="font-semibold">{item.tooth_number ? `دندان ${toothLabel(item.tooth_number)} · ` : ''}{item.procedure_name || item.procedure_code || 'درمان'}</span>
                            <span className="shrink-0 text-left leading-5">هزینه {formatCurrency(cost)} ت<br/>پرداخت مرتبط {formatCurrency(paid)} ت<br/><strong className="text-rose-700 dark:text-rose-300">مانده مرتبط {formatCurrency(cost - paid)} ت</strong></span>
                          </div>
                        }) : <p className="text-slate-700 dark:text-slate-200">درمانی ثبت نشده است.</p>}
                        {clinical.receipts.some((payment) => !payment.treatment_id && !payment.implant_case_id) && <p className="text-sky-900 dark:text-sky-200">پرداخت‌های عمومی جداگانه در مانده کل لحاظ می‌شوند و به یک درمان خاص نسبت داده نشده‌اند.</p>}
                        <p className="font-bold text-slate-800 dark:text-slate-100">مانده کل پرونده با احتساب ایمپلنت و پرداخت عمومی: {formatCurrency(fin.balance)} ت</p>
                        {clinical.cheques.guaranteeWithoutPlan > 0 && <p className="text-rose-700 dark:text-rose-300">چک ضمانت بدون طرح قسطی: {toPersianDigits(clinical.cheques.guaranteeWithoutPlan)}</p>}
                        {clinical.plan.overdueCount > 0 && <p className="text-rose-700 dark:text-rose-300">اقساط سررسید گذشته: {toPersianDigits(clinical.plan.overdueCount)}</p>}
                      </div>
                    )}
                    {/* Quick Sterile Touch Actions */}
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-1" >
                      <div className="flex flex-wrap items-center gap-1">
                        {p.phone && (
                          <>
                            <a
                              href={`tel:${p.phone}`}
                              onClick={() => { h.tap(); chimes.playPop() }}
                              className="raised-surface icon-blink px-2 min-h-[38px] rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 text-[11px] font-bold"
                            >
                              <PhoneCall size={14} />
                              <span>تماس</span>
                            </a>
                            <a
                              href={`sms:${p.phone}`}
                              onClick={() => { h.tap(); chimes.playPop() }}
                              className="raised-surface icon-blink px-2 min-h-[38px] rounded-xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1 text-[11px] font-bold"
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
                          className="appointment-primary raised-surface icon-blink px-2 min-h-[38px] rounded-xl flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Calendar size={14} />
                          <span>+ نوبت</span>
                        </button>
                      </div>

                      <button
                        onClick={() => { h.tap(); navigate(`/patients/${p.id}`) }}
                         className="file-action breathing-surface px-2 min-h-[38px] rounded-xl flex items-center gap-1 text-[11px] font-bold press-scale"
                      >
                         <FileSearch size={14} />
                        <span>پرونده</span>
                      </button>
                    </div>
                  </div>
                )
              })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
