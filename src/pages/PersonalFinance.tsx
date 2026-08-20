// PersonalFinance.tsx — مالی شخصی: وام، اجاره، چک شخصی، بدهی
// Deliberately separate from Billing.tsx (clinic business finances) —
// this tracks the owner's personal financial obligations.
import { useState, useEffect, useMemo } from 'react'
import { PiggyBank, Plus, Landmark, Home, Banknote, HandCoins, Trash2, Edit2, CalendarClock } from 'lucide-react'
import {
  fetchPersonalFinanceItems, createPersonalFinanceItem, updatePersonalFinanceItem, deletePersonalFinanceItem,
} from '../lib/api'
import { toJalaliStringPretty, formatCurrency, toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { useConfirmAction } from '../components/ConfirmAction'
import type { PersonalFinanceItem } from '../types'
import { Wizard, Card, Button, Input, Select, Textarea, Badge, EmptyState, Tabs, showToast } from '../components/ui'
import { PersianDateInput } from '../components/PersianDateInput'
import { ModuleHeader, ModuleStatCard, ReorderableStatGrid } from '../components/ModuleHeader'
import { CurrencyInput } from '../components/CurrencyInput'
import { downloadICSReminder } from '../lib/icsReminder'

const typeTabs: { key: PersonalFinanceItem['item_type']; label: string; icon: JSX.Element }[] = [
  { key: 'loan', label: 'وام', icon: <Landmark size={16} /> },
  { key: 'rent', label: 'اجاره', icon: <Home size={16} /> },
  { key: 'cheque', label: 'چک', icon: <Banknote size={16} /> },
  { key: 'debt', label: 'بدهی', icon: <HandCoins size={16} /> },
]

const statusMeta: Record<string, { label: string; color: string }> = {
  active: { label: 'فعال', color: 'primary' },
  completed: { label: 'تسویه شده', color: 'success' },
  overdue: { label: 'سررسید گذشته', color: 'error' },
  cancelled: { label: 'لغو شده', color: 'slate' },
}

export default function PersonalFinance() {
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  const [items, setItems] = useState<PersonalFinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<PersonalFinanceItem['item_type']>('loan')
  const [modalOpen, setModalOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [editing, setEditing] = useState<PersonalFinanceItem | null>(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    title: '', counterparty: '', total_amount: '', paid_amount: '', due_date: '',
    monthly_amount: '', interest_rate: '', cheque_number: '', bank_name: '',
    status: 'active' as PersonalFinanceItem['status'], notes: '',
  }
  const [form, setForm] = useState(emptyForm)

  const loadData = async () => {
    setLoading(true)
    try { setItems(await fetchPersonalFinanceItems()) } finally { setLoading(false) }
  }
  useEffect(() => { loadData() }, [])

  const itemsForTab = useMemo(() => items.filter((i) => i.item_type === tab), [items, tab])

  const stats = useMemo(() => {
    const totalOwed = items.filter((i) => i.status === 'active').reduce((s, i) => s + (i.total_amount - i.paid_amount), 0)
    const totalPaid = items.reduce((s, i) => s + i.paid_amount, 0)
    const todayStr = new Date().toISOString().slice(0, 10)
    const overdueCount = items.filter((i) => i.status === 'overdue' || (i.due_date && i.due_date < todayStr && i.status === 'active')).length
    const activeCount = items.filter((i) => i.status === 'active').length
    return { totalOwed, totalPaid, overdueCount, activeCount }
  }, [items])

  const openCreate = () => {
    h.tap()
    setEditing(null)
    setForm({ ...emptyForm })
    setWizardStep(0)
    setModalOpen(true)
  }

  const openEdit = (item: PersonalFinanceItem) => {
    setEditing(item)
    setForm({
      title: item.title, counterparty: item.counterparty || '',
      total_amount: String(item.total_amount), paid_amount: String(item.paid_amount),
      due_date: item.due_date || '', monthly_amount: item.monthly_amount != null ? String(item.monthly_amount) : '',
      interest_rate: item.interest_rate != null ? String(item.interest_rate) : '',
      cheque_number: item.cheque_number || '', bank_name: item.bank_name || '',
      status: item.status, notes: item.notes || '',
    })
    setWizardStep(0)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) { showToast('error', 'عنوان الزامی است'); return }
    if (!form.total_amount) { showToast('error', 'مبلغ کل الزامی است'); return }
    const payload = {
      item_type: tab, title: form.title, counterparty: form.counterparty || null,
      total_amount: Number(form.total_amount), paid_amount: form.paid_amount ? Number(form.paid_amount) : 0,
      due_date: form.due_date || null,
      monthly_amount: form.monthly_amount ? Number(form.monthly_amount) : null,
      interest_rate: form.interest_rate ? Number(form.interest_rate) : null,
      cheque_number: form.cheque_number || null, bank_name: form.bank_name || null,
      status: form.status, notes: form.notes || null,
    } as any
    confirmAction({
      type: editing ? 'edit' : 'create',
      title: editing ? 'ویرایش مورد مالی' : 'افزودن مورد مالی جدید',
      fields: [
        { label: 'عنوان', value: form.title, highlight: true },
        { label: 'مبلغ کل', value: `${formatCurrency(Number(form.total_amount))} ت` },
        { label: 'پرداخت‌شده', value: form.paid_amount ? `${formatCurrency(Number(form.paid_amount))} ت` : '۰ ت' },
      ],
      confirmLabel: editing ? 'ذخیره' : 'افزودن',
      onConfirm: async () => {
        setSaving(true)
        try {
          if (editing) await updatePersonalFinanceItem(editing.id, payload)
          else await createPersonalFinanceItem(payload)
          showToast('success', editing ? 'ویرایش شد' : 'اضافه شد')
          setModalOpen(false)
          await loadData()
        } catch { showToast('error', 'خطا در ذخیره') }
        finally { setSaving(false) }
      },
    })
  }

  const handleDelete = (item: PersonalFinanceItem) => {
    h.tap()
    confirmAction({
      type: 'delete',
      title: 'حذف مورد مالی',
      warning: 'این عملیات قابل بازگشت نیست',
      fields: [{ label: 'عنوان', value: item.title, highlight: true }],
      confirmLabel: 'تایید حذف',
      onConfirm: async () => {
        await deletePersonalFinanceItem(item.id)
        showToast('success', 'حذف شد')
        await loadData()
      },
    })
  }

  const quickMarkPaid = (item: PersonalFinanceItem) => {
    h.tap()
    confirmAction({
      type: 'status',
      title: 'تسویه کامل',
      fields: [{ label: 'عنوان', value: item.title, highlight: true }],
      confirmLabel: 'تایید تسویه',
      onConfirm: async () => {
        await updatePersonalFinanceItem(item.id, { paid_amount: item.total_amount, status: 'completed' })
        showToast('success', 'تسویه شد')
        await loadData()
      },
    })
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ModuleHeader moduleKey="personalFinance" title="مالی شخصی" subtitle="وام، اجاره، چک و بدهی‌های شخصی — جدا از حساب کلینیک" />

      <ReorderableStatGrid
        storageKey="personal-finance"
        items={[
          { key: 'owed', node: <ModuleStatCard moduleKey="personalFinance" icon={<HandCoins size={20} />} label="مانده‌ی بدهی فعال" value={`${formatCurrency(stats.totalOwed)} ت`} /> },
          { key: 'paid', node: <ModuleStatCard moduleKey="personalFinance" icon={<PiggyBank size={20} />} label="کل پرداخت‌شده" value={`${formatCurrency(stats.totalPaid)} ت`} /> },
          { key: 'active', node: <ModuleStatCard moduleKey="personalFinance" icon={<Landmark size={20} />} label="موارد فعال" value={toPersianDigits(stats.activeCount)} /> },
          { key: 'overdue', node: <ModuleStatCard moduleKey="personalFinance" icon={<Banknote size={20} />} label="سررسید گذشته" value={toPersianDigits(stats.overdueCount)} /> },
        ]}
      />

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Tabs tabs={typeTabs} active={tab} onChange={(k) => setTab(k as PersonalFinanceItem['item_type'])} />
        </div>
        <Button variant="primary" size="sm" onClick={openCreate} className="shrink-0"><Plus size={14} className="inline ml-1" /> افزودن</Button>
      </div>

      {itemsForTab.length === 0 ? (
        <EmptyState icon={<PiggyBank size={40} />} title="موردی ثبت نشده" description="وام، اجاره، چک یا بدهی شخصی خود را اینجا ثبت و پیگیری کنید" />
      ) : (
        <div className="space-y-2">
          {itemsForTab.map((item) => {
            const remaining = item.total_amount - item.paid_amount
            const progress = item.total_amount > 0 ? Math.min(100, (item.paid_amount / item.total_amount) * 100) : 0
            const meta = statusMeta[item.status] || statusMeta.active
            return (
              <Card key={item.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                    {item.counterparty && <p className="text-[11px] text-slate-400">{item.counterparty}</p>}
                  </div>
                  <Badge color={meta.color}>{meta.label}</Badge>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>{formatCurrency(item.paid_amount)} از {formatCurrency(item.total_amount)} ت</span>
                    {item.due_date && <span>سررسید: {toJalaliStringPretty(item.due_date)}</span>}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-success-500 transition-all-smooth" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {item.monthly_amount != null && <p className="text-[11px] text-slate-400 mt-1.5">قسط ماهانه: {formatCurrency(item.monthly_amount)} ت</p>}
                {item.cheque_number && <p className="text-[11px] text-slate-400 mt-0.5">شماره چک: {toPersianDigits(item.cheque_number)} {item.bank_name && `— ${item.bank_name}`}</p>}
                <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                  {remaining > 0 && item.status === 'active' && (
                    <button onClick={() => quickMarkPaid(item)} className="text-xs text-success-600 hover:underline">تسویه کامل</button>
                  )}
                  {item.due_date && item.status === 'active' && (
                    <button
                      onClick={() => downloadICSReminder({
                        title: `سررسید ${typeTabs.find((t) => t.key === item.item_type)?.label} — ${item.title}`,
                        description: `مبلغ باقی‌مانده: ${formatCurrency(remaining)} تومان`,
                        dueDate: item.due_date!,
                        filename: `finance-reminder-${item.id}.ics`,
                      })}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      <CalendarClock size={11} className="inline ml-0.5" /> یادآوری
                    </button>
                  )}
                  <button onClick={() => openEdit(item)} className="text-xs text-primary-600 hover:underline"><Edit2 size={11} className="inline ml-0.5" /> ویرایش</button>
                  <button onClick={() => handleDelete(item)} className="text-xs text-error-500 hover:underline"><Trash2 size={11} className="inline ml-0.5" /> حذف</button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Wizard
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'ویرایش مورد مالی' : `${typeTabs.find((t) => t.key === tab)?.label} جدید`}
        step={wizardStep}
        onStepChange={setWizardStep}
        onFinish={handleSave}
        saving={saving}
        steps={[
          {
            label: 'اطلاعات پایه',
            content: (
              <>
                <Input label="عنوان" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder={tab === 'loan' ? 'مثلاً: وام بانک ملت' : tab === 'rent' ? 'اجاره مطب' : tab === 'cheque' ? 'چک شماره ۱۲۳' : 'بدهی به فلانی'} />
                <Input label="طرف حساب (بانک/موجر/طلبکار)" value={form.counterparty} onChange={(v) => setForm({ ...form, counterparty: v })} placeholder="نام بانک، موجر یا طرف حساب" />
                {tab === 'cheque' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="شماره چک" value={form.cheque_number} onChange={(v) => setForm({ ...form, cheque_number: v })} dir="ltr" />
                    <Input label="نام بانک" value={form.bank_name} onChange={(v) => setForm({ ...form, bank_name: v })} />
                  </div>
                )}
              </>
            ),
          },
          {
            label: 'مبلغ',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput label="مبلغ کل (ت)" value={form.total_amount} onChange={(v) => setForm({ ...form, total_amount: v })} />
                  <CurrencyInput label="پرداخت‌شده تا الان (ت)" value={form.paid_amount} onChange={(v) => setForm({ ...form, paid_amount: v })} />
                </div>
                {tab === 'loan' && (
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput label="قسط ماهانه (ت)" value={form.monthly_amount} onChange={(v) => setForm({ ...form, monthly_amount: v })} />
                    <Input label="نرخ سود (٪)" type="number" value={form.interest_rate} onChange={(v) => setForm({ ...form, interest_rate: v })} placeholder="0" />
                  </div>
                )}
                {tab === 'rent' && (
                  <CurrencyInput label="اجاره‌ی ماهانه (ت)" value={form.monthly_amount} onChange={(v) => setForm({ ...form, monthly_amount: v })} />
                )}
              </>
            ),
          },
          {
            label: 'سررسید و وضعیت',
            content: (
              <>
                <PersianDateInput label="تاریخ سررسید" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />
                <Select label="وضعیت" value={form.status} onChange={(v) => setForm({ ...form, status: v as any })} options={Object.entries(statusMeta).map(([k, v]) => ({ value: k, label: v.label }))} />
                <Textarea label="یادداشت" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} rows={2} />
              </>
            ),
          },
        ]}
      />

      {ConfirmActionModal}
    </div>
  )
}
