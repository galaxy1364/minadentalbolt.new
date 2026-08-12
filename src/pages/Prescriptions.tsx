// Prescriptions.tsx - Persian RTL Dental Clinic Prescriptions Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pill, FileText, Search, Plus, Eye, Trash2, Edit2, TrendingUp, Smile } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from 'recharts'
import { fetchPrescriptions, createPrescription, updatePrescription, deletePrescription, fetchPatients, fetchDoctors } from '../lib/api'
import { toJalaliString, toJalaliStringPretty, getJalaliMonthYear, formatCurrency, formatNumber, toPersianDigits, persianMonths } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { useConfirmAction } from '../components/ConfirmAction'
import { Prescription, PrescriptionWithRelations, Patient, Doctor } from '../types'
import { Wizard, Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, showToast } from '../components/ui'
import { ModuleHeader, ModuleStatCard } from '../components/ModuleHeader'

// ============================================================================
// Constants
// ============================================================================

const prescriptionStatuses: { value: string; label: string; color: string }[] = [
  { value: 'active', label: 'فعال', color: 'success' },
  { value: 'completed', label: 'تکمیل شده', color: 'slate' },
  { value: 'cancelled', label: 'لغو شده', color: 'error' },
]

function getStatusMeta(status: string) {
  return prescriptionStatuses.find((s) => s.value === status) || prescriptionStatuses[0]
}

// ============================================================================
// Main Component
// ============================================================================

