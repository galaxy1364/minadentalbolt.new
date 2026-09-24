import { useState, useEffect, useCallback, useMemo } from 'react'
import { PatientDebtBar } from '../components/PatientDebtBar'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Phone, PhoneCall, Filter, Users, Award, AlertCircle, Smile, FileText, User, Heart, Shield, MapPin, Archive, Calendar, MessageSquare, MessageCircle, Eye, EyeOff, Banknote, CalendarClock, ChevronLeft, CreditCard, CheckCircle2, Check, LayoutGrid, List, Sparkles, Activity, Printer, FlaskConical } from 'lucide-react'
import { fetchPatients, createPatient, updatePatient, fetchDoctors, fetchPayments, fetchTreatments, fetchImplantCases, peekNextFileNumber, fetchCheques, fetchPaymentPlans, fetchLabOrders } from '../lib/api'
import { useDataRefresh } from '../lib/realtimeSync'
import { toJalaliStringPretty, formatCurrency, toPersianDigits } from '../lib/persianDate'
import { Patient, Doctor, Payment, Treatment, ImplantCase, Cheque, PaymentPlan, LabOrder } from '../types'
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
import { MobilePatientsDemo } from '../components/MobilePatientsDemo'

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
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterVip, setFilterVip] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterActive, setFilterActive] = useState('true')
  const [showFilters, setShowFilters] = useState(false)

  // Fast Reception Workflow: Instant Status Filter Pills
  const [quickFilter, setQuickFilter] = useState<'all' | 'debtors' | 'cheques' | 'plans' | 'implants' | 'lab' | 'vip' | 'archived'>('all')

  // Dual View Modes ('grid' vs 'table')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      return (localStorage.getItem('minadent-patients-view') as 'grid' | 'table') || 'grid'
    } catch {
      return 'grid'
    }
  })

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    h.tap()
    setViewMode(mode)
    try { localStorage.setItem('minadent-patients-view', mode) } catch {}
  }

  const [mobileDemoMode, setMobileDemoMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('minadent-patients-mobile-demo')
      if (stored !== null) return stored === 'true'
      return window.innerWidth < 768
    } catch {
      return window.innerWidth < 768
    }
  })

  const toggleMobileDemo = () => {
    h.toggle()
    setMobileDemoMode((prev) => {
      const next = !prev
      try { localStorage.setItem('minadent-patients-mobile-demo', String(next)) } catch {}
      return next
    })
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
      const [pats, docs, pays, trts, implCases, chqs, plans, labs] = await Promise.all([
        fetchPatients(),
        fetchDoctors(),
        fetchPayments(),
        fetchTreatments(),
        fetchImplantCases(),
        fetchCheques(),
        fetchPaymentPlans(),
        fetchLabOrders(),
      ])
      setPatients(pats)
      setDoctors(docs)
      setPayments(pays)
      setTreatments(trts)
      setImplantCases(implCases)
      setCheques(chqs)
      setPaymentPlans(plans)
      setLabOrders(labs)
    } catch { showToast('error', 'خطا در بارگذاری بیماران') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useDataRefresh(['patients', 'payments', 'treatments', 'implant_cases', 'cheques', 'payment_plans', 'lab_orders'], loadData)

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

  const patientChequesMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cheques) {
      if (c.patient_id && (c.status === 'pending' || c.status === 'deposited')) {
        map.set(c.patient_id, (map.get(c.patient_id) || 0) + 1)
      }
    }
    return map
  }, [cheques])

  const patientPlansMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const pl of paymentPlans) {
      if (pl.patient_id && pl.status === 'active') {
        map.set(pl.patient_id, (map.get(pl.patient_id) || 0) + 1)
      }
    }
    return map
  }, [paymentPlans])

  const patientImplantsMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const ic of implantCases) {
      if (ic.patient_id && ic.stage !== 'completed' && ic.stage !== 'cancelled') {
        map.set(ic.patient_id, (map.get(ic.patient_id) || 0) + 1)
      }
    }
    return map
  }, [implantCases])

  const patientLabOrdersMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const lo of labOrders) {
      if (lo.patient_id && lo.status !== 'delivered' && lo.status !== 'cancelled') {
        map.set(lo.patient_id, (map.get(lo.patient_id) || 0) + 1)
      }
    }
    return map
  }, [labOrders])

  const doctorsMap = useMemo(() => {
    const map = new Map<string, Doctor>()
    for (const d of doctors) {
      map.set(d.id, d)
    }
    return map
  }, [doctors])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const p of patients) for (const t of p.tags || []) set.add(t)
    return Array.from(set).sort()
  }, [patients])

  const filteredPatients = useMemo(() => {
    let result = patients.filter((p) => {
      if (quickFilter === 'debtors') {
        const bal = patientFinances.get(p.id)?.balance || 0
        if (bal <= 0) return false
      } else if (quickFilter === 'cheques') {
        const chqCount = patientChequesMap.get(p.id) || 0
        if (chqCount <= 0) return false
      } else if (quickFilter === 'plans') {
        const planCount = patientPlansMap.get(p.id) || 0
        if (planCount <= 0) return false
      } else if (quickFilter === 'implants') {
        const impCount = patientImplantsMap.get(p.id) || 0
        if (impCount <= 0) return false
      } else if (quickFilter === 'lab') {
        const labCount = patientLabOrdersMap.get(p.id) || 0
        if (labCount <= 0) return false
      } else if (quickFilter === 'vip') {
        if ((p.vip_level ?? 0) <= 0) return false
      } else if (quickFilter === 'archived') {
        if (p.is_active) return false
      } else {
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
  }, [patients, searchQuery, quickFilter, filterVip, filterGender, filterActive, filterTag, patientFinances, patientChequesMap, patientPlansMap, patientImplantsMap, patientLabOrdersMap])

  const stats = useMemo(() => {
    const total = patients.length
    const vip = patients.filter((p) => (p.vip_level ?? 0) > 0).length
    const active = patients.filter((p) => p.is_active).length
    const debtors = patients.filter((p) => (patientFinances.get(p.id)?.balance || 0) > 0).length
    const withCheques = Array.from(patientChequesMap.keys()).length
    const withPlans = Array.from(patientPlansMap.keys()).length
    const withImplants = Array.from(patientImplantsMap.keys()).length
    const withLab = Array.from(patientLabOrdersMap.keys()).length
    const archived = patients.filter((p) => !p.is_active).length
    return { total, vip, active, debtors, withCheques, withPlans, withImplants, withLab, archived }
  }, [patients, patientFinances, patientChequesMap, patientPlansMap, patientImplantsMap, patientLabOrdersMap])

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
      <div className="space-y-5 w-full px-1 py-2" aria-busy="true" aria-live="polite">
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
    <div className="space-y-3.5 w-full px-0.5 sm:px-1 py-1 relative" {...ptr.handlers}>
      {ptr.pullDistance > 0 && (
        <div className="pull-indicator" style={{ opacity: ptr.isRefreshing ? 1 : ptr.pullProgress, top: -4 }}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full border-2 border-teal-300 dark:border-teal-600 border-t-teal-600 dark:border-t-teal-400 ${ptr.isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `scale(${0.6 + ptr.pullProgress * 0.4})` }} />
            <span className="text-[10px] text-teal-600 font-medium">{ptr.isRefreshing ? 'در حال به‌روزرسانی...' : 'برای به‌روزرسانی بکشید'}</span>
          </div>
        </div>
      )}

      {/* Top Header Row: Clean Title + Patient Count + Mobile Demo Switcher */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">پرونده‌های بیماران</h1>
          <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border border-teal-200/60 dark:border-teal-800/60 rounded-full px-2.5 py-0.5">
            {toPersianDigits(filteredPatients.length)} بیمار
          </span>
        </div>

        {/* View Switcher: Mobile First vs Classic Desktop */}
        <button
          type="button"
          onClick={toggleMobileDemo}
          className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-black transition-all press-scale shadow-xs ${
            mobileDemoMode
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
          title="تغییر نمای نمایش بین حالت بهینه موبایل و نمای کامل دسکتاپ"
        >
          <Sparkles size={14} className={mobileDemoMode ? 'animate-pulse text-amber-300' : 'text-teal-600'} />
          <span>{mobileDemoMode ? '📱 نمای مخصوص موبایل' : '💻 نمای دسکتاپ'}</span>
        </button>
      </div>

      {mobileDemoMode ? (
        <MobilePatientsDemo
          patients={patients}
          patientFinances={patientFinances}
          patientChequesMap={patientChequesMap}
          patientPlansMap={patientPlansMap}
          patientImplantsMap={patientImplantsMap}
          onOpenCreate={openCreateModal}
          onOpenEdit={openEditModal}
        />
      ) : (
        <>
          {/* 100% Dedicated Horizontal Scrolling Filter Chip Rail (Zero overlap, Zero clashing) */}
          <div className="flex items-center gap-1.5 overflow-x-auto dock-scroll no-scrollbar py-1 text-xs font-bold -mx-2 px-2">
        <button
          type="button"
          onClick={() => { h.select(); setQuickFilter('all') }}
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 press-scale shrink-0 ${
            quickFilter === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>همه</span>
          <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.total)})</span>
        </button>

        <button
          type="button"
          onClick={() => { h.select(); setQuickFilter('debtors') }}
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 press-scale shrink-0 ${
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
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 press-scale shrink-0 ${
            quickFilter === 'cheques'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50 hover:bg-amber-50/50'
          }`}
        >
          <span>چک</span>
          <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.withCheques)})</span>
        </button>

        <button
          type="button"
          onClick={() => { h.select(); setQuickFilter('plans') }}
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 press-scale shrink-0 ${
            quickFilter === 'plans'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900/50 hover:bg-indigo-50/50'
          }`}
        >
          <span>اقساط</span>
          <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.withPlans)})</span>
        </button>

        <button
          type="button"
          onClick={() => { h.select(); setQuickFilter('implants') }}
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 press-scale shrink-0 ${
            quickFilter === 'implants'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-900/50 hover:bg-teal-50/50'
          }`}
        >
          <span>ایمپلنت</span>
          <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.withImplants)})</span>
        </button>

        <button
          type="button"
          onClick={() => { h.select(); setQuickFilter('lab') }}
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 press-scale shrink-0 ${
            quickFilter === 'lab'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-900/50 hover:bg-sky-50/50'
          }`}
        >
          <span>لابراتوار</span>
          <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.withLab)})</span>
        </button>

        <button
          type="button"
          onClick={() => { h.select(); setQuickFilter('archived') }}
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 press-scale shrink-0 ${
            quickFilter === 'archived'
              ? 'bg-slate-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>بایگانی</span>
          <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.archived)})</span>
        </button>

        <button
          type="button"
          onClick={() => { h.select(); setQuickFilter('vip') }}
          className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 press-scale shrink-0 ${
            quickFilter === 'vip'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 border border-violet-200/80 dark:border-violet-900/50 hover:bg-violet-50/50'
          }`}
        >
          <span>VIP</span>
          <span className="text-[10px] opacity-75 tabular-nums">({toPersianDigits(stats.vip)})</span>
        </button>
      </div>

      {/* Action Toolbar: Search + Integrated "+ بیمار جدید" CTA + Privacy + Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، تلفن، کد ملی، شماره پرونده..."
            aria-label="جستجوی بیمار"
            className="w-full pr-10 pl-3 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Primary Action Button: Integrated "+ بیمار جدید" */}
        <button
          type="button"
          onClick={openCreateModal}
          aria-label="افزودن بیمار جدید"
          className="flex items-center gap-1.5 px-3.5 min-h-[42px] rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all press-scale shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>بیمار جدید</span>
        </button>

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
          className={`min-w-[42px] min-h-[42px] rounded-xl border transition-all-smooth press-scale shrink-0 flex items-center justify-center shadow-xs ${
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
          className={`min-w-[42px] min-h-[42px] rounded-xl border transition-all-smooth press-scale shrink-0 flex items-center justify-center shadow-xs ${
            showFilters
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-teal-600'
          }`}
        >
          <Filter size={17} />
        </button>
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
      ) : (
        /* Widescreen Responsive Standardized Patient Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredPatients.map((patient, idx) => {
            const theme = tileThemes[getHashColor(patient.id)]
            const vipMeta = getVipMeta(patient.vip_level)
            const fin = patientFinances.get(patient.id) || { balance: 0, paid: 0, totalCost: 0 }
            const activeCheques = patientChequesMap.get(patient.id) || 0
            const activePlans = patientPlansMap.get(patient.id) || 0
            const activeImplants = patientImplantsMap.get(patient.id) || 0
            const activeLabOrders = patientLabOrdersMap.get(patient.id) || 0
            const isDebtor = fin.balance > 0
            const isSettled = fin.totalCost > 0 && fin.balance <= 0

            const borderStatusClass = isDebtor
              ? 'border-r-4 border-r-rose-500'
              : isSettled
              ? 'border-r-4 border-r-emerald-500'
              : !patient.is_active
              ? 'border-r-4 border-r-slate-400'
              : `border-r-4 ${theme.border}`

            return (
              <div
                key={patient.id}
                className={`relative overflow-hidden flex flex-col justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all-smooth press-scale group cursor-pointer ${borderStatusClass}`}
                style={{ animationDelay: `${Math.min(idx, 10) * 20}ms` }}
                onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
              >
                {/* Row 1: Avatar + Patient Name + VIP + File # Badge + Edit / Archive Icons */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl ${patient.avatar_url ? '' : theme.iconBg} text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs border border-white/60 dark:border-slate-700 overflow-hidden`}>
                      {patient.avatar_url ? (
                        <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(patient)}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <h3 className={`font-black text-sm truncate ${isDebtor ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          <HighlightText text={`${patient.first_name} ${patient.last_name}`} query={searchQuery} />
                        </h3>
                        {vipMeta.value > 0 && (
                          <span className="text-xs shrink-0 drop-shadow-xs" title={`سطح ${vipMeta.label}`}>{vipMeta.icon}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Medical File # Badge + Management Icons */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {patient.file_number && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          h.tap()
                          navigate(`/patients/${patient.id}`)
                        }}
                        title="شماره پرونده — کلیک جهت مشاهده"
                        className="inline-flex items-center gap-1 font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300/40 hover:scale-105 transition-all"
                        dir="ltr"
                      >
                        <FileText size={11} className="shrink-0 opacity-80" />
                        <span>#<HighlightText text={toPersianDigits(patient.file_number)} query={searchQuery} /></span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(patient)}
                      title="ویرایش بیمار"
                      aria-label="ویرایش اطلاعات"
                      className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(patient)}
                      title="انتقال به بایگانی"
                      aria-label="انتقال به بایگانی"
                      className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Contact Hub & Financial/Clinical Status Badges */}
                <div className="flex items-center justify-between gap-2 text-xs mb-2.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {/* Phone + Frameless 1-Touch Call & SMS triggers */}
                  <div className="flex items-center gap-2 min-w-0">
                    {patient.phone ? (
                      <div className="flex items-center font-mono font-bold text-slate-800 dark:text-slate-200 text-xs" dir="ltr">
                        <span>{privacyMode ? maskPhoneNumber(patient.phone) : toPersianDigits(patient.phone)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">بدون شماره</span>
                    )}

                    {patient.phone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`tel:${patient.phone}`}
                          onClick={() => { h.tap(); chimes.playPop() }}
                          className="p-1 text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 transition-colors press-scale"
                          title="تماس تلفنی با بیمار"
                          aria-label="تماس تلفنی"
                        >
                          <PhoneCall size={17} />
                        </a>
                        <a
                          href={`sms:${patient.phone}`}
                          onClick={() => { h.tap(); chimes.playPop() }}
                          className="p-1 text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200 transition-colors press-scale"
                          title="ارسال پیامک به بیمار"
                          aria-label="ارسال پیامک"
                        >
                          <MessageSquare size={17} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Financial & Clinical Badges Rail */}
                  <div className="flex items-center gap-1 flex-wrap shrink-0">
                    {isDebtor ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-black">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>بدهی: {formatCurrency(fin.balance)}</span>
                      </span>
                    ) : isSettled ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                        <Check size={14} className="stroke-[3] text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>تسویه</span>
                      </span>
                    ) : null}

                    {activeCheques > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200/60 dark:border-amber-900/50">
                        <CreditCard size={10} className="text-amber-600" />
                        <span>{toPersianDigits(activeCheques)} چک</span>
                      </span>
                    )}

                    {activePlans > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-900/50">
                        <CalendarClock size={10} className="text-indigo-600" />
                        <span>{toPersianDigits(activePlans)} قسط</span>
                      </span>
                    )}

                    {activeImplants > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold">
                        <Sparkles size={10} className="text-purple-600 dark:text-purple-400" />
                        <span>ایمپلنت</span>
                      </span>
                    )}

                    {activeLabOrders > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                        <FlaskConical size={10} className="text-blue-600 dark:text-blue-400" />
                        <span>لابراتوار</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 3: Streamlined Primary Action Dock (No redundant chart button) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs font-extrabold transition-all press-scale shadow-2xs"
                    title="ثبت نوبت جدید برای این بیمار"
                  >
                    <Calendar size={13} className="text-teal-600" />
                    <span>+ ثبت نوبت</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-xs transition-all press-scale"
                  >
                    <span>پرونده بیمار</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sterile dock clearance — prevents floating tab bar from obscuring bottom items */}
      <div className="h-32 sm:h-36" aria-hidden="true" />
        </>
      )}

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
