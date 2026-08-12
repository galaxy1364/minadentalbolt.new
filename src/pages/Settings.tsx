// Settings.tsx — Full management: doctors, units, procedures, SMS, packages, categories
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Settings as SettingsIcon, Building2, Hash, MessageSquare, Package, Save, Smile,
  Cloud, Download, Upload, Vibrate, Volume2, Bell, Database, RefreshCw, Check,
  Smartphone, Shield, AlertTriangle, Eye, ChevronRight, Wifi, Plus, Edit2, Trash2,
  Stethoscope, Wrench, ListOrdered, Tag,
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
} from '../lib/api'
import { db, TABLE_NAMES } from '../lib/db'
import { syncNow, subscribeSync, SyncStatus } from '../lib/sync'
import { toJalaliString, toJalaliStringPretty, formatCurrency, formatNumber, toPersianDigits } from '../lib/persianDate'
import {
  SmsTemplate, TreatmentPackage, Doctor, Unit, Procedure, InventoryCategory,
  DoctorInput, UnitInput, ProcedureInput, SmsTemplateInput, TreatmentPackageInput, InventoryCategoryInput,
} from '../types'
import { Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, StatCard, Tabs, Modal, showToast } from '../components/ui'
import { useConfirmAction } from '../components/ConfirmAction'
import { h, setHapticsEnabled, setSoundEnabled, getHapticsEnabled, getSoundEnabled } from '../lib/haptics'
import { CLINIC_ID } from '../lib/supabase'

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
  const [doctorForm, setDoctorForm] = useState({ name: '', specialty: '', license_number: '', is_active: 'true' })
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
  const openCreateDoctor = () => { setEditingDoctor(null); setDoctorForm({ name: '', specialty: '', license_number: '', is_active: 'true' }); setDoctorModal(true) }
  const openEditDoctor = (d: Doctor) => { setEditingDoctor(d); setDoctorForm({ name: d.name || '', specialty: d.specialty || '', license_number: d.license_number || '', is_active: d.is_active ? 'true' : 'false' }); setDoctorModal(true) }
  const handleSaveDoctor = async () => {
    if (!doctorForm.name.trim()) { showToast('error', 'نام پزشک الزامی است'); return }
    setSavingDoctor(true)
    try {
      const payload: DoctorInput = { clinic_id: CLINIC_ID, user_id: null, name: doctorForm.name.trim(), specialty: doctorForm.specialty.trim() || null, license_number: doctorForm.license_number || null, is_active: doctorForm.is_active === 'true' }
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
        </div>
      )}

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
