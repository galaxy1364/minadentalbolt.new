// Settings.tsx — Full management: doctors, units, procedures, SMS, packages, categories
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Settings as SettingsIcon, Building2, Hash, MessageSquare, Package, Save, Smile,
  Cloud, Download, Upload, Vibrate, Volume2, Bell, Database, RefreshCw, Check,
  Smartphone, Shield, AlertTriangle, Eye, ChevronRight, Wifi, Plus, Edit2, Trash2,
  Stethoscope, Wrench, ListOrdered, Tag, Copy, CheckCircle2, History, CloudOff, Sparkles,
} from 'lucide-react'
import {
  fetchSmsTemplates, fetchTreatmentPackages, fetchDoctors, fetchUnits, fetchProcedures,
  fetchInventoryCategories,
  createDoctor, updateDoctor, deleteDoctor,
  createUnit, updateUnit, deleteUnit,
  createProcedure, updateProcedure, deleteProcedure,
  createSmsTemplate, updateSmsTemplate, deleteSmsTemplate,
  createTreatmentPackage, updateTreatmentPackage, deleteTreatmentPackage,
  createInventoryCategory, updateInventoryCategory, deleteInventoryCategory,
  fetchDoctorSchedules, createDoctorSchedule, deleteDoctorSchedule,
} from '../lib/api'
import { db, TABLE_NAMES } from '../lib/db'
import { syncNow, subscribeSync, SyncStatus, getFailedSyncEntries, retryFailedEntry, retryAllFailedEntries, discardFailedEntry } from '../lib/sync'
import { toJalaliString, toJalaliStringPretty, formatCurrency, formatNumber, toPersianDigits } from '../lib/persianDate'
import {
  SmsTemplate, TreatmentPackage, Doctor, Unit, Procedure, InventoryCategory, DoctorSchedule,
  DoctorInput, UnitInput, ProcedureInput, SmsTemplateInput, TreatmentPackageInput, InventoryCategoryInput,
} from '../types'
import { Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, StatCard, Tabs, Modal, showToast } from '../components/ui'
import { useConfirmAction } from '../components/ConfirmAction'
import { h, setHapticsEnabled, setSoundEnabled, getHapticsEnabled, getSoundEnabled } from '../lib/haptics'
import { CLINIC_ID } from '../lib/supabase'
import { DOCTOR_COLOR_PALETTE } from '../lib/doctorColors'
import { getErrorLog, clearErrorLog, LoggedError } from '../lib/errorLog'
import { fetchAuditLog, clearAuditLog } from '../lib/auditLog'
import { listBackupSnapshots, restoreFromSnapshot } from '../lib/autoBackup'
import { checkForUpdate, applyUpdate } from '../lib/updateCheck'
import { APP_VERSION, BUILD_DATE } from '../lib/appVersion'
import type { AuditLogEntry, BackupSnapshot } from '../lib/db'
import type { SyncQueueEntry } from '../lib/db'

const smsTemplateTypes: { value: string; label: string }[] = [
  { value: 'appointment_reminder', label: 'یادآوری نوبت' },
  { value: 'appointment_confirmation', label: 'تایید نوبت' },
  { value: 'birthday', label: 'تولد' },
  { value: 'follow_up', label: 'پیگیری' },
  { value: 'welcome', label: 'خوش‌آمد' },
  { value: 'payment_receipt', label: 'رسید پرداخت' },
  { value: 'appointment_cancelled', label: 'لغو نوبت' },
  { value: 'custom', label: 'سفارشی' },
]

function getTemplateTypeLabel(type: string) {
  return smsTemplateTypes.find((t) => t.value === type)?.label || type
}

const procedureCategories: { value: string; label: string }[] = [
  { value: 'diagnostic', label: 'تشخیصی' },
  { value: 'preventive', label: 'پیشگیری' },
  { value: 'restorative', label: 'ترمیمی' },
  { value: 'endodontics', label: 'عصب‌کشی' },
  { value: 'prosthetics', label: 'پروتز' },
  { value: 'cosmetic', label: 'زیبایی' },
  { value: 'surgery', label: 'جراحی' },
  { value: 'implant', label: 'ایمپلنت' },
  { value: 'periodontics', label: 'لثه' },
  { value: 'pediatric', label: 'اطفال' },
  { value: 'orthodontics', label: 'ارتودنسی' },
  { value: 'other', label: 'سایر' },
]

