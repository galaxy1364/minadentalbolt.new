// PatientDetail.tsx - Persian RTL Dental Clinic Patient Detail Page
import { InsurancePanel } from '../components/InsurancePanel'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Edit2, Phone, Mail, MapPin, Calendar, CreditCard, Activity, FileText, Image as ImageIcon, Shield, Pill, Smile, Award, AlertCircle, Clock, CheckCircle2, Layers, Plus, Trash2, FileSignature, Printer, Bone, FlaskConical } from 'lucide-react'
import { fetchPatient, updatePatient, fetchTimeline, fetchTreatments, fetchAppointments, fetchPayments, fetchToothRecords, createToothRecord, updateToothRecord, fetchPrescriptions, fetchRadiologyImages, fetchEncounters, fetchDoctors, fetchImplantCases, fetchTreatmentPhases, createTreatmentPhase, updateTreatmentPhase, fetchConsentForms, createConsentForm, updateConsentForm, fetchLabOrders, updateTreatment } from '../lib/api'
import { toJalaliString, toJalaliStringPretty, formatCurrency, toPersianDigits, formatTime } from '../lib/persianDate'
import { calcPatientBalance } from '../lib/finance'
import { Patient, Doctor, PatientTimeline, Treatment, Appointment, Payment, ToothRecord, Prescription, RadiologyImage, Encounter, ImplantCase, TreatmentPhase, ConsentForm, LabOrder } from '../types'
import { Modal, Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, Tabs, showToast, Wizard } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { calcPlanProgress, groupByTooth, nextStatus } from '../lib/treatmentPlan'
import { useConfirmAction } from '../components/ConfirmAction'
import { h } from '../lib/haptics'
import { calculateAge } from '../lib/patientUtils'
import { db } from '../lib/db'
import type { AuditLogEntry } from '../lib/db'
import DentalChart from '../components/DentalChart'
import { CurrencyInput } from '../components/CurrencyInput'

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
  const { confirmAction, ConfirmActionModal } = useConfirmAction()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [recordHistory, setRecordHistory] = useState<AuditLogEntry[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Tab data
  const [timeline, setTimeline] = useState<PatientTimeline[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [implantCases, setImplantCases] = useState<ImplantCase[]>([])
  const [phases, setPhases] = useState<TreatmentPhase[]>([])
  const [consentForms, setConsentForms] = useState<ConsentForm[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [toothRecords, setToothRecords] = useState<ToothRecord[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [radiologyImages, setRadiologyImages] = useState<RadiologyImage[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])

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
      const [tl, tr, ap, pm, tr_records, pres, radio, enc, implAll, ph, cf, labAll] = await Promise.all([
        fetchTimeline(id),
        fetchTreatments(undefined, id),
        fetchAppointments(),
        fetchPayments(id),
        fetchToothRecords(id),
        fetchPrescriptions(id),
        fetchRadiologyImages(id),
        fetchEncounters(id),
        fetchImplantCases(),
        fetchTreatmentPhases(id),
        fetchConsentForms(id),
        fetchLabOrders(),
      ])
      setTimeline(tl)
      setTreatments(tr)
      setAppointments(ap.filter((a) => a.patient_id === id))
      setPayments(pm)
      setToothRecords(tr_records)
      setPrescriptions(pres as unknown as Prescription[])
      setRadiologyImages(radio)
      setEncounters(enc)
      setLabOrders(labAll.filter((o) => o.patient_id === id))
      setImplantCases(implAll.filter((c) => c.patient_id === id))
      setPhases(ph.sort((a, b) => a.phase_number - b.phase_number))
      // Archived consent forms stay out of the active list — fully
      // preserved, restorable, same pattern as radiology/implants/labs.
      setConsentForms(cf.filter((c) => c.is_active !== false))
    } catch (err) {
      console.error('Error loading tab data:', err)
    }
  }, [id])

  useEffect(() => {
    loadPatient()
  }, [loadPatient])

  // "چه فیلدی از پرونده توسط کی تغییر کرد" — a real data-integrity/
  // accountability trail per patient, distinct from the clinical
  // تایم‌لاین (which shows care events like treatments/payments, not
  // record edits). Reads the same audit_log every mutation already
  // writes to (via queueOperation -> logAudit), just filtered to this
  // one patient's own row.
  useEffect(() => {
    if (!id) return
    db.audit_log.where('table_name').equals('patients').and((e) => e.record_id === id).reverse().sortBy('id').then((entries) => {
      setRecordHistory(entries.slice(0, 8))
    }).catch(() => {})
  }, [id])

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
  const { paid: totalPaid, totalCost: totalTreatmentCost, balance: patientBalance } = calcPatientBalance(payments, treatments, implantCases)

  // ── Staged treatment plan (phases) ──────────────────────────────
  const [phaseModalOpen, setPhaseModalOpen] = useState(false)
  const [phaseWizardStep, setPhaseWizardStep] = useState(0)
  const [editingPhase, setEditingPhase] = useState<TreatmentPhase | null>(null)
  const [savingPhase, setSavingPhase] = useState(false)
  const phaseStatuses = [
    { value: 'planned', label: 'برنامه‌ریزی شده', color: 'slate' },
    { value: 'in_progress', label: 'در حال انجام', color: 'warning' },
    { value: 'completed', label: 'تکمیل شده', color: 'success' },
    { value: 'on_hold', label: 'متوقف شده', color: 'error' },
    { value: 'cancelled', label: 'لغو شده', color: 'error' },
  ]
  const [phaseForm, setPhaseForm] = useState({
    doctor_id: '', title: '', description: '', procedures: '',
    estimated_cost: '', actual_cost: '', estimated_duration_days: '',
    status: 'planned', start_date: '', end_date: '',
  })

  const openCreatePhase = (prefillToothNumber?: string) => {
    h.tap()
    setEditingPhase(null)
    setPhaseWizardStep(0)
    setPhaseForm({
      doctor_id: '', title: prefillToothNumber ? `درمان دندان ${toPersianDigits(prefillToothNumber)}` : '', description: '',
      procedures: prefillToothNumber ? `دندان ${toPersianDigits(prefillToothNumber)}` : '',
      estimated_cost: '', actual_cost: '', estimated_duration_days: '', status: 'planned', start_date: '', end_date: '',
    })
    setPhaseModalOpen(true)
  }

  const openEditPhase = (p: TreatmentPhase) => {
    setEditingPhase(p)
    setPhaseWizardStep(0)
    setPhaseForm({
      doctor_id: p.doctor_id || '', title: p.title || '', description: p.description || '',
      procedures: p.procedures || '', estimated_cost: p.estimated_cost != null ? String(p.estimated_cost) : '',
      actual_cost: p.actual_cost != null ? String(p.actual_cost) : '',
      estimated_duration_days: p.estimated_duration_days != null ? String(p.estimated_duration_days) : '',
      status: p.status, start_date: p.start_date || '', end_date: p.end_date || '',
    })
    setPhaseModalOpen(true)
  }

  const handleSavePhase = () => {
    if (!phaseForm.title.trim()) { showToast('error', 'عنوان فاز الزامی است'); return }
    if (!id) return
    // Defense in depth: a malformed date string (e.g. the historical
    // "N-0a-0N" corruption this exact form once produced, before the
    // Jalali conversion bug was fixed) would silently fail to sync
    // forever once saved, since Postgres's `date` column type rejects
    // it — but the local save "succeeds" with no visible error. Catch
    // it here, before it ever reaches that state again.
    //
    // The previous version of this check (regex format + `new
    // Date(s).getTime()`) wasn't actually reliable — JS's Date parser
    // can silently accept an out-of-range month like "00" and still
    // return a valid (non-NaN) timestamp by rolling over to the prior
    // year, while the STRING itself (what actually gets sent to
    // Postgres) still literally says month "00" and gets rejected
    // there regardless of what JS thought. Validating the numeric
    // month/day ranges directly from the string is the only check
    // that can't be fooled by that leniency.
    const isValidDate = (s: string) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
      if (!m) return false
      const [, , mm, dd] = m
      const month = Number(mm), day = Number(dd)
      return month >= 1 && month <= 12 && day >= 1 && day <= 31
    }
    if (phaseForm.start_date && !isValidDate(phaseForm.start_date)) { showToast('error', 'تاریخ شروع نامعتبر است — دوباره از تقویم انتخاب کنید'); return }
    if (phaseForm.end_date && !isValidDate(phaseForm.end_date)) { showToast('error', 'تاریخ پایان نامعتبر است — دوباره از تقویم انتخاب کنید'); return }
    const nextNumber = editingPhase ? editingPhase.phase_number : (phases.length > 0 ? Math.max(...phases.map((p) => p.phase_number)) + 1 : 1)
    const payload = {
      patient_id: id, doctor_id: phaseForm.doctor_id || null,
      phase_number: nextNumber, title: phaseForm.title, description: phaseForm.description || null,
      procedures: phaseForm.procedures || null,
      estimated_cost: phaseForm.estimated_cost ? Number(phaseForm.estimated_cost) : null,
      actual_cost: phaseForm.actual_cost ? Number(phaseForm.actual_cost) : null,
      estimated_duration_days: phaseForm.estimated_duration_days ? Number(phaseForm.estimated_duration_days) : null,
      status: phaseForm.status, start_date: phaseForm.start_date || null, end_date: phaseForm.end_date || null,
    } as any
    confirmAction({
      type: editingPhase ? 'edit' : 'create',
      title: editingPhase ? 'ویرایش فاز درمان' : 'افزودن فاز درمان',
      fields: [
        { label: 'فاز', value: `${toPersianDigits(nextNumber)} — ${phaseForm.title}`, highlight: true },
        { label: 'هزینه‌ی تخمینی', value: phaseForm.estimated_cost ? `${formatCurrency(Number(phaseForm.estimated_cost))} ت` : '-' },
        { label: 'وضعیت', value: phaseStatuses.find((s) => s.value === phaseForm.status)?.label || phaseForm.status },
      ],
      confirmLabel: editingPhase ? 'ذخیره' : 'افزودن',
      onConfirm: async () => {
        setSavingPhase(true)
        try {
          if (editingPhase) await updateTreatmentPhase(editingPhase.id, payload)
          else await createTreatmentPhase(payload)
          showToast('success', editingPhase ? 'ویرایش شد' : 'فاز اضافه شد')
          setPhaseModalOpen(false)
          const updated = await fetchTreatmentPhases(id)
          setPhases(updated.sort((a, b) => a.phase_number - b.phase_number))
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSavingPhase(false) }
      },
    })
  }

  const handleDeletePhase = (p: TreatmentPhase) => {
    h.tap()
    // Per clinic policy: a treatment phase (real clinical plan history)
    // is never permanently deleted, only marked cancelled.
    confirmAction({
      type: 'status',
      title: 'لغو فاز درمان',
      warning: 'این فاز هیچ‌وقت پاک نمی‌شود — فقط به‌عنوان لغو‌شده علامت می‌خورد و در پرونده باقی می‌ماند.',
      fields: [{ label: 'فاز', value: `${toPersianDigits(p.phase_number)} — ${p.title}`, highlight: true }],
      confirmLabel: 'تایید لغو',
      onConfirm: async () => {
        await updateTreatmentPhase(p.id, { status: 'cancelled' } as any)
        showToast('success', 'فاز لغو شد — در پرونده باقی ماند')
        if (id) { const updated = await fetchTreatmentPhases(id); setPhases(updated.sort((a, b) => a.phase_number - b.phase_number)) }
      },
    })
  }

  // ── Consent forms (فرم رضایت‌نامه) ──────────────────────────────
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [editingConsent, setEditingConsent] = useState<ConsentForm | null>(null)
  const [savingConsent, setSavingConsent] = useState(false)
  const [consentForm, setConsentForm] = useState({
    doctor_id: '', treatment_description: '', risks: '', notes: '', signed_by_patient: false,
  })

  const openCreateConsent = () => {
    h.tap()
    setEditingConsent(null)
    setConsentForm({ doctor_id: '', treatment_description: '', risks: '', notes: '', signed_by_patient: false })
    setConsentModalOpen(true)
  }

  const openEditConsent = (c: ConsentForm) => {
    setEditingConsent(c)
    setConsentForm({
      doctor_id: c.doctor_id || '', treatment_description: c.treatment_description || '',
      risks: c.risks || '', notes: c.notes || '', signed_by_patient: c.signed_by_patient || false,
    })
    setConsentModalOpen(true)
  }

  const handleSaveConsent = () => {
    if (!consentForm.treatment_description.trim()) { showToast('error', 'شرح درمان الزامی است'); return }
    if (!id) return
    const payload = {
      patient_id: id, doctor_id: consentForm.doctor_id || null,
      treatment_description: consentForm.treatment_description, risks: consentForm.risks || null,
      notes: consentForm.notes || null, signed_by_patient: consentForm.signed_by_patient,
      signed_at: consentForm.signed_by_patient ? new Date().toISOString() : null,
    } as any
    confirmAction({
      type: editingConsent ? 'edit' : 'create',
      title: editingConsent ? 'ویرایش فرم رضایت‌نامه' : 'فرم رضایت‌نامه‌ی جدید',
      fields: [
        { label: 'شرح درمان', value: consentForm.treatment_description, highlight: true },
        { label: 'وضعیت امضا', value: consentForm.signed_by_patient ? 'امضا شده' : 'امضا نشده' },
      ],
      confirmLabel: editingConsent ? 'ذخیره' : 'ثبت',
      onConfirm: async () => {
        setSavingConsent(true)
        try {
          if (editingConsent) await updateConsentForm(editingConsent.id, payload)
          else await createConsentForm(payload)
          showToast('success', editingConsent ? 'ویرایش شد' : 'ثبت شد')
          setConsentModalOpen(false)
          if (id) setConsentForms((await fetchConsentForms(id)).filter((c) => c.is_active !== false))
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSavingConsent(false) }
      },
    })
  }

  const handleDeleteConsent = (c: ConsentForm) => {
    h.tap()
    // Per clinic policy: a signed consent form is a legal/medical
    // document (proof of informed consent) — never permanently deleted,
    // only archived (restorable, hidden from the active list).
    confirmAction({
      type: 'status',
      title: 'آرشیو فرم رضایت‌نامه',
      warning: 'این فرم هیچ‌وقت پاک نمی‌شود — فقط از لیست فعال مخفی می‌شود و در سوابق قانونی/پزشکی باقی می‌ماند.',
      fields: [{ label: 'شرح درمان', value: c.treatment_description || '-', highlight: true }],
      confirmLabel: 'تایید آرشیو',
      onConfirm: async () => {
        await updateConsentForm(c.id, { is_active: false } as any)
        showToast('success', 'فرم آرشیو شد')
        if (id) setConsentForms((await fetchConsentForms(id)).filter((cf) => cf.is_active !== false))
      },
    })
  }

  // Full patient-chart print — everything an insurance submission or a
  // legal/records request needs in one document: demographics, every
  // treatment with which doctor did it and when, every implant case
  // (surgeon vs prosthesis doctor shown separately, since they can
  // differ), lab work, and the full financial picture. Reuses the exact
  // print-window pattern already established for consent forms.
  const handlePrintFullChart = () => {
    if (!patient) return
    const doctorName = (id: string | null) => id ? (doctors.find((d) => d.id === id)?.name || '—') : '—'
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) { showToast('error', 'اجازه‌ی باز کردن پنجره‌ی چاپ داده نشد'); return }

    const sortedTreatments = [...treatments].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    const sortedImplants = [...implantCases].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    const sortedPayments = [...payments].filter((p) => p.status === 'completed').sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
    const totalPaid = sortedPayments.reduce((s, p) => s + (p.amount || 0), 0)

    const rows = (items: string) => items || `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:10px;">موردی ثبت نشده</td></tr>`

    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>پرونده‌ی کامل بیمار — ${patient.first_name} ${patient.last_name}</title>
      <style>
        body { font-family: Tahoma, Arial, sans-serif; padding: 28px; color: #1e293b; line-height: 1.7; font-size: 13px; }
        .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 14px; margin-bottom: 20px; }
        .header h1 { color: #0d9488; margin: 0 0 4px; font-size: 20px; }
        .header p { margin: 0; color: #64748b; font-size: 12px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 20px; font-size: 12.5px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; }
        .section { margin-bottom: 22px; page-break-inside: avoid; }
        .section h2 { font-size: 14px; color: #0d9488; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f1f5f9; text-align: right; padding: 6px 8px; font-weight: bold; color: #475569; }
        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
        .balance-box { display: flex; justify-content: space-between; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px 16px; margin-top: 8px; font-size: 13px; }
        .balance-box b { color: #0d9488; }
        .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px; }
        @media print { body { padding: 10px; } .section { page-break-inside: avoid; } }
      </style>
      </head><body>
        <div class="header"><h1>کلینیک دندانپزشکی مینادنت</h1><p>پرونده‌ی کامل بیمار — تاریخ چاپ: ${toJalaliStringPretty(new Date().toISOString())}</p></div>

        <div class="meta-grid">
          <span><b>نام:</b> ${patient.first_name} ${patient.last_name}</span>
          <span><b>شماره پرونده:</b> ${patient.file_number || '—'}</span>
          <span><b>تلفن:</b> ${patient.phone || '—'}</span>
          <span><b>کد ملی:</b> ${patient.national_id || '—'}</span>
        </div>

        <div class="section">
          <h2>سوابق درمانی (${sortedTreatments.length} مورد)</h2>
          <table>
            <thead><tr><th>تاریخ</th><th>دندان</th><th>رویه</th><th>پزشک انجام‌دهنده</th><th>هزینه</th></tr></thead>
            <tbody>${rows(sortedTreatments.map((t) => `<tr><td>${toJalaliStringPretty(t.created_at)}</td><td>${t.tooth_number ? toPersianDigits(t.tooth_number) : '—'}</td><td>${t.procedure_name || '—'}</td><td>دکتر ${doctorName(t.doctor_id)}</td><td>${formatCurrency(t.total_price || 0)} ت</td></tr>`).join(''))}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>سفارش‌های لابراتوار (${labOrders.length} مورد)</h2>
          <table>
            <thead><tr><th>تاریخ ثبت</th><th>دندان</th><th>نوع کار</th><th>وضعیت</th></tr></thead>
            <tbody>${rows([...labOrders].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).map((o) => `<tr><td>${toJalaliStringPretty(o.created_at)}</td><td>${o.tooth_number ? toPersianDigits(o.tooth_number) : '—'}</td><td>${o.work_type || '—'}</td><td>${o.status === 'delivered' ? 'تحویل شده' : o.status === 'cancelled' ? 'لغو شده' : 'در جریان'}</td></tr>`).join(''))}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>موارد ایمپلنت (${sortedImplants.length} مورد)</h2>
          <table>
            <thead><tr><th>تاریخ جراحی</th><th>دندان</th><th>پزشک جراح</th><th>پزشک پروتز</th><th>هزینه</th></tr></thead>
            <tbody>${rows(sortedImplants.map((c) => `<tr><td>${c.surgery_date ? toJalaliStringPretty(c.surgery_date) : '—'}</td><td>${c.tooth_number ? toPersianDigits(c.tooth_number) : '—'}</td><td>دکتر ${doctorName(c.doctor_id)}</td><td>دکتر ${doctorName(c.prosthesis_doctor_id)}</td><td>${formatCurrency(c.total_cost || 0)} ت</td></tr>`).join(''))}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>سوابق پرداخت (${sortedPayments.length} مورد)</h2>
          <table>
            <thead><tr><th>تاریخ</th><th>روش</th><th>مبلغ</th></tr></thead>
            <tbody>${rows(sortedPayments.map((p) => `<tr><td>${toJalaliStringPretty(p.payment_date)}</td><td>${p.payment_method}</td><td>${formatCurrency(p.amount)} ت</td></tr>`).join(''))}</tbody>
          </table>
          <div class="balance-box">
            <span>مجموع هزینه‌ی درمان و ایمپلنت: <b>${formatCurrency(totalTreatmentCost)} ت</b></span>
            <span>مجموع پرداختی: <b>${formatCurrency(totalPaid)} ت</b></span>
            <span>مانده‌حساب: <b>${formatCurrency(patientBalance)} ت</b></span>
          </div>
        </div>

        <div class="footer">این سند به‌صورت خودکار از سامانه‌ی مدیریت کلینیک مینادنت تولید شده است.</div>
      </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const handlePrintConsent = (c: ConsentForm) => {
    const doc = doctors.find((d) => d.id === c.doctor_id)
    const win = window.open('', '_blank', 'width=650,height=850')
    if (!win) { showToast('error', 'اجازه‌ی باز کردن پنجره‌ی چاپ داده نشد'); return }
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>فرم رضایت‌نامه</title>
      <style>
        body { font-family: Tahoma, Arial, sans-serif; padding: 32px; color: #1e293b; line-height: 1.9; }
        .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { color: #0d9488; margin: 0 0 4px; font-size: 22px; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; color: #475569; }
        .section { margin-bottom: 20px; }
        .section h2 { font-size: 14px; color: #0d9488; margin-bottom: 6px; }
        .section p { font-size: 13px; margin: 0; white-space: pre-wrap; }
        .sign-row { display: flex; justify-content: space-between; margin-top: 60px; font-size: 13px; }
        .sign-box { width: 45%; border-top: 1px solid #94a3b8; padding-top: 6px; text-align: center; color: #64748b; }
        @media print { body { padding: 12px; } }
      </style>
      </head><body>
        <div class="header"><h1>کلینیک دندانپزشکی مینا</h1><p>فرم رضایت‌نامه‌ی آگاهانه‌ی درمان</p></div>
        <div class="meta">
          <span><b>بیمار:</b> ${patient ? `${patient.first_name} ${patient.last_name}` : '-'}</span>
          <span><b>پزشک:</b> ${doc ? `دکتر ${doc.name || doc.specialty}` : '-'}</span>
          <span><b>تاریخ:</b> ${toJalaliStringPretty(c.created_at)}</span>
        </div>
        <div class="section"><h2>شرح درمان</h2><p>${c.treatment_description || '-'}</p></div>
        ${c.risks ? `<div class="section"><h2>خطرات و عوارض احتمالی</h2><p>${c.risks}</p></div>` : ''}
        ${c.notes ? `<div class="section"><h2>یادداشت</h2><p>${c.notes}</p></div>` : ''}
        <div class="section"><p>اینجانب با آگاهی کامل از شرح درمان و خطرات احتمالی ذکرشده در بالا، رضایت خود را برای انجام این درمان اعلام می‌کنم.</p></div>
        <div class="sign-row">
          <div class="sign-box">امضای بیمار / ولی بیمار</div>
          <div class="sign-box">امضا و مهر پزشک</div>
        </div>
      </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

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
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${getAvatarColor(patient.id)} flex items-center justify-center text-white font-bold text-xl md:text-2xl flex-shrink-0`}
          >
            {patient.avatar_url ? <img src={patient.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(patient)}
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
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handlePrintFullChart}>
              <Printer size={16} /> چاپ پرونده
            </Button>
            <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
              <Edit2 size={16} /> ویرایش
            </Button>
          </div>
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
    { key: 'implants', label: 'ایمپلنت', icon: <Bone size={16} /> },
    { key: 'labOrders', label: 'لابراتوار', icon: <FlaskConical size={16} /> },
    { key: 'phases', label: 'طرح درمان مرحله‌ای', icon: <Layers size={16} /> },
    { key: 'consent', label: 'فرم رضایت‌نامه', icon: <FileSignature size={16} /> },
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
            <InfoRow label="شماره منزل" value={patient.phone2 ? toPersianDigits(patient.phone2) : '-'} dir="ltr" />
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

        {/* Record change history — accountability trail (who edited
            THIS patient's own record, not clinical/care events) */}
        {recordHistory.length > 0 && (
          <Card className="p-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-700 mb-3">آخرین تغییرات پرونده</h3>
            <div className="space-y-2">
              {recordHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">{entry.summary}</span>
                  <span className="text-slate-400 shrink-0">{entry.actor_name || 'ناشناس'} — {toJalaliStringPretty(entry.created_at.slice(0, 10))}</span>
                </div>
              ))}
            </div>
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

  /**
   * MOD-FEAT-001 — replaces what was a flat chronological list.
   *
   * Direct request: "patient comes once with 40 problems, record them
   * all, then work through them session by session and know what's done
   * and what's left." The data model already supported that (treatments
   * carry planned/in_progress/completed), but nothing surfaced it — you
   * couldn't see progress, remaining cost, or what was outstanding per
   * tooth without reading every row.
   *
   * Grouped by tooth because that's the dentist's unit of work, with
   * unfinished teeth sorted first, and a one-tap status advance so
   * marking work done during a session doesn't require opening a form.
   */
  const renderTreatments = () => {
    if (treatments.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<Activity size={32} />} title="درمانی ثبت نشده" description="هنوز درمانی برای این بیمار ثبت نشده است" />
        </Card>
      )
    }

    const progress = calcPlanProgress(treatments)
    const groups = groupByTooth(treatments)

    const advanceStatus = async (t: Treatment) => {
      const next = nextStatus(t.status)
      if (next === t.status) return
      h.tap()
      try {
        await updateTreatment(t.id, { status: next } as never)
        showToast('success', next === 'completed' ? 'به‌عنوان انجام‌شده ثبت شد' : 'در حال انجام ثبت شد')
        await loadTabData()
      } catch {
        showToast('error', 'خطا در به‌روزرسانی')
      }
    }

    return (
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-800">پیشرفت طرح درمان</h3>
            <span className="text-sm font-bold text-primary-700">
              {toPersianDigits(progress.completed)} از {toPersianDigits(progress.total)} کار
            </span>
          </div>

          <div
            className="h-2.5 rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`پیشرفت طرح درمان: ${progress.percent} درصد`}
          >
            <div
              className="h-full bg-primary-700 rounded-full transition-all-smooth"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">انجام‌شده</p>
              <p className="text-sm font-bold text-success-700">{formatCurrency(progress.completedValue)} ت</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">باقی‌مانده</p>
              <p className="text-sm font-bold text-warning-700">{formatCurrency(progress.remainingValue)} ت</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">کل طرح</p>
              <p className="text-sm font-bold text-slate-700">{formatCurrency(progress.totalValue)} ت</p>
            </div>
          </div>
        </Card>

        {groups.map((group) => (
          <Card key={group.tooth} className={`p-4 ${group.allDone ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                {group.tooth === 'عمومی' ? 'درمان‌های عمومی' : `دندان ${toPersianDigits(group.tooth)}`}
                {group.allDone && <CheckCircle2 size={16} className="text-success-600" />}
              </h4>
              {!group.allDone && (
                <Badge color="warning">{toPersianDigits(group.remainingCount)} کار مانده</Badge>
              )}
            </div>

            <div className="space-y-2">
              {group.treatments.map((t) => {
                const statusMeta = treatmentStatuses.find((s) => s.value === t.status) || treatmentStatuses[0]
                const isDone = t.status === 'completed'
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <button
                      onClick={() => advanceStatus(t)}
                      disabled={isDone}
                      aria-label={isDone ? 'انجام شده' : `ثبت پیشرفت برای ${t.procedure_name || 'درمان'}`}
                      className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all-smooth ${
                        isDone
                          ? 'bg-success-600 border-success-600 text-white'
                          : 'border-slate-300 hover:border-primary-600 hover:bg-primary-50'
                      }`}
                    >
                      {isDone && <CheckCircle2 size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {t.procedure_name || t.description || 'درمان'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                        {t.total_price != null && (
                          <span className="text-xs text-slate-500">{formatCurrency(t.total_price)} ت</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // ===========================================================================
  // Render: Implant Cases Tab — this data was already being loaded (used
  // for balance calculation and the full-chart print feature) but had no
  // actual tab to view it from inside the patient's own file, meaning
  // staff had to leave this page and re-search for the patient over in
  // the separate Implants module just to see their implant history.
  // ===========================================================================

  const renderImplants = () => {
    if (implantCases.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<Bone size={32} />} title="موردی ثبت نشده" description="هنوز پرونده‌ی ایمپلنتی برای این بیمار ثبت نشده است" />
        </Card>
      )
    }
    return (
      <div className="space-y-2">
        {[...implantCases].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-sm font-medium text-slate-800">
                    دندان {c.tooth_number ? toPersianDigits(c.tooth_number) : '—'} — {c.brand || 'برند نامشخص'}
                  </h4>
                  {!c.is_active && <Badge color="slate">بایگانی‌شده</Badge>}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                  <span>جراح: {getDoctorName(c.doctor_id)}</span>
                  {c.prosthesis_doctor_id && c.prosthesis_doctor_id !== c.doctor_id && (
                    <span>پروتز: {getDoctorName(c.prosthesis_doctor_id)}</span>
                  )}
                  {c.surgery_date && <span>تاریخ جراحی: {toJalaliStringPretty(c.surgery_date)}</span>}
                </div>
                {(c.bone_graft || c.sinus_lift) && (
                  <div className="flex gap-1.5 mt-1.5">
                    {c.bone_graft && <Badge color="warning">پودر استخوانی</Badge>}
                    {c.sinus_lift && <Badge color="accent">سینوس لیفت</Badge>}
                  </div>
                )}
              </div>
              <div className="text-left">
                {c.total_cost != null && <p className="text-sm font-bold text-slate-700">{formatCurrency(c.total_cost)} تومان</p>}
                {c.paid_amount != null && <p className="text-xs text-success-600">پرداخت‌شده: {formatCurrency(c.paid_amount)}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // ===========================================================================
  // Render: Lab Orders Tab — same gap as implants: loaded for the print
  // feature already, but never viewable from inside the patient's own
  // file otherwise.
  // ===========================================================================

  const renderLabOrders = () => {
    if (labOrders.length === 0) {
      return (
        <Card className="p-6">
          <EmptyState icon={<FlaskConical size={32} />} title="سفارشی ثبت نشده" description="هنوز سفارش لابراتوار برای این بیمار ثبت نشده است" />
        </Card>
      )
    }
    return (
      <div className="space-y-2">
        {[...labOrders].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).map((o) => (
          <Card key={o.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-sm font-medium text-slate-800">{o.work_type || 'سفارش لابراتوار'}</h4>
                  <Badge color={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'error' : 'primary'}>
                    {o.status === 'delivered' ? 'تحویل شده' : o.status === 'cancelled' ? 'لغو شده' : 'در جریان'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                  {o.tooth_number && <span>دندان: {toPersianDigits(o.tooth_number)}</span>}
                  <span>{toJalaliStringPretty(o.created_at)}</span>
                  {o.deadline && <span>موعد: {toJalaliStringPretty(o.deadline)}</span>}
                </div>
              </div>
              <div className="text-left">
                {o.cost != null && <p className="text-sm font-bold text-slate-700">{formatCurrency(o.cost)} تومان</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // ===========================================================================
  // Render: Staged Treatment Plan (Phases) Tab
  // ===========================================================================

  const renderPhases = () => {
    const totalEstimated = phases.reduce((s, p) => s + (p.estimated_cost || 0), 0)
    const totalActual = phases.reduce((s, p) => s + (p.actual_cost || 0), 0)
    const completedCount = phases.filter((p) => p.status === 'completed').length

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">طرح درمان مرحله‌ای</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {phases.length > 0 ? `${toPersianDigits(completedCount)} از ${toPersianDigits(phases.length)} فاز تکمیل شده` : 'هنوز فازی تعریف نشده'}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreatePhase}><Plus size={14} className="inline ml-1" /> افزودن فاز</Button>
        </div>

        {phases.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            <Card className="p-3">
              <p className="text-[11px] text-slate-400">هزینه‌ی تخمینی کل</p>
              <p className="text-base font-extrabold text-primary-700">{formatCurrency(totalEstimated)} ت</p>
            </Card>
            <Card className="p-3">
              <p className="text-[11px] text-slate-400">هزینه‌ی واقعی تا الان</p>
              <p className="text-base font-extrabold text-slate-700 dark:text-slate-200">{formatCurrency(totalActual)} ت</p>
            </Card>
          </div>
        )}

        {phases.length === 0 ? (
          <EmptyState icon={<Layers size={40} />} title="فاز درمانی ثبت نشده" description="برای طرح‌های درمانی چندمرحله‌ای (مثلاً فاز۱: کشیدن، فاز۲: ایمپلنت، فاز۳: روکش) فازها را اینجا تعریف کنید" />
        ) : (
          <div className="relative space-y-3">
            {phases.map((p, i) => {
              const meta = phaseStatuses.find((s) => s.value === p.status) || phaseStatuses[0]
              const doc = doctors.find((d) => d.id === p.doctor_id)
              return (
                <div key={p.id} className="relative flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${p.status === 'completed' ? 'bg-success-500 text-white' : p.status === 'in_progress' ? 'bg-warning-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {p.status === 'completed' ? <CheckCircle2 size={16} /> : toPersianDigits(p.phase_number)}
                    </div>
                    {i < phases.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 my-1" />}
                  </div>
                  <Card className="flex-1 p-3.5 mb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">فاز {toPersianDigits(p.phase_number)}: {p.title}</p>
                        {p.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.description}</p>}
                        {doc && <p className="text-[11px] text-slate-400 mt-1">دکتر {doc.name}</p>}
                      </div>
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                      {p.estimated_cost != null && <span>هزینه تخمینی: {formatCurrency(p.estimated_cost)} ت</span>}
                      {p.estimated_duration_days != null && <span>مدت: {toPersianDigits(p.estimated_duration_days)} روز</span>}
                    </div>
                    <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                      <button onClick={() => openEditPhase(p)} className="text-xs text-primary-600 hover:underline">ویرایش</button>
                      <button onClick={() => handleDeletePhase(p)} className="text-xs text-error-500 hover:underline">حذف</button>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ===========================================================================
  // Render: Consent Forms Tab
  // ===========================================================================

  const renderConsentForms = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">فرم‌های رضایت‌نامه</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {consentForms.length > 0 ? `${toPersianDigits(consentForms.filter((c) => c.signed_by_patient).length)} از ${toPersianDigits(consentForms.length)} امضا شده` : 'هنوز فرمی ثبت نشده'}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateConsent}><Plus size={14} className="inline ml-1" /> فرم جدید</Button>
      </div>

      {consentForms.length === 0 ? (
        <EmptyState icon={<FileSignature size={40} />} title="فرم رضایت‌نامه ثبت نشده" description="پیش از درمان‌های جراحی یا پرخطر (ایمپلنت، کشیدن، جراحی) رضایت آگاهانه‌ی بیمار را اینجا ثبت و چاپ کنید" />
      ) : (
        <div className="space-y-2">
          {consentForms.map((c) => {
            const doc = doctors.find((d) => d.id === c.doctor_id)
            return (
              <Card key={c.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{c.treatment_description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{doc ? `دکتر ${doc.name || doc.specialty}` : 'بدون پزشک'} — {toJalaliStringPretty(c.created_at)}</p>
                  </div>
                  <Badge color={c.signed_by_patient ? 'success' : 'warning'}>{c.signed_by_patient ? 'امضا شده' : 'امضا نشده'}</Badge>
                </div>
                <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                  <button onClick={() => handlePrintConsent(c)} className="flex items-center gap-1 text-xs text-primary-600 hover:underline"><Printer size={12} /> چاپ</button>
                  <button onClick={() => openEditConsent(c)} className="text-xs text-slate-500 hover:underline">ویرایش</button>
                  <button onClick={() => handleDeleteConsent(c)} className="text-xs text-error-500 hover:underline">حذف</button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

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

        {/* Settled-patient archive suggestion — only when there's real
            billing history that's now fully paid off, not a brand-new
            patient with zero activity. Archiving stays a deliberate
            staff decision (they might still have upcoming treatment),
            never automatic. */}
        {patientBalance <= 0 && totalTreatmentCost > 0 && patient?.is_active && (
          <Card className="p-3.5 bg-success-50 dark:bg-success-900/10 border border-success-200 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-success-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-success-700 dark:text-success-400">این بیمار تسویه‌حساب کامل دارد</p>
              <p className="text-[11px] text-success-600 dark:text-success-500">اگر درمان تمام شده و فعلاً برنامه‌ی درمانی جدیدی ندارد، می‌توانید بایگانی‌اش کنید.</p>
            </div>
            <Button
              size="sm" variant="secondary"
              onClick={() => {
                h.tap()
                confirmAction({
                  type: 'status', title: 'بایگانی بیمار',
                  warning: 'بیمار از لیست‌های فعال مخفی می‌شود، ولی هیچ داده‌ای پاک نمی‌شود — همیشه از بخش «بایگانی» قابل بازگردانی است.',
                  fields: [{ label: 'نام', value: `${patient.first_name} ${patient.last_name}`, highlight: true }],
                  confirmLabel: 'بایگانی کردن',
                  onConfirm: async () => {
                    await updatePatient(patient.id, { is_active: false })
                    setPatient((p) => p ? { ...p, is_active: false } : p)
                    showToast('success', 'بیمار بایگانی شد')
                  },
                })
              }}
            >
              بایگانی کردن
            </Button>
          </Card>
        )}

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
      onAddTreatment={(toothNumber) => {
        // Links the tooth chart directly into the treatment-phases
        // workflow: starting a plan for a specific tooth from the chart
        // itself, instead of the chart being a dead-end visualization
        // disconnected from how treatment actually gets planned.
        setActiveTab('phases')
        openCreatePhase(toothNumber)
      }}
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
              <Input label="شماره منزل" value={formData.phone2} onChange={(v) => setFormData((p) => ({ ...p, phone2: v }))} dir="ltr" />
              <Input label="ایمیل" type="email" value={formData.email} onChange={(v) => setFormData((p) => ({ ...p, email: v }))} dir="ltr" />
              <PersianDateInput label="تاریخ تولد" value={formData.birth_date} onChange={(v) => setFormData((p) => ({ ...p, birth_date: v }))} />
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
      {activeTab === 'implants' && renderImplants()}
      {activeTab === 'labOrders' && renderLabOrders()}
      {activeTab === 'phases' && renderPhases()}
      {activeTab === 'consent' && renderConsentForms()}
      {activeTab === 'appointments' && renderAppointments()}
      {activeTab === 'payments' && renderPayments()}
      {activeTab === 'teeth' && renderTeethChart()}
      {activeTab === 'prescriptions' && renderPrescriptions()}
      {activeTab === 'radiology' && renderRadiology()}
      {activeTab === 'insurance' && (
        <div className="space-y-4">
          {renderInsurance()}
          <InsurancePanel patientId={id!} />
        </div>
      )}
      {activeTab === 'documents' && renderDocuments()}

      {/* Modals */}
      {renderEditModal()}

      {/* Phase Wizard */}
      <Wizard
        open={phaseModalOpen}
        onClose={() => setPhaseModalOpen(false)}
        title={editingPhase ? 'ویرایش فاز درمان' : 'افزودن فاز درمان'}
        step={phaseWizardStep}
        onStepChange={setPhaseWizardStep}
        onFinish={handleSavePhase}
        saving={savingPhase}
        steps={[
          {
            label: 'عنوان و پزشک',
            validate: () => (!phaseForm.title.trim() ? 'عنوان فاز الزامی است' : null),
            content: (
              <>
                <Input label="عنوان فاز" value={phaseForm.title} onChange={(v) => setPhaseForm({ ...phaseForm, title: v })} placeholder="مثلاً: کشیدن دندان‌های آسیب‌دیده" />
                <Select label="پزشک مسئول" value={phaseForm.doctor_id} onChange={(v) => setPhaseForm({ ...phaseForm, doctor_id: v })} options={doctors.filter((d) => d.is_active).map((d) => ({ value: d.id, label: `دکتر ${d.name || d.specialty || 'پزشک'}` }))} placeholder="انتخاب پزشک..." />
                <Textarea label="توضیحات" value={phaseForm.description} onChange={(v) => setPhaseForm({ ...phaseForm, description: v })} placeholder="جزئیات این فاز" rows={2} />
              </>
            ),
          },
          {
            label: 'رویه‌ها و هزینه',
            validate: () => (!phaseForm.procedures.trim() ? 'رویه‌های این فاز الزامی است' : null),
            content: (
              <>
                <Textarea label="رویه‌های این فاز" value={phaseForm.procedures} onChange={(v) => setPhaseForm({ ...phaseForm, procedures: v })} placeholder="مثلاً: کشیدن دندان ۱۶، ۱۷" rows={2} />
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput label="هزینه‌ی تخمینی (ت)" value={phaseForm.estimated_cost} onChange={(v) => setPhaseForm({ ...phaseForm, estimated_cost: v })} />
                  <CurrencyInput label="هزینه‌ی واقعی (ت)" value={phaseForm.actual_cost} onChange={(v) => setPhaseForm({ ...phaseForm, actual_cost: v })} />
                </div>
                <Input label="مدت تخمینی (روز)" type="number" value={phaseForm.estimated_duration_days} onChange={(v) => setPhaseForm({ ...phaseForm, estimated_duration_days: v })} placeholder="30" />
              </>
            ),
          },
          {
            label: 'زمان‌بندی و وضعیت',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <PersianDateInput label="تاریخ شروع" value={phaseForm.start_date} onChange={(v) => setPhaseForm({ ...phaseForm, start_date: v })} />
                  <PersianDateInput label="تاریخ پایان" value={phaseForm.end_date} onChange={(v) => setPhaseForm({ ...phaseForm, end_date: v })} />
                </div>
                <Select label="وضعیت" value={phaseForm.status} onChange={(v) => setPhaseForm({ ...phaseForm, status: v })} options={phaseStatuses.map((s) => ({ value: s.value, label: s.label }))} />
              </>
            ),
          },
        ]}
      />

      {ConfirmActionModal}

      {/* Consent Form Modal */}
      <Modal open={consentModalOpen} onClose={() => setConsentModalOpen(false)} title={editingConsent ? 'ویرایش فرم رضایت‌نامه' : 'فرم رضایت‌نامه‌ی جدید'} size="md">
        <div className="space-y-3">
          <Select label="پزشک" value={consentForm.doctor_id} onChange={(v) => setConsentForm({ ...consentForm, doctor_id: v })} options={doctors.filter((d) => d.is_active).map((d) => ({ value: d.id, label: `دکتر ${d.name || d.specialty || 'پزشک'}` }))} placeholder="انتخاب پزشک..." />
          <Textarea label="شرح درمان" value={consentForm.treatment_description} onChange={(v) => setConsentForm({ ...consentForm, treatment_description: v })} placeholder="مثلاً: جراحی ایمپلنت دندان ۱۶ همراه با پیوند استخوان" rows={3} />
          <Textarea label="خطرات و عوارض احتمالی" value={consentForm.risks} onChange={(v) => setConsentForm({ ...consentForm, risks: v })} placeholder="خطرات این درمان را برای بیمار توضیح دهید" rows={3} />
          <Textarea label="یادداشت" value={consentForm.notes} onChange={(v) => setConsentForm({ ...consentForm, notes: v })} placeholder="یادداشت اضافی" rows={2} />
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <input type="checkbox" checked={consentForm.signed_by_patient} onChange={(e) => setConsentForm({ ...consentForm, signed_by_patient: e.target.checked })} className="w-4 h-4 rounded accent-primary-600" />
            <span className="text-sm text-slate-700 dark:text-slate-200">بیمار این فرم را امضا کرده است</span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setConsentModalOpen(false)}>انصراف</Button>
            <Button variant="primary" onClick={handleSaveConsent} disabled={savingConsent}>{savingConsent ? <Spinner size={16} /> : editingConsent ? 'ذخیره' : 'ثبت'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
