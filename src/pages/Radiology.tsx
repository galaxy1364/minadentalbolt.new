// Radiology.tsx - Persian RTL Dental Clinic Radiology Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Image, Search, Filter, Eye, XCircle, Smile, Camera, Calendar, User, FileText, Download, ZoomIn, Plus, Edit2, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts'
import { fetchRadiologyImages, fetchPatients, createRadiologyImage, updateRadiologyImage } from '../lib/api'
import { toJalaliString, toJalaliStringPretty, formatNumber, toPersianDigits } from '../lib/persianDate'
import { RadiologyImage, Patient } from '../types'
import { Card, Button, Badge, Spinner, EmptyState, Modal, Wizard, Input, Select, Textarea, showToast } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'
import { useConfirmAction } from '../components/ConfirmAction'

// ============================================================================
// Constants
// ============================================================================

const imageTypes: { value: string; label: string; color: string }[] = [
  { value: 'panoramic', label: 'پانورامیک', color: 'primary' },
  { value: 'periapical', label: 'پری‌اپیکال', color: 'accent' },
  { value: 'cephalometric', label: 'سفالومتریک', color: 'warning' },
  { value: 'intraoral', label: 'اینتراورال', color: 'success' },
  { value: 'bitewing', label: 'بایت‌وینگ', color: 'secondary' },
  { value: 'cbct', label: 'CBCT', color: 'error' },
  { value: 'other', label: 'سایر', color: 'slate' },
]

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#94a3b8']

function getTypeMeta(type: string | null) {
  return imageTypes.find((t) => t.value === type) || imageTypes[imageTypes.length - 1]
}

// ============================================================================
// Main Component
// ============================================================================

