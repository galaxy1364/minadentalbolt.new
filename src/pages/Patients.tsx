import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Phone, Filter, Users, Award, AlertCircle, Smile, FileText, User, Trash2, Heart, Shield, MapPin } from 'lucide-react'
import { fetchPatients, createPatient, updatePatient, deletePatient, fetchDoctors, fetchPayments, fetchTreatments, fetchImplantCases, peekNextFileNumber } from '../lib/api'
import { toJalaliStringPretty, formatCurrency, toPersianDigits } from '../lib/persianDate'
import { Patient, Doctor, Payment, Treatment, ImplantCase } from '../types'
import { Modal, Card, Button, Input, Select, Textarea, Spinner, EmptyState, showToast, HighlightText, SkeletonList } from '../components/ui'
import { PatientPhotoUpload } from '../components/PatientPhotoUpload'
import { PersianDateInput } from '../components/PersianDateInput'
import { ModuleHeader } from '../components/ModuleHeader'
import { useConfirmAction, ConfirmActionConfig } from '../components/ConfirmAction'
import { h } from '../lib/haptics'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { scoreFields } from '../lib/fuzzySearch'
import { calcPatientBalance } from '../lib/finance'
import { calculateAge } from '../lib/patientUtils'

const vipLevels: { value: number; label: string; color: string; icon: string }[] = [
  { value: 0, label: 'عادی', color: 'slate', icon: '' },
  { value: 1, label: 'نقره‌ای', color: 'secondary', icon: '🥈' },
  { value: 2, label: 'طلایی', color: 'warning', icon: '🥇' },
  { value: 3, label: 'پلاتین', color: 'accent', icon: '💎' },
]

const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const genderOptions = [{ value: 'male', label: 'آقا' }, { value: 'female', label: 'خانم' }]

function getVipMeta(level: number | null) { return vipLevels.find((v) => v.value === (level ?? 0)) || vipLevels[0] }

const avatarColors = [
  'from-primary-400 to-primary-600',
  'from-accent-400 to-accent-600',
  'from-success-400 to-success-600',
  'from-warning-400 to-warning-600',
  'from-secondary-400 to-secondary-600',
  'from-error-400 to-error-600',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

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
}

