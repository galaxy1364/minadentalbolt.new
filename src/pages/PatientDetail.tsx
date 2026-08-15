// PatientDetail.tsx - Persian RTL Dental Clinic Patient Detail Page
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Edit2, Phone, Mail, MapPin, Calendar, CreditCard, Activity, FileText, Image as ImageIcon, Shield, Pill, Smile, Award, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { fetchPatient, updatePatient, fetchTimeline, fetchTreatments, fetchAppointments, fetchPayments, fetchToothRecords, createToothRecord, updateToothRecord, fetchPrescriptions, fetchRadiologyImages, fetchEncounters, fetchDoctors } from '../lib/api'
import { toJalaliString, toJalaliStringPretty, formatCurrency, toPersianDigits, formatTime } from '../lib/persianDate'
import { calcPatientBalance } from '../lib/finance'
import { Patient, Doctor, PatientTimeline, Treatment, Appointment, Payment, ToothRecord, Prescription, RadiologyImage, Encounter } from '../types'
import { Modal, Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, Tabs, showToast } from '../components/ui'
import DentalChart from '../components/DentalChart'

// ============================================================================
// Constants
// ============================================================================

const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const genderOptions = [{ value: 'male', label: 'آقا' }, { value: 'female', label: 'خانم' }]
const vipLevels = [
  { value: '0', label: 'عادی' },
  { value: '1', label: 'نقره‌ای' },
  { value: '2', label: 'طلایی' },
  { value: '3', label: 'پلاتین' },
]

// FDI Tooth chart - upper right (18-11), upper left (21-28), lower left (31-38), lower right (41-48)
// FDI tooth numbering quadrants
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38]
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]
void [UPPER_RIGHT, UPPER_LEFT, LOWER_LEFT, LOWER_RIGHT]

const treatmentStatuses: { value: string; label: string; color: string }[] = [
  { value: 'planned', label: 'برنامه‌ریزی شده', color: 'slate' },
  { value: 'in_progress', label: 'در حال انجام', color: 'warning' },
  { value: 'completed', label: 'تکمیل شده', color: 'success' },
  { value: 'cancelled', label: 'لغو شده', color: 'error' },
]

const appointmentStatuses: { value: string; label: string; color: string }[] = [
  { value: 'scheduled', label: 'زمان‌بندی شده', color: 'slate' },
  { value: 'confirmed', label: 'تایید شده', color: 'primary' },
  { value: 'in_chair', label: 'روی صندلی', color: 'warning' },
  { value: 'completed', label: 'تکمیل شده', color: 'success' },
  { value: 'cancelled', label: 'لغو شده', color: 'error' },
  { value: 'no_show', label: 'حضور نداشت', color: 'error' },
]

const paymentMethods: { value: string; label: string }[] = [
  { value: 'cash', label: 'نقدی' },
  { value: 'card', label: 'کارت' },
  { value: 'transfer', label: 'انتقال بانکی' },
  { value: 'cheque', label: 'چک' },
  { value: 'insurance', label: 'بیمه' },
]

const paymentStatuses: { value: string; label: string; color: string }[] = [
  { value: 'completed', label: 'تکمیل شده', color: 'success' },
  { value: 'pending', label: 'در انتظار', color: 'warning' },
  { value: 'failed', label: 'ناموفق', color: 'error' },
]

const timelineIcons: Record<string, React.ReactNode> = {
  patient_created: <Smile size={16} />,
  appointment: <Calendar size={16} />,
  treatment: <Activity size={16} />,
  payment: <CreditCard size={16} />,
  prescription: <Pill size={16} />,
  radiology: <ImageIcon size={16} />,
  encounter: <FileText size={16} />,
  default: <Clock size={16} />,
}

// Avatar colors
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

function getInitials(patient: Patient): string {
  return ((patient.first_name?.charAt(0) || '') + (patient.last_name?.charAt(0) || '')).trim() || '?'
}

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function getVipLabel(level: number | null): { label: string; color: string } {
  const v = level ?? 0
  if (v === 3) return { label: 'پلاتین', color: 'accent' }
  if (v === 2) return { label: 'طلایی', color: 'warning' }
  if (v === 1) return { label: 'نقره‌ای', color: 'secondary' }
  return { label: 'عادی', color: 'slate' }
}

