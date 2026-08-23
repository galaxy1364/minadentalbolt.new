// Reports.tsx - Persian RTL Dental Clinic Reports & Analytics
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, Activity, Calendar, DollarSign, BarChart3, PieChart as PieIcon, Smile, ArrowUp, ArrowDown, Download, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts'
import { fetchPayments, fetchPatients, fetchEncounters, fetchTreatments, fetchProcedures, fetchAppointments, fetchExpenses, fetchImplantCases } from '../lib/api'
import { calcAllPatientBalances } from '../lib/finance'
import { toJalaliString, toJalaliStringPretty, getJalaliMonthYear, formatCurrency, formatNumber, toPersianDigits, persianMonths, jsDateToPersianWeekday } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { Payment, Patient, Encounter, Treatment, Procedure, Appointment, Expense } from '../types'
import { Card, Button, Badge, Spinner, EmptyState, Tabs, showToast } from '../components/ui'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'

// ============================================================================
// Constants
// ============================================================================

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#a855f7']

const appointmentStatusLabels: Record<string, string> = {
  scheduled: 'زمان‌بندی شده',
  confirmed: 'تایید شده',
  in_chair: 'روی صندلی',
  completed: 'تکمیل شده',
  cancelled: 'لغو شده',
  no_show: 'حضور نداشت',
}

const appointmentTypeLabels: Record<string, string> = {
  consultation: 'مشاوره',
  treatment: 'درمان',
  surgery: 'جراحی',
  orthodontics: 'ارتودنسی',
  implant: 'ایمپلنت',
  follow_up: 'ویزیت مجدد',
  checkup: 'معاینه',
  emergency: 'اورژانس',
  cleaning: 'جرم‌گیری',
  extraction: 'کشیدن',
  root_canal: 'عصب‌کشی',
  other: 'سایر',
}

const procedureCategoryLabels: Record<string, string> = {
  restorative: 'ترمیمی',
  endodontics: 'عصب‌کشی',
  surgery: 'جراحی',
  prosthetics: 'پروتز',
  orthodontics: 'ارتودنسی',
  pediatric: 'اطفال',
  preventive: 'پیشگیری',
  diagnostic: 'تشخیصی',
  cosmetic: 'زیبایی',
  implant: 'ایمپلنت',
  periodontics: 'لثه',
  other: 'سایر',
}

// ============================================================================
// Main Component
// ============================================================================