export default function Patients() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [implantCases, setImplantCases] = useState<ImplantCase[]>([])
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

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const { confirmAction, close, ConfirmActionModal } = useConfirmAction()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pats, docs, pays, trts, implCases] = await Promise.all([fetchPatients(), fetchDoctors(), fetchPayments(), fetchTreatments(), fetchImplantCases()])
      setPatients(pats); setDoctors(docs); setPayments(pays); setTreatments(trts); setImplantCases(implCases)
    } catch { showToast('error', 'خطا در بارگذاری بیماران') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

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

  // All distinct patient tags currently in use — powers the grouping/
  // segmentation filter row (مینادنت's "گروه‌بندی و تفکیک بیماران").
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const p of patients) for (const t of p.tags || []) set.add(t)
    return Array.from(set).sort()
  }, [patients])

  const filteredPatients = useMemo(() => {
    let result = patients.filter((p) => {
      if (filterVip !== '' && (p.vip_level ?? 0) !== Number(filterVip)) return false
      if (filterGender && p.gender !== filterGender) return false
      if (filterActive !== '' && p.is_active !== (filterActive === 'true')) return false
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
  }, [patients, searchQuery, filterVip, filterGender, filterActive, filterTag])

  const stats = useMemo(() => {
    const total = patients.length
    const vip = patients.filter((p) => (p.vip_level ?? 0) > 0).length
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const newThisMonth = patients.filter((p) => p.created_at >= monthStart).length
    const active = patients.filter((p) => p.is_active).length
    return { total, vip, newThisMonth, active }
  }, [patients])

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
    })
    setModalOpen(true)
    h.pop()
  }

  // ── Preview + Confirm for create/edit ──
  const handleSave = () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) { h.error(); showToast('error', 'نام و نام خانوادگی الزامی است'); return }

    const vipMeta = getVipMeta(Number(formData.vip_level) || 0)
    const genderLabel = formData.gender ? (formData.gender === 'male' ? 'آقا' : 'خانم') : '—'
    const age = calculateAge(formData.birth_date)

    // Duplicate-patient detection: same phone number or same national
    // ID matching an EXISTING different patient — a soft warning, not
    // a block, since a real family could legitimately share a landline,
    // but two records for the same actual person is a real and common
    // data-quality problem worth flagging before it happens.
    const dupPhone = formData.phone
      ? patients.find((p) => p.phone === formData.phone.trim() && p.id !== editingPatient?.id)
      : null
    const dupNationalId = formData.national_id
      ? patients.find((p) => p.national_id === formData.national_id.trim() && p.id !== editingPatient?.id)
      : null

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
    if (dupNationalId) {
      fields.push({ label: '⚠ احتمال تکراری بودن', value: `کد ملی مشابه بیمار «${dupNationalId.first_name} ${dupNationalId.last_name}» است` })
    } else if (dupPhone) {
      fields.push({ label: '⚠ احتمال تکراری بودن', value: `شماره تلفن مشابه بیمار «${dupPhone.first_name} ${dupPhone.last_name}» است` })
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
        } as any
        if (editingPatient) await updatePatient(editingPatient.id, payload)
        else await createPatient(payload)
        setModalOpen(false)
        await loadData()
      },
    })
  }

  // ── Preview + Confirm for delete ──
  const handleDelete = (patient: Patient) => {
    const fin = patientFinances.get(patient.id) || { balance: 0, paid: 0, totalCost: 0 }
    const hasHistory = fin.totalCost > 0 || fin.paid > 0

    if (hasHistory) {
      // A patient with any financial/treatment history must never be
      // permanently deleted — that would destroy accounting/legal
      // records with no way back. Deactivating (hiding from active
      // lists, keeping all history intact) is the only safe option here.
      confirmAction({
        type: 'status',
        title: 'این بیمار قابل حذف نیست',
        warning: `این بیمار ${formatCurrency(fin.totalCost)} هزینه‌ی درمان و ${formatCurrency(fin.paid)} پرداخت ثبت‌شده دارد. برای حفظ سوابق مالی/قانونی، حذف کامل امکان‌پذیر نیست.`,
        fields: [
          { label: 'نام', value: `${patient.first_name} ${patient.last_name}`, icon: <User size={16} />, highlight: true },
          { label: 'پیشنهاد', value: 'غیرفعال کردن به‌جای حذف', icon: <Shield size={16} /> },
        ],
        confirmLabel: 'غیرفعال کردن بیمار',
        onConfirm: async () => {
          await updatePatient(patient.id, { is_active: false })
          showToast('success', 'بیمار غیرفعال شد — سوابق حفظ شد')
          await loadData()
        },
      })
      return
    }

    confirmAction({
      type: 'delete',
      title: 'حذف بیمار',
      warning: 'این بیمار هیچ سابقه‌ی مالی/درمانی ندارد — این عملیات قابل بازگشت نیست',
      fields: [
        { label: 'نام', value: `${patient.first_name} ${patient.last_name}`, icon: <User size={16} />, highlight: true },
        { label: 'شماره پرونده', value: patient.file_number || '—', icon: <FileText size={16} /> },
        { label: 'تلفن', value: patient.phone ? toPersianDigits(patient.phone) : '—', icon: <Phone size={16} /> },
      ],
      confirmLabel: 'تایید حذف',
      onConfirm: async () => { await deletePatient(patient.id); await loadData() },
    })
  }

  const ptr = usePullToRefresh(async () => { await loadData() })

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto" aria-busy="true" aria-live="polite">
        <div className="skeleton h-10 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-2">
          {[0,1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
        <div className="skeleton h-12 rounded-xl" />
        <div className="space-y-2">
          {[0,1,2,3,4].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto" {...ptr.handlers}>
      {ptr.pullDistance > 0 && (
        <div className="pull-indicator" style={{ opacity: ptr.isRefreshing ? 1 : ptr.pullProgress, top: -4 }}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full border-2 border-primary-300 dark:border-primary-600 border-t-primary-600 dark:border-t-primary-400 ${ptr.isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `scale(${0.6 + ptr.pullProgress * 0.4})` }} />
            <span className="text-[10px] text-primary-500 font-medium">{ptr.isRefreshing ? 'در حال به‌روزرسانی...' : 'برای به‌روزرسانی بکشید'}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <ModuleHeader
        moduleKey="patients"
        title="بیماران"
        subtitle={`${toPersianDigits(filteredPatients.length)} بیمار`}
        action={
          <button onClick={openCreateModal} aria-label="افزودن بیمار جدید" style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 shadow-md transition-all-smooth press-scale">
            <Plus size={16} /> بیمار جدید
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="quick-stat !p-3">
          <div className="flex items-center gap-1 mb-0.5"><Users size={12} className="text-primary-600" /><span className="text-[9px] text-slate-500">کل</span></div>
          <p className="text-lg font-extrabold text-slate-800">{toPersianDigits(stats.total)}</p>
        </div>
        <div className="quick-stat !p-3">
          <div className="flex items-center gap-1 mb-0.5"><Award size={12} className="text-warning-600" /><span className="text-[9px] text-slate-500">VIP</span></div>
          <p className="text-lg font-extrabold text-slate-800">{toPersianDigits(stats.vip)}</p>
        </div>
        <div className="quick-stat !p-3">
          <div className="flex items-center gap-1 mb-0.5"><Plus size={12} className="text-success-600" /><span className="text-[9px] text-slate-500">این ماه</span></div>
          <p className="text-lg font-extrabold text-slate-800">{toPersianDigits(stats.newThisMonth)}</p>
        </div>
        <div className="quick-stat !p-3">
          <div className="flex items-center gap-1 mb-0.5"><Smile size={12} className="text-accent-600" /><span className="text-[9px] text-slate-500">فعال</span></div>
          <p className="text-lg font-extrabold text-slate-800">{toPersianDigits(stats.active)}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، تلفن، پرونده..."
            aria-label="جستجوی بیمار"
            className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <button onClick={() => { h.tap(); setShowFilters(!showFilters) }} aria-label={showFilters ? 'بستن فیلترها' : 'باز کردن فیلترها'} aria-pressed={showFilters} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-primary-600 transition-all-smooth press-scale flex-shrink-0">
          <Filter size={16} />
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
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all-smooth ${filterTag === tag ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(filterVip || filterGender || (filterActive && filterActive !== 'true') || filterTag) && (
            <button onClick={() => { h.cancel(); setFilterVip(''); setFilterGender(''); setFilterActive('true'); setFilterTag('') }} className="text-xs text-primary-600 mt-2">پاک کردن فیلترها</button>
          )}
        </Card>
      )}

      {/* Patient list */}
      {filteredPatients.length === 0 ? (
        <Card className="p-6">
          {(() => {
            // "فعال" defaults to true (not a filter the user explicitly
            // chose), so it shouldn't count as "you applied a filter" —
            // that made the empty state always say "change your
            // filters" and hide the add-patient button, even for a
            // genuinely brand-new clinic with zero patients at all.
            const userChoseAFilter = !!(searchQuery || filterVip || filterGender || (filterActive && filterActive !== 'true') || filterTag)
            const hasAnyPatientsAtAll = patients.length > 0
            const hiddenByActiveDefault = !userChoseAFilter && hasAnyPatientsAtAll
            return (
              <EmptyState
                icon={<Users size={32} />}
                title="بیماری یافت نشد"
                description={
                  userChoseAFilter ? 'فیلترها را تغییر دهید'
                  : hiddenByActiveDefault ? 'همه‌ی بیماران شما غیرفعال هستند — برای دیدنشان، فیلتر وضعیت را روی «غیرفعال» بگذارید یا به بایگانی مراجعه کنید'
                  : 'برای ثبت بیمار جدید کلیک کنید'
                }
                action={
                  hiddenByActiveDefault
                    ? <Button size="sm" variant="secondary" onClick={() => { h.tap(); setFilterActive('false') }}>نمایش غیرفعال‌ها</Button>
                    : !userChoseAFilter ? <Button size="sm" onClick={openCreateModal}><Plus size={16} /> افزودن</Button> : undefined
                }
              />
            )
          })()}
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPatients.map((patient, idx) => {
            const vipMeta = getVipMeta(patient.vip_level)
            const age = calculateAge(patient.birth_date)
            const fin = patientFinances.get(patient.id) || { balance: 0, paid: 0, totalCost: 0 }
            const hasAllergies = patient.allergies && patient.allergies.trim().length > 0
            const hasConditions = patient.medical_conditions && patient.medical_conditions.trim().length > 0

            return (
              <div
                key={patient.id}
                className="appt-card p-3.5 cursor-pointer list-stagger-item"
                style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                onClick={() => { h.tap(); navigate(`/patients/${patient.id}`) }}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ${getAvatarColor(patient.id)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-ios`}>
                    {patient.avatar_url ? <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(patient)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`font-bold text-sm truncate ${fin.balance > 0 ? 'text-error-600' : 'text-slate-800'}`}>
                        <HighlightText text={`${patient.first_name} ${patient.last_name}`} query={searchQuery} />
                      </h3>
                      {vipMeta.value > 0 && <span className="text-[10px]">{vipMeta.icon}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                      {patient.file_number && (
                        <span className={`flex items-center gap-0.5 font-mono ${fin.balance > 0 ? 'text-error-500 font-bold' : ''}`}>
                          <FileText size={10} /> <HighlightText text={patient.file_number} query={searchQuery} />
                        </span>
                      )}
                      {age !== null && <span>{toPersianDigits(age)} سال</span>}
                      {patient.gender && <span>{patient.gender === 'male' ? 'آقا' : 'خانم'}</span>}
                      {patient.phone && (
                        <span className="flex items-center gap-0.5" dir="ltr">
                          <Phone size={10} /> <HighlightText text={toPersianDigits(patient.phone)} query={searchQuery} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial + edit + delete */}
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditModal(patient)}
                      aria-label={`ویرایش ${patient.first_name} ${patient.last_name}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all-smooth press-scale"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(patient)}
                      aria-label={`حذف ${patient.first_name} ${patient.last_name}`}
                      className="p-1.5 rounded-lg text-error-400 hover:bg-error-50 hover:text-error-600 transition-all-smooth press-scale"
                    >
                      <Trash2 size={14} />
                    </button>
                    {fin.totalCost > 0 ? (
                      fin.balance <= 0 ? (
                        <span className="status-pill bg-success-100 text-success-700">تسویه</span>
                      ) : (
                        <span className="status-pill bg-error-100 text-error-700">بدهکار</span>
                      )
                    ) : (
                      <span className="status-pill bg-slate-100 text-slate-500">بدون تراکنش</span>
                    )}
                  </div>
                </div>

                {/* Medical alerts row */}
                {(hasAllergies || hasConditions || !patient.is_active) && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                    {hasAllergies && <span className="status-pill bg-error-50 text-error-600"><AlertCircle size={10} className="ml-0.5" /> حساسیت</span>}
                    {hasConditions && <span className="status-pill bg-warning-50 text-warning-600"><AlertCircle size={10} className="ml-0.5" /> بیماری زمینه‌ای</span>}
                    {!patient.is_active && <span className="status-pill bg-slate-100 text-slate-500">غیرفعال</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
                <Input label="نام" value={formData.first_name} onChange={(v) => setFormData((p) => ({ ...p, first_name: v }))} placeholder="نام" />
                <Input label="نام خانوادگی" value={formData.last_name} onChange={(v) => setFormData((p) => ({ ...p, last_name: v }))} placeholder="نام خانوادگی" />
                <Input label="کد ملی" value={formData.national_id} onChange={(v) => setFormData((p) => ({ ...p, national_id: v }))} placeholder="کد ملی" dir="ltr" />
                <Input label="تلفن" value={formData.phone} onChange={(v) => setFormData((p) => ({ ...p, phone: v }))} placeholder="09xxxxxxxxx" dir="ltr" />
                <Input label="تلفن دوم" value={formData.phone2} onChange={(v) => setFormData((p) => ({ ...p, phone2: v }))} placeholder="تلفن ثانویه" dir="ltr" />
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
