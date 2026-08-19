// SMS.tsx — dedicated پیامک module: template management + bulk
// campaign sending. Previously buried as tabs inside Settings with no
// icon/nav entry of its own — moved out to a real, first-class module
// matching every other section of the app.
import { useState, useEffect, useMemo } from 'react'
import { Megaphone, MessageSquareText, Plus, Edit2, Trash2 } from 'lucide-react'
import { ModuleHeader } from '../components/ModuleHeader'
import { Card, Button, Input, Textarea, Select, Badge, Tabs, EmptyState, Spinner, Modal, showToast } from '../components/ui'
import { fetchSmsTemplates, createSmsTemplate, updateSmsTemplate, deleteSmsTemplate, fetchPatients } from '../lib/api'
import { supabase } from '../lib/supabase'
import { toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import type { SmsTemplate, Patient } from '../types'

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

export default function SMS() {
  const [activeTab, setActiveTab] = useState('campaign')
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    Promise.all([fetchSmsTemplates(), fetchPatients()])
      .then(([t, p]) => { setTemplates(t); setPatients(p) })
      .finally(() => setLoading(false))
  }
  useEffect(loadData, [])

  return (
    <div className="space-y-4">
      <ModuleHeader moduleKey="sms" title="پیامک" subtitle="قالب‌ها و ارسال انبوه" />
      <Tabs
        tabs={[
          { key: 'campaign', label: 'کمپین (انبوه)', icon: <Megaphone size={16} /> },
          { key: 'templates', label: 'قالب‌ها', icon: <MessageSquareText size={16} /> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />
      {loading ? (
        <div className="flex justify-center py-10"><Spinner size={24} /></div>
      ) : activeTab === 'campaign' ? (
        <CampaignTab patients={patients} templates={templates} />
      ) : (
        <TemplatesTab templates={templates} onChange={loadData} />
      )}
    </div>
  )
}

// ── Campaign (bulk send) ──────────────────────────────────────────
function CampaignTab({ patients, templates }: { patients: Patient[]; templates: SmsTemplate[] }) {
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

  const handleSend = () => {
    if (!message.trim()) { showToast('error', 'متن پیامک را وارد کنید'); return }
    if (recipients.length === 0) { showToast('error', 'هیچ گیرنده‌ای با این فیلتر پیدا نشد'); return }
    if (!window.confirm(`پیامک برای ${recipients.length} بیمار ارسال شود؟ این عملیات قابل بازگشت نیست.`)) return
    sendCampaign()
  }

  const sendCampaign = async () => {
    setSending(true)
    setProgress({ sent: 0, total: recipients.length })
    let failCount = 0
    for (let i = 0; i < recipients.length; i++) {
      try {
        const { error } = await supabase.functions.invoke('send-sms', { body: { to: recipients[i].phone, message, type: 'campaign' } })
        if (error) failCount++
      } catch { failCount++ }
      setProgress({ sent: i + 1, total: recipients.length })
      await new Promise((r) => setTimeout(r, 300))
    }
    setSending(false)
    if (failCount === recipients.length) showToast('error', 'هیچ پیامکی ارسال نشد — سرویس پیامک متصل نیست')
    else if (failCount > 0) showToast('error', `${recipients.length - failCount} پیامک ارسال شد، ${failCount} مورد ناموفق`)
    else showToast('success', `${recipients.length} پیامک با موفقیت ارسال شد`)
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
    </Card>
  )
}

// ── Templates CRUD ─────────────────────────────────────────────────
function TemplatesTab({ templates, onChange }: { templates: SmsTemplate[]; onChange: () => void }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SmsTemplate | null>(null)
  const [form, setForm] = useState({ name: '', type: 'appointment_reminder', template: '', is_active: 'true' })
  const [saving, setSaving] = useState(false)

  const openCreate = () => { h.tap(); setEditing(null); setForm({ name: '', type: 'appointment_reminder', template: '', is_active: 'true' }); setModalOpen(true) }
  const openEdit = (t: SmsTemplate) => { h.tap(); setEditing(t); setForm({ name: t.name, type: t.type, template: t.template, is_active: t.is_active ? 'true' : 'false' }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.template.trim()) { showToast('error', 'نام و متن قالب الزامی است'); return }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), type: form.type, template: form.template.trim(), is_active: form.is_active === 'true' } as any
      if (editing) await updateSmsTemplate(editing.id, payload)
      else await createSmsTemplate(payload)
      showToast('success', editing ? 'قالب ویرایش شد' : 'قالب ایجاد شد')
      setModalOpen(false)
      onChange()
    } catch { showToast('error', 'خطا در ذخیره') }
    finally { setSaving(false) }
  }

  const handleDelete = async (t: SmsTemplate) => {
    if (!window.confirm(`قالب «${t.name}» حذف شود؟`)) return
    try { await deleteSmsTemplate(t.id); showToast('success', 'حذف شد'); onChange() }
    catch { showToast('error', 'خطا در حذف') }
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
                  <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-error-600 hover:bg-error-50"><Trash2 size={14} /></button>
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
    </>
  )
}
