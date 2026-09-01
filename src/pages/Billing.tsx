// Billing.tsx - Persian RTL Dental Clinic Billing & Payments Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { PatientSelect } from '../components/PatientSelect'
import { toothLabel } from '../lib/toothLabel'
import { buildPrintDocument } from '../lib/printDocument'
import { resolveAttribution, attributableTreatments, treatmentRemaining } from '../lib/paymentAttribution'
import { validateCheque, chequeModeHint } from '../lib/chequeValidation'
import { useNavigate, useLocation } from 'react-router-dom'
import { CreditCard, Plus, Search, DollarSign, TrendingUp, Wallet, Calendar, CalendarClock, CheckCircle2, AlertCircle, Edit2, Filter, Receipt, Banknote, Clock, Trash2, Printer } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell as RCell } from 'recharts'
import { fetchPayments, createPayment, updatePayment, fetchEncounters, fetchCheques, createCheque, updateCheque, fetchPaymentPlans, createPaymentPlan, updatePaymentPlan, updateInstallment, fetchPatients, fetchExpenses, createExpense, updateExpense, deactivateExpense, fetchTreatments, fetchImplantCases, fetchDoctors } from '../lib/api'
import { buildSchedule, splitAmount, planProgress, reconcilePlan } from '../lib/installments'
import { checkOverpayment } from '../lib/finance'
import { toJalaliString, toJalaliStringPretty, formatCurrency, formatNumber, toPersianDigits, toEnglishDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { useConfirmAction } from '../components/ConfirmAction'
import { Payment, Encounter, Cheque, PaymentPlan, PaymentPlanWithRelations, Patient, Expense, Treatment, ImplantCase, Installment } from '../types'
import { calcAllPatientBalances } from '../lib/finance'
import { downloadICSReminder } from '../lib/icsReminder'
import { fetchCashRegisterSessions, openCashRegisterSession, closeCashRegisterSession } from '../lib/api'
import type { CashRegisterSession } from '../types'
import { Wizard, Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, Tabs, showToast, Modal } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { CurrencyInput } from '../components/CurrencyInput'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'

// ============================================================================
// Constants
// ============================================================================

const paymentMethods: { value: string; label: string; color: string }[] = [
  { value: 'cash', label: 'نقدی', color: 'success' },
  { value: 'card', label: 'کارت', color: 'primary' },
  { value: 'transfer', label: 'انتقال بانکی', color: 'accent' },
  { value: 'installment', label: 'اقساط', color: 'warning' },
  { value: 'cheque', label: 'چک', color: 'warning' },
  { value: 'insurance', label: 'بیمه', color: 'secondary' },
]

const paymentStatuses: { value: string; label: string; color: string }[] = [
  { value: 'completed', label: 'تکمیل شده', color: 'success' },
  { value: 'pending', label: 'در انتظار', color: 'warning' },
  { value: 'failed', label: 'ناموفق', color: 'error' },
]

const chequeStatuses: { value: string; label: string; color: string }[] = [
  { value: 'pending', label: 'در انتظار', color: 'warning' },
  { value: 'deposited', label: 'وصول شده در بانک', color: 'primary' },
  { value: 'cleared', label: 'پاس شد', color: 'success' },
  { value: 'bounced', label: 'برگشت خورده', color: 'error' },
  { value: 'cancelled', label: 'لغو شده', color: 'error' },
]

const planStatuses: { value: string; label: string; color: string }[] = [
  { value: 'active', label: 'فعال', color: 'success' },
  { value: 'completed', label: 'تکمیل شده', color: 'primary' },
  { value: 'defaulted', label: 'نکول', color: 'error' },
  { value: 'cancelled', label: 'لغو شده', color: 'error' },
]

const pieColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const persianMonthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

// ============================================================================
// Main Component
// ============================================================================

export default function Billing() {
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  const navigate = useNavigate()
  // Closed on open: the payment list is why this page exists.
  const [chartsOpen, setChartsOpen] = useState(false)
  const location = useLocation()

  const [payments, setPayments] = useState<Payment[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  // MOD-FEAT-020: needed to turn a payment's doctor_id into a name.
  const [doctors, setDoctors] = useState<{ id: string; name: string | null }[]>([])
  const [implantCases, setImplantCases] = useState<ImplantCase[]>([])
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanWithRelations[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState('payments')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterChequeStatus, setFilterChequeStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentWizardStep, setPaymentWizardStep] = useState(0)
  const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>([])
  const [openSession, setOpenSession] = useState<CashRegisterSession | null>(null)
  const [openingBalanceInput, setOpeningBalanceInput] = useState('')
  const [countedBalanceInput, setCountedBalanceInput] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [savingRegister, setSavingRegister] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    patient_id: '',
    encounter_id: '',
    implant_case_id: '',
    treatment_id: '',
    amount: '',
    discountPercent: '',
    payment_method: '',
    reference: '',
    notes: '',
    status: 'completed',
    payment_date: new Date().toISOString().slice(0, 10),
  })

  // Cheque modal
  const [chequeModalOpen, setChequeModalOpen] = useState(false)
  const [chequeWizardStep, setChequeWizardStep] = useState(0)
  const [savingCheque, setSavingCheque] = useState(false)
  const [chequeForm, setChequeForm] = useState({
    patient_id: '',
    amount: '',
    bank_name: '',
    branch: '',
    cheque_number: '',
    account_number: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    payee_name: '',
    sayad_id: '',
    notes: '',
    status: 'pending',
    // MOD-FEAT-029: تا امروز فرم همیشه purpose: 'payment' می‌نوشت، پس
    // چک ضمانت اصلاً قابل ساخت نبود.
    isGuarantee: false,
    payment_plan_id: '',
  })

  // Payment plan modal
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [rescheduleInstallment, setRescheduleInstallment] = useState<any>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [savingReschedule, setSavingReschedule] = useState(false)
  // Real gap found from a walkthrough: an installment could only be
  // marked paid instantly in cash — no way to record "patient gave a
  // post-dated cheque for THIS installment" (the common monthly-cheque
  // pattern). This modal captures that cheque's details; the installment
  // itself only becomes 'paid' later, when that specific cheque clears.
  const [chequeInstallment, setChequeInstallment] = useState<{ inst: any; plan: any } | null>(null)
  const [instChequeForm, setInstChequeForm] = useState({ bank_name: '', cheque_number: '', account_number: '', sayad_id: '', due_date: '', payee_name: '' })
  const [savingInstCheque, setSavingInstCheque] = useState(false)
  const [planWizardStep, setPlanWizardStep] = useState(0)
  const [savingPlan, setSavingPlan] = useState(false)
  const [planForm, setPlanForm] = useState({
    patient_id: '',
    encounter_id: '',
    total_amount: '',
    installment_count: '3',
    start_date: new Date().toISOString().slice(0, 10),
    notes: '',
    // Guarantee cheque — always required, covers the full remaining
    // balance, separate from the (cash-only) monthly installments.
    guarantee_bank_name: '',
    guarantee_branch: '',
    guarantee_cheque_number: '',
    guarantee_account_number: '',
    guarantee_sayad_id: '',
    guarantee_issue_date: new Date().toISOString().slice(0, 10),
    guarantee_due_date: '',
    guarantee_payee_name: '',
  })

  // Expense modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expenseWizardStep, setExpenseWizardStep] = useState(0)
  const [savingExpense, setSavingExpense] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
  })

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pays, encs, chqs, plans, pats, exps, trts, implCases, cashSess, docs] = await Promise.all([
        fetchPayments(),
        fetchEncounters(),
        fetchCheques(),
        fetchPaymentPlans(),
        fetchPatients(),
        fetchExpenses(),
        fetchTreatments(),
        fetchImplantCases(),
        fetchCashRegisterSessions(),
        fetchDoctors(),
      ])
      setPayments(pays)
      setEncounters(encs)
      setCheques(chqs)
      setPaymentPlans(plans)
      setPatients(pats)
      setExpenses(exps)
      setTreatments(trts)
      setImplantCases(implCases)
      setDoctors(docs as never)
      setCashSessions(cashSess)
      setOpenSession(cashSess.find((s) => s.status === 'open') || null)
    } catch (err) {
      console.error('Error loading billing data:', err)
      showToast('error', 'خطا در بارگذاری اطلاعات مالی')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Arrived here from a finished treatment session's 'ارسال به مالی'
  // button — carries the patient, encounter, and calculated total so
  // staff doesn't re-enter anything already known, and opens straight
  // into recording the payment instead of a plain patient list.
  useEffect(() => {
    const state = location.state as { openPaymentForPatientId?: string; suggestedAmount?: number; fromEncounterId?: string } | null
    if (!state?.openPaymentForPatientId) return
    setPaymentForm((p) => ({
      ...p,
      patient_id: state.openPaymentForPatientId!,
      encounter_id: state.fromEncounterId || '',
      amount: state.suggestedAmount ? String(state.suggestedAmount) : '',
    }))
    setPaymentWizardStep(0)
    setPaymentModalOpen(true)
    window.history.replaceState({}, '')
  }, [location.state])

  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>()
    patients.forEach((p) => map.set(p.id, p))
    return map
  }, [patients])

  const getPatientName = (patientId: string) => {
    const p = patientMap.get(patientId)
    return p ? `${p.first_name} ${p.last_name}` : 'نامشخص'
  }

  // Top-level (not nested inside another useMemo) so both `stats` below
  // and the payment-form debt breakdown can both read the full
  // per-patient balance objects (not just the plain balance number).
  const patientBalancesMap = useMemo(
    () => calcAllPatientBalances(payments, treatments, implantCases).byPatient,
    [payments, treatments, implantCases],
  )

  const stats = useMemo(() => {
    const totalRevenue = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthlyRevenue = payments.filter((p) => p.status === 'completed' && p.payment_date >= monthStart).reduce((sum, p) => sum + p.amount, 0)
    // Guarantee cheques are collateral against a payment plan's balance —
    // that balance is already counted once in outstandingBalance via the
    // plan's installments, so including the guarantee cheque here too
    // would double-count the same debt as if it were separate incoming cash.
    const pendingCheques = cheques.filter((c) => c.purpose !== 'guarantee' && (c.status === 'pending' || c.status === 'deposited'))
    const pendingChequeAmount = pendingCheques.reduce((sum, c) => sum + c.amount, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    // Same shared basis (treatments minus payments) as Dashboard and
    // Patients, so the number is provably identical everywhere instead
    // of silently drifting from a cached encounters.total_amount field.
    const outstandingBalance = Array.from(patientBalancesMap.values()).reduce((s, fin) => s + (fin.balance > 0 ? fin.balance : 0), 0)
    const patientBalances = new Map(Array.from(patientBalancesMap.entries()).map(([id, fin]) => [id, fin.balance]))

    return { totalRevenue, monthlyRevenue, pendingCheques: pendingCheques.length, pendingChequeAmount, outstandingBalance, patientBalances, totalExpenses }
  }, [payments, cheques, encounters, expenses, treatments, implantCases, patientBalancesMap])

  // Revenue chart data - last 6 months
  const revenueChartData = useMemo(() => {
    const now = new Date()
    const data: { month: string; revenue: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = d.toISOString().slice(0, 10)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      const monthRevenue = payments
        .filter((p) => p.status === 'completed' && p.payment_date >= monthStart && p.payment_date <= monthEnd)
        .reduce((sum, p) => sum + p.amount, 0)
      data.push({ month: persianMonthNames[d.getMonth()], revenue: monthRevenue })
    }
    return data
  }, [payments])

  // Payment method distribution for pie chart
  const pieChartData = useMemo(() => {
    const methodCounts = new Map<string, number>()
    payments.filter((p) => p.status === 'completed').forEach((p) => {
      methodCounts.set(p.payment_method, (methodCounts.get(p.payment_method) || 0) + p.amount)
    })
    return paymentMethods.map((m) => ({
      name: m.label,
      value: methodCounts.get(m.value) || 0,
    })).filter((d) => d.value > 0)
  }, [payments])

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (searchQuery) {
        const name = getPatientName(p.patient_id).toLowerCase()
        if (!name.includes(searchQuery.toLowerCase())) return false
      }
      if (filterMethod && p.payment_method !== filterMethod) return false
      if (filterStatus && p.status !== filterStatus) return false
      return true
    })
  }, [payments, searchQuery, filterMethod, filterStatus, patientMap])

  // Filtered cheques
  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (searchQuery) {
        const name = getPatientName(c.patient_id).toLowerCase()
        if (!name.includes(searchQuery.toLowerCase())) return false
      }
      if (filterChequeStatus && c.status !== filterChequeStatus) return false
      return true
    })
  }, [cheques, searchQuery, filterChequeStatus, patientMap])

  // Patient balances list
  const patientBalanceList = useMemo(() => {
    return Array.from(stats.patientBalances.entries())
      .map(([patientId, balance]) => ({ patientId, balance }))
      .filter((b) => b.balance > 0)
      .sort((a, b) => b.balance - a.balance)
  }, [stats.patientBalances])

  // ===========================================================================
  // Handlers
  // ===========================================================================

  const handleSavePayment = () => {
    if (!paymentForm.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) { showToast('error', 'مبلغ را وارد کنید'); return }
    if (!paymentForm.payment_method) { showToast('error', 'انتخاب روش پرداخت الزامی است'); return }
    const patient = patientMap.get(paymentForm.patient_id)
    const fin = patientBalancesMap.get(paymentForm.patient_id)
    confirmAction({
      type: 'create',
      title: 'ثبت پرداخت',
      // The old warning only fired once the balance was ALREADY zero, so
      // a payment taking an account from 12.5m owed to 6.5m in credit
      // passed in silence. Found in the live database: one patient with
      // 22.5m billable and 42.5m recorded as paid, never flagged.
      // Warns, does not block — paying ahead is real.
      warning: (() => {
        const over = checkOverpayment(Number(paymentForm.amount) || 0, fin?.balance ?? 0)
        if (!over.message) return undefined
        return `⚠ ${over.message} (${formatCurrency(over.excess)} ت اضافه)`
      })(),
      fields: [
        { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '-', highlight: true },
        { label: 'مبلغ', value: `${formatCurrency(Number(paymentForm.amount))} ت` },
        ...(paymentForm.discountPercent && Number(paymentForm.discountPercent) > 0 ? [{ label: 'تخفیف اعمال‌شده', value: `${toPersianDigits(paymentForm.discountPercent)}٪` }] : []),
        { label: 'روش', value: paymentMethods.find((m) => m.value === paymentForm.payment_method)?.label || paymentForm.payment_method },
        { label: 'تاریخ', value: toJalaliString(paymentForm.payment_date) },
      ],
      confirmLabel: 'ثبت',
      onConfirm: async () => {
        setSavingPayment(true)
        try {
          await createPayment({
            patient_id: paymentForm.patient_id, encounter_id: paymentForm.encounter_id || null,
            implant_case_id: paymentForm.implant_case_id || null,
            treatment_id: paymentForm.treatment_id || null,
            doctor_id: treatments.find((t) => t.id === paymentForm.treatment_id)?.doctor_id || null,
            amount: Number(paymentForm.amount), payment_method: paymentForm.payment_method,
            reference: paymentForm.reference || null, notes: paymentForm.notes || null,
            status: paymentForm.status, payment_date: paymentForm.payment_date, created_by: null,
          } as any)
          showToast('success', 'پرداخت ثبت شد'); setPaymentModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا در ثبت') }
        finally { setSavingPayment(false) }
      },
    })
  }

  const handleSaveCheque = () => {
    if (!chequeForm.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    if (!chequeForm.amount || Number(chequeForm.amount) <= 0) { showToast('error', 'مبلغ را وارد کنید'); return }
    const patient = patientMap.get(chequeForm.patient_id)
    confirmAction({
      type: 'create',
      title: 'ثبت چک',
      fields: [
        { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '-', highlight: true },
        { label: 'مبلغ', value: `${formatCurrency(Number(chequeForm.amount))} ت` },
        { label: 'بانک', value: chequeForm.bank_name || '-' },
        { label: 'سررسید', value: toJalaliString(chequeForm.due_date) },
      ],
      confirmLabel: 'ثبت چک',
      onConfirm: async () => {
        setSavingCheque(true)
        try {
          await createCheque({
            patient_id: chequeForm.patient_id, amount: Number(chequeForm.amount),
            bank_name: chequeForm.bank_name || null, branch: chequeForm.branch || null,
            cheque_number: chequeForm.cheque_number || null, account_number: chequeForm.account_number || null,
            issue_date: chequeForm.issue_date, due_date: chequeForm.due_date,
            payee_name: chequeForm.payee_name || null, sayad_id: toEnglishDigits(chequeForm.sayad_id || '').trim() || null, notes: chequeForm.notes || null,
            // MOD-FEAT-029: the کind is now the user's choice. Guarantee
            // cheques used to be creatable only inside createPaymentPlan,
            // so a guarantee taken on its own had to be recorded as a
            // payment cheque — the one kind that is expected to clear.
            purpose: chequeForm.isGuarantee ? 'guarantee' : 'payment',
            payment_plan_id: chequeForm.isGuarantee ? (chequeForm.payment_plan_id || null) : null,
            status: chequeForm.status, created_by: null,
          } as any)
          showToast('success', 'چک ثبت شد'); setChequeModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا در ثبت') }
        finally { setSavingCheque(false) }
      },
    })
  }

  const handleSavePlan = () => {
    if (!planForm.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    if (!planForm.total_amount || Number(planForm.total_amount) <= 0) { showToast('error', 'مبلغ کل را وارد کنید'); return }
    const count = Number(planForm.installment_count)
    if (count < 1) { showToast('error', 'تعداد اقساط باید حداقل ۱ باشد'); return }
    // Guarantee cheque is always mandatory for a payment plan — it secures
    // the full balance, separate from the cash-only monthly installments.
    if (!planForm.guarantee_cheque_number.trim()) { showToast('error', 'شماره چک ضمانت الزامی است'); return }
    if (!planForm.guarantee_due_date) { showToast('error', 'تاریخ سررسید چک ضمانت الزامی است'); return }
    const guaranteeSayadDigits = toEnglishDigits(planForm.guarantee_sayad_id || '').trim()
    if (guaranteeSayadDigits && (guaranteeSayadDigits.length !== 16 || !/^[0-9]+$/.test(guaranteeSayadDigits))) {
      showToast('error', 'شناسه صیاد چک ضمانت باید ۱۶ رقم باشد'); return
    }
    const patient = patientMap.get(planForm.patient_id)
    confirmAction({
      type: 'create',
      title: 'طرح قسطی جدید',
      fields: [
        { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '-', highlight: true },
        { label: 'مبلغ کل', value: `${formatCurrency(Number(planForm.total_amount))} ت` },
        { label: 'تعداد اقساط', value: toPersianDigits(count) },
        // Shows the real first and last figures rather than one rounded
        // number the final instalment will not match.
        { label: 'مبلغ هر قسط', value: (() => {
          const parts = splitAmount(Number(planForm.total_amount), count)
          const first = parts[0] ?? 0
          const last = parts[parts.length - 1] ?? 0
          return first === last
            ? `${formatCurrency(first)} ت`
            : `${formatCurrency(first)} ت — قسط آخر ${formatCurrency(last)} ت`
        })() },
        { label: 'چک ضمانت', value: `${formatCurrency(Number(planForm.total_amount))} ت — شماره ${planForm.guarantee_cheque_number}`, highlight: true },
      ],
      confirmLabel: 'ایجاد طرح',
      onConfirm: async () => {
        setSavingPlan(true)
        try {
          const totalAmount = Number(planForm.total_amount)
          // Amounts and dates come from one tested place. The version
          // that lived here used Date.setMonth, which overflows: a plan
          // starting 31 January put its second instalment on 3 March.
          const installments = buildSchedule(totalAmount, count, planForm.start_date).map((row) => ({
            patient_id: planForm.patient_id,
            installment_number: row.installment_number,
            amount: row.amount,
            due_date: row.due_date,
            status: 'pending',
          }))
          await createPaymentPlan({
            patient_id: planForm.patient_id, encounter_id: planForm.encounter_id || null,
            total_amount: totalAmount, installment_count: count, start_date: planForm.start_date,
            status: 'active', notes: planForm.notes || null, created_by: null,
          } as any, installments as any, {
            patient_id: planForm.patient_id,
            bank_name: planForm.guarantee_bank_name || null,
            branch: planForm.guarantee_branch || null,
            cheque_number: planForm.guarantee_cheque_number,
            account_number: planForm.guarantee_account_number || null,
            sayad_id: guaranteeSayadDigits || null,
            issue_date: planForm.guarantee_issue_date,
            due_date: planForm.guarantee_due_date,
            payee_name: planForm.guarantee_payee_name || null,
            status: 'pending', notes: 'چک ضمانت طرح قسطی', created_by: null,
          } as any)
          showToast('success', 'طرح قسطی و چک ضمانت ایجاد شد'); setPlanModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا') }
        finally { setSavingPlan(false) }
      },
    })
  }

  const handleDeleteCheque = (cheque: Cheque) => {
    h.tap()
    // Per clinic policy: a cheque (a real financial/legal instrument) is
    // never permanently deleted. Marking it 'لغو شده' (cancelled) keeps
    // it fully visible in every list forever — it's the honest record
    // of "this cheque was voided", not an erased one.
    confirmAction({
      type: 'status',
      title: 'لغو چک',
      warning: 'این چک هیچ‌وقت پاک نمی‌شود — فقط به‌عنوان لغو‌شده علامت می‌خورد و در سوابق باقی می‌ماند.',
      fields: [
        { label: 'بیمار', value: getPatientName(cheque.patient_id), highlight: true },
        { label: 'مبلغ', value: `${formatCurrency(cheque.amount)} ت` },
      ],
      confirmLabel: 'تایید لغو',
      onConfirm: async () => {
        try { await updateCheque(cheque.id, { status: 'cancelled' } as any); showToast('success', 'چک لغو شد — در سوابق باقی ماند'); await loadData() }
        catch { showToast('error', 'خطا در لغو') }
      },
    })
  }

  const handleDeletePlan = (plan: PaymentPlanWithRelations) => {
    h.tap()
    // Same policy as cheques/payments above — a payment plan (and the
    // guarantee cheque + installments it's tied to) is never permanently
    // deleted, only marked cancelled.
    confirmAction({
      type: 'status',
      title: 'لغو طرح قسطی',
      warning: 'این طرح هیچ‌وقت پاک نمی‌شود — فقط به‌عنوان لغو‌شده علامت می‌خورد و در سوابق باقی می‌ماند.',
      fields: [
        { label: 'بیمار', value: getPatientName(plan.patient_id), highlight: true },
        { label: 'مبلغ کل', value: `${formatCurrency(plan.total_amount)} ت` },
      ],
      confirmLabel: 'تایید لغو',
      onConfirm: async () => {
        try { await updatePaymentPlan(plan.id, { status: 'cancelled' } as any); showToast('success', 'طرح قسطی لغو شد — در سوابق باقی ماند'); await loadData() }
        catch { showToast('error', 'خطا در لغو') }
      },
    })
  }

  const quickChequeStatusChange = (cheque: Cheque, newStatus: string) => {
    h.select()
    const meta = chequeStatuses.find((s) => s.value === newStatus) || chequeStatuses[0]
    const willClear = newStatus === 'cleared' && cheque.status !== 'cleared'
    confirmAction({
      type: 'status',
      title: 'تغییر وضعیت چک',
      fields: [
        { label: 'بیمار', value: getPatientName(cheque.patient_id), highlight: true },
        { label: 'مبلغ', value: `${formatCurrency(cheque.amount)} ت` },
        { label: 'وضعیت فعلی', value: chequeStatuses.find((s) => s.value === cheque.status)?.label || cheque.status },
        { label: 'وضعیت جدید', value: meta.label, highlight: true },
        ...(willClear ? [{ label: 'اثر روی مانده‌حساب', value: 'مانده‌حساب بیمار به همین میزان کاهش می‌یابد' }] : []),
      ],
      confirmLabel: 'تایید',
      onConfirm: async () => {
        try {
          await updateCheque(cheque.id, { status: newStatus })
          // Per clinic policy: a cheque only reduces the patient's balance
          // once it actually clears/is cashed — not the moment it's
          // handed over. So clearing it here is exactly when the matching
          // Payment record (the thing calcPatientBalance actually counts)
          // needs to be created; without this the balance stayed wrong
          // even after a real cheque had legitimately cleared.
          if (willClear) {
            await createPayment({
              patient_id: cheque.patient_id, encounter_id: null,
              amount: cheque.amount, payment_method: 'cheque',
              reference: cheque.cheque_number || null,
              notes: `وصول چک شماره ${cheque.cheque_number || '-'}`,
              status: 'completed', payment_date: new Date().toISOString().slice(0, 10),
              created_by: null,
            } as any)
            // If this cheque was securing one specific installment (the
            // "monthly post-dated cheque instead of cash" pattern), that
            // installment is now genuinely paid too — without this it
            // would sit forever marked 'pending' even though the money
            // just landed, showing as a false overdue/upcoming reminder.
            if ((cheque as any).installment_id) {
              await updateInstallment((cheque as any).installment_id, { status: 'paid', payment_date: new Date().toISOString().slice(0, 10) })
            }
          }
          showToast('success', willClear ? 'چک وصول شد و مانده‌حساب به‌روز شد' : 'وضعیت تغییر کرد')
          await loadData()
        }
        catch { showToast('error', 'خطا') }
      },
    })
  }

  const markInstallmentPaid = (installment: Installment, plan: PaymentPlanWithRelations) => {
    h.confirm()
    confirmAction({
      type: 'status',
      title: 'پرداخت قسط',
      fields: [
        { label: 'قسط', value: `قسط ${toPersianDigits(installment.installment_number)} — ${formatCurrency(installment.amount)} ت`, highlight: true },
        { label: 'تاریخ', value: toJalaliString(new Date().toISOString().slice(0, 10)) },
      ],
      confirmLabel: 'تایید پرداخت',
      onConfirm: async () => {
        try {
          await updateInstallment(installment.id, { status: 'paid', payment_date: new Date().toISOString().slice(0, 10) })
          // Same fix as cheques/insurance: an installment's own status
          // field isn't what calcPatientBalance reads — without a real
          // Payment record, the patient's balance stayed unchanged even
          // after every installment was fully paid off.
          await createPayment({
            patient_id: plan.patient_id, encounter_id: null,
            amount: installment.amount, payment_method: 'cash',
            reference: null,
            notes: `پرداخت قسط ${installment.installment_number} از طرح قسطی`,
            status: 'completed', payment_date: new Date().toISOString().slice(0, 10),
            created_by: null,
          } as any)
          // If every installment in this plan is now paid, the plan
          // itself should stop showing as 'active' forever.
          const allPaid = plan.installments.every((i) => i.id === installment.id || i.status === 'paid')
          if (allPaid && plan.status !== 'completed') {
            await updatePaymentPlan(plan.id, { status: 'completed' })
          }
          showToast('success', allPaid ? 'قسط پرداخت شد و طرح قسطی تکمیل شد' : 'قسط پرداخت شد')
          await loadData()
        }
        catch { showToast('error', 'خطا') }
      },
    })
  }

  // ===========================================================================
  // Render: Stats
  // ===========================================================================

  const renderStats = () => (
    <ReorderableStatGrid
      storageKey="billing"
      items={[
        { key: 'revenue', node: <ModuleStatCard moduleKey="billing" icon={<DollarSign size={20} />} label="کل درآمد" value={`${formatCurrency(stats.totalRevenue)} ت`} /> },
        { key: 'monthly', node: <ModuleStatCard moduleKey="billing" icon={<TrendingUp size={20} />} label="درآمد این ماه" value={`${formatCurrency(stats.monthlyRevenue)} ت`} /> },
        { key: 'outstanding', node: <ModuleStatCard moduleKey="billing" icon={<Wallet size={20} />} label="مطالبات معوق" value={`${formatCurrency(stats.outstandingBalance)} ت`} /> },
        { key: 'cheques', node: <ModuleStatCard moduleKey="billing" icon={<Banknote size={20} />} label="چک‌های در انتظار" value={`${formatCurrency(stats.pendingChequeAmount)} ت`} /> },
      ]}
    />
  )

  // ===========================================================================
  // Render: Charts
  // ===========================================================================

  /**
   * MOD-UI-012 | نمودارها جمع‌شونده و پیش‌فرض بسته
   *
   * گزارش مهدی: «این دو تا نمودار رو می‌خوام حالت جمع‌شونده بگذاری… در
   * حالت عادی باید جمع باشه که ما اون نوار سرچ و چیپ و پرداختی‌ها رو
   * اول ببینیم.»
   *
   * Two 220px charts sat above the search box, the tabs and the payment
   * list — so on a phone the daily work of this page began below the
   * fold. A chart is something you consult occasionally; a payment list
   * is why the page is opened. The occasional thing was taking the space
   * of the constant one.
   *
   * Collapsed by default rather than removed: the charts are genuinely
   * useful, just not on every visit.
   */
  const renderCharts = () => (
    <Card className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => { h.tap(); setChartsOpen((o) => !o) }}
        aria-expanded={chartsOpen}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-right"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <TrendingUp size={16} className="text-primary-600" />
          نمودار درآمد و روش‌های پرداخت
        </span>
        <ChevronDown
          size={18}
          className={`text-slate-400 shrink-0 transition-transform ${chartsOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {chartsOpen && (
        <div className="px-3 pb-3">
          {renderChartBodies()}
        </div>
      )}
    </Card>
  )

  const renderChartBodies = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Revenue Chart */}
      <Card className="p-4 md:p-6 lg:col-span-2">
        <h3 className="text-sm font-bold text-slate-700 mb-3">درآمد ۶ ماه اخیر</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={revenueChartData}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
            <RTooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => [`${formatCurrency(value)} تومان`, 'درآمد']}
            />
            <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Payment Methods Pie */}
      <Card className="p-4 md:p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">روش‌های پرداخت</h3>
        {pieChartData.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-sm text-slate-400">داده‌ای موجود نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {pieChartData.map((_, i) => (
                  <RCell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <RTooltip formatter={(value: number) => `${formatCurrency(value)} ت`} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="mt-2 space-y-1">
          {pieChartData.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
              <span className="text-slate-600">{d.name}</span>
              <span className="text-slate-400 mr-auto">{formatCurrency(d.value)} ت</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  // ===========================================================================
  // Render: Payments Tab
  // ===========================================================================

  const handlePrintReceipt = (p: Payment) => {
    const methodMeta = paymentMethods.find((m) => m.value === p.payment_method) || paymentMethods[0]
    const win = window.open('', '_blank', 'width=550,height=700')
    if (!win) { showToast('error', 'اجازه‌ی باز کردن پنجره‌ی چاپ داده نشد'); return }
    const receiptStyles = `
        body { font-family: Tahoma, Arial, sans-serif; padding: 32px; color: #1e293b; }
        .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { color: #0d9488; margin: 0 0 4px; font-size: 22px; }
        .header p { margin: 0; color: #64748b; font-size: 13px; }
        .amount { text-align: center; font-size: 32px; font-weight: 800; color: #0d9488; margin: 24px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        td { padding: 10px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
        td:first-child { color: #64748b; font-weight: bold; width: 40%; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }
        @media print { body { padding: 12px; } }
      `
    const receiptBody = `
        <div class="header"><h1>کلینیک دندانپزشکی مینا</h1><p>رسید پرداخت</p></div>
        <div class="amount">${formatCurrency(p.amount)} تومان</div>
        <table>
          <tr><td>بیمار</td><td>${getPatientName(p.patient_id)}</td></tr>
          ${(() => {
            const a = resolveAttribution(p, treatments as never, doctors as never)
            const rows: string[] = []
            if (a.procedureName) rows.push(`<tr><td>بابت</td><td>${a.procedureName}${a.toothNumber ? ` — دندان ${toothLabel(a.toothNumber)}` : ''}</td></tr>`)
            if (a.doctorName) rows.push(`<tr><td>پزشک</td><td>دکتر ${a.doctorName}</td></tr>`)
            return rows.join('')
          })()}
          <tr><td>روش پرداخت</td><td>${methodMeta.label}</td></tr>
          <tr><td>تاریخ</td><td>${toJalaliStringPretty(p.payment_date)}</td></tr>
          ${p.reference ? `<tr><td>شماره مرجع</td><td dir="ltr">${p.reference}</td></tr>` : ''}
        </table>
        <div class="footer"><span>مینادنت — سیستم مدیریت کلینیک</span><span>مهر و امضا</span></div>
      `
    win.document.write(buildPrintDocument({ title: 'رسید پرداخت', styles: receiptStyles, bodyHtml: receiptBody, shareText: `رسید پرداخت — مینادنت\nبیمار: ${getPatientName(p.patient_id)}\nمبلغ: ${formatCurrency(p.amount)} ت\nتاریخ: ${toJalaliStringPretty(p.payment_date)}` }))
    win.document.close()
    win.focus()
  }

  const renderPaymentsTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجوی بیمار..." aria-label="جستجوی بیمار" className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <Button variant="secondary" size="md" onClick={() => setShowFilters(!showFilters)}><Filter size={16} /> فیلتر</Button>
        <Button onClick={() => { setPaymentWizardStep(0); setPaymentModalOpen(true) }}><Plus size={16} /> ثبت پرداخت</Button>
      </div>

      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select label="روش پرداخت" value={filterMethod} onChange={setFilterMethod} options={paymentMethods.map((m) => ({ value: m.value, label: m.label }))} placeholder="همه روش‌ها" />
            <Select label="وضعیت" value={filterStatus} onChange={setFilterStatus} options={paymentStatuses.map((s) => ({ value: s.value, label: s.label }))} placeholder="همه وضعیت‌ها" />
          </div>
        </Card>
      )}

      {filteredPayments.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<CreditCard size={32} />} title="پرداختی یافت نشد" /></Card>
      ) : (
        <div className="space-y-2">
          {filteredPayments.map((p) => {
            const methodMeta = paymentMethods.find((m) => m.value === p.payment_method) || paymentMethods[0]
            const statusMeta = paymentStatuses.find((s) => s.value === p.status) || paymentStatuses[0]
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${methodMeta.color}-50 text-${methodMeta.color}-600 flex items-center justify-center`}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(p.amount)} تومان</p>
                      <p className="text-xs text-slate-500">{getPatientName(p.patient_id)} - {methodMeta.label} - {toJalaliStringPretty(p.payment_date)}</p>
                      {/* MOD-FEAT-020: shown for every payment, including the
                          older ones that predate attribution — «بابت مشخص
                          نشده» is information, not noise: it marks exactly
                          which rows still need a human to say what they were
                          for. */}
                      <p className="text-[11px] text-slate-400 mt-0.5">{resolveAttribution(p, treatments as never, doctors as never).label}</p>
                      {/* MOD-FEAT-027: «فقط پرداختی نیست — مقدار بدهی هم
                          باید قید بشه». A payment row that shows only what
                          came in cannot answer the question actually being
                          asked at the desk: is this patient settled now? */}
                      {(() => {
                        const bal = patientBalancesMap.get(p.patient_id)?.balance ?? 0
                        return bal > 0 ? (
                          <p className="text-[11px] font-bold text-error-600 mt-0.5">
                            مانده‌حساب این بیمار: {formatCurrency(bal)} ت
                          </p>
                        ) : (
                          <p className="text-[11px] text-success-600 mt-0.5">این بیمار تسویه است</p>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.reference && <span className="text-xs text-slate-400" dir="ltr">{p.reference}</span>}
                    <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                  </div>
                </div>
                {p.notes && <p className="text-xs text-slate-400 mt-2">{p.notes}</p>}
                <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
                  <button onClick={() => handlePrintReceipt(p)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-primary-600 hover:bg-primary-50 transition-colors"><Printer size={12} /> چاپ رسید</button>
                  <button onClick={() => {
                    h.warning()
                    // Per clinic policy: a recorded payment is never
                    // permanently deleted — that would erase an
                    // accounting/legal record with no way back. Marking
                    // it 'failed' instead reuses updatePayment's existing,
                    // already-correct recalculation of the linked
                    // encounter/implant-case paid_amount (it recomputes
                    // from all still-'completed' payments), so the
                    // balance corrects itself exactly as a real reversal
                    // would — the record itself just stays, permanently.
                    confirmAction({
                      type: 'status', title: 'لغو پرداخت',
                      warning: 'این پرداخت هیچ‌وقت پاک نمی‌شود — فقط لغو می‌شود و از مانده‌حساب کسر می‌گردد، سابقه‌اش برای همیشه باقی می‌ماند.',
                      fields: [{ label: 'مبلغ', value: `${formatCurrency(p.amount)} ت`, highlight: true }, { label: 'بیمار', value: getPatientName(p.patient_id) }],
                      confirmLabel: 'تایید لغو',
                      onConfirm: async () => { try { await updatePayment(p.id, { status: 'failed' } as any); showToast('success', 'پرداخت لغو شد — مانده‌حساب اصلاح شد'); loadData() } catch { showToast('error', 'خطا در لغو') } },
                    })
                  }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-error-600 hover:bg-error-50 transition-colors"><Trash2 size={12} /> لغو پرداخت</button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  // ===========================================================================
  // Render: Cash Register Tab (صندوق‌داری هوشمند)
  // ===========================================================================

  const handleOpenRegister = () => {
    const opening = Number(openingBalanceInput) || 0
    confirmAction({
      type: 'create',
      title: 'باز کردن صندوق',
      fields: [{ label: 'موجودی اولیه', value: `${formatCurrency(opening)} ت`, highlight: true }],
      confirmLabel: 'باز کردن',
      onConfirm: async () => {
        setSavingRegister(true)
        try {
          await openCashRegisterSession(opening)
          showToast('success', 'صندوق باز شد')
          setOpeningBalanceInput('')
          await loadData()
        } catch (err) { showToast('error', err instanceof Error ? err.message : 'خطا در باز کردن صندوق') }
        finally { setSavingRegister(false) }
      },
    })
  }

  // Expected cash = opening balance + every completed CASH payment
  // recorded since the register opened — the real-world number that
  // should be sitting in the physical drawer right now.
  //
  // Uses created_at (the real moment the payment was entered into the
  // system), not payment_date (a date-only field staff can backdate to
  // "when the money was actually received"). Comparing against
  // payment_date caused false discrepancies: a cash payment recorded
  // this morning with today's payment_date would count toward a
  // register opened this afternoon, even though that cash was never in
  // *this* session's drawer — and the same bug would silently pull in
  // payments from an earlier, already-closed session on the same day.
  const expectedCashInDrawer = useMemo(() => {
    if (!openSession) return 0
    const cashSincOpen = payments
      .filter((p) => p.status === 'completed' && p.payment_method === 'cash' && p.created_at >= openSession.opened_at)
      .reduce((s, p) => s + p.amount, 0)
    return openSession.opening_balance + cashSincOpen
  }, [openSession, payments])

  const handleCloseRegister = () => {
    if (!openSession) return
    const counted = Number(countedBalanceInput) || 0
    const discrepancy = counted - expectedCashInDrawer
    confirmAction({
      type: 'status',
      title: 'بستن صندوق',
      warning: discrepancy !== 0 ? `مغایرت ${formatCurrency(Math.abs(discrepancy))} تومان ${discrepancy > 0 ? '(اضافه)' : '(کسری)'} شناسایی شد` : undefined,
      fields: [
        { label: 'موجودی مورد انتظار', value: `${formatCurrency(expectedCashInDrawer)} ت` },
        { label: 'موجودی شمارش‌شده', value: `${formatCurrency(counted)} ت`, highlight: true },
        { label: 'مغایرت', value: `${discrepancy === 0 ? 'بدون مغایرت' : formatCurrency(Math.abs(discrepancy)) + ' ت'}` },
      ],
      confirmLabel: 'بستن صندوق',
      onConfirm: async () => {
        setSavingRegister(true)
        try {
          await closeCashRegisterSession(openSession.id, expectedCashInDrawer, counted, closingNotes || null)
          showToast('success', 'صندوق بسته شد')
          setCountedBalanceInput(''); setClosingNotes('')
          await loadData()
        } catch { showToast('error', 'خطا در بستن صندوق') }
        finally { setSavingRegister(false) }
      },
    })
  }

  const renderCashRegisterTab = () => (
    <div className="space-y-4">
      {!openSession ? (
        <Card className="p-5 text-center">
          <Wallet size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700 mb-1">صندوق بسته است</p>
          <p className="text-xs text-slate-500 mb-4">برای شروع کار روزانه، صندوق را با موجودی اولیه باز کنید</p>
          <div className="max-w-xs mx-auto space-y-3">
            <CurrencyInput label="موجودی اولیه (تومان)" value={openingBalanceInput} onChange={setOpeningBalanceInput} />
            <Button variant="primary" onClick={handleOpenRegister} disabled={savingRegister} className="w-full justify-center">
              {savingRegister ? <Spinner size={16} /> : 'باز کردن صندوق'}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-slate-800">صندوق باز است</p>
                <p className="text-xs text-slate-400">از {toJalaliStringPretty(openSession.opened_at.slice(0, 10))}</p>
              </div>
              <Badge color="success">فعال</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-[11px] text-slate-400">موجودی اولیه</p>
                <p className="text-sm font-extrabold text-slate-700">{formatCurrency(openSession.opening_balance)} ت</p>
              </div>
              <div className="p-3 rounded-xl bg-primary-50">
                <p className="text-[11px] text-primary-500">موجودی مورد انتظار الان</p>
                <p className="text-sm font-extrabold text-primary-700">{formatCurrency(expectedCashInDrawer)} ت</p>
              </div>
            </div>
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500">بستن صندوق (پایان روز)</p>
              <CurrencyInput label="موجودی شمارش‌شده (تومان)" value={countedBalanceInput} onChange={setCountedBalanceInput} />
              <Textarea label="یادداشت (اختیاری)" value={closingNotes} onChange={setClosingNotes} rows={2} placeholder="توضیح مغایرت در صورت وجود" />
              <Button variant="primary" onClick={handleCloseRegister} disabled={savingRegister || !countedBalanceInput} className="w-full justify-center">
                {savingRegister ? <Spinner size={16} /> : 'بستن صندوق'}
              </Button>
            </div>
          </Card>
        </>
      )}

      {cashSessions.filter((s) => s.status === 'closed').length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 mb-2">تاریخچه‌ی صندوق</p>
          <div className="space-y-2">
            {cashSessions.filter((s) => s.status === 'closed').slice(0, 15).map((s) => (
              <Card key={s.id} className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{toJalaliStringPretty(s.opened_at.slice(0, 10))}</span>
                  {s.discrepancy === 0 ? (
                    <Badge color="success">بدون مغایرت</Badge>
                  ) : (
                    <Badge color="error">مغایرت {formatCurrency(Math.abs(s.discrepancy || 0))} ت</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-slate-500">
                  <span>اولیه: {formatCurrency(s.opening_balance)}</span>
                  <span>مورد انتظار: {formatCurrency(s.expected_closing_balance || 0)}</span>
                  <span>شمارش‌شده: {formatCurrency(s.counted_closing_balance || 0)}</span>
                </div>
                {s.notes && <p className="text-[11px] text-slate-400 mt-1.5">{s.notes}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ===========================================================================
  // Render: Cheques Tab
  // ===========================================================================

  const renderChequesTab = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجوی بیمار..." aria-label="جستجوی بیمار" className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <Button variant="secondary" size="md" onClick={() => setShowFilters(!showFilters)}><Filter size={16} /> فیلتر</Button>
        <Button onClick={() => { setChequeWizardStep(0); setChequeModalOpen(true) }}><Plus size={16} /> ثبت چک</Button>
      </div>

      {showFilters && (
        <Card className="p-4">
          <Select label="وضعیت چک" value={filterChequeStatus} onChange={setFilterChequeStatus} options={chequeStatuses.map((s) => ({ value: s.value, label: s.label }))} placeholder="همه وضعیت‌ها" />
        </Card>
      )}

      {filteredCheques.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Banknote size={32} />} title="چکی یافت نشد" /></Card>
      ) : (
        <div className="space-y-2">
          {filteredCheques.map((c) => {
            const statusMeta = chequeStatuses.find((s) => s.value === c.status) || chequeStatuses[0]
            const dueDate = new Date(c.due_date)
            const now = new Date()
            const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            const isOverdue = daysLeft < 0 && c.status === 'pending'
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-error-50 text-error-600' : statusMeta.color === 'success' ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'}`}>
                      <Banknote size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(c.amount)} تومان</p>
                        {c.purpose === 'guarantee' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-bold">ضمانت طرح قسطی</span>
                        )}
                        {(c as any).installment_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-100 text-primary-700 font-bold">چک قسط</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {getPatientName(c.patient_id)} - سررسید: {toJalaliStringPretty(c.due_date)}
                      </p>
                      {c.bank_name && <p className="text-xs text-slate-400">بانک: {c.bank_name} {c.cheque_number && `- شماره: ${toPersianDigits(c.cheque_number)}`}</p>}
                      {(c as any).sayad_id && <p className="text-[11px] text-slate-400">شناسه صیاد: {toPersianDigits((c as any).sayad_id)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverdue && <Badge color="error">علی‌رغم سررسید</Badge>}
                    {c.status === 'pending' && !isOverdue && daysLeft <= 7 && <Badge color="warning">{toPersianDigits(daysLeft)} روز مانده</Badge>}
                    <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                    {/* Quick status change */}
                    <select
                      value={c.status}
                      onChange={(e) => quickChequeStatusChange(c, e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-400"
                    >
                      {chequeStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    {c.status !== 'cleared' && (
                      <button onClick={() => handleDeleteCheque(c)} aria-label="لغو چک" className="p-1.5 rounded-lg text-slate-400 hover:text-error-600 hover:bg-error-50 transition-colors"><Trash2 size={14} /></button>
                    )}
                    {c.status === 'pending' && (
                      <button
                        onClick={() => downloadICSReminder({
                          title: `سررسید چک — ${getPatientName(c.patient_id)}`,
                          description: `مبلغ ${formatCurrency(c.amount)} تومان`,
                          dueDate: c.due_date,
                          filename: `cheque-reminder-${c.id}.ics`,
                        })}
                        aria-label="افزودن یادآوری به تقویم گوشی"
                        title="افزودن یادآوری به تقویم گوشی"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <CalendarClock size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {c.notes && <p className="text-xs text-slate-400 mt-2">{c.notes}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  // ===========================================================================
  // Render: Payment Plans Tab
  // ===========================================================================

  const renderPlansTab = () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">طرح‌های قسطی</h3>
        <Button onClick={() => { setPlanWizardStep(0); setPlanModalOpen(true) }}><Plus size={16} /> طرح قسطی جدید</Button>
      </div>

      {paymentPlans.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Calendar size={32} />} title="طرح قسطی ثبت نشده" /></Card>
      ) : (
        <div className="space-y-3">
          {paymentPlans.map((plan) => {
            const statusMeta = planStatuses.find((s) => s.value === plan.status) || planStatuses[0]
            const installments = (plan as any).installments || []
            // Progress comes from the tested helper: it excludes
            // cancelled rows, which the inline version counted as money
            // still owed forever.
            const prog = planProgress(installments, todayStr)
            const paidCount = prog.paidCount
            const paidAmount = prog.paid
            const progress = prog.total > 0 ? (prog.paid / prog.total) * 100 : 0
            // If someone edited an instalment after the plan was agreed,
            // the rows and the header disagree. Say so rather than
            // showing whichever number happens to be rendered.
            const check = reconcilePlan({ planTotal: plan.total_amount, installments })
            return (
              <Card key={plan.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{getPatientName(plan.patient_id)}</p>
                    <p className="text-xs text-slate-500">مبلغ کل: {formatCurrency(plan.total_amount)} تومان - {toPersianDigits(plan.installment_count)} قسط</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                    {paidCount === 0 && (
                      <button onClick={() => handleDeletePlan(plan)} aria-label="لغو طرح قسطی" className="p-1.5 rounded-lg text-slate-400 hover:text-error-600 hover:bg-error-50 transition-colors"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>{toPersianDigits(paidCount)} از {toPersianDigits(plan.installment_count)} قسط پرداخت شده</span>
                    <span>{formatCurrency(paidAmount)} / {formatCurrency(plan.total_amount)} ت</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-success-500 transition-all-smooth" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mt-1.5 text-xs">
                    {prog.overdueCount > 0 && (
                      <span className="text-error-600 font-medium">{toPersianDigits(prog.overdueCount)} قسط سررسید گذشته</span>
                    )}
                    {prog.nextDue && (
                      <span className="text-slate-500">قسط بعدی: {toJalaliString(prog.nextDue)}</span>
                    )}
                  </div>
                  {!check.ok && (
                    <p className="mt-2 text-xs text-amber-700">
                      ⚠ {check.message} ({formatCurrency(Math.abs(check.difference))} ت اختلاف)
                    </p>
                  )}
                </div>

                {/* Installments */}
                {installments.length > 0 && (
                  <div className="space-y-1.5">
                    {installments.map((inst: any) => (
                      <div key={inst.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">قسط {toPersianDigits(inst.installment_number)}</span>
                          <span className="text-sm text-slate-700">{formatCurrency(inst.amount)} ت</span>
                          <span className="text-xs text-slate-400">سررسید: {toJalaliStringPretty(inst.due_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {inst.status === 'paid' ? (
                            <Badge color="success"><CheckCircle2 size={10} /> پرداخت شده</Badge>
                          ) : inst.status === 'overdue' ? (
                            <Badge color="error">نکول</Badge>
                          ) : (
                            <>
                              <Badge color="warning">در انتظار</Badge>
                              <Button size="sm" variant="success" onClick={() => markInstallmentPaid(inst, plan)}>نقدی</Button>
                              <Button size="sm" variant="secondary" onClick={() => { h.tap(); setChequeInstallment({ inst, plan }); setInstChequeForm({ bank_name: '', cheque_number: '', account_number: '', sayad_id: '', due_date: inst.due_date, payee_name: '' }) }}>با چک</Button>
                              <button
                                onClick={() => { h.tap(); setRescheduleInstallment(inst); setRescheduleDate(inst.due_date) }}
                                aria-label="تغییر موعد قسط"
                                title="تغییر موعد قسط — مثلاً وقتی بیمار می‌گوید دیرتر پرداخت می‌کند"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-warning-600 hover:bg-warning-50 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => downloadICSReminder({
                                  title: `سررسید قسط — ${getPatientName(plan.patient_id)}`,
                                  description: `قسط ${inst.installment_number} — مبلغ ${formatCurrency(inst.amount)} تومان`,
                                  dueDate: inst.due_date,
                                  filename: `installment-reminder-${inst.id}.ics`,
                                })}
                                aria-label="افزودن یادآوری به تقویم گوشی"
                                title="افزودن یادآوری به تقویم گوشی"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              >
                                <CalendarClock size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {plan.notes && <p className="text-xs text-slate-400 mt-2">{plan.notes}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
    )
  }

  // ===========================================================================
  // Render: Patient Balances Tab
  // ===========================================================================

  // ── Expenses Tab ──────────────────────────────────────────
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const openCreateExpense = () => {
    setEditingExpense(null)
    setExpenseForm({ category: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10), payment_method: 'cash' })
    setExpenseWizardStep(0)
    setExpenseModalOpen(true)
  }

  const openEditExpense = (e: Expense) => {
    setEditingExpense(e)
    setExpenseForm({ category: e.category, amount: String(e.amount), description: e.description || '', date: e.date, payment_method: e.payment_method || 'cash' })
    setExpenseWizardStep(0)
    setExpenseModalOpen(true)
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.category.trim() || !expenseForm.amount) { showToast('error', 'دسته‌بندی و مبلغ الزامی است'); return }
    setSavingExpense(true)
    try {
      const payload = {
        category: expenseForm.category.trim(),
        amount: Number(expenseForm.amount),
        description: expenseForm.description || null,
        date: expenseForm.date,
        payment_method: expenseForm.payment_method,
        reference: null,
      }
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload)
        showToast('success', 'هزینه ویرایش شد')
      } else {
        await createExpense({ clinic_id: undefined as any, ...payload })
        showToast('success', 'هزینه ثبت شد')
      }
      setExpenseModalOpen(false)
      loadData()
    } catch { showToast('error', 'خطا در ثبت هزینه') } finally { setSavingExpense(false) }
  }

  const handleDeleteExpense = (e: Expense) => {
    h.tap()
    confirmAction({
      type: 'status',
      title: 'غیرفعال کردن هزینه',
      fields: [{ label: 'دسته‌بندی', value: e.category, highlight: true }, { label: 'مبلغ', value: `${formatCurrency(e.amount)} ت` }],
      confirmLabel: 'غیرفعال کن',
      onConfirm: async () => { await deactivateExpense(e.id); showToast('success', 'غیرفعال شد'); loadData() },
    })
  }

  const renderExpensesTab = () => {
    // Reuse the single already-memoized totalExpenses from `stats` instead of
    // recomputing it from scratch on every render — keeps this number
    // provably identical to the one shown elsewhere and avoids drift if the
    // stats calculation ever gains filtering logic that this copy wouldn't.
    const { totalExpenses } = stats

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <ModuleStatCard moduleKey="billing" icon={<Receipt size={20} />} label="کل هزینه‌ها" value={`${formatCurrency(totalExpenses)} ت`} />
          </div>
          <Button variant="primary" size="sm" onClick={openCreateExpense}><Plus size={16} className="inline ml-1" /> هزینه جدید</Button>
        </div>

        {expenses.length === 0 ? (
          <Card className="p-5">
            <EmptyState icon={<Receipt size={28} />} title="هزینه‌ای ثبت نشده است" description="برای ثبت هزینه جدید کلیک کنید" action={<Button size="sm" onClick={openCreateExpense}><Plus size={16} /> افزودن</Button>} />
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">دسته‌بندی</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">مبلغ</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">تاریخ</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">توضیحات</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all-smooth">
                      <td className="px-4 py-3 font-medium text-slate-800">{e.category}</td>
                      <td className="px-4 py-3 text-error-600 font-bold">{formatCurrency(e.amount)} ت</td>
                      <td className="px-4 py-3 text-slate-600">{e.date ? toJalaliString(e.date) : '-'}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{e.description || '-'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEditExpense(e)} aria-label="ویرایش هزینه" className="text-slate-400 hover:text-primary-600 hover:bg-primary-50 p-1.5 rounded-lg transition-colors"><Edit2 size={15} /></button>
                        <button onClick={() => handleDeleteExpense(e)} aria-label="غیرفعال کردن هزینه" className="text-slate-400 hover:text-error-600 hover:bg-error-50 p-1.5 rounded-lg transition-colors"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    )
  }

  const renderExpenseModal = () => (
    <Wizard
      open={expenseModalOpen}
      onClose={() => setExpenseModalOpen(false)}
      title={editingExpense ? 'ویرایش هزینه' : 'ثبت هزینه'}
      step={expenseWizardStep}
      onStepChange={setExpenseWizardStep}
      onFinish={handleSaveExpense}
      finishLabel={editingExpense ? 'ذخیره' : 'ثبت هزینه'}
      saving={savingExpense}
      steps={[
        {
          label: 'مبلغ و دسته',
          validate: () => (!expenseForm.category.trim() ? 'دسته‌بندی الزامی است' : (!expenseForm.amount || Number(expenseForm.amount) <= 0) ? 'مبلغ الزامی است' : null),
          content: (
            <>
              <Input label="دسته‌بندی" value={expenseForm.category} onChange={(v) => setExpenseForm((p) => ({ ...p, category: v }))} placeholder="مثال: اجاره، حقوق، تجهیزات..." />
              <CurrencyInput label="مبلغ (تومان)" value={expenseForm.amount} onChange={(v) => setExpenseForm((p) => ({ ...p, amount: v }))} />
              <PersianDateInput label="تاریخ" value={expenseForm.date} onChange={(v) => setExpenseForm((p) => ({ ...p, date: v }))} />
            </>
          ),
        },
        {
          label: 'پرداخت و توضیحات',
          content: (
            <>
              <Select label="روش پرداخت" value={expenseForm.payment_method} onChange={(v) => setExpenseForm((p) => ({ ...p, payment_method: v }))} options={paymentMethods.map((m) => ({ value: m.value, label: m.label }))} />
              <Textarea label="توضیحات" value={expenseForm.description} onChange={(v) => setExpenseForm((p) => ({ ...p, description: v }))} placeholder="توضیحات..." rows={3} />
            </>
          ),
        },
      ]}
    />
  )

  const renderBalancesTab = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">مانده حساب بیماران</h3>
        <Badge color="error">کل: {formatCurrency(stats.outstandingBalance)} ت</Badge>
      </div>

      {patientBalanceList.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<CheckCircle2 size={32} />} title="مطالبات معوقی وجود ندارد" description="همه حساب‌ها تسویه هستند" /></Card>
      ) : (
        <div className="space-y-2">
          {patientBalanceList.map((b) => (
            <Card key={b.patientId} className="p-4 cursor-pointer hover:card-shadow-lg transition-all-smooth" >
              <div className="flex items-center justify-between gap-3" onClick={() => navigate(`/patients/${b.patientId}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-error-50 text-error-600 flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{getPatientName(b.patientId)}</p>
                    <p className="text-xs text-slate-400">مانده حساب</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-error-700">{formatCurrency(b.balance)} ت</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  // ===========================================================================
  // Render: Modals
  // ===========================================================================

  const encounterOptions = encounters.filter((e) => e.patient_id === paymentForm.patient_id).map((e) => ({ value: e.id, label: `ویزیت ${toJalaliStringPretty(e.encounter_date)}` }))
  const implantCaseOptions = implantCases.filter((c) => c.patient_id === paymentForm.patient_id).map((c) => ({ value: c.id, label: `پرونده ایمپلنت - ${formatCurrency(c.total_cost || 0)} ت` }))

  // MOD-FEAT-020: «بابت کدام درمان». Each option carries the tooth and the
  // remaining amount, because the two questions asked at the desk are
  // always "which tooth is this for" and "how much is still owed on it".
  const patientTreatmentIds = treatments.filter((t) => t.patient_id === paymentForm.patient_id).map((t) => t.id)
  const treatmentOptions = attributableTreatments(treatments as never, patientTreatmentIds, paymentForm.treatment_id || null)
    .map((t) => {
      const remaining = treatmentRemaining(t, payments as never)
      const tooth = t.tooth_number ? ` — دندان ${toothLabel(t.tooth_number)}` : ''
      return { value: t.id, label: `${t.procedure_name || 'رویه'}${tooth} — مانده ${formatCurrency(remaining)} ت` }
    })

  const renderPaymentModal = () => (
    <Wizard
      open={paymentModalOpen}
      onClose={() => { h.cancel(); setPaymentModalOpen(false) }}
      title="ثبت پرداخت جدید"
      step={paymentWizardStep}
      onStepChange={setPaymentWizardStep}
      onFinish={handleSavePayment}
      finishLabel="ثبت"
      saving={savingPayment}
      steps={[
        {
          label: 'بیمار و مبلغ',
          validate: () => (!paymentForm.patient_id ? 'انتخاب بیمار الزامی است' : (!paymentForm.amount || Number(paymentForm.amount) <= 0) ? 'مبلغ را وارد کنید' : null),
          content: (
            <>
              <PatientSelect value={paymentForm.patient_id} onChange={(v) => setPaymentForm((p) => ({ ...p, patient_id: v, encounter_id: '', implant_case_id: '' }))} patients={patients} balances={patientBalancesMap} />
              {paymentForm.patient_id && (() => {
                const fin = patientBalancesMap.get(paymentForm.patient_id)
                if (!fin) return null
                return (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">کل هزینه‌ی درمان</span>
                      <span className="font-bold text-slate-700">{formatCurrency(fin.totalCost)} ت</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">قبلاً پرداخت‌شده</span>
                      <span className="font-bold text-success-600">{formatCurrency(fin.paid)} ت</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1.5 border-t border-slate-200">
                      <span className="font-bold text-slate-700">مانده‌حساب</span>
                      <span className={`font-extrabold ${fin.balance > 0 ? 'text-error-600' : 'text-success-600'}`}>{formatCurrency(Math.abs(fin.balance))} ت {fin.balance > 0 ? '(بدهکار)' : fin.balance < 0 ? '(بستانکار)' : ''}</span>
                    </div>
                    {fin.balance > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentForm((p) => ({ ...p, amount: String(fin.balance) }))}
                        className="text-[11px] text-primary-600 font-semibold hover:underline"
                      >
                        پر کردن مبلغ با کل بدهی
                      </button>
                    )}
                    {fin.balance <= 0 && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-warning-700 bg-warning-50 px-2 py-1.5 rounded-lg">
                        <AlertCircle size={12} className="shrink-0" />
                        این بیمار تسویه‌حساب کامل دارد — قبل از ثبت پرداخت جدید مطمئن شوید که این پرداخت تکراری نیست.
                      </div>
                    )}
                  </div>
                )
              })()}
              {paymentForm.patient_id && encounterOptions.length > 0 && (
                <Select label="ویزیت مرتبط" value={paymentForm.encounter_id} onChange={(v) => setPaymentForm((p) => ({ ...p, encounter_id: v, implant_case_id: v ? '' : p.implant_case_id }))} options={encounterOptions} placeholder="بدون ویزیت" />
              )}
              {/* MOD-FEAT-020: without this the ledger could say who paid and
                  how much, but never what for — leaving "which tooth was
                  this, and whose work?" unanswerable. Shown on its own
                  condition: a patient can have treatments recorded outside
                  any visit this form knows about. */}
              {paymentForm.patient_id && treatmentOptions.length > 0 && (
                <Select
                  label="بابت کدام درمان"
                  value={paymentForm.treatment_id}
                  onChange={(v) => {
                    const t = treatments.find((x) => x.id === v)
                    setPaymentForm((p) => ({
                      ...p,
                      treatment_id: v,
                      // Following the treatment keeps the payment on the same
                      // visit as the work it settles.
                      encounter_id: t?.encounter_id || p.encounter_id,
                    }))
                  }}
                  options={treatmentOptions}
                  placeholder="بابت مشخص نشده"
                />
              )}
              {paymentForm.patient_id && implantCaseOptions.length > 0 && (
                <Select label="پرونده ایمپلنت مرتبط" value={paymentForm.implant_case_id} onChange={(v) => setPaymentForm((p) => ({ ...p, implant_case_id: v, encounter_id: v ? '' : p.encounter_id }))} options={implantCaseOptions} placeholder="بدون پرونده ایمپلنت" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput label="مبلغ (تومان)" value={paymentForm.amount} onChange={(v) => setPaymentForm((p) => ({ ...p, amount: v }))} />
                <Input
                  label="تخفیف (٪)"
                  type="number"
                  value={paymentForm.discountPercent || ''}
                  onChange={(v) => {
                    const fin = patientBalancesMap.get(paymentForm.patient_id)
                    const base = fin ? fin.balance : Number(paymentForm.amount) || 0
                    const pct = Number(v) || 0
                    setPaymentForm((p) => ({ ...p, discountPercent: v, amount: pct > 0 && base > 0 ? String(Math.round(base * (1 - pct / 100))) : p.amount }))
                  }}
                  placeholder="0"
                />
              </div>
            </>
          ),
        },
        {
          label: 'روش و تاریخ',
          validate: () => (!paymentForm.payment_method ? 'انتخاب روش پرداخت الزامی است' : null),
          content: (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="روش پرداخت *"
                  value={paymentForm.payment_method}
                  onChange={(v) => {
                    // چک/اقساط/بیمه aren't really "how this one payment
                    // was received" the way cash/card/transfer are — each
                    // has its own real record type with fields a plain
                    // Payment can't hold (cheque number+bank+due date,
                    // a whole installment schedule + guarantee cheque,
                    // an insurance claim + company). Recording them as a
                    // bare 'payment' here would create a disconnected,
                    // incomplete duplicate of the real tracked record —
                    // so instead of continuing this wizard, jump straight
                    // into the correct dedicated flow with the same
                    // patient (and amount, where that carries over
                    // meaningfully) already filled in.
                    if (v === 'cheque') {
                      setPaymentModalOpen(false)
                      setChequeForm((p) => ({ ...p, patient_id: paymentForm.patient_id, amount: paymentForm.amount }))
                      setChequeWizardStep(0)
                      setChequeModalOpen(true)
                      return
                    }
                    if (v === 'installment') {
                      setPaymentModalOpen(false)
                      setPlanForm((p) => ({ ...p, patient_id: paymentForm.patient_id, total_amount: paymentForm.amount }))
                      setPlanWizardStep(0)
                      setPlanModalOpen(true)
                      return
                    }
                    if (v === 'insurance') {
                      setPaymentModalOpen(false)
                      navigate('/insurance', { state: { quickStartPatientId: paymentForm.patient_id, quickStartAmount: paymentForm.amount } })
                      return
                    }
                    setPaymentForm((p) => ({ ...p, payment_method: v }))
                  }}
                  options={paymentMethods.map((m) => ({ value: m.value, label: m.label }))}
                  placeholder="انتخاب روش پرداخت..."
                />
                <Select label="وضعیت" value={paymentForm.status} onChange={(v) => setPaymentForm((p) => ({ ...p, status: v }))} options={paymentStatuses.map((s) => ({ value: s.value, label: s.label }))} />
              </div>
              <PersianDateInput label="تاریخ پرداخت" value={paymentForm.payment_date} onChange={(v) => setPaymentForm((p) => ({ ...p, payment_date: v }))} />
              <Input label="شماره مرجع" value={paymentForm.reference} onChange={(v) => setPaymentForm((p) => ({ ...p, reference: v }))} placeholder="شماره تراکنش" dir="ltr" />
            </>
          ),
        },
        {
          label: 'یادداشت',
          content: (
            <Textarea label="یادداشت" value={paymentForm.notes} onChange={(v) => setPaymentForm((p) => ({ ...p, notes: v }))} rows={3} />
          ),
        },
      ]}
    />
  )

  const renderChequeModal = () => (
    <Wizard
      open={chequeModalOpen}
      onClose={() => { h.cancel(); setChequeModalOpen(false) }}
      title="ثبت چک جدید"
      step={chequeWizardStep}
      onStepChange={setChequeWizardStep}
      onFinish={handleSaveCheque}
      finishLabel="ثبت چک"
      saving={savingCheque}
      steps={[
        {
          label: 'بیمار و مبلغ',
          validate: () => {
            const { error } = validateCheque({
              patient_id: chequeForm.patient_id, amount: chequeForm.amount,
              isGuarantee: chequeForm.isGuarantee, payment_plan_id: chequeForm.payment_plan_id || null,
            }, 'basics')
            return error
          },
          content: (
            <>
              <PatientSelect value={chequeForm.patient_id} onChange={(v) => setChequeForm((p) => ({ ...p, patient_id: v }))} patients={patients} balances={patientBalancesMap} />
              <CurrencyInput label="مبلغ (تومان)" value={chequeForm.amount} onChange={(v) => setChequeForm((p) => ({ ...p, amount: v }))} />
              <Input label="در وجه" value={chequeForm.payee_name} onChange={(v) => setChequeForm((p) => ({ ...p, payee_name: v }))} />

              {/* MOD-FEAT-029: the two kinds carry different obligations —
                  one gets banked, the other gets held — so the choice is
                  made before any of the fields that depend on it. */}
              <div className={`p-3 rounded-xl border ${chequeForm.isGuarantee ? 'border-slate-300 bg-slate-50 dark:bg-slate-800' : 'border-primary-200 bg-primary-50 dark:bg-primary-900/20'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chequeForm.isGuarantee}
                    onChange={(e) => { h.tap(); setChequeForm((p) => ({ ...p, isGuarantee: e.target.checked, payment_plan_id: '' })) }}
                    className="w-4 h-4 accent-slate-600"
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">این چک ضمانت است</span>
                </label>
                <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  {chequeModeHint(chequeForm.isGuarantee)}
                </p>
              </div>

              {chequeForm.isGuarantee && (
                <Select
                  label="طرح قسطی که این ضمانت پشتش است *"
                  value={chequeForm.payment_plan_id}
                  onChange={(v) => setChequeForm((p) => ({ ...p, payment_plan_id: v }))}
                  options={paymentPlans
                    .filter((pl) => pl.patient_id === chequeForm.patient_id)
                    .map((pl) => ({ value: pl.id, label: `طرح ${formatCurrency(pl.total_amount)} ت — ${toPersianDigits(pl.installment_count ?? 0)} قسط` }))}
                  placeholder={chequeForm.patient_id ? 'انتخاب طرح قسطی…' : 'اول بیمار را انتخاب کنید'}
                />
              )}
            </>
          ),
        },
        {
          label: 'مشخصات بانکی',
          validate: () => {
            const digits = toEnglishDigits(chequeForm.sayad_id || '').trim()
            if (digits && (digits.length !== 16 || !/^[0-9]+$/.test(digits))) {
              return 'شناسه صیاد باید ۱۶ رقم باشد'
            }
            // A payment cheque is going to be banked, so what the clinic
            // needs in order to bank it is not optional. A guarantee is
            // held, so it is.
            return validateCheque({
              patient_id: chequeForm.patient_id, amount: chequeForm.amount,
              isGuarantee: chequeForm.isGuarantee, payment_plan_id: chequeForm.payment_plan_id || null,
              cheque_number: chequeForm.cheque_number, bank_name: chequeForm.bank_name,
              due_date: chequeForm.due_date,
            }).error
          },
          content: (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="نام بانک" value={chequeForm.bank_name} onChange={(v) => setChequeForm((p) => ({ ...p, bank_name: v }))} />
                <Input label="شعبه" value={chequeForm.branch} onChange={(v) => setChequeForm((p) => ({ ...p, branch: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="شماره چک" value={chequeForm.cheque_number} onChange={(v) => setChequeForm((p) => ({ ...p, cheque_number: v }))} dir="ltr" />
                <Input label="شماره حساب" value={chequeForm.account_number} onChange={(v) => setChequeForm((p) => ({ ...p, account_number: v }))} dir="ltr" />
              </div>
              <Input label="شناسه صیاد (اختیاری)" value={chequeForm.sayad_id} onChange={(v) => setChequeForm((p) => ({ ...p, sayad_id: v }))} placeholder="۱۶ رقمی، از روی چک" dir="ltr" />
            </>
          ),
        },
        {
          label: 'تاریخ و وضعیت',
          content: (
            <>
              <div className="grid grid-cols-2 gap-3">
                <PersianDateInput label="تاریخ صدور" value={chequeForm.issue_date} onChange={(v) => setChequeForm((p) => ({ ...p, issue_date: v }))} />
                <PersianDateInput label="تاریخ سررسید" value={chequeForm.due_date} onChange={(v) => setChequeForm((p) => ({ ...p, due_date: v }))} />
              </div>
              <Select label="وضعیت" value={chequeForm.status} onChange={(v) => setChequeForm((p) => ({ ...p, status: v }))} options={chequeStatuses.map((s) => ({ value: s.value, label: s.label }))} />
            </>
          ),
        },
        {
          label: 'یادداشت',
          content: (
            <Textarea label="یادداشت" value={chequeForm.notes} onChange={(v) => setChequeForm((p) => ({ ...p, notes: v }))} rows={3} />
          ),
        },
      ]}
    />
  )

  const renderPlanModal = () => (
    <Wizard
      open={planModalOpen}
      onClose={() => { h.cancel(); setPlanModalOpen(false) }}
      title="طرح قسطی جدید"
      step={planWizardStep}
      onStepChange={setPlanWizardStep}
      onFinish={handleSavePlan}
      finishLabel="ایجاد طرح"
      saving={savingPlan}
      steps={[
        {
          label: 'بیمار و مبلغ',
          validate: () => (!planForm.patient_id ? 'انتخاب بیمار الزامی است' : (!planForm.total_amount || Number(planForm.total_amount) <= 0) ? 'مبلغ کل را وارد کنید' : null),
          content: (
            <>
              <PatientSelect value={planForm.patient_id} onChange={(v) => setPlanForm((p) => ({ ...p, patient_id: v }))} patients={patients} balances={patientBalancesMap} />
              <CurrencyInput label="مبلغ کل (تومان)" value={planForm.total_amount} onChange={(v) => setPlanForm((p) => ({ ...p, total_amount: v }))} />
            </>
          ),
        },
        {
          label: 'اقساط',
          validate: () => (Number(planForm.installment_count) < 1 ? 'تعداد اقساط باید حداقل ۱ باشد' : null),
          content: (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="تعداد اقساط" type="number" value={planForm.installment_count} onChange={(v) => setPlanForm((p) => ({ ...p, installment_count: v }))} dir="ltr" />
                <PersianDateInput label="تاریخ شروع" value={planForm.start_date} onChange={(v) => setPlanForm((p) => ({ ...p, start_date: v }))} />
              </div>
              {planForm.total_amount && planForm.installment_count && Number(planForm.installment_count) > 0 && (
                <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-sm">
                  <p>مبلغ هر قسط: <span className="font-bold">{formatCurrency(Math.round(Number(planForm.total_amount) / Number(planForm.installment_count)))}</span> تومان</p>
                  <p className="text-xs text-primary-500 mt-1">اقساط به صورت ماهانه و از تاریخ شروع محاسبه می‌شوند</p>
                </div>
              )}
            </>
          ),
        },
        {
          label: 'چک ضمانت',
          validate: () => {
            if (!planForm.guarantee_cheque_number.trim()) return 'شماره چک ضمانت الزامی است'
            if (!planForm.guarantee_due_date) return 'تاریخ سررسید چک ضمانت الزامی است'
            const digits = toEnglishDigits(planForm.guarantee_sayad_id || '').trim()
            if (digits && (digits.length !== 16 || !/^[0-9]+$/.test(digits))) return 'شناسه صیاد باید ۱۶ رقم باشد'
            return null
          },
          content: (
            <>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm mb-1">
                <p>هر طرح قسطی نیازمند یک چک ضمانت به مبلغ کل بدهی است. این چک جدا از اقساط ماهانه (که نقدی ثبت می‌شوند) نگهداری می‌شود.</p>
                {planForm.total_amount && (
                  <p className="mt-1 font-bold">مبلغ چک ضمانت: {formatCurrency(Number(planForm.total_amount))} تومان</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="نام بانک" value={planForm.guarantee_bank_name} onChange={(v) => setPlanForm((p) => ({ ...p, guarantee_bank_name: v }))} />
                <Input label="شعبه" value={planForm.guarantee_branch} onChange={(v) => setPlanForm((p) => ({ ...p, guarantee_branch: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="شماره چک" value={planForm.guarantee_cheque_number} onChange={(v) => setPlanForm((p) => ({ ...p, guarantee_cheque_number: v }))} dir="ltr" />
                <Input label="شماره حساب" value={planForm.guarantee_account_number} onChange={(v) => setPlanForm((p) => ({ ...p, guarantee_account_number: v }))} dir="ltr" />
              </div>
              <Input label="شناسه صیاد (اختیاری)" value={planForm.guarantee_sayad_id} onChange={(v) => setPlanForm((p) => ({ ...p, guarantee_sayad_id: v }))} placeholder="۱۶ رقمی، از روی چک" dir="ltr" />
              <Input label="در وجه" value={planForm.guarantee_payee_name} onChange={(v) => setPlanForm((p) => ({ ...p, guarantee_payee_name: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <PersianDateInput label="تاریخ صدور" value={planForm.guarantee_issue_date} onChange={(v) => setPlanForm((p) => ({ ...p, guarantee_issue_date: v }))} />
                <PersianDateInput label="تاریخ سررسید" value={planForm.guarantee_due_date} onChange={(v) => setPlanForm((p) => ({ ...p, guarantee_due_date: v }))} />
              </div>
            </>
          ),
        },
        {
          label: 'یادداشت',
          content: (
            <Textarea label="یادداشت" value={planForm.notes} onChange={(v) => setPlanForm((p) => ({ ...p, notes: v }))} rows={3} />
          ),
        },
      ]}
    />
  )

  // ===========================================================================
  // Main Render
  // ===========================================================================

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size={32} /></div>
  }

  const tabs = [
    { key: 'payments', label: 'پرداخت‌ها', icon: <CreditCard size={16} /> },
    { key: 'register', label: 'صندوق', icon: <Wallet size={16} /> },
    { key: 'cheques', label: 'چک‌ها', icon: <Banknote size={16} /> },
    { key: 'plans', label: 'طرح‌های قسطی', icon: <Calendar size={16} /> },
    { key: 'expenses', label: 'هزینه‌ها', icon: <Receipt size={16} /> },
    { key: 'balances', label: 'مانده حساب', icon: <Wallet size={16} /> },
  ]

  return (
    <div className="space-y-4">
      <ModuleHeader
        moduleKey="billing"
        title="مالی و پرداخت"
        subtitle="مدیریت پرداخت‌ها، چک‌ها و طرح‌های قسطی"
      />

      {renderStats()}
      {renderCharts()}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'payments' && renderPaymentsTab()}
      {activeTab === 'register' && renderCashRegisterTab()}
      {activeTab === 'cheques' && renderChequesTab()}
      {activeTab === 'plans' && renderPlansTab()}
      {activeTab === 'expenses' && renderExpensesTab()}
      {activeTab === 'balances' && renderBalancesTab()}

      {renderPaymentModal()}
      {renderChequeModal()}
      {renderPlanModal()}
      {renderExpenseModal()}

      <Modal open={!!rescheduleInstallment} onClose={() => setRescheduleInstallment(null)} title="تغییر موعد قسط">
        <div className="space-y-3 p-1">
          {rescheduleInstallment && (
            <p className="text-xs text-slate-500">
              قسط {toPersianDigits(rescheduleInstallment.installment_number)} — {formatCurrency(rescheduleInstallment.amount)} تومان.
              موعد فعلی: {toJalaliStringPretty(rescheduleInstallment.due_date)}. یادآوری‌ها خودکار با موعد جدید هماهنگ می‌شوند.
            </p>
          )}
          <PersianDateInput label="موعد جدید" value={rescheduleDate} onChange={setRescheduleDate} />
          <Button
            onClick={async () => {
              if (!rescheduleInstallment) return
              setSavingReschedule(true)
              try {
                await updateInstallment(rescheduleInstallment.id, { due_date: rescheduleDate })
                showToast('success', 'موعد قسط تغییر کرد')
                setRescheduleInstallment(null)
                await loadData()
              } catch { showToast('error', 'خطا در تغییر موعد') }
              finally { setSavingReschedule(false) }
            }}
            disabled={savingReschedule || !rescheduleDate}
            className="w-full"
          >
            {savingReschedule ? <Spinner size={16} /> : 'ذخیره‌ی موعد جدید'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!chequeInstallment} onClose={() => setChequeInstallment(null)} title="ثبت قسط با چک">
        <div className="space-y-3 p-1">
          {chequeInstallment && (
            <p className="text-xs text-slate-500">
              قسط {toPersianDigits(chequeInstallment.inst.installment_number)} — {formatCurrency(chequeInstallment.inst.amount)} تومان.
              این قسط تا وصول واقعی چک، «در انتظار» می‌ماند — به محض پاس‌شدن چک (از تب «چک‌ها»)، هم مانده‌حساب کم می‌شود و هم این قسط خودکار «پرداخت‌شده» علامت می‌خورد.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="نام بانک" value={instChequeForm.bank_name} onChange={(v) => setInstChequeForm((p) => ({ ...p, bank_name: v }))} />
            <Input label="شماره چک" value={instChequeForm.cheque_number} onChange={(v) => setInstChequeForm((p) => ({ ...p, cheque_number: v }))} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="شماره حساب" value={instChequeForm.account_number} onChange={(v) => setInstChequeForm((p) => ({ ...p, account_number: v }))} dir="ltr" />
            <Input label="شناسه صیاد (اختیاری)" value={instChequeForm.sayad_id} onChange={(v) => setInstChequeForm((p) => ({ ...p, sayad_id: v }))} dir="ltr" />
          </div>
          <Input label="در وجه" value={instChequeForm.payee_name} onChange={(v) => setInstChequeForm((p) => ({ ...p, payee_name: v }))} />
          <PersianDateInput label="تاریخ سررسید چک" value={instChequeForm.due_date} onChange={(v) => setInstChequeForm((p) => ({ ...p, due_date: v }))} />
          <Button
            onClick={async () => {
              if (!chequeInstallment) return
              if (!instChequeForm.cheque_number.trim()) { showToast('error', 'شماره چک الزامی است'); return }
              setSavingInstCheque(true)
              try {
                await createCheque({
                  patient_id: chequeInstallment.plan.patient_id,
                  amount: chequeInstallment.inst.amount,
                  bank_name: instChequeForm.bank_name || null,
                  branch: null,
                  cheque_number: instChequeForm.cheque_number,
                  account_number: instChequeForm.account_number || null,
                  sayad_id: toEnglishDigits(instChequeForm.sayad_id || '').trim() || null,
                  issue_date: new Date().toISOString().slice(0, 10),
                  due_date: instChequeForm.due_date,
                  payee_name: instChequeForm.payee_name || null,
                  status: 'pending', notes: `چک قسط شماره ${chequeInstallment.inst.installment_number}`, created_by: null,
                  purpose: 'payment', payment_plan_id: chequeInstallment.plan.id,
                  installment_id: chequeInstallment.inst.id,
                } as any)
                showToast('success', 'چک قسط ثبت شد — تا وصول، «در انتظار» می‌ماند')
                setChequeInstallment(null)
                await loadData()
              } catch { showToast('error', 'خطا در ثبت چک') }
              finally { setSavingInstCheque(false) }
            }}
            disabled={savingInstCheque || !instChequeForm.cheque_number.trim() || !instChequeForm.due_date}
            className="w-full"
          >
            {savingInstCheque ? <Spinner size={16} /> : 'ثبت چک قسط'}
          </Button>
        </div>
      </Modal>

      {ConfirmActionModal}
    </div>
  )
}