export default function Reports() {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('revenue')
  const [payments, setPayments] = useState<Payment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [implantCases, setImplantCases] = useState<any[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pays, pats, encs, trets, procs, appts, exps, implCases] = await Promise.all([
        fetchPayments(),
        fetchPatients(),
        fetchEncounters(),
        fetchTreatments(),
        fetchProcedures(),
        fetchAppointments(),
        fetchExpenses(),
        fetchImplantCases(),
      ])
      setPayments(pays)
      setPatients(pats)
      setEncounters(encs)
      setTreatments(trets)
      setProcedures(procs)
      setAppointments(appts)
      setExpenses(exps)
      setImplantCases(implCases)
    } catch (err) {
      console.error('Error loading reports:', err)
      showToast('error', 'خطا در بارگذاری گزارش‌ها')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ===========================================================================
  // Revenue Tab Data
  // ===========================================================================

  const revenue12MonthData = useMemo(() => {
    const now = new Date()
    const months: { label: string; revenue: number; expenses: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const rev = payments
        .filter((p) => { const pd = new Date(p.payment_date); return pd >= d && pd < next && p.status === 'completed' })
        .reduce((sum, p) => sum + (p.amount || 0), 0)
      const exp = expenses
        .filter((e) => { const ed = new Date(e.date); return ed >= d && ed < next })
        .reduce((sum, e) => sum + (e.amount || 0), 0)
      const { month, year } = getJalaliMonthYear(d.toISOString())
      months.push({ label: `${persianMonths[month - 1]} ${toPersianDigits(year)}`, revenue: rev, expenses: exp })
    }
    return months
  }, [payments, expenses])

  const profitBarData = useMemo(() => {
    return revenue12MonthData.map((d) => ({
      label: d.label,
      profit: d.revenue - d.expenses,
    }))
  }, [revenue12MonthData])

  const revenueStats = useMemo(() => {
    const totalRevenue = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const profit = totalRevenue - totalExpenses
    const avgMonthlyRevenue = totalRevenue / 12
    return { totalRevenue, totalExpenses, profit, avgMonthlyRevenue }
  }, [payments, expenses])

  // ===========================================================================
  // Patients Tab Data
  // ===========================================================================

  const patientGrowthData = useMemo(() => {
    const now = new Date()
    const months: { label: string; total: number }[] = []
    let cumulative = 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const newThisMonth = patients.filter((p) => {
        const pd = new Date(p.created_at)
        return pd < next
      }).length
      cumulative = newThisMonth
      const { month, year } = getJalaliMonthYear(d.toISOString())
      months.push({ label: `${persianMonths[month - 1]} ${toPersianDigits(year)}`, total: cumulative })
    }
    return months
  }, [patients])

  const newPatientsBarData = useMemo(() => {
    const now = new Date()
    const months: { label: string; count: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const count = patients.filter((p) => {
        const pd = new Date(p.created_at)
        return pd >= d && pd < next
      }).length
      const { month, year } = getJalaliMonthYear(d.toISOString())
      months.push({ label: `${persianMonths[month - 1]} ${toPersianDigits(year)}`, count })
    }
    return months
  }, [patients])

  const patientStats = useMemo(() => {
    const total = patients.length
    const now = new Date()
    const thisMonth = patients.filter((p) => {
      const pd = new Date(p.created_at)
      return pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear()
    }).length
    const lastMonth = patients.filter((p) => {
      const pd = new Date(p.created_at)
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return pd.getMonth() === lm.getMonth() && pd.getFullYear() === lm.getFullYear()
    }).length
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
    return { total, thisMonth, lastMonth, growth }
  }, [patients])

  // ===========================================================================
  // Treatments Tab Data
  // ===========================================================================

  const treatmentDistributionData = useMemo(() => {
    const counts: Record<string, number> = {}
    treatments.forEach((t) => {
      const cat = t.procedure_category ? (procedureCategoryLabels[t.procedure_category] || t.procedure_category) : 'سایر'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [treatments])

  const treatmentCategoryBarData = useMemo(() => {
    const counts: Record<string, number> = {}
    procedures.forEach((p) => {
      const cat = p.category ? (procedureCategoryLabels[p.category] || p.category) : 'سایر'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [procedures])

  const treatmentStats = useMemo(() => {
    const total = treatments.length
    const completed = treatments.filter((t) => t.status === 'completed').length
    const inProgress = treatments.filter((t) => t.status === 'in_progress' || t.status === 'planned').length
    // Cancelled treatments never counted toward revenue value before
    // (deleting one removed the row entirely); now that cancelling keeps
    // the row, it has to be excluded explicitly here too.
    const totalValue = treatments.filter((t) => t.status !== 'cancelled').reduce((sum, t) => sum + (t.total_price || 0), 0)
    return { total, completed, inProgress, totalValue }
  }, [treatments])

  // ===========================================================================
  // Appointments Tab Data
  // ===========================================================================

  const weeklyAppointmentData = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - jsDateToPersianWeekday(now))
    const days: { day: string; count: number }[] = []
    const weekdayShort = ['شن', 'یک', 'دو', 'سه', 'چه', 'پن', 'جم']
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const count = appointments.filter((a) => a.date === dateStr).length
      days.push({ day: weekdayShort[i], count })
    }
    return days
  }, [appointments])

  const appointmentStatusPieData = useMemo(() => {
    const counts: Record<string, number> = {}
    appointments.forEach((a) => {
      const label = appointmentStatusLabels[a.status] || a.status
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [appointments])

  const appointmentTypeBarData = useMemo(() => {
    const counts: Record<string, number> = {}
    appointments.forEach((a) => {
      const label = appointmentTypeLabels[a.type || 'other'] || 'سایر'
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [appointments])

  const appointmentStats = useMemo(() => {
    const total = appointments.length
    const completed = appointments.filter((a) => a.status === 'completed').length
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length
    const noShow = appointments.filter((a) => a.status === 'no_show').length
    const completionRate = total > 0 ? (completed / total) * 100 : 0
    return { total, completed, cancelled, noShow, completionRate }
  }, [appointments])

  // ===========================================================================
  // Render
  // ===========================================================================

  // ===========================================================================
  // CSV Export
  // ===========================================================================

  const exportToCSV = useCallback((data: Record<string, any>[], filename: string, headers: { key: string; label: string }[]) => {
    h.confirm()
    try {
      const csvRows: string[] = []
      csvRows.push(headers.map((h) => h.label).join(','))
      for (const row of data) {
        const values = headers.map((h) => {
          const val = row[h.key] ?? ''
          const str = String(val).replace(/"/g, '""')
          return `"${str}"`
        })
        csvRows.push(values.join(','))
      }
      const csv = '\uFEFF' + csvRows.join('\n') // BOM for Excel UTF-8
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('success', 'فایل CSV دانلود شد')
    } catch { showToast('error', 'خطا در ایجاد فایل') }
  }, [h])

  const handleExportRevenue = () => {
    exportToCSV(revenue12MonthData, 'گزارش-درآمد', [
      { key: 'label', label: 'ماه' },
      { key: 'revenue', label: 'درآمد' },
      { key: 'expenses', label: 'هزینه' },
    ])
  }

  const handleExportPatients = () => {
    const data = patients.map((p) => ({
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      phone: p.phone || '',
      status: p.is_active ? 'فعال' : 'غیرفعال',
      created: toJalaliString(p.created_at),
    }))
    exportToCSV(data, 'لیست-بیماران', [
      { key: 'name', label: 'نام' },
      { key: 'phone', label: 'تلفن' },
      { key: 'status', label: 'وضعیت' },
      { key: 'created', label: 'تاریخ ثبت' },
    ])
  }

  const handleExportAppointments = () => {
    const data = appointments.map((a) => ({
      date: a.date,
      time: a.start_time || '',
      status: appointmentStatusLabels[a.status] || a.status,
      type: appointmentTypeLabels[a.type || 'other'] || a.type,
    }))
    exportToCSV(data, 'گزارش-نوبت‌ها', [
      { key: 'date', label: 'تاریخ' },
      { key: 'time', label: 'ساعت' },
      { key: 'status', label: 'وضعیت' },
      { key: 'type', label: 'نوع' },
    ])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    )
  }

  const tooltipStyle = { direction: 'rtl' as const, fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }

  // ── Aging Report (سن بدهی) ──────────────────────────────────────
  // Buckets each patient's outstanding balance by days since their
  // most recent treatment activity — the standard 30/60/90-day aging
  // view real clinics use to prioritize collection follow-ups.
  const agingData = useMemo(() => {
    const { byPatient } = calcAllPatientBalances(payments, treatments, implantCases)
    const encMap = new Map(encounters.map((e) => [e.id, e]))
    const todayStr = new Date().toISOString().slice(0, 10)
    const daysSince = (dateStr: string) => Math.floor((new Date(todayStr).getTime() - new Date(dateStr).getTime()) / 86400000)

    const rows: { patientId: string; name: string; balance: number; days: number; bucket: '0-30' | '31-60' | '61-90' | '90+' }[] = []
    for (const [patientId, fin] of byPatient.entries()) {
      if (fin.balance <= 0) continue
      const patient = patients.find((p) => p.id === patientId)
      if (!patient) continue
      const patientTreatments = treatments.filter((t) => t.patient_id === patientId)
      const dates = patientTreatments.map((t) => encMap.get(t.encounter_id)?.encounter_date).filter(Boolean) as string[]
      const mostRecent = dates.length > 0 ? dates.sort().reverse()[0] : todayStr
      const days = Math.max(0, daysSince(mostRecent))
      const bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+'
      rows.push({ patientId, name: `${patient.first_name} ${patient.last_name}`, balance: fin.balance, days, bucket })
    }
    rows.sort((a, b) => b.days - a.days)
    const totals = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } as Record<string, number>
    for (const r of rows) totals[r.bucket] += r.balance
    return { rows, totals, grandTotal: rows.reduce((s, r) => s + r.balance, 0) }
  }, [payments, treatments, implantCases, patients, encounters])

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="reports"
        title="گزارش‌ها"
        subtitle="تحلیل و گزارش‌گیری عملکرد کلینیک"
        action={
          <div className="flex gap-2">
            <button onClick={handleExportRevenue} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium backdrop-blur-sm hover:bg-white/30 transition-all-smooth">درآمد</button>
            <button onClick={handleExportPatients} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium backdrop-blur-sm hover:bg-white/30 transition-all-smooth">بیماران</button>
            <button onClick={handleExportAppointments} className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium backdrop-blur-sm hover:bg-white/30 transition-all-smooth">نوبت‌ها</button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'revenue', label: 'درآمد', icon: <DollarSign size={16} /> },
          { key: 'aging', label: 'سن بدهی', icon: <AlertTriangle size={16} /> },
          { key: 'patients', label: 'بیماران', icon: <Users size={16} /> },
          { key: 'treatments', label: 'درمان‌ها', icon: <Activity size={16} /> },
          { key: 'appointments', label: 'نوبت‌ها', icon: <Calendar size={16} /> },
        ]}
        active={activeTab}
        onChange={(t) => { h.select(); setActiveTab(t) }}
      />

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <ReorderableStatGrid
            storageKey="reports-revenue"
            items={[
              { key: 'total', node: <ModuleStatCard moduleKey="reports" icon={<TrendingUp size={20} />} label="درآمد کل" value={`${formatCurrency(revenueStats.totalRevenue)} ت`} /> },
              { key: 'expenses', node: <ModuleStatCard moduleKey="reports" icon={<ArrowDown size={20} />} label="هزینه‌های کل" value={`${formatCurrency(revenueStats.totalExpenses)} ت`} /> },
              { key: 'profit', node: <ModuleStatCard moduleKey="reports" icon={<DollarSign size={20} />} label="سود خالص" value={`${formatCurrency(revenueStats.profit)} ت`} /> },
              { key: 'avg', node: <ModuleStatCard moduleKey="reports" icon={<BarChart3 size={20} />} label="میانگین ماهانه" value={`${formatCurrency(Math.round(revenueStats.avgMonthlyRevenue))} ت`} /> },
            ]}
          />

          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-success-600" />
              درآمد و هزینه‌های ۱۲ ماه اخیر
            </h2>
            {revenue12MonthData.every((d) => d.revenue === 0 && d.expenses === 0) ? (
              <EmptyState icon={<TrendingUp size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenue12MonthData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatNumber(Math.round(v / 1000000))} width={50} />
                  <RTooltip formatter={(v: number) => `${formatCurrency(v)} ت`} contentStyle={tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="درآمد" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" />
                  <Area type="monotone" dataKey="expenses" name="هزینه" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-600" />
              سود ماهانه
            </h2>
            {profitBarData.every((d) => d.profit === 0) ? (
              <EmptyState icon={<BarChart3 size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={profitBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatNumber(Math.round(v / 1000000))} width={50} />
                  <RTooltip formatter={(v: number) => `${formatCurrency(v)} ت`} contentStyle={tooltipStyle} />
                  <Bar dataKey="profit" name="سود" radius={[6, 6, 0, 0]}>
                    {profitBarData.map((d, i) => (
                      <Cell key={i} fill={d.profit >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {/* Aging Tab */}
      {activeTab === 'aging' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            {(['0-30', '31-60', '61-90', '90+'] as const).map((bucket) => (
              <Card key={bucket} className={`p-3.5 ${bucket === '90+' ? 'border-2 border-error-200' : ''}`}>
                <p className="text-[11px] text-slate-400">{bucket === '0-30' ? '۰ تا ۳۰ روز' : bucket === '31-60' ? '۳۱ تا ۶۰ روز' : bucket === '61-90' ? '۶۱ تا ۹۰ روز' : 'بیش از ۹۰ روز'}</p>
                <p className={`text-base font-extrabold ${bucket === '90+' ? 'text-error-600' : 'text-slate-700'}`}>{formatCurrency(agingData.totals[bucket])} ت</p>
              </Card>
            ))}
          </div>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700">مجموع بدهی معوق</p>
              <p className="text-lg font-extrabold text-error-600">{formatCurrency(agingData.grandTotal)} تومان</p>
            </div>
          </Card>
          {agingData.rows.length === 0 ? (
            <EmptyState icon={<AlertTriangle size={40} />} title="بدهی معوقی نیست" description="همه‌ی بیماران تسویه‌حساب دارند" />
          ) : (
            <div className="space-y-2">
              {agingData.rows.map((r) => (
                <Card key={r.patientId} className="p-3.5">
                  <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => navigate(`/patients/${r.patientId}`)}>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.name}</p>
                    <p className="text-[11px] text-slate-400">{toPersianDigits(r.days)} روز از آخرین فعالیت</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-error-600">{formatCurrency(r.balance)} ت</p>
                    <Badge color={r.bucket === '90+' ? 'error' : r.bucket === '61-90' ? 'warning' : 'slate'}>{r.bucket === '0-30' ? 'جدید' : r.bucket === '90+' ? 'بحرانی' : 'پیگیری'}</Badge>
                  </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <ReorderableStatGrid
            storageKey="reports-patients"
            items={[
              { key: 'total', node: <ModuleStatCard moduleKey="reports" icon={<Users size={20} />} label="کل بیماران" value={formatNumber(patientStats.total)} /> },
              { key: 'month', node: <ModuleStatCard moduleKey="reports" icon={<ArrowUp size={20} />} label="بیماران این ماه" value={formatNumber(patientStats.thisMonth)} /> },
              { key: 'lastmonth', node: <ModuleStatCard moduleKey="reports" icon={<ArrowDown size={20} />} label="بیماران ماه قبل" value={formatNumber(patientStats.lastMonth)} /> },
              { key: 'growth', node: <ModuleStatCard moduleKey="reports" icon={<TrendingUp size={20} />} label="نرخ رشد" value={`${toPersianDigits(Math.round(patientStats.growth))}٪`} /> },
            ]}
          />

          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-600" />
              رشد بیماران (۱۲ ماه)
            </h2>
            {patientGrowthData.every((d) => d.total === 0) ? (
              <EmptyState icon={<Users size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={patientGrowthData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatNumber(v)} width={50} />
                  <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="total" name="کل بیماران" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-accent-600" />
              بیماران جدید ماهانه
            </h2>
            {newPatientsBarData.every((d) => d.count === 0) ? (
              <EmptyState icon={<BarChart3 size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={newPatientsBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} width={40} />
                  <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="بیماران جدید" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {/* Treatments Tab */}
      {activeTab === 'treatments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ModuleStatCard moduleKey="reports" icon={<Activity size={20} />} label="کل درمان‌ها" value={formatNumber(treatmentStats.total)} />
            <ModuleStatCard moduleKey="reports" icon={<Smile size={20} />} label="تکمیل شده" value={formatNumber(treatmentStats.completed)} />
            <ModuleStatCard moduleKey="reports" icon={<BarChart3 size={20} />} label="در حال انجام" value={formatNumber(treatmentStats.inProgress)} />
            <ModuleStatCard moduleKey="reports" icon={<DollarSign size={20} />} label="ارزش کل" value={`${formatCurrency(treatmentStats.totalValue)} ت`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-primary-600" />
                توزیع درمان‌ها
              </h2>
              {treatmentDistributionData.length === 0 ? (
                <EmptyState icon={<PieIcon size={28} />} title="داده‌ای موجود نیست" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={treatmentDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${toPersianDigits(e.value)}`}>
                      {treatmentDistributionData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-accent-600" />
                رویه‌ها بر اساس دسته
              </h2>
              {treatmentCategoryBarData.length === 0 ? (
                <EmptyState icon={<BarChart3 size={28} />} title="داده‌ای موجود نیست" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={treatmentCategoryBarData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                    <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {treatmentCategoryBarData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ModuleStatCard moduleKey="reports" icon={<Calendar size={20} />} label="کل نوبت‌ها" value={formatNumber(appointmentStats.total)} />
            <ModuleStatCard moduleKey="reports" icon={<Smile size={20} />} label="تکمیل شده" value={formatNumber(appointmentStats.completed)} />
            <ModuleStatCard moduleKey="reports" icon={<ArrowDown size={20} />} label="لغو شده" value={formatNumber(appointmentStats.cancelled)} />
            <ModuleStatCard moduleKey="reports" icon={<TrendingUp size={20} />} label="نرخ تکمیل" value={`${toPersianDigits(Math.round(appointmentStats.completionRate))}٪`} />
          </div>

          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-600" />
              نوبت‌های هفته جاری
            </h2>
            {weeklyAppointmentData.every((d) => d.count === 0) ? (
              <EmptyState icon={<Calendar size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyAppointmentData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} width={40} />
                  <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="نوبت" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-accent-600" />
                نوبت‌ها بر اساس وضعیت
              </h2>
              {appointmentStatusPieData.length === 0 ? (
                <EmptyState icon={<PieIcon size={28} />} title="داده‌ای موجود نیست" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={appointmentStatusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${toPersianDigits(e.value)}`}>
                      {appointmentStatusPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-warning-600" />
                نوبت‌ها بر اساس نوع
              </h2>
              {appointmentTypeBarData.length === 0 ? (
                <EmptyState icon={<BarChart3 size={28} />} title="داده‌ای موجود نیست" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={appointmentTypeBarData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                    <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {appointmentTypeBarData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
