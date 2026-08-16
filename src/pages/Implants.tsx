// Implants.tsx - Persian RTL Dental Clinic Implant Cases Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smile, Plus, Search, Edit2, Eye, Filter, Package, Calendar, DollarSign, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Activity, Layers, Trash2 } from 'lucide-react'
import { fetchImplantCases, createImplantCase, updateImplantCase, deleteImplantCase, createImplantComponent, fetchPatients, fetchDoctors, createExpense } from '../lib/api'
import { CLINIC_ID } from '../lib/supabase'
import { toJalaliString, toJalaliStringPretty, formatCurrency, formatNumber, toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { useConfirmAction } from '../components/ConfirmAction'
import { ImplantCase, ImplantCaseWithRelations, ImplantComponent, Patient, Doctor } from '../types'
import { Wizard, Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, showToast } from '../components/ui'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'

// ============================================================================
// Constants
// ============================================================================

// 7-stage workflow: planned -> surgery_done -> healing -> impression -> crown_delivery -> completed (+ failed)
const implantStages: { value: string; label: string; color: string; icon: string }[] = [
  { value: 'planned', label: 'برنامه‌ریزی شده', color: 'slate', icon: '📋' },
  { value: 'surgery_done', label: 'جراحی انجام شد', color: 'primary', icon: '🔪' },
  { value: 'healing', label: 'در حال بهبود', color: 'warning', icon: '⏳' },
  { value: 'impression', label: 'قالب‌گیری', color: 'accent', icon: '🦷' },
  { value: 'crown_delivery', label: 'تحویل روکش', color: 'secondary', icon: '👑' },
  { value: 'completed', label: 'تکمیل شده', color: 'success', icon: '✅' },
  { value: 'failed', label: 'ناموفق', color: 'error', icon: '❌' },
]

const implantBrands = [
  { value: 'straumann', label: 'استراومن (Straumann)', models: ['BLT', 'BLX', 'TLX', 'ITI', 'SLActive', 'SLActive HB'] },
  { value: 'nobel_biocare', label: 'نوبل بیوکر (Nobel Biocare)', models: ['Replace', 'NobelActive', 'Branemark', 'NobelReplace Tapered', 'Speedy Groovy'] },
  { value: 'osstem', label: 'اسستم (Osstem)', models: ['GS-II', 'GS-III', 'SS-II', 'MS-II', 'TS-II', 'TS-III', 'SA', 'CA'] },
  { value: 'dentium', label: 'دنتیوم (Dentium)', models: ['SuperLine', 'SimpleLine', 'Implantium', 'Nuvia', 'Dio'] },
  { value: 'mega_gen', label: 'مگا جن (MegaGen)', models: ['AnyRidge', 'XPEED', 'Rescue', 'MegaGen ER', 'MegaGen Bio-Tem'] },
  { value: 'neobiotech', label: 'نئوبایوتک (NeoBiotech)', models: ['NB', 'Spline', 'IS-II Active', 'IS-III Active'] },
  { value: 'biohorizons', label: 'بیوهورایزن (BioHorizons)', models: ['Tapered Internal', 'Tapered External', 'Laser-Lok', 'MiniLok'] },
  { value: 'zimmer', label: 'زیمر (Zimmer)', models: ['Tapered Screw-Vent', 'SVT', 'AdVent', 'SwissPlus'] },
  { value: 'muller', label: 'مولر (Müller)', models: ['Müller Standard', 'Müller Premium', 'Müller Bio-Tem'] },
  { value: 'bio_teen', label: 'بایو-تین (BioTeen)', models: ['BT-Active', 'BT-Classic', 'BT-Bio-Tem'] },
  { value: 'dio', label: 'دیو (DIO)', models: ['DIO SM', 'DIO UF', 'DIO Navi', 'DIO Implant'] },
  { value: 'hiossen', label: 'هیوسن (Hiossen)', models: ['OneStop', 'SureTek', 'PlusTek', 'Sequence'] },
  { value: 'dentis', label: 'دنتیس (Dentis)', models: ['Dentis OneQ', 'Dentis Q-Implant', 'Dentis S-Line'] },
  { value: 'kavo', label: 'کاوو (KaVo)', models: ['KaVo Imp', 'KaVo AB'] },
  { value: 'thermax', label: 'ترمکس (Thermax)', models: ['Thermax Bio', 'Thermax Standard'] },
  { value: 'other', label: 'سایر', models: [] },
]

const componentTypes: { value: string; label: string }[] = [
  { value: 'fixture', label: 'فیکسچر (Fixture)' },
  { value: 'healing_abutment', label: 'هیلینگ آباتمنت (Healing Abutment)' },
  { value: 'impression_post', label: 'پست قالب‌گیری (Impression Post)' },
  { value: 'abutment', label: 'آباتمنت (Abutment)' },
  { value: 'crown', label: 'روکش (Crown)' },
  { value: 'screw', label: 'پیچ (Screw)' },
  { value: 'other', label: 'سایر' },
]

const successStatuses: { value: string; label: string; color: string }[] = [
  { value: 'pending', label: 'در انتظار', color: 'slate' },
  { value: 'success', label: 'موفق', color: 'success' },
  { value: 'failed', label: 'ناموفق', color: 'error' },
]

function getStageMeta(stage: string | null) {
  return implantStages.find((s) => s.value === stage) || implantStages[0]
}

function getStageIndex(stage: string | null) {
  const idx = implantStages.findIndex((s) => s.value === stage)
  return idx >= 0 ? idx : 0
}

function getSuccessMeta(status: string | null) {
  return successStatuses.find((s) => s.value === status) || successStatuses[0]
}

function getBrandLabel(brand: string | null) {
  return implantBrands.find((b) => b.value === brand)?.label || brand || '-'
}

function getBrandModels(brand: string | null): string[] {
  return implantBrands.find((b) => b.value === brand)?.models || []
}

// Computes the surgeon's share for a case: negotiated flat amount, or
// the formula (total_cost minus deductible component costs) / 2.
// Fixture cost is always excluded regardless of include_in_doctor_share
// (billed separately, never part of the surgeon's deduction base).
function calcSurgeryShare(c: ImplantCaseWithRelations): number {
  if (c.surgery_fee_mode === 'negotiated') return c.surgery_fee_amount || 0
  const deductible = (c.components || [])
    .filter((comp) => comp.component_type !== 'fixture' && comp.include_in_doctor_share !== false)
    .reduce((s, comp) => s + (comp.cost || 0), 0)
  const net = (c.total_cost || 0) - deductible
  return Math.max(0, net / 2)
}

function getComponentTypeLabel(type: string | null) {
  return componentTypes.find((c) => c.value === type)?.label || type || '-'
}

// ============================================================================
// Main Component
// ============================================================================

export default function Implants() {
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  const navigate = useNavigate()

  const [cases, setCases] = useState<ImplantCaseWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterSuccess, setFilterSuccess] = useState('')

  // Case modal
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [caseWizardStep, setCaseWizardStep] = useState(0)
  const [editingCase, setEditingCase] = useState<ImplantCaseWithRelations | null>(null)
  const [saving, setSaving] = useState(false)

  // Component modal
  const [componentModalOpen, setComponentModalOpen] = useState(false)
  const [componentWizardStep, setComponentWizardStep] = useState(0)
  const [componentCaseId, setComponentCaseId] = useState<string | null>(null)
  const [savingComponent, setSavingComponent] = useState(false)

  // Case form state
  const [caseForm, setCaseForm] = useState({
    patient_id: '',
    doctor_id: '',
    tooth_number: '',
    brand: '',
    model: '',
    diameter: '',
    length: '',
    surgery_date: '',
    bone_graft: false,
    gbr: false,
    membrane_used: false,
    extraction_needed: false,
    sinus_lift: false,
    immediate_loading: false,
    total_cost: '',
    paid_amount: '',
    warranty_years: '',
    notes: '',
    surgery_fee_mode: 'formula' as 'formula' | 'negotiated',
    surgery_fee_amount: '',
    prosthesis_doctor_id: '',
    prosthesis_fee_amount: '',
  })

  // Component form state
  const [componentForm, setComponentForm] = useState({
    component_type: 'fixture',
    brand: '',
    model: '',
    serial_number: '',
    cost: '',
    placed_date: '',
    notes: '',
    include_in_doctor_share: true,
  })

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cs, pats, docs] = await Promise.all([
        fetchImplantCases(),
        fetchPatients(),
        fetchDoctors(),
      ])
      setCases(cs)
      setPatients(pats)
      setDoctors(docs)
    } catch (err) {
      console.error('Error loading implant cases:', err)
      showToast('error', 'خطا در بارگذاری موارد ایمپلنت')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (searchQuery) {
        const name = c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : ''
        const tooth = c.tooth_number || ''
        const q = searchQuery.toLowerCase()
        if (!name.toLowerCase().includes(q) && !tooth.toLowerCase().includes(q)) return false
      }
      if (filterStage && c.stage !== filterStage) return false
      if (filterBrand && c.brand !== filterBrand) return false
      if (filterSuccess && c.success_status !== filterSuccess) return false
      return true
    })
  }, [cases, searchQuery, filterStage, filterBrand, filterSuccess])

  const stats = useMemo(() => {
    const total = cases.length
    const inSurgery = cases.filter((c) => c.stage === 'surgery_done').length
    const healing = cases.filter((c) => c.stage === 'healing').length
    const completed = cases.filter((c) => c.stage === 'completed').length
    const successful = cases.filter((c) => c.success_status === 'success').length
    const successRate = total > 0 ? (successful / total) * 100 : 0
    const totalValue = cases.reduce((sum, c) => sum + (c.total_cost || 0), 0)
    return { total, inSurgery, healing, completed, successRate, totalValue }
  }, [cases])

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const patientName = (c: ImplantCaseWithRelations) => {
    return c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'نامشخص'
  }

  const doctorName = (c: ImplantCaseWithRelations) => {
    if (!c.doctor) return '-'
    return c.doctor.name || c.doctor.specialty || 'پزشک'
  }

  const patientOptions = useMemo(() => {
    return patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))
  }, [patients])

  const doctorOptions = useMemo(() => {
    return doctors.map((d) => ({ value: d.id, label: d.name || d.specialty || 'پزشک' }))
  }, [doctors])

  // ===========================================================================
  // Case Modal Handlers
  // ===========================================================================

  const openCreateCaseModal = () => {
    h.tap()
    setEditingCase(null)
    setCaseWizardStep(0)
    setCaseForm({
      patient_id: '', doctor_id: '', tooth_number: '', brand: '', model: '', diameter: '', length: '',
      surgery_date: '', bone_graft: false, gbr: false, membrane_used: false, extraction_needed: false,
      sinus_lift: false, immediate_loading: false,
      total_cost: '', paid_amount: '', warranty_years: '', notes: '',
      surgery_fee_mode: 'formula', surgery_fee_amount: '', prosthesis_doctor_id: '', prosthesis_fee_amount: '',
    })
    setCaseModalOpen(true)
  }

  const openEditCaseModal = (c: ImplantCaseWithRelations) => {
    h.tap()
    setEditingCase(c)
    setCaseForm({
      patient_id: c.patient_id,
      doctor_id: c.doctor_id || '',
      tooth_number: c.tooth_number || '',
      brand: c.brand || '',
      model: c.model || '',
      diameter: c.diameter || '',
      length: c.length || '',
      surgery_date: c.surgery_date || '',
      bone_graft: c.bone_graft || false,
      gbr: c.gbr || false,
      membrane_used: c.membrane_used || false,
      extraction_needed: c.extraction_needed || false,
      sinus_lift: c.sinus_lift || false,
      immediate_loading: c.immediate_loading || false,
      total_cost: c.total_cost != null ? String(c.total_cost) : '',
      paid_amount: c.paid_amount != null ? String(c.paid_amount) : '',
      warranty_years: c.warranty_years != null ? String(c.warranty_years) : '',
      notes: c.notes || '',
      surgery_fee_mode: (c.surgery_fee_mode as 'formula' | 'negotiated') || 'formula',
      surgery_fee_amount: c.surgery_fee_amount != null ? String(c.surgery_fee_amount) : '',
      prosthesis_doctor_id: c.prosthesis_doctor_id || '',
      prosthesis_fee_amount: c.prosthesis_fee_amount != null ? String(c.prosthesis_fee_amount) : '',
    })
    setCaseWizardStep(0)
    setCaseModalOpen(true)
  }

  // Records the surgeon's calculated/negotiated share as a real clinic
  // expense (same pattern as the doctor commission settlement in
  // Staff.tsx) and marks the case as settled so the button doesn't
  // stay actionable forever.
  const handleSettleSurgery = (c: ImplantCaseWithRelations) => {
    h.tap()
    const amount = calcSurgeryShare(c)
    const doctorName = c.doctor?.name || 'پزشک جراح'
    confirmAction({
      type: 'create',
      title: 'ثبت تسویه دستمزد جراحی',
      fields: [
        { label: 'بیمار', value: patientName(c), highlight: true },
        { label: 'جراح', value: `دکتر ${doctorName}` },
        { label: 'روش محاسبه', value: c.surgery_fee_mode === 'negotiated' ? 'توافقی' : 'فرمول خودکار' },
        { label: 'مبلغ', value: `${formatCurrency(amount)} ت`, highlight: true },
      ],
      confirmLabel: 'ثبت پرداخت',
      onConfirm: async () => {
        try {
          await createExpense({
            clinic_id: CLINIC_ID,
            category: 'دستمزد جراحی ایمپلنت',
            amount,
            date: new Date().toISOString().slice(0, 10),
            payment_method: 'cash',
            description: `دستمزد جراحی ایمپلنت — ${patientName(c)} — دکتر ${doctorName}`,
          } as any)
          await updateImplantCase(c.id, { surgery_settled: true })
          showToast('success', 'تسویه ثبت شد و در هزینه‌های کلینیک لحاظ شد')
          await loadData()
        } catch { showToast('error', 'خطا در ثبت تسویه') }
      },
    })
  }

  const handleSettleProsthesis = (c: ImplantCaseWithRelations) => {
    h.tap()
    const amount = c.prosthesis_fee_amount || 0
    const doctorName = doctors.find((d) => d.id === c.prosthesis_doctor_id)?.name || 'پزشک پروتز'
    confirmAction({
      type: 'create',
      title: 'ثبت تسویه دستمزد پروتز',
      fields: [
        { label: 'بیمار', value: patientName(c), highlight: true },
        { label: 'پروتزکار', value: `دکتر ${doctorName}` },
        { label: 'مبلغ توافقی', value: `${formatCurrency(amount)} ت`, highlight: true },
      ],
      confirmLabel: 'ثبت پرداخت',
      onConfirm: async () => {
        try {
          await createExpense({
            clinic_id: CLINIC_ID,
            category: 'دستمزد پروتز ایمپلنت',
            amount,
            date: new Date().toISOString().slice(0, 10),
            payment_method: 'cash',
            description: `دستمزد پروتز ایمپلنت — ${patientName(c)} — دکتر ${doctorName}`,
          } as any)
          await updateImplantCase(c.id, { prosthesis_settled: true })
          showToast('success', 'تسویه ثبت شد و در هزینه‌های کلینیک لحاظ شد')
          await loadData()
        } catch { showToast('error', 'خطا در ثبت تسویه') }
      },
    })
  }

  const handleSaveCase = () => {
    if (!caseForm.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    if (!caseForm.tooth_number.trim()) { showToast('error', 'شماره دندان الزامی است'); return }
    const payload = {
      patient_id: caseForm.patient_id, doctor_id: caseForm.doctor_id || null,
      tooth_number: caseForm.tooth_number, brand: caseForm.brand || null,
      model: caseForm.model || null, diameter: caseForm.diameter || null, length: caseForm.length || null,
      surgery_date: caseForm.surgery_date || null, bone_graft: caseForm.bone_graft,
      gbr: caseForm.gbr, membrane_used: caseForm.membrane_used, extraction_needed: caseForm.extraction_needed,
      sinus_lift: caseForm.sinus_lift, immediate_loading: caseForm.immediate_loading,
      total_cost: caseForm.total_cost ? Number(caseForm.total_cost) : null,
      paid_amount: caseForm.paid_amount ? Number(caseForm.paid_amount) : null,
      warranty_years: caseForm.warranty_years ? Number(caseForm.warranty_years) : null,
      notes: caseForm.notes || null,
      surgery_fee_mode: caseForm.surgery_fee_mode,
      surgery_fee_amount: caseForm.surgery_fee_mode === 'negotiated' && caseForm.surgery_fee_amount ? Number(caseForm.surgery_fee_amount) : null,
      prosthesis_doctor_id: caseForm.prosthesis_doctor_id || null,
      prosthesis_fee_amount: caseForm.prosthesis_fee_amount ? Number(caseForm.prosthesis_fee_amount) : null,
      stage: editingCase?.stage || 'planned', success_status: editingCase?.success_status || 'pending',
      healing_abutment_date: editingCase?.healing_abutment_date || null,
      impression_date: editingCase?.impression_date || null,
      crown_delivery_date: editingCase?.crown_delivery_date || null,
      failure_reason: editingCase?.failure_reason || null,
    } as any
    const patient = patients.find((p) => p.id === caseForm.patient_id)
    confirmAction({
      type: editingCase ? 'edit' : 'create',
      title: editingCase ? 'ویرایش مورد ایمپلنت' : 'ایجاد مورد ایمپلنت',
      fields: [
        { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '-', highlight: true },
        { label: 'دندان', value: toPersianDigits(caseForm.tooth_number) },
        { label: 'برند', value: getBrandLabel(caseForm.brand) },
        { label: 'کل هزینه', value: caseForm.total_cost ? `${formatCurrency(Number(caseForm.total_cost))} ت` : '-' },
        { label: 'دستمزد جراح', value: caseForm.surgery_fee_mode === 'negotiated' ? `توافقی — ${caseForm.surgery_fee_amount ? formatCurrency(Number(caseForm.surgery_fee_amount)) : '0'} ت` : 'فرمول خودکار' },
      ],
      confirmLabel: editingCase ? 'ذخیره' : 'ایجاد',
      onConfirm: async () => {
        setSaving(true)
        try {
          if (editingCase) { await updateImplantCase(editingCase.id, payload); showToast('success', 'ویرایش شد') }
          else { await createImplantCase(payload); showToast('success', 'ایجاد شد') }
          setCaseModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSaving(false) }
      },
    })
  }

  // ===========================================================================
  // Stage Advancement
  // ===========================================================================

  const handleAdvanceStage = (c: ImplantCaseWithRelations, newStage: string) => {
    h.select()
    const meta = getStageMeta(newStage)
    confirmAction({
      type: 'status',
      title: 'تغییر مرحله ایمپلنت',
      fields: [
        { label: 'بیمار', value: patientName(c), highlight: true },
        { label: 'مرحله فعلی', value: getStageMeta(c.stage).label },
        { label: 'مرحله جدید', value: meta.label, highlight: true },
      ],
      confirmLabel: 'تایید',
      onConfirm: async () => {
        const updates: Partial<ImplantCase> = { stage: newStage }
        if (newStage === 'surgery_done' && !c.surgery_date) updates.surgery_date = new Date().toISOString().slice(0, 10)
        if (newStage === 'completed') { updates.success_status = 'success'; if (!c.crown_delivery_date) updates.crown_delivery_date = new Date().toISOString().slice(0, 10) }
        if (newStage === 'failed') updates.success_status = 'failed'
        try { await updateImplantCase(c.id, updates as any); showToast('success', 'مرحله تغییر کرد'); await loadData() }
        catch { showToast('error', 'خطا') }
      },
    })
  }

  // ===========================================================================
  // Component Modal Handlers
  // ===========================================================================

  const openComponentModal = (caseId: string) => {
    setComponentCaseId(caseId)
    setComponentWizardStep(0)
    setComponentForm({
      component_type: 'fixture', brand: '', model: '', serial_number: '', cost: '', placed_date: '', notes: '', include_in_doctor_share: true,
    })
    setComponentModalOpen(true)
  }

  const handleSaveComponent = () => {
    if (!componentCaseId) return
    if (!componentForm.brand.trim() && !componentForm.model.trim()) { showToast('error', 'برند یا مدل الزامی است'); return }
    confirmAction({
      type: 'create',
      title: 'افزودن کامپوننت',
      fields: [
        { label: 'نوع', value: getComponentTypeLabel(componentForm.component_type), highlight: true },
        { label: 'برند', value: componentForm.brand || '-' },
        { label: 'مدل', value: componentForm.model || '-' },
      ],
      confirmLabel: 'افزودن',
      onConfirm: async () => {
        setSavingComponent(true)
        try {
          await createImplantComponent({
            implant_case_id: componentCaseId, component_type: componentForm.component_type,
            brand: componentForm.brand || null, model: componentForm.model || null,
            serial_number: componentForm.serial_number || null, cost: componentForm.cost ? Number(componentForm.cost) : null,
            placed_date: componentForm.placed_date || null, notes: componentForm.notes || null,
            include_in_doctor_share: componentForm.component_type === 'fixture' ? false : componentForm.include_in_doctor_share,
          } as any)
          showToast('success', 'کامپوننت اضافه شد'); setComponentModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا') }
        finally { setSavingComponent(false) }
      },
    })
  }

  // ===========================================================================
  // Render: Osseointegration Timeline
  // ===========================================================================

  const renderTimeline = (c: ImplantCaseWithRelations) => {
    const currentIdx = getStageIndex(c.stage)
    // Skip 'failed' in the progress display unless it's the current stage
    const stages = implantStages.filter((s) => s.value !== 'failed')
    const failed = c.stage === 'failed'
    return (
      <div className="flex items-center gap-1 mt-3">
        {stages.map((s, i) => {
          const isCompleted = failed ? false : i < currentIdx
          const isCurrent = failed ? false : i === currentIdx
          const isLast = i === stages.length - 1
          return (
            <div key={s.value} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all-smooth ${
                    isCompleted ? 'bg-success-500 text-white' :
                    isCurrent ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                    'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : toPersianDigits(i + 1)}
                </div>
                <span className={`text-[10px] mt-1 text-center max-w-[60px] leading-tight ${isCurrent ? 'text-primary-700 font-medium' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {!isLast && (
                <div className={`h-0.5 flex-1 mx-1 ${isCompleted ? 'bg-success-400' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ===========================================================================
  // Render: Progress Bar
  // ===========================================================================

  const renderProgressBar = (stage: string | null) => {
    const currentIdx = getStageIndex(stage)
    const stages = implantStages.filter((s) => s.value !== 'failed')
    const failed = stage === 'failed'
    const progress = failed ? 0 : Math.round((currentIdx / (stages.length - 1)) * 100)
    return (
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500">پیشرفت</span>
          <span className={failed ? 'text-error-600 font-medium' : 'text-primary-600 font-medium'}>
            {failed ? 'ناموفق' : `${toPersianDigits(progress)}٪`}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all-smooth ${failed ? 'bg-error-500' : 'bg-gradient-to-r from-primary-500 to-success-500'}`}
            style={{ width: `${failed ? 100 : progress}%` }}
          />
        </div>
      </div>
    )
  }

  // ===========================================================================
  // Render
  // ===========================================================================

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
        moduleKey="implants"
        title="ایمپلنت‌ها"
        subtitle="مدیریت موارد ایمپلنت دندانی"
        action={<Button onClick={openCreateCaseModal} variant="primary"><Plus size={16} className="inline ml-1" /> مورد جدید</Button>}
      />

      {/* Stats Cards */}
      <ReorderableStatGrid
        storageKey="implants"
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3"
        items={[
          { key: 'total', node: <ModuleStatCard moduleKey="implants" icon={<Smile size={20} />} label="کل موارد" value={formatNumber(stats.total)} /> },
          { key: 'surgery', node: <ModuleStatCard moduleKey="implants" icon={<Activity size={20} />} label="در جراحی" value={formatNumber(stats.inSurgery)} /> },
          { key: 'healing', node: <ModuleStatCard moduleKey="implants" icon={<Clock size={20} />} label="در حال بهبود" value={formatNumber(stats.healing)} /> },
          { key: 'completed', node: <ModuleStatCard moduleKey="implants" icon={<CheckCircle2 size={20} />} label="تکمیل شده" value={formatNumber(stats.completed)} /> },
          { key: 'success', node: <ModuleStatCard moduleKey="implants" icon={<ShieldCheck size={20} />} label="نرخ موفقیت" value={`${toPersianDigits(Math.round(stats.successRate))}٪`} /> },
          { key: 'value', node: <ModuleStatCard moduleKey="implants" icon={<DollarSign size={20} />} label="ارزش کل" value={`${formatCurrency(stats.totalValue)} ت`} /> },
        ]}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی بیمار یا شماره دندان..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">همه مراحل</option>
            {implantStages.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">همه برندها</option>
            {implantBrands.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          <select
            value={filterSuccess}
            onChange={(e) => setFilterSuccess(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">همه وضعیت‌ها</option>
            {successStatuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(searchQuery || filterStage || filterBrand || filterSuccess) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFilterStage(''); setFilterBrand(''); setFilterSuccess('') }}>
              پاک کردن
            </Button>
          )}
        </div>
      </Card>

      {/* Case Cards */}
      {filteredCases.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<Smile size={28} />}
            title="مورد ایمپلنتی ثبت نشده است"
            description="با ایجاد مورد جدید شروع کنید"
            action={<Button onClick={openCreateCaseModal} variant="primary" size="sm"><Plus size={14} className="inline ml-1" />ایجاد مورد</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCases.map((c) => {
            const meta = getStageMeta(c.stage)
            const successMeta = getSuccessMeta(c.success_status)
            const remaining = (c.total_cost || 0) - (c.paid_amount || 0)
            const componentCount = c.components?.length || 0
            return (
              <Card key={c.id} className="p-5 hover:card-shadow-lg transition-all-smooth">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
                      <Smile size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{patientName(c)}</h3>
                      <p className="text-xs text-slate-500">
                        دندان: <span className="font-medium text-slate-700">{toPersianDigits(c.tooth_number || '-')}</span>
                        {c.doctor && ` | پزشک: ${doctorName(c)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge color={meta.color}>{meta.label}</Badge>
                    <Badge color={successMeta.color}>{successMeta.label}</Badge>
                  </div>
                </div>

                {/* Brand/Model info */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-400">برند: </span>
                    <span className="text-slate-700 font-medium">{getBrandLabel(c.brand)}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-400">مدل: </span>
                    <span className="text-slate-700 font-medium">{c.model || '-'}</span>
                  </div>
                  {c.diameter && (
                    <div className="bg-slate-50 rounded-lg p-2">
                      <span className="text-slate-400">قطر: </span>
                      <span className="text-slate-700 font-medium">{toPersianDigits(c.diameter)} mm</span>
                    </div>
                  )}
                  {c.length && (
                    <div className="bg-slate-50 rounded-lg p-2">
                      <span className="text-slate-400">طول: </span>
                      <span className="text-slate-700 font-medium">{toPersianDigits(c.length)} mm</span>
                    </div>
                  )}
                </div>

                {/* Surgery date & flags */}
                <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                  {c.surgery_date && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar size={12} />
                      جراحی: {toJalaliString(c.surgery_date)}
                    </span>
                  )}
                  {c.extraction_needed && <Badge color="slate">کشیدن دندان</Badge>}
                  {c.bone_graft && <Badge color="warning">پونده استخوانی</Badge>}
                  {c.gbr && <Badge color="warning">GBR</Badge>}
                  {c.membrane_used && <Badge color="warning">ممبران</Badge>}
                  {c.sinus_lift && <Badge color="accent">سینوس لیفت</Badge>}
                  {c.immediate_loading && <Badge color="success">بارگذاری فوری</Badge>}
                  {c.prosthesis_doctor_id && c.prosthesis_doctor_id !== c.doctor_id && (
                    <Badge color="secondary">پروتز: دکتر {doctors.find((d) => d.id === c.prosthesis_doctor_id)?.name || '؟'}</Badge>
                  )}
                </div>

                {/* Osseointegration Timeline */}
                {renderTimeline(c)}

                {/* Progress Bar */}
                {renderProgressBar(c.stage)}

                {/* Cost breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">کل هزینه</p>
                    <p className="text-sm font-bold text-slate-700">{formatCurrency(c.total_cost || 0)} ت</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">پرداختی</p>
                    <p className="text-sm font-bold text-success-600">{formatCurrency(c.paid_amount || 0)} ت</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">باقی‌مانده</p>
                    <p className={`text-sm font-bold ${remaining > 0 ? 'text-error-600' : 'text-slate-600'}`}>{formatCurrency(remaining)} ت</p>
                  </div>
                </div>

                {/* Warranty */}
                {c.warranty_years != null && c.warranty_years > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                    <ShieldCheck size={12} className="text-success-600" />
                    گارانتی: {toPersianDigits(c.warranty_years)} سال
                  </div>
                )}

                {/* Components */}
                {componentCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <Layers size={12} />
                      کامپوننت‌ها ({toPersianDigits(componentCount)}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.components?.map((comp) => (
                        <Badge key={comp.id} color="secondary">
                          {getComponentTypeLabel(comp.component_type)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {c.notes && (
                  <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50 line-clamp-2">{c.notes}</p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  {/* Stage advancement */}
                  {c.stage !== 'completed' && c.stage !== 'failed' && (
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) handleAdvanceStage(c, e.target.value) }}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <option value="">تغییر مرحله...</option>
                      {implantStages.filter((s) => s.value !== c.stage).map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => openComponentModal(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-50 text-accent-700 text-xs hover:bg-accent-100 transition-all-smooth"
                  >
                    <Package size={12} />
                    افزودن کامپوننت
                  </button>
                  <button
                    onClick={() => handleSettleSurgery(c)}
                    disabled={!!c.surgery_settled}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success-50 text-success-700 text-xs hover:bg-success-100 transition-all-smooth disabled:opacity-50"
                  >
                    <DollarSign size={12} />
                    {c.surgery_settled ? 'جراحی تسویه شده' : 'ثبت تسویه جراحی'}
                  </button>
                  {c.prosthesis_doctor_id && (
                    <button
                      onClick={() => handleSettleProsthesis(c)}
                      disabled={!!c.prosthesis_settled}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary-50 text-secondary-700 text-xs hover:bg-secondary-100 transition-all-smooth disabled:opacity-50"
                    >
                      <DollarSign size={12} />
                      {c.prosthesis_settled ? 'پروتز تسویه شده' : 'ثبت تسویه پروتز'}
                    </button>
                  )}
                  <button
                    onClick={() => openEditCaseModal(c)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs hover:bg-primary-100 transition-all-smooth"
                  >
                    <Edit2 size={12} />
                    ویرایش
                  </button>
                  <button
                    onClick={() => {
                      h.warning()
                      confirmAction({
                        type: 'delete', title: 'حذف مورد ایمپلنت',
                        warning: 'تمام اطلاعات این مورد ایمپلنت حذف خواهد شد.',
                        fields: [{ label: 'بیمار', value: patientName(c), highlight: true }, { label: 'دندان', value: toPersianDigits(c.tooth_number || '-') }],
                        confirmLabel: 'تایید حذف',
                        onConfirm: async () => {
                          try { await deleteImplantCase(c.id); showToast('success', 'مورد ایمپلنت حذف شد'); await loadData() }
                          catch { showToast('error', 'خطا در حذف') }
                        },
                      })
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error-50 text-error-600 text-xs hover:bg-error-100 transition-all-smooth"
                  >
                    <Trash2 size={12} />
                    حذف
                  </button>
                  <button
                    onClick={() => navigate(`/patients/${c.patient_id}`)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs hover:bg-slate-100 transition-all-smooth mr-auto"
                  >
                    <Eye size={12} />
                    پرونده
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Case Wizard */}
      <Wizard
        open={caseModalOpen}
        onClose={() => { h.cancel(); setCaseModalOpen(false) }}
        title={editingCase ? 'ویرایش مورد ایمپلنت' : 'ایجاد مورد ایمپلنت جدید'}
        step={caseWizardStep}
        onStepChange={setCaseWizardStep}
        onFinish={handleSaveCase}
        finishLabel={editingCase ? 'ذخیره تغییرات' : 'ایجاد مورد'}
        saving={saving}
        steps={[
          {
            label: 'بیمار و دندان',
            validate: () => (!caseForm.patient_id ? 'انتخاب بیمار الزامی است' : !caseForm.tooth_number.trim() ? 'شماره دندان الزامی است' : null),
            content: (
              <>
                <Select label="بیمار *" value={caseForm.patient_id} onChange={(v) => setCaseForm({ ...caseForm, patient_id: v })} options={patientOptions} placeholder="انتخاب بیمار" />
                <Select label="پزشک" value={caseForm.doctor_id} onChange={(v) => setCaseForm({ ...caseForm, doctor_id: v })} options={doctorOptions} placeholder="انتخاب پزشک" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="شماره دندان *" value={caseForm.tooth_number} onChange={(v) => setCaseForm({ ...caseForm, tooth_number: v })} placeholder="مثلا: ۱۱" />
                  <Input label="تاریخ جراحی" type="date" value={caseForm.surgery_date} onChange={(v) => setCaseForm({ ...caseForm, surgery_date: v })} />
                </div>
              </>
            ),
          },
          {
            label: 'برند و مشخصات',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="قطر (mm)" value={caseForm.diameter} onChange={(v) => setCaseForm({ ...caseForm, diameter: v })} placeholder="3.5" dir="ltr" />
                  <Input label="طول (mm)" value={caseForm.length} onChange={(v) => setCaseForm({ ...caseForm, length: v })} placeholder="10" dir="ltr" />
                </div>
                <Select label="برند" value={caseForm.brand} onChange={(v) => setCaseForm({ ...caseForm, brand: v, model: '' })} options={implantBrands} placeholder="انتخاب برند" />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">مدل</label>
                  <input
                    list="implant-models-list"
                    value={caseForm.model}
                    onChange={(e) => setCaseForm({ ...caseForm, model: e.target.value })}
                    placeholder="انتخاب یا تایپ دستی مدل..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  <datalist id="implant-models-list">
                    {getBrandModels(caseForm.brand).map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </>
            ),
          },
          {
            label: 'هزینه و شرایط',
            content: (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Input label="کل هزینه (ت)" type="number" value={caseForm.total_cost} onChange={(v) => setCaseForm({ ...caseForm, total_cost: v })} placeholder="0" />
                  <Input label="پرداختی (ت)" type="number" value={caseForm.paid_amount} onChange={(v) => setCaseForm({ ...caseForm, paid_amount: v })} placeholder="0" />
                  <Input label="گارانتی (سال)" type="number" value={caseForm.warranty_years} onChange={(v) => setCaseForm({ ...caseForm, warranty_years: v })} placeholder="5" />
                </div>
                <div className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={caseForm.extraction_needed} onChange={(e) => setCaseForm({ ...caseForm, extraction_needed: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">کشیدن دندان همزمان (Extraction)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={caseForm.bone_graft} onChange={(e) => setCaseForm({ ...caseForm, bone_graft: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">پوند استخوانی (Bone Graft)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={caseForm.gbr} onChange={(e) => setCaseForm({ ...caseForm, gbr: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">بازسازی استخوان هدایت‌شده (GBR)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={caseForm.membrane_used} onChange={(e) => setCaseForm({ ...caseForm, membrane_used: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">استفاده از ممبران (Membrane)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={caseForm.sinus_lift} onChange={(e) => setCaseForm({ ...caseForm, sinus_lift: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">سینوس لیفت (Sinus Lift)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={caseForm.immediate_loading} onChange={(e) => setCaseForm({ ...caseForm, immediate_loading: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">بارگذاری فوری (Immediate Loading)</span>
                  </label>
                </div>
              </>
            ),
          },
          {
            label: 'دستمزد جراحی و پروتز',
            content: (
              <>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">روش تعیین دستمزد جراح</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCaseForm({ ...caseForm, surgery_fee_mode: 'formula' })}
                      className={`p-2.5 rounded-xl border-2 text-sm font-bold transition-all-smooth ${caseForm.surgery_fee_mode === 'formula' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}
                    >
                      فرمول خودکار
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaseForm({ ...caseForm, surgery_fee_mode: 'negotiated' })}
                      className={`p-2.5 rounded-xl border-2 text-sm font-bold transition-all-smooth ${caseForm.surgery_fee_mode === 'negotiated' ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-slate-200 dark:border-slate-600 text-slate-500'}`}
                    >
                      مبلغ توافقی
                    </button>
                  </div>
                  {caseForm.surgery_fee_mode === 'formula' ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      سهم جراح = (هزینه‌ی کل − هزینه‌ی اقلامی که تیک «کسر در سهم جراح» خورده‌اند) ÷ ۲. هزینه‌ی فیکسچر همیشه مستقل حساب می‌شود.
                    </p>
                  ) : (
                    <Input label="مبلغ توافقی جراح (تومان)" type="number" value={caseForm.surgery_fee_amount} onChange={(v) => setCaseForm({ ...caseForm, surgery_fee_amount: v })} placeholder="0" />
                  )}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <Select
                    label="پزشک انجام‌دهنده‌ی پروتز (در صورت متفاوت بودن با جراح)"
                    value={caseForm.prosthesis_doctor_id}
                    onChange={(v) => setCaseForm({ ...caseForm, prosthesis_doctor_id: v })}
                    options={doctors.filter((d) => d.is_active).map((d) => ({ value: d.id, label: `دکتر ${d.name || d.specialty || 'پزشک'}` }))}
                    placeholder="همان پزشک جراح"
                  />
                  <p className="text-xs text-slate-400 mt-2">اگر روکش/پروتز را پزشک دیگری کار می‌کند، اینجا انتخاب کنید تا سهم‌بندی هرکدام جدا محاسبه شود.</p>
                  {caseForm.prosthesis_doctor_id && (
                    <Input label="دستمزد توافقی پروتزکار (تومان)" type="number" value={caseForm.prosthesis_fee_amount} onChange={(v) => setCaseForm({ ...caseForm, prosthesis_fee_amount: v })} placeholder="0" />
                  )}
                </div>
              </>
            ),
          },
          {
            label: 'یادداشت',
            content: (
              <Textarea label="یادداشت" value={caseForm.notes} onChange={(v) => setCaseForm({ ...caseForm, notes: v })} placeholder="توضیحات و یادداشت‌های مورد" rows={3} />
            ),
          },
        ]}
      />

      {/* Component Wizard */}
      <Wizard
        open={componentModalOpen}
        onClose={() => { h.cancel(); setComponentModalOpen(false) }}
        title="افزودن کامپوننت ایمپلنت"
        step={componentWizardStep}
        onStepChange={setComponentWizardStep}
        onFinish={handleSaveComponent}
        finishLabel="افزودن کامپوننت"
        saving={savingComponent}
        steps={[
          {
            label: 'نوع و برند',
            validate: () => (!componentForm.brand.trim() && !componentForm.model.trim() ? 'برند یا مدل الزامی است' : null),
            content: (
              <>
                <Select label="نوع کامپوننت" value={componentForm.component_type} onChange={(v) => setComponentForm({ ...componentForm, component_type: v })} options={componentTypes} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">برند کامپوننت</label>
                  <input
                    list="component-brands-list"
                    value={componentForm.brand}
                    onChange={(e) => setComponentForm({ ...componentForm, brand: e.target.value })}
                    placeholder="انتخاب یا تایپ دستی برند..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-base focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  <datalist id="component-brands-list">
                    {implantBrands.map((b) => (
                      <option key={b.value} value={b.label} />
                    ))}
                  </datalist>
                </div>
                <Input label="مدل" value={componentForm.model} onChange={(v) => setComponentForm({ ...componentForm, model: v })} placeholder="مدل کامپوننت" />
              </>
            ),
          },
          {
            label: 'سریال و هزینه',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="شماره سریال" value={componentForm.serial_number} onChange={(v) => setComponentForm({ ...componentForm, serial_number: v })} placeholder="سریال" dir="ltr" />
                  <Input label="هزینه (تومان)" type="number" value={componentForm.cost} onChange={(v) => setComponentForm({ ...componentForm, cost: v })} placeholder="0" />
                </div>
                <Input label="تاریخ نصب" type="date" value={componentForm.placed_date} onChange={(v) => setComponentForm({ ...componentForm, placed_date: v })} />
                {componentForm.component_type === 'fixture' ? (
                  <p className="text-xs text-slate-400 mt-2">هزینه‌ی فیکسچر همیشه از محاسبه‌ی سهم جراح کنار گذاشته می‌شود (جداگانه محاسبه می‌شود).</p>
                ) : (
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" checked={componentForm.include_in_doctor_share} onChange={(e) => setComponentForm({ ...componentForm, include_in_doctor_share: e.target.checked })} className="w-4 h-4 rounded accent-primary-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">هزینه‌ی این قلم در محاسبه‌ی سهم جراح کسر شود</span>
                  </label>
                )}
              </>
            ),
          },
          {
            label: 'یادداشت',
            content: (
              <Textarea label="یادداشت" value={componentForm.notes} onChange={(v) => setComponentForm({ ...componentForm, notes: v })} placeholder="توضیحات اختیاری" rows={3} />
            ),
          },
        ]}
      />

      {ConfirmActionModal}
    </div>
  )
}
