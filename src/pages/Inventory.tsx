// Inventory.tsx - Persian RTL Dental Clinic Inventory Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Boxes, Search, Plus, Edit2, Trash2, AlertTriangle, TrendingDown, PackageCheck, Smile, ScanLine } from 'lucide-react'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchInventoryItems, fetchInventoryCategories, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../lib/api'
import { toJalaliString, toJalaliStringPretty, formatCurrency, formatNumber, toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { useConfirmAction } from '../components/ConfirmAction'
import { InventoryItem, InventoryItemWithRelations, InventoryCategory } from '../types'
import { Wizard, Card, Button, Input, Select, Textarea, Badge, Spinner, EmptyState, Tabs, showToast } from '../components/ui'
import { scoreFields } from '../lib/fuzzySearch'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'
import { CurrencyInput } from '../components/CurrencyInput'

// ============================================================================
// Constants
// ============================================================================

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16']

const itemUnits = [
  { value: 'piece', label: 'عدد' },
  { value: 'box', label: 'جعبه' },
  { value: 'pack', label: 'بسته' },
  { value: 'bottle', label: 'بطری' },
  { value: 'tube', label: 'تیوب' },
  { value: 'set', label: 'ست' },
  { value: 'gram', label: 'گرم' },
  { value: 'milliliter', label: 'میلی‌لیتر' },
]

function getStockStatus(item: InventoryItemWithRelations): { label: string; color: string } {
  const qty = item.quantity ?? 0
  const min = item.min_quantity ?? 0
  if (qty <= 0) return { label: 'ناموجود', color: 'error' }
  if (min > 0 && qty <= min) return { label: 'رو به اتمام', color: 'warning' }
  return { label: 'موجود', color: 'success' }
}

function getUnitLabel(unit: string | null) {
  if (!unit) return 'عدد'
  return itemUnits.find((u) => u.value === unit)?.label || unit
}

// ============================================================================
// Main Component
// ============================================================================

export default function Inventory() {
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('items')
  const [items, setItems] = useState<InventoryItemWithRelations[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [invWizardStep, setInvWizardStep] = useState(0)
  const [editingItem, setEditingItem] = useState<InventoryItemWithRelations | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category_id: '',
    unit: 'piece',
    quantity: '',
    min_quantity: '',
    unit_cost: '',
    supplier: '',
    location: '',
    notes: '',
    barcode: '',
  })
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanMode, setScanMode] = useState<'quick' | 'form'>('quick')

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [its, cats] = await Promise.all([
        fetchInventoryItems(),
        fetchInventoryCategories(),
      ])
      setItems(its)
      setCategories(cats)
    } catch (err) {
      console.error('Error loading inventory:', err)
      showToast('error', 'خطا در بارگذاری انبار')
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

  const filteredItems = useMemo(() => {
    let result = items.filter((i) => {
      if (lowStockOnly) {
        const qty = i.quantity ?? 0
        const min = i.min_quantity ?? 0
        if (qty > min) return false
      }
      if (filterCategory && i.category_id !== filterCategory) return false
      return true
    })
    if (searchQuery.trim()) {
      const scored = result
        .map((i) => ({
          item: i,
          score: scoreFields(searchQuery, [
            { value: i.name, weight: 1.2 },
            { value: i.brand || '', weight: 0.9 },
          ]),
        }))
        .filter((r) => r.score !== null) as { item: typeof result[number]; score: number }[]
      scored.sort((a, b) => b.score - a.score)
      result = scored.map((r) => r.item)
    }
    return result
  }, [items, searchQuery, lowStockOnly, filterCategory])

  const stats = useMemo(() => {
    const totalItems = items.length
    const lowStock = items.filter((i) => {
      const qty = i.quantity ?? 0
      const min = i.min_quantity ?? 0
      return min > 0 && qty <= min && qty > 0
    }).length
    const outOfStock = items.filter((i) => (i.quantity ?? 0) <= 0).length
    const totalValue = items.reduce((sum, i) => sum + (i.quantity ?? 0) * (i.unit_cost ?? 0), 0)
    return { totalItems, lowStock, outOfStock, totalValue }
  }, [items])

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    items.forEach((i) => {
      const name = i.category?.name || 'بدون دسته'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [items])

  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({ value: c.id, label: c.name }))
  }, [categories])

  // ===========================================================================
  // Modal Handlers
  // ===========================================================================

  const openCreateModal = () => {
    h.tap()
    setEditingItem(null)
    setInvWizardStep(0)
    setFormData({
      name: '', brand: '', category_id: '', unit: 'piece',
      quantity: '', min_quantity: '', unit_cost: '', supplier: '', location: '', notes: '', barcode: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (item: InventoryItemWithRelations) => {
    h.tap()
    setEditingItem(item)
    setFormData({
      name: item.name,
      brand: item.brand || '',
      category_id: item.category_id || '',
      unit: item.unit || 'piece',
      quantity: item.quantity != null ? String(item.quantity) : '',
      min_quantity: item.min_quantity != null ? String(item.min_quantity) : '',
      unit_cost: item.unit_cost != null ? String(item.unit_cost) : '',
      supplier: item.supplier || '',
      location: item.location || '',
      notes: item.notes || '',
      barcode: item.barcode || '',
    })
    setInvWizardStep(0)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) { showToast('error', 'نام اقلام الزامی است'); return }
    const payload = {
      name: formData.name.trim(),
      brand: formData.brand || null, category_id: formData.category_id || null,
      unit: formData.unit, quantity: formData.quantity ? Number(formData.quantity) : 0,
      min_quantity: formData.min_quantity ? Number(formData.min_quantity) : 0,
      unit_cost: formData.unit_cost ? Number(formData.unit_cost) : null,
      supplier: formData.supplier || null, location: formData.location || null,
      notes: formData.notes || null, is_active: true, barcode: formData.barcode || null,
    } as any
    confirmAction({
      type: editingItem ? 'edit' : 'create',
      title: editingItem ? 'ویرایش اقلام' : 'افزودن اقلام جدید',
      fields: [
        { label: 'نام', value: payload.name, highlight: true },
        { label: 'برند', value: payload.brand || '-' },
        { label: 'تعداد', value: toPersianDigits(payload.quantity) },
        { label: 'قیمت واحد', value: payload.unit_cost ? `${formatCurrency(payload.unit_cost)} ت` : '-' },
      ],
      confirmLabel: editingItem ? 'ذخیره' : 'ایجاد',
      onConfirm: async () => {
        setSaving(true)
        try {
          if (editingItem) { await updateInventoryItem(editingItem.id, payload); showToast('success', 'ویرایش شد') }
          else { await createInventoryItem(payload); showToast('success', 'ایجاد شد') }
          setModalOpen(false); await loadData()
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSaving(false) }
      },
    })
  }

  // Scan-to-find-or-create: if a matching barcode already exists, offer
  // a one-tap quantity increment (the real workflow when receiving a
  // fresh delivery of something already stocked); otherwise open the
  // create form with the scanned code pre-filled so nothing needs
  // retyping.
  const handleBarcodeScanned = (code: string) => {
    setScannerOpen(false)
    if (scanMode === 'form') {
      setFormData((p) => ({ ...p, barcode: code }))
      showToast('success', 'بارکد ثبت شد')
      return
    }
    const existing = items.find((i) => i.barcode === code)
    if (existing) {
      confirmAction({
        type: 'status',
        title: 'اقلام موجود پیدا شد',
        fields: [
          { label: 'نام', value: existing.name, highlight: true },
          { label: 'موجودی فعلی', value: toPersianDigits(existing.quantity || 0) },
        ],
        confirmLabel: 'افزودن ۱ عدد به موجودی',
        onConfirm: async () => {
          try {
            await updateInventoryItem(existing.id, { quantity: (existing.quantity || 0) + 1 } as any)
            showToast('success', 'موجودی افزایش یافت')
            await loadData()
          } catch { showToast('error', 'خطا در به‌روزرسانی') }
        },
      })
    } else {
      setEditingItem(null)
      setFormData({ name: '', brand: '', category_id: '', unit: 'piece', quantity: '1', min_quantity: '', unit_cost: '', supplier: '', location: '', notes: '', barcode: code })
      showToast('success', 'بارکد جدید — اطلاعات اقلام را کامل کنید')
      setModalOpen(true)
    }
  }

  const handleDelete = (item: InventoryItemWithRelations) => {
    h.warning()
    confirmAction({
      type: 'delete',
      title: 'حذف اقلام',
      warning: 'این عملیات قابل بازگشت نیست',
      fields: [
        { label: 'نام', value: item.name, highlight: true },
        { label: 'تعداد فعلی', value: toPersianDigits(item.quantity ?? 0) },
      ],
      confirmLabel: 'حذف قطعی',
      onConfirm: async () => {
        try { await deleteInventoryItem(item.id); showToast('success', 'حذف شد'); await loadData() }
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
        moduleKey="inventory"
        title="انبار"
        subtitle="مدیریت اقلام و مواد مصرفی"
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => { h.tap(); setScanMode('quick'); setScannerOpen(true) }} variant="secondary"><ScanLine size={16} className="inline ml-1" /> اسکن بارکد</Button>
            <Button onClick={openCreateModal} variant="primary"><Plus size={16} className="inline ml-1" /> اقلام جدید</Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
<ReorderableStatGrid
        storageKey="inventory"
        items={[
          { key: 'total', node: <ModuleStatCard moduleKey="inventory" icon={<Package size={20} />} label="کل اقلام" value={formatNumber(stats.totalItems)} /> },
          { key: 'low', node: <ModuleStatCard moduleKey="inventory" icon={<TrendingDown size={20} />} label="رو به اتمام" value={formatNumber(stats.lowStock)} /> },
          { key: 'out', node: <ModuleStatCard moduleKey="inventory" icon={<AlertTriangle size={20} />} label="ناموجود" value={formatNumber(stats.outOfStock)} /> },
          { key: 'value', node: <ModuleStatCard moduleKey="inventory" icon={<PackageCheck size={20} />} label="ارزش انبار" value={`${formatCurrency(stats.totalValue)} ت`} /> },
        ]}
      />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'items', label: 'اقلام', icon: <Package size={16} /> },
          { key: 'categories', label: 'دسته‌بندی‌ها', icon: <Boxes size={16} /> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام یا برند..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">همه دسته‌ها</option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-400"
            />
            فقط رو به اتمام
          </label>
          {(searchQuery || filterCategory || lowStockOnly) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFilterCategory(''); setLowStockOnly(false) }}>
              پاک کردن
            </Button>
          )}
        </div>
      </Card>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-0 overflow-hidden lg:col-span-2">
            {filteredItems.length === 0 ? (
              <EmptyState
                icon={<Package size={28} />}
                title="اقلامی یافت نشد"
                description="با افزودن اقلام جدید شروع کنید"
                action={<Button onClick={openCreateModal} variant="primary" size="sm"><Plus size={14} className="inline ml-1" />افزودن اقلام</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">نام</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">برند</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">تعداد</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">حداقل</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">قیمت واحد</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">وضعیت</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((i) => {
                      const stock = getStockStatus(i)
                      return (
                        <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all-smooth">
                          <td className="px-4 py-3 font-medium text-slate-800">{i.name}</td>
                          <td className="px-4 py-3 text-slate-600">{i.brand || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatNumber(i.quantity ?? 0)} <span className="text-xs text-slate-400">{getUnitLabel(i.unit)}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatNumber(i.min_quantity ?? 0)}</td>
                          <td className="px-4 py-3 text-slate-700 font-medium">
                            {i.unit_cost ? `${formatCurrency(i.unit_cost)} ت` : '-'}
                          </td>
                          <td className="px-4 py-3"><Badge color={stock.color}>{stock.label}</Badge></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditModal(i)} className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all-smooth press-scale"><Edit2 size={14} /></button>
                              <button onClick={() => handleDelete(i)} className="p-1 rounded-lg bg-error-50 text-error-500 hover:bg-error-100 transition-all-smooth press-scale"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Category Chart */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">توزیع اقلام بر اساس دسته</h3>
            {categoryChartData.length === 0 ? (
              <EmptyState icon={<Boxes size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
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

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <Card className="p-5 md:col-span-2 lg:col-span-3">
              <EmptyState icon={<Boxes size={28} />} title="دسته‌بندی ثبت نشده است" description="دسته‌بندی‌های انبار در اینجا نمایش داده می‌شوند" />
            </Card>
          ) : (
            categories.map((c) => {
              const count = items.filter((i) => i.category_id === c.id).length
              return (
                <Card key={c.id} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center text-accent-700">
                      <Boxes size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{c.name}</h3>
                      <p className="text-xs text-slate-500">{formatNumber(count)} اقلام</p>
                    </div>
                  </div>
                  {c.description && <p className="text-sm text-slate-600">{c.description}</p>}
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Create/Edit Wizard */}
      <Wizard
        open={modalOpen}
        onClose={() => { h.cancel(); setModalOpen(false) }}
        title={editingItem ? 'ویرایش اقلام' : 'افزودن اقلام جدید'}
        step={invWizardStep}
        onStepChange={setInvWizardStep}
        onFinish={handleSave}
        finishLabel={editingItem ? 'ذخیره تغییرات' : 'ایجاد اقلام'}
        saving={saving}
        steps={[
          {
            label: 'نام و دسته',
            validate: () => (!formData.name.trim() ? 'نام اقلام الزامی است' : null),
            content: (
              <>
                <Input label="نام اقلام *" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="مثلا: دستکش نایلکس" />
                <Input label="برند" value={formData.brand} onChange={(v) => setFormData({ ...formData, brand: v })} placeholder="برند سازنده" />
                <div className="flex items-end gap-2">
                  <Input label="بارکد" value={formData.barcode} onChange={(v) => setFormData({ ...formData, barcode: v })} placeholder="اسکن یا دستی وارد کنید" dir="ltr" className="flex-1" />
                  <Button variant="secondary" onClick={() => { h.tap(); setScanMode('form'); setScannerOpen(true) }} className="shrink-0"><ScanLine size={16} /></Button>
                </div>
                <Select label="دسته‌بندی" value={formData.category_id} onChange={(v) => setFormData({ ...formData, category_id: v })} options={categoryOptions} placeholder="بدون دسته" />
              </>
            ),
          },
          {
            label: 'موجودی و قیمت',
            content: (
              <>
                <Select label="واحد" value={formData.unit} onChange={(v) => setFormData({ ...formData, unit: v })} options={itemUnits} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="تعداد فعلی" type="number" value={formData.quantity} onChange={(v) => setFormData({ ...formData, quantity: v })} placeholder="0" />
                  <Input label="حداقل موجودی" type="number" value={formData.min_quantity} onChange={(v) => setFormData({ ...formData, min_quantity: v })} placeholder="0" />
                </div>
                <CurrencyInput label="قیمت واحد (تومان)" value={formData.unit_cost} onChange={(v) => setFormData({ ...formData, unit_cost: v })} />
              </>
            ),
          },
          {
            label: 'تأمین‌کننده',
            content: (
              <>
                <Input label="تأمین‌کننده" value={formData.supplier} onChange={(v) => setFormData({ ...formData, supplier: v })} placeholder="نام تأمین‌کننده" />
                <Input label="موقعیت انبار" value={formData.location} onChange={(v) => setFormData({ ...formData, location: v })} placeholder="قفسه یا بخش" />
                <Textarea label="توضیحات" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} placeholder="توضیحات اختیاری" />
              </>
            ),
          },
        ]}
      />

      {ConfirmActionModal}
      {scannerOpen && <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setScannerOpen(false)} />}
    </div>
  )
}
