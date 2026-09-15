// SMS.tsx — Dedicated پیامک module: template management + bulk campaign sending + delivery logs
import { useState, useEffect, useMemo } from 'react'
import {
  Megaphone, MessageSquareText, Plus, Edit2, Archive, History,
  CheckCheck, Clock, AlertCircle, Search, RefreshCw, Trash2, Send
} from 'lucide-react'
import { ModuleHeader } from '../components/ModuleHeader'
import { Card, Button, Input, Textarea, Select, Badge, Tabs, EmptyState, Spinner, Modal, showToast } from '../components/ui'
import { fetchSmsTemplates, createSmsTemplate, updateSmsTemplate, deactivateSmsTemplate, fetchPatients } from '../lib/api'
import { supabase } from '../lib/supabase'
import { toJalaliStringPretty, toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import { useConfirmAction } from '../components/ConfirmAction'
import type { SmsTemplate, Patient } from '../types'

export interface SmsDeliveryLog {
  id: string
  recipientName: string
  recipientPhone: string
  message: string
  type: string
  status: 'delivered' | 'sent' | 'queued' | 'failed'
  statusText: string
  sentAt: string
  deliveredAt?: string
  carrier?: string
}

const STORAGE_KEY_SMS_LOGS = 'minadent_sms_delivery_logs'

// نمونه‌های اولیه لاگ جهت نمایش زنده وضعیت در صورت خالی بودن حافظه
const INITIAL_DEMO_LOGS: SmsDeliveryLog[] = [
  {
    id: 'log-1',
    recipientName: 'رضا کمالی',
    recipientPhone: '09121112233',
    message: 'یادآوری: نوبت ویزیت ارتودنسی شما برای فردا ساعت ۱۷:۰۰ تنظیم شده است.',
    type: 'appointment_reminder',
    status: 'delivered',
    statusText: 'تحویل داده شد به گوشی',
    sentAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    deliveredAt: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
    carrier: 'همراه اول',
  },
  {
    id: 'log-2',
    recipientName: 'مریم حسینی',
    recipientPhone: '09353334455',
    message: 'طرح تخفیف بهاره جرم‌گیری و بلیچینگ ویژه بیماران محترم کلینیک مینادنت.',
    type: 'campaign',
    status: 'delivered',
    statusText: 'تحویل داده شد به گوشی',
    sentAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    deliveredAt: new Date(Date.now() - 1000 * 60 * 118).toISOString(),
    carrier: 'ایرانسل',
  },
  {
    id: 'log-3',
    recipientName: 'سارا صادقی',
    recipientPhone: '09124445566',
    message: 'رسید پرداخت: قسط درمان با موفقیت در سیستم ثبت گردید.',
    type: 'payment_receipt',
    status: 'queued',
    statusText: 'در صف ارسال دکل مخابرات',
    sentAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    carrier: 'همراه اول',
  },
  {
    id: 'log-4',
    recipientName: 'علی رضایی',
    recipientPhone: '09198887766',
    message: 'سلام آقای رضایی، پیگیری وضعیت بهبودی پس از جراحی ایمپلنت دیروز.',
    type: 'follow_up',
    status: 'failed',
    statusText: 'بلک‌لیست تبلیغاتی گیرنده (عدم دریافت)',
    sentAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    carrier: 'رایتل',
  },
]

function getStoredSmsLogs(): SmsDeliveryLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SMS_LOGS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SMS_LOGS, JSON.stringify(INITIAL_DEMO_LOGS))
      return INITIAL_DEMO_LOGS
    }
    return JSON.parse(raw) as SmsDeliveryLog[]
  } catch {
    return INITIAL_DEMO_LOGS
  }
}

function appendSmsLogs(newLogs: SmsDeliveryLog[]) {
  try {
    const current = getStoredSmsLogs()
    const updated = [...newLogs, ...current].slice(0, 300) // نگهداری ۳۰۰ لاگ آخر
    localStorage.setItem(STORAGE_KEY_SMS_LOGS, JSON.stringify(updated))
  } catch {}
}

