// Staff.tsx - Persian RTL Dental Clinic Staff Management with Doctor Revenue Sharing
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, Search, Plus, Phone, Mail, Calendar, DollarSign, Smile, Briefcase, Edit2, Trash2, Stethoscope, Calculator, Award, TrendingUp, Percent, UserCheck, ChevronDown, ChevronUp, Shield, Lock, Unlock, RotateCcw } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts'
import { staffSaveMessage, LoginOutcome } from '../lib/staffSaveOutcome'
import { fetchStaff, createStaff, updateStaff, fetchEncounters, fetchLabOrders, fetchTreatments, createExpense, fetchDoctors, fetchStaffLoginStatuses, setStaffLoginActive } from '../lib/api'
import { CLINIC_ID, supabase } from '../lib/supabase'
import { toJalaliString, toJalaliStringPretty, formatCurrency, formatNumber, toPersianDigits } from '../lib/persianDate'
import type { Staff as StaffType, StaffInput, EncounterWithRelations, LabOrderWithRelations, Treatment } from '../types'
import { Modal, Wizard, Card, Button, Input, Select, Badge, Spinner, EmptyState, showToast } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'
import { ROLES } from '../lib/permissions'
import { scoreFields } from '../lib/fuzzySearch'
import { useConfirmAction } from '../components/ConfirmAction'
import { h } from '../lib/haptics'
import { CurrencyInput } from '../components/CurrencyInput'

const staffRoles: { value: string; label: string; color: string }[] = [
  { value: 'doctor', label: 'پزشک', color: 'primary' },
  { value: 'receptionist', label: 'پذیرش', color: 'accent' },
  { value: 'assistant', label: 'دستیار دندانپزشک', color: 'success' },
  { value: 'hygienist', label: 'بهداشتکار', color: 'warning' },
  { value: 'manager', label: 'مدیر', color: 'error' },
  { value: 'accountant', label: 'حسابدار', color: 'secondary' },
  { value: 'lab_technician', label: 'تکنسین لابراتوار', color: 'accent' },
  { value: 'cleaner', label: 'نظافتچی', color: 'slate' },
  { value: 'security', label: 'نگهبان', color: 'slate' },
  { value: 'other', label: 'سایر', color: 'slate' },
]

const shareTypes: { value: string; label: string; desc: string }[] = [
  { value: 'net_split', label: 'سود خالص منهای لابراتوار', desc: '(کل کارکرد - کل لابراتوار) × درصد سهم' },
  { value: 'percentage', label: 'درصد از کل کارکرد', desc: 'کل کارکرد × درصد سهم' },
  { value: 'fixed', label: 'مبلغ ثابت', desc: 'مبلغ ثابت ماهانه' },
]

const specialties = [
  'عمومی', 'ارتودنسی', 'ایمپلنت', 'اورتوسرجری', 'پریودانتیکس', 'پروستتودونتیکس', 'اندودانتیکس', 'کودکان',
]