function getCatLabel(cat: string | null) {
  return procedureCategories.find((c) => c.value === cat)?.label || 'سایر'
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([])
  const [packages, setPackages] = useState<TreatmentPackage[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [generalForm, setGeneralForm] = useState({ clinic_name: 'کلینیک دندانپزشکی مینادنت', address: '', phone: '', email: '' })
  const [fileNumberForm, setFileNumberForm] = useState({ prefix: 'MIN', next_number: '1001', format: 'PREFIX-NUMBER' })
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null)

  const [hapticsOn, setHapticsOn] = useState(getHapticsEnabled())
  const [soundOn, setSoundOn] = useState(getSoundEnabled())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [backing, setBacking] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({})

  // ── Modals ──
  const [doctorModal, setDoctorModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [doctorSchedule, setDoctorSchedule] = useState<DoctorSchedule[]>([])
  const [savingSchedule, setSavingSchedule] = useState(false)
  // Saturday-first, matching persianDate.ts's jsDateToPersianWeekday
  // convention (0=Saturday...6=Friday) — this array's index IS the
  // day_of_week value stored on doctor_schedules, so this order isn't
  // just cosmetic, it's the actual encoding.
  const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
  const [doctorForm, setDoctorForm] = useState({ name: '', specialty: '', license_number: '', is_active: 'true', color: DOCTOR_COLOR_PALETTE[0] })
  const [savingDoctor, setSavingDoctor] = useState(false)

  const [unitModal, setUnitModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [unitForm, setUnitForm] = useState({ name: '', number: '1', is_active: 'true' })
  const [savingUnit, setSavingUnit] = useState(false)

  const [procModal, setProcModal] = useState(false)
  const [editingProc, setEditingProc] = useState<Procedure | null>(null)
  const [procForm, setProcForm] = useState({ code: '', name: '', category: 'restorative', default_price: '', description: '', is_active: 'true' })
  const [savingProc, setSavingProc] = useState(false)

  const [tplModal, setTplModal] = useState(false)
  const [editingTpl, setEditingTpl] = useState<SmsTemplate | null>(null)
  const [tplForm, setTplForm] = useState({ name: '', type: 'appointment_reminder', template: '', is_active: 'true' })
  const [savingTpl, setSavingTpl] = useState(false)

  const [pkgModal, setPkgModal] = useState(false)
  const [editingPkg, setEditingPkg] = useState<TreatmentPackage | null>(null)
  const [pkgForm, setPkgForm] = useState({ name: '', description: '', total_price: '', discount_percentage: '', is_active: 'true' })
  const [savingPkg, setSavingPkg] = useState(false)

  const [catModal, setCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState<InventoryCategory | null>(null)
  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [savingCat, setSavingCat] = useState(false)

  const { confirmAction, ConfirmActionModal } = useConfirmAction()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [templates, pkgs, docs, uts, procs, cats] = await Promise.all([
        fetchSmsTemplates(), fetchTreatmentPackages(), fetchDoctors(), fetchUnits(), fetchProcedures(), fetchInventoryCategories(),
      ])
      setSmsTemplates(templates); setPackages(pkgs); setDoctors(docs); setUnits(uts); setProcedures(procs); setCategories(cats)
      const counts: Record<string, number> = {}
      for (const t of TABLE_NAMES) { try { counts[t] = await (db as any)[t].count() } catch { counts[t] = 0 } }
      setRecordCounts(counts)
    } catch { showToast('error', 'خطا در بارگذاری تنظیمات') } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadData()
    const unsub = subscribeSync((s, p, l) => { setSyncStatus(s); setPendingCount(p); setLastSync(l) })
    return unsub
  }, [loadData])

  const fileNumberPreview = useMemo(() => {
    const num = fileNumberForm.next_number || '0'
    const padded = num.padStart(5, '0')
    switch (fileNumberForm.format) {
      case 'PREFIX-NUMBER': return `${fileNumberForm.prefix}-${toPersianDigits(padded)}`
      case 'PREFIX/NUMBER': return `${fileNumberForm.prefix}/${toPersianDigits(padded)}`
      case 'NUMBER-PREFIX': return `${toPersianDigits(padded)}-${fileNumberForm.prefix}`
      case 'NUMBER': return toPersianDigits(padded)
      default: return `${fileNumberForm.prefix}-${toPersianDigits(padded)}`
    }
  }, [fileNumberForm])

  const stats = useMemo(() => ({
    templates: smsTemplates.length, activeTemplates: smsTemplates.filter((t) => t.is_active).length,
    packages: packages.length, activePackages: packages.filter((p) => p.is_active).length,
    doctors: doctors.length, units: units.length, procedures: procedures.length, categories: categories.length,
  }), [smsTemplates, packages, doctors, units, procedures, categories])

  const totalRecords = useMemo(() => Object.values(recordCounts).reduce((a, b) => a + b, 0), [recordCounts])

  // ── Persist general/fileNumber to localStorage ──
  const handleSaveGeneral = () => {
    h.confirm()
    try { localStorage.setItem('minadent_general', JSON.stringify(generalForm)) } catch {}
    showToast('success', 'تنظیمات عمومی ذخیره شد')
  }
  const handleSaveFileNumber = () => {
    h.confirm()
    try { localStorage.setItem('minadent_fileNumber', JSON.stringify(fileNumberForm)) } catch {}
    showToast('success', 'تنظیمات شماره پرونده ذخیره شد')
  }

  useEffect(() => {
    try {
      const g = localStorage.getItem('minadent_general')
      if (g) setGeneralForm(JSON.parse(g))
      const f = localStorage.getItem('minadent_fileNumber')
      if (f) setFileNumberForm(JSON.parse(f))
    } catch {}
  }, [])

  const toggleHaptics = () => {
    const v = !hapticsOn; setHapticsOn(v); setHapticsEnabled(v)
    try { localStorage.setItem('minadent_haptics', String(v)) } catch {}
    if (v) h.success(); showToast('success', v ? 'لرزش فعال شد' : 'لرزش غیرفعال شد')
  }
  const toggleSound = () => {
    const v = !soundOn; setSoundOn(v); setSoundEnabled(v)
    try { localStorage.setItem('minadent_sound', String(v)) } catch {}
    if (v) h.pop(); showToast('success', v ? 'صدا فعال شد' : 'صدا غیرفعال شد')
  }

  const handleCloudBackup = () => {
    confirmAction({
      type: 'create', title: 'پشتیبان‌گیری ابری',
      fields: [
        { label: 'کل رکوردها', value: toPersianDigits(totalRecords), icon: <Database size={16} />, highlight: true },
        { label: 'جداول', value: toPersianDigits(TABLE_NAMES.length), icon: <Cloud size={16} /> },
        { label: 'مقصد', value: 'Supabase Cloud', icon: <Wifi size={16} /> },
      ],
      confirmLabel: 'شروع پشتیبان‌گیری',
      onConfirm: async () => { setBacking(true); try { await syncNow(); showToast('success', 'پشتیبان‌گیری ابری انجام شد') } catch { showToast('error', 'خطا در پشتیبان‌گیری') } finally { setBacking(false) } },
    })
  }

  const handleLocalBackup = async () => {
    h.confirm()
    try {
      const backup: Record<string, any[]> = {}
      for (const t of TABLE_NAMES) { try { backup[t] = await (db as any)[t].toArray() } catch { backup[t] = [] } }
      const blob = new Blob([JSON.stringify({ version: 1, date: new Date().toISOString(), data: backup }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `minadent-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url)
      showToast('success', 'فایل پشتیبان دانلود شد')
    } catch { showToast('error', 'خطا در ایجاد فایل پشتیبان') }
  }

  const handleRestore = (file: File) => {
    confirmAction({
      type: 'status', title: 'بازیابی از فایل', warning: 'تمام داده‌های فعلی با محتوای فایل جایگزین می‌شود',
      fields: [{ label: 'فایل', value: file.name, icon: <Upload size={16} />, highlight: true }, { label: 'حجم', value: `${toPersianDigits((file.size / 1024).toFixed(0))} KB`, icon: <Database size={16} /> }],
      confirmLabel: 'تایید بازیابی',
      onConfirm: async () => {
        setRestoring(true)
        try {
          const text = await file.text(); const parsed = JSON.parse(text)
          if (!parsed.data) throw new Error('invalid')
          for (const t of TABLE_NAMES) { if (parsed.data[t]) { try { await (db as any)[t].clear(); await (db as any)[t].bulkPut(parsed.data[t]) } catch {} } }
          showToast('success', 'بازیابی انجام شد'); await loadData()
        } catch { showToast('error', 'فایل پشتیبان نامعتبر است') } finally { setRestoring(false) }
      },
    })
  }

  // ── Doctor handlers ──
  const openCreateDoctor = () => {
    setEditingDoctor(null)
    const usedCount = doctors.length
    setDoctorForm({ name: '', specialty: '', license_number: '', is_active: 'true', color: DOCTOR_COLOR_PALETTE[usedCount % DOCTOR_COLOR_PALETTE.length] })
    setDoctorSchedule([])
    setDoctorModal(true)
  }

  // Working-hours editor for a doctor — each weekday is either absent
  // from doctorSchedule (day off) or present with start/end times.
  const getDaySchedule = (day: number) => doctorSchedule.find((s) => s.day_of_week === day)
  const toggleDay = (day: number) => {
    const existing = getDaySchedule(day)
    if (existing) {
      setDoctorSchedule(doctorSchedule.filter((s) => s.day_of_week !== day))
    } else {
      setDoctorSchedule([...doctorSchedule, {
        id: `new-${day}`, clinic_id: '', doctor_id: editingDoctor?.id || '', day_of_week: day,
        start_time: '09:00', end_time: '17:00', slot_duration: 30, break_duration: null,
        break_start: null, break_end: null, max_appointments: null, is_active: true, notes: null,
        created_at: '', updated_at: '',
      } as DoctorSchedule])
    }
  }
  const updateDayTime = (day: number, field: 'start_time' | 'end_time', value: string) => {
    setDoctorSchedule(doctorSchedule.map((s) => s.day_of_week === day ? { ...s, [field]: value } : s))
  }

  const handleSaveSchedule = async () => {
    if (!editingDoctor) return
    setSavingSchedule(true)
    try {
      // Simplest reliable approach given schedules are few rows per
      // doctor: replace the doctor's whole week — delete whatever
      // existed, then re-create the current in-memory state.
      const existing = (await fetchDoctorSchedules()).filter((sc) => sc.doctor_id === editingDoctor.id)
      for (const s of existing) await deleteDoctorSchedule(s.id)
      for (const s of doctorSchedule) {
        await createDoctorSchedule({
          clinic_id: '', doctor_id: editingDoctor.id, day_of_week: s.day_of_week,
          start_time: s.start_time, end_time: s.end_time, slot_duration: s.slot_duration || 30,
          break_duration: null, break_start: null, break_end: null, max_appointments: null,
          is_active: true, notes: null,
        } as any)
      }
      showToast('success', 'برنامه‌ی کاری ذخیره شد')
      const refreshed = (await fetchDoctorSchedules()).filter((sc) => sc.doctor_id === editingDoctor.id)
      setDoctorSchedule(refreshed)
    } catch { showToast('error', 'خطا در ذخیره‌ی برنامه') }
    finally { setSavingSchedule(false) }
  }
  const openEditDoctor = (d: Doctor) => {
    setEditingDoctor(d)
    setDoctorForm({ name: d.name || '', specialty: d.specialty || '', license_number: d.license_number || '', is_active: d.is_active ? 'true' : 'false', color: d.color || DOCTOR_COLOR_PALETTE[0] })
    setDoctorModal(true)
    fetchDoctorSchedules().then((all) => setDoctorSchedule(all.filter((sc) => sc.doctor_id === d.id)))
  }
  const handleSaveDoctor = async () => {
    if (!doctorForm.name.trim()) { showToast('error', 'نام پزشک الزامی است'); return }
    setSavingDoctor(true)
    try {
      const payload: DoctorInput = { clinic_id: CLINIC_ID, user_id: null, staff_id: editingDoctor?.staff_id ?? null, name: doctorForm.name.trim(), specialty: doctorForm.specialty.trim() || null, license_number: doctorForm.license_number || null, color: doctorForm.color, is_active: doctorForm.is_active === 'true' }
      if (editingDoctor) { await updateDoctor(editingDoctor.id, payload); showToast('success', 'پزشک ویرایش شد') }
      else { await createDoctor(payload); showToast('success', 'پزشک اضافه شد') }
      setDoctorModal(false); loadData()
    } catch { showToast('error', 'خطا در ذخیره') } finally { setSavingDoctor(false) }
  }
  const handleDeleteDoctor = (d: Doctor) => {
    confirmAction({ type: 'delete', title: 'حذف پزشک', fields: [{ label: 'تخصص', value: d.specialty || '', highlight: true }], confirmLabel: 'تایید حذف', onConfirm: async () => { await deleteDoctor(d.id); showToast('success', 'حذف شد'); loadData() } })
  }

  // ── Unit handlers ──
  const openCreateUnit = () => { setEditingUnit(null); setUnitForm({ name: '', number: '1', is_active: 'true' }); setUnitModal(true) }
  const openEditUnit = (u: Unit) => { setEditingUnit(u); setUnitForm({ name: u.name || '', number: String(u.number || '1'), is_active: u.is_active ? 'true' : 'false' }); setUnitModal(true) }
  const handleSaveUnit = async () => {
    if (!unitForm.name.trim()) { showToast('error', 'نام یونیت الزامی است'); return }
    setSavingUnit(true)
    try {
      const payload: UnitInput = { clinic_id: CLINIC_ID, name: unitForm.name.trim(), number: Number(unitForm.number) || 1, is_active: unitForm.is_active === 'true' }
      if (editingUnit) { await updateUnit(editingUnit.id, payload); showToast('success', 'یونیت ویرایش شد') }
      else { await createUnit(payload); showToast('success', 'یونیت اضافه شد') }
      setUnitModal(false); loadData()
    } catch { showToast('error', 'خطا در ذخیره') } finally { setSavingUnit(false) }
  }
  const handleDeleteUnit = (u: Unit) => {
    confirmAction({ type: 'delete', title: 'حذف یونیت', fields: [{ label: 'نام', value: u.name || '', highlight: true }], confirmLabel: 'تایید حذف', onConfirm: async () => { await deleteUnit(u.id); showToast('success', 'حذف شد'); loadData() } })
  }

  // ── Procedure handlers ──
  const openCreateProc = () => { setEditingProc(null); setProcForm({ code: '', name: '', category: 'restorative', default_price: '', description: '', is_active: 'true' }); setProcModal(true) }
  const openEditProc = (p: Procedure) => { setEditingProc(p); setProcForm({ code: p.code, name: p.name, category: p.category || 'other', default_price: p.default_price != null ? String(p.default_price) : '', description: p.description || '', is_active: p.is_active ? 'true' : 'false' }); setProcModal(true) }
  const handleSaveProc = async () => {
    if (!procForm.code.trim() || !procForm.name.trim()) { showToast('error', 'کد و نام رویه الزامی است'); return }
    setSavingProc(true)
    try {
      const payload: ProcedureInput = { clinic_id: CLINIC_ID, code: procForm.code.trim(), name: procForm.name.trim(), category: procForm.category, default_price: procForm.default_price ? Number(procForm.default_price) : null, description: procForm.description || null, is_active: procForm.is_active === 'true' }
      if (editingProc) { await updateProcedure(editingProc.id, payload); showToast('success', 'رویه ویرایش شد') }
      else { await createProcedure(payload); showToast('success', 'رویه اضافه شد') }
      setProcModal(false); loadData()
    } catch { showToast('error', 'خطا در ذخیره') } finally { setSavingProc(false) }
  }
  const handleDeleteProc = (p: Procedure) => {
    confirmAction({ type: 'delete', title: 'حذف رویه', fields: [{ label: 'نام', value: p.name, highlight: true }, { label: 'کد', value: p.code }], confirmLabel: 'تایید حذف', onConfirm: async () => { await deleteProcedure(p.id); showToast('success', 'حذف شد'); loadData() } })
  }

  // ── SMS Template handlers ──
  const openCreateTpl = () => { setEditingTpl(null); setTplForm({ name: '', type: 'appointment_reminder', template: '', is_active: 'true' }); setTplModal(true) }
  const openEditTpl = (t: SmsTemplate) => { setEditingTpl(t); setTplForm({ name: t.name, type: t.type, template: t.template, is_active: t.is_active ? 'true' : 'false' }); setTplModal(true) }
  const handleSaveTpl = async () => {
    if (!tplForm.name.trim() || !tplForm.template.trim()) { showToast('error', 'نام و محتوای قالب الزامی است'); return }
    setSavingTpl(true)
    try {
      const payload: SmsTemplateInput = { clinic_id: CLINIC_ID, name: tplForm.name.trim(), type: tplForm.type, template: tplForm.template.trim(), is_active: tplForm.is_active === 'true' }
      if (editingTpl) { await updateSmsTemplate(editingTpl.id, payload); showToast('success', 'قالب ویرایش شد') }
      else { await createSmsTemplate(payload); showToast('success', 'قالب اضافه شد') }
      setTplModal(false); loadData()
    } catch { showToast('error', 'خطا در ذخیره') } finally { setSavingTpl(false) }
  }
  const handleDeleteTpl = (t: SmsTemplate) => {
    confirmAction({ type: 'delete', title: 'حذف قالب پیامک', fields: [{ label: 'نام', value: t.name, highlight: true }], confirmLabel: 'تایید حذف', onConfirm: async () => { await deleteSmsTemplate(t.id); showToast('success', 'حذف شد'); loadData() } })
  }

  // ── Package handlers ──
  const openCreatePkg = () => { setEditingPkg(null); setPkgForm({ name: '', description: '', total_price: '', discount_percentage: '', is_active: 'true' }); setPkgModal(true) }
  const openEditPkg = (p: TreatmentPackage) => { setEditingPkg(p); setPkgForm({ name: p.name, description: p.description || '', total_price: p.total_price != null ? String(p.total_price) : '', discount_percentage: p.discount_percentage != null ? String(p.discount_percentage) : '', is_active: p.is_active ? 'true' : 'false' }); setPkgModal(true) }
  const handleSavePkg = async () => {
    if (!pkgForm.name.trim()) { showToast('error', 'نام پکیج الزامی است'); return }
    setSavingPkg(true)
    try {
      const payload: TreatmentPackageInput = { clinic_id: CLINIC_ID, name: pkgForm.name.trim(), description: pkgForm.description || null, included_procedures: null, total_price: pkgForm.total_price ? Number(pkgForm.total_price) : null, discount_percentage: pkgForm.discount_percentage ? Number(pkgForm.discount_percentage) : null, is_active: pkgForm.is_active === 'true' }
      if (editingPkg) { await updateTreatmentPackage(editingPkg.id, payload); showToast('success', 'پکیج ویرایش شد') }
      else { await createTreatmentPackage(payload); showToast('success', 'پکیج اضافه شد') }
      setPkgModal(false); loadData()
    } catch { showToast('error', 'خطا در ذخیره') } finally { setSavingPkg(false) }
  }
  const handleDeletePkg = (p: TreatmentPackage) => {
    confirmAction({ type: 'delete', title: 'حذف پکیج', fields: [{ label: 'نام', value: p.name, highlight: true }], confirmLabel: 'تایید حذف', onConfirm: async () => { await deleteTreatmentPackage(p.id); showToast('success', 'حذف شد'); loadData() } })
  }

  // ── Category handlers ──
  const openCreateCat = () => { setEditingCat(null); setCatForm({ name: '', description: '' }); setCatModal(true) }
  const openEditCat = (c: InventoryCategory) => { setEditingCat(c); setCatForm({ name: c.name, description: c.description || '' }); setCatModal(true) }
  const handleSaveCat = async () => {
    if (!catForm.name.trim()) { showToast('error', 'نام دسته‌بندی الزامی است'); return }
    setSavingCat(true)
    try {
      const payload: InventoryCategoryInput = { clinic_id: CLINIC_ID, name: catForm.name.trim(), description: catForm.description || null }
      if (editingCat) { await updateInventoryCategory(editingCat.id, payload); showToast('success', 'دسته‌بندی ویرایش شد') }
      else { await createInventoryCategory(payload); showToast('success', 'دسته‌بندی اضافه شد') }
      setCatModal(false); loadData()
    } catch { showToast('error', 'خطا در ذخیره') } finally { setSavingCat(false) }
  }
  const handleDeleteCat = (c: InventoryCategory) => {
    confirmAction({ type: 'delete', title: 'حذف دسته‌بندی', fields: [{ label: 'نام', value: c.name, highlight: true }], confirmLabel: 'تایید حذف', onConfirm: async () => { await deleteInventoryCategory(c.id); showToast('success', 'حذف شد'); loadData() } })
  }

  // ── Generic CRUD list renderer ──
  function renderCrudList<T extends { id: string }>(
    items: T[],
    onEdit: (item: T) => void,
    onDelete: (item: T) => void,
    renderItem: (item: T) => React.ReactNode,
    onCreate: () => void,
    createLabel: string,
    emptyIcon: React.ReactNode,
    emptyTitle: string,
  ) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={onCreate}><Plus size={16} className="inline ml-1" /> {createLabel}</Button>
        </div>
        {items.length === 0 ? (
          <Card className="p-5"><EmptyState icon={emptyIcon} title={emptyTitle} action={<Button size="sm" onClick={onCreate}><Plus size={16} /> افزودن</Button>} /></Card>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Card key={item.id} className="p-3.5 flex items-center justify-between hover:card-shadow transition-all-smooth">
                <div className="flex-1 min-w-0">{renderItem(item)}</div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Edit2 size={15} /></button>
                  <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-error-600 hover:bg-error-50 transition-colors"><Trash2 size={15} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">تنظیمات</h1>
        <p className="text-xs text-slate-500 mt-0.5">پیکربندی و مدیریت کلینیک</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1"><Building2 size={14} className="text-primary-600" /><span className="text-[10px] text-slate-500">کلینیک</span></div>
          <p className="text-sm font-bold text-slate-800 truncate">{generalForm.clinic_name}</p>
        </div>
        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1"><Stethoscope size={14} className="text-accent-600" /><span className="text-[10px] text-slate-500">پزشکان</span></div>
          <p className="text-lg font-extrabold text-slate-800">{toPersianDigits(stats.doctors)}</p>
        </div>
        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1"><ListOrdered size={14} className="text-warning-600" /><span className="text-[10px] text-slate-500">رویه‌ها</span></div>
          <p className="text-lg font-extrabold text-slate-800">{toPersianDigits(stats.procedures)}</p>
        </div>
        <div className="quick-stat">
          <div className="flex items-center gap-1.5 mb-1"><Database size={14} className="text-success-600" /><span className="text-[10px] text-slate-500">رکوردها</span></div>
          <p className="text-lg font-extrabold text-slate-800">{toPersianDigits(totalRecords)}</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'general', label: 'عمومی', icon: <Building2 size={16} /> },
          { key: 'doctors', label: 'پزشکان و یونیت‌ها', icon: <Stethoscope size={16} /> },
          { key: 'procedures', label: 'رویه‌ها', icon: <ListOrdered size={16} /> },
          { key: 'backup', label: 'پشتیبان', icon: <Cloud size={16} /> },
          { key: 'haptics', label: 'لرزش و صدا', icon: <Vibrate size={16} /> },
          { key: 'file_number', label: 'شماره پرونده', icon: <Hash size={16} /> },
          { key: 'sms', label: 'قالب پیامک', icon: <MessageSquare size={16} /> },
          { key: 'packages', label: 'پکیج درمان', icon: <Package size={16} /> },
          { key: 'categories', label: 'دسته‌بندی انبار', icon: <Tag size={16} /> },
          { key: 'errors', label: 'گزارش خطاها', icon: <AlertTriangle size={16} /> },
          { key: 'audit', label: 'گزارش فعالیت‌ها', icon: <History size={16} /> },
          { key: 'failed_sync', label: 'همگام‌سازی ناموفق', icon: <CloudOff size={16} /> },
          { key: 'updates', label: 'به‌روزرسانی', icon: <Sparkles size={16} /> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* General Tab */}
      {activeTab === 'general' && (
        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 size={18} className="text-primary-600" /> اطلاعات کلینیک</h2>
          <div className="space-y-3">
            <Input label="نام کلینیک" value={generalForm.clinic_name} onChange={(v) => setGeneralForm({ ...generalForm, clinic_name: v })} placeholder="نام کلینیک" />
            <Textarea label="آدرس" value={generalForm.address} onChange={(v) => setGeneralForm({ ...generalForm, address: v })} placeholder="آدرس کامل کلینیک" rows={2} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="تلفن" value={generalForm.phone} onChange={(v) => setGeneralForm({ ...generalForm, phone: v })} placeholder="شماره تلفن" dir="ltr" />
              <Input label="ایمیل" value={generalForm.email} onChange={(v) => setGeneralForm({ ...generalForm, email: v })} placeholder="email@example.com" dir="ltr" />
            </div>
            <Button onClick={handleSaveGeneral} variant="primary"><Save size={16} className="inline ml-1" /> ذخیره تنظیمات</Button>
          </div>
        </Card>
      )}

      {/* Doctors & Units Tab */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Stethoscope size={16} className="text-primary-600" /> پزشکان</h3>
            </div>
            {renderCrudList(
              doctors, openEditDoctor, handleDeleteDoctor,
              (d: Doctor) => (
                <div>
                  <p className="font-bold text-sm text-slate-800">{d.name || 'بدون نام'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {d.specialty && <span className="text-[11px] text-slate-500">{d.specialty}</span>}
                    {d.license_number && <span className="text-[11px] text-slate-400">پروانه: {toPersianDigits(d.license_number)}</span>}
                    <Badge color={d.is_active ? 'success' : 'slate'}>{d.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                </div>
              ),
              openCreateDoctor, 'پزشک جدید', <Stethoscope size={28} />, 'پزشکی ثبت نشده است',
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Wrench size={16} className="text-accent-600" /> یونیت‌ها</h3>
            </div>
            {renderCrudList(
              units, openEditUnit, handleDeleteUnit,
              (u: Unit) => (
                <div>
                  <p className="font-bold text-sm text-slate-800">{u.name || `یونیت ${u.number}`}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500">شماره: {toPersianDigits(u.number || 0)}</span>
                    <Badge color={u.is_active ? 'success' : 'slate'}>{u.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                </div>
              ),
              openCreateUnit, 'یونیت جدید', <Wrench size={28} />, 'یونیتی ثبت نشده است',
            )}
          </Card>
        </div>
      )}

      {/* Procedures Tab */}
      {activeTab === 'procedures' && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><ListOrdered size={16} className="text-primary-600" /> کاتالوگ رویه‌های درمانی</h3>
          {renderCrudList(
            procedures, openEditProc, handleDeleteProc,
            (p: Procedure) => (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500 font-mono">{toPersianDigits(p.code)}</span>
                    <Badge color="primary">{getCatLabel(p.category)}</Badge>
                    {p.default_price != null && <span className="text-[11px] text-success-600 font-medium">{formatCurrency(p.default_price)} ت</span>}
                  </div>
                </div>
                {!p.is_active && <Badge color="slate">غیرفعال</Badge>}
              </div>
            ),
            openCreateProc, 'رویه جدید', <ListOrdered size={28} />, 'رویه‌ای ثبت نشده است',
          )}
        </Card>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><RefreshCw size={18} className="text-primary-600" /> وضعیت سینک</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'online' ? 'bg-success-500 animate-pulse' : syncStatus === 'syncing' ? 'bg-primary-500 animate-pulse' : syncStatus === 'offline' ? 'bg-warning-500' : 'bg-error-500'}`} />
                  <span className="text-sm font-medium text-slate-700">{syncStatus === 'online' ? 'آنلاین' : syncStatus === 'syncing' ? 'در حال سینک...' : syncStatus === 'offline' ? 'آفلاین' : 'خطا'}</span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => { h.tap(); syncNow() }}><RefreshCw size={14} className={`inline ml-1 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} /> سینک دستی</Button>
              </div>
              {pendingCount > 0 && <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-50 border border-warning-200"><AlertTriangle size={16} className="text-warning-600" /><span className="text-xs text-warning-700">{toPersianDigits(pendingCount)} تغییر در انتظار سینک</span></div>}
              {lastSync && <p className="text-xs text-slate-400">آخرین سینک: {toJalaliStringPretty(lastSync)}</p>}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Cloud size={18} className="text-primary-600" /> پشتیبان‌گیری ابری</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary-50 text-center"><p className="text-2xl font-extrabold text-primary-700">{toPersianDigits(totalRecords)}</p><p className="text-[10px] text-slate-500">کل رکوردها</p></div>
              <div className="p-3 rounded-xl bg-accent-50 text-center"><p className="text-2xl font-extrabold text-accent-700">{toPersianDigits(TABLE_NAMES.length)}</p><p className="text-[10px] text-slate-500">جداول</p></div>
            </div>
            <Button variant="primary" onClick={handleCloudBackup} disabled={backing} className="w-full">{backing ? <Spinner size={16} /> : <Cloud size={16} className="inline ml-1" />}{backing ? 'در حال پشتیبان‌گیری...' : 'پشتیبان‌گیری ابری'}</Button>
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Database size={18} className="text-primary-600" /> پشتیبان محلی</h2>
            <div className="space-y-3">
              <Button variant="secondary" onClick={handleLocalBackup} className="w-full"><Download size={16} className="inline ml-1" /> دانلود فایل پشتیبان (JSON)</Button>
              <label className="block">
                <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestore(f); e.target.value = '' }} />
                <span className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-all-smooth press-scale cursor-pointer"><Upload size={16} /> بازیابی از فایل</span>
              </label>
            </div>
          </Card>
          <AutoBackupCard />
        </div>
      )}

      {/* Error Log Tab */}
      {activeTab === 'errors' && <ErrorLogTab />}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && <AuditLogTab />}

      {/* Failed Sync Tab */}
      {activeTab === 'failed_sync' && <FailedSyncTab />}

      {/* Updates Tab */}
      {activeTab === 'updates' && <UpdatesTab />}

      {/* Haptics Tab */}
      {activeTab === 'haptics' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Vibrate size={18} className="text-primary-600" /> لرزش و بازخورد لمسی</h2>
            <div className="space-y-3">
              <button onClick={toggleHaptics} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all-smooth press-scale">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hapticsOn ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-400'}`}><Vibrate size={20} /></div>
                  <div className="text-right"><p className="text-sm font-bold text-slate-800">لرزش هپتیک</p><p className="text-[11px] text-slate-500">بازخورد لمسی</p></div>
                </div>
                <div className={`w-12 h-7 rounded-full transition-all-smooth relative ${hapticsOn ? 'bg-primary-500' : 'bg-slate-300'}`}><div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all-smooth ${hapticsOn ? 'left-0.5' : 'right-0.5'}`} /></div>
              </button>
              <button onClick={toggleSound} className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all-smooth press-scale">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${soundOn ? 'bg-accent-100 text-accent-600' : 'bg-slate-200 text-slate-400'}`}><Volume2 size={20} /></div>
                  <div className="text-right"><p className="text-sm font-bold text-slate-800">صدای رابط</p><p className="text-[11px] text-slate-500">افکت‌های صوتی</p></div>
                </div>
                <div className={`w-12 h-7 rounded-full transition-all-smooth relative ${soundOn ? 'bg-accent-500' : 'bg-slate-300'}`}><div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all-smooth ${soundOn ? 'left-0.5' : 'right-0.5'}`} /></div>
              </button>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">تست بازخورد</h3>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => h.tap()} className="p-3 rounded-xl bg-primary-50 text-primary-600 text-xs font-bold text-center transition-all-smooth press-scale">ضربه سبک</button>
              <button onClick={() => h.success()} className="p-3 rounded-xl bg-success-50 text-success-600 text-xs font-bold text-center transition-all-smooth press-scale">موفقیت</button>
              <button onClick={() => h.error()} className="p-3 rounded-xl bg-error-50 text-error-600 text-xs font-bold text-center transition-all-smooth press-scale">خطا</button>
            </div>
          </Card>
        </div>
      )}

      {/* File Number Tab */}
      {activeTab === 'file_number' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Hash size={18} className="text-primary-600" /> پیکربندی شماره پرونده</h2>
            <div className="space-y-3">
              <Input label="پیشوند" value={fileNumberForm.prefix} onChange={(v) => setFileNumberForm({ ...fileNumberForm, prefix: v })} placeholder="مثلا: MIN" />
              <Input label="شماره بعدی" type="number" value={fileNumberForm.next_number} onChange={(v) => setFileNumberForm({ ...fileNumberForm, next_number: v })} placeholder="1001" />
              <Select label="فرمت" value={fileNumberForm.format} onChange={(v) => setFileNumberForm({ ...fileNumberForm, format: v })} options={[{ value: 'PREFIX-NUMBER', label: 'پیشوند - شماره (MIN-01001)' }, { value: 'PREFIX/NUMBER', label: 'پیشوند / شماره (MIN/01001)' }, { value: 'NUMBER-PREFIX', label: 'شماره - پیشوند (01001-MIN)' }, { value: 'NUMBER', label: 'فقط شماره (01001)' }]} />
              <Button onClick={handleSaveFileNumber} variant="primary"><Save size={16} className="inline ml-1" /> ذخیره تنظیمات</Button>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">پیش‌نمایش زنده</h3>
            <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[160px]">
              <p className="text-xs text-slate-500 mb-2">نمونه شماره پرونده</p>
              <p className="text-3xl font-bold text-primary-700 tracking-wider">{fileNumberPreview}</p>
            </div>
          </Card>
        </div>
      )}

      {/* SMS Templates Tab */}
      {activeTab === 'sms' && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><MessageSquare size={16} className="text-primary-600" /> قالب‌های پیامک</h3>
          {renderCrudList(
            smsTemplates, openEditTpl, handleDeleteTpl,
            (t: SmsTemplate) => (
              <div>
                <p className="font-bold text-sm text-slate-800">{t.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge color="accent">{getTemplateTypeLabel(t.type)}</Badge>
                  <Badge color={t.is_active ? 'success' : 'slate'}>{t.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                  <span className="text-[11px] text-slate-400 truncate">{t.template.slice(0, 40)}...</span>
                </div>
              </div>
            ),
            openCreateTpl, 'قالب جدید', <MessageSquare size={28} />, 'قالب پیامکی ثبت نشده است',
          )}
        </Card>
      )}

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Package size={16} className="text-primary-600" /> پکیج‌های درمانی</h3>
          {renderCrudList(
            packages, openEditPkg, handleDeletePkg,
            (p: TreatmentPackage) => (
              <div>
                <p className="font-bold text-sm text-slate-800">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {p.total_price != null && <span className="text-[11px] text-success-600 font-medium">{formatCurrency(p.total_price)} ت</span>}
                  {p.discount_percentage != null && p.discount_percentage > 0 && <Badge color="success">{toPersianDigits(p.discount_percentage)}٪ تخفیف</Badge>}
                  <Badge color={p.is_active ? 'success' : 'slate'}>{p.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                </div>
              </div>
            ),
            openCreatePkg, 'پکیج جدید', <Package size={28} />, 'پکیج درمانی ثبت نشده است',
          )}
        </Card>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Tag size={16} className="text-primary-600" /> دسته‌بندی‌های انبار</h3>
          {renderCrudList(
            categories, openEditCat, handleDeleteCat,
            (c: InventoryCategory) => (
              <div>
                <p className="font-bold text-sm text-slate-800">{c.name}</p>
                {c.description && <p className="text-[11px] text-slate-500 truncate">{c.description}</p>}
              </div>
            ),
            openCreateCat, 'دسته‌بندی جدید', <Tag size={28} />, 'دسته‌بندی ثبت نشده است',
          )}
        </Card>
      )}

      {/* ── Modals ── */}
      <Modal open={doctorModal} onClose={() => setDoctorModal(false)} title={editingDoctor ? 'ویرایش پزشک' : 'پزشک جدید'} size="full">
        <div className="space-y-3">
          <Input label="نام و نام خانوادگی" value={doctorForm.name} onChange={(v) => setDoctorForm({ ...doctorForm, name: v })} placeholder="مثلا: دکتر احمدی" />
          <Input label="تخصص" value={doctorForm.specialty} onChange={(v) => setDoctorForm({ ...doctorForm, specialty: v })} placeholder="مثلا: دندانپزشک عمومی" />
          <Input label="شماره پروانه" value={doctorForm.license_number} onChange={(v) => setDoctorForm({ ...doctorForm, license_number: v })} placeholder="شماره پروانه" dir="ltr" />
          <Select label="وضعیت" value={doctorForm.is_active} onChange={(v) => setDoctorForm({ ...doctorForm, is_active: v })} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} />

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">رنگ پزشک (برای نوبت‌دهی و تقویم)</p>
            <div className="flex flex-wrap gap-2.5">
              {DOCTOR_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDoctorForm({ ...doctorForm, color: c })}
                  aria-label={`انتخاب رنگ ${c}`}
                  className={`w-9 h-9 rounded-full transition-all-smooth ${doctorForm.color === c ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-slate-200 scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {editingDoctor && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">برنامه‌ی کاری هفتگی</p>
              <p className="text-xs text-slate-400 mb-3">روزهایی که پزشک کار نمی‌کند را خاموش بگذارید. این برنامه در نوبت‌دهی برای هشدار تداخل با ساعت کاری استفاده می‌شود.</p>
              <div className="space-y-2">
                {weekdays.map((label, day) => {
                  const sched = getDaySchedule(day)
                  return (
                    <div key={day} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <button
                        onClick={() => toggleDay(day)}
                        role="switch" aria-checked={!!sched}
                        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${sched ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${sched ? 'right-0.5' : 'right-4.5'}`} />
                      </button>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-16 shrink-0">{label}</span>
                      {sched ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input type="time" value={sched.start_time} onChange={(e) => updateDayTime(day, 'start_time', e.target.value)} className="flex-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-xs bg-white dark:bg-slate-700" />
                          <span className="text-slate-400 text-xs">تا</span>
                          <input type="time" value={sched.end_time} onChange={(e) => updateDayTime(day, 'end_time', e.target.value)} className="flex-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-xs bg-white dark:bg-slate-700" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">تعطیل</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <Button variant="secondary" size="sm" onClick={handleSaveSchedule} disabled={savingSchedule} className="w-full justify-center mt-3">
                {savingSchedule ? <Spinner size={14} /> : 'ذخیره‌ی برنامه‌ی کاری'}
              </Button>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><Button variant="secondary" onClick={() => setDoctorModal(false)}>انصراف</Button><Button variant="primary" onClick={handleSaveDoctor} disabled={savingDoctor}>{savingDoctor ? <Spinner size={16} /> : editingDoctor ? 'ذخیره' : 'افزودن'}</Button></div>
        </div>
      </Modal>

      <Modal open={unitModal} onClose={() => setUnitModal(false)} title={editingUnit ? 'ویرایش یونیت' : 'یونیت جدید'} size="full">
        <div className="space-y-3">
          <Input label="نام یونیت" value={unitForm.name} onChange={(v) => setUnitForm({ ...unitForm, name: v })} placeholder="مثلا: یونیت ۱" />
          <Input label="شماره" type="number" value={unitForm.number} onChange={(v) => setUnitForm({ ...unitForm, number: v })} placeholder="1" dir="ltr" />
          <Select label="وضعیت" value={unitForm.is_active} onChange={(v) => setUnitForm({ ...unitForm, is_active: v })} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><Button variant="secondary" onClick={() => setUnitModal(false)}>انصراف</Button><Button variant="primary" onClick={handleSaveUnit} disabled={savingUnit}>{savingUnit ? <Spinner size={16} /> : editingUnit ? 'ذخیره' : 'افزودن'}</Button></div>
        </div>
      </Modal>

      <Modal open={procModal} onClose={() => setProcModal(false)} title={editingProc ? 'ویرایش رویه' : 'رویه جدید'} size="full">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="کد" value={procForm.code} onChange={(v) => setProcForm({ ...procForm, code: v })} placeholder="مثلا: RCT" dir="ltr" />
            <Input label="قیمت پیش‌فرض" value={procForm.default_price} onChange={(v) => setProcForm({ ...procForm, default_price: v })} placeholder="تومان" dir="ltr" />
          </div>
          <Input label="نام رویه" value={procForm.name} onChange={(v) => setProcForm({ ...procForm, name: v })} placeholder="نام رویه درمانی" />
          <Select label="دسته‌بندی" value={procForm.category} onChange={(v) => setProcForm({ ...procForm, category: v })} options={procedureCategories.map((c) => ({ value: c.value, label: c.label }))} />
          <Textarea label="توضیحات" value={procForm.description} onChange={(v) => setProcForm({ ...procForm, description: v })} placeholder="توضیحات..." rows={2} />
          <Select label="وضعیت" value={procForm.is_active} onChange={(v) => setProcForm({ ...procForm, is_active: v })} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><Button variant="secondary" onClick={() => setProcModal(false)}>انصراف</Button><Button variant="primary" onClick={handleSaveProc} disabled={savingProc}>{savingProc ? <Spinner size={16} /> : editingProc ? 'ذخیره' : 'افزودن'}</Button></div>
        </div>
      </Modal>

      <Modal open={tplModal} onClose={() => setTplModal(false)} title={editingTpl ? 'ویرایش قالب پیامک' : 'قالب پیامک جدید'} size="full">
        <div className="space-y-3">
          <Input label="نام قالب" value={tplForm.name} onChange={(v) => setTplForm({ ...tplForm, name: v })} placeholder="نام قالب" />
          <Select label="نوع" value={tplForm.type} onChange={(v) => setTplForm({ ...tplForm, type: v })} options={smsTemplateTypes} />
          <Textarea label="محتوای قالب" value={tplForm.template} onChange={(v) => setTplForm({ ...tplForm, template: v })} placeholder="متن پیامک... از {name} و {date} استفاده کنید" rows={4} />
          <Select label="وضعیت" value={tplForm.is_active} onChange={(v) => setTplForm({ ...tplForm, is_active: v })} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><Button variant="secondary" onClick={() => setTplModal(false)}>انصراف</Button><Button variant="primary" onClick={handleSaveTpl} disabled={savingTpl}>{savingTpl ? <Spinner size={16} /> : editingTpl ? 'ذخیره' : 'افزودن'}</Button></div>
        </div>
      </Modal>

      <Modal open={pkgModal} onClose={() => setPkgModal(false)} title={editingPkg ? 'ویرایش پکیج' : 'پکیج درمانی جدید'} size="full">
        <div className="space-y-3">
          <Input label="نام پکیج" value={pkgForm.name} onChange={(v) => setPkgForm({ ...pkgForm, name: v })} placeholder="نام پکیج" />
          <Textarea label="توضیحات" value={pkgForm.description} onChange={(v) => setPkgForm({ ...pkgForm, description: v })} placeholder="توضیحات پکیج..." rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="قیمت کل" value={pkgForm.total_price} onChange={(v) => setPkgForm({ ...pkgForm, total_price: v })} placeholder="تومان" dir="ltr" />
            <Input label="درصد تخفیف" value={pkgForm.discount_percentage} onChange={(v) => setPkgForm({ ...pkgForm, discount_percentage: v })} placeholder="مثلا: 10" dir="ltr" />
          </div>
          <Select label="وضعیت" value={pkgForm.is_active} onChange={(v) => setPkgForm({ ...pkgForm, is_active: v })} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><Button variant="secondary" onClick={() => setPkgModal(false)}>انصراف</Button><Button variant="primary" onClick={handleSavePkg} disabled={savingPkg}>{savingPkg ? <Spinner size={16} /> : editingPkg ? 'ذخیره' : 'افزودن'}</Button></div>
        </div>
      </Modal>

      <Modal open={catModal} onClose={() => setCatModal(false)} title={editingCat ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'} size="full">
        <div className="space-y-3">
          <Input label="نام" value={catForm.name} onChange={(v) => setCatForm({ ...catForm, name: v })} placeholder="نام دسته‌بندی" />
          <Textarea label="توضیحات" value={catForm.description} onChange={(v) => setCatForm({ ...catForm, description: v })} placeholder="توضیحات..." rows={2} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><Button variant="secondary" onClick={() => setCatModal(false)}>انصراف</Button><Button variant="primary" onClick={handleSaveCat} disabled={savingCat}>{savingCat ? <Spinner size={16} /> : editingCat ? 'ذخیره' : 'افزودن'}</Button></div>
        </div>
      </Modal>

      {ConfirmActionModal}
    </div>
  )
}

// ============================================================================
// Error Log Tab — self-hosted error monitoring (no external service needed)
// ============================================================================

function ErrorLogTab() {
  const [errors, setErrors] = useState<LoggedError[]>(() => getErrorLog())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleClear = () => {
    if (!window.confirm('همه‌ی گزارش‌های خطا پاک شوند؟')) return
    clearErrorLog()
    setErrors([])
    showToast('success', 'گزارش خطاها پاک شد')
  }

  const handleCopyAll = () => {
    const text = errors.map((e) => `[${e.timestamp}] (${e.source}) ${e.message}${e.stack ? `\n${e.stack}` : ''}`).join('\n\n---\n\n')
    navigator.clipboard.writeText(text || 'بدون خطا').then(() => showToast('success', 'کپی شد'))
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle size={18} className="text-primary-600" /> گزارش خطاهای برنامه
          </h2>
          <Badge color={errors.length > 0 ? 'error' : 'success'}>{toPersianDigits(errors.length)}</Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          چون سرویس گزارش خطای بیرونی (مثل Sentry) به این پروژه وصل نشده، خطاهایی که برای کاربران رخ می‌دهد اینجا به‌صورت محلی روی همان دستگاه ذخیره می‌شود (حداکثر ۵۰ مورد آخر). اگر می‌خواهید یک سرویس حرفه‌ای‌تر وصل شود، به من بگو.
        </p>

        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-success-50 dark:bg-success-900/20 flex items-center justify-center mb-3">
              <CheckCircle2 size={24} className="text-success-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">تا الان هیچ خطایی ثبت نشده 🎉</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="secondary" onClick={handleCopyAll}><Copy size={14} className="inline ml-1" /> کپی همه</Button>
              <Button size="sm" variant="danger" onClick={handleClear}><Trash2 size={14} className="inline ml-1" /> پاک کردن</Button>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 -mr-1">
              {errors.map((err) => (
                <div key={err.id} className="p-3 rounded-xl bg-error-50 dark:bg-error-900/10 border border-error-100 dark:border-error-800 cursor-pointer" onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-error-700 dark:text-error-300 break-words flex-1">{err.message}</p>
                    <Badge color="slate">{err.source}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{toJalaliStringPretty(err.timestamp)}</p>
                  {expandedId === err.id && err.stack && (
                    <pre className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap break-all bg-white dark:bg-slate-900 rounded-lg p-2 max-h-[200px] overflow-y-auto">{err.stack}</pre>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// ============================================================================
// Auto Backup Card — shows the automatic daily on-device snapshots
// ============================================================================

function AutoBackupCard() {
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<number | null>(null)

  const load = () => { listBackupSnapshots().then((s) => { setSnapshots(s); setLoading(false) }) }
  useEffect(() => { load() }, [])

  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    if (!window.confirm(`بازگردانی به نسخه‌ی ${toJalaliStringPretty(snap.created_at)}؟ داده‌های فعلی جایگزین می‌شوند.`)) return
    setRestoring(snap.id ?? -1)
    restoreFromSnapshot(snap)
      .then(() => { showToast('success', 'بازیابی انجام شد — صفحه در حال بارگذاری مجدد است'); setTimeout(() => window.location.reload(), 1200) })
      .catch(() => showToast('error', 'خطا در بازیابی'))
      .finally(() => setRestoring(null))
  }

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <RefreshCw size={18} className="text-primary-600" /> پشتیبان خودکار روزانه
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        هر روز که برنامه باز می‌شود، یک نسخه‌ی کامل از داده‌ها به‌صورت خودکار داخل همین دستگاه ذخیره می‌شود (۷ روز آخر نگه داشته می‌شود).
      </p>
      {loading ? (
        <Spinner size={20} />
      ) : snapshots.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">هنوز نسخه‌ی خودکاری ساخته نشده — فردا که برنامه باز شود، اولین نسخه ساخته می‌شود.</p>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => (
            <div key={snap.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{toJalaliStringPretty(snap.created_at)}</p>
                <p className="text-[11px] text-slate-400">{toPersianDigits(snap.record_count)} رکورد</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => handleRestoreSnapshot(snap)} disabled={restoring !== null}>
                {restoring === snap.id ? <Spinner size={14} /> : 'بازیابی'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ============================================================================
// Audit Log Tab — who changed what, when
// ============================================================================

function AuditLogTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAuditLog(150).then((e) => { setEntries(e); setLoading(false) }) }, [])

  const handleClear = () => {
    if (!window.confirm('گزارش فعالیت‌ها پاک شود؟')) return
    clearAuditLog().then(() => { setEntries([]); showToast('success', 'گزارش فعالیت‌ها پاک شد') })
  }

  const opColor: Record<string, string> = { insert: 'success', update: 'primary', delete: 'error' }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <History size={18} className="text-primary-600" /> گزارش فعالیت‌ها
          </h2>
          {entries.length > 0 && <Button size="sm" variant="danger" onClick={handleClear}><Trash2 size={14} className="inline ml-1" /> پاک کردن</Button>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          هر ثبت، ویرایش یا حذف در برنامه اینجا با زمان و کاربر انجام‌دهنده ثبت می‌شود. تا وقتی سیستم ورود فعال نشده، همه‌چیز به نام «کاربر سیستم» ثبت می‌شود.
        </p>
        {loading ? (
          <Spinner size={20} />
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">هنوز فعالیتی ثبت نشده</p>
        ) : (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 -mr-1">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <Badge color={opColor[e.operation] || 'slate'}>{e.summary}</Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex-1 truncate">{e.actor_name}</span>
                <span className="text-[10px] text-slate-400">{toJalaliStringPretty(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ============================================================================
// Failed Sync Tab — data that could NOT reach the server after repeated
// retries. Never auto-deleted; the admin sees and resolves it here.
// ============================================================================

const TABLE_LABELS_FA: Record<string, string> = {
  patients: 'بیمار', doctors: 'پزشک', units: 'یونیت', appointments: 'نوبت',
  encounters: 'ویزیت', treatments: 'درمان', payments: 'پرداخت', procedures: 'رویه درمانی',
  laboratories: 'لابراتوار', lab_orders: 'سفارش لابراتوار', insurance_companies: 'شرکت بیمه',
  insurance_claims: 'ادعای بیمه', prescriptions: 'نسخه', radiology_images: 'تصویر رادیولوژی',
  treatment_phases: 'فاز درمان', waiting_list: 'لیست انتظار', staff: 'پرسنل', expenses: 'هزینه',
  treatment_packages: 'پکیج درمان', consent_forms: 'فرم رضایت', tooth_records: 'رکورد دندان',
  inventory_items: 'قلم انبار', inventory_categories: 'دسته‌بندی انبار', payment_plans: 'طرح قسطی',
  installments: 'قسط', cheques: 'چک', doctor_schedules: 'برنامه پزشک', implant_cases: 'مورد ایمپلنت',
  implant_components: 'کامپوننت ایمپلنت', sms_templates: 'قالب پیامک',
}
const OP_LABELS_FA: Record<string, string> = { insert: 'ثبت', update: 'ویرایش', delete: 'حذف' }

function FailedSyncTab() {
  const [entries, setEntries] = useState<SyncQueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = () => { getFailedSyncEntries().then((e) => { setEntries(e); setLoading(false) }) }
  useEffect(() => { load() }, [])

  const handleRetry = async (id: number) => {
    setBusyId(id)
    await retryFailedEntry(id)
    showToast('success', 'دوباره در صف همگام‌سازی قرار گرفت')
    setBusyId(null)
    load()
  }

  const handleRetryAll = async () => {
    setBusyId(-1)
    await retryAllFailedEntries()
    showToast('success', 'همه موارد دوباره در صف قرار گرفتند')
    setBusyId(null)
    load()
  }

  const handleDiscard = async (entry: SyncQueueEntry) => {
    if (!window.confirm(`این مورد («${OP_LABELS_FA[entry.operation]} ${TABLE_LABELS_FA[entry.table_name] || entry.table_name}») برای همیشه نادیده گرفته شود؟ این کار قابل بازگشت نیست.`)) return
    if (!entry.id) return
    await discardFailedEntry(entry.id)
    showToast('success', 'نادیده گرفته شد')
    load()
  }

  const handleCopy = (entry: SyncQueueEntry) => {
    navigator.clipboard.writeText(JSON.stringify(entry.data, null, 2)).then(() => showToast('success', 'کپی شد'))
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CloudOff size={18} className="text-error-600" /> همگام‌سازی‌های ناموفق
          </h2>
          {entries.length > 0 && <Button size="sm" variant="primary" onClick={handleRetryAll} disabled={busyId !== null}>تلاش مجدد همه</Button>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          این‌ها تغییراتی هستند که بعد از ۱۰ بار تلاش به سرور ابری نرسیدند — روی همین دستگاه محفوظ مانده‌اند و <b>هرگز خودکار پاک نمی‌شوند</b>. معمولاً با اتصال اینترنت بهتر و «تلاش مجدد» حل می‌شود.
        </p>
        {loading ? (
          <Spinner size={20} />
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-success-50 dark:bg-success-900/20 flex items-center justify-center mb-3">
              <CheckCircle2 size={24} className="text-success-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">همه‌چیز با موفقیت همگام‌سازی شده — چیزی گم نشده 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="p-3 rounded-xl bg-error-50 dark:bg-error-900/10 border border-error-100 dark:border-error-800">
                <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setExpandedId(expandedId === entry.id ? null : (entry.id ?? null))}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-error-700 dark:text-error-300">{OP_LABELS_FA[entry.operation]} {TABLE_LABELS_FA[entry.table_name] || entry.table_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{entry.last_error || 'خطای نامشخص'}</p>
                  </div>
                  <Badge color="error">{toPersianDigits(entry.retry_count)} بار تلاش</Badge>
                </div>
                {expandedId === entry.id && (
                  <pre className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap break-all bg-white dark:bg-slate-900 rounded-lg p-2 max-h-[160px] overflow-y-auto">{JSON.stringify(entry.data, null, 2)}</pre>
                )}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="primary" onClick={() => entry.id && handleRetry(entry.id)} disabled={busyId !== null}>
                    {busyId === entry.id ? <Spinner size={14} /> : 'تلاش مجدد'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleCopy(entry)}><Copy size={13} className="inline ml-1" /> کپی داده</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDiscard(entry)}>نادیده بگیر</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ============================================================================
// Updates Tab — real version number, manual + automatic update checking
// ============================================================================

const AUTO_CHECK_STORAGE_KEY = 'minadent-auto-update-check'

function UpdatesTab() {
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [result, setResult] = useState<{ updateAvailable: boolean; remoteVersion: string | null; remoteBuildDate: string | null } | null>(null)
  const [autoCheck, setAutoCheck] = useState(() => localStorage.getItem(AUTO_CHECK_STORAGE_KEY) !== 'false')
  const [applying, setApplying] = useState(false)

  const handleCheck = async () => {
    setChecking(true)
    const r = await checkForUpdate()
    setResult(r)
    setLastChecked(new Date())
    setChecking(false)
    if (!r.updateAvailable) showToast('success', 'شما آخرین نسخه را دارید')
  }

  useEffect(() => { handleCheck() }, [])

  const toggleAutoCheck = () => {
    const next = !autoCheck
    setAutoCheck(next)
    localStorage.setItem(AUTO_CHECK_STORAGE_KEY, String(next))
    showToast('success', next ? 'بررسی خودکار فعال شد' : 'بررسی خودکار غیرفعال شد')
  }

  const handleApply = async () => {
    setApplying(true)
    await applyUpdate()
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-600" /> نسخه و به‌روزرسانی
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-[11px] text-slate-400 mb-0.5">نسخه‌ی نصب‌شده</p>
            <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">{APP_VERSION}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-[11px] text-slate-400 mb-0.5">تاریخ ساخت</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{toJalaliStringPretty(BUILD_DATE)}</p>
          </div>
        </div>

        {result?.updateAvailable ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-l from-violet-50 to-sky-50 dark:from-violet-900/20 dark:to-sky-900/20 border border-violet-100 dark:border-violet-800 mb-4">
            <p className="text-sm font-bold text-violet-700 dark:text-violet-300 mb-1">نسخه‌ی {result.remoteVersion} موجود است</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">با به‌روزرسانی، آخرین اصلاحات و قابلیت‌ها اعمال می‌شود.</p>
            <Button variant="primary" onClick={handleApply} disabled={applying} className="w-full justify-center">
              {applying ? <Spinner size={16} /> : 'به‌روزرسانی الان'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-100 dark:border-success-800 mb-4">
            <CheckCircle2 size={18} className="text-success-600 shrink-0" />
            <p className="text-sm font-semibold text-success-700 dark:text-success-300">شما آخرین نسخه را استفاده می‌کنید</p>
          </div>
        )}

        <Button variant="secondary" onClick={handleCheck} disabled={checking} className="w-full justify-center mb-3">
          {checking ? <Spinner size={16} /> : <><RefreshCw size={15} className="inline ml-1.5" /> بررسی دستی به‌روزرسانی</>}
        </Button>

        {lastChecked && (
          <p className="text-[11px] text-slate-400 text-center mb-3">آخرین بررسی: {toJalaliStringPretty(lastChecked.toISOString())}</p>
        )}

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">بررسی خودکار به‌روزرسانی</span>
          <button
            onClick={toggleAutoCheck}
            role="switch"
            aria-checked={autoCheck}
            className={`relative w-11 h-6 rounded-full transition-colors ${autoCheck ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoCheck ? 'right-0.5' : 'right-5'}`} />
          </button>
        </label>
        <p className="text-[11px] text-slate-400 mt-2">در صورت فعال بودن، هر ۱۵ دقیقه و هنگام بازگشت به برنامه، به‌صورت خودکار بررسی می‌شود.</p>
      </Card>
    </div>
  )
}
