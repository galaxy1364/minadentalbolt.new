import { useState, useEffect, useCallback, useMemo } from 'react'
import { PatientDebtBar } from '../components/PatientDebtBar'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Phone, Filter, Users, Award, AlertCircle, Smile, FileText, User, Heart, Shield, MapPin, Archive, Calendar, MessageSquare, Eye, EyeOff, Banknote, CalendarClock, ChevronLeft, CreditCard, CheckCircle2, LayoutGrid, List, Sparkles } from 'lucide-react'
import { fetchPatients, createPatient, updatePatient, fetchDoctors, fetchPayments, fetchTreatments, fetchImplantCases, peekNextFileNumber, fetchCheques, fetchPaymentPlans } from '../lib/api'
import { useDataRefresh } from '../lib/realtimeSync'
import { toJalaliStringPretty, formatCurrency, toPersianDigits } from '../lib/persianDate'
import { Patient, Doctor, Payment, Treatment, ImplantCase, Cheque, PaymentPlan } from '../types'
import { Modal, Card, Button, Input, Select, Textarea, Spinner, EmptyState, showToast, HighlightText, SkeletonList } from '../components/ui'
import { recordAuditLog } from '../lib/auditLogger'
import { usePrivacyMode } from '../lib/privacyMask'
import { PatientPhotoUpload } from '../components/PatientPhotoUpload'
import { PatientSelect } from '../components/PatientSelect'
import { PersianDateInput } from '../components/PersianDateInput'
import { ModuleHeader } from '../components/ModuleHeader'
import { useConfirmAction, ConfirmActionConfig } from '../components/ConfirmAction'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { scoreFields } from '../lib/fuzzySearch'
import { calcPatientBalance } from '../lib/finance'
import { calculateAge } from '../lib/patientUtils'
import { isNegativeValue } from '../lib/patientAlerts'

const vipLevels: { value: number; label: string; color: string; icon: string }[] = [
  { value: 0, label: 'عادی', color: 'slate', icon: '' },
  { value: 1, label: 'نقره‌ای', color: 'secondary', icon: '🥈' },
  { value: 2, label: 'طلایی', color: 'warning', icon: '🥇' },
  { value: 3, label: 'پلاتین', color: 'accent', icon: '💎' },
]

const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const genderOptions = [{ value: 'male', label: 'آقا' }, { value: 'female', label: 'خانم' }]

function getVipMeta(level: number | null) { return vipLevels.find((v) => v.value === (level ?? 0)) || vipLevels[0] }

import { tileThemes, getHashColor } from '../lib/colors'

function getInitials(p: Patient): string {
  const f = p.first_name?.charAt(0) || ''
  const l = p.last_name?.charAt(0) || ''
  return (f + l).trim() || '?'
}

// Shared with Dashboard/Billing (src/lib/finance.ts) so this number can
// never silently diverge between pages again.
const calcBalance = calcPatientBalance

const emptyForm = {
  first_name: '', last_name: '', national_id: '', phone: '', phone2: '', email: '',
  birth_date: '', gender: '', blood_type: '', address: '', city: '', province: '',
  postal_code: '', medical_history: '', allergies: '', medications: '', medical_conditions: '',
  insurance_info: '', insurance_number: '', notes: '', vip_level: '0',
  file_number: '', file_number_manual: false, is_active: 'true', primary_doctor_id: '', tags: '',
  avatar_url: '', referral_source: '',
  anticoagulant_use: false, inr_value: '', bisphosphonate_use: false,
  bp_systolic: '', bp_diastolic: '', diabetes_hba1c: '', endocarditis_prophylaxis: false,
  pregnancy_trimester: '', family_head_id: '',
}