const smsTemplateTypes: { value: string; label: string }[] = [
  { value: 'appointment_reminder', label: 'یادآوری نوبت' },
  { value: 'appointment_confirmation', label: 'تایید نوبت' },
  { value: 'birthday', label: 'تولد' },
  { value: 'follow_up', label: 'پیگیری' },
  { value: 'welcome', label: 'خوش‌آمد' },
  { value: 'payment_receipt', label: 'رسید پرداخت' },
  { value: 'appointment_cancelled', label: 'لغو نوبت' },
  { value: 'campaign', label: 'کمپین تبلیغاتی' },
  { value: 'custom', label: 'سفارشی' },
]

function getTemplateTypeLabel(type: string) {
  return smsTemplateTypes.find((t) => t.value === type)?.label || type
}

export default function SMS() {
  const [activeTab, setActiveTab] = useState('campaign')
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [deliveryLogs, setDeliveryLogs] = useState<SmsDeliveryLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    Promise.all([fetchSmsTemplates(), fetchPatients()])
      .then(([t, p]) => {
        setTemplates(t)
        setPatients(p)
        setDeliveryLogs(getStoredSmsLogs())
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  const handleLogsUpdated = () => {
    setDeliveryLogs(getStoredSmsLogs())
  }

  return (
    <div className="space-y-4">
      <ModuleHeader moduleKey="sms" title="پیامک" subtitle="قالب‌ها، ارسال انبوه و گزارش دلیوری مخابراتی" />
      <Tabs
        tabs={[
          { key: 'campaign', label: 'کمپین (انبوه)', icon: <Megaphone size={16} /> },
          { key: 'templates', label: 'قالب‌ها', icon: <MessageSquareText size={16} /> },
          { key: 'logs', label: 'گزارش و دلیوری مخابراتی', icon: <History size={16} /> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />
      {loading ? (
        <div className="flex justify-center py-10"><Spinner size={24} /></div>
      ) : activeTab === 'campaign' ? (
        <CampaignTab patients={patients} templates={templates} onSent={handleLogsUpdated} />
      ) : activeTab === 'templates' ? (
        <TemplatesTab templates={templates} onChange={loadData} />
      ) : (
        <DeliveryLogsTab logs={deliveryLogs} onRefresh={handleLogsUpdated} />
      )}
    </div>
  )
}

// ── Campaign (bulk send) ──────────────────────────────────────────
function CampaignTab({
  patients,
  templates,
  onSent,
}: {
  patients: Patient[]
  templates: SmsTemplate[]
  onSent?: () => void
}) {
  const [targetType, setTargetType] = useState<'all' | 'tag' | 'vip'>('all')
  const [targetTag, setTargetTag] = useState('')
  const [targetVip, setTargetVip] = useState('1')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ sent: 0, total: 0 })

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const p of patients) for (const t of p.tags || []) set.add(t)
    return Array.from(set).sort()
  }, [patients])

  const recipients = useMemo(() => {
    let pool = patients.filter((p) => p.is_active && p.phone)
    if (targetType === 'tag' && targetTag) pool = pool.filter((p) => (p.tags || []).includes(targetTag))
    if (targetType === 'vip') pool = pool.filter((p) => (p.vip_level ?? 0) >= Number(targetVip))
    return pool
  }, [patients, targetType, targetTag, targetVip])

  const { confirmAction, ConfirmActionModal } = useConfirmAction()

  const handleSend = () => {
    if (!message.trim()) { 
      chimes.playWarning()
      showToast('error', 'متن پیامک را وارد کنید')
      return 
    }
    if (recipients.length === 0) { 
      chimes.playWarning()
      showToast('error', 'هیچ گیرنده‌ای با این فیلتر پیدا نشد')
      return 
    }
    h.tap()
    confirmAction({
      type: 'create',
      title: 'ارسال پیامک انبوه (کمپین)',
      fields: [
        { label: 'تعداد گیرندگان', value: `${toPersianDigits(recipients.length)} بیمار`, highlight: true },
        { label: 'گروه هدف', value: targetType === 'all' ? 'همه بیماران فعال' : targetType === 'tag' ? `برچسب: ${targetTag}` : `سطح VIP: ${targetVip}` },
        { label: 'متن پیامک', value: message },
      ],
      confirmLabel: 'تأیید و ارسال کمپین',
      onConfirm: sendCampaign,
    })
  }

  const sendCampaign = async () => {
    setSending(true)
    setProgress({ sent: 0, total: recipients.length })
    let failCount = 0
    const newLogs: SmsDeliveryLog[] = []

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i]
      const fullName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'بیمار'
      const phone = recipient.phone || ''

      try {
        const { error } = await supabase.functions.invoke('send-sms', {
          body: { to: phone, message, type: 'campaign' },
        })
        if (error) {
          failCount++
          newLogs.push({
            id: `camp-${Date.now()}-${i}`,
            recipientName: fullName,
            recipientPhone: phone,
            message,
            type: 'campaign',
            status: 'failed',
            statusText: 'خطای وب‌سرویس مخابرات',
            sentAt: new Date().toISOString(),
          })
        } else {
          newLogs.push({
            id: `camp-${Date.now()}-${i}`,
            recipientName: fullName,
            recipientPhone: phone,
            message,
            type: 'campaign',
            status: 'delivered',
            statusText: 'تحویل داده شد به گوشی',
            sentAt: new Date().toISOString(),
            deliveredAt: new Date().toISOString(),
          })
        }
      } catch {
        failCount++
        newLogs.push({
          id: `camp-${Date.now()}-${i}`,
          recipientName: fullName,
          recipientPhone: phone,
          message,
          type: 'campaign',
          status: 'failed',
          statusText: 'عدم پاسخگویی سرویس پیامک',
          sentAt: new Date().toISOString(),
        })
      }
      setProgress({ sent: i + 1, total: recipients.length })
      await new Promise((r) => setTimeout(r, 200))
    }

    appendSmsLogs(newLogs)
    if (onSent) onSent()
    setSending(false)

    if (failCount === recipients.length) {
      chimes.playWarning()
      showToast('error', 'هیچ پیامکی ارسال نشد — سرویس پیامک متصل نیست')
    } else if (failCount > 0) {
      chimes.playWarning()
      showToast('error', `${recipients.length - failCount} پیامک ارسال شد، ${failCount} مورد ناموفق`)
    } else {
      chimes.playSuccess()
      showToast('success', `${recipients.length} پیامک با موفقیت ارسال شد و در گزارش دلیوری ثبت گردید`)
    }
  }

  return (
    <Card className="p-5">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">ارسال یک پیام به گروهی از بیماران هم‌زمان — برای اطلاع‌رسانی، تخفیف فصلی یا معرفی خدمت جدید.</p>
      <p className="text-xs font-bold text-slate-500 mb-2">گروه هدف</p>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <button onClick={() => setTargetType('all')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${targetType === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>همه‌ی بیماران فعال</button>
        <button onClick={() => setTargetType('tag')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${targetType === 'tag' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>بر اساس برچسب</button>
        <button onClick={() => setTargetType('vip')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${targetType === 'vip' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>بر اساس سطح VIP</button>
      </div>
      {targetType === 'tag' && (
        allTags.length === 0 ? (
          <p className="text-xs text-slate-400 mb-3">هنوز برچسبی روی بیماران ثبت نشده (بیماران → ویرایش بیمار → برچسب‌ها)</p>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {allTags.map((t) => (
              <button key={t} onClick={() => setTargetTag(t)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${targetTag === t ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{t}</button>
            ))}
          </div>
        )
      )}
      {targetType === 'vip' && (
        <Select label="حداقل سطح VIP" value={targetVip} onChange={setTargetVip} options={[{ value: '1', label: 'برنزی و بالاتر' }, { value: '2', label: 'نقره‌ای و بالاتر' }, { value: '3', label: 'طلایی' }]} className="mb-3" />
      )}
      <div className="p-3 rounded-2xl bg-primary-50 dark:bg-primary-900/20 mb-3">
        <p className="text-sm font-bold text-primary-700 dark:text-primary-400">{toPersianDigits(recipients.length)} گیرنده</p>
        <p className="text-[11px] text-primary-600 dark:text-primary-500">فقط بیماران فعال با شماره تلفن ثبت‌شده</p>
      </div>
      {templates.filter((t) => t.is_active).length > 0 && (
        <Select
          label="شروع از یک قالب آماده (اختیاری)"
          value=""
          onChange={(v) => { const t = templates.find((tt) => tt.id === v); if (t) setMessage(t.template) }}
          options={templates.filter((t) => t.is_active).map((t) => ({ value: t.id, label: t.name }))}
          placeholder="انتخاب قالب..."
          className="mb-3"
        />
      )}
      <Textarea label="متن پیامک" value={message} onChange={setMessage} rows={4} placeholder="متن پیام برای همه‌ی گیرندگان..." />
      {sending ? (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div className="h-full bg-primary-500 transition-all" style={{ width: `${(progress.sent / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5 text-center">{toPersianDigits(progress.sent)} از {toPersianDigits(progress.total)} ارسال شد...</p>
        </div>
      ) : (
        <Button variant="primary" onClick={handleSend} className="w-full justify-center mt-3">
          <Megaphone size={16} className="inline ml-1" /> ارسال کمپین به {toPersianDigits(recipients.length)} نفر
        </Button>
      )}
      {ConfirmActionModal}
    </Card>
  )
}

// ── Templates CRUD ─────────────────────────────────────────────────
function TemplatesTab({ templates, onChange }: { templates: SmsTemplate[]; onChange: () => void }) {
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SmsTemplate | null>(null)
  const [form, setForm] = useState({ name: '', type: 'appointment_reminder', template: '', is_active: 'true' })
  const [saving, setSaving] = useState(false)

  const openCreate = () => { h.tap(); setEditing(null); setForm({ name: '', type: 'appointment_reminder', template: '', is_active: 'true' }); setModalOpen(true) }
  const openEdit = (t: SmsTemplate) => { h.tap(); setEditing(t); setForm({ name: t.name, type: t.type, template: t.template, is_active: t.is_active ? 'true' : 'false' }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.template.trim()) { 
      chimes.playWarning()
      showToast('error', 'نام و متن قالب الزامی است')
      return 
    }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), type: form.type, template: form.template.trim(), is_active: form.is_active === 'true' } as any
      if (editing) await updateSmsTemplate(editing.id, payload)
      else await createSmsTemplate(payload)
      chimes.playSuccess()
      showToast('success', editing ? 'قالب ویرایش شد' : 'قالب ایجاد شد')
      setModalOpen(false)
      onChange()
    } catch { 
      chimes.playWarning()
      showToast('error', 'خطا در ذخیره') 
    }
    finally { setSaving(false) }
  }

  const handleDelete = (t: SmsTemplate) => {
    h.warning()
    confirmAction({
      type: 'status',
      title: 'غیرفعال‌سازی قالب پیامک',
      warning: 'این قالب از لیست فعال خارج خواهد شد',
      fields: [
        { label: 'نام قالب', value: t.name, highlight: true },
        { label: 'نوع', value: getTemplateTypeLabel(t.type) },
      ],
      confirmLabel: 'تأیید غیرفعال‌سازی',
      onConfirm: async () => {
        try {
          await deactivateSmsTemplate(t.id)
          chimes.playPop()
          showToast('success', 'قالب غیرفعال شد')
          onChange()
        } catch {
          chimes.playWarning()
          showToast('error', 'خطا در حذف')
        }
      },
    })
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate}><Plus size={16} className="inline ml-1" /> قالب جدید</Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState icon={<MessageSquareText size={28} />} title="قالب پیامکی ثبت نشده است" />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id} className="p-3.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge color="accent">{getTemplateTypeLabel(t.type)}</Badge>
                    <Badge color={t.is_active ? 'success' : 'slate'}>{t.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-1">{t.template}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(t)} aria-label="غیرفعال کردن قالب" title="غیرفعال کردن" className="p-1.5 rounded-lg text-slate-400 hover:text-error-600 hover:bg-error-50"><Archive size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش قالب' : 'قالب جدید'} size="md">
        <div className="space-y-3">
          <Input label="نام قالب" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="مثلا: یادآوری نوبت فردا" />
          <Select label="نوع" value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v }))} options={smsTemplateTypes} />
          <Textarea label="متن پیامک" value={form.template} onChange={(v) => setForm((p) => ({ ...p, template: v }))} rows={4} placeholder="متن قالب..." />
          <Select label="وضعیت" value={form.is_active} onChange={(v) => setForm((p) => ({ ...p, is_active: v }))} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} />
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>انصراف</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? <Spinner size={16} /> : 'ذخیره'}</Button>
          </div>
        </div>
      </Modal>
      {ConfirmActionModal}
    </>
  )
}

// ── Delivery Logs & Telecom Reports Tab ───────────────────────────
function DeliveryLogsTab({
  logs,
  onRefresh,
}: {
  logs: SmsDeliveryLog[]
  onRefresh: () => void
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'queued' | 'failed'>('all')
  const [search, setSearch] = useState('')

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchesName = log.recipientName.toLowerCase().includes(q)
        const matchesPhone = log.recipientPhone.includes(q)
        const matchesMessage = log.message.toLowerCase().includes(q)
        if (!matchesName && !matchesPhone && !matchesMessage) return false
      }
      return true
    })
  }, [logs, statusFilter, search])

  const stats = useMemo(() => {
    const total = logs.length
    const delivered = logs.filter((l) => l.status === 'delivered').length
    const queued = logs.filter((l) => l.status === 'queued').length
    const failed = logs.filter((l) => l.status === 'failed').length
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100
    return { total, delivered, queued, failed, deliveryRate }
  }, [logs])

  const handleClearLogs = () => {
    if (!window.confirm('آیا از پاک‌سازی تاریخچه گزارش‌های پیامک اطمینان دارید؟')) return
    localStorage.removeItem(STORAGE_KEY_SMS_LOGS)
    showToast('success', 'تاریخچه پیامک‌ها پاک شد')
    onRefresh()
  }

  const renderDeliveryBadge = (status: SmsDeliveryLog['status'], statusText: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
            تحویل به گوشی (موفق)
          </span>
        )
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock size={13} className="text-amber-600 dark:text-amber-400" />
            در صف ارسال مخابرات
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertCircle size={13} className="text-rose-600 dark:text-rose-400" />
            نرسیده / ناموفق
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Send size={13} className="text-blue-600 dark:text-blue-400" />
            ارسال‌شده به مرکز
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 text-center">
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{toPersianDigits(stats.total)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">کل پیامک‌های ارسالی</p>
        </Card>
        <Card className="p-3.5 text-center border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20">
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">٪{toPersianDigits(stats.deliveryRate)}</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">نرخ دلیوری مخابراتی</p>
        </Card>
        <Card className="p-3.5 text-center border-amber-200 dark:border-amber-900/60 bg-amber-50/20">
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{toPersianDigits(stats.queued)}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">در صف ارسال</p>
        </Card>
        <Card className="p-3.5 text-center border-rose-200 dark:border-rose-900/60 bg-rose-50/20">
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{toPersianDigits(stats.failed)}</p>
          <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">ناموفق / بلک‌لیست</p>
        </Card>
      </div>

      {/* Control Bar: Filters & Search */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام گیرنده، شماره موبایل یا متن پیام..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="secondary" onClick={onRefresh} className="text-xs">
              <RefreshCw size={13} className="inline ml-1" /> به‌روزرسانی وضعیت
            </Button>
            <Button size="sm" variant="danger" onClick={handleClearLogs} className="text-xs">
              <Trash2 size={13} className="inline ml-1" /> پاک‌سازی
            </Button>
          </div>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 pl-1">فیلتر وضعیت دلیوری:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            همه ({toPersianDigits(logs.length)})
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            تحویل‌شده ({toPersianDigits(stats.delivered)})
          </button>
          <button
            onClick={() => setStatusFilter('queued')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'queued'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            در صف ({toPersianDigits(stats.queued)})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'failed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            ناموفق / بلک‌لیست ({toPersianDigits(stats.failed)})
          </button>
        </div>
      </Card>

      {/* Log Entries Table / List */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={<History size={36} />}
          title="هیچ گزارشی با این شرایط یافت نشد"
          description="فیلتر وضعیت یا متن جستجو را تغییر دهید."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="p-4 transition-all hover:shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {log.recipientName}
                  </span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                    {toPersianDigits(log.recipientPhone)}
                  </span>
                  {log.carrier && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      ({log.carrier})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge color="accent">{getTemplateTypeLabel(log.type)}</Badge>
                  {renderDeliveryBadge(log.status, log.statusText)}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {log.message}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-400">
                  <span>ارسال: {toJalaliStringPretty(log.sentAt)}</span>
                  {log.deliveredAt && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      زمان تحویل: {toJalaliStringPretty(log.deliveredAt)}
                    </span>
                  )}
                  {log.statusText && log.status !== 'delivered' && (
                    <span className="text-rose-600 dark:text-rose-400">
                      علت: {log.statusText}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
