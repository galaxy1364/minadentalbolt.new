// WaitingList.tsx - Persian RTL Dental Clinic Waiting List Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Search, Plus, Phone, Bell, CheckCircle2, XCircle, Calendar, Smile, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchWaitingList, createWaitingEntry, updateWaitingEntry, cancelWaitingEntry, fetchPatients, fetchDoctors, createAppointment, fetchUnits, checkConflict } from '../lib/api'
import { toJalaliString, toJalaliStringPretty, formatTime, formatNumber, toPersianDigits, toJalaliShort} from '../lib/persianDate'
import { h } from '../lib/haptics'
import { useConfirmAction } from '../components/ConfirmAction'
import { WaitingListEntry, WaitingListEntryWithRelations, Patient, Doctor, Unit } from '../types'
import { Wizard, Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, showToast } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'

// ============================================================================
// Constants
// ============================================================================

const waitStatuses: { value: string; label: string; color: string }[] = [
  { value: 'waiting', label: 'در انتظار', color: 'warning' },
  { value: 'notified', label: 'اطلاع داده شد', color: 'primary' },
  { value: 'scheduled', label: 'زمان‌بندی شد', color: 'success' },
  { value: 'cancelled', label: 'لغو شد', color: 'error' },
]

const priorityLabels: Record<number, string> = {
  1: 'کم',
  2: 'متوسط',
  3: 'بالا',
  4: 'فوری',
}

const priorityColors: Record<number, string> = {
  1: 'success',
  2: 'primary',
  3: 'warning',
  4: 'error',
}

const CHART_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444']

function getStatusMeta(status: string) {
  return waitStatuses.find((s) => s.value === status) || waitStatuses[0]
}

// ============================================================================
// Main Component
// ============================================================================

export default function WaitingList() {
  const navigate = useNavigate()
  const { confirmAction, ConfirmActionModal } = useConfirmAction()

  const [entries, setEntries] = useState<WaitingListEntryWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [wlWizardStep, setWlWizardStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editingEntry, setEditingEntry] = useState<WaitingListEntryWithRelations | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    preferred_date: '',
    preferred_time: '',
    reason: '',
    priority: '2',
    notes: '',
  })

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [wl, pats, docs, uts] = await Promise.all([
        fetchWaitingList(),
        fetchPatients(),
        fetchDoctors(),
        fetchUnits(),
      ])
      setEntries(wl)
      setPatients(pats)
      setDoctors(docs)
      setUnits(uts)
    } catch (err) {
      console.error('Error loading waiting list:', err)
      showToast('error', 'خطا در بارگذاری لیست انتظار')
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

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (searchQuery) {
        const name = e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : ''
        const reason = e.reason || ''
        const q = searchQuery.toLowerCase()
        if (!name.toLowerCase().includes(q) && !reason.toLowerCase().includes(q)) return false
      }
      if (filterStatus && e.status !== filterStatus) return false
      return true
    })
  }, [entries, searchQuery, filterStatus])

  const stats = useMemo(() => {
    const total = entries.length
    const waiting = entries.filter((e) => e.status === 'waiting').length
    const notified = entries.filter((e) => e.status === 'notified').length
    const scheduled = entries.filter((e) => e.status === 'scheduled').length
    return { total, waiting, notified, scheduled }
  }, [entries])

  const priorityChartData = useMemo(() => {
    const counts: Record<string, number> = { 'کم': 0, 'متوسط': 0, 'بالا': 0, 'فوری': 0 }
    entries.forEach((e) => {
      const p = e.priority ?? 2
      const label = priorityLabels[p] || 'متوسط'
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [entries])

  const patientOptions = useMemo(() => {
    return patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))
  }, [patients])

  const doctorOptions = useMemo(() => {
    return doctors.filter((d) => d.is_active).map((d) => ({ value: d.id, label: d.name || d.specialty || 'پزشک' }))
  }, [doctors])

  const priorityOptions = [
    { value: '1', label: 'کم' },
    { value: '2', label: 'متوسط' },
    { value: '3', label: 'بالا' },
    { value: '4', label: 'فوری' },
  ]

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const patientName = (e: WaitingListEntryWithRelations) => {
    return e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : 'نامشخص'
  }

  const patientPhone = (e: WaitingListEntryWithRelations) => {
    return e.patient?.phone || null
  }

  const doctorName = (e: WaitingListEntryWithRelations) => {
    if (!e.doctor) return '-'
    return e.doctor.name || e.doctor.specialty || 'پزشک'
  }

  // ===========================================================================
  // Status Quick Change
  // ===========================================================================

  const handleStatusChange = (e: WaitingListEntryWithRelations, newStatus: string) => {
    h.select()
    const meta = waitStatuses.find((s) => s.value === newStatus) || waitStatuses[0]
    confirmAction({
      type: 'status',
      title: 'تغییر وضعیت',
      fields: [
        { label: 'بیمار', value: patientName(e), highlight: true },
        { label: 'وضعیت فعلی', value: getStatusMeta(e.status).label },
        { label: 'وضعیت جدید', value: meta.label, highlight: true },
      ],
      confirmLabel: 'تایید',
      onConfirm: async () => {
        const updates: Partial<WaitingListEntry> = { status: newStatus }
        if (newStatus === 'notified') updates.notified_at = new Date().toISOString()
        try { await updateWaitingEntry(e.id, updates as any); showToast('success', 'وضعیت به‌روزرسانی شد'); await loadData() }
        catch { showToast('error', 'خطا در به‌روزرسانی وضعیت') }
      },
    })
  }

  const handleDelete = (e: WaitingListEntryWithRelations) => {
    h.warning()
    confirmAction({
      type: 'status',
      title: 'لغو از لیست انتظار',
      warning: 'این عملیات قابل بازگشت نیست',
      fields: [
        { label: 'بیمار', value: patientName(e), highlight: true },
        { label: 'دلیل', value: e.reason || '-' },
      ],
      confirmLabel: 'تایید لغو',
      onConfirm: async () => {
        try { await cancelWaitingEntry(e.id); showToast('success', 'لغو شد'); await loadData() }
        catch { showToast('error', 'خطا در لغو') }
      },
    })
  }

  // ===========================================================================
  // Convert to Appointment
  // ===========================================================================
  const handleConvertToAppointment = (e: WaitingListEntryWithRelations) => {
    h.tap()
    confirmAction({
      type: 'create',
      title: 'تبدیل به نوبت',
      fields: [
        { label: 'بیمار', value: patientName(e), highlight: true },
        { label: 'تاریخ', value: e.preferred_date || 'امروز', highlight: true },
        { label: 'ساعت', value: e.preferred_time || '—' },
      ],
      confirmLabel: 'ایجاد نوبت',
      onConfirm: async () => {
        try {
          const today = new Date().toISOString().split('T')[0]
          const startDate = e.preferred_date || today
          const startTime = e.preferred_time || '09:00'
          const [sh, sm] = startTime.split(':').map(Number)
          const endTime = `${String(sh + 1).padStart(2, '0')}:${String(sm).padStart(2, '0')}`
          const unitId = units[0]?.id || null

          if (e.doctor_id) {
            const conflict = await checkConflict(e.doctor_id, startDate, startTime, endTime, undefined, unitId)
            if (conflict === 'doctor') { h.error(); showToast('error', 'این پزشک در این بازه‌ی زمانی نوبت دیگری دارد — تاریخ/ساعت را تغییر دهید'); return }
            if (conflict === 'unit') { h.error(); showToast('error', 'یونیت/صندلی در این بازه‌ی زمانی رزرو شده است'); return }
          }

          await createAppointment({
            patient_id: e.patient_id,
            doctor_id: e.doctor_id || null,
            unit_id: unitId,
            date: startDate,
            start_time: startTime,
            end_time: endTime,
            type: 'checkup',
            status: 'scheduled',
            notes: e.reason || '',
          } as any)
          await updateWaitingEntry(e.id, { status: 'scheduled' } as any)
          showToast('success', 'نوبت ایجاد شد و از لیست انتظار خارج شد')
          await loadData()
        } catch { showToast('error', 'خطا در ایجاد نوبت') }
      },
    })
  }

  // ===========================================================================
  // Modal Handlers
  // ===========================================================================

  const openCreateModal = () => {
    h.tap()
    setEditingEntry(null)
    setWlWizardStep(0)
    setFormData({ patient_id: '', doctor_id: '', preferred_date: '', preferred_time: '', reason: '', priority: '2', notes: '' })
    setModalOpen(true)
  }

  const openEditModal = (e: WaitingListEntryWithRelations) => {
    h.tap()
    setEditingEntry(e)
    setFormData({
      patient_id: e.patient_id, doctor_id: e.doctor_id || '',
      preferred_date: e.preferred_date || '', preferred_time: e.preferred_time || '',
      reason: e.reason || '', priority: String(e.priority ?? 2), notes: e.notes || '',
    })
    setWlWizardStep(0)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!formData.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    const patient = patients.find((p) => p.id === formData.patient_id)
    const payload = {
      patient_id: formData.patient_id,
      doctor_id: formData.doctor_id || null,
      preferred_date: formData.preferred_date || null,
      preferred_time: formData.preferred_time || null,
      reason: formData.reason || null,
      priority: Number(formData.priority),
      notes: formData.notes || null,
    }
    confirmAction({
      type: editingEntry ? 'edit' : 'create',
      title: editingEntry ? 'ویرایش لیست انتظار' : 'افزودن به لیست انتظار',
      fields: [
        { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '-', highlight: true },
        { label: 'اولویت', value: priorityLabels[Number(formData.priority)] || 'متوسط' },
        { label: 'دلیل', value: formData.reason || '-' },
      ],
      confirmLabel: editingEntry ? 'ذخیره' : 'افزودن',
      onConfirm: async () => {
        setSaving(true)
        try {
          if (editingEntry) { await updateWaitingEntry(editingEntry.id, payload as any); showToast('success', 'ویرایش شد') }
          else { await createWaitingEntry({ ...payload, status: 'waiting' } as any); showToast('success', 'افزوده شد') }
          setModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSaving(false) }
      },
    })
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
        moduleKey="waitingList"
        title="لیست انتظار"
        subtitle="مدیریت بیماران در انتظار نوبت"
        action={<Button onClick={openCreateModal} variant="primary"><Plus size={16} className="inline ml-1" /> افزودن به لیست</Button>}
      />

      {/* Stats Cards */}
      <ReorderableStatGrid
        storageKey="waitingList"
        items={[
          { key: 'total', node: <ModuleStatCard moduleKey="waitingList" icon={<Clock size={20} />} label="کل لیست" value={formatNumber(stats.total)} /> },
          { key: 'waiting', node: <ModuleStatCard moduleKey="waitingList" icon={<AlertCircle size={20} />} label="در انتظار" value={formatNumber(stats.waiting)} /> },
          { key: 'notified', node: <ModuleStatCard moduleKey="waitingList" icon={<Bell size={20} />} label="اطلاع داده شد" value={formatNumber(stats.notified)} /> },
          { key: 'scheduled', node: <ModuleStatCard moduleKey="waitingList" icon={<CheckCircle2 size={20} />} label="زمان‌بندی شد" value={formatNumber(stats.scheduled)} /> },
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
              placeholder="جستجوی بیمار یا دلیل..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">همه وضعیت‌ها</option>
            {waitStatuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(searchQuery || filterStatus) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFilterStatus('') }}>
              پاک کردن
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting List */}
        <div className="lg:col-span-2">
          {filteredEntries.length === 0 ? (
            <Card className="p-5">
              <EmptyState
                icon={<Clock size={28} />}
                title="ورودی در لیست انتظار نیست"
                description="با افزودن بیمار به لیست شروع کنید"
                action={<Button onClick={openCreateModal} variant="primary" size="sm"><Plus size={14} className="inline ml-1" />افزودن</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((e) => {
                const meta = getStatusMeta(e.status)
                const priority = e.priority ?? 2
                const pColor = priorityColors[priority] || 'slate'
                const pLabel = priorityLabels[priority] || 'متوسط'
                return (
                  <Card key={e.id} className="p-4 hover:card-shadow-lg transition-all-smooth">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-warning-100 flex items-center justify-center text-warning-700 flex-shrink-0">
                          <Clock size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800 truncate">{patientName(e)}</h3>
                            <Badge color={pColor}>{pLabel}</Badge>
                            <Badge color={meta.color}>{meta.label}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">پزشک: {doctorName(e)}</p>
                          {e.reason && <p className="text-sm text-slate-600 mt-1">{e.reason}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      {e.preferred_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {toJalaliShort(e.preferred_date)}
                          {e.preferred_time && ` - ${formatTime(e.preferred_time)}`}
                        </span>
                      )}
                      {patientPhone(e) && (
                        <span className="flex items-center gap-1" dir="ltr">
                          <Phone size={12} />
                          {toPersianDigits(patientPhone(e)!)}
                        </span>
                      )}
                      {e.notified_at && (
                        <span className="flex items-center gap-1 text-success-600">
                          <Bell size={12} />
                          اطلاع داده شد
                        </span>
                      )}
                    </div>

                    {/* Quick status buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => handleStatusChange(e, 'notified')}
                        disabled={e.status === 'notified' || e.status === 'scheduled' || e.status === 'cancelled'}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs hover:bg-primary-100 disabled:opacity-40 transition-all-smooth"
                      >
                        <Bell size={12} />
                        اطلاع
                      </button>
                      <button
                        onClick={() => handleStatusChange(e, 'scheduled')}
                        disabled={e.status === 'scheduled' || e.status === 'cancelled'}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success-50 text-success-700 text-xs hover:bg-success-100 disabled:opacity-40 transition-all-smooth"
                      >
                        <CheckCircle2 size={12} />
                        زمان‌بندی
                      </button>
                      <button
                        onClick={() => handleStatusChange(e, 'cancelled')}
                        disabled={e.status === 'cancelled'}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error-50 text-error-700 text-xs hover:bg-error-100 disabled:opacity-40 transition-all-smooth"
                      >
                        <XCircle size={12} />
                        لغو
                      </button>
                      <button
                        onClick={() => navigate(`/patients/${e.patient_id}`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs hover:bg-slate-100 transition-all-smooth mr-auto"
                      >
                        <Smile size={12} />
                        پرونده
                      </button>
                      <button
                        onClick={() => handleConvertToAppointment(e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-600 text-xs hover:bg-primary-100 transition-all-smooth"
                      >
                        <Calendar size={12} />
                        تبدیل به نوبت
                      </button>
                      <button
                        onClick={() => openEditModal(e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs hover:bg-slate-100 transition-all-smooth"
                      >
                        <Edit2 size={12} />
                        ویرایش
                      </button>
                      <button
                        onClick={() => handleDelete(e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error-50 text-error-600 text-xs hover:bg-error-100 transition-all-smooth"
                      >
                        <Trash2 size={12} />
                        حذف
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Priority Chart */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">توزیع بر اساس اولویت</h3>
          {priorityChartData.every((d) => d.count === 0) ? (
            <EmptyState icon={<AlertCircle size={28} />} title="داده‌ای موجود نیست" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <RTooltip formatter={(v: number) => [formatNumber(v), 'تعداد']} contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Create Wizard */}
      <Wizard
        open={modalOpen}
        onClose={() => { h.cancel(); setModalOpen(false) }}
        title={editingEntry ? 'ویرایش لیست انتظار' : 'افزودن به لیست انتظار'}
        step={wlWizardStep}
        onStepChange={setWlWizardStep}
        onFinish={handleSave}
        finishLabel="افزودن به لیست"
        saving={saving}
        steps={[
          {
            label: 'بیمار و پزشک',
            validate: () => (!formData.patient_id ? 'انتخاب بیمار الزامی است' : null),
            content: (
              <>
                <Select label="بیمار *" value={formData.patient_id} onChange={(v) => setFormData({ ...formData, patient_id: v })} options={patientOptions} placeholder="انتخاب بیمار" />
                <Select label="پزشک" value={formData.doctor_id} onChange={(v) => setFormData({ ...formData, doctor_id: v })} options={doctorOptions} placeholder="انتخاب پزشک" />
              </>
            ),
          },
          {
            label: 'زمان و اولویت',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <PersianDateInput label="تاریخ ترجیحی" value={formData.preferred_date} onChange={(v) => setFormData({ ...formData, preferred_date: v })} />
                  <Input label="ساعت ترجیحی" type="time" value={formData.preferred_time} onChange={(v) => setFormData({ ...formData, preferred_time: v })} />
                </div>
                <Select label="اولویت" value={formData.priority} onChange={(v) => setFormData({ ...formData, priority: v })} options={priorityOptions} />
              </>
            ),
          },
          {
            label: 'دلیل و یادداشت',
            validate: () => (!formData.reason.trim() ? 'دلیل ویزیت الزامی است' : null),
            content: (
              <>
                <Textarea label="دلیل ویزیت" value={formData.reason} onChange={(v) => setFormData({ ...formData, reason: v })} placeholder="علت مراجعه بیمار" />
                <Textarea label="یادداشت" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} placeholder="توضیحات اختیاری" />
              </>
            ),
          },
        ]}
      />

      {ConfirmActionModal}
    </div>
  )
}
