// DocumentScannerModal.tsx — Camera Capture & Paper Chart Scanner
// Allows staff and doctors to snap photos of physical paper files, X-rays,
// consent forms, and lab reports using smartphone/tablet cameras.
// Stores locally in IndexedDB (db.radiology_images) as compressed data URLs
// and broadcasts across clinic devices via mesh sync without external bucket dependencies.

import React, { useState, useRef } from 'react'
import { Camera, Upload, RotateCw, Trash2, CheckCircle2, FileText, ImageIcon, ShieldCheck, Download, Layers } from 'lucide-react'
import { Modal, Button, Input, Textarea, Select, Spinner, showToast } from './ui'
import { PersianDateInput } from './PersianDateInput'
import { createRadiologyImage, addTimelineEntry } from '../lib/api'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { toPersianDigits } from '../lib/persianDate'

export interface DocumentScannerModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  patientName?: string
  initialCategory?: string
  onSuccess?: () => void
}

const CATEGORIES = [
  { value: 'paper_record', label: 'عکس پرونده کاغذی (سوابق قبلی)', icon: '📄' },
  { value: 'radiology', label: 'عکس رادیولوژی عمومی', icon: '🩻' },
  { value: 'periapical', label: 'رادیوگرافی تک‌دندان (PA)', icon: '🦷' },
  { value: 'opg', label: 'عکس پانورامیک (OPG)', icon: '🌐' },
  { value: 'cbct', label: 'اسکن سه‌بعدی (CBCT)', icon: '🔬' },
  { value: 'consent', label: 'فرم رضایت‌نامه دستی یا امضاشده', icon: '✍️' },
  { value: 'lab_report', label: 'برگه آزمایش یا رسید لابراتوار', icon: '🧪' },
  { value: 'clinical_photo', label: 'فتوگرافی داخل دهان / بالینی', icon: '📸' },
]

/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Keeps text, handwriting, and dental fine details crisp (max 1600px, 85% JPEG).
 */