export default function Patients() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [implantCases, setImplantCases] = useState<ImplantCase[]>([])
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterVip, setFilterVip] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterTag, setFilterTag] = useState('')
  // Defaults to active-only — an inactive patient genuinely "went to
  // the archive" and shouldn't reappear mixed into the main list by
  // default; the وضعیت filter can still opt into seeing them here too.
  const [filterActive, setFilterActive] = useState('true')
  const [showFilters, setShowFilters] = useState(false)

  // Enterprise Widescreen UX: Dual View Modes ('grid' vs 'table')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      return (localStorage.getItem('minadent-patients-view') as 'grid' | 'table') || 'grid'
    } catch {
      return 'grid'
    }
  })
  // Fast Reception Workflow: Instant Status Filter Pills
  const [quickFilter, setQuickFilter] = useState<'all' | 'debtors' | 'cheques' | 'plans' | 'vip' | 'archived'>('all')

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    h.tap()
    setViewMode(mode)
    try { localStorage.setItem('minadent-patients-view', mode) } catch {}
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const { confirmAction, close, ConfirmActionModal } = useConfirmAction()
  const { privacyMode, togglePrivacyMode, maskPhoneNumber, maskNationalId } = usePrivacyMode()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pats, docs, pays, trts, implCases, chqs, plans] = await Promise.all([
        fetchPatients(),
        fetchDoctors(),
        fetchPayments(),
        fetchTreatments(),
        fetchImplantCases(),
        fetchCheques(),
        fetchPaymentPlans(),
      ])
      setPatients(pats)
      setDoctors(docs)
      setPayments(pays)
      setTreatments(trts)
      setImplantCases(implCases)
      setCheques(chqs)
      setPaymentPlans(plans)
    } catch { showToast('error', 'خطا در بارگذاری بیماران') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Real-time automatic synchronization when patients/payments/cheques/plans update on any device
  useDataRefresh(['patients', 'payments', 'treatments', 'implant_cases', 'cheques', 'payment_plans'], loadData)

  const patientFinances = useMemo(() => {
    const map = new Map<string, { balance: number; paid: number; totalCost: number }>()
    for (const p of patients) {
      const pPays = payments.filter((py) => py.patient_id === p.id)
      const pTrts = treatments.filter((t) => t.patient_id === p.id)
      const pImpl = implantCases.filter((c) => c.patient_id === p.id)
      map.set(p.id, calcBalance(pPays, pTrts, pImpl))
    }
    return map
  }, [patients, payments, treatments, implantCases])

  // Counts pending or deposited cheques per patient for live card badges
  const patientChequesMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cheques) {
      if (c.patient_id && (c.status === 'pending' || c.status === 'deposited')) {
        map.set(c.patient_id, (map.get(c.patient_id) || 0) + 1)
      }
    }
    return map
  }, [cheques])

  // Counts active installment plans per patient for live card badges
  const patientPlansMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const pl of paymentPlans) {
      if (pl.patient_id && pl.status === 'active') {
        map.set(pl.patient_id, (map.get(pl.patient_id) || 0) + 1)
      }
    }
    return map
  }, [paymentPlans])

  // All distinct patient tags currently in use — powers the grouping/
  // segmentation filter row (مینادنت's "گروه‌بندی و تفکیک بیماران").
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const p of patients) for (const t of p.tags || []) set.add(t)
    return Array.from(set).sort()
  }, [patients])

  const filteredPatients = useMemo(() => {
    let result = patients.filter((p) => {
      // Fast reception status quick filters
      if (quickFilter === 'debtors') {
        const bal = patientFinances.get(p.id)?.balance || 0
        if (bal <= 0) return false
      } else if (quickFilter === 'cheques') {
        const chqCount = patientChequesMap.get(p.id) || 0
        if (chqCount <= 0) return false
      } else if (quickFilter === 'plans') {
        const planCount = patientPlansMap.get(p.id) || 0
        if (planCount <= 0) return false
      } else if (quickFilter === 'vip') {
        if ((p.vip_level ?? 0) <= 0) return false
      } else if (quickFilter === 'archived') {
        if (p.is_active) return false
      } else {
        // 'all': respect active filter
        if (filterActive !== '' && p.is_active !== (filterActive === 'true')) return false
      }

      if (filterVip !== '' && (p.vip_level ?? 0) !== Number(filterVip)) return false
      if (filterGender && p.gender !== filterGender) return false
      if (quickFilter !== 'all' && quickFilter !== 'archived' && filterActive !== '' && p.is_active !== (filterActive === 'true')) return false
      if (filterTag && !(p.tags || []).includes(filterTag)) return false
      return true
    })

    if (searchQuery.trim()) {
      const scored = result
        .map((p) => ({
          patient: p,
          score: scoreFields(searchQuery, [
            { value: `${p.first_name} ${p.last_name}`, weight: 1.2 },
            { value: `${p.last_name} ${p.first_name}`, weight: 1 },
            { value: p.phone || '', weight: 1 },
            { value: p.file_number || '', weight: 1 },
            { value: p.national_id || '', weight: 0.8 },
          ]),
        }))
        .filter((r) => r.score !== null) as { patient: Patient; score: number }[]
      scored.sort((a, b) => b.score - a.score)
      result = scored.map((r) => r.patient)
    }

    return result
  }, [patients, searchQuery, quickFilter, filterVip, filterGender, filterActive, filterTag, patientFinances, patientChequesMap, patientPlansMap])

  const stats = useMemo(() => {
    const total = patients.length
    const vip = patients.filter((p) => (p.vip_level ?? 0) > 0).length
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const newThisMonth = patients.filter((p) => p.created_at >= monthStart).length
    const active = patients.filter((p) => p.is_active).length
    const debtors = patients.filter((p) => (patientFinances.get(p.id)?.balance || 0) > 0).length
    const withCheques = Array.from(patientChequesMap.keys()).length
    const withPlans = Array.from(patientPlansMap.keys()).length
    const archived = patients.filter((p) => !p.is_active).length
    return { total, vip, newThisMonth, active, debtors, withCheques, withPlans, archived }
  }, [patients, patientFinances, patientChequesMap, patientPlansMap])

  const [nextFileNumber, setNextFileNumber] = useState('')

  const openCreateModal = async () => {
    setEditingPatient(null)
    setFormData(emptyForm)
    try {
      const fn = await peekNextFileNumber()
      setNextFileNumber(fn)
      setFormData((p) => ({ ...p, file_number: fn, file_number_manual: false }))
    } catch {}
    setModalOpen(true)
    h.pop()
  }

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient)
    setFormData({
      first_name: patient.first_name || '', last_name: patient.last_name || '', national_id: patient.national_id || '',
      phone: patient.phone || '', phone2: patient.phone2 || '', email: patient.email || '',
      birth_date: patient.birth_date || '', gender: patient.gender || '', blood_type: patient.blood_type || '',
      address: patient.address || '', city: patient.city || '', province: patient.province || '',
      postal_code: patient.postal_code || '', medical_history: patient.medical_history || '',
      allergies: patient.allergies || '', medications: patient.medications || '',
      medical_conditions: patient.medical_conditions || '', insurance_info: patient.insurance_info || '',
      insurance_number: patient.insurance_number || '', notes: patient.notes || '',
      vip_level: String(patient.vip_level ?? 0), file_number: patient.file_number || '',
      file_number_manual: patient.file_number_manual ?? false, is_active: String(patient.is_active),
      primary_doctor_id: patient.primary_doctor_id || '', tags: (patient.tags || []).join(', '),
      avatar_url: patient.avatar_url || '', referral_source: patient.referral_source || '',
      anticoagulant_use: Boolean(patient.anticoagulant_use),
      inr_value: patient.inr_value != null ? String(patient.inr_value) : '',
      bisphosphonate_use: Boolean(patient.bisphosphonate_use),
      bp_systolic: patient.bp_systolic != null ? String(patient.bp_systolic) : '',
      bp_diastolic: patient.bp_diastolic != null ? String(patient.bp_diastolic) : '',
      diabetes_hba1c: patient.diabetes_hba1c != null ? String(patient.diabetes_hba1c) : '',
      endocarditis_prophylaxis: Boolean(patient.endocarditis_prophylaxis),
      pregnancy_trimester: patient.pregnancy_trimester != null ? String(patient.pregnancy_trimester) : '',
      family_head_id: patient.family_head_id || '',
    })
    setModalOpen(true)
    h.pop()
  }

  // ── Preview + Confirm for create/edit ──
  const handleSave = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) { chimes.playWarning(); h.error(); showToast('error', 'نام و نام خانوادگی الزامی است'); return }
    // Phone is used everywhere downstream — SMS reminders, appointment
    // confirmations, the whole notification system assumes every
    // patient has one. Letting it be skipped meant some patients could
    // silently never receive any reminder/alarm the rest of the app
    // promises, with no visible sign anything was missing.
    if (!formData.phone.trim()) { chimes.playWarning(); h.error(); showToast('error', 'شماره تلفن الزامی است — پایه‌ی یادآوری‌ها و پیامک‌هاست'); return }
    if (!formData.national_id.trim()) { chimes.playWarning(); h.error(); showToast('error', 'کد ملی الزامی است'); return }

    const vipMeta = getVipMeta(Number(formData.vip_level) || 0)
    const genderLabel = formData.gender ? (formData.gender === 'male' ? 'آقا' : 'خانم') : '—'
    const age = calculateAge(formData.birth_date)

    // Duplicate-patient detection. National ID is a real, legally
    // unique identifier — two genuine different people can never
    // actually share one, so a match here is always a true duplicate
    // record and must be a hard block, never just a warning. Phone
    // stays a soft warning: a real family can legitimately share one
    // landline/mobile between different actual patients, so it's
    // allowed — but flagged clearly before confirming, so staff always
    // know when it happens rather than it passing silently.
    const dupPhone = formData.phone
      ? patients.find((p) => p.phone === formData.phone.trim() && p.id !== editingPatient?.id)
      : null
    const dupNationalId = formData.national_id
      ? patients.find((p) => p.national_id === formData.national_id.trim() && p.id !== editingPatient?.id)
      : null

    if (dupNationalId) {
      chimes.playWarning()
      h.error()
      showToast('error', `این کد ملی قبلاً برای «${dupNationalId.first_name} ${dupNationalId.last_name}» ثبت شده — کد ملی نمی‌تواند تکراری باشد`)
      return
    }

    const fields: ConfirmActionConfig['fields'] = [
      { label: 'نام کامل', value: `${formData.first_name} ${formData.last_name}`, icon: <User size={16} />, highlight: true },
      { label: 'سطح VIP', value: `${vipMeta.icon} ${vipMeta.label}` },
      { label: 'جنسیت', value: genderLabel },
    ]
    if (age !== null) fields.push({ label: 'سن', value: `${toPersianDigits(age)} سال` })
    if (formData.phone) fields.push({ label: 'تلفن', value: toPersianDigits(formData.phone), icon: <Phone size={16} /> })
    if (formData.national_id) fields.push({ label: 'کد ملی', value: toPersianDigits(formData.national_id) })
    if (formData.blood_type) fields.push({ label: 'گروه خونی', value: formData.blood_type, icon: <Heart size={16} /> })
    if (formData.insurance_info) fields.push({ label: 'بیمه', value: formData.insurance_info, icon: <Shield size={16} /> })
    if (formData.allergies) fields.push({ label: 'حساسیت‌ها', value: formData.allergies, icon: <AlertCircle size={16} /> })
    if (formData.address) fields.push({ label: 'آدرس', value: `${formData.city || ''} ${formData.address}`.trim(), icon: <MapPin size={16} /> })
    if (formData.notes) fields.push({ label: 'یادداشت', value: formData.notes })
    // National ID duplicates are already blocked above (return, never
    // reach here) — only phone can still legitimately reach this point.
    if (dupPhone) {
      fields.push({ label: '⚠ شماره تلفن مشترک', value: `این شماره برای بیمار «${dupPhone.first_name} ${dupPhone.last_name}» هم ثبت شده — اگر عضو خانواده‌ی دیگری‌ست، مشکلی نیست` })
    }

    confirmAction({
      type: editingPatient ? 'edit' : 'create',
      title: editingPatient ? 'ویرایش بیمار' : 'ثبت بیمار جدید',
      fields,
      confirmLabel: editingPatient ? 'تایید ویرایش' : 'تایید و ثبت',
      onConfirm: async () => {
        const payload = {
          first_name: formData.first_name.trim(), last_name: formData.last_name.trim(),
          national_id: formData.national_id || null, phone: formData.phone || null, phone2: formData.phone2 || null,
          email: formData.email || null, birth_date: formData.birth_date || null, gender: formData.gender || null,
          blood_type: formData.blood_type || null, address: formData.address || null, city: formData.city || null,
          province: formData.province || null, postal_code: formData.postal_code || null,
          medical_history: formData.medical_history || null, allergies: formData.allergies || null,
          medications: formData.medications || null, medical_conditions: formData.medical_conditions || null,
          insurance_info: formData.insurance_info || null, insurance_number: formData.insurance_number || null,
          notes: formData.notes || null, vip_level: Number(formData.vip_level) || 0,
          file_number: formData.file_number || undefined,
          file_number_manual: formData.file_number_manual, is_active: formData.is_active === 'true',
          primary_doctor_id: formData.primary_doctor_id || null,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          avatar_url: formData.avatar_url || null, credit_limit: null, referral_source: formData.referral_source || null,
          anticoagulant_use: formData.anticoagulant_use || false,
          inr_value: formData.inr_value ? Number(formData.inr_value) : null,
          bisphosphonate_use: formData.bisphosphonate_use || false,
          bp_systolic: formData.bp_systolic ? Number(formData.bp_systolic) : null,
          bp_diastolic: formData.bp_diastolic ? Number(formData.bp_diastolic) : null,
          diabetes_hba1c: formData.diabetes_hba1c ? Number(formData.diabetes_hba1c) : null,
          endocarditis_prophylaxis: formData.endocarditis_prophylaxis || false,
          pregnancy_trimester: formData.pregnancy_trimester ? Number(formData.pregnancy_trimester) : null,
          family_head_id: formData.family_head_id || null,
        } as any
        try {
          if (editingPatient) {
            await updatePatient(editingPatient.id, payload)
            await recordAuditLog({
              table_name: 'patients',
              operation: 'update',
              record_id: editingPatient.id,
              summary: `به‌روزرسانی بیمار: ${payload.first_name} ${payload.last_name}`,
            })
            chimes.playSuccess()
            showToast('success', 'اطلاعات پرونده بیمار به‌روزرسانی شد')
          } else {
            const newPatient = await createPatient(payload)
            await recordAuditLog({
              table_name: 'patients',
              operation: 'insert',
              record_id: newPatient.id,
              summary: `ایجاد بیمار جدید: ${payload.first_name} ${payload.last_name}`,
            })
            chimes.playSuccess()
            showToast('success', 'پرونده بیمار جدید با موفقیت ثبت شد')
          }
          setModalOpen(false)
          await loadData()
        } catch {
          chimes.playWarning()
          showToast('error', 'خطا در ثبت اطلاعات بیمار')
        }
      },
    })
  }

  // ── Preview + Confirm for delete ──
  const handleDelete = (patient: Patient) => {
    // Per clinic policy: patient records are NEVER permanently deleted,
    // regardless of history. Deactivating (hidden from active lists,
    // fully restorable from Archive, every linked record untouched) is
    // the only path — even for a patient with zero recorded history yet,
    // since staff could still be mid-entry on their file.
    h.tap()
    confirmAction({
      type: 'status',
      title: 'غیرفعال کردن بیمار',
      warning: 'بیمار از لیست‌های فعال مخفی می‌شود، ولی هیچ داده‌ای پاک نمی‌شود — از بخش «بایگانی» قابل بازگردانی است.',
      fields: [
        { label: 'نام', value: `${patient.first_name} ${patient.last_name}`, icon: <User size={16} />, highlight: true },
        { label: 'شماره پرونده', value: patient.file_number || '—', icon: <FileText size={16} /> },
      ],
      confirmLabel: 'غیرفعال کردن',
      onConfirm: async () => {
        try {
          await updatePatient(patient.id, { is_active: false })
          await recordAuditLog({
            table_name: 'patients',
            operation: 'update',
            record_id: patient.id,
            summary: `غیرفعال کردن بیمار: ${patient.first_name} ${patient.last_name}`,
          })
          chimes.playPop()
          showToast('success', 'بیمار غیرفعال شد — سوابق حفظ شد')
          await loadData()
        } catch {
          chimes.playWarning()
          showToast('error', 'خطا در غیرفعال‌سازی بیمار')
        }
      },
    })
  }

  const ptr = usePullToRefresh(async () => { await loadData() })

  if (loading) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4" aria-busy="true" aria-live="polite">
        <div className="skeleton h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        <div className="skeleton h-12 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-2 relative" {...ptr.handlers}>
      {ptr.pullDistance > 0 && (
        <div className="pull-indicator" style={{ opacity: ptr.isRefreshing ? 1 : ptr.pullProgress, top: -4 }}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full border-2 border-teal-300 dark:border-teal-600 border-t-teal-600 dark:border-t-teal-400 ${ptr.isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `scale(${0.6 + ptr.pullProgress * 0.4})` }} />
            <span className="text-[10px] text-teal-600 font-medium">{ptr.isRefreshing ? 'در حال به‌روزرسانی...' : 'برای به‌روزرسانی بکشید'}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <ModuleHeader
        moduleKey="patients"
        title="مدیریت پرونده‌های بیماران"
        subtitle={`${toPersianDigits(filteredPatients.length)} پرونده در این نما`}
        action={
          <button
            onClick={openCreateModal}
            aria-label="افزودن بیمار جدید"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all-smooth press-scale"
          >
            <Plus size={18} />
            <span>بیمار جدید</span>
          </button>
        }
      />

      {/* Clinic Operational & Financial Stats Rail */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">کل مراجعین فعال</span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{toPersianDigits(stats.active)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">بیماران ویژه VIP</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{toPersianDigits(stats.vip)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Award size={20} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-rose-100 dark:border-rose-900/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block mb-0.5">بدهکاران کلینیک</span>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">{toPersianDigits(stats.debtors)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Banknote size={20} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">چک و اقساط در جریان</span>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{toPersianDigits(stats.withCheques + stats.withPlans)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
        </div>
      </div>

      {/* Search Bar, Privacy & View Toggles */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در کلینیک بر اساس نام، تلفن، کد ملی، شماره پرونده..."
              aria-label="جستجوی بیمار"
              className="w-full pr-10 pl-3 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <button
            onClick={() => {
              h.tap()
              const next = togglePrivacyMode()
              showToast(
                'info',
                next
                  ? 'حالت محرمانگی پیشخوان فعال شد — اطلاعات هویتی مراجعین ماسک شدند'
                  : 'حالت محرمانگی پیشخوان غیرفعال شد'
              )
            }}
            aria-label={privacyMode ? 'غیرفعال‌سازی حالت محرمانگی پیشخوان' : 'فعال‌سازی حالت محرمانگی پیشخوان'}
            title={privacyMode ? 'حالت محرمانگی پیشخوان فعال است — کلیک جهت نمایش کامل' : 'حالت محرمانگی پیشخوان (مخفی‌سازی کد ملی و تلفن مراجعین)'}
            className={`min-w-[44px] min-h-[44px] rounded-xl border transition-all-smooth press-scale shrink-0 flex items-center justify-center shadow-xs ${
              privacyMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            {privacyMode ? <EyeOff size={17} className="text-emerald-600" /> : <Eye size={17} />}
          </button>

          <button
            onClick={() => { h.tap(); setShowFilters(!showFilters) }}
            aria-label={showFilters ? 'بستن فیلترها' : 'باز کردن فیلترها'}
            aria-pressed={showFilters}
            className={`min-w-[44px] min-h-[44px] rounded-xl border transition-all-smooth press-scale shrink-0 flex items-center justify-center shadow-xs ${
              showFilters
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-teal-600'
            }`}
          >
            <Filter size={17} />
          </button>

          {/* Dual View Toggle (Grid vs Table) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleViewModeChange('grid')}
              aria-label="نمای کارت‌ها"
              title="نمای کارت‌ها (Grid)"
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('table')}
              aria-label="نمای جدول بالینی"
              title="نمای جدول تفصیلی (Table)"
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <List size={17} />
            </button>
          </div>
        </div>

        {/* Quick Reception Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => { h.select(); setQuickFilter('all') }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>همه مراجعین</span>
            <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.total)})</span>
          </button>

          <button
            type="button"
            onClick={() => { h.select(); setQuickFilter('debtors') }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'debtors'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50/50'
            }`}
          >
            {stats.debtors > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
            <span>بدهکاران</span>
            <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.debtors)})</span>
          </button>

          <button
            type="button"
            onClick={() => { h.select(); setQuickFilter('cheques') }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'cheques'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50 hover:bg-amber-50/50'
            }`}
          >
            <span>دارای چک صیادی</span>
            <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.withCheques)})</span>
          </button>

          <button
            type="button"
            onClick={() => { h.select(); setQuickFilter('plans') }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'plans'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900/50 hover:bg-indigo-50/50'
            }`}
          >
            <span>اقساط فعال</span>
            <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.withPlans)})</span>
          </button>

          <button
            type="button"
            onClick={() => { h.select(); setQuickFilter('vip') }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'vip'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 border border-violet-200/80 dark:border-violet-900/50 hover:bg-violet-50/50'
            }`}
          >
            <span>بیماران VIP</span>
            <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.vip)})</span>
          </button>

          <button
            type="button"
            onClick={() => { h.select(); setQuickFilter('archived') }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'archived'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>بایگانی</span>
            <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.archived)})</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-3">
          <div className="grid grid-cols-3 gap-2">
            <Select label="VIP" value={filterVip} onChange={(v) => { h.select(); setFilterVip(v) }} options={vipLevels.map((v) => ({ value: String(v.value), label: v.label }))} placeholder="همه" />
            <Select label="جنسیت" value={filterGender} onChange={(v) => { h.select(); setFilterGender(v) }} options={genderOptions} placeholder="همه" />
            <Select label="وضعیت" value={filterActive} onChange={(v) => { h.select(); setFilterActive(v) }} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} placeholder="همه" />
          </div>
          {allTags.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">گروه‌بندی بر اساس برچسب</p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { h.select(); setFilterTag(filterTag === tag ? '' : tag) }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all-smooth ${filterTag === tag ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(filterVip || filterGender || (filterActive && filterActive !== 'true') || filterTag) && (
            <button onClick={() => { h.cancel(); setFilterVip(''); setFilterGender(''); setFilterActive('true'); setFilterTag('') }} className="text-xs text-teal-600 mt-2 font-bold">پاک کردن فیلترها</button>
          )}
        </Card>
      )}

      {/* Patient List Content */}
      {filteredPatients.length === 0 ? (
        <Card className="p-8">
          {(() => {
            const userChoseAFilter = !!(searchQuery || filterVip || filterGender || (filterActive && filterActive !== 'true') || filterTag || quickFilter !== 'all')
            const hasAnyPatientsAtAll = patients.length > 0
            const hiddenByActiveDefault = !userChoseAFilter && hasAnyPatientsAtAll
            return (
              <EmptyState
                icon={<Users size={36} />}
                title="بیماری یافت نشد"
                description={
                  userChoseAFilter ? 'فیلترها را تغییر دهید یا جستجوی دیگری انجام دهید'
                  : hiddenByActiveDefault ? 'تمامی پرونده‌های ثبت‌شده غیرفعال هستند — جهت مشاهده فیلتر بایگانی را انتخاب کنید'
                  : 'هنوز بیماری در سیستم ثبت نشده است — با فشردن دکمه زیر پرونده جدید ایجاد کنید'
                }
                action={
                  hiddenByActiveDefault
                    ? <Button size="sm" variant="secondary" onClick={() => { h.tap(); setQuickFilter('archived') }}>نمایش بایگانی</Button>
                    : !userChoseAFilter ? <Button size="sm" onClick={openCreateModal}><Plus size={16} /> ثبت بیمار جدید</Button> : undefined
                }
              />
            )
          })()}
        </Card>
      ) : viewMode === 'grid' ? (
        /* Widescreen Responsive Patient Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPatients.map((patient, idx) => {
            const vipMeta = getVipMeta(patient.vip_level)
            const age = calculateAge(patient.birth_date)
            const fin = patientFinances.get(patient.id) || { balance: 0, paid: 0, totalCost: 0 }
            const hasAllergies = !isNegativeValue(patient.allergies)
            const hasConditions = !isNegativeValue(patient.medical_conditions)
            const activeCheques = patientChequesMap.get(patient.id) || 0
            const activePlans = patientPlansMap.get(patient.id) || 0
            const isDebtor = fin.balance > 0
            const isSettled = fin.totalCost > 0 && fin.balance <= 0

            const borderStatusClass = isDebtor
              ? 'border-r-4 border-r-rose-500'
              : isSettled
              ? 'border-r-4 border-r-emerald-500'
              : !patient.is_active
              ? 'border-r-4 border-r-slate-400'
              : 'border-r-4 border-r-teal-500'

            return (
              <div
                key={patient.id}
                className={`relative overflow-hidden flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-200 group ${borderStatusClass}`}
                style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
                onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
              >
                <div>
                  {/* Top Section: Avatar + Name + Dedicated File Number Capsule */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-sm flex-shrink-0 shadow-xs overflow-hidden">
                        {patient.avatar_url ? (
                          <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(patient)
                        )}
                      </div>

                      {/* Name & Demographics */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className={`font-black text-base truncate ${isDebtor ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            <HighlightText text={`${patient.first_name} ${patient.last_name}`} query={searchQuery} />
                          </h3>
                          {vipMeta.value > 0 && <span className="text-xs shrink-0" title={`سطح ${vipMeta.label}`}>{vipMeta.icon}</span>}
                          {!patient.is_active && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">بایگانی</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {age !== null && <span>{toPersianDigits(age)} ساله</span>}
                          {patient.gender && <span>• {patient.gender === 'male' ? 'آقا' : 'خانم'}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Dedicated File Number Capsule */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {patient.file_number ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            h.tap()
                            navigate(`/patients/${patient.id}`)
                          }}
                          title="شماره پرونده — کلیک برای مشاهده پرونده"
                          className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 shadow-xs hover:bg-slate-800 transition-colors"
                          dir="ltr"
                        >
                          <FileText size={12} className="text-teal-400 shrink-0" />
                          <HighlightText text={toPersianDigits(patient.file_number)} query={searchQuery} />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">بدون پرونده</span>
                      )}
                    </div>
                  </div>

                  {/* Identifiers & Phone */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mb-3" onClick={(e) => e.stopPropagation()}>
                    {patient.phone && (
                      <a
                        href={`tel:${patient.phone}`}
                        className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400 font-mono"
                        dir="ltr"
                        title="تماس تلفنی"
                      >
                        <Phone size={12} className="text-slate-400" />
                        <span>{privacyMode ? maskPhoneNumber(patient.phone) : toPersianDigits(patient.phone)}</span>
                      </a>
                    )}
                    {patient.national_id && (
                      <span className="flex items-center gap-1 font-mono text-slate-500" dir="ltr" title="کد ملی">
                        <Shield size={12} className="text-slate-400" />
                        <span>{privacyMode ? maskNationalId(patient.national_id) : toPersianDigits(patient.national_id)}</span>
                      </span>
                    )}
                  </div>

                  {/* Clinical Alerts Row */}
                  {(hasAllergies || hasConditions) && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-3" onClick={(e) => e.stopPropagation()}>
                      {hasAllergies && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-bold border border-rose-200 dark:border-rose-900/40">
                          <AlertCircle size={11} className="text-rose-500 shrink-0" />
                          <span>حساسیت: {patient.allergies}</span>
                        </span>
                      )}
                      {hasConditions && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-bold border border-amber-200 dark:border-amber-900/40">
                          <Heart size={11} className="text-amber-600 shrink-0" />
                          <span>بیماری: {patient.medical_conditions}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Financial Overview Rail (Sanitized — No Dead Buttons) */}
                  {(isDebtor || isSettled || activeCheques > 0 || activePlans > 0) && (
                    <div className="flex items-center gap-2 flex-wrap mb-3" onClick={(e) => e.stopPropagation()}>
                      {isDebtor ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            h.tap()
                            navigate(`/patients/${patient.id}`, { state: { initialTab: 'payments', openPaymentModal: true } })
                          }}
                          title="ثبت تسویه و دریافت بدهی بیمار"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-black shadow-xs hover:bg-rose-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <Banknote size={13} className="text-rose-600 dark:text-rose-400" />
                          <span>بدهی: {formatCurrency(fin.balance)} تومان</span>
                        </button>
                      ) : isSettled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>تسویه حساب کامل</span>
                        </span>
                      ) : null}

                      {activeCheques > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                          <CreditCard size={12} className="text-amber-600" />
                          <span>{toPersianDigits(activeCheques)} چک صیادی</span>
                        </span>
                      )}

                      {activePlans > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                          <CalendarClock size={12} className="text-indigo-600" />
                          <span>{toPersianDigits(activePlans)} اقساط فعال</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Sterile Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all-smooth press-scale"
                    >
                      <span>پرونده بیمار</span>
                      <ChevronLeft size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        h.tap()
                        navigate('/appointments', {
                          state: {
                            quickStartPatientId: patient.id,
                            quickStartDoctorId: patient.primary_doctor_id,
                            openWizard: true,
                          },
                        })
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all-smooth press-scale"
                    >
                      <Calendar size={13} />
                      <span>نوبت</span>
                    </button>

                    {(() => {
                      const cleanPhone = patient.phone ? patient.phone.replace(/\D/g, '').replace(/^0/, '98') : null
                      if (!cleanPhone) return null
                      const waText = `سلام ${patient.first_name} ${patient.last_name} عزیز،\nپیام از طرف کلینیک دندانپزشکی مینا.\nجهت هماهنگی و پیگیری نوبت با ما در ارتباط باشید.`
                      return (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold transition-all-smooth press-scale"
                          title="ارسال پیام در واتساپ"
                          onClick={() => chimes.playPop()}
                        >
                          <MessageSquare size={13} />
                          <span>واتساپ</span>
                        </a>
                      )
                    })()}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(patient)}
                      title="ویرایش اطلاعات بیمار"
                      aria-label="ویرایش اطلاعات"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(patient)}
                      title="انتقال به بایگانی / غیرفعال‌سازی"
                      aria-label="انتقال به بایگانی"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Archive size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Dense Clinical Table View */
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5 font-bold">بیمار</th>
                <th className="p-3.5 font-bold">شماره پرونده</th>
                <th className="p-3.5 font-bold">تلفن و کد ملی</th>
                <th className="p-3.5 font-bold">هشدارهای بالینی</th>
                <th className="p-3.5 font-bold">وضعیت مالی</th>
                <th className="p-3.5 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.map((patient) => {
                const vipMeta = getVipMeta(patient.vip_level)
                const age = calculateAge(patient.birth_date)
                const fin = patientFinances.get(patient.id) || { balance: 0, paid: 0, totalCost: 0 }
                const isDebtor = fin.balance > 0
                const isSettled = fin.totalCost > 0 && fin.balance <= 0
                const hasAllergies = !isNegativeValue(patient.allergies)
                const hasConditions = !isNegativeValue(patient.medical_conditions)

                return (
                  <tr
                    key={patient.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                          {patient.avatar_url ? <img src={patient.avatar_url} alt="" className="w-full h-full object-cover rounded-lg" /> : getInitials(patient)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className={`font-bold ${isDebtor ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                              <HighlightText text={`${patient.first_name} ${patient.last_name}`} query={searchQuery} />
                            </span>
                            {vipMeta.value > 0 && <span>{vipMeta.icon}</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {age !== null && <span>{toPersianDigits(age)} سال</span>}
                            {patient.gender && <span> • {patient.gender === 'male' ? 'آقا' : 'خانم'}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold" dir="ltr">
                      {patient.file_number ? (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px]">
                          {toPersianDigits(patient.file_number)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="space-y-0.5 font-mono text-[11px]" dir="ltr">
                        {patient.phone && (
                          <div className="text-slate-600 dark:text-slate-300">
                            {privacyMode ? maskPhoneNumber(patient.phone) : toPersianDigits(patient.phone)}
                          </div>
                        )}
                        {patient.national_id && (
                          <div className="text-slate-400">
                            {privacyMode ? maskNationalId(patient.national_id) : toPersianDigits(patient.national_id)}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {hasAllergies && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            حساسیت
                          </span>
                        )}
                        {hasConditions && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            بیماری زمینه‌ای
                          </span>
                        )}
                        {!hasAllergies && !hasConditions && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      {isDebtor ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>{formatCurrency(fin.balance)} تومان بدهی</span>
                        </span>
                      ) : isSettled ? (
                        <span className="font-bold text-emerald-600">تسویه کامل</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
                          title="ورود به پرونده"
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px]"
                        >
                          پرونده
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(patient)}
                          title="ویرایش"
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sterile dock clearance — prevents floating tab bar from obscuring bottom items */}
      <div className="h-32 sm:h-36" aria-hidden="true" />

      {/* Modal */}
      {modalOpen && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingPatient ? 'ویرایش بیمار' : 'بیمار جدید'} size="full">
          <div className="space-y-4">
            {/* ── File number at top, always editable ── */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 border border-teal-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <FileText size={22} />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-teal-700 mb-1 uppercase tracking-wider">شماره پرونده</label>
                <input
                  value={formData.file_number}
                  onChange={(e) => { h.tap(); setFormData((p) => ({ ...p, file_number: e.target.value, file_number_manual: true })) }}
                  placeholder="شماره پرونده"
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-lg font-extrabold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              {!editingPatient && !formData.file_number_manual && (
                <span className="text-[10px] text-teal-600 font-medium whitespace-nowrap">خودکار پیشنهاد شد</span>
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">اطلاعات شخصی</h4>
              <PatientPhotoUpload value={formData.avatar_url} onChange={(url) => setFormData((p) => ({ ...p, avatar_url: url }))} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <Input label="نام *" value={formData.first_name} onChange={(v) => setFormData((p) => ({ ...p, first_name: v }))} placeholder="نام" />
                <Input label="نام خانوادگی *" value={formData.last_name} onChange={(v) => setFormData((p) => ({ ...p, last_name: v }))} placeholder="نام خانوادگی" />
                <Input label="کد ملی *" value={formData.national_id} onChange={(v) => setFormData((p) => ({ ...p, national_id: v }))} placeholder="کد ملی" dir="ltr" />
                <Input label="تلفن *" value={formData.phone} onChange={(v) => setFormData((p) => ({ ...p, phone: v }))} placeholder="09xxxxxxxxx" dir="ltr" />
                <Input label="شماره منزل" value={formData.phone2} onChange={(v) => setFormData((p) => ({ ...p, phone2: v }))} placeholder="تلفن ثابت منزل" dir="ltr" />
                <Input label="ایمیل" type="email" value={formData.email} onChange={(v) => setFormData((p) => ({ ...p, email: v }))} placeholder="email@example.com" dir="ltr" />
                <PersianDateInput label="تاریخ تولد" value={formData.birth_date} onChange={(v) => setFormData((p) => ({ ...p, birth_date: v }))} />
                <Select label="جنسیت" value={formData.gender} onChange={(v) => setFormData((p) => ({ ...p, gender: v }))} options={genderOptions} placeholder="انتخاب" />
                <Select label="گروه خونی" value={formData.blood_type} onChange={(v) => setFormData((p) => ({ ...p, blood_type: v }))} options={bloodTypes.map((bt) => ({ value: bt, label: bt }))} placeholder="انتخاب" />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">آدرس</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="استان" value={formData.province} onChange={(v) => setFormData((p) => ({ ...p, province: v }))} placeholder="استان" />
                <Input label="شهر" value={formData.city} onChange={(v) => setFormData((p) => ({ ...p, city: v }))} placeholder="شهر" />
                <Input label="کد پستی" value={formData.postal_code} onChange={(v) => setFormData((p) => ({ ...p, postal_code: v }))} placeholder="کد پستی" dir="ltr" />
                <Input label="آدرس کامل" value={formData.address} onChange={(v) => setFormData((p) => ({ ...p, address: v }))} placeholder="آدرس" className="md:col-span-3" />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">اطلاعات پزشکی</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Textarea label="تاریخچه پزشکی" value={formData.medical_history} onChange={(v) => setFormData((p) => ({ ...p, medical_history: v }))} placeholder="بیماری‌های قبلی..." rows={2} />
                <Textarea label="حساسیت‌ها" value={formData.allergies} onChange={(v) => setFormData((p) => ({ ...p, allergies: v }))} placeholder="حساسیت به دارو، غذا و..." rows={2} />
                <Textarea label="داروهای مصرفی" value={formData.medications} onChange={(v) => setFormData((p) => ({ ...p, medications: v }))} placeholder="داروهای فعلی..." rows={2} />
                <Textarea label="بیماری‌های زمینه‌ای" value={formData.medical_conditions} onChange={(v) => setFormData((p) => ({ ...p, medical_conditions: v }))} placeholder="بیماری‌های زمینه‌ای..." rows={2} />
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50 space-y-3">
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-rose-600" />
                غربالگری بالینی و عوامل پرخطر دندانپزشکی (استاندارد ADA / نظام پزشکی)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/40">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.anticoagulant_use)}
                      onChange={(e) => setFormData((p) => ({ ...p, anticoagulant_use: e.target.checked }))}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-400"
                    />
                    مصرف داروی ضد انعقاد
                  </label>
                  <Input
                    label="آخرین مقدار INR"
                    value={formData.inr_value}
                    onChange={(v) => setFormData((p) => ({ ...p, inr_value: v }))}
                    placeholder="مثال: ۲.۵"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/40">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.bisphosphonate_use)}
                      onChange={(e) => setFormData((p) => ({ ...p, bisphosphonate_use: e.target.checked }))}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-400"
                    />
                    مصرف بیس‌فسفونات‌ها
                  </label>
                  <p className="text-[11px] text-slate-500">ریسک استئونکروز فک در جراحی و ایمپلنت</p>
                </div>

                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/40">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.endocarditis_prophylaxis)}
                      onChange={(e) => setFormData((p) => ({ ...p, endocarditis_prophylaxis: e.target.checked }))}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-400"
                    />
                    ریسک اندوکاردیت
                  </label>
                  <p className="text-[11px] text-slate-500">ضرورت پروفیلاکسی آنتی‌بیوتیک پیش از ویزیت</p>
                </div>

                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/40">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="فشار سیستول"
                      value={formData.bp_systolic}
                      onChange={(v) => setFormData((p) => ({ ...p, bp_systolic: v }))}
                      placeholder="۱۲۰"
                      dir="ltr"
                    />
                    <Input
                      label="فشار دیاستول"
                      value={formData.bp_diastolic}
                      onChange={(v) => setFormData((p) => ({ ...p, bp_diastolic: v }))}
                      placeholder="۸۰"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/40">
                  <Input
                    label="دیابت: شاخص HbA1c (%)"
                    value={formData.diabetes_hba1c}
                    onChange={(v) => setFormData((p) => ({ ...p, diabetes_hba1c: v }))}
                    placeholder="مثال: ۷.۲"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/40">
                  <Select
                    label="وضعیت بارداری"
                    value={formData.pregnancy_trimester}
                    onChange={(v) => setFormData((p) => ({ ...p, pregnancy_trimester: v }))}
                    options={[
                      { value: '', label: 'عدم بارداری / نامشخص' },
                      { value: '1', label: 'سه‌ماهه اول (ترایمستر ۱)' },
                      { value: '2', label: 'سه‌ماهه دوم (ترایمستر ۲)' },
                      { value: '3', label: 'سه‌ماهه سوم (ترایمستر ۳)' },
                    ]}
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">بیمه و دسته‌بندی</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="اطلاعات بیمه" value={formData.insurance_info} onChange={(v) => setFormData((p) => ({ ...p, insurance_info: v }))} placeholder="نام بیمه" />
                <Input label="شماره بیمه" value={formData.insurance_number} onChange={(v) => setFormData((p) => ({ ...p, insurance_number: v }))} placeholder="شماره بیمه" dir="ltr" />
                <Select label="سطح VIP" value={formData.vip_level} onChange={(v) => setFormData((p) => ({ ...p, vip_level: v }))} options={vipLevels.map((v) => ({ value: String(v.value), label: v.label }))} />
                <Select label="پزشک اصلی" value={formData.primary_doctor_id} onChange={(v) => setFormData((p) => ({ ...p, primary_doctor_id: v }))} options={doctors.map((d) => ({ value: d.id, label: `دکتر ${d.name || d.specialty || 'پزشک'}` }))} placeholder="بدون پزشک اصلی" />
                <Input label="برچسب‌ها" value={formData.tags} onChange={(v) => setFormData((p) => ({ ...p, tags: v }))} placeholder="برچسب۱, برچسب۲" />
                <Select label="وضعیت" value={formData.is_active} onChange={(v) => setFormData((p) => ({ ...p, is_active: v }))} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} />
                <Select
                  label="چطور با ما آشنا شدید؟"
                  value={formData.referral_source}
                  onChange={(v) => setFormData((p) => ({ ...p, referral_source: v }))}
                  options={[
                    { value: 'instagram', label: 'اینستاگرام' }, { value: 'google', label: 'جستجوی گوگل' },
                    { value: 'referral', label: 'معرفی توسط بیمار دیگر' }, { value: 'walk_in', label: 'مراجعه‌ی حضوری' },
                    { value: 'website', label: 'وب‌سایت' }, { value: 'other', label: 'سایر' },
                  ]}
                  placeholder="انتخاب..."
                />
              </div>
              <div className="mt-3">
                <PatientSelect
                  label="سرپرست خانواده (جهت تجمیع حساب)"
                  value={formData.family_head_id || ''}
                  onChange={(v) => setFormData((p) => ({ ...p, family_head_id: v }))}
                  patients={patients.filter(p => p.id !== editingPatient?.id)} // Cannot be their own head
                  placeholder="بدون سرپرست (حساب مستقل)"
                />
                <p className="text-[11px] text-slate-500 mt-1">با انتخاب سرپرست خانواده، مانده حساب این بیمار با سرپرست او تجمیع می‌شود.</p>
              </div>
            </div>
            <Textarea label="یادداشت" value={formData.notes} onChange={(v) => setFormData((p) => ({ ...p, notes: v }))} placeholder="یادداشت‌های بیمار..." />
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => { h.cancel(); setModalOpen(false) }}>انصراف</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size={16} /> : 'پیش‌نمایش و تایید'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {ConfirmActionModal}
    </div>
  )
}
