// Treatments.tsx — Full Treatment Management with Encounter creation, Dental Chart, Billing & Lab referral
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Activity, ClipboardList, Stethoscope, Search, Eye, Smile, Plus, Edit2, Trash2,
  DollarSign, FlaskConical, CheckCircle2, X, UserPlus, ChevronRight,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  fetchEncounters, fetchTreatments, fetchProcedures, fetchPatients, fetchDoctors,
  fetchLabs, fetchToothRecords, createEncounter, updateEncounter, createTreatment,
  updateTreatment, deleteTreatment, deleteEncounter, createLabOrder, fetchLabOrders, updateLabOrder,
  createToothRecord, updateToothRecord,
} from '../lib/api'
import { toJalaliString, toJalaliStringPretty, formatCurrency, formatNumber, toPersianDigits } from '../lib/persianDate'
import { Encounter, EncounterWithRelations, Treatment, Procedure, Patient, Doctor, Laboratory, ToothRecord, LabOrder } from '../types'
import { Card, Button, Badge, Spinner, EmptyState, Tabs, Input, Select, Textarea, Modal, Wizard, showToast } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'
import { useConfirmAction } from '../components/ConfirmAction'
import { h } from '../lib/haptics'
import DentalChart from '../components/DentalChart'

// ── Constants ──────────────────────────────────────────────────

const encounterStatuses: { value: string; label: string; color: string }[] = [
  { value: 'open', label: 'باز', color: 'warning' },
  { value: 'in_progress', label: 'در حال انجام', color: 'primary' },
  { value: 'completed', label: 'تکمیل شده', color: 'success' },
  { value: 'cancelled', label: 'لغو شده', color: 'error' },
]

const procedureCategories: Record<string, string> = {
  restorative: 'ترمیمی', endodontics: 'عصب‌کشی', surgery: 'جراحی', prosthetics: 'پروتز',
  orthodontics: 'ارتودنسی', pediatric: 'اطفال', preventive: 'پیشگیری', diagnostic: 'تشخیصی',
  cosmetic: 'زیبایی', implant: 'ایمپلنت', periodontics: 'لثه', other: 'سایر',
}

const treatmentStatuses: { value: string; label: string }[] = [
  { value: 'planned', label: 'برنامه‌ریزی شده' },
  { value: 'in_progress', label: 'در حال انجام' },
  { value: 'completed', label: 'تکمیل شده' },
  { value: 'cancelled', label: 'لغو شده' },
]

const labWorkTypes: { value: string; label: string }[] = [
  { value: 'crown', label: 'روکش' },
  { value: 'bridge', label: 'پل' },
  { value: 'post', label: 'پست' },
  { value: 'post_and_core', label: 'پست و کور' },
  { value: 'denture', label: 'دنچر' },
  { value: 'partial_denture', label: 'دنچر پارسیل' },
  { value: 'implant_crown', label: 'روکش ایمپلنت' },
  { value: 'implant_abutment', label: 'آباتمنت ایمپلنت' },
  { value: 'veneer', label: 'ونیر' },
  { value: 'inlay', label: 'اینله' },
  { value: 'onlay', label: 'اونله' },
  { value: 'night_guard', label: 'محافظ شب' },
  { value: 'orthodontic_appliance', label: 'اپلایانس ارتودنسی' },
  { value: 'flipper', label: 'فلیپر' },
  { value: 'retainer', label: 'ریتینر' },
  { value: 'other', label: 'سایر' },
]

const labMaterials: { value: string; label: string }[] = [
  { value: 'zirconia', label: 'زیرکونیا' },
  { value: 'porcelain', label: 'پرسلن' },
  { value: 'metal_ceramic', label: 'متال سرامیک' },
  { value: 'composite', label: 'کامپوزیت' },
  { value: 'acrylic', label: 'آکریل' },
  { value: 'pmma', label: 'PMMA' },
  { value: 'emax', label: 'ایمکس (E.max)' },
  { value: 'titanium', label: 'تیتانیوم' },
  { value: 'cobalt_chrome', label: 'کبالت کروم' },
  { value: 'gold', label: 'طلایی' },
  { value: 'other', label: 'سایر' },
]

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#a855f7']

const treatmentStatusColors: Record<string, string> = {
  planned: 'warning', in_progress: 'primary', completed: 'success', cancelled: 'error',
}

function getEncounterStatusMeta(status: string) {
  return encounterStatuses.find((s) => s.value === status) || encounterStatuses[0]
}

function getCategoryLabel(cat: string | null) {
  if (!cat) return 'سایر'
  return procedureCategories[cat] || cat
}

// ── Main Component ─────────────────────────────────────────────