const CHART_COLORS = ['#0d9488', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#94a3b8']

function getRoleMeta(role: string | null) {
  return staffRoles.find((r) => r.value === role) || staffRoles[staffRoles.length - 1]
}

interface ShareResult {
  doctorId: string
  doctorName: string
  totalProduction: number
  totalLabCost: number
  netProduction: number
  shareAmount: number
  shareType: string
  sharePercentage: number
}

export default function Staff() {
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  const [staff, setStaff] = useState<StaffType[]>([])
  const [staffLoginMap, setStaffLoginMap] = useState<Map<string, { userId: string; isActive: boolean }>>(new Map())
  const [encounters, setEncounters] = useState<EncounterWithRelations[]>([])
  const [labOrders, setLabOrders] = useState<LabOrderWithRelations[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [staffWizardStep, setStaffWizardStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [shareResults, setShareResults] = useState<ShareResult[]>([])
  const [calculating, setCalculating] = useState(false)
  const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }
  const todayStr = () => new Date().toISOString().slice(0, 10)
  const [sharePeriodStart, setSharePeriodStart] = useState(monthStart())
  const [sharePeriodEnd, setSharePeriodEnd] = useState(todayStr())

  const [formData, setFormData] = useState({
    full_name: '',
    role: 'receptionist',
    phone: '',
    email: '',
    hire_date: '',
    salary: '',
    is_doctor: false,
    share_percentage: '50',
    share_type: 'net_split',
    fixed_share_amount: '0',
    specialty: 'عمومی',
    license_number: '',
    is_clinic_owner: false,
    create_login: false,
    access_role: 'receptionist',
    login_password: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, enc, labs, trts, loginStatuses] = await Promise.all([
        fetchStaff(),
        fetchEncounters().catch(() => []),
        fetchLabOrders().catch(() => []),
        fetchTreatments().catch(() => []),
        fetchStaffLoginStatuses().catch(() => new Map()),
      ])
      setStaff(s)
      setEncounters(enc)
      setLabOrders(labs)
      setTreatments(trts)
      setStaffLoginMap(loginStatuses)
    } catch (err) {
      console.error('Error loading staff:', err)
      showToast('error', 'خطا در بارگذاری پرسنل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredStaff = useMemo(() => {
    let result = staff.filter((s) => {
      if (filterRole && s.role !== filterRole) return false
      return true
    })
    if (searchQuery.trim()) {
      const scored = result
        .map((s) => ({
          item: s,
          score: scoreFields(searchQuery, [
            { value: s.full_name, weight: 1.2 },
            { value: s.phone || '', weight: 1 },
            { value: s.email || '', weight: 1 },
          ]),
        }))
        .filter((r) => r.score !== null) as { item: StaffType; score: number }[]
      scored.sort((a, b) => b.score - a.score)
      result = scored.map((r) => r.item)
    }
    return result
  }, [staff, searchQuery, filterRole])

  const doctors = useMemo(() => staff.filter((s) => s.is_doctor || s.role === 'doctor'), [staff])

  const stats = useMemo(() => {
    const total = staff.length
    const active = staff.filter((s) => s.is_active).length
    const totalSalary = staff.reduce((sum, s) => sum + (s.salary || 0), 0)
    const roles = new Set(staff.map((s) => s.role).filter(Boolean)).size
    const doctorCount = doctors.length
    return { total, active, totalSalary, roles, doctorCount }
  }, [staff, doctors])

  const roleDistributionChart = useMemo(() => {
    const counts: Record<string, number> = {}
    staff.forEach((s) => {
      const label = getRoleMeta(s.role).label
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [staff])

  // ── Revenue Share Calculation ──────────────────────────────────
  const calculateShares = useCallback(async () => {
    setCalculating(true)
    try {
      const results: ShareResult[] = []

      for (const doc of doctors) {
        // Production is the sum of actual billable treatment line-items
        // performed by this doctor — not encounters.total_amount, which
        // is a cached rollup that can drift out of sync with the real
        // itemized work (same class of bug fixed for patient balances
        // in src/lib/finance.ts). Real money paid to a doctor must be
        // based on the real ledger, not a stale summary field.
        //
        // Filtered to the selected settlement period — without this, the
        // calculator summed a doctor's ENTIRE history every time, which
        // is useless for actually running monthly payroll (you can't
        // tell how much is owed for this month specifically).
        const inPeriod = (dateStr: string) => dateStr >= sharePeriodStart && dateStr <= `${sharePeriodEnd}T23:59:59`
        const docTreatments = treatments.filter((t) => t.doctor_id === doc.id && inPeriod(t.created_at) && t.status !== 'cancelled')
        const totalProduction = docTreatments.reduce((sum, t) => sum + (t.total_price || 0), 0)

        const docLabOrders = labOrders.filter((l) => (l.doctor_id === doc.id || l.doctor?.id === doc.id) && inPeriod(l.created_at))
        const totalLabCost = docLabOrders.reduce((sum, l) => sum + (l.cost || 0), 0)

        const netProduction = totalProduction - totalLabCost

        const shareType = doc.share_type || 'net_split'
        const sharePct = doc.share_percentage ?? 50
        const fixedAmount = doc.fixed_share_amount ?? 0

        let shareAmount = 0
        if (shareType === 'net_split') {
          shareAmount = netProduction * (sharePct / 100)
        } else if (shareType === 'percentage') {
          shareAmount = totalProduction * (sharePct / 100)
        } else if (shareType === 'fixed') {
          shareAmount = fixedAmount
        }

        results.push({
          doctorId: doc.id,
          doctorName: doc.full_name,
          totalProduction,
          totalLabCost,
          netProduction,
          shareAmount,
          shareType,
          sharePercentage: sharePct,
        })
      }

      results.sort((a, b) => b.shareAmount - a.shareAmount)
      setShareResults(results)
    } catch (err) {
      console.error('Error calculating shares:', err)
      showToast('error', 'خطا در محاسبه سهم‌بندی')
    } finally {
      setCalculating(false)
    }
  }, [doctors, treatments, labOrders, sharePeriodStart, sharePeriodEnd])

  // Records that a doctor's calculated share for this period was
  // actually paid out — creates a real Expense record (clinic paying
  // the doctor IS a clinic expense) so it flows into the same
  // Expenses/reports the rest of the app already reads from, instead of
  // this panel being a number with no paper trail behind it.
  const handleSettleShare = (r: ShareResult) => {
    h.tap()
    confirmAction({
      type: 'create',
      title: 'ثبت تسویه سهم پزشک',
      fields: [
        { label: 'پزشک', value: r.doctorName, highlight: true },
        { label: 'بازه', value: `${toJalaliStringPretty(sharePeriodStart)} تا ${toJalaliStringPretty(sharePeriodEnd)}` },
        { label: 'مبلغ سهم', value: `${formatCurrency(r.shareAmount)} ت`, highlight: true },
      ],
      confirmLabel: 'ثبت پرداخت',
      onConfirm: async () => {
        try {
          await createExpense({
            clinic_id: CLINIC_ID,
            category: 'سهم پزشک',
            amount: r.shareAmount,
            date: new Date().toISOString().slice(0, 10),
            payment_method: 'cash',
            description: `تسویه سهم ${r.doctorName} — بازه ${toJalaliStringPretty(sharePeriodStart)} تا ${toJalaliStringPretty(sharePeriodEnd)}`,
          } as any)
          showToast('success', 'تسویه ثبت شد و در هزینه‌های کلینیک لحاظ شد')
        } catch { showToast('error', 'خطا در ثبت تسویه') }
      },
    })
  }

  // ── Modal Handlers ─────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingId(null)
    setStaffWizardStep(0)
    setFormData({
      full_name: '', role: 'receptionist', phone: '', email: '', hire_date: '', salary: '',
      is_doctor: false, share_percentage: '50', share_type: 'net_split', fixed_share_amount: '0',
      specialty: 'عمومی', license_number: '', is_clinic_owner: false,
      create_login: false, access_role: 'receptionist', login_password: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (s: StaffType) => {
    setEditingId(s.id)
    setFormData({
      full_name: s.full_name,
      role: s.role || 'receptionist',
      phone: s.phone || '',
      email: s.email || '',
      hire_date: s.hire_date || '',
      salary: s.salary != null ? String(s.salary) : '',
      is_doctor: s.is_doctor ?? false,
      share_percentage: s.share_percentage != null ? String(s.share_percentage) : '50',
      share_type: s.share_type || 'net_split',
      fixed_share_amount: s.fixed_share_amount != null ? String(s.fixed_share_amount) : '0',
      specialty: s.specialty || 'عمومی',
      license_number: s.license_number || '',
      is_clinic_owner: s.is_clinic_owner ?? false,
      create_login: false,
      access_role: 'receptionist',
      login_password: '',
    })
    setStaffWizardStep(0)
    setModalOpen(true)
  }

  const handleRoleChange = (role: string) => {
    const isDoctor = role === 'doctor'
    setFormData((prev) => ({
      ...prev,
      role,
      is_doctor: isDoctor,
      share_type: isDoctor ? prev.share_type : 'net_split',
      share_percentage: isDoctor ? prev.share_percentage : '50',
    }))
  }

  const handleSave = () => {
    if (!formData.full_name.trim()) {
      showToast('error', 'نام و نام خانوادگی الزامی است')
      return
    }
    const payload: StaffInput = {
      clinic_id: CLINIC_ID,
      full_name: formData.full_name.trim(),
      role: formData.role,
      phone: formData.phone || null,
      email: formData.email || null,
      hire_date: formData.hire_date || null,
      salary: formData.salary ? Number(formData.salary) : null,
      is_active: true,
      is_doctor: formData.is_doctor,
      share_percentage: formData.is_doctor ? Number(formData.share_percentage) : null,
      share_type: formData.is_doctor ? formData.share_type : null,
      fixed_share_amount: formData.is_doctor && formData.share_type === 'fixed' ? Number(formData.fixed_share_amount) : null,
      specialty: formData.is_doctor ? formData.specialty : null,
      license_number: formData.is_doctor ? formData.license_number : null,
      is_clinic_owner: formData.is_clinic_owner,
    }

    const roleLabel = staffRoles.find((r) => r.value === formData.role)?.label || formData.role
    const previewFields = [
      { label: 'نام و نام خانوادگی', value: formData.full_name.trim(), highlight: true },
      { label: 'نقش', value: roleLabel },
      { label: 'تلفن', value: formData.phone || '-' },
      { label: 'ایمیل', value: formData.email || '-' },
      ...(formData.is_doctor ? [{ label: 'سهم', value: formData.share_type === 'fixed' ? `${formatCurrency(Number(formData.fixed_share_amount))} ت (ثابت)` : `${toPersianDigits(formData.share_percentage)}٪` }] : []),
      ...(formData.create_login ? [{ label: 'حساب ورود', value: `${formData.email || formData.phone} — نقش: ${ROLES[formData.access_role as keyof typeof ROLES] || formData.access_role}` }] : []),
    ]

    confirmAction({
      type: editingId ? 'edit' : 'create',
      title: editingId ? 'ویرایش پرسنل' : 'افزودن پرسنل جدید',
      fields: previewFields,
      confirmLabel: editingId ? 'ذخیره تغییرات' : 'افزودن پرسنل',
      onConfirm: async () => {
        setSaving(true)
        try {
          let savedStaff
          // MOD-FIX-009: the outcome toast is deliberately NOT fired here.
          // Saving staff and creating their login are two writes, and
          // announcing the first one succeeded — before the second is
          // even attempted — is what made a failed account look fine.
          const saveMode: 'created' | 'updated' = editingId ? 'updated' : 'created'
          let loginOutcome: LoginOutcome = 'not_requested'
          let loginFailureReason = ''

          if (editingId) {
            savedStaff = await updateStaff(editingId, payload)
          } else {
            savedStaff = await createStaff(payload)
          }

          if (formData.create_login) {
            if (!formData.email && !formData.phone) {
              loginOutcome = 'failed'; loginFailureReason = 'ایمیل یا موبایل وارد نشده بود'
            } else if (!formData.login_password || formData.login_password.length < 6) {
              loginOutcome = 'failed'; loginFailureReason = 'رمز عبور موقت باید حداقل ۶ کاراکتر باشد'
            } else {
              try {
                // If this staff member is a doctor, syncDoctorRecordForStaff
                // (in createStaff/updateStaff) already created/updated their
                // linked doctors row — look it up so the login account can
                // be tied to it too, closing the loop that let a logged-in
                // doctor be identified as a specific doctors row at all.
                let linkedDoctorId: string | null = null
                if (payload.is_doctor) {
                  const allDoctors = await fetchDoctors()
                  linkedDoctorId = allDoctors.find((d) => d.staff_id === savedStaff.id)?.id || null
                }
                const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-staff', {
                  body: {
                    email: formData.email || null,
                    phone: formData.phone || null,
                    password: formData.login_password,
                    full_name: formData.full_name.trim(),
                    access_role: formData.access_role,
                    clinic_id: CLINIC_ID,
                    doctor_id: linkedDoctorId,
                    staff_id: savedStaff.id,
                  },
                })
                if (inviteError) {
                  // FunctionsHttpError carries the actual server response
                  // body (with the real reason) on .context — surfacing
                  // it instead of a generic message is the difference
                  // between "خطا در ساخت حساب" (useless) and knowing
                  // exactly what failed.
                  let serverMessage = inviteError.message
                  try {
                    const body = await inviteError.context?.json?.()
                    if (body?.error) serverMessage = body.error
                  } catch { /* response wasn't JSON — keep the generic message */ }
                  throw new Error(serverMessage)
                }
                if (inviteData?.error) throw new Error(inviteData.error)
                loginOutcome = 'created'
              } catch (inviteErr) {
                console.error('Error creating login:', inviteErr)
                loginOutcome = 'failed'
                loginFailureReason = inviteErr instanceof Error ? inviteErr.message : ''
              }
            }
          }

          const outcome = staffSaveMessage(saveMode, loginOutcome, loginFailureReason)
          showToast(outcome.type, outcome.text)

          setModalOpen(false)
          loadData()
        } catch (err) {
          console.error('Error saving staff:', err)
          showToast('error', 'خطا در ذخیره پرسنل')
        } finally {
          setSaving(false)
        }
      },
    })
  }

  const handleToggleLoginAccess = (s: StaffType) => {
    const login = staffLoginMap.get(s.id)
    if (!login) return
    const suspending = login.isActive
    h.tap()
    confirmAction({
      type: 'status',
      title: suspending ? 'تعلیق حساب ورود' : 'فعال‌سازی حساب ورود',
      warning: suspending ? `${s.full_name} دیگر نمی‌تواند وارد اپلیکیشن شود، اما سوابق و اطلاعاتش دست‌نخورده می‌ماند.` : undefined,
      fields: [{ label: 'پرسنل', value: s.full_name || '-', highlight: true }],
      confirmLabel: suspending ? 'تعلیق حساب' : 'فعال‌سازی حساب',
      onConfirm: async () => {
        await setStaffLoginActive(login.userId, !suspending)
        showToast('success', suspending ? 'حساب ورود تعلیق شد' : 'حساب ورود فعال شد')
        await loadData()
      },
    })
  }

  const handleDelete = (s: StaffType) => {
    h.tap()
    // Per clinic policy: staff are never permanently deleted, regardless
    // of history — even someone with zero encounters/lab orders yet
    // could still be mid-onboarding, and a hard delete of a doctor_id
    // referenced anywhere (even indirectly, later) risks corrupting
    // records or getting stuck in the sync queue against a foreign-key
    // constraint. Deactivate is the only path, same as patients/labs.
    confirmAction({
      type: 'status',
      title: 'غیرفعال کردن پرسنل',
      warning: 'این شخص از لیست فعال مخفی می‌شود، ولی هیچ داده‌ای پاک نمی‌شود — از بخش «بایگانی» قابل بازگردانی است.',
      fields: [
        { label: 'نام', value: s.full_name, highlight: true },
        { label: 'نقش', value: staffRoles.find((r) => r.value === s.role)?.label || s.role || '-' },
      ],
      confirmLabel: 'غیرفعال کردن',
      onConfirm: async () => {
        await updateStaff(s.id, { is_active: false })
        showToast('success', 'پرسنل غیرفعال شد — سوابق حفظ شد')
        loadData()
      },
    })
  }

  // ── Share Summary ──────────────────────────────────────────────
  const shareSummary = useMemo(() => {
    const totalProduction = shareResults.reduce((s, r) => s + r.totalProduction, 0)
    const totalLabCost = shareResults.reduce((s, r) => s + r.totalLabCost, 0)
    const totalNet = totalProduction - totalLabCost
    const totalShares = shareResults.reduce((s, r) => s + r.shareAmount, 0)
    const clinicShare = totalNet - totalShares
    const owner = staff.find((s) => s.is_clinic_owner)
    return { totalProduction, totalLabCost, totalNet, totalShares, clinicShare, ownerName: owner?.full_name || 'مدیر کلینیک' }
  }, [shareResults, staff])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="staff"
        title="پرسنل"
        subtitle="مدیریت کارکنان، پزشکان و سهم‌بندی درآمد"
        action={<Button onClick={openCreateModal} variant="primary"><Plus size={16} className="inline ml-1" /> پرسنل جدید</Button>}
      />

      {/* Stats Cards */}
      <ReorderableStatGrid
        storageKey="staff"
        items={[
          { key: 'total', node: <ModuleStatCard moduleKey="staff" icon={<Users size={20} />} label="کل پرسنل" value={formatNumber(stats.total)} /> },
          { key: 'doctors', node: <ModuleStatCard moduleKey="staff" icon={<Stethoscope size={20} />} label="پزشکان" value={formatNumber(stats.doctorCount)} /> },
          { key: 'roles', node: <ModuleStatCard moduleKey="staff" icon={<Briefcase size={20} />} label="نقش‌ها" value={formatNumber(stats.roles)} /> },
          { key: 'salary', node: <ModuleStatCard moduleKey="staff" icon={<DollarSign size={20} />} label="کل حقوق" value={`${formatCurrency(stats.totalSalary)} ت`} /> },
        ]}
      />

      {/* Revenue Share Panel */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator size={20} className="text-primary-600" />
            <h3 className="text-sm font-bold text-slate-800">سهم‌بندی پزشکان</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowSharePanel(!showSharePanel)}>
              {showSharePanel ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />}
              {showSharePanel ? 'بستن' : 'باز کردن'}
            </Button>
            <Button variant="primary" size="sm" onClick={calculateShares} disabled={calculating || doctors.length === 0}>
              {calculating ? <Spinner size={14} /> : <Calculator size={14} className="inline ml-1" />}
              محاسبه سهم
            </Button>
          </div>
        </div>

        {showSharePanel && (
          <div className="flex items-center gap-2 mb-3">
            <label className="text-[11px] font-medium text-slate-500 shrink-0">بازه:</label>
            <PersianDateInput value={sharePeriodStart} onChange={setSharePeriodStart} className="flex-1" />
            <span className="text-slate-400 text-xs">تا</span>
            <PersianDateInput value={sharePeriodEnd} onChange={setSharePeriodEnd} className="flex-1" />
          </div>
        )}

        <div className="bg-primary-50/50 rounded-xl p-3 mb-3 text-xs text-slate-600 leading-relaxed">
          <strong className="text-primary-700">فرمول محاسبه:</strong> سود خالص = کل کارکرد پزشک - کل هزینه لابراتوار آن پزشک
          <br />
          سهم پزشک = سود خالص × (درصد سهم ÷ ۱۰۰) — سهم مدیر/مالک = سود خالص کل - مجموع سهم پزشکان
        </div>

        {doctors.length === 0 ? (
          <EmptyState icon={<Stethoscope size={28} />} title="پزشکی ثبت نشده است" description="برای سهم‌بندی، ابتدا یک پزشک با نقش «پزشک» اضافه کنید" />
        ) : showSharePanel && shareResults.length > 0 ? (
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">کل کارکرد</div>
                <div className="text-sm font-bold text-slate-800">{formatCurrency(shareSummary.totalProduction)} ت</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">کل لابراتوار</div>
                <div className="text-sm font-bold text-error-600">{formatCurrency(shareSummary.totalLabCost)} ت</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">سود خالص</div>
                <div className="text-sm font-bold text-success-600">{formatCurrency(shareSummary.totalNet)} ت</div>
              </div>
              <div className="bg-primary-50 rounded-xl p-3">
                <div className="text-xs text-primary-600 mb-1">سهم {shareSummary.ownerName}</div>
                <div className="text-sm font-bold text-primary-700">{formatCurrency(shareSummary.clinicShare)} ت</div>
              </div>
            </div>

            {/* Per-doctor breakdown */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-200">
                    <th className="text-right py-2 px-2">پزشک</th>
                    <th className="text-right py-2 px-2">کارکرد</th>
                    <th className="text-right py-2 px-2">لابراتوار</th>
                    <th className="text-right py-2 px-2">سود خالص</th>
                    <th className="text-right py-2 px-2">فرمول</th>
                    <th className="text-right py-2 px-2">سهم پزشک</th>
                    <th className="text-right py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {shareResults.map((r) => (
                    <tr key={r.doctorId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-800">{r.doctorName}</td>
                      <td className="py-2 px-2 text-slate-600">{formatCurrency(r.totalProduction)} ت</td>
                      <td className="py-2 px-2 text-error-600">{formatCurrency(r.totalLabCost)} ت</td>
                      <td className="py-2 px-2 text-success-600 font-medium">{formatCurrency(r.netProduction)} ت</td>
                      <td className="py-2 px-2 text-xs text-slate-500">
                        {r.shareType === 'net_split' ? `خالص × ${toPersianDigits(r.sharePercentage)}٪` :
                         r.shareType === 'percentage' ? `کارکرد × ${toPersianDigits(r.sharePercentage)}٪` :
                         'مبلغ ثابت'}
                      </td>
                      <td className="py-2 px-2 font-bold text-primary-700">{formatCurrency(r.shareAmount)} ت</td>
                      <td className="py-2 px-2">
                        <Button size="sm" variant="secondary" onClick={() => handleSettleShare(r)} disabled={r.shareAmount <= 0}>
                          ثبت تسویه
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : showSharePanel ? (
          <EmptyState icon={<Calculator size={28} />} title="هنوز محاسبه نشده است" description="روی دکمه «محاسبه سهم» کلیک کنید" />
        ) : (
          <p className="text-sm text-slate-500">{formatNumber(doctors.length)} پزشک ثبت شده است. برای مشاهده سهم‌بندی، پنل را باز کنید.</p>
        )}
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام، تلفن یا ایمیل..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">همه نقش‌ها</option>
            {staffRoles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {(searchQuery || filterRole) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFilterRole('') }}>
              پاک کردن
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Cards */}
        <div className="lg:col-span-2">
          {filteredStaff.length === 0 ? (
            <Card className="p-5">
              <EmptyState
                icon={<Users size={28} />}
                title="پرسنلی ثبت نشده است"
                description="با افزودن پرسنل جدید شروع کنید"
                action={<Button onClick={openCreateModal} variant="primary" size="sm"><Plus size={14} className="inline ml-1" />افزودن پرسنل</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStaff.map((s) => {
                const meta = getRoleMeta(s.role)
                const isDoctor = s.is_doctor || s.role === 'doctor'
                return (
                  <Card key={s.id} className={`p-5 hover:card-shadow-lg transition-all-smooth ${!s.is_active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${isDoctor ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                        {isDoctor ? <Stethoscope size={20} /> : toPersianDigits(s.full_name?.charAt(0) || '؟')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 truncate">{s.full_name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <Badge color={meta.color}>{meta.label}</Badge>
                          {!s.is_active && <Badge color="slate">غیرفعال</Badge>}
                          {s.is_clinic_owner && <Badge color="warning"><Award size={10} className="inline ml-1" />مالک</Badge>}
                          {isDoctor && s.share_percentage != null && (
                            <Badge color="primary"><Percent size={10} className="inline ml-1" />{toPersianDigits(s.share_percentage)}٪</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {staffLoginMap.has(s.id) && (
                          <button
                            onClick={() => handleToggleLoginAccess(s)}
                            title={staffLoginMap.get(s.id)!.isActive ? 'تعلیق حساب ورود' : 'فعال‌سازی حساب ورود'}
                            className={`p-1.5 rounded-lg transition-colors ${staffLoginMap.get(s.id)!.isActive ? 'text-slate-400 hover:text-warning-600 hover:bg-warning-50' : 'text-warning-600 bg-warning-50'}`}
                          >
                            {staffLoginMap.get(s.id)!.isActive ? <Lock size={15} /> : <Unlock size={15} />}
                          </button>
                        )}
                        <button onClick={() => openEditModal(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                          <Edit2 size={15} />
                        </button>
                        {s.is_active ? (
                          <button onClick={() => handleDelete(s)} title="غیرفعال کردن" className="p-1.5 rounded-lg text-slate-400 hover:text-error-600 hover:bg-error-50 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={async () => { await updateStaff(s.id, { is_active: true }); showToast('success', 'پرسنل فعال شد'); loadData() }}
                            title="فعال‌سازی مجدد"
                            className="p-1.5 rounded-lg text-success-500 hover:text-success-700 hover:bg-success-50 transition-colors"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {isDoctor && s.specialty && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Stethoscope size={14} className="text-slate-400" />
                          <span>تخصص: {s.specialty}</span>
                        </div>
                      )}
                      {isDoctor && s.license_number && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <UserCheck size={14} className="text-slate-400" />
                          <span>شماره پروانه: <span dir="ltr">{toPersianDigits(s.license_number)}</span></span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone size={14} className="text-slate-400" />
                          <span dir="ltr">{toPersianDigits(s.phone)}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail size={14} className="text-slate-400" />
                          <span className="truncate" dir="ltr">{s.email}</span>
                        </div>
                      )}
                      {s.hire_date && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          <span>تاریخ استخدام: {toJalaliString(s.hire_date)}</span>
                        </div>
                      )}
                      {s.salary != null && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <DollarSign size={14} className="text-slate-400" />
                          <span>حقوق: {formatCurrency(s.salary)} ت</span>
                        </div>
                      )}
                      {isDoctor && (
                        <div className="flex items-center gap-2 text-primary-600 pt-1 border-t border-slate-100">
                          <TrendingUp size={14} />
                          <span className="text-xs">
                            {s.share_type === 'net_split' ? `سهم: ${toPersianDigits(s.share_percentage ?? 50)}٪ از سود خالص (منهای لابراتوار)` :
                             s.share_type === 'percentage' ? `سهم: ${toPersianDigits(s.share_percentage ?? 50)}٪ از کل کارکرد` :
                             `سهم ثابت: ${formatCurrency(s.fixed_share_amount ?? 0)} ت`}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Role Distribution Pie */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">توزیع پرسنل بر اساس نقش</h3>
          {roleDistributionChart.length === 0 ? (
            <EmptyState icon={<Briefcase size={28} />} title="داده‌ای موجود نیست" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleDistributionChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry: any) => `${entry.name}: ${toPersianDigits(entry.value)}`}
                >
                  {roleDistributionChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip
                  formatter={(v: number) => formatNumber(v)}
                  contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Wizard
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'ویرایش پرسنل' : 'افزودن پرسنل جدید'}
        step={staffWizardStep}
        onStepChange={setStaffWizardStep}
        onFinish={handleSave}
        finishLabel={editingId ? 'ذخیره تغییرات' : 'افزودن پرسنل'}
        saving={saving}
        steps={[
          {
            label: 'نام و نقش',
            validate: () => (!formData.full_name.trim() ? 'نام و نام خانوادگی الزامی است' : null),
            content: (
              <>
                <Input label="نام و نام خانوادگی *" value={formData.full_name} onChange={(v) => setFormData({ ...formData, full_name: v })} placeholder="مثلا: دکتر مریم احمدی" />
                <Select label="نقش" value={formData.role} onChange={handleRoleChange} options={staffRoles} />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_clinic_owner}
                    onChange={(e) => setFormData({ ...formData, is_clinic_owner: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Award size={14} className="text-warning-500" /> این شخص مالک/مدیر کلینیک است (سهم کلینیک به او تعلق می‌گیرد)
                  </span>
                </label>
              </>
            ),
          },
          ...(formData.is_doctor ? [{
            label: 'پزشک و سهم‌بندی',
            content: (
              <div className="space-y-4 p-4 bg-primary-50/50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-800">
                <h4 className="text-sm font-bold text-primary-700 dark:text-primary-400 flex items-center gap-1.5">
                  <Stethoscope size={16} /> اطلاعات پزشک و سهم‌بندی
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select label="تخصص" value={formData.specialty} onChange={(v) => setFormData({ ...formData, specialty: v })} options={specialties.map((s) => ({ value: s, label: s }))} />
                  <Input label="شماره پروانه" value={formData.license_number} onChange={(v) => setFormData({ ...formData, license_number: v })} placeholder="مثلا: ۱۲۳۴۵" dir="ltr" />
                </div>
                <Select
                  label="فرمول محاسبه سهم"
                  value={formData.share_type}
                  onChange={(v) => setFormData({ ...formData, share_type: v })}
                  options={shareTypes.map((t) => ({ value: t.value, label: t.label }))}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                  {shareTypes.find((t) => t.value === formData.share_type)?.desc}
                </p>
                {formData.share_type === 'fixed' ? (
                  <CurrencyInput label="مبلغ ثابت سهم (تومان)" value={formData.fixed_share_amount} onChange={(v) => setFormData({ ...formData, fixed_share_amount: v })} />
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      درصد سهم: {toPersianDigits(Number(formData.share_percentage))}٪
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={formData.share_percentage}
                      onChange={(e) => setFormData({ ...formData, share_percentage: e.target.value })}
                      className="w-full accent-primary-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>۰٪</span>
                      <span>۵۰٪</span>
                      <span>۱۰۰٪</span>
                    </div>
                  </div>
                )}
              </div>
            ),
          }] : []),
          {
            label: 'تماس',
            validate: () => (!formData.phone.trim() ? 'شماره تلفن الزامی است' : null),
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="تلفن" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} placeholder="شماره تماس" dir="ltr" />
                <Input label="ایمیل" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="email@example.com" dir="ltr" />
              </div>
            ),
          },
          {
            label: 'استخدام',
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PersianDateInput label="تاریخ استخدام" value={formData.hire_date} onChange={(v) => setFormData({ ...formData, hire_date: v })} />
                <Input label={formData.is_doctor ? 'حقوق ثابت پزشک (تومان، در صورت وجود)' : 'دستمزد ماهانه (تومان)'} type="number" value={formData.salary} onChange={(v) => setFormData({ ...formData, salary: v })} placeholder="0" />
              </div>
            ),
          },
          {
            label: 'دسترسی به سیستم',
            content: (
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                  <input
                    type="checkbox"
                    checked={formData.create_login}
                    onChange={(e) => setFormData({ ...formData, create_login: e.target.checked })}
                    className="w-4 h-4 rounded accent-violet-600"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    برای این شخص حساب ورود به سیستم بساز (با ایمیل یا موبایل بالا)
                  </span>
                </label>
                {formData.create_login && (
                  <div className="space-y-3 p-4 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-800">
                    <Select
                      label="سطح دسترسی"
                      value={formData.access_role}
                      onChange={(v) => setFormData({ ...formData, access_role: v })}
                      options={Object.entries(ROLES).map(([value, label]) => ({ value, label }))}
                    />
                    <Input
                      label="رمز عبور موقت (حداقل ۶ کاراکتر)"
                      type="text"
                      value={formData.login_password}
                      onChange={(v) => setFormData({ ...formData, login_password: v })}
                      placeholder="رمز موقت را اینجا بنویس و به او بگو"
                      dir="ltr"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      این شخص با {formData.email ? 'ایمیل' : formData.phone ? 'شماره موبایل' : 'ایمیل یا موبایل بالا'} و همین رمز موقت وارد می‌شود.
                    </p>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {ConfirmActionModal}
    </div>
  )
}