// ============================================================================
// Main Component
// ============================================================================

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Tab data
  const [timeline, setTimeline] = useState<PatientTimeline[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [toothRecords, setToothRecords] = useState<ToothRecord[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [radiologyImages, setRadiologyImages] = useState<RadiologyImage[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    national_id: '',
    phone: '',
    phone2: '',
    email: '',
    birth_date: '',
    gender: '',
    blood_type: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    medical_history: '',
    allergies: '',
    medications: '',
    medical_conditions: '',
    insurance_info: '',
    insurance_number: '',
    notes: '',
    vip_level: '0',
    is_active: true,
    primary_doctor_id: '',
    tags: '',
  })

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadPatient = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [p, docs] = await Promise.all([
        fetchPatient(id),
        fetchDoctors(),
      ])
      if (!p) {
        showToast('error', 'بیمار یافت نشد')
        navigate('/patients')
        return
      }
      setPatient(p)
      setDoctors(docs)
      setFormData({
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        national_id: p.national_id || '',
        phone: p.phone || '',
        phone2: p.phone2 || '',
        email: p.email || '',
        birth_date: p.birth_date || '',
        gender: p.gender || '',
        blood_type: p.blood_type || '',
        address: p.address || '',
        city: p.city || '',
        province: p.province || '',
        postal_code: p.postal_code || '',
        medical_history: p.medical_history || '',
        allergies: p.allergies || '',
        medications: p.medications || '',
        medical_conditions: p.medical_conditions || '',
        insurance_info: p.insurance_info || '',
        insurance_number: p.insurance_number || '',
        notes: p.notes || '',
        vip_level: String(p.vip_level ?? 0),
        is_active: p.is_active,
        primary_doctor_id: p.primary_doctor_id || '',
        tags: (p.tags || []).join(', '),
      })
    } catch (err) {
      console.error('Error loading patient:', err)
      showToast('error', 'خطا در بارگذاری اطلاعات بیمار')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  const loadTabData = useCallback(async () => {
    if (!id) return
    try {
      const [tl, tr, ap, pm, tr_records, pres, radio, enc] = await Promise.all([
        fetchTimeline(id),
        fetchTreatments(undefined, id),
        fetchAppointments(),
        fetchPayments(id),
        fetchToothRecords(id),
        fetchPrescriptions(id),
        fetchRadiologyImages(id),
        fetchEncounters(id),
      ])
      setTimeline(tl)
      setTreatments(tr)
      setAppointments(ap.filter((a) => a.patient_id === id))
      setPayments(pm)
      setToothRecords(tr_records)
      setPrescriptions(pres as unknown as Prescription[])
      setRadiologyImages(radio)
      setEncounters(enc)
    } catch (err) {
      console.error('Error loading tab data:', err)
    }
  }, [id])

  useEffect(() => {
    loadPatient()
  }, [loadPatient])

  useEffect(() => {
    loadTabData()
  }, [loadTabData])

  // ===========================================================================
  // Handlers
  // ===========================================================================

  const handleSavePatient = async () => {
    if (!patient) return
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      showToast('error', 'نام و نام خانوادگی الزامی است')
      return
    }
    setSaving(true)
    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        national_id: formData.national_id || null,
        phone: formData.phone || null,
        phone2: formData.phone2 || null,
        email: formData.email || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender || null,
        blood_type: formData.blood_type || null,
        address: formData.address || null,
        city: formData.city || null,
        province: formData.province || null,
        postal_code: formData.postal_code || null,
        medical_history: formData.medical_history || null,
        allergies: formData.allergies || null,
        medications: formData.medications || null,
        medical_conditions: formData.medical_conditions || null,
        insurance_info: formData.insurance_info || null,
        insurance_number: formData.insurance_number || null,
        notes: formData.notes || null,
        vip_level: Number(formData.vip_level) || 0,
        is_active: formData.is_active,
        primary_doctor_id: formData.primary_doctor_id || null,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      } as any
      const updated = await updatePatient(patient.id, payload)
      setPatient(updated)
      setEditModalOpen(false)
      showToast('success', 'اطلاعات بیمار ویرایش شد')
    } catch (err) {
      console.error('Error saving patient:', err)
      showToast('error', 'خطا در ذخیره اطلاعات')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTooth = async (toothNumber: string, data: { is_missing: boolean; is_implant: boolean; notes: string; condition?: string; surfaces?: string }) => {
    if (!patient) return
    try {
      const existing = toothRecords.find((r) => r.tooth_number === toothNumber)
      const payload = { is_missing: data.is_missing, is_implant: data.is_implant, notes: data.notes } as any
      if (existing) {
        await updateToothRecord(existing.id, payload)
      } else {
        await createToothRecord({ patient_id: patient.id, tooth_number: toothNumber, ...payload } as any)
      }
      showToast('success', 'رکورد دندان ذخیره شد')
      await loadTabData()
    } catch (err) {
      showToast('error', 'خطا در ذخیره رکورد دندان')
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return 'نامشخص'
    const doc = doctors.find((d) => d.id === doctorId)
    return doc ? `دکتر ${doc.name || doc.specialty || 'پزشک'}` : 'نامشخص'
  }

  // Shared with Dashboard/Billing/Patients (src/lib/finance.ts) so this
  // number can never silently diverge between pages again.
  const { paid: totalPaid, totalCost: totalTreatmentCost, balance: patientBalance } = calcPatientBalance(payments, treatments)

  // ===========================================================================
  // Render: Patient Header
  // ===========================================================================

  const renderHeader = () => {
    if (!patient) return null
    const age = calculateAge(patient.birth_date)
    const vipMeta = getVipLabel(patient.vip_level)
    const hasAllergies = patient.allergies && patient.allergies.trim().length > 0
    const hasConditions = patient.medical_conditions && patient.medical_conditions.trim().length > 0
    const hasMedications = patient.medications && patient.medications.trim().length > 0

    return (
      <Card className="p-4 md:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Back button */}
          <button
            onClick={() => navigate('/patients')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all-smooth"
          >
            <ArrowRight size={20} />
          </button>

          {/* Avatar */}
          <div
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${getAvatarColor(patient.id)} flex items-center justify-center text-white font-bold text-xl md:text-2xl flex-shrink-0`}
          >
            {getInitials(patient)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-lg md:text-xl font-bold text-slate-800">
                {patient.first_name} {patient.last_name}
              </h1>
              <Badge color={vipMeta.color}>{vipMeta.label}</Badge>
              {!patient.is_active && <Badge color="error">غیرفعال</Badge>}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-sm text-slate-500">
              {patient.file_number && (
                <span className="font-mono text-xs">پرونده: {patient.file_number}</span>
              )}
              {patient.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} /> <span dir="ltr">{toPersianDigits(patient.phone)}</span>
                </span>
              )}
              {age !== null && <span>{toPersianDigits(age)} سال</span>}
              {patient.gender && <span>{patient.gender === 'male' ? 'آقا' : 'خانم'}</span>}
              {patient.blood_type && (
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-error-400" />
                  {patient.blood_type}
                </span>
              )}
            </div>
            {/* Medical alerts */}
            {(hasAllergies || hasConditions || hasMedications) && (
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {hasAllergies && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-error-50 text-error-600 text-xs">
                    <AlertCircle size={12} /> حساسیت: {patient.allergies}
                  </div>
                )}
                {hasConditions && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warning-50 text-warning-600 text-xs">
                    <AlertCircle size={12} /> بیماری: {patient.medical_conditions}
                  </div>
                )}
                {hasMedications && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 text-primary-600 text-xs">
                    <Pill size={12} /> دارو: {patient.medications}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit button */}
          <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
            <Edit2 size={16} /> ویرایش
          </Button>
        </div>
      </Card>
    )
  }

  // ===========================================================================
  // Render: Tabs
  // ===========================================================================

  const tabs = [
    { key: 'overview', label: 'نمای کلی', icon: <FileText size={16} /> },
    { key: 'timeline', label: 'تایم‌لاین', icon: <Clock size={16} /> },
    { key: 'treatments', label: 'درمان‌ها', icon: <Activity size={16} /> },
    { key: 'appointments', label: 'نوبت‌ها', icon: <Calendar size={16} /> },
    { key: 'payments', label: 'پرداخت‌ها', icon: <CreditCard size={16} /> },
    { key: 'teeth', label: 'نمودار دندان‌ها', icon: <Smile size={16} /> },
    { key: 'prescriptions', label: 'نسخه‌ها', icon: <Pill size={16} /> },
    { key: 'radiology', label: 'رادیولوژی', icon: <ImageIcon size={16} /> },
    { key: 'insurance', label: 'بیمه', icon: <Shield size={16} /> },
    { key: 'documents', label: 'اسناد', icon: <FileText size={16} /> },
  ]

  // ===========================================================================
  // Render: Overview Tab
  // ===========================================================================

  const renderOverview = () => {
    if (!patient) return null
    const age = calculateAge(patient.birth_date)
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Personal Info */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <FileText size={16} /> اطلاعات شخصی
          </h3>
          <div className="space-y-2">
            <InfoRow label="نام کامل" value={`${patient.first_name} ${patient.last_name}`} />
            <InfoRow label="کد ملی" value={patient.national_id ? toPersianDigits(patient.national_id) : '-'} dir="ltr" />
            <InfoRow label="تاریخ تولد" value={patient.birth_date ? toJalaliStringPretty(patient.birth_date) : '-'} />
            {age !== null && <InfoRow label="سن" value={`${toPersianDigits(age)} سال`} />}
            <InfoRow label="جنسیت" value={patient.gender === 'male' ? 'آقا' : patient.gender === 'female' ? 'خانم' : '-'} />
            <InfoRow label="گروه خونی" value={patient.blood_type || '-'} />
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Phone size={16} /> اطلاعات تماس
          </h3>
          <div className="space-y-2">
            <InfoRow label="تلفن" value={patient.phone ? toPersianDigits(patient.phone) : '-'} dir="ltr" icon={<Phone size={12} />} />
            <InfoRow label="تلفن دوم" value={patient.phone2 ? toPersianDigits(patient.phone2) : '-'} dir="ltr" />
            <InfoRow label="ایمیل" value={patient.email || '-'} dir="ltr" icon={<Mail size={12} />} />
            <InfoRow label="استان" value={patient.province || '-'} />
            <InfoRow label="شهر" value={patient.city || '-'} />
            <InfoRow label="آدرس" value={patient.address || '-'} icon={<MapPin size={12} />} />
            <InfoRow label="کد پستی" value={patient.postal_code ? toPersianDigits(patient.postal_code) : '-'} dir="ltr" />
          </div>
        </Card>

        {/* Medical History */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Activity size={16} /> سوابق پزشکی
          </h3>
          <div className="space-y-2">
            <InfoRow label="تاریخچه پزشکی" value={patient.medical_history || '-'} />
            <InfoRow label="حساسیت‌ها" value={patient.allergies || '-'} />
            <InfoRow label="داروهای مصرفی" value={patient.medications || '-'} />
            <InfoRow label="بیماری‌های زمینه‌ای" value={patient.medical_conditions || '-'} />
          </div>
        </Card>

        {/* Insurance & Summary */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Shield size={16} /> بیمه و خلاصه
          </h3>
          <div className="space-y-2">
            <InfoRow label="اطلاعات بیمه" value={patient.insurance_info || '-'} />
            <InfoRow label="شماره بیمه" value={patient.insurance_number ? toPersianDigits(patient.insurance_number) : '-'} dir="ltr" />
            <InfoRow label="پزشک اصلی" value={getDoctorName(patient.primary_doctor_id)} />
            <InfoRow label="سطح VIP" value={getVipLabel(patient.vip_level).label} />
            <InfoRow label="تاریخ ثبت" value={toJalaliStringPretty(patient.created_at)} />
            <div className="pt-2 mt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-success-50 text-center">
                  <p className="text-xs text-slate-500">پرداختی کل</p>
                  <p className="text-sm font-bold text-success-700">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary-50 text-center">
                  <p className="text-xs text-slate-500">هزینه درمان</p>
                  <p className="text-sm font-bold text-primary-700">{formatCurrency(totalTreatmentCost)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Notes */}
        {patient.notes && (
          <Card className="p-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-700 mb-2">یادداشت‌ها</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{patient.notes}</p>
          </Card>
        )}
      </div>
    )
  }

  // ===========================================================================
  // Render: Timeline Tab
  // ===========================================================================

  const renderTimeline = () => {
    if (timeline.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<Clock size={32} />} title="رویدادی ثبت نشده" description="تایم‌لاین این بیمار خالی است" />
        </Card>
      )
    }
    return (
      <Card className="p-4 md:p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute right-5 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-4">
            {timeline.map((event) => (
              <div key={event.id} className="relative flex items-start gap-3 pr-2">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 z-10">
                  {timelineIcons[event.event_type] || timelineIcons.default}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-sm font-medium text-slate-800">{event.title || 'رویداد'}</h4>
                    <span className="text-xs text-slate-400">{toJalaliStringPretty(event.event_date)}</span>
                  </div>
                  {event.description && (
                    <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  // ===========================================================================
  // Render: Treatments Tab
  // ===========================================================================

  const renderTreatments = () => {
    if (treatments.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<Activity size={32} />} title="درمانی ثبت نشده" description="هنوز درمانی برای این بیمار ثبت نشده است" />
        </Card>
      )
    }
    return (
      <div className="space-y-2">
        {treatments.map((t) => {
          const statusMeta = treatmentStatuses.find((s) => s.value === t.status) || treatmentStatuses[0]
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-medium text-slate-800">
                      {t.procedure_name || t.description || 'درمان'}
                    </h4>
                    <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                    {t.tooth_number && <span>دندان: {toPersianDigits(t.tooth_number)}</span>}
                    <span>پزشک: {getDoctorName(t.doctor_id)}</span>
                    <span>{toJalaliStringPretty(t.created_at)}</span>
                  </div>
                  {t.notes && <p className="text-xs text-slate-400 mt-1">{t.notes}</p>}
                </div>
                <div className="text-left">
                  {t.total_price != null && (
                    <p className="text-sm font-bold text-slate-700">{formatCurrency(t.total_price)} تومان</p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  // ===========================================================================
  // Render: Appointments Tab
  // ====================================================================================

  const renderAppointments = () => {
    if (appointments.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<Calendar size={32} />} title="نوبتی ثبت نشده" description="برای این بیمار نوبتی ثبت نشده است" />
        </Card>
      )
    }
    const now = new Date().toISOString().slice(0, 10)
    const upcoming = appointments.filter((a) => a.date >= now).sort((a, b) => a.date.localeCompare(b.date))
    const past = appointments.filter((a) => a.date < now).sort((a, b) => b.date.localeCompare(a.date))
    return (
      <div className="space-y-4">
        {upcoming.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2">نوبت‌های آینده</h3>
            <div className="space-y-2">
              {upcoming.map((a) => {
                const statusMeta = appointmentStatuses.find((s) => s.value === a.status) || appointmentStatuses[0]
                return (
                  <Card key={a.id} className="p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{toJalaliStringPretty(a.date)}</p>
                          <p className="text-xs text-slate-500">{formatTime(a.start_time)} - {formatTime(a.end_time)}</p>
                        </div>
                      </div>
                      <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2">نوبت‌های گذشته</h3>
            <div className="space-y-2">
              {past.map((a) => {
                const statusMeta = appointmentStatuses.find((s) => s.value === a.status) || appointmentStatuses[0]
                return (
                  <Card key={a.id} className="p-3 opacity-70">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{toJalaliStringPretty(a.date)}</p>
                          <p className="text-xs text-slate-400">{formatTime(a.start_time)} - {formatTime(a.end_time)}</p>
                        </div>
                      </div>
                      <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===========================================================================
  // Render: Payments Tab
  // ===========================================================================

  const renderPayments = () => {
    if (payments.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<CreditCard size={32} />} title="پرداختی ثبت نشده" description="برای این بیمار پرداختی ثبت نشده است" />
        </Card>
      )
    }
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs text-slate-500 mb-1">کل پرداختی</p>
            <p className="text-lg font-bold text-success-700">{formatCurrency(totalPaid)} تومان</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 mb-1">کل هزینه درمان</p>
            <p className="text-lg font-bold text-primary-700">{formatCurrency(totalTreatmentCost)} تومان</p>
          </Card>
          <Card className="p-4 col-span-2 md:col-span-1">
            <p className="text-xs text-slate-500 mb-1">مانده</p>
            <p className={`text-lg font-bold ${patientBalance > 0 ? 'text-error-700' : 'text-success-700'}`}>
              {formatCurrency(patientBalance)} تومان
            </p>
          </Card>
        </div>

        {/* Payment list */}
        <div className="space-y-2">
          {payments.map((p) => {
            const methodMeta = paymentMethods.find((m) => m.value === p.payment_method)
            const statusMeta = paymentStatuses.find((s) => s.value === p.status) || paymentStatuses[0]
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success-50 text-success-600 flex items-center justify-center">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(p.amount)} تومان</p>
                      <p className="text-xs text-slate-500">
                        {methodMeta?.label || 'نامشخص'} - {toJalaliStringPretty(p.payment_date)}
                      </p>
                    </div>
                  </div>
                  <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                </div>
                {p.notes && <p className="text-xs text-slate-400 mt-2">{p.notes}</p>}
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // ===========================================================================
  // Render: Teeth Chart Tab
  // ===========================================================================

  const renderTeethChart = () => (
    <DentalChart
      toothRecords={toothRecords}
      treatments={treatments}
      onUpdateTooth={handleUpdateTooth}
    />
  )

  // ===========================================================================
  // Render: Prescriptions Tab
  // ===========================================================================

  const renderPrescriptions = () => {
    if (prescriptions.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<Pill size={32} />} title="نسخه‌ای ثبت نشده" description="برای این بیمار نسخه‌ای ثبت نشده است" />
        </Card>
      )
    }
    return (
      <div className="space-y-2">
        {prescriptions.map((p) => {
          const pres = p as any
          const doctor = doctors.find((d) => d.id === pres.doctor_id)
          const meds = pres.medications
          let medList: string[] = []
          if (Array.isArray(meds)) {
            medList = meds.map((m: any) => typeof m === 'string' ? m : m.name || '')
          } else if (meds && typeof meds === 'object') {
            medList = Object.values(meds).map((m: any) => typeof m === 'string' ? m : m?.name || '')
          }
          return (
            <Card key={pres.id} className="p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <Pill size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">نسخه</p>
                    <p className="text-xs text-slate-500">{doctor ? `دکتر ${doctor.name || doctor.specialty || 'پزشک'}` : 'نامشخص'} - {toJalaliStringPretty(pres.created_at)}</p>
                  </div>
                </div>
                <Badge color={pres.status === 'active' ? 'success' : 'slate'}>{pres.status === 'active' ? 'فعال' : pres.status}</Badge>
              </div>
              {medList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {medList.map((m, i) => m && (
                    <span key={i} className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs">{m}</span>
                  ))}
                </div>
              )}
              {pres.notes && <p className="text-xs text-slate-400 mt-2">{pres.notes}</p>}
            </Card>
          )
        })}
      </div>
    )
  }

  // ===========================================================================
  // Render: Radiology Tab
  // ===========================================================================

  const renderRadiology = () => {
    if (radiologyImages.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<ImageIcon size={32} />} title="تصویر رادیولوژی ثبت نشده" description="برای این بیمار تصویر رادیولوژی ثبت نشده است" />
        </Card>
      )
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {radiologyImages.map((img) => (
          <Card key={img.id} className="p-3">
            <div className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center mb-2 overflow-hidden">
              {img.image_url ? (
                <img src={img.image_url} alt={img.description || 'رادیولوژی'} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={32} className="text-slate-300" />
              )}
            </div>
            <div className="space-y-1">
              {img.image_type && <Badge color="primary">{img.image_type}</Badge>}
              {img.tooth_number && <p className="text-xs text-slate-500">دندان: {toPersianDigits(img.tooth_number)}</p>}
              {img.taken_at && <p className="text-xs text-slate-400">{toJalaliStringPretty(img.taken_at)}</p>}
              {img.description && <p className="text-xs text-slate-500 truncate">{img.description}</p>}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // ===========================================================================
  // Render: Insurance Tab
  // ===========================================================================

  const renderInsurance = () => {
    if (!patient) return null
    const hasInsurance = patient.insurance_info || patient.insurance_number
    if (!hasInsurance) {
      return (
        <Card className="p-6">
          <EmptyState icon={<Shield size={32} />} title="اطلاعات بیمه ثبت نشده" description="برای این بیمار اطلاعات بیمه‌ای ثبت نشده است" />
        </Card>
      )
    }
    return (
      <Card className="p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Shield size={16} /> اطلاعات بیمه
        </h3>
        <div className="space-y-2">
          <InfoRow label="نام بیمه" value={patient.insurance_info || '-'} />
          <InfoRow label="شماره بیمه" value={patient.insurance_number ? toPersianDigits(patient.insurance_number) : '-'} dir="ltr" />
          <InfoRow label="اعتبار بیمه" value={patient.insurance_info || '-'} />
        </div>
      </Card>
    )
  }

  // ===========================================================================
  // Render: Documents Tab
  // ===========================================================================

  const renderDocuments = () => {
    const docCount = encounters.length + radiologyImages.length + prescriptions.length
    if (docCount === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<FileText size={32} />} title="سندی ثبت نشده" description="برای این بیمار سندی ثبت نشده است" />
        </Card>
      )
    }
    return (
      <div className="space-y-4">
        {/* Encounters */}
        {encounters.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">ویزیت‌ها</h3>
            <div className="space-y-2">
              {encounters.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-sm text-slate-700">{e.chief_complaint || 'ویزیت'}</p>
                    <p className="text-xs text-slate-400">{toJalaliStringPretty(e.encounter_date)}</p>
                  </div>
                  <Badge color={e.status === 'completed' ? 'success' : 'warning'}>
                    {e.status === 'completed' ? 'تکمیل شده' : e.status === 'in_progress' ? 'در حال انجام' : e.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Summary counts */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <FileText size={20} className="mx-auto text-primary-500 mb-1" />
            <p className="text-lg font-bold text-slate-800">{toPersianDigits(encounters.length)}</p>
            <p className="text-xs text-slate-500">ویزیت</p>
          </Card>
          <Card className="p-4 text-center">
            <ImageIcon size={20} className="mx-auto text-accent-500 mb-1" />
            <p className="text-lg font-bold text-slate-800">{toPersianDigits(radiologyImages.length)}</p>
            <p className="text-xs text-slate-500">رادیولوژی</p>
          </Card>
          <Card className="p-4 text-center">
            <Pill size={20} className="mx-auto text-success-500 mb-1" />
            <p className="text-lg font-bold text-slate-800">{toPersianDigits(prescriptions.length)}</p>
            <p className="text-xs text-slate-500">نسخه</p>
          </Card>
        </div>
      </div>
    )
  }

  // ===========================================================================
  // Render: Edit Modal
  // ===========================================================================

  const renderEditModal = () => {
    return (
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="ویرایش بیمار" size="full">
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">اطلاعات شخصی</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="نام" value={formData.first_name} onChange={(v) => setFormData((p) => ({ ...p, first_name: v }))} />
              <Input label="نام خانوادگی" value={formData.last_name} onChange={(v) => setFormData((p) => ({ ...p, last_name: v }))} />
              <Input label="کد ملی" value={formData.national_id} onChange={(v) => setFormData((p) => ({ ...p, national_id: v }))} dir="ltr" />
              <Input label="تلفن" value={formData.phone} onChange={(v) => setFormData((p) => ({ ...p, phone: v }))} dir="ltr" />
              <Input label="تلفن دوم" value={formData.phone2} onChange={(v) => setFormData((p) => ({ ...p, phone2: v }))} dir="ltr" />
              <Input label="ایمیل" type="email" value={formData.email} onChange={(v) => setFormData((p) => ({ ...p, email: v }))} dir="ltr" />
              <Input label="تاریخ تولد" type="date" value={formData.birth_date} onChange={(v) => setFormData((p) => ({ ...p, birth_date: v }))} />
              <Select label="جنسیت" value={formData.gender} onChange={(v) => setFormData((p) => ({ ...p, gender: v }))} options={genderOptions} placeholder="انتخاب کنید" />
              <Select label="گروه خونی" value={formData.blood_type} onChange={(v) => setFormData((p) => ({ ...p, blood_type: v }))} options={bloodTypes.map((b) => ({ value: b, label: b }))} placeholder="انتخاب کنید" />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">آدرس</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="استان" value={formData.province} onChange={(v) => setFormData((p) => ({ ...p, province: v }))} />
              <Input label="شهر" value={formData.city} onChange={(v) => setFormData((p) => ({ ...p, city: v }))} />
              <Input label="کد پستی" value={formData.postal_code} onChange={(v) => setFormData((p) => ({ ...p, postal_code: v }))} dir="ltr" />
              <Input label="آدرس" value={formData.address} onChange={(v) => setFormData((p) => ({ ...p, address: v }))} className="md:col-span-3" />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">اطلاعات پزشکی</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Textarea label="تاریخچه پزشکی" value={formData.medical_history} onChange={(v) => setFormData((p) => ({ ...p, medical_history: v }))} rows={2} />
              <Textarea label="حساسیت‌ها" value={formData.allergies} onChange={(v) => setFormData((p) => ({ ...p, allergies: v }))} rows={2} />
              <Textarea label="داروهای مصرفی" value={formData.medications} onChange={(v) => setFormData((p) => ({ ...p, medications: v }))} rows={2} />
              <Textarea label="بیماری‌های زمینه‌ای" value={formData.medical_conditions} onChange={(v) => setFormData((p) => ({ ...p, medical_conditions: v }))} rows={2} />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">بیمه و دسته‌بندی</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="اطلاعات بیمه" value={formData.insurance_info} onChange={(v) => setFormData((p) => ({ ...p, insurance_info: v }))} />
              <Input label="شماره بیمه" value={formData.insurance_number} onChange={(v) => setFormData((p) => ({ ...p, insurance_number: v }))} dir="ltr" />
              <Select label="سطح VIP" value={formData.vip_level} onChange={(v) => setFormData((p) => ({ ...p, vip_level: v }))} options={vipLevels} />
              <Select label="پزشک اصلی" value={formData.primary_doctor_id} onChange={(v) => setFormData((p) => ({ ...p, primary_doctor_id: v }))} options={doctors.map((d) => ({ value: d.id, label: `دکتر ${d.name || d.specialty || 'پزشک'}` }))} placeholder="بدون پزشک اصلی" />
              <Input label="برچسب‌ها" value={formData.tags} onChange={(v) => setFormData((p) => ({ ...p, tags: v }))} placeholder="برچسب۱, برچسب۲" />
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer pb-2">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded text-primary-600" />
                  بیمار فعال
                </label>
              </div>
            </div>
          </div>

          <Textarea label="یادداشت" value={formData.notes} onChange={(v) => setFormData((p) => ({ ...p, notes: v }))} />

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>انصراف</Button>
            <Button variant="primary" onClick={handleSavePatient} disabled={saving}>
              {saving ? <Spinner size={16} /> : 'ذخیره تغییرات'}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  // ===========================================================================
  // Render: Tooth Record Modal
  // ===========================================================================

  // ===========================================================================
  // Helper Component
  // ===========================================================================

  const InfoRow = ({ label, value, dir, icon }: { label: string; value: string; dir?: string; icon?: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-2 py-1">
      <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
        {icon}{label}
      </span>
      <span className="text-sm text-slate-700 text-left" dir={dir}>{value}</span>
    </div>
  )

  // ===========================================================================
  // Main Render
  // ===========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    )
  }

  if (!patient) {
    return (
      <Card className="p-6">
        <EmptyState icon={<AlertCircle size={32} />} title="بیمار یافت نشد" />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {renderHeader()}

      {/* Tabs */}
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'timeline' && renderTimeline()}
      {activeTab === 'treatments' && renderTreatments()}
      {activeTab === 'appointments' && renderAppointments()}
      {activeTab === 'payments' && renderPayments()}
      {activeTab === 'teeth' && renderTeethChart()}
      {activeTab === 'prescriptions' && renderPrescriptions()}
      {activeTab === 'radiology' && renderRadiology()}
      {activeTab === 'insurance' && renderInsurance()}
      {activeTab === 'documents' && renderDocuments()}

      {/* Modals */}
      {renderEditModal()}
    </div>
  )
}
