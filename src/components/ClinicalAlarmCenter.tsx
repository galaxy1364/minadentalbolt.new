import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react'
import {
  fetchPatients,
  fetchCheques,
  fetchAllInstallments,
  fetchLabOrders,
  fetchImplantCases,
  fetchAppointments,
  fetchTreatments,
  fetchPayments,
  fetchEncounters,
} from '../lib/api'
import {
  getUrgentClinicAlarms,
  REMINDER_CATEGORY_META,
  type SmartReminder,
  type ReminderCategory,
  type ClinicAlarmBundle,
} from '../lib/smartReminders'
import { toPersianDigits, toJalaliStringPretty } from '../lib/persianDate'
import { showToast } from './ui'
import { h } from '../lib/haptics'
import { supabase } from '../lib/supabase'

type FilterTab = 'all' | 'cheque_due' | 'installment_due' | 'lab_overdue' | 'implant_stage_due' | 'clinical'

const TABS: { id: FilterTab; label: string; icon: string }[] = [
  { id: 'all', label: 'همه', icon: '🔔' },
  { id: 'cheque_due', label: 'چک‌ها', icon: '🧾' },
  { id: 'installment_due', label: 'اقساط', icon: '📅' },
  { id: 'lab_overdue', label: 'لابراتوار', icon: '🔬' },
  { id: 'implant_stage_due', label: 'ایمپلنت', icon: '🔩' },
  { id: 'clinical', label: 'پیگیری بالینی', icon: '🦷' },
]

export function useClinicAlarmSummary() {
  const [bundle, setBundle] = useState<ClinicAlarmBundle>({
    all: [],
    counts: {
      birthday: 0,
      debtor: 0,
      lapsed: 0,
      installment_due: 0,
      no_show: 0,
      unfinished_treatment: 0,
      unresolved_appointment: 0,
      cheque_due: 0,
      implant_stage_due: 0,
      lab_overdue: 0,
    },
    total: 0,
    hasUrgentFinancial: false,
    hasUrgentClinical: false,
    totalUrgentCount: 0,
    countsByCategory: {
      birthday: 0,
      debtor: 0,
      lapsed: 0,
      installment_due: 0,
      no_show: 0,
      unfinished_treatment: 0,
      unresolved_appointment: 0,
      cheque_due: 0,
      implant_stage_due: 0,
      lab_overdue: 0,
    },
    hasCriticalItems: false,
  })
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [pats, chqs, insts, labs, impls, appts, trts, pays, encs] = await Promise.all([
        fetchPatients(),
        fetchCheques(),
        fetchAllInstallments(),
        fetchLabOrders(),
        fetchImplantCases(),
        fetchAppointments(),
        fetchTreatments(),
        fetchPayments(),
        fetchEncounters(),
      ])

      const b = getUrgentClinicAlarms({
        patients: pats,
        cheques: chqs,
        installments: insts,
        labOrders: labs as any,
        implantCases: impls as any,
        appointments: appts as any,
        treatments: trts as any,
        payments: pays,
        encounters: encs,
      })
      setBundle(b)
    } catch (e) {
      console.error('Error fetching clinic alarms:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 45000)
    return () => clearInterval(timer)
  }, [refresh])

  return { bundle, loading, refresh }
}

export interface ClinicalAlarmCenterProps {
  open: boolean
  onClose: () => void
}

