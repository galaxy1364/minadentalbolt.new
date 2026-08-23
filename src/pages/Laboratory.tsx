// Laboratory.tsx - Persian RTL Dental Clinic Laboratory Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { FlaskConical, Plus, Search, Clock, CheckCircle2, AlertCircle, Edit2, Trash2, Phone, Filter, TrendingUp, Package, CalendarClock, ChevronLeft, RotateCcw } from 'lucide-react'
import { downloadICSReminder } from '../lib/icsReminder'
import { fetchLabOrders, createLabOrder, updateLabOrder, fetchLabs, createLab, updateLab, fetchPatients, fetchDoctors, fetchTreatments, updateTreatment } from '../lib/api'
import { toJalaliString, toJalaliStringPretty, formatCurrency, toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { useConfirmAction } from '../components/ConfirmAction'
import type { LabOrder, Laboratory, Patient, Doctor, Treatment } from '../types'
import { Wizard, Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, showToast } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { PalmerToothPicker } from '../components/PalmerToothPicker'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'
import { CurrencyInput } from '../components/CurrencyInput'

// ============================================================================
// Constants
// ============================================================================

// Basic foundation for a lab-order pipeline tracker — a defined
// sequence independent of the coarser `status` field. Not yet a full
// visual multi-column tracker (that's future-upgrade scope), just a
// compact progress bar + one-tap advance, so the underlying data
// model and workflow exist now and can be built on later.
const LAB_STAGES: { key: string; label: string }[] = [
  { key: 'scan_impression', label: 'قالب‌گیری/اسکن' },
  { key: 'sent_to_courier', label: 'ارسال به پیک' },
  { key: 'cad_cam_design', label: 'طراحی CAD/CAM' },
  { key: 'firing_layering', label: 'پخت و پرسلن‌گذاری' },
  { key: 'quality_control', label: 'کنترل کیفی' },
  { key: 'ready_delivery', label: 'آماده تحویل' },
]

const labOrderStatuses: { value: string; label: string; color: string }[] = [
  { value: 'ordered', label: 'سفارش داده شده', color: 'slate' },
  { value: 'in_progress', label: 'در حال انجام', color: 'warning' },
  { value: 'delivered', label: 'تحویل شده', color: 'success' },
  { value: 'cancelled', label: 'لغو شده', color: 'error' },
]

const workTypes: { value: string; label: string; category: 'fixed' | 'removable' }[] = [
  { value: 'crown', label: 'روکش', category: 'fixed' },
  { value: 'bridge', label: 'پل', category: 'fixed' },
  { value: 'post', label: 'پست', category: 'fixed' },
  { value: 'post_and_core', label: 'پست و کور', category: 'fixed' },
  { value: 'denture', label: 'دنچر کامل', category: 'removable' },
  { value: 'partial_denture', label: 'دنچر پارسیل', category: 'removable' },
  { value: 'overdenture', label: 'اووردنچر', category: 'removable' },
  { value: 'implant_crown', label: 'روکش ایمپلنت', category: 'fixed' },
  { value: 'implant_abutment', label: 'آباتمنت ایمپلنت', category: 'fixed' },
  { value: 'veneer', label: 'ونیر', category: 'fixed' },
  { value: 'inlay', label: 'اینله', category: 'fixed' },
  { value: 'onlay', label: 'اونله', category: 'fixed' },
  { value: 'night_guard', label: 'محافظ شب', category: 'removable' },
  { value: 'orthodontic_appliance', label: 'اپلایانس ارتودنسی', category: 'removable' },
  { value: 'flipper', label: 'فلیپر', category: 'removable' },
  { value: 'retainer', label: 'ریتینر', category: 'removable' },
  { value: 'other', label: 'سایر', category: 'fixed' },
]

const materials: { value: string; label: string }[] = [
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

// ============================================================================
// Main Component
// ============================================================================

export default function Laboratory() {
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  // Data
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [labs, setLabs] = useState<Laboratory[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  // View toggle: 'orders' or 'labs'
  const [view, setView] = useState<'orders' | 'labs'>('orders')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLab, setFilterLab] = useState('')
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Order modal
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderWizardStep, setOrderWizardStep] = useState(0)
  const [editingOrder, setEditingOrder] = useState<LabOrder | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  // Lab modal
  const [labModalOpen, setLabModalOpen] = useState(false)
  const [labWizardStep, setLabWizardStep] = useState(0)
  const [editingLab, setEditingLab] = useState<Laboratory | null>(null)
  const [savingLab, setSavingLab] = useState(false)
  const [labForm, setLabForm] = useState({
    name: '',
    type: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    // Which category of lab work this lab handles — used to auto-suggest
    // the right lab when staff picks a work type on a new order, so
    // (for clinics running separate fixed vs removable-prosthetics labs)
    // a denture never accidentally gets routed to the crown/bridge lab.
    default_for: '',
  })

  // Order form state
  const [orderForm, setOrderForm] = useState({
    lab_id: '',
    patient_id: '',
    doctor_id: '',
    work_type: 'crown', custom_work_type: '',
    tooth_number: '',
    shade: '',
    material: 'zirconia',
    deadline: '',
    cost: '',
    notes: '',
    status: 'ordered',
  })

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [orders, l, pats, docs, trts] = await Promise.all([
        fetchLabOrders(),
        fetchLabs(),
        fetchPatients(),
        fetchDoctors(),
        fetchTreatments(),
      ])
      setLabOrders(orders as unknown as LabOrder[])
      // Show every lab (active + deactivated) with an inline badge and
      // reactivate action, matching the same pattern used for staff —
      // consistent parity across every 'people/vendors you manage' list,
      // rather than hiding deactivated ones entirely behind Archive.
      setLabs(l)
      setPatients(pats)
      setDoctors(docs)
      setTreatments(trts)
    } catch (err) {
      console.error('Error loading lab data:', err)
      showToast('error', 'خطا در بارگذاری اطلاعات لابراتوار')
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

  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>()
    patients.forEach((p) => map.set(p.id, p))
    return map
  }, [patients])

  const labMap = useMemo(() => {
    const map = new Map<string, Laboratory>()
    labs.forEach((l) => map.set(l.id, l))
    return map
  }, [labs])

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>()
    doctors.forEach((d) => map.set(d.id, d))
    return map
  }, [doctors])

  const getPatientName = (patientId: string) => {
    const p = patientMap.get(patientId)
    return p ? `${p.first_name} ${p.last_name}` : 'نامشخص'
  }

  const getLabName = (labId: string) => {
    const l = labMap.get(labId)
    return l ? l.name : 'نامشخص'
  }

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return 'نامشخص'
    const d = doctorMap.get(doctorId)
    return d ? `دکتر ${d.name || d.specialty || 'پزشک'}` : 'نامشخص'
  }

  const isOverdue = (order: LabOrder) => {
    if (!order.deadline || order.status === 'delivered' || order.status === 'cancelled') return false
    const deadline = new Date(order.deadline)
    const now = new Date()
    return deadline < now
  }

  const getDaysLeft = (deadline: string | null): number | null => {
    if (!deadline) return null
    const d = new Date(deadline)
    const now = new Date()
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDeadlineColor = (order: LabOrder): string => {
    if (order.status === 'delivered' || order.status === 'cancelled') return 'slate'
    const daysLeft = getDaysLeft(order.deadline)
    if (daysLeft === null) return 'slate'
    if (daysLeft < 0) return 'error'
    if (daysLeft <= 3) return 'warning'
    return 'success'
  }

  const filteredOrders = useMemo(() => {
    const filtered = labOrders.filter((o) => {
      // Search
      if (searchQuery) {
        const patientName = getPatientName(o.patient_id).toLowerCase()
        const labName = getLabName(o.lab_id).toLowerCase()
        const q = searchQuery.toLowerCase()
        if (!patientName.includes(q) && !labName.includes(q)) return false
      }
      // Status filter
      if (filterStatus && o.status !== filterStatus) return false
      // Lab filter
      if (filterLab && o.lab_id !== filterLab) return false
      // Overdue filter
      if (filterOverdue && !isOverdue(o)) return false
      return true
    })
    // Priority order, not just newest-first: an order due tomorrow
    // shouldn't be buried under one just created but due next month.
    // 1) already overdue (most overdue first) 2) has a deadline, soonest
    // first 3) no deadline at all 4) delivered/cancelled sink to the
    // bottom regardless — that work is done, it's not what needs eyes.
    const priority = (o: LabOrder) => {
      if (o.status === 'delivered' || o.status === 'cancelled') return 3
      if (isOverdue(o)) return 0
      if (o.deadline) return 1
      return 2
    }
    return [...filtered].sort((a, b) => {
      const pa = priority(a), pb = priority(b)
      if (pa !== pb) return pa - pb
      if (pa === 0 || pa === 1) return (a.deadline || '').localeCompare(b.deadline || '')
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
  }, [labOrders, searchQuery, filterStatus, filterLab, filterOverdue, patientMap, labMap])

  const stats = useMemo(() => {
    const total = labOrders.length
    const inProgress = labOrders.filter((o) => o.status === 'ordered' || o.status === 'in_progress').length
    const overdue = labOrders.filter((o) => isOverdue(o)).length
    const totalCost = labOrders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + (o.cost ?? 0), 0)
    return { total, inProgress, overdue, totalCost }
  }, [labOrders])

  // ===========================================================================
  // Handlers
  // ===========================================================================

  const openCreateOrderModal = () => {
    h.tap()
    setEditingOrder(null)
    setOrderWizardStep(0)
    setOrderForm({
      lab_id: labs.length > 0 ? labs[0].id : '',
      patient_id: '',
      doctor_id: '',
      work_type: 'crown', custom_work_type: '',
      tooth_number: '',
      shade: '',
      material: 'zirconia',
      deadline: '',
      cost: '',
      notes: '',
      status: 'ordered',
    })
    setOrderModalOpen(true)
  }

  const openEditOrderModal = (order: LabOrder) => {
    h.tap()
    setEditingOrder(order)
    setOrderWizardStep(0)
    const isKnownWorkType = workTypes.some((w) => w.value === order.work_type)
    setOrderForm({
      lab_id: order.lab_id,
      patient_id: order.patient_id,
      doctor_id: order.doctor_id || '',
      work_type: isKnownWorkType ? (order.work_type || 'crown') : 'other',
      custom_work_type: isKnownWorkType ? '' : (order.work_type || ''),
      tooth_number: order.tooth_number || '',
      shade: order.shade || '',
      material: order.material || 'zirconia',
      deadline: order.deadline || '',
      cost: order.cost ? String(order.cost) : '',
      notes: order.notes || '',
      status: order.status,
    })
    setOrderModalOpen(true)
  }

  const handleSaveOrder = () => {
    if (!orderForm.lab_id) { showToast('error', 'انتخاب لابراتوار الزامی است'); return }
    if (!orderForm.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    const payload = {
      lab_id: orderForm.lab_id,
      patient_id: orderForm.patient_id,
      doctor_id: orderForm.doctor_id || null,
      work_type: orderForm.work_type === 'other' ? (orderForm.custom_work_type.trim() || 'سایر') : orderForm.work_type,
      tooth_number: orderForm.tooth_number || null,
      shade: orderForm.shade || null,
      material: orderForm.material || null,
      deadline: orderForm.deadline || null,
      cost: orderForm.cost ? Number(orderForm.cost) : null,
      notes: orderForm.notes || null,
      status: orderForm.status,
      encounter_id: null,
      sent_at: null,
      received_at: null,
    } as any
    const patient = patientMap.get(orderForm.patient_id)
    const lab = labMap.get(orderForm.lab_id)
    confirmAction({
      type: editingOrder ? 'edit' : 'create',
      title: editingOrder ? 'ویرایش سفارش' : 'سفارش لابراتوار جدید',
      fields: [
        { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '-', highlight: true },
        { label: 'لابراتوار', value: lab?.name || '-' },
        { label: 'نوع کار', value: workTypes.find((w) => w.value === orderForm.work_type)?.label || orderForm.work_type },
        { label: 'موعد', value: orderForm.deadline ? toJalaliString(orderForm.deadline) : '-' },
        { label: 'هزینه', value: orderForm.cost ? `${formatCurrency(Number(orderForm.cost))} ت` : '-' },
      ],
      confirmLabel: editingOrder ? 'ذخیره' : 'ثبت سفارش',
      onConfirm: async () => {
        setSavingOrder(true)
        try {
          if (editingOrder) { await updateLabOrder(editingOrder.id, payload); showToast('success', 'سفارش ویرایش شد') }
          else { await createLabOrder(payload); showToast('success', 'سفارش ثبت شد') }
          setOrderModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSavingOrder(false) }
      },
    })
  }

  const handleDeleteOrder = (order: LabOrder) => {
    h.warning()
    confirmAction({
      type: 'delete',
      title: 'لغو سفارش',
      warning: 'این عملیات قابل بازگشت نیست',
      fields: [
        { label: 'بیمار', value: getPatientName(order.patient_id), highlight: true },
        { label: 'لابراتوار', value: getLabName(order.lab_id) },
        { label: 'نوع کار', value: workTypes.find((w) => w.value === order.work_type)?.label || '-' },
      ],
      confirmLabel: 'تایید لغو',
      onConfirm: async () => {
        try { await updateLabOrder(order.id, { status: 'cancelled' }); showToast('success', 'سفارش لغو شد'); await loadData() }
        catch { showToast('error', 'خطا در لغو') }
      },
    })
  }

  const quickStatusChange = (order: LabOrder, newStatus: string) => {
    h.select()
    const meta = labOrderStatuses.find((s) => s.value === newStatus) || labOrderStatuses[0]
    // When a lab order is delivered, find any treatment in the same
    // encounter referencing this same lab that's still open — a
    // delivered crown/bridge with the parent treatment still stuck on
    // 'planned' is exactly how a case looks unfinished forever, and
    // would even wrongly trigger the 'unfinished treatment' reminder.
    // Matching is scoped to (encounter_id + lab_id) — a real link, not a
    // guess — and stays a one-tap confirm rather than silently
    // auto-completing something that might not actually be done yet.
    const linkedTreatment = newStatus === 'delivered' && order.encounter_id
      ? treatments.find((t) => t.encounter_id === order.encounter_id && t.lab_id === order.lab_id && t.status !== 'completed')
      : null

    confirmAction({
      type: 'status',
      title: 'تغییر وضعیت سفارش',
      fields: [
        { label: 'بیمار', value: getPatientName(order.patient_id), highlight: true },
        { label: 'وضعیت فعلی', value: labOrderStatuses.find((s) => s.value === order.status)?.label || order.status },
        { label: 'وضعیت جدید', value: meta.label, highlight: true },
        ...(linkedTreatment ? [{ label: 'درمان مرتبط', value: `${linkedTreatment.procedure_name || 'درمان'} — همزمان تکمیل می‌شود` }] : []),
      ],
      confirmLabel: 'تایید',
      onConfirm: async () => {
        const updates: any = { status: newStatus }
        if (newStatus === 'delivered') updates.received_at = new Date().toISOString()
        try {
          await updateLabOrder(order.id, updates)
          if (linkedTreatment) await updateTreatment(linkedTreatment.id, { status: 'completed' })
          showToast('success', linkedTreatment ? 'وضعیت تغییر کرد و درمان مرتبط تکمیل شد' : 'وضعیت تغییر کرد')
          await loadData()
        }
        catch { showToast('error', 'خطا') }
      },
    })
  }

  // Advances a lab order to the next pipeline stage (basic foundation
  // for the fuller step-tracker) — no confirm dialog needed since this
  // is a low-stakes, easily-reversible progress note, not a status
  // change with real consequences.
  const advanceStage = async (order: LabOrder) => {
    const idx = LAB_STAGES.findIndex((s) => s.key === order.stage)
    if (idx === -1 || idx >= LAB_STAGES.length - 1) return
    h.select()
    try {
      const updates: Record<string, unknown> = { stage: LAB_STAGES[idx + 1].key }
      // Real 'sent to lab' timestamp — set once, the first time the case
      // leaves the initial scan/impression stage (i.e. it's actually
      // gone out), never overwritten on later stage advances.
      if (idx === 0 && !order.sent_at) updates.sent_at = new Date().toISOString()
      // Keep the coarse `status` field (which Dashboard's active/overdue
      // count reads) from silently drifting behind the pipeline stage.
      // Advancing past the first stage means work has genuinely started,
      // so a still-'ordered' order should read as 'in_progress' — without
      // this, Dashboard could show an order stuck at 'سفارش داده‌شده'
      // even after it's most of the way through production.
      // Deliberately NOT auto-setting 'delivered' at the final stage:
      // that status represents the physical handoff to the clinic/patient,
      // a real-world event distinct from the lab finishing its work, and
      // should stay a manual action.
      if (order.status === 'ordered') updates.status = 'in_progress'
      await updateLabOrder(order.id, updates as any)
      await loadData()
    } catch { showToast('error', 'خطا در به‌روزرسانی مرحله') }
  }

  const openEditLab = (lab: Laboratory) => {
    h.tap()
    setEditingLab(lab)
    setLabWizardStep(0)
    setLabForm({ name: lab.name, type: lab.type || '', contact_person: lab.contact_person || '', phone: lab.phone || '', email: lab.email || '', address: lab.address || '', notes: lab.notes || '', default_for: (lab as any).default_for || '' })
    setLabModalOpen(true)
  }

  const openCreateLab = () => {
    h.tap()
    setEditingLab(null)
    setLabWizardStep(0)
    setLabForm({ name: '', type: '', contact_person: '', phone: '', email: '', address: '', notes: '', default_for: '' })
    setLabModalOpen(true)
  }


  const handleSaveLab = () => {
    if (!labForm.name.trim()) { showToast('error', 'نام لابراتوار الزامی است'); return }
    confirmAction({
      type: editingLab ? 'edit' : 'create',
      title: editingLab ? 'ویرایش لابراتوار' : 'لابراتوار جدید',
      fields: [
        { label: 'نام', value: labForm.name.trim(), highlight: true },
        { label: 'نوع', value: labForm.type || '-' },
        { label: 'تلفن', value: labForm.phone || '-' },
      ],
      confirmLabel: 'ثبت',
      onConfirm: async () => {
        setSavingLab(true)
        try {
          if (editingLab) {
            await updateLab(editingLab.id, { name: labForm.name.trim(), type: labForm.type || null, contact_person: labForm.contact_person || null, phone: labForm.phone || null, email: labForm.email || null, address: labForm.address || null, notes: labForm.notes || null, default_for: labForm.default_for || null } as any)
            showToast('success', 'لابراتوار ویرایش شد')
          } else {
            await createLab({
              name: labForm.name.trim(), type: labForm.type || null, contact_person: labForm.contact_person || null,
              phone: labForm.phone || null, email: labForm.email || null, address: labForm.address || null,
              notes: labForm.notes || null, is_active: true, default_for: labForm.default_for || null,
            } as any)
            showToast('success', 'لابراتوار ثبت شد')
          }
          setLabModalOpen(false)
          setLabForm({ name: '', type: '', contact_person: '', phone: '', email: '', address: '', notes: '', default_for: '' })
          await loadData()
        } catch { showToast('error', 'خطا در ثبت') }
        finally { setSavingLab(false) }
      },
    })
  }

  // ===========================================================================
  // Render: Stats
  // ===========================================================================

  const renderStats = () => (
    <ReorderableStatGrid
      storageKey="laboratory"
      items={[
        { key: 'total', node: <ModuleStatCard moduleKey="laboratory" icon={<Package size={20} />} label="کل سفارش‌ها" value={toPersianDigits(stats.total)} /> },
        { key: 'inprogress', node: <ModuleStatCard moduleKey="laboratory" icon={<Clock size={20} />} label="در حال انجام" value={toPersianDigits(stats.inProgress)} /> },
        { key: 'overdue', node: <ModuleStatCard moduleKey="laboratory" icon={<AlertCircle size={20} />} label="علی‌رغم موعد" value={toPersianDigits(stats.overdue)} /> },
        { key: 'cost', node: <ModuleStatCard moduleKey="laboratory" icon={<TrendingUp size={20} />} label="کل هزینه" value={`${formatCurrency(stats.totalCost)} ت`} /> },
      ]}
    />
  )

  // ===========================================================================
  // Render: Order Card
  // ===========================================================================

  const renderOrderCard = (order: LabOrder) => {
    const statusMeta = labOrderStatuses.find((s) => s.value === order.status) || labOrderStatuses[0]
    const workTypeMeta = workTypes.find((w) => w.value === order.work_type)
    const materialMeta = materials.find((m) => m.value === order.material)
    const daysLeft = getDaysLeft(order.deadline)
    const deadlineColor = getDeadlineColor(order)
    const overdue = isOverdue(order)

    return (
      <Card key={order.id} className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-${statusMeta.color}-50 text-${statusMeta.color}-600 flex items-center justify-center flex-shrink-0`}>
              <FlaskConical size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-800 truncate">
                {workTypeMeta?.label || 'سفارش'}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {getPatientName(order.patient_id)} - {getLabName(order.lab_id)}
              </p>
            </div>
          </div>
          <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
          {order.tooth_number && (
            <div className="flex items-center gap-1">
              <span className="text-slate-400">دندان:</span>
              <span className="font-medium">{toPersianDigits(order.tooth_number)}</span>
            </div>
          )}
          {order.shade && (
            <div className="flex items-center gap-1">
              <span className="text-slate-400">رنگ:</span>
              <span className="font-medium">{order.shade}</span>
            </div>
          )}
          {materialMeta && (
            <div className="flex items-center gap-1">
              <span className="text-slate-400">جنس:</span>
              <span className="font-medium">{materialMeta.label}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">پزشک:</span>
            <span className="font-medium">{getDoctorName(order.doctor_id)}</span>
          </div>
        </div>

        {/* Pipeline stage progress — basic foundation, one tap to
            advance; only shown for orders still actively in the shop */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1.5">
              {LAB_STAGES.map((s, i) => {
                const currentIdx = LAB_STAGES.findIndex((x) => x.key === order.stage)
                return <div key={s.key} className={`flex-1 h-1.5 rounded-full ${i <= currentIdx ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-600'}`} />
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">مرحله: {LAB_STAGES.find((s) => s.key === order.stage)?.label || LAB_STAGES[0].label}</span>
              {order.stage !== 'ready_delivery' && (
                <button onClick={() => advanceStage(order)} className="text-[11px] text-primary-600 font-bold flex items-center gap-0.5">
                  گام بعدی <ChevronLeft size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Deadline */}
        {order.deadline && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${
            deadlineColor === 'error' ? 'bg-error-50 text-error-700' :
            deadlineColor === 'warning' ? 'bg-warning-50 text-warning-700' :
            'bg-success-50 text-success-700'
          }`}>
            <Clock size={14} />
            <span className="text-xs font-medium">
              {overdue ? 'علی‌رغم موعد' : `موعد تحویل: ${toJalaliStringPretty(order.deadline)}`}
            </span>
            {daysLeft !== null && !overdue && (
              <span className="text-xs mr-auto">
                {toPersianDigits(Math.abs(daysLeft))} روز مانده
              </span>
            )}
            {overdue && daysLeft !== null && (
              <span className="text-xs mr-auto">
                {toPersianDigits(Math.abs(daysLeft))} روز تاخیر
              </span>
            )}
            <button
              onClick={() => downloadICSReminder({
                title: `موعد تحویل لابراتوار — ${getPatientName(order.patient_id)}`,
                description: `${workTypeMeta?.label || order.work_type || 'کار لابراتوار'} — ${getLabName(order.lab_id)}`,
                dueDate: order.deadline!,
                filename: `lab-reminder-${order.id}.ics`,
              })}
              aria-label="افزودن یادآوری به تقویم گوشی"
              title="افزودن یادآوری به تقویم گوشی"
              className="p-1 rounded-lg hover:bg-black/5"
            >
              <CalendarClock size={13} />
            </button>
          </div>
        )}

        {/* Real sent/received dates — the actual pipeline history, not
            just the deadline target. */}
        {(order.sent_at || order.received_at) && (
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
            {order.sent_at && <span>ارسال: {toJalaliStringPretty(order.sent_at.slice(0, 10))}</span>}
            {order.received_at && <span className="text-success-600 font-medium">دریافت: {toJalaliStringPretty(order.received_at.slice(0, 10))}</span>}
          </div>
        )}

        {/* Cost & Date */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{toJalaliStringPretty(order.created_at)}</span>
            {order.cost != null && (
              <span className="font-bold text-slate-700">{formatCurrency(order.cost)} ت</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Quick status change */}
            {order.status === 'ordered' && (
              <Button size="sm" variant="secondary" onClick={() => quickStatusChange(order, 'in_progress')}>
                شروع کار
              </Button>
            )}
            {order.status === 'in_progress' && (
              <Button size="sm" variant="success" onClick={() => quickStatusChange(order, 'delivered')}>
                <CheckCircle2 size={14} /> تحویل
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => openEditOrderModal(order)}>
              <Edit2 size={14} />
            </Button>
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order)}>
                <Trash2 size={14} className="text-error-500" />
              </Button>
            )}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">{order.notes}</p>
        )}
      </Card>
    )
  }

  // ===========================================================================
  // Render: Orders View
  // ===========================================================================

  const renderOrdersView = () => (
    <div className="space-y-3">
      {/* Search & Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجوی بیمار یا لابراتوار..." className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <Button variant="secondary" size="md" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={16} /> فیلتر
        </Button>
        <Button onClick={openCreateOrderModal}>
          <Plus size={16} /> سفارش جدید
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select label="وضعیت" value={filterStatus} onChange={setFilterStatus} options={labOrderStatuses.map((s) => ({ value: s.value, label: s.label }))} placeholder="همه وضعیت‌ها" />
            <Select label="لابراتوار" value={filterLab} onChange={setFilterLab} options={labs.map((l) => ({ value: l.id, label: l.name }))} placeholder="همه لابراتوارها" />
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer pb-2">
                <input type="checkbox" checked={filterOverdue} onChange={(e) => setFilterOverdue(e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
                فقط سفارش‌های علی‌رغم موعد
              </label>
            </div>
          </div>
          {(filterStatus || filterLab || filterOverdue) && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(''); setFilterLab(''); setFilterOverdue(false) }}>
                پاک کردن فیلترها
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<FlaskConical size={32} />} title="سفارشی یافت نشد" description={searchQuery || filterStatus || filterLab || filterOverdue ? "فیلترها را تغییر دهید" : "برای ثبت سفارش جدید کلیک کنید"} action={!searchQuery && !filterStatus && !filterLab && !filterOverdue ? <Button size="sm" onClick={openCreateOrderModal}><Plus size={16} /> سفارش جدید</Button> : undefined} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredOrders.map(renderOrderCard)}
        </div>
      )}
    </div>
  )

  // ===========================================================================
  // Render: Labs View
  // ===========================================================================

  const renderLabsView = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">لابراتوارها</h3>
        <Button onClick={openCreateLab}>
          <Plus size={16} /> لابراتوار جدید
        </Button>
      </div>

      {labs.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<FlaskConical size={32} />} title="لابراتواری ثبت نشده" description="برای افزودن لابراتوار جدید کلیک کنید" action={<Button size="sm" onClick={openCreateLab}><Plus size={16} /> لابراتوار جدید</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {labs.map((lab) => {
            const labOrdersCount = labOrders.filter((o) => o.lab_id === lab.id).length
            const activeOrders = labOrders.filter((o) => o.lab_id === lab.id && (o.status === 'ordered' || o.status === 'in_progress')).length
            return (
              <Card key={lab.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white flex-shrink-0">
                    <FlaskConical size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{lab.name}</h4>
                    {lab.type && <p className="text-xs text-slate-500">{lab.type}</p>}
                  </div>
                  {!lab.is_active && <Badge color="error">غیرفعال</Badge>}
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 mb-3">
                  {lab.contact_person && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-slate-400">مسئول:</span>
                      <span>{lab.contact_person}</span>
                    </div>
                  )}
                  {lab.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={12} className="text-slate-400" />
                      <span dir="ltr">{toPersianDigits(lab.phone)}</span>
                    </div>
                  )}
                  {lab.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-slate-400">ایمیل:</span>
                      <span dir="ltr" className="truncate">{lab.email}</span>
                    </div>
                  )}
                  {lab.address && (
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="text-slate-400">آدرس:</span>
                      <span className="line-clamp-2">{lab.address}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <div className="flex-1 p-2 rounded-lg bg-slate-50 text-center">
                    <p className="text-lg font-bold text-slate-700">{toPersianDigits(labOrdersCount)}</p>
                    <p className="text-[10px] text-slate-400">کل سفارش‌ها</p>
                  </div>
                  <div className="flex-1 p-2 rounded-lg bg-warning-50 text-center">
                    <p className="text-lg font-bold text-warning-700">{toPersianDigits(activeOrders)}</p>
                    <p className="text-[10px] text-slate-400">در حال انجام</p>
                  </div>
                </div>

                {lab.notes && <p className="text-xs text-slate-400 mt-2">{lab.notes}</p>}

                {/* Actions — one toggle handles both directions (activate/
                    deactivate); a separate 'حذف' button here would just be
                    a second path to the exact same action, the same
                    duplication pattern found earlier in Treatments/Billing. */}
                <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
                  <button onClick={() => openEditLab(lab)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Edit2 size={12} /> ویرایش</button>
                  <button
                    onClick={async () => { try { await updateLab(lab.id, { is_active: !lab.is_active } as any); showToast('success', lab.is_active ? 'لابراتوار غیرفعال شد' : 'لابراتوار فعال شد'); await loadData() } catch { showToast('error', 'خطا در تغییر وضعیت') } }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition-colors ${lab.is_active ? 'text-warning-600 hover:bg-warning-50' : 'text-success-600 hover:bg-success-50'}`}
                  >
                    {lab.is_active ? <><Trash2 size={12} /> غیرفعال</> : <><RotateCcw size={12} /> فعال‌سازی</>}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  // ===========================================================================
  // Render: Order Modal
  // ===========================================================================

  const renderOrderModal = () => {
    const patientOptions = patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}${p.file_number ? ` - ${p.file_number}` : ''}` }))
    // Only active labs are offered for a NEW order — an inactive lab
    // shouldn't receive new work, though its past orders stay visible.
    const labOptions = labs.filter((l) => l.is_active).map((l) => ({
      value: l.id,
      label: (l as any).default_for === 'fixed' ? `${l.name} — ثابت` : (l as any).default_for === 'removable' ? `${l.name} — متحرک` : l.name,
    }))
    const doctorOptions = doctors.map((d) => ({ value: d.id, label: `دکتر ${d.name || d.specialty || 'پزشک'}` }))
    const selectedPatient = patientMap.get(orderForm.patient_id)
    const selectedLab = labMap.get(orderForm.lab_id)

    return (
      <Wizard
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title={editingOrder ? 'ویرایش سفارش' : 'سفارش لابراتوار جدید'}
        step={orderWizardStep}
        onStepChange={setOrderWizardStep}
        onFinish={handleSaveOrder}
        finishLabel={editingOrder ? 'ذخیره تغییرات' : 'ثبت سفارش'}
        saving={savingOrder}
        steps={[
          {
            label: 'بیمار و لابراتوار',
            validate: () => (!orderForm.lab_id ? 'انتخاب لابراتوار الزامی است' : !orderForm.patient_id ? 'انتخاب بیمار الزامی است' : null),
            content: (
              <>
                {labs.filter((l) => l.is_active).length === 0 ? (
                  <div className="p-4 rounded-2xl bg-warning-50 border border-warning-200 text-center">
                    <p className="text-sm font-bold text-warning-700 mb-1">هنوز لابراتواری ثبت نشده است</p>
                    <p className="text-xs text-warning-600 mb-3">برای ثبت سفارش، اول باید حداقل یک لابراتوار اضافه کنید.</p>
                    <Button variant="secondary" size="sm" onClick={() => { setOrderModalOpen(false); setView('labs') }}>رفتن به لیست لابراتوارها</Button>
                  </div>
                ) : (
                  <Select label="لابراتوار" value={orderForm.lab_id} onChange={(v) => setOrderForm((p) => ({ ...p, lab_id: v }))} options={labOptions} placeholder="انتخاب لابراتوار" />
                )}
                <Select label="بیمار" value={orderForm.patient_id} onChange={(v) => setOrderForm((p) => ({ ...p, patient_id: v }))} options={patientOptions} placeholder="انتخاب بیمار" />
                <Select label="پزشک" value={orderForm.doctor_id} onChange={(v) => setOrderForm((p) => ({ ...p, doctor_id: v }))} options={doctorOptions} placeholder="انتخاب پزشک" />
              </>
            ),
          },
          {
            label: 'نوع کار',
            content: (
              <>
                <Select label="نوع کار" value={orderForm.work_type} onChange={(v) => setOrderForm((p) => ({ ...p, work_type: v }))} options={workTypes} />
                {orderForm.work_type === 'other' && (
                  <Input label="نام نوع کار (دستی)" value={orderForm.custom_work_type} onChange={(v) => setOrderForm((p) => ({ ...p, custom_work_type: v }))} placeholder="مثلاً: کاری که در لیست نیست" />
                )}
                {(() => {
                  // Smart lab-mismatch check: for clinics running separate
                  // fixed vs removable-prosthetics labs, warn immediately
                  // if the selected work type doesn't match the already-
                  // chosen lab's declared specialty (default_for), and
                  // offer the correct lab in one tap — catching a mistake
                  // right when it happens instead of after the impression
                  // is already sent to the wrong place.
                  const wt = workTypes.find((w) => w.value === orderForm.work_type)
                  if (!wt || !selectedLab) return null
                  const labSpecialty = (selectedLab as any).default_for as 'fixed' | 'removable' | null
                  if (!labSpecialty || labSpecialty === wt.category) return null
                  const betterLab = labs.find((l) => (l as any).default_for === wt.category)
                  return (
                    <div className="p-3 rounded-xl bg-warning-50 border border-warning-200 text-warning-700 text-xs flex items-center justify-between gap-2">
                      <span>«{wt.label}» جزو کارهای {wt.category === 'fixed' ? 'ثابت' : 'متحرک'} است، ولی لابراتوار انتخابی برای {labSpecialty === 'fixed' ? 'ثابت' : 'متحرک'} ثبت شده.</span>
                      {betterLab && (
                        <button onClick={() => setOrderForm((p) => ({ ...p, lab_id: betterLab.id }))} className="shrink-0 font-bold underline">تغییر به {betterLab.name}</button>
                      )}
                    </div>
                  )
                })()}
                <div className="grid grid-cols-2 gap-3">
                  <PalmerToothPicker value={orderForm.tooth_number} onChange={(v) => setOrderForm((p) => ({ ...p, tooth_number: v }))} allowPrimary={false} />
                  <Input label="رنگ" value={orderForm.shade} onChange={(v) => setOrderForm((p) => ({ ...p, shade: v }))} placeholder="مثال: A2" dir="ltr" />
                </div>
                <Select label="جنس" value={orderForm.material} onChange={(v) => setOrderForm((p) => ({ ...p, material: v }))} options={materials} />
              </>
            ),
          },
          {
            label: 'موعد و هزینه',
            content: (
              <>
                <PersianDateInput label="موعد تحویل" value={orderForm.deadline} onChange={(v) => setOrderForm((p) => ({ ...p, deadline: v }))} />
                <CurrencyInput label="هزینه (تومان)" value={orderForm.cost} onChange={(v) => setOrderForm((p) => ({ ...p, cost: v }))} />
                <Select label="وضعیت" value={orderForm.status} onChange={(v) => setOrderForm((p) => ({ ...p, status: v }))} options={labOrderStatuses.map((s) => ({ value: s.value, label: s.label }))} />
              </>
            ),
          },
          {
            label: 'یادداشت',
            content: (
              <>
                <div className="grid grid-cols-2 gap-2 mb-1">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 mb-0.5">بیمار</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : '-'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 mb-0.5">لابراتوار</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{selectedLab?.name || '-'}</p>
                  </div>
                </div>
                <Textarea label="یادداشت" value={orderForm.notes} onChange={(v) => setOrderForm((p) => ({ ...p, notes: v }))} placeholder="یادداشت‌های سفارش..." />
              </>
            ),
          },
        ]}
      />
    )
  }

  // ===========================================================================
  // Render: Lab Modal
  // ===========================================================================

  const renderLabModal = () => (
    <Wizard
      open={labModalOpen}
      onClose={() => setLabModalOpen(false)}
      title={editingLab ? 'ویرایش لابراتوار' : 'لابراتوار جدید'}
      step={labWizardStep}
      onStepChange={setLabWizardStep}
      onFinish={handleSaveLab}
      finishLabel={editingLab ? 'ذخیره تغییرات' : 'ثبت لابراتوار'}
      saving={savingLab}
      steps={[
        {
          label: 'مشخصات',
          validate: () => (!labForm.name.trim() ? 'نام لابراتوار الزامی است' : null),
          content: (
            <>
              <Input label="نام لابراتوار" value={labForm.name} onChange={(v) => setLabForm((p) => ({ ...p, name: v }))} placeholder="نام لابراتوار" />
              <Input label="نوع" value={labForm.type} onChange={(v) => setLabForm((p) => ({ ...p, type: v }))} placeholder="مثال: دیجیتال، سنتی" />
              <Select
                label="تخصص لابراتوار"
                value={labForm.default_for}
                onChange={(v) => setLabForm((p) => ({ ...p, default_for: v }))}
                options={[
                  { value: '', label: 'مشخص نیست / هر دو' },
                  { value: 'fixed', label: 'پروتز ثابت (روکش، پل، ونیر...)' },
                  { value: 'removable', label: 'پروتز متحرک (دنچر، اووردنچر...)' },
                ]}
              />
              <Input label="مسئول" value={labForm.contact_person} onChange={(v) => setLabForm((p) => ({ ...p, contact_person: v }))} placeholder="نام مسئول" />
            </>
          ),
        },
        {
          label: 'تماس',
          content: (
            <>
              <Input label="تلفن" value={labForm.phone} onChange={(v) => setLabForm((p) => ({ ...p, phone: v }))} placeholder="شماره تلفن" dir="ltr" />
              <Input label="ایمیل" type="email" value={labForm.email} onChange={(v) => setLabForm((p) => ({ ...p, email: v }))} placeholder="email@example.com" dir="ltr" />
              <Textarea label="آدرس" value={labForm.address} onChange={(v) => setLabForm((p) => ({ ...p, address: v }))} rows={2} />
            </>
          ),
        },
        {
          label: 'یادداشت',
          content: (
            <Textarea label="یادداشت" value={labForm.notes} onChange={(v) => setLabForm((p) => ({ ...p, notes: v }))} />
          ),
        },
      ]}
    />
  )

  // ===========================================================================
  // Render: Delete Confirm
  // ===========================================================================

  // ===========================================================================
  // Main Render
  // ===========================================================================

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size={32} /></div>
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        moduleKey="laboratory"
        title="لابراتوار"
        subtitle={view === 'orders' ? 'سفارش‌های لابراتوار' : 'لیست لابراتوارها'}
        action={
          <div className="flex gap-1 p-1 bg-white/20 rounded-xl backdrop-blur-sm">
            <button
              onClick={() => setView('orders')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all-smooth ${view === 'orders' ? 'bg-white text-cyan-700 shadow' : 'text-white/90'}`}
            >
              سفارش‌ها
            </button>
            <button
              onClick={() => setView('labs')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all-smooth ${view === 'labs' ? 'bg-white text-cyan-700 shadow' : 'text-white/90'}`}
            >
              لابراتوارها
            </button>
          </div>
        }
      />

      {/* Stats */}
      {renderStats()}
      {view === 'orders' && renderOrdersView()}
      {view === 'labs' && renderLabsView()}

      {/* Modals */}
      {renderOrderModal()}
      {renderLabModal()}
      {ConfirmActionModal}
    </div>
  )
}