export default function Treatments() {
  const navigate = useNavigate()
  const location = useLocation()
  const { confirmAction, ConfirmActionModal } = useConfirmAction()

  const [activeTab, setActiveTab] = useState('encounters')
  const [encounters, setEncounters] = useState<EncounterWithRelations[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [labs, setLabs] = useState<Laboratory[]>([])
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [toothRecords, setToothRecords] = useState<ToothRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // Encounter modal
  const [encModalOpen, setEncModalOpen] = useState(false)
  const [encWizardStep, setEncWizardStep] = useState(0)
  const [editingEnc, setEditingEnc] = useState<EncounterWithRelations | null>(null)
  const [savingEnc, setSavingEnc] = useState(false)
  const [encForm, setEncForm] = useState({
    patient_id: '', doctor_id: '', encounter_date: new Date().toISOString().slice(0, 10),
    chief_complaint: '', diagnosis: '', treatment_plan: '', notes: '',
    status: 'open', total_amount: '', discount_amount: '',
  })

  // Patient search in encounter modal
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientResults, setShowPatientResults] = useState(false)

  // Treatment modal
  const [treatModalOpen, setTreatModalOpen] = useState(false)
  const [treatWizardStep, setTreatWizardStep] = useState(0)
  const [editingTreat, setEditingTreat] = useState<Treatment | null>(null)
  const [treatEncounterId, setTreatEncounterId] = useState<string | null>(null)
  const [treatPatientId, setTreatPatientId] = useState<string | null>(null)
  const [savingTreat, setSavingTreat] = useState(false)
  const [treatForm, setTreatForm] = useState({
    procedure_code: '', procedure_name: '', procedure_category: '',
    tooth_number: '', tooth_surface: '', quantity: '1', unit_price: '',
    discount: '', total_price: '', status: 'planned', notes: '',
    has_lab: false, lab_id: '', lab_cost: '', lab_work_type: '', lab_material: '', lab_shade: '',
  })

  // Encounter detail modal (shows treatments + chart)
  const [detailEnc, setDetailEnc] = useState<EncounterWithRelations | null>(null)

  // Procedure category filter for treatment modal dropdown
  const [procCategoryFilter, setProcCategoryFilter] = useState('')

  // ── Data Fetching ─────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [encs, trets, procs, pats, docs, labsList, labOrdersList] = await Promise.all([
        fetchEncounters(), fetchTreatments(), fetchProcedures(),
        fetchPatients(), fetchDoctors(), fetchLabs(), fetchLabOrders(),
      ])
      setEncounters(encs)
      setTreatments(trets as Treatment[])
      setProcedures(procs)
      setPatients(pats)
      setDoctors(docs)
      setLabs(labsList)
      setLabOrders(labOrdersList as unknown as LabOrder[])
    } catch (err) {
      console.error('Error loading treatments:', err)
      showToast('error', 'خطا در بارگذاری درمان‌ها')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Coming from Appointments → 'تکمیل نوبت' opens the encounter it just
  // created, so staff can go straight into recording treatments instead
  // of hunting for the patient again in a separate list.
  useEffect(() => {
    const openId = (location.state as { openEncounterId?: string } | null)?.openEncounterId
    if (!openId || encounters.length === 0) return
    const enc = encounters.find((e) => e.id === openId)
    if (enc) {
      setDetailEnc(enc)
      // Clear the state so refreshing/navigating back doesn't reopen it.
      window.history.replaceState({}, '')
    }
  }, [location.state, encounters])

  // Load tooth records when detailEnc changes
  useEffect(() => {
    if (detailEnc) {
      fetchToothRecords(detailEnc.patient_id).then(setToothRecords).catch(() => {})
    }
  }, [detailEnc])

  // ── Derived Data ──────────────────────────────────────────────

  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors])

  const patientSearchResults = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 6)
    const q = patientSearch.toLowerCase().trim()
    return patients.filter((p) => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase()
      return name.includes(q) || (p.phone || '').includes(q) || (p.file_number || '').toLowerCase().includes(q)
    }).slice(0, 8)
  }, [patients, patientSearch])

  const filteredEncounters = useMemo(() => {
    return encounters.filter((e) => {
      if (searchQuery) {
        const name = e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : ''
        const diag = e.diagnosis || ''
        if (!name.toLowerCase().includes(searchQuery.toLowerCase()) && !diag.toLowerCase().includes(searchQuery.toLowerCase())) return false
      }
      if (filterStatus && e.status !== filterStatus) return false
      return true
    })
  }, [encounters, searchQuery, filterStatus])

  const filteredProcedures = useMemo(() => {
    return procedures.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false
      }
      if (filterCategory && p.category !== filterCategory) return false
      return true
    })
  }, [procedures, searchQuery, filterCategory])

  const encounterTreatments = useMemo(() => {
    if (!detailEnc) return []
    return treatments.filter((t) => t.encounter_id === detailEnc.id)
  }, [treatments, detailEnc])

  const stats = useMemo(() => {
    const totalEncounters = encounters.length
    const inProgress = encounters.filter((e) => e.status === 'in_progress').length
    const completed = encounters.filter((e) => e.status === 'completed').length
    const totalRevenue = encounters.reduce((sum, e) => sum + (e.total_amount || 0), 0)
    return { totalEncounters, inProgress, completed, totalRevenue }
  }, [encounters])

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    procedures.forEach((p) => {
      const cat = getCategoryLabel(p.category)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [procedures])

  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(procedures.map((p) => p.category).filter(Boolean)))
    return cats.map((c) => ({ value: c as string, label: getCategoryLabel(c) }))
  }, [procedures])

  // ── Helpers ───────────────────────────────────────────────────

  const encounterPatientName = (e: EncounterWithRelations) => e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : 'نامشخص'
  const encounterDoctorName = (e: EncounterWithRelations) => {
    if (!e.doctor) return '-'
    return e.doctor.name || e.doctor.specialty || 'پزشک'
  }
  const getPatientName = (id: string) => { const p = patientMap.get(id); return p ? `${p.first_name} ${p.last_name}` : 'نامشخص' }
  const getDoctorName = (id: string | null) => { if (!id) return '-'; const d = doctorMap.get(id); return d?.name || d?.specialty || 'پزشک' }

  // ── Encounter Modal ───────────────────────────────────────────

  const openEncCreateModal = () => {
    h.tap()
    setEditingEnc(null)
    setEncWizardStep(0)
    setEncForm({
      patient_id: '', doctor_id: '', encounter_date: new Date().toISOString().slice(0, 10),
      chief_complaint: '', diagnosis: '', treatment_plan: '', notes: '',
      status: 'open', total_amount: '', discount_amount: '',
    })
    setPatientSearch(''); setShowPatientResults(false)
    setEncModalOpen(true)
  }

  const openEncEditModal = (e: EncounterWithRelations) => {
    h.tap()
    setEditingEnc(e)
    setEncWizardStep(0)
    setEncForm({
      patient_id: e.patient_id, doctor_id: e.doctor_id || '',
      encounter_date: e.encounter_date || new Date().toISOString().slice(0, 10),
      chief_complaint: e.chief_complaint || '', diagnosis: e.diagnosis || '',
      treatment_plan: e.treatment_plan || '', notes: e.notes || '',
      status: e.status, total_amount: e.total_amount ? String(e.total_amount) : '',
      discount_amount: e.discount_amount ? String(e.discount_amount) : '',
    })
    const p = patientMap.get(e.patient_id)
    setPatientSearch(p ? `${p.first_name} ${p.last_name}` : '')
    setShowPatientResults(false)
    setEncModalOpen(true)
  }

  const handleSaveEncounter = () => {
    if (!encForm.patient_id) { h.error(); showToast('error', 'انتخاب بیمار الزامی است'); return }
    if (!encForm.doctor_id) { h.error(); showToast('error', 'انتخاب پزشک الزامی است'); return }
    const patient = patientMap.get(encForm.patient_id)
    const payload = {
      patient_id: encForm.patient_id, doctor_id: encForm.doctor_id,
      encounter_date: encForm.encounter_date, chief_complaint: encForm.chief_complaint || null,
      diagnosis: encForm.diagnosis || null, treatment_plan: encForm.treatment_plan || null,
      notes: encForm.notes || null, status: encForm.status,
      total_amount: encForm.total_amount ? Number(encForm.total_amount) : null,
      discount_amount: encForm.discount_amount ? Number(encForm.discount_amount) : null,
      appointment_id: null, paid_amount: null, created_by: null,
    } as any
    confirmAction({
      type: editingEnc ? 'edit' : 'create',
      title: editingEnc ? 'ویرایش ویزیت' : 'ویزیت جدید',
      fields: [
        { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '-', highlight: true },
        { label: 'پزشک', value: getDoctorName(encForm.doctor_id) },
        { label: 'تاریخ', value: toJalaliString(encForm.encounter_date) },
        { label: 'شکایت اصلی', value: encForm.chief_complaint || '-' },
        { label: 'مبلغ کل', value: encForm.total_amount ? `${formatCurrency(Number(encForm.total_amount))} ت` : '-' },
      ],
      confirmLabel: editingEnc ? 'ذخیره' : 'ثبت ویزیت',
      onConfirm: async () => {
        setSavingEnc(true)
        try {
          if (editingEnc) { await updateEncounter(editingEnc.id, payload); showToast('success', 'ویزیت ویرایش شد') }
          else { await createEncounter(payload); showToast('success', 'ویزیت ثبت شد') }
          setEncModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSavingEnc(false) }
      },
    })
  }

  const handleDeleteEncounter = (e: EncounterWithRelations) => {
    h.warning()
    confirmAction({
      type: 'delete', title: 'حذف ویزیت', warning: 'این عملیات قابل بازگشت نیست',
      fields: [
        { label: 'بیمار', value: encounterPatientName(e), highlight: true },
        { label: 'تاریخ', value: toJalaliString(e.encounter_date) },
      ],
      confirmLabel: 'حذف قطعی',
      onConfirm: async () => {
        try { await deleteEncounter(e.id); showToast('success', 'ویزیت حذف شد'); await loadData() }
        catch { showToast('error', 'خطا در حذف') }
      },
    })
  }

  // ── Treatment Modal ───────────────────────────────────────────

  const openTreatCreateModal = (encId: string, patId: string) => {
    h.tap()
    setEditingTreat(null)
    setTreatWizardStep(0)
    setTreatEncounterId(encId); setTreatPatientId(patId)
    setTreatForm({
      procedure_code: '', procedure_name: '', procedure_category: '',
      tooth_number: '', tooth_surface: '', quantity: '1', unit_price: '',
      discount: '', total_price: '', status: 'planned', notes: '',
      has_lab: false, lab_id: '', lab_cost: '', lab_work_type: '', lab_material: '', lab_shade: '',
    })
    setTreatModalOpen(true)
  }

  const openTreatEditModal = (t: Treatment) => {
    h.tap()
    setEditingTreat(t)
    setTreatWizardStep(0)
    setTreatEncounterId(t.encounter_id); setTreatPatientId(t.patient_id)
    setTreatForm({
      procedure_code: t.procedure_code || '', procedure_name: t.procedure_name || '',
      procedure_category: t.procedure_category || '', tooth_number: t.tooth_number || '',
      tooth_surface: t.tooth_surface || '', quantity: String(t.quantity || 1),
      unit_price: t.unit_price ? String(t.unit_price) : '', discount: t.discount ? String(t.discount) : '',
      total_price: t.total_price ? String(t.total_price) : '', status: t.status || 'planned',
      notes: t.notes || '', has_lab: !!t.lab_id, lab_id: t.lab_id || '',
      lab_cost: t.lab_cost ? String(t.lab_cost) : '', lab_work_type: '',
      lab_material: '', lab_shade: '',
    })
    setTreatModalOpen(true)
  }

  const handleProcedureSelect = (procCode: string) => {
    h.select()
    const proc = procedures.find((p) => p.code === procCode)
    if (proc) {
      setTreatForm((f) => ({
        ...f, procedure_code: proc.code, procedure_name: proc.name,
        procedure_category: proc.category || '',
        unit_price: proc.default_price ? String(proc.default_price) : '',
        total_price: proc.default_price ? String(proc.default_price) : '',
      }))
    }
  }

  const calcTotal = () => {
    const qty = Number(treatForm.quantity) || 1
    const price = Number(treatForm.unit_price) || 0
    const disc = Number(treatForm.discount) || 0
    return qty * price - disc
  }

  const handleSaveTreatment = () => {
    if (!treatEncounterId || !treatPatientId) return
    if (!treatForm.procedure_name.trim()) { showToast('error', 'نام رویه الزامی است'); return }
    const total = calcTotal()
    const payload = {
      encounter_id: treatEncounterId, patient_id: treatPatientId,
      doctor_id: editingTreat?.doctor_id || encounters.find((e) => e.id === treatEncounterId)?.doctor_id || null,
      tooth_number: treatForm.tooth_number || null, tooth_surface: treatForm.tooth_surface || null,
      procedure_code: treatForm.procedure_code || null, procedure_name: treatForm.procedure_name,
      procedure_category: treatForm.procedure_category || null,
      description: null, quantity: Number(treatForm.quantity) || 1,
      unit_price: Number(treatForm.unit_price) || null,
      discount: Number(treatForm.discount) || null, total_price: total,
      lab_id: treatForm.has_lab && treatForm.lab_id ? treatForm.lab_id : null,
      lab_cost: treatForm.has_lab && treatForm.lab_cost ? Number(treatForm.lab_cost) : null,
      status: treatForm.status, notes: treatForm.notes || null,
      doctor_share: null, doctor_share_calculated: false,
    } as any
    const enc = encounters.find((e) => e.id === treatEncounterId)
    const fields = [
      { label: 'بیمار', value: enc ? encounterPatientName(enc) : '-', highlight: true },
      { label: 'رویه', value: treatForm.procedure_name },
      { label: 'دندان', value: treatForm.tooth_number ? toPersianDigits(treatForm.tooth_number) : '-' },
      { label: 'هزینه کل', value: `${formatCurrency(total)} ت` },
    ]
    if (treatForm.has_lab && treatForm.lab_id) {
      const lab = labs.find((l) => l.id === treatForm.lab_id)
      fields.push({ label: 'لابراتوار', value: lab?.name || '-', highlight: true })
      fields.push({ label: 'هزینه‌ی لابراتوار', value: treatForm.lab_cost ? `${formatCurrency(Number(treatForm.lab_cost))} ت` : '-' })
    }
    confirmAction({
      type: editingTreat ? 'edit' : 'create',
      title: editingTreat ? 'ویرایش درمان' : 'درمان جدید',
      fields,
      confirmLabel: editingTreat ? 'ذخیره' : 'ثبت درمان',
      onConfirm: async () => {
        setSavingTreat(true)
        try {
          if (editingTreat) {
            await updateTreatment(editingTreat.id, payload)
            showToast('success', 'درمان ویرایش شد')
          } else {
            const newTreat = await createTreatment(payload)
            // If has lab, create lab order + payment simultaneously
            if (treatForm.has_lab && treatForm.lab_id) {
              await createLabOrder({
                lab_id: treatForm.lab_id, patient_id: treatPatientId,
                doctor_id: payload.doctor_id, encounter_id: treatEncounterId,
                work_type: treatForm.lab_work_type || treatForm.procedure_name,
                tooth_number: treatForm.tooth_number || null,
                cost: treatForm.lab_cost ? Number(treatForm.lab_cost) : null,
                status: 'pending',
                shade: treatForm.lab_shade || null,
                material: treatForm.lab_material || null, deadline: null,
                received_at: null, notes: treatForm.notes || null,
              } as any)
              showToast('success', 'درمان + سفارش لابراتوار ثبت شد')
            }
            // NOTE: intentionally NOT auto-creating a "payment" here. A
            // Payment record must represent money actually received —
            // creating one with status:'pending' for the full treatment
            // cost every time a treatment is added conflated "charge"
            // with "payment", cluttering the real payments list with
            // phantom entries and risking someone later marking a
            // never-received amount as completed (double counting /
            // wrongly clearing a real balance). The amount owed is
            // already correctly derived from treatments.total_price via
            // calcPatientBalance() — no separate record needed until
            // the patient actually pays through Billing → ثبت پرداخت.
            // Update encounter total
            const encTreatments = treatments.filter((t) => t.encounter_id === treatEncounterId)
            const newTotal = encTreatments.reduce((s, t) => s + (t.total_price || 0), 0) + total
            await updateEncounter(treatEncounterId, { total_amount: newTotal } as any)
          }
          setTreatModalOpen(false); await loadData()
          if (detailEnc) {
            const updated = await fetchEncounters()
            const found = updated.find((e) => e.id === detailEnc.id)
            if (found) setDetailEnc(found)
          }
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSavingTreat(false) }
      },
    })
  }

  const handleDeleteTreatment = (t: Treatment) => {
    h.warning()
    // A treatment with has_lab created a real lab order — deleting the
    // treatment without touching that order leaves it orphaned: the lab
    // could keep working on (and billing for) physical work for a
    // treatment that no longer exists in the clinical record. Offer to
    // cancel it in the same step rather than leaving a ghost order.
    const linkedOrder = t.lab_id
      ? labOrders.find((o) => o.encounter_id === t.encounter_id && o.lab_id === t.lab_id && o.status !== 'cancelled' && o.status !== 'delivered')
      : null

    confirmAction({
      type: 'delete', title: 'حذف درمان', warning: 'این عملیات قابل بازگشت نیست',
      fields: [
        { label: 'رویه', value: t.procedure_name || '-', highlight: true },
        { label: 'دندان', value: t.tooth_number ? toPersianDigits(t.tooth_number) : '-' },
        ...(linkedOrder ? [{ label: 'سفارش لابراتوار مرتبط', value: 'همزمان لغو می‌شود تا کار روی آن ادامه پیدا نکند' }] : []),
      ],
      confirmLabel: 'حذف قطعی',
      onConfirm: async () => {
        try {
          await deleteTreatment(t.id)
          if (linkedOrder) await updateLabOrder(linkedOrder.id, { status: 'cancelled' })
          showToast('success', linkedOrder ? 'درمان حذف و سفارش لابراتوار مرتبط لغو شد' : 'درمان حذف شد')
          await loadData()
        }
        catch { showToast('error', 'خطا در حذف') }
      },
    })
  }

  // ── Tooth chart update handler ────────────────────────────────

  const handleUpdateTooth = async (toothNumber: string, data: { is_missing: boolean; is_implant: boolean; notes: string; condition?: string }) => {
    if (!detailEnc) return
    try {
      const existing = toothRecords.find((r) => r.tooth_number === toothNumber && r.patient_id === detailEnc.patient_id)
      if (existing) {
        await updateToothRecord(existing.id, { is_missing: data.is_missing, is_implant: data.is_implant, notes: data.notes } as any)
      } else {
        await createToothRecord({ patient_id: detailEnc.patient_id, tooth_number: toothNumber, is_missing: data.is_missing, is_implant: data.is_implant, notes: data.notes } as any)
      }
      h.success()
      const recs = await fetchToothRecords(detailEnc.patient_id)
      setToothRecords(recs)
    } catch { showToast('error', 'خطا در ذخیره دندان') }
  }

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size={32} /></div>
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="treatments"
        title="درمان‌ها"
        subtitle="مدیریت ویزیت‌ها و رویه‌های درمانی"
        action={<Button onClick={openEncCreateModal} className="flex items-center gap-1.5"><Plus size={16} /> ویزیت جدید</Button>}
      />

      {/* Stats */}
      <ReorderableStatGrid
        storageKey="treatments"
        items={[
          { key: 'encounters', node: <ModuleStatCard moduleKey="treatments" icon={<ClipboardList size={20} />} label="کل ویزیت‌ها" value={formatNumber(stats.totalEncounters)} /> },
          { key: 'inprogress', node: <ModuleStatCard moduleKey="treatments" icon={<Activity size={20} />} label="در حال انجام" value={formatNumber(stats.inProgress)} /> },
          { key: 'completed', node: <ModuleStatCard moduleKey="treatments" icon={<Stethoscope size={20} />} label="تکمیل شده" value={formatNumber(stats.completed)} /> },
          { key: 'revenue', node: <ModuleStatCard moduleKey="treatments" icon={<Smile size={20} />} label="ارزش کل درمان‌ها" value={`${formatCurrency(stats.totalRevenue)} ت`} /> },
        ]}
      />

      <Tabs
        tabs={[
          { key: 'encounters', label: 'ویزیت‌ها', icon: <ClipboardList size={16} /> },
          { key: 'procedures', label: 'رویه‌های درمانی', icon: <Stethoscope size={16} /> },
        ]}
        active={activeTab}
        onChange={(t) => { h.select(); setActiveTab(t) }}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'encounters' ? 'جستجوی بیمار یا تشخیص...' : 'جستجوی نام یا کد رویه...'}
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          {activeTab === 'encounters' ? (
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="">همه وضعیت‌ها</option>
              {encounterStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          ) : (
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="">همه دسته‌ها</option>
              {categoryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          )}
          {(searchQuery || filterStatus || filterCategory) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFilterStatus(''); setFilterCategory('') }}>پاک کردن</Button>
          )}
        </div>
      </Card>

      {/* Encounters Tab */}
      {activeTab === 'encounters' && (
        <div className="space-y-4">
          {filteredEncounters.length === 0 ? (
            <Card className="p-5"><EmptyState icon={<ClipboardList size={28} />} title="ویزیتی یافت نشد" description="با ثبت ویزیت جدید شروع کنید" action={<Button onClick={openEncCreateModal} className="flex items-center gap-1.5"><Plus size={16} /> ویزیت جدید</Button>} /></Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">بیمار</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">پزشک</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">تاریخ</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">تشخیص</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">مبلغ</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">وضعیت</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEncounters.map((e) => {
                      const meta = getEncounterStatusMeta(e.status)
                      return (
                        <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all-smooth cursor-pointer" onClick={() => { h.tap(); setDetailEnc(e) }}>
                          <td className="px-4 py-3"><p className="font-medium text-slate-800">{encounterPatientName(e)}</p></td>
                          <td className="px-4 py-3 text-slate-600">{encounterDoctorName(e)}</td>
                          <td className="px-4 py-3 text-slate-600">{toJalaliString(e.encounter_date)}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{e.diagnosis || '-'}</td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{e.total_amount ? `${formatCurrency(e.total_amount)} ت` : '-'}</td>
                          <td className="px-4 py-3"><Badge color={meta.color}>{meta.label}</Badge></td>
                          <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDetailEnc(e)} className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><Eye size={14} /></button>
                              <button onClick={() => openEncEditModal(e)} className="p-1 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteEncounter(e)} className="p-1 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Procedures Tab */}
      {activeTab === 'procedures' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-0 overflow-hidden lg:col-span-2">
            {filteredProcedures.length === 0 ? (
              <EmptyState icon={<Stethoscope size={28} />} title="رویه‌ای یافت نشد" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">کد</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">نام رویه</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">دسته</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">قیمت پایه</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcedures.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all-smooth">
                        <td className="px-4 py-3"><span className="font-mono text-xs text-slate-600">{toPersianDigits(p.code)}</span></td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3"><Badge color="accent">{getCategoryLabel(p.category)}</Badge></td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{p.default_price ? `${formatCurrency(p.default_price)} ت` : '-'}</td>
                        <td className="px-4 py-3"><Badge color={p.is_active ? 'success' : 'slate'}>{p.is_active ? 'فعال' : 'غیرفعال'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">توزیع رویه‌ها بر اساس دسته</h3>
            {categoryChartData.length === 0 ? (
              <EmptyState icon={<Activity size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                  <RTooltip formatter={(v: number) => [formatNumber(v), 'تعداد']} contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {categoryChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {/* ── Encounter Create/Edit Wizard ── */}
      <Wizard
        open={encModalOpen}
        onClose={() => { h.cancel(); setEncModalOpen(false) }}
        title={editingEnc ? 'ویرایش ویزیت' : 'ویزیت جدید'}
        step={encWizardStep}
        onStepChange={setEncWizardStep}
        onFinish={handleSaveEncounter}
        finishLabel={editingEnc ? 'ذخیره' : 'ثبت ویزیت'}
        saving={savingEnc}
        steps={[
          {
            label: 'بیمار و پزشک',
            validate: () => (!encForm.patient_id ? 'انتخاب بیمار الزامی است' : !encForm.doctor_id ? 'انتخاب پزشک الزامی است' : null),
            content: (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">بیمار (جستجو)</label>
                  <div className="relative">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      value={patientSearch}
                      onChange={(e) => { h.tap(); setPatientSearch(e.target.value); setShowPatientResults(true) }}
                      onFocus={() => setShowPatientResults(true)}
                      placeholder="نام یا شماره بیمار..."
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                    {encForm.patient_id && (
                      <button onClick={() => { h.cancel(); setEncForm((p) => ({ ...p, patient_id: '' })); setPatientSearch('') }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-error-500"><X size={16} /></button>
                    )}
                  </div>
                  {showPatientResults && (
                    <div className="mt-1 space-y-1 max-h-[200px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 divide-y divide-slate-50 dark:divide-slate-700">
                      {patientSearchResults.map((p) => (
                        <button key={p.id} onClick={() => { h.select(); setEncForm((d) => ({ ...d, patient_id: p.id })); setPatientSearch(`${p.first_name} ${p.last_name}`); setShowPatientResults(false) }} className="w-full flex items-center gap-3 p-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-right">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs flex-shrink-0">{p.first_name[0]}{p.last_name[0]}</div>
                          <div className="flex-1 min-w-0"><p className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">{p.first_name} {p.last_name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{p.file_number || 'بدون پرونده'}{p.phone ? ` • ${toPersianDigits(p.phone)}` : ''}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {doctors.filter((d) => d.is_active).length === 0 ? (
                  <div className="p-4 rounded-2xl bg-warning-50 border border-warning-200 text-center">
                    <p className="text-sm font-bold text-warning-700 mb-1">هنوز پزشکی ثبت نشده است</p>
                    <p className="text-xs text-warning-600 mb-3">برای ثبت ویزیت، اول باید حداقل یک پزشک اضافه کنید.</p>
                    <Button variant="secondary" size="sm" onClick={() => { setEncModalOpen(false); navigate('/staff') }}>رفتن به پرسنل</Button>
                  </div>
                ) : (
                  <Select label="پزشک (الزامی)" value={encForm.doctor_id} onChange={(v) => { h.select(); setEncForm((p) => ({ ...p, doctor_id: v })) }} options={doctors.filter((d) => d.is_active || d.id === encForm.doctor_id).map((d) => ({ value: d.id, label: `${d.name || d.specialty || `پزشک ${d.id.slice(0, 4)}`}${!d.is_active ? ' (غیرفعال)' : ''}` }))} placeholder="انتخاب پزشک..." />
                )}
                <PersianDateInput label="تاریخ ویزیت" value={encForm.encounter_date} onChange={(v) => setEncForm((p) => ({ ...p, encounter_date: v }))} />
              </>
            ),
          },
          {
            label: 'شکایت و تشخیص',
            content: (
              <>
                <Input label="شکایت اصلی" value={encForm.chief_complaint} onChange={(v) => setEncForm((p) => ({ ...p, chief_complaint: v }))} placeholder="شکایت اصلی بیمار" />
                <Textarea label="تشخیص" value={encForm.diagnosis} onChange={(v) => setEncForm((p) => ({ ...p, diagnosis: v }))} placeholder="تشخیص پزشک" rows={2} />
                <Textarea label="طرح درمان" value={encForm.treatment_plan} onChange={(v) => setEncForm((p) => ({ ...p, treatment_plan: v }))} placeholder="طرح درمان پیشنهادی" rows={2} />
              </>
            ),
          },
          {
            label: 'مبلغ و وضعیت',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="مبلغ کل (تومان)" value={encForm.total_amount} onChange={(v) => setEncForm((p) => ({ ...p, total_amount: v }))} type="number" dir="ltr" />
                  <Input label="تخفیف (تومان)" value={encForm.discount_amount} onChange={(v) => setEncForm((p) => ({ ...p, discount_amount: v }))} type="number" dir="ltr" />
                </div>
                <Select label="وضعیت" value={encForm.status} onChange={(v) => setEncForm((p) => ({ ...p, status: v }))} options={encounterStatuses.map((s) => ({ value: s.value, label: s.label }))} />
              </>
            ),
          },
          {
            label: 'یادداشت',
            content: (
              <Textarea label="یادداشت" value={encForm.notes} onChange={(v) => setEncForm((p) => ({ ...p, notes: v }))} placeholder="یادداشت" rows={3} />
            ),
          },
        ]}
      />

      {/* ── Encounter Detail Modal (treatments + dental chart) ── */}
      <Modal open={!!detailEnc} onClose={() => { h.cancel(); setDetailEnc(null) }} title={detailEnc ? `ویزیت: ${encounterPatientName(detailEnc)}` : ''} size="full">
        {detailEnc && (
          <div className="space-y-5">
            {/* Info bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Badge color={getEncounterStatusMeta(detailEnc.status).color}>{getEncounterStatusMeta(detailEnc.status).label}</Badge>
              <span className="text-xs text-slate-500">{toJalaliStringPretty(detailEnc.encounter_date)}</span>
              <span className="text-xs text-slate-500">پزشک: {encounterDoctorName(detailEnc)}</span>
              {detailEnc.diagnosis && <span className="text-xs text-slate-500">تشخیص: {detailEnc.diagnosis}</span>}
              {detailEnc.total_amount && <span className="text-xs font-bold text-slate-700 mr-auto">{formatCurrency(detailEnc.total_amount)} ت</span>}
            </div>

            {/* Dental Chart */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-1.5"><Smile size={14} /> چارت دندانی (FDI/Palmer)</h4>
              <DentalChart toothRecords={toothRecords} treatments={encounterTreatments} onUpdateTooth={handleUpdateTooth} onAddTreatment={(toothNum) => { if (!detailEnc) return; setTreatEncounterId(detailEnc.id); setTreatPatientId(detailEnc.patient_id); setEditingTreat(null); setTreatWizardStep(0); setTreatForm({ procedure_code: '', procedure_name: '', procedure_category: '', tooth_number: toothNum, tooth_surface: '', quantity: '1', unit_price: '', discount: '', total_price: '', status: 'planned', notes: '', has_lab: false, lab_id: '', lab_cost: '', lab_work_type: '', lab_material: '', lab_shade: '' }); setTreatModalOpen(true) }} />
            </div>

            {/* Treatments list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Stethoscope size={14} /> درمان‌ها</h4>
                <Button size="sm" onClick={() => openTreatCreateModal(detailEnc.id, detailEnc.patient_id)} className="flex items-center gap-1"><Plus size={14} /> درمان جدید</Button>
              </div>
              {encounterTreatments.length === 0 ? (
                <EmptyState icon={<Stethoscope size={24} />} title="درمانی ثبت نشده" />
              ) : (
                <div className="space-y-2">
                  {encounterTreatments.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all-smooth">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-slate-800 truncate">{t.procedure_name || 'رویه'}</p>
                          {t.tooth_number && <Badge color="slate">دندان {toPersianDigits(t.tooth_number)}</Badge>}
                          {t.lab_id && <Badge color="accent"><FlaskConical size={10} /> لابراتوار</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t.total_price ? `${formatCurrency(t.total_price)} ت` : 'بدون هزینه'}
                          {t.status && ` • ${treatmentStatuses.find((s) => s.value === t.status)?.label || t.status}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openTreatEditModal(t)} className="p-1 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteTreatment(t)} className="p-1 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billing + Lab referral buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => navigate(`/billing`)} className="flex items-center gap-1.5"><DollarSign size={16} /> ارجاع به مالی</Button>
              <Button variant="secondary" onClick={() => navigate(`/laboratory`)} className="flex items-center gap-1.5"><FlaskConical size={16} /> ارجاع به لابراتوار</Button>
              <Button variant="ghost" onClick={() => navigate(`/patients/${detailEnc.patient_id}`)} className="flex items-center gap-1.5 mr-auto"><Eye size={16} /> پرونده بیمار</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Treatment Create/Edit Wizard ── */}
      <Wizard
        open={treatModalOpen}
        onClose={() => { h.cancel(); setTreatModalOpen(false) }}
        title={editingTreat ? 'ویرایش درمان' : 'درمان جدید'}
        step={treatWizardStep}
        onStepChange={setTreatWizardStep}
        onFinish={handleSaveTreatment}
        finishLabel={editingTreat ? 'ذخیره' : 'ثبت درمان'}
        saving={savingTreat}
        steps={[
          {
            label: 'رویه درمانی',
            validate: () => (!treatForm.procedure_name.trim() ? 'نام رویه الزامی است' : null),
            content: (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">رویه درمانی</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <button
                      onClick={() => { h.select(); setProcCategoryFilter('') }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all-smooth ${procCategoryFilter === '' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                      همه
                    </button>
                    {Object.entries(procedureCategories).map(([val, label]) => {
                      const count = procedures.filter((p) => p.is_active && p.category === val).length
                      if (count === 0) return null
                      return (
                        <button
                          key={val}
                          onClick={() => { h.select(); setProcCategoryFilter(procCategoryFilter === val ? '' : val) }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all-smooth ${procCategoryFilter === val ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <select
                    value={treatForm.procedure_code}
                    onChange={(e) => handleProcedureSelect(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="">انتخاب از لیست رویه‌ها...</option>
                    {procCategoryFilter ? (
                      procedures.filter((p) => p.is_active && p.category === procCategoryFilter).map((p) => (
                        <option key={p.id} value={p.code}>{p.name} ({toPersianDigits(p.code)}){p.default_price ? ` - ${formatCurrency(p.default_price)} ت` : ''}</option>
                      ))
                    ) : (
                      Object.entries(procedureCategories).map(([catVal, catLabel]) => {
                        const groupProcs = procedures.filter((p) => p.is_active && p.category === catVal)
                        if (groupProcs.length === 0) return null
                        return (
                          <optgroup key={catVal} label={catLabel}>
                            {groupProcs.map((p) => (
                              <option key={p.id} value={p.code}>{p.name} ({toPersianDigits(p.code)}){p.default_price ? ` - ${formatCurrency(p.default_price)} ت` : ''}</option>
                            ))}
                          </optgroup>
                        )
                      })
                    )}
                  </select>
                </div>
                <Input label="نام رویه (دستی)" value={treatForm.procedure_name} onChange={(v) => setTreatForm((p) => ({ ...p, procedure_name: v }))} placeholder="نام رویه درمانی" />
              </>
            ),
          },
          {
            label: 'دندان و هزینه',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="شماره دندان (FDI)" value={treatForm.tooth_number} onChange={(v) => setTreatForm((p) => ({ ...p, tooth_number: v }))} placeholder="مثال: 16 یا 11" dir="ltr" />
                  <Select label="سطح دندان" value={treatForm.tooth_surface} onChange={(v) => setTreatForm((p) => ({ ...p, tooth_surface: v }))} options={[
                    { value: 'occlusal', label: 'اکلوزال' }, { value: 'mesial', label: 'مزیال' },
                    { value: 'distal', label: 'دیستال' }, { value: 'buccal', label: 'باکال' },
                    { value: 'lingual', label: 'لینگوال' },
                  ]} placeholder="انتخاب سطح..." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="تعداد" value={treatForm.quantity} onChange={(v) => setTreatForm((p) => ({ ...p, quantity: v }))} type="number" dir="ltr" />
                  <Input label="قیمت واحد (ت)" value={treatForm.unit_price} onChange={(v) => setTreatForm((p) => ({ ...p, unit_price: v }))} type="number" dir="ltr" />
                  <Input label="تخفیف (ت)" value={treatForm.discount} onChange={(v) => setTreatForm((p) => ({ ...p, discount: v }))} type="number" dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-center px-3 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
                    <span className="text-sm font-bold text-primary-700 dark:text-primary-400">مبلغ کل: {formatCurrency(calcTotal())} ت</span>
                  </div>
                  <Select label="وضعیت" value={treatForm.status} onChange={(v) => setTreatForm((p) => ({ ...p, status: v }))} options={treatmentStatuses} />
                </div>
              </>
            ),
          },
          {
            label: 'لابراتوار',
            content: (
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={treatForm.has_lab} onChange={(e) => { h.toggle(); setTreatForm((p) => ({ ...p, has_lab: e.target.checked })) }} className="w-4 h-4 rounded text-accent-600 focus:ring-accent-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><FlaskConical size={16} /> ارسال به لابراتوار + مالی</span>
                </label>
                {treatForm.has_lab && (
                  <div className="space-y-2 mt-2">
                    <Select label="لابراتوار" value={treatForm.lab_id} onChange={(v) => setTreatForm((p) => ({ ...p, lab_id: v }))} options={labs.filter((l) => l.is_active).map((l) => ({ value: l.id, label: l.name }))} placeholder="انتخاب لابراتوار..." />
                    <div className="grid grid-cols-2 gap-2">
                      <Select label="نوع کار لابراتوار" value={treatForm.lab_work_type} onChange={(v) => setTreatForm((p) => ({ ...p, lab_work_type: v }))} options={labWorkTypes} placeholder="انتخاب نوع کار..." />
                      <Select label="جنس ماده" value={treatForm.lab_material} onChange={(v) => setTreatForm((p) => ({ ...p, lab_material: v }))} options={labMaterials} placeholder="انتخاب جنس..." />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="رنگ / شماره سایه" value={treatForm.lab_shade} onChange={(v) => setTreatForm((p) => ({ ...p, lab_shade: v }))} placeholder="مثال: A2 یا 3M2" dir="ltr" />
                      <Input label="هزینه لابراتوار (ت)" value={treatForm.lab_cost} onChange={(v) => setTreatForm((p) => ({ ...p, lab_cost: v }))} type="number" dir="ltr" />
                    </div>
                    <p className="text-xs text-accent-600 flex items-center gap-1"><CheckCircle2 size={12} /> با تایید، سفارش لابراتوار (با جنس و رنگ) خودکار ثبت می‌شود؛ هزینه به مانده‌حساب بیمار اضافه می‌شود</p>
                  </div>
                )}
              </div>
            ),
          },
          {
            label: 'یادداشت',
            content: (
              <Textarea label="یادداشت" value={treatForm.notes} onChange={(v) => setTreatForm((p) => ({ ...p, notes: v }))} rows={3} />
            ),
          },
        ]}
      />

      {ConfirmActionModal}
    </div>
  )
}
