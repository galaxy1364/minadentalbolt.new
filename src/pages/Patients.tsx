import { useState, useEffect, useCallback, useMemo } from 'react'
import { PatientDebtBar } from '../components/PatientDebtBar'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Phone, PhoneCall, Filter, Users, Award, AlertCircle, Smile, FileText, User, Heart, Shield, MapPin, Archive, Calendar, MessageSquare, MessageCircle, Eye, EyeOff, Banknote, CalendarClock, ChevronLeft, CreditCard, CheckCircle2, Check, LayoutGrid, List, Sparkles, Activity, Printer, FlaskConical } from 'lucide-react'
import { fetchPatients, createPatient, updatePatient, fetchDoctors, fetchPayments, fetchTreatments, fetchImplantCases, peekNextFileNumber, fetchCheques, fetchPaymentPlans, fetchLabOrders, fetchAllInstallments } from '../lib/api'
import { useDataRefresh } from '../lib/realtimeSync'
import { toJalaliStringPretty, formatCurrency, toPersianDigits } from '../lib/persianDate'
import { Patient, Doctor, Payment, Treatment, ImplantCase, Cheque, PaymentPlan, LabOrder, Installment } from '../types'
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
  { value: 1, label: 'نقره‌ای', color: 'secondary', icon: '' },
  { value: 2, label: 'طلایی', color: 'warning', icon: '' },
  { value: 3, label: 'پلاتین', color: 'accent', icon: '' },
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
  const [installments, setInstallments] = useState<Installment[]>([])
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

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const { confirmAction, close, ConfirmActionModal } = useConfirmAction()
  const { privacyMode, togglePrivacyMode, maskPhoneNumber, maskNationalId } = usePrivacyMode()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pats, docs, pays, trts, implCases, chqs, plans, labs, insts] = await Promise.all([
        fetchPatients(),
        fetchDoctors(),
        fetchPayments(),
        fetchTreatments(),
        fetchImplantCases(),
        fetchCheques(),
        fetchPaymentPlans(),
        fetchLabOrders(),
        fetchAllInstallments(),
      ])
      setPatients(pats)
      setDoctors(docs)
      setPayments(pays)
      setTreatments(trts)
      setImplantCases(implCases)
      setCheques(chqs)
      setPaymentPlans(plans)
      setLabOrders(labs)
      setInstallments(insts)
    } catch { showToast('error', 'خطا در بارگذاری بیماران') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useDataRefresh(['patients', 'payments', 'treatments', 'implant_cases', 'cheques', 'payment_plans', 'installments', 'lab_orders'], loadData)

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
      fields.push({ label: 'شماره تلفن مشترک', value: `این شماره برای بیمار «${dupPhone.first_name} ${dupPhone.last_name}» هم ثبت شده — اگر عضو خانواده‌ی دیگری‌ست، مشکلی نیست` })
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

      <MobilePatientsDemo
        patients={patients}
        patientFinances={patientFinances}
        patientChequesMap={patientChequesMap}
        patientPlansMap={patientPlansMap}
        patientImplantsMap={patientImplantsMap}
        patientLabOrdersMap={patientLabOrdersMap}
        cheques={cheques}
        installments={installments}
        paymentPlans={paymentPlans}
        labOrders={labOrders}
        treatments={treatments}
        payments={payments}
        onOpenCreate={openCreateModal}
        onOpenEdit={openEditModal}
      />

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