export default function Prescriptions() {
  const navigate = useNavigate()
  const { confirmAction, ConfirmActionModal } = useConfirmAction()

  const [prescriptions, setPrescriptions] = useState<PrescriptionWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [rxWizardStep, setRxWizardStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editingRx, setEditingRx] = useState<PrescriptionWithRelations | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    medications: '',
    notes: '',
  })

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [prescs, pats, docs] = await Promise.all([
        fetchPrescriptions(),
        fetchPatients(),
        fetchDoctors(),
      ])
      setPrescriptions(prescs)
      setPatients(pats)
      setDoctors(docs)
    } catch (err) {
      console.error('Error loading prescriptions:', err)
      showToast('error', 'خطا در بارگذاری نسخه‌ها')
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

  const filteredPrescriptions = useMemo(() => {
    if (!searchQuery) return prescriptions
    const q = searchQuery.toLowerCase()
    return prescriptions.filter((p) => {
      const pat = patients.find((pt) => pt.id === p.patient_id)
      const name = pat ? `${pat.first_name} ${pat.last_name}` : ''
      const medsText = p.medications ? JSON.stringify(p.medications).toLowerCase() : ''
      return name.toLowerCase().includes(q) || medsText.includes(q)
    })
  }, [prescriptions, searchQuery])

  const stats = useMemo(() => {
    const total = prescriptions.length
    const active = prescriptions.filter((p) => p.status === 'active').length
    const completed = prescriptions.filter((p) => p.status === 'completed').length
    const thisMonth = prescriptions.filter((p) => {
      const info = getJalaliMonthYear(p.created_at)
      const nowInfo = getJalaliMonthYear(new Date().toISOString())
      return info.year === nowInfo.year && info.month === nowInfo.month
    }).length
    return { total, active, completed, thisMonth }
  }, [prescriptions])

  // 6-month trend area chart data
  const trendChartData = useMemo(() => {
    const now = new Date()
    const months: { label: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const count = prescriptions.filter((p) => {
        const pd = new Date(p.created_at)
        return pd >= d && pd < next
      }).length
      const { month, year } = getJalaliMonthYear(d.toISOString())
      months.push({ label: `${persianMonths[month - 1]} ${toPersianDigits(year)}`, count })
    }
    return months
  }, [prescriptions])

  const patientOptions = useMemo(() => {
    return patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))
  }, [patients])

  const doctorOptions = useMemo(() => {
    return doctors.map((d) => ({ value: d.id, label: d.name || d.specialty || 'پزشک' }))
  }, [doctors])

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const patientName = (p: PrescriptionWithRelations) => {
    // patient relation is not in type, try to find from list
    const pat = patients.find((pt) => pt.id === p.patient_id)
    return pat ? `${pat.first_name} ${pat.last_name}` : 'نامشخص'
  }

  const doctorName = (p: PrescriptionWithRelations) => {
    if (!p.doctor) return '-'
    return p.doctor.name || p.doctor.specialty || 'پزشک'
  }

  const medicationsCount = (p: PrescriptionWithRelations) => {
    if (!p.medications) return 0
    if (Array.isArray(p.medications)) return p.medications.length
    if (typeof p.medications === 'object') return Object.keys(p.medications).length
    return 0
  }

  const medicationsSummary = (p: PrescriptionWithRelations) => {
    if (!p.medications) return '-'
    if (Array.isArray(p.medications)) {
      return p.medications.slice(0, 2).map((m: any) => m.name || m.medication || String(m)).join('، ')
    }
    return JSON.stringify(p.medications).slice(0, 50)
  }

  // ===========================================================================
  // Modal Handlers
  // ===========================================================================

  const openCreateModal = () => {
    h.tap()
    setEditingRx(null)
    setRxWizardStep(0)
    setFormData({ patient_id: '', doctor_id: '', medications: '', notes: '' })
    setModalOpen(true)
  }

  const openEditModal = (p: PrescriptionWithRelations) => {
    h.tap()
    setEditingRx(p)
    let medsText = ''
    if (p.medications && typeof p.medications === 'object' && (p.medications as any).items) {
      medsText = (p.medications as any).items.map((m: any) => `${m.name || ''} | ${m.dose || ''} | ${m.frequency || ''}`).join('\n')
    } else if (Array.isArray(p.medications)) {
      medsText = p.medications.map((m: any) => `${m.name || m.medication || ''} | ${m.dose || ''} | ${m.frequency || ''}`).join('\n')
    }
    setFormData({ patient_id: p.patient_id, doctor_id: p.doctor_id || '', medications: medsText, notes: p.notes || '' })
    setRxWizardStep(0)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!formData.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    if (!formData.medications.trim()) { showToast('error', 'ورود حداقل یک دارو الزامی است'); return }
    const meds = formData.medications.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const parts = line.split('|').map((s) => s.trim())
      return { name: parts[0] || '', dose: parts[1] || '', frequency: parts[2] || '' }
    })
    const patient = patients.find((p) => p.id === formData.patient_id)
    const payload = {
      patient_id: formData.patient_id,
      doctor_id: formData.doctor_id || null,
      medications: { items: meds },
      notes: formData.notes || null,
    }
    confirmAction({
      type: editingRx ? 'edit' : 'create',
      title: editingRx ? 'ویرایش نسخه' : 'نسخه جدید',
      fields: [
        { label: 'بیمار', value: patient ? `${patient.first_name} ${patient.last_name}` : '-', highlight: true },
        { label: 'تعداد داروها', value: toPersianDigits(meds.length) },
      ],
      confirmLabel: editingRx ? 'ذخیره' : 'ایجاد نسخه',
      onConfirm: async () => {
        setSaving(true)
        try {
          if (editingRx) { await updatePrescription(editingRx.id, payload as any); showToast('success', 'نسخه ویرایش شد') }
          else { await createPrescription({ ...payload, status: 'active' } as any); showToast('success', 'نسخه ایجاد شد') }
          setModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSaving(false) }
      },
    })
  }

  const handleDelete = (p: PrescriptionWithRelations) => {
    h.warning()
    confirmAction({
      type: 'delete',
      title: 'حذف نسخه',
      warning: 'این عملیات قابل بازگشت نیست',
      fields: [
        { label: 'بیمار', value: patientName(p), highlight: true },
        { label: 'تعداد داروها', value: toPersianDigits(medicationsCount(p)) },
      ],
      confirmLabel: 'حذف قطعی',
      onConfirm: async () => {
        try { await deletePrescription(p.id); showToast('success', 'نسخه حذف شد'); await loadData() }
        catch { showToast('error', 'خطا در حذف') }
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
        moduleKey="prescriptions"
        title="نسخه‌ها"
        subtitle="مدیریت نسخه‌های پزشکی"
        action={<Button onClick={openCreateModal} variant="primary"><Plus size={16} className="inline ml-1" /> نسخه جدید</Button>}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ModuleStatCard moduleKey="prescriptions" icon={<FileText size={20} />} label="کل نسخه‌ها" value={formatNumber(stats.total)} />
        <ModuleStatCard moduleKey="prescriptions" icon={<Pill size={20} />} label="نسخه‌های فعال" value={formatNumber(stats.active)} />
        <ModuleStatCard moduleKey="prescriptions" icon={<Smile size={20} />} label="تکمیل شده" value={formatNumber(stats.completed)} />
        <ModuleStatCard moduleKey="prescriptions" icon={<TrendingUp size={20} />} label="نسخه‌های این ماه" value={formatNumber(stats.thisMonth)} />
      </div>

      {/* Trend Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            روند نسخه‌های ۶ ماه اخیر
          </h2>
        </div>
        {trendChartData.every((d) => d.count === 0) ? (
          <EmptyState icon={<TrendingUp size={28} />} title="داده‌ای موجود نیست" description="پس از ثبت نسخه، نمودار نمایش داده می‌شود" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="prescGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <RTooltip formatter={(v: number) => [formatNumber(v), 'نسخه']} contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} fill="url(#prescGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی بیمار یا دارو..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </Card>

      {/* Prescriptions List */}
      {filteredPrescriptions.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<Pill size={28} />}
            title="نسخه‌ای ثبت نشده است"
            description="با ایجاد نسخه جدید شروع کنید"
            action={<Button onClick={openCreateModal} variant="primary" size="sm"><Plus size={14} className="inline ml-1" />افزودن نسخه</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrescriptions.map((p) => {
            const meta = getStatusMeta(p.status)
            return (
              <Card key={p.id} className="p-5 hover:card-shadow-lg transition-all-smooth">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
                      <Pill size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{patientName(p)}</h3>
                      <p className="text-xs text-slate-500">پزشک: {doctorName(p)}</p>
                    </div>
                  </div>
                  <Badge color={meta.color}>{meta.label}</Badge>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-slate-500 mb-1">داروها ({toPersianDigits(medicationsCount(p))} مورد)</p>
                  <p className="text-sm text-slate-700 line-clamp-2">{medicationsSummary(p)}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">{toJalaliStringPretty(p.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(p)} className="text-slate-500 hover:text-slate-700 text-xs flex items-center gap-1"><Edit2 size={14} /> ویرایش</button>
                    <button onClick={() => handleDelete(p)} className="text-error-500 hover:text-error-700 text-xs flex items-center gap-1"><Trash2 size={14} /> حذف</button>
                    <button onClick={() => navigate(`/patients/${p.patient_id}`)} className="text-primary-600 hover:text-primary-700 text-xs flex items-center gap-1"><Eye size={14} /> پرونده</button>
                  </div>
                </div>

                {p.notes && (
                  <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50">یادداشت: {p.notes}</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Wizard
        open={modalOpen}
        onClose={() => { h.cancel(); setModalOpen(false) }}
        title={editingRx ? 'ویرایش نسخه' : 'نسخه جدید'}
        step={rxWizardStep}
        onStepChange={setRxWizardStep}
        onFinish={handleSave}
        finishLabel={editingRx ? 'ذخیره' : 'ایجاد نسخه'}
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
            label: 'داروها',
            validate: () => (!formData.medications.trim() ? 'ورود حداقل یک دارو الزامی است' : null),
            content: (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">داروها (هر خط یک دارو، با فرمت: نام | دوز | بسامد)</label>
                <textarea
                  autoFocus
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  placeholder={'آموکسی‌سیلین | ۵۰۰mg | ۳ بار در روز\nاستامینوفن | ۳۲۵mg | هر ۶ ساعت'}
                  rows={6}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">برای جدا کردن فیلدها از | استفاده کنید</p>
              </div>
            ),
          },
          {
            label: 'یادداشت',
            content: (
              <Textarea label="یادداشت" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} placeholder="توضیحات اختیاری" rows={3} />
            ),
          },
        ]}
      />

      {ConfirmActionModal}
    </div>
  )
}