function compressMedicalImage(file: File, rotationDeg = 0): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1600
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas unsupported'))

        // Handle 90/180/270 deg rotations
        const rad = (rotationDeg * Math.PI) / 180
        if (rotationDeg % 180 !== 0) {
          canvas.width = height
          canvas.height = width
        } else {
          canvas.width = width
          canvas.height = height
        }

        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(rad)
        ctx.drawImage(img, -width / 2, -height / 2, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024)
        resolve({ dataUrl, sizeKb })
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function DocumentScannerModal({
  open,
  onClose,
  patientId,
  patientName,
  initialCategory = 'paper_record',
  onSuccess,
}: DocumentScannerModalProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState(initialCategory)
  const [description, setDescription] = useState('')
  const [toothNumber, setToothNumber] = useState('')
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [fileSizeKb, setFileSizeKb] = useState<number>(0)
  const [rotation, setRotation] = useState<number>(0)

  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)

  const processAndSetImage = async (file: File, rot = 0) => {
    setProcessing(true)
    try {
      const res = await compressMedicalImage(file, rot)
      setPreviewDataUrl(res.dataUrl)
      setFileSizeKb(res.sizeKb)
      h.success()
      chimes.playSuccess()
    } catch (err) {
      console.error('Image compression error:', err)
      showToast('error', 'خطا در پردازش و بهینه‌سازی تصویر')
      h.error()
    } finally {
      setProcessing(false)
    }
  }

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return
    setCurrentFile(file)
    setRotation(0)
    await processAndSetImage(file, 0)
  }

  const handleRotate = async () => {
    if (!currentFile) return
    h.tap()
    const nextRot = (rotation + 90) % 360
    setRotation(nextRot)
    await processAndSetImage(currentFile, nextRot)
  }

  const handleClearImage = () => {
    h.delete()
    chimes.playPop()
    setCurrentFile(null)
    setPreviewDataUrl(null)
    setFileSizeKb(0)
    setRotation(0)
  }

  const handleDownloadLocal = () => {
    if (!previewDataUrl) return
    h.tap()
    chimes.playPop()
    const a = document.createElement('a')
    a.href = previewDataUrl
    a.download = `doc-${patientId}-${category}-${Date.now()}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    showToast('info', 'تصویر روی حافظه دستگاه ذخیره شد')
  }

  const handleSave = async () => {
    if (!previewDataUrl) {
      showToast('error', 'لطفاً ابتدا با دوربین عکس بگیرید یا تصویری انتخاب کنید')
      return
    }

    setSaving(true)
    try {
      const catObj = CATEGORIES.find((c) => c.value === category)
      const catLabel = catObj ? catObj.label : 'سند بالینی'
      const title = description.trim() || catLabel

      const img = await createRadiologyImage({
        clinic_id: '',
        patient_id: patientId,
        doctor_id: null,
        encounter_id: null,
        image_type: category,
        tooth_number: toothNumber.trim() || null,
        image_url: previewDataUrl,
        description: title,
        taken_at: takenAt,
        notes: notes.trim() || null,
        is_active: true,
      })

      // Write entry to patient timeline
      try {
        await addTimelineEntry(
          patientId,
          'document',
          `ثبت ${catLabel}`,
          title,
          img.id
        )
      } catch (e) {
        console.warn('Timeline entry logged with non-blocking error:', e)
      }

      chimes.playSuccess()
      h.success()
      showToast('success', `${catLabel} در پرونده ذخیره و در شبکه کلینیک همگام‌سازی شد`)

      // Reset state and close
      handleClearImage()
      setDescription('')
      setToothNumber('')
      setNotes('')
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error saving document:', err)
      showToast('error', 'خطا در ثبت سند در پرونده')
      chimes.playWarning()
      h.error()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="اسکن و ثبت تصویر پرونده (کاغذی / رادیولوژی)"
      size="lg"
    >
      <div className="space-y-4">
        {/* Category selector capsules */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
            نوع سند یا تصویر:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.value
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    h.tap()
                    setCategory(cat.value)
                  }}
                  className={`flex items-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all-smooth text-right press-scale ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <span className="truncate">{cat.label.split(' ')[0]} {cat.label.split(' ')[1] || ''}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Capture Area */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
          {previewDataUrl ? (
            <div className="space-y-3">
              <div className="relative inline-block max-h-80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-black/5">
                <img
                  src={previewDataUrl}
                  alt="Document Preview"
                  className="max-h-72 w-auto object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-2 left-2 p-1.5 rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-700 transition-colors"
                  title="حذف و عکس مجدد"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Compression & Quick Actions Bar */}
              <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                  <CheckCircle2 size={12} />
                  حجم بهینه‌شده: {toPersianDigits(fileSizeKb)} کیلوبایت (کیفیت بالا و آماده همگام‌سازی)
                </span>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors font-medium press-scale"
                >
                  <RotateCw size={12} /> چرخش ۹۰ درجه
                </button>
                <button
                  type="button"
                  onClick={handleDownloadLocal}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-medium press-scale"
                  title="ذخیره یک نسخه روی حافظه گوشی"
                >
                  <Download size={12} /> دانلود نسخه لوکال
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-inner">
                <Camera size={32} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                  عکس‌برداری از پرونده فیزیکی یا اسناد بالینی
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  تصویر مستقیماً در دیتابیس محلی دستگاه شما فشرده و ذخیره شده و بدون وابستگی به باکت‌های خارجی روی همه گوشی‌ها و تبلت‌های کلینیک سینک می‌شود.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Direct Camera Input */}
                <button
                  type="button"
                  onClick={() => {
                    h.tap()
                    cameraInputRef.current?.click()
                  }}
                  disabled={processing}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-teal-600 text-white font-bold text-sm shadow-md hover:from-primary-700 hover:to-teal-700 transition-all-smooth press-scale"
                >
                  <Camera size={18} />
                  <span>عکس‌برداری با دوربین گوشی</span>
                </button>

                {/* File picker */}
                <button
                  type="button"
                  onClick={() => {
                    h.tap()
                    fileInputRef.current?.click()
                  }}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-50 transition-all-smooth press-scale"
                >
                  <Upload size={18} />
                  <span>انتخاب از گالری یا فایل‌ها</span>
                </button>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </div>

              {processing && (
                <div className="flex items-center justify-center gap-2 text-xs text-primary-600 pt-2 font-bold animate-pulse">
                  <Spinner size={14} />
                  <span>در حال فشرده‌سازی و بهینه‌سازی وضوح تصویر...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="عنوان یا شرح سند"
            value={description}
            onChange={setDescription}
            placeholder="مثلاً: برگه پذیرش بیمارستان، OPG قبل جراحی..."
          />
          <PersianDateInput
            label="تاریخ سند یا تصویر"
            value={takenAt}
            onChange={setTakenAt}
          />
          <Input
            label="شماره دندان (اختیاری)"
            value={toothNumber}
            onChange={setToothNumber}
            placeholder="مثلاً: ۱۶ یا ۴۶ یا عمومی"
            dir="ltr"
          />
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">بیمار مربوطه</label>
            <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-700 font-bold">
              {patientName || 'بیمار جاری'}
            </div>
          </div>
        </div>

        <Textarea
          label="یادداشت تکمیلی بالینی (اختیاری)"
          value={notes}
          onChange={setNotes}
          placeholder="توضیحات تکمیلی پزشک یا منشی درباره این سند..."
          rows={2}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>ذخیره‌سازی محلی + سینک خودکار بین دستگاه‌ها</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !previewDataUrl}
              className="flex items-center gap-1.5"
            >
              {saving ? <Spinner size={16} /> : <CheckCircle2 size={16} />}
              <span>ذخیره در پرونده بیمار</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