export function ClinicalAlarmCenter({ open, onClose }: ClinicalAlarmCenterProps) {
  const navigate = useNavigate()
  const { bundle, loading, refresh } = useClinicAlarmSummary()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Escape key listener to close
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const filteredItems = useMemo(() => {
    let list = bundle.all

    if (activeTab === 'cheque_due') {
      list = list.filter((i) => i.category === 'cheque_due')
    } else if (activeTab === 'installment_due') {
      list = list.filter((i) => i.category === 'installment_due')
    } else if (activeTab === 'lab_overdue') {
      list = list.filter((i) => i.category === 'lab_overdue')
    } else if (activeTab === 'implant_stage_due') {
      list = list.filter((i) => i.category === 'implant_stage_due')
    } else if (activeTab === 'clinical') {
      list = list.filter((i) =>
        ['no_show', 'unfinished_treatment', 'unresolved_appointment'].includes(i.category),
      )
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.detail.toLowerCase().includes(q) ||
          (i.extraInfo && i.extraInfo.toLowerCase().includes(q)),
      )
    }

    return list
  }, [bundle.all, activeTab, search])

  const handleSendSms = async (item: SmartReminder) => {
    if (!item.patient.phone) {
      showToast('error', 'این بیمار شماره تلفن ثبت‌شده ندارد')
      return
    }
    if (!item.smsMessage) {
      showToast('error', 'متن پیامک برای این هشدار تعریف نشده است')
      return
    }
    const itemKey = item.id || item.patient.id + item.category
    setSendingId(itemKey)
    h.tap()
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: item.patient.phone,
          message: item.smsMessage,
          type: 'reminder',
        },
      })
      if (error) throw error
      h.confirm()
      showToast('success', `پیامک یادآوری به ${item.patient.first_name} ارسال شد`)
    } catch {
      showToast('error', 'خطا در ارسال پیامک')
    } finally {
      setSendingId(null)
    }
  }

  const handleNavigate = (path: string) => {
    h.select()
    onClose()
    navigate(path)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-start bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-center-title"
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 text-white flex items-center justify-center shadow-md">
              <Bell size={18} />
              {bundle.total > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
              )}
            </div>
            <div>
              <h2 id="alarm-center-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                مرکز آلارم و هشدارهای بالینی
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {bundle.total > 0
                  ? `${toPersianDigits(bundle.total)} مورد نیازمند پیگیری فوری`
                  : 'امور بالینی و مالی به‌روز هستند'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                h.tap()
                refresh()
              }}
              disabled={loading}
              title="بروزرسانی داده‌ها"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => {
                h.tap()
                onClose()
              }}
              aria-label="بستن"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در هشدارها یا نام بیمار..."
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto border-b border-slate-100 dark:border-slate-800 no-scrollbar">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            let count = 0
            if (tab.id === 'all') count = bundle.total
            else if (tab.id === 'clinical') {
              count =
                bundle.counts.no_show +
                bundle.counts.unfinished_treatment +
                bundle.counts.unresolved_appointment
            } else {
              count = bundle.counts[tab.id] || 0
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  h.tap()
                  setActiveTab(tab.id)
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all-smooth press-scale ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {toPersianDigits(count)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-success-50 dark:bg-success-950/40 text-success-500 flex items-center justify-center mb-3">
                <CheckCircle2 size={28} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                هیچ هشداری در این بخش وجود ندارد
              </p>
              <p className="text-xs text-slate-400 max-w-[240px] mt-1">
                تمامی سررسیدها، چک‌ها و مراحل بالینی درمان بیماران در وضعیت استاندارد قرار دارند.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const meta = REMINDER_CATEGORY_META[item.category] || {
                label: 'هشدار',
                icon: '⚠️',
                color: '#64748b',
              }
              const itemKey = item.id || `${item.patient.id}-${item.category}`

              const isCritical =
                item.category === 'cheque_due' && item.detail.includes('برگشتی')
              const isOverdue =
                item.detail.includes('معوق') ||
                item.detail.includes('گذشته') ||
                item.detail.includes('عقب افتاده')

              return (
                <div
                  key={itemKey}
                  className={`p-3 rounded-2xl border transition-all-smooth bg-white dark:bg-slate-800/80 shadow-sm hover:shadow ${
                    isCritical
                      ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20'
                      : isOverdue
                      ? 'border-amber-200 dark:border-amber-900/50'
                      : 'border-slate-200/80 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => handleNavigate(`/patients/${item.patient.id}`)}
                          className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 truncate block text-right"
                        >
                          {item.title}
                        </button>
                        <p className="text-[10px] text-slate-400">
                          {meta.label}
                          {item.extraInfo ? ` · ${item.extraInfo}` : ''}
                        </p>
                      </div>
                    </div>

                    {isCritical ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 shrink-0">
                        <AlertTriangle size={11} />
                        فوری
                      </span>
                    ) : item.dueDate ? (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                        <Clock size={11} />
                        {toJalaliStringPretty(item.dueDate)}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium my-1.5 leading-relaxed">
                    {item.detail}
                  </p>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 mt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleNavigate(`/patients/${item.patient.id}`)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        مشاهده پرونده
                      </button>

                      {item.actionPath && (
                        <button
                          onClick={() => handleNavigate(item.actionPath!)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                        >
                          <span>اقدام مستقیم</span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>

                    {item.patient.phone && item.smsMessage ? (
                      <button
                        onClick={() => handleSendSms(item)}
                        disabled={sendingId === itemKey}
                        title={`ارسال پیامک به ${item.patient.phone}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary-500 hover:bg-primary-600 active:scale-95 text-white transition-all-smooth disabled:opacity-50"
                      >
                        <Send size={11} className={sendingId === itemKey ? 'animate-bounce' : ''} />
                        <span>ارسال پیامک</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-center">
          <button
            onClick={() => handleNavigate('/reminders')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <span>مشاهده صفحه کامل یادآوری‌ها و پیگیری‌ها</span>
            <ArrowLeft size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClinicalAlarmCenter
