// Radiology.tsx - Persian RTL Dental Clinic Radiology Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Image, Search, Filter, Eye, XCircle, Smile, Camera, Calendar, User, FileText, Download, ZoomIn, Plus, Edit2, Archive, MessageSquare, CheckSquare, Square, Tags } from 'lucide-react'
import { PieChart, Pie, Cell, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts'
import { fetchRadiologyImages, fetchPatients, createRadiologyImage, updateRadiologyImage } from '../lib/api'
import { toJalaliDisplay, toJalaliString, toJalaliStringPretty, formatNumber, toPersianDigits } from '../lib/persianDate'
import { createPatientRadiologyZip, downloadBlob } from '../lib/zipArchive'
import { RadiologyImage, Patient } from '../types'
import { Card, Button, Badge, Spinner, EmptyState, Modal, Wizard, Input, Select, Textarea, showToast } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { PatientSelect } from '../components/PatientSelect'
import { ToothArchSelect } from '../components/ToothArchSelect'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'
import { useConfirmAction } from '../components/ConfirmAction'
import { DentalRadiologyViewer } from '../components/DentalRadiologyViewer'
import { toothLabel } from '../lib/toothLabel'
import { chimes } from '../lib/chimes'
import { h } from '../lib/haptics'

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

  // Batch Selection & ZIP export
  const [selectedRadIds, setSelectedRadIds] = useState<Set<string>>(new Set())
  const [batchTagModalOpen, setBatchTagModalOpen] = useState(false)
  const [batchToothInput, setBatchToothInput] = useState('')
  const [batchTypeInput, setBatchTypeInput] = useState('')
  const [zippingArchive, setZippingArchive] = useState(false)
  const [zipProgressText, setZipProgressText] = useState('')
  const [savingBatchRad, setSavingBatchRad] = useState(false)

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
  // Real gap found: this page could only ever create a new image record
  // — a typo'd tooth number or wrong date had no fix except archiving
  // and re-uploading from scratch. Editing an existing record uses the
  // same modal/wizard, just pre-filled and routed to updateRadiologyImage.
  const [editingImage, setEditingImage] = useState<RadiologyImage | null>(null)

  const openUploadModal = () => {
    setEditingImage(null)
    setUploadForm({ patient_id: '', image_type: 'panoramic', tooth_number: '', image_url: '', description: '', taken_at: new Date().toISOString().split('T')[0], notes: '' })
    setUploadWizardStep(0)
    setUploadModalOpen(true)
  }

  const handleToggleRadSelect = (imgId: string) => {
    h.tap()
    setSelectedRadIds((prev) => {
      const next = new Set(prev)
      if (next.has(imgId)) next.delete(imgId)
      else next.add(imgId)
      return next
    })
  }

  const handleSelectAllRad = () => {
    h.tap()
    if (selectedRadIds.size === filteredImages.length) {
      setSelectedRadIds(new Set())
    } else {
      setSelectedRadIds(new Set(filteredImages.map((i) => i.id)))
    }
  }

  const handleDownloadZip = async (onlySelected = false) => {
    const targetImages = onlySelected
      ? images.filter((img) => selectedRadIds.has(img.id))
      : filteredImages
    if (targetImages.length === 0) {
      showToast('error', 'هیچ تصویری برای خروجی یافت نشد')
      return
    }
    h.tap()
    chimes.playPop()
    setZippingArchive(true)
    setZipProgressText('در حال آماده‌سازی بسته ZIP تصاویر رادیولوژی...')
    try {
      const patientId = targetImages[0]?.patient_id
      const samePatient = targetImages.every((img) => img.patient_id === patientId)
      const patientObj = samePatient && patientId ? patients.find((p) => p.id === patientId) : null

      const fallbackPatient: Patient = patientObj || ({
        id: 'clinic-export',
        clinic_id: 'cl-1',
        first_name: 'آرشیو کلینیک',
        last_name: 'دندانپزشکی',
        file_number: 'ALL',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Patient)

      const blob = await createPatientRadiologyZip({
        patient: fallbackPatient,
        images: targetImages,
        includeDicomJson: true,
        includeHtmlPortfolio: true,
        onProgress: (_curr, _tot, msg) => setZipProgressText(msg),
      })
      const filename = `Radiology_Archive_${fallbackPatient.file_number || 'Export'}_${toJalaliString(new Date().toISOString()).replace(/\//g, '-')}.zip`
      downloadBlob(blob, filename)
      chimes.playSuccess()
      showToast('success', `آرشیو ZIP با موفقیت دانلود شد (${toPersianDigits(targetImages.length)} تصویر)`)
    } catch (err) {
      console.error('Error generating radiology zip:', err)
      showToast('error', 'خطا در تولید فایل ZIP')
    } finally {
      setZippingArchive(false)
      setZipProgressText('')
    }
  }

  const handleApplyBatchTag = async () => {
    if (selectedRadIds.size === 0) return
    if (!batchToothInput.trim() && !batchTypeInput.trim()) {
      showToast('error', 'حداقل یکی از موارد شماره دندان یا نوع تصویر را وارد فرمایید')
      return
    }
    setSavingBatchRad(true)
    try {
      const promises: Promise<any>[] = []
      for (const radId of Array.from(selectedRadIds)) {
        const patch: Partial<RadiologyImage> = {}
        if (batchToothInput.trim()) patch.tooth_number = batchToothInput.trim()
        if (batchTypeInput.trim()) patch.image_type = batchTypeInput.trim()
        promises.push(updateRadiologyImage(radId, patch as any))
      }
      await Promise.all(promises)
      chimes.playSuccess()
      showToast('success', `برچسب‌های ${toPersianDigits(selectedRadIds.size)} تصویر با موفقیت به‌روزرسانی شد`)
      setBatchTagModalOpen(false)
      setSelectedRadIds(new Set())
      await loadData()
    } catch (err) {
      console.error('Error updating batch radiology:', err)
      showToast('error', 'خطا در به‌روزرسانی دسته‌ای تصاویر')
    } finally {
      setSavingBatchRad(false)
    }
  }

  const openEditImageModal = (img: RadiologyImage) => {
    setSelectedImage(null)
    setEditingImage(img)
    setUploadForm({
      patient_id: img.patient_id, image_type: img.image_type || 'panoramic', tooth_number: img.tooth_number || '',
      image_url: img.image_url || '', description: img.description || '', taken_at: img.taken_at || '', notes: img.notes || '',
    })
    setUploadWizardStep(0)
    setUploadModalOpen(true)
  }

  const handleSaveImage = () => {
    if (!uploadForm.patient_id) { chimes.playWarning(); showToast('error', 'انتخاب بیمار الزامی است'); return }
    const patientObj = patients.find((p) => p.id === uploadForm.patient_id)
    confirmAction({
      type: editingImage ? 'edit' : 'create',
      title: editingImage ? 'ویرایش تصویر رادیولوژی' : 'ثبت تصویر رادیولوژی',
      fields: [
        { label: 'بیمار', value: patientObj ? `${patientObj.first_name} ${patientObj.last_name}` : '-', highlight: true },
        { label: 'نوع تصویر', value: imageTypes.find((t) => t.value === uploadForm.image_type)?.label || uploadForm.image_type },
        { label: 'شماره دندان', value: uploadForm.tooth_number ? toothLabel(uploadForm.tooth_number) : '-' },
        { label: 'تاریخ تصویربرداری', value: uploadForm.taken_at ? toJalaliDisplay(uploadForm.taken_at) : '-' },
      ],
      confirmLabel: editingImage ? 'ذخیره تغییرات' : 'ثبت تصویر',
      onConfirm: async () => {
        setSavingImage(true)
        try {
          if (editingImage) {
            await updateRadiologyImage(editingImage.id, {
              patient_id: uploadForm.patient_id, image_type: uploadForm.image_type,
              tooth_number: uploadForm.tooth_number || null, image_url: uploadForm.image_url || null,
              description: uploadForm.description || null, taken_at: uploadForm.taken_at || null, notes: uploadForm.notes || null,
            } as any)
            chimes.playSuccess()
            showToast('success', 'تصویر ویرایش شد')
            setUploadModalOpen(false)
            await loadData()
            setSavingImage(false)
            return
          }
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
          chimes.playSuccess()
          showToast('success', 'تصویر رادیولوژی ثبت شد')
          setUploadModalOpen(false)
          loadData()
        } catch {
          chimes.playWarning()
          showToast('error', 'خطا در ثبت تصویر')
        } finally { setSavingImage(false) }
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
          chimes.playPop()
          showToast('success', 'تصویر آرشیو شد')
          loadData()
        } catch {
          chimes.playWarning()
          showToast('error', 'خطا در آرشیو کردن')
        }
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
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-base font-bold text-slate-800">تصاویر رادیولوژی</h2>
            <div className="flex items-center gap-2">
              {filteredImages.length > 0 && (
                <button
                  onClick={handleSelectAllRad}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 flex items-center gap-1"
                  title={selectedRadIds.size === filteredImages.length ? 'لغو انتخاب همه' : 'انتخاب همه تصاویر جاری'}
                >
                  {selectedRadIds.size === filteredImages.length ? <CheckSquare size={13} className="text-primary-600" /> : <Square size={13} />}
                  <span>{selectedRadIds.size === filteredImages.length ? 'لغو انتخاب' : 'انتخاب همه'}</span>
                </button>
              )}
              <Button
                size="sm"
                variant="secondary"
                disabled={zippingArchive}
                onClick={() => handleDownloadZip(false)}
                className="text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                title="دانلود تمامی تصاویر فیلترشده در یک فایل ZIP"
              >
                {zippingArchive ? <Spinner size={12} /> : <Download size={13} />}
                دانلود ZIP
              </Button>
            </div>
          </div>

          {/* Progress Alert for ZIP Archive */}
          {zippingArchive && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 animate-pulse">
              <Spinner size={16} />
              <span className="font-medium">{zipProgressText || 'در حال بسته‌بندی فایل ZIP...'}</span>
            </div>
          )}

          {/* Sticky Batch Actions Bar */}
          {selectedRadIds.size > 0 && (
            <div className="sticky top-4 z-20 mb-4 flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 text-white shadow-lg border border-slate-700 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse" />
                <span className="text-xs font-bold">
                  {toPersianDigits(selectedRadIds.size)} تصویر انتخاب شده
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs !bg-slate-800 !text-slate-100 hover:!bg-slate-700 border-slate-600 flex items-center gap-1.5"
                  onClick={() => {
                    setBatchToothInput('')
                    setBatchTypeInput('')
                    setBatchTagModalOpen(true)
                  }}
                >
                  <Tags size={14} /> برچسب‌گذاری دسته‌ای
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={zippingArchive}
                  onClick={() => handleDownloadZip(true)}
                  className="text-xs flex items-center gap-1.5"
                >
                  {zippingArchive ? <Spinner size={14} /> : <Download size={14} />}
                  دانلود ZIP انتخابی
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs !text-slate-300 hover:!text-white hover:!bg-slate-800"
                  onClick={() => setSelectedRadIds(new Set())}
                >
                  لغو
                </Button>
              </div>
            </div>
          )}

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
                const isSelected = selectedRadIds.has(img.id)
                return (
                  <div
                    key={img.id}
                    className={`rounded-xl border overflow-hidden transition-all-smooth cursor-pointer relative ${
                      isSelected ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50/10' : 'border-slate-100 hover:card-shadow'
                    }`}
                    onClick={() => setSelectedImage(img)}
                  >
                    {/* Selection Checkbox */}
                    <div
                      className="absolute top-2 right-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleRadSelect(img.id)
                      }}
                    >
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-black/50 text-white/90 hover:bg-black/70'
                        }`}
                        title={isSelected ? 'لغو انتخاب' : 'انتخاب تصویر جهت عملیات دسته‌ای'}
                      >
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>
                    </div>

                    {/* Image placeholder */}
                    <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                      {img.image_url ? (
                        <img src={img.image_url} alt={img.description || ''} className="w-full h-full object-cover" />
                      ) : (
                        <Image size={40} className="text-slate-400" />
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge color={meta.color}>{meta.label}</Badge>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-slate-800 truncate">{patientName(img)}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">
                          {img.tooth_number ? `دندان ${toothLabel(img.tooth_number)}` : '-'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {img.taken_at ? toJalaliDisplay(img.taken_at) : toJalaliDisplay(img.created_at)}
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
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl card-shadow-lg max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">نمایشگر تشخیصی تصویر رادیولوژی</h3>
              <button onClick={() => setSelectedImage(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all-smooth text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Diagnostic Radiology Viewer */}
              {selectedImage.image_url ? (
                <DentalRadiologyViewer
                  imageUrl={selectedImage.image_url}
                  title={`${patientName(selectedImage)} — ${getTypeMeta(selectedImage.image_type).label}`}
                  toothNumber={selectedImage.tooth_number}
                />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl flex items-center justify-center overflow-hidden">
                  <Image size={48} className="text-slate-400" />
                </div>
              )}

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
                  <p className="text-sm font-medium text-slate-800">{selectedImage.tooth_number ? toothLabel(selectedImage.tooth_number) : '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Calendar size={12} /> تاریخ</p>
                  <p className="text-sm font-medium text-slate-800">{selectedImage.taken_at ? toJalaliStringPretty(selectedImage.taken_at) : toJalaliDisplay(selectedImage.created_at)}</p>
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
                {(() => {
                  const phone = patientPhone(selectedImage)
                  const cleanPhone = phone ? phone.replace(/\D/g, '').replace(/^0/, '98') : null
                  if (!cleanPhone) return null
                  const typeLabel = getTypeMeta(selectedImage.image_type).label
                  const pName = patientName(selectedImage)
                  const waText = `سلام ${pName} عزیز،\nتصویر رادیولوژی شما در کلینیک دندانپزشکی مینادنت:\nنوع رادیولوژی: ${typeLabel}${selectedImage.tooth_number ? `\nشماره دندان: ${toothLabel(selectedImage.tooth_number)}` : ''}\nتاریخ: ${toJalaliStringPretty(selectedImage.taken_at || selectedImage.created_at)}${selectedImage.image_url ? `\nلینک تصویر:\n${selectedImage.image_url}` : ''}\nبا آرزوی تندرستی - کلینیک مینادنت`
                  return (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-sm font-medium transition-all-smooth press-scale"
                      title="ارسال مشخصات تصویر در واتساپ"
                      onClick={() => chimes.playPop()}
                    >
                      <MessageSquare size={14} />
                      واتساپ
                    </a>
                  )
                })()}
                <Button variant="secondary" size="sm" onClick={() => openEditImageModal(selectedImage)}>
                  <Edit2 size={14} className="inline ml-1" />
                  ویرایش
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteImage(selectedImage)}>
                  <Archive size={14} className="inline ml-1" />
                  آرشیو
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
        title={editingImage ? 'ویرایش تصویر رادیولوژی' : 'ثبت تصویر رادیولوژی'}
        step={uploadWizardStep}
        onStepChange={setUploadWizardStep}
        onFinish={handleSaveImage}
        finishLabel={editingImage ? 'ذخیره تغییرات' : 'ثبت تصویر'}
        saving={savingImage}
        steps={[
          {
            label: 'بیمار و نوع',
            validate: () => (!uploadForm.patient_id ? 'انتخاب بیمار الزامی است' : null),
            content: (
              <>
                <PatientSelect required value={uploadForm.patient_id} onChange={(v) => setUploadForm((p) => ({ ...p, patient_id: v }))} patients={patients} />
                <div className="grid grid-cols-2 gap-3">
                  <Select label="نوع تصویر" value={uploadForm.image_type} onChange={(v) => setUploadForm((p) => ({ ...p, image_type: v }))} options={imageTypes.map((t) => ({ value: t.value, label: t.label }))} />
                  <ToothArchSelect label="دندان" value={uploadForm.tooth_number} onChange={(v) => setUploadForm((p) => ({ ...p, tooth_number: v }))} allowPrimary={false} />
                </div>
              </>
            ),
          },
          {
            label: 'تصویر و تاریخ',
            // A radiology "image" record with no actual image_url is a
            // completely blank, useless entry — nothing to view, ever.
            validate: () => (!uploadForm.image_url.trim() ? 'آدرس تصویر الزامی است' : null),
            content: (
              <>
                <Input label="آدرس تصویر (URL) *" value={uploadForm.image_url} onChange={(v) => setUploadForm((p) => ({ ...p, image_url: v }))} placeholder="https://..." dir="ltr" />
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
      {/* Batch Tag Modal */}
      {batchTagModalOpen && (
        <Modal
          open={batchTagModalOpen}
          onClose={() => setBatchTagModalOpen(false)}
          title={`برچسب‌گذاری دسته‌ای (${toPersianDigits(selectedRadIds.size)} تصویر)`}
          size="md"
        >
          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-500">
              مشخصات زیر بر روی تمامی {toPersianDigits(selectedRadIds.size)} تصویر انتخاب‌شده اعمال خواهد شد:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                شماره دندان یا دندان‌ها (اختیاری):
              </label>
              <Input
                value={batchToothInput}
                onChange={(v) => setBatchToothInput(v)}
                placeholder="مثال: 16 یا 14, 15, 16"
                dir="ltr"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                می‌توانید چند شماره دندان را با کاما جدا نمایید.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نوع تصویر (اختیاری):
              </label>
              <Select
                value={batchTypeInput}
                onChange={(v) => setBatchTypeInput(v)}
                options={[
                  { value: '', label: 'بدون تغییر' },
                  ...imageTypes.map((t) => ({ value: t.value, label: t.label })),
                ]}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setBatchTagModalOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={savingBatchRad}
                onClick={handleApplyBatchTag}
                className="flex items-center gap-1.5"
              >
                {savingBatchRad ? <Spinner size={14} /> : <Tags size={14} />}
                اعمال برچسب‌ها بر روی تصاویر
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {ConfirmActionModal}
    </div>
  )
}