export default function Radiology() {
  const navigate = useNavigate()
  const { confirmAction, ConfirmActionModal } = useConfirmAction()

  const [images, setImages] = useState<RadiologyImage[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')

  // Detail modal
  const [selectedImage, setSelectedImage] = useState<RadiologyImage | null>(null)

  useEffect(() => {
    if (!selectedImage) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedImage(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedImage])

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadWizardStep, setUploadWizardStep] = useState(0)
  const [uploadForm, setUploadForm] = useState({ patient_id: '', image_type: 'panoramic', tooth_number: '', image_url: '', description: '', taken_at: '', notes: '' })
  const [savingImage, setSavingImage] = useState(false)

  const openUploadModal = () => {
    setUploadForm({ patient_id: '', image_type: 'panoramic', tooth_number: '', image_url: '', description: '', taken_at: new Date().toISOString().split('T')[0], notes: '' })
    setUploadWizardStep(0)
    setUploadModalOpen(true)
  }

  const handleSaveImage = () => {
    if (!uploadForm.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    const patientObj = patients.find((p) => p.id === uploadForm.patient_id)
    confirmAction({
      type: 'create',
      title: 'ثبت تصویر رادیولوژی',
      fields: [
        { label: 'بیمار', value: patientObj ? `${patientObj.first_name} ${patientObj.last_name}` : '-', highlight: true },
        { label: 'نوع تصویر', value: imageTypes.find((t) => t.value === uploadForm.image_type)?.label || uploadForm.image_type },
        { label: 'شماره دندان', value: uploadForm.tooth_number || '-' },
        { label: 'تاریخ تصویربرداری', value: uploadForm.taken_at ? toJalaliString(uploadForm.taken_at) : '-' },
      ],
      confirmLabel: 'ثبت تصویر',
      onConfirm: async () => {
        setSavingImage(true)
        try {
          await createRadiologyImage({
            clinic_id: undefined as any,
            patient_id: uploadForm.patient_id,
            doctor_id: null,
            encounter_id: null,
            image_type: uploadForm.image_type,
            tooth_number: uploadForm.tooth_number || null,
            image_url: uploadForm.image_url || null,
            description: uploadForm.description || null,
            taken_at: uploadForm.taken_at || null,
            notes: uploadForm.notes || null,
          })
          showToast('success', 'تصویر رادیولوژی ثبت شد')
          setUploadModalOpen(false)
          loadData()
        } catch { showToast('error', 'خطا در ثبت تصویر') } finally { setSavingImage(false) }
      },
    })
  }

  const handleDeleteImage = (img: RadiologyImage) => {
    setSelectedImage(null)
    // Per clinic policy — and legal record-retention requirements for
    // medical imaging — a radiology image is never permanently deleted,
    // only archived (restorable, hidden from the active gallery).
    confirmAction({
      type: 'status',
      title: 'آرشیو تصویر رادیولوژی',
      warning: 'این تصویر هیچ‌وقت پاک نمی‌شود — فقط از گالری فعال مخفی می‌شود و همیشه قابل بازگردانی است.',
      fields: [{ label: 'بیمار', value: patientName(img), highlight: true }],
      confirmLabel: 'تایید آرشیو',
      onConfirm: async () => {
        try {
          await updateRadiologyImage(img.id, { is_active: false } as any)
          showToast('success', 'تصویر آرشیو شد')
          loadData()
        } catch { showToast('error', 'خطا در آرشیو کردن') }
      },
    })
  }

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [imgs, pats] = await Promise.all([
        fetchRadiologyImages(),
        fetchPatients(),
      ])
      // Archived images stay out of the active gallery — fully
      // preserved, restorable, exactly like archived patients/implants.
      setImages(imgs.filter((i) => i.is_active !== false))
      setPatients(pats)
    } catch (err) {
      console.error('Error loading radiology:', err)
      showToast('error', 'خطا در بارگذاری تصاویر رادیولوژی')
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

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      if (searchQuery) {
        const pat = patients.find((p) => p.id === img.patient_id)
        const name = pat ? `${pat.first_name} ${pat.last_name}` : ''
        const desc = img.description || ''
        const tooth = img.tooth_number || ''
        const q = searchQuery.toLowerCase()
        if (!name.toLowerCase().includes(q) && !desc.toLowerCase().includes(q) && !tooth.toLowerCase().includes(q)) return false
      }
      if (filterType && img.image_type !== filterType) return false
      return true
    })
  }, [images, patients, searchQuery, filterType])

  const stats = useMemo(() => {
    const total = images.length
    const panoramic = images.filter((i) => i.image_type === 'panoramic').length
    const periapical = images.filter((i) => i.image_type === 'periapical').length
    const thisMonth = images.filter((i) => {
      if (!i.taken_at) return false
      const d = new Date(i.taken_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    return { total, panoramic, periapical, thisMonth }
  }, [images])

  const typeDistributionChart = useMemo(() => {
    const counts: Record<string, number> = {}
    images.forEach((i) => {
      const label = getTypeMeta(i.image_type).label
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [images])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    images.forEach((i) => {
      const key = i.image_type || 'other'
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [images])

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const patientName = (img: RadiologyImage) => {
    const pat = patients.find((p) => p.id === img.patient_id)
    return pat ? `${pat.first_name} ${pat.last_name}` : 'نامشخص'
  }

  const patientPhone = (img: RadiologyImage) => {
    const pat = patients.find((p) => p.id === img.patient_id)
    return pat?.phone || null
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
        moduleKey="radiology"
        title="رادیولوژی"
        subtitle="مدیریت تصاویر رادیولوژی بیماران"
        action={<Button variant="primary" onClick={openUploadModal}><Plus size={16} className="inline ml-1" /> ثبت تصویر</Button>}
      />

      {/* Stats Cards */}
      <ReorderableStatGrid
        storageKey="radiology"
        items={[
          { key: 'total', node: <ModuleStatCard moduleKey="radiology" icon={<Image size={20} />} label="کل تصاویر" value={formatNumber(stats.total)} /> },
          { key: 'pano', node: <ModuleStatCard moduleKey="radiology" icon={<Camera size={20} />} label="پانورامیک" value={formatNumber(stats.panoramic)} /> },
          { key: 'peri', node: <ModuleStatCard moduleKey="radiology" icon={<Smile size={20} />} label="پری‌اپیکال" value={formatNumber(stats.periapical)} /> },
          { key: 'month', node: <ModuleStatCard moduleKey="radiology" icon={<Image size={20} />} label="تصاویر این ماه" value={formatNumber(stats.thisMonth)} /> },
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
              placeholder="جستجوی بیمار، دندان یا توضیحات..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">همه انواع</option>
            {imageTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {(searchQuery || filterType) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFilterType('') }}>
              پاک کردن
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Grid */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-base font-bold text-slate-800 mb-4">تصاویر رادیولوژی</h2>
          {filteredImages.length === 0 ? (
            <EmptyState
              icon={<Image size={28} />}
              title="تصویری یافت نشد"
              description="تصاویر رادیولوژی بیماران در اینجا نمایش داده می‌شوند"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredImages.map((img) => {
                const meta = getTypeMeta(img.image_type)
                return (
                  <div
                    key={img.id}
                    className="rounded-xl border border-slate-100 overflow-hidden hover:card-shadow transition-all-smooth cursor-pointer"
                    onClick={() => setSelectedImage(img)}
                  >
                    {/* Image placeholder */}
                    <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                      {img.image_url ? (
                        <img src={img.image_url} alt={img.description || ''} className="w-full h-full object-cover" />
                      ) : (
                        <Image size={40} className="text-slate-400" />
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge color={meta.color}>{meta.label}</Badge>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-slate-800 truncate">{patientName(img)}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">
                          {img.tooth_number ? `دندان: ${toPersianDigits(img.tooth_number)}` : '-'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {img.taken_at ? toJalaliString(img.taken_at) : toJalaliString(img.created_at)}
                        </span>
                      </div>
                      {img.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{img.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Type Distribution Pie + Breakdown */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">توزیع تصاویر بر اساس نوع</h3>
            {typeDistributionChart.length === 0 ? (
              <EmptyState icon={<Image size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={typeDistributionChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={(entry: any) => `${entry.name}: ${toPersianDigits(entry.value)}`}
                  >
                    {typeDistributionChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(v: number) => formatNumber(v)}
                    contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Type breakdown list */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">تفکیک بر اساس نوع</h3>
            {imageTypes.map((t) => {
              const count = typeCounts[t.value] || 0
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              return (
                <div key={t.value} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge color={t.color}>{t.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600 font-medium">{toPersianDigits(count)} تصویر</span>
                    <span className="text-slate-400">{toPersianDigits(pct)}٪</span>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      </div>

      {/* Image Detail Modal */}
      {selectedImage && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl card-shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="text-base font-bold text-slate-800">جزئیات تصویر رادیولوژی</h3>
              <button onClick={() => setSelectedImage(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all-smooth text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image preview */}
              <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center overflow-hidden">
                {selectedImage.image_url ? (
                  <img src={selectedImage.image_url} alt={selectedImage.description || ''} className="w-full h-full object-cover" />
                ) : (
                  <Image size={48} className="text-slate-400" />
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-1"><User size={12} /> بیمار</p>
                  <p className="text-sm font-medium text-slate-800">{patientName(selectedImage)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Image size={12} /> نوع تصویر</p>
                  <Badge color={getTypeMeta(selectedImage.image_type).color}>{getTypeMeta(selectedImage.image_type).label}</Badge>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Smile size={12} /> دندان</p>
                  <p className="text-sm font-medium text-slate-800">{selectedImage.tooth_number ? toPersianDigits(selectedImage.tooth_number) : '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Calendar size={12} /> تاریخ</p>
                  <p className="text-sm font-medium text-slate-800">{selectedImage.taken_at ? toJalaliStringPretty(selectedImage.taken_at) : toJalaliString(selectedImage.created_at)}</p>
                </div>
              </div>

              {/* Description */}
              {selectedImage.description && (
                <div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-1"><FileText size={12} /> توضیحات</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{selectedImage.description}</p>
                </div>
              )}

              {/* Notes */}
              {selectedImage.notes && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">یادداشت</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{selectedImage.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button variant="primary" size="sm" onClick={() => { navigate(`/patients/${selectedImage.patient_id}`); setSelectedImage(null) }}>
                  <Eye size={14} className="inline ml-1" />
                  مشاهده پرونده
                </Button>
                {selectedImage.image_url && (
                  <a href={selectedImage.image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition-all-smooth">
                    <Download size={14} />
                    دانلود
                  </a>
                )}
                <Button variant="danger" size="sm" onClick={() => handleDeleteImage(selectedImage)}>
                  <Trash2 size={14} className="inline ml-1" />
                  حذف
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Upload Wizard */}
      <Wizard
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="ثبت تصویر رادیولوژی"
        step={uploadWizardStep}
        onStepChange={setUploadWizardStep}
        onFinish={handleSaveImage}
        finishLabel="ثبت تصویر"
        saving={savingImage}
        steps={[
          {
            label: 'بیمار و نوع',
            validate: () => (!uploadForm.patient_id ? 'انتخاب بیمار الزامی است' : null),
            content: (
              <>
                <Select label="بیمار" value={uploadForm.patient_id} onChange={(v) => setUploadForm((p) => ({ ...p, patient_id: v }))} options={patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))} placeholder="انتخاب بیمار" />
                <div className="grid grid-cols-2 gap-3">
                  <Select label="نوع تصویر" value={uploadForm.image_type} onChange={(v) => setUploadForm((p) => ({ ...p, image_type: v }))} options={imageTypes.map((t) => ({ value: t.value, label: t.label }))} />
                  <Input label="شماره دندان" value={uploadForm.tooth_number} onChange={(v) => setUploadForm((p) => ({ ...p, tooth_number: v }))} placeholder="مثال: 16" dir="ltr" />
                </div>
              </>
            ),
          },
          {
            label: 'تصویر و تاریخ',
            content: (
              <>
                <Input label="آدرس تصویر (URL)" value={uploadForm.image_url} onChange={(v) => setUploadForm((p) => ({ ...p, image_url: v }))} placeholder="https://..." dir="ltr" />
                <PersianDateInput label="تاریخ تصویربرداری" value={uploadForm.taken_at} onChange={(v) => setUploadForm((p) => ({ ...p, taken_at: v }))} />
              </>
            ),
          },
          {
            label: 'توضیحات',
            content: (
              <>
                <Textarea label="توضیحات" value={uploadForm.description} onChange={(v) => setUploadForm((p) => ({ ...p, description: v }))} placeholder="توضیحات تصویر..." rows={2} />
                <Textarea label="یادداشت" value={uploadForm.notes} onChange={(v) => setUploadForm((p) => ({ ...p, notes: v }))} placeholder="یادداشت..." rows={2} />
              </>
            ),
          },
        ]}
      />
      {ConfirmActionModal}
    </div>
  )
}
