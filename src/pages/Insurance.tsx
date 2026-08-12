// Insurance.tsx - Persian RTL Dental Clinic Insurance Management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, FileText, Search, Building2, Percent, Eye, Plus, Edit2, Trash2, Phone, MapPin } from 'lucide-react'
import { PieChart, Pie, Cell, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  fetchInsuranceCompanies, fetchInsuranceClaims,
  createInsuranceCompany, updateInsuranceCompany, deleteInsuranceCompany,
  createInsuranceClaim, updateInsuranceClaim, deleteInsuranceClaim,
  fetchPatients,
} from '../lib/api'
import { toJalaliString, toJalaliStringPretty, formatCurrency, formatNumber, toPersianDigits } from '../lib/persianDate'
import {
  InsuranceCompany, InsuranceCompanyInput, InsuranceClaim, InsuranceClaimWithRelations,
  Patient,
} from '../types'
import { Card, Button, Badge, Spinner, EmptyState, Tabs, Wizard, Input, Select, Textarea, showToast } from '../components/ui'
import { ModuleHeader, ModuleStatCard } from '../components/ModuleHeader'
import { CLINIC_ID } from '../lib/supabase'
import { useConfirmAction } from '../components/ConfirmAction'
import { h } from '../lib/haptics'

const claimStatuses: { value: string; label: string; color: string }[] = [
  { value: 'draft', label: 'پیش‌نویس', color: 'slate' },
  { value: 'submitted', label: 'ارسال شده', color: 'primary' },
  { value: 'under_review', label: 'در حال بررسی', color: 'warning' },
  { value: 'approved', label: 'تایید شده', color: 'success' },
  { value: 'partially_approved', label: 'تایید بخشی', color: 'accent' },
  { value: 'rejected', label: 'رد شده', color: 'error' },
  { value: 'paid', label: 'پرداخت شده', color: 'success' },
]

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899']

function getClaimStatusMeta(status: string) {
  return claimStatuses.find((s) => s.value === status) || claimStatuses[0]
}

export default function Insurance() {
  const navigate = useNavigate()
  const { confirmAction, ConfirmActionModal } = useConfirmAction()

  const [activeTab, setActiveTab] = useState('companies')
  const [companies, setCompanies] = useState<InsuranceCompany[]>([])
  const [claims, setClaims] = useState<InsuranceClaimWithRelations[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Company modal
  const [companyModalOpen, setCompanyModalOpen] = useState(false)
  const [companyWizardStep, setCompanyWizardStep] = useState(0)
  const [editingCompany, setEditingCompany] = useState<InsuranceCompany | null>(null)
  const [companyForm, setCompanyForm] = useState({ name: '', code: '', phone: '', address: '', coverage_percentage: '', discount_percentage: '', is_active: 'true' })
  const [savingCompany, setSavingCompany] = useState(false)

  // Claim modal
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimWizardStep, setClaimWizardStep] = useState(0)
  const [editingClaim, setEditingClaim] = useState<InsuranceClaimWithRelations | null>(null)
  const [claimForm, setClaimForm] = useState({ patient_id: '', company_id: '', amount: '', approved_amount: '', status: 'draft', notes: '' })
  const [savingClaim, setSavingClaim] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [comps, cls, pats] = await Promise.all([
        fetchInsuranceCompanies(),
        fetchInsuranceClaims(),
        fetchPatients(),
      ])
      setCompanies(comps)
      setClaims(cls)
      setPatients(pats)
    } catch (err) {
      console.error('Error loading insurance:', err)
      showToast('error', 'خطا در بارگذاری بیمه‌ها')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies
    const q = searchQuery.toLowerCase()
    return companies.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q)
    )
  }, [companies, searchQuery])

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (searchQuery) {
        const name = c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : ''
        const comp = c.company?.name || ''
        if (!name.toLowerCase().includes(searchQuery.toLowerCase()) && !comp.toLowerCase().includes(searchQuery.toLowerCase())) return false
      }
      if (filterStatus && c.status !== filterStatus) return false
      return true
    })
  }, [claims, searchQuery, filterStatus])

  const stats = useMemo(() => {
    const totalClaims = claims.length
    const approvedCount = claims.filter((c) => c.status === 'approved' || c.status === 'partially_approved').length
    const pendingCount = claims.filter((c) => c.status === 'submitted' || c.status === 'under_review').length
    const totalAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0)
    const approvedAmount = claims.reduce((sum, c) => sum + (c.approved_amount || 0), 0)
    return { totalClaims, approvedCount, pendingCount, totalAmount, approvedAmount }
  }, [claims])

  const claimsByStatusChart = useMemo(() => {
    const counts: Record<string, number> = {}
    claims.forEach((c) => {
      const label = getClaimStatusMeta(c.status).label
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [claims])

  const claimPatientName = (c: InsuranceClaimWithRelations) => {
    return c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'نامشخص'
  }

  // ── Company CRUD ──────────────────────────────────────────
  const openCreateCompany = () => {
    setEditingCompany(null)
    setCompanyWizardStep(0)
    setCompanyForm({ name: '', code: '', phone: '', address: '', coverage_percentage: '', discount_percentage: '', is_active: 'true' })
    setCompanyModalOpen(true)
  }

  const openEditCompany = (c: InsuranceCompany) => {
    setEditingCompany(c)
    setCompanyForm({
      name: c.name,
      code: c.code || '',
      phone: c.phone || '',
      address: c.address || '',
      coverage_percentage: c.coverage_percentage != null ? String(c.coverage_percentage) : '',
      discount_percentage: c.discount_percentage != null ? String(c.discount_percentage) : '',
      is_active: c.is_active ? 'true' : 'false',
    })
    setCompanyWizardStep(0)
    setCompanyModalOpen(true)
  }

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) { showToast('error', 'نام شرکت الزامی است'); return }
    setSavingCompany(true)
    try {
      const payload: InsuranceCompanyInput = {
        clinic_id: CLINIC_ID,
        name: companyForm.name.trim(),
        code: companyForm.code || null,
        phone: companyForm.phone || null,
        address: companyForm.address || null,
        coverage_percentage: companyForm.coverage_percentage ? Number(companyForm.coverage_percentage) : null,
        discount_percentage: companyForm.discount_percentage ? Number(companyForm.discount_percentage) : null,
        is_active: companyForm.is_active === 'true',
      }
      if (editingCompany) {
        await updateInsuranceCompany(editingCompany.id, payload)
        showToast('success', 'شرکت بیمه ویرایش شد')
      } else {
        await createInsuranceCompany(payload)
        showToast('success', 'شرکت بیمه اضافه شد')
      }
      setCompanyModalOpen(false)
      loadData()
    } catch { showToast('error', 'خطا در ذخیره') } finally { setSavingCompany(false) }
  }

  const handleDeleteCompany = (c: InsuranceCompany) => {
    h.tap()
    confirmAction({
      type: 'delete',
      title: 'حذف شرکت بیمه',
      fields: [{ label: 'نام', value: c.name, highlight: true }],
      confirmLabel: 'تایید حذف',
      onConfirm: async () => { await deleteInsuranceCompany(c.id); showToast('success', 'حذف شد'); loadData() },
    })
  }

  // ── Claim CRUD ────────────────────────────────────────────
  const openCreateClaim = () => {
    setEditingClaim(null)
    setClaimWizardStep(0)
    setClaimForm({ patient_id: '', company_id: '', amount: '', approved_amount: '', status: 'draft', notes: '' })
    setClaimModalOpen(true)
  }

  const openEditClaim = (c: InsuranceClaimWithRelations) => {
    setEditingClaim(c)
    setClaimForm({
      patient_id: c.patient_id,
      company_id: c.company_id || '',
      amount: c.amount != null ? String(c.amount) : '',
      approved_amount: c.approved_amount != null ? String(c.approved_amount) : '',
      status: c.status,
      notes: c.notes || '',
    })
    setClaimWizardStep(0)
    setClaimModalOpen(true)
  }

  const handleSaveClaim = async () => {
    if (!claimForm.patient_id) { showToast('error', 'انتخاب بیمار الزامی است'); return }
    setSavingClaim(true)
    try {
      const payload: any = {
        clinic_id: CLINIC_ID,
        patient_id: claimForm.patient_id,
        company_id: claimForm.company_id || null,
        encounter_id: null,
        claim_number: null,
        amount: claimForm.amount ? Number(claimForm.amount) : null,
        approved_amount: claimForm.approved_amount ? Number(claimForm.approved_amount) : null,
        status: claimForm.status,
        submitted_at: claimForm.status !== 'draft' ? new Date().toISOString() : null,
        response_at: null,
        notes: claimForm.notes || null,
      }
      if (editingClaim) {
        await updateInsuranceClaim(editingClaim.id, payload)
        showToast('success', 'ادعا ویرایش شد')
      } else {
        await createInsuranceClaim(payload)
        showToast('success', 'ادعا ثبت شد')
      }
      setClaimModalOpen(false)
      loadData()
    } catch { showToast('error', 'خطا در ذخیره') } finally { setSavingClaim(false) }
  }

  const handleDeleteClaim = (c: InsuranceClaimWithRelations) => {
    h.tap()
    confirmAction({
      type: 'delete',
      title: 'حذف ادعا',
      fields: [{ label: 'بیمار', value: claimPatientName(c), highlight: true }],
      confirmLabel: 'تایید حذف',
      onConfirm: async () => { await deleteInsuranceClaim(c.id); showToast('success', 'حذف شد'); loadData() },
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size={32} /></div>
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        moduleKey="insurance"
        title="بیمه"
        subtitle="مدیریت شرکت‌های بیمه و ادعای بیمه"
        action={activeTab === 'companies' ? <Button variant="primary" onClick={openCreateCompany}><Plus size={16} className="inline ml-1" /> شرکت جدید</Button> : <Button variant="primary" onClick={openCreateClaim}><Plus size={16} className="inline ml-1" /> ادعای جدید</Button>}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ModuleStatCard moduleKey="insurance" icon={<Building2 size={20} />} label="شرکت‌های بیمه" value={formatNumber(companies.length)} />
        <ModuleStatCard moduleKey="insurance" icon={<FileText size={20} />} label="کل ادعاها" value={formatNumber(stats.totalClaims)} />
        <ModuleStatCard moduleKey="insurance" icon={<Shield size={20} />} label="در انتظار بررسی" value={formatNumber(stats.pendingCount)} />
        <ModuleStatCard moduleKey="insurance" icon={<Percent size={20} />} label="مبلغ تایید شده" value={`${formatCurrency(stats.approvedAmount)} ت`} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'companies', label: 'شرکت‌های بیمه', icon: <Building2 size={16} /> },
          { key: 'claims', label: 'ادعاها', icon: <FileText size={16} /> },
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
              placeholder={activeTab === 'companies' ? 'جستجوی نام یا کد شرکت...' : 'جستجوی بیمار یا شرکت...'}
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          {activeTab === 'claims' && (
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="">همه وضعیت‌ها</option>
              {claimStatuses.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </select>
          )}
          {(searchQuery || filterStatus) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFilterStatus('') }}>پاک کردن</Button>
          )}
        </div>
      </Card>

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div>
          {filteredCompanies.length === 0 ? (
            <Card className="p-5">
              <EmptyState icon={<Building2 size={28} />} title="شرکت بیمه‌ای ثبت نشده است" description="برای افزودن شرکت بیمه کلیک کنید" action={<Button size="sm" onClick={openCreateCompany}><Plus size={16} /> افزودن</Button>} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanies.map((c) => (
                <Card key={c.id} className="p-5 hover:card-shadow-lg transition-all-smooth">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
                        <Shield size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{c.name}</h3>
                        {c.code && <p className="text-xs text-slate-500">کد: {toPersianDigits(c.code)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge color={c.is_active ? 'success' : 'slate'}>{c.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                      <button onClick={() => openEditCompany(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteCompany(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-error-600 hover:bg-error-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">درصد پوشش</p>
                      <p className="text-lg font-bold text-success-600">{c.coverage_percentage != null ? `${toPersianDigits(c.coverage_percentage)}٪` : '-'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">درصد تخفیف</p>
                      <p className="text-lg font-bold text-accent-600">{c.discount_percentage != null ? `${toPersianDigits(c.discount_percentage)}٪` : '-'}</p>
                    </div>
                  </div>
                  {(c.phone || c.address) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      {c.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {toPersianDigits(c.phone)}</p>}
                      {c.address && <p className="text-xs text-slate-500 truncate flex items-center gap-1"><MapPin size={10} /> {c.address}</p>}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-0 overflow-hidden lg:col-span-2">
            {filteredClaims.length === 0 ? (
              <EmptyState icon={<FileText size={28} />} title="ادعایی ثبت نشده است" description="برای ثبت ادعای جدید کلیک کنید" action={<Button size="sm" onClick={openCreateClaim}><Plus size={16} /> افزودن</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">بیمار</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">شرکت بیمه</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">مبلغ</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">تایید شده</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">وضعیت</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map((c) => {
                      const meta = getClaimStatusMeta(c.status)
                      return (
                        <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all-smooth">
                          <td className="px-4 py-3 font-medium text-slate-800">{claimPatientName(c)}</td>
                          <td className="px-4 py-3 text-slate-600">{c.company?.name || '-'}</td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{c.amount ? `${formatCurrency(c.amount)} ت` : '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{c.approved_amount != null ? `${formatCurrency(c.approved_amount)} ت` : '-'}</td>
                          <td className="px-4 py-3"><Badge color={meta.color}>{meta.label}</Badge></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openEditClaim(c)} className="text-slate-400 hover:text-primary-600 hover:bg-primary-50 p-1 rounded-lg transition-colors"><Edit2 size={15} /></button>
                              <button onClick={() => handleDeleteClaim(c)} className="text-slate-400 hover:text-error-600 hover:bg-error-50 p-1 rounded-lg transition-colors"><Trash2 size={15} /></button>
                              <button onClick={() => navigate(`/patients/${c.patient_id}`)} className="text-primary-600 hover:text-primary-700 p-1 rounded-lg hover:bg-primary-50"><Eye size={15} /></button>
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

          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">توزیع ادعاها بر اساس وضعیت</h3>
            {claimsByStatusChart.length === 0 ? (
              <EmptyState icon={<Percent size={28} />} title="داده‌ای موجود نیست" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={claimsByStatusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(entry: any) => `${entry.name}: ${toPersianDigits(entry.value)}`}>
                    {claimsByStatusChart.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie>
                  <RTooltip formatter={(v: number) => formatNumber(v)} contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {/* Company Wizard */}
      <Wizard
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        title={editingCompany ? 'ویرایش شرکت بیمه' : 'شرکت بیمه جدید'}
        step={companyWizardStep}
        onStepChange={setCompanyWizardStep}
        onFinish={handleSaveCompany}
        finishLabel={editingCompany ? 'ذخیره' : 'افزودن'}
        saving={savingCompany}
        steps={[
          {
            label: 'مشخصات',
            validate: () => (!companyForm.name.trim() ? 'نام شرکت الزامی است' : null),
            content: (
              <>
                <Input label="نام شرکت" value={companyForm.name} onChange={(v) => setCompanyForm((p) => ({ ...p, name: v }))} placeholder="نام شرکت بیمه" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="کد" value={companyForm.code} onChange={(v) => setCompanyForm((p) => ({ ...p, code: v }))} placeholder="کد شرکت" dir="ltr" />
                  <Input label="تلفن" value={companyForm.phone} onChange={(v) => setCompanyForm((p) => ({ ...p, phone: v }))} placeholder="تلفن" dir="ltr" />
                </div>
                <Input label="آدرس" value={companyForm.address} onChange={(v) => setCompanyForm((p) => ({ ...p, address: v }))} placeholder="آدرس" />
              </>
            ),
          },
          {
            label: 'پوشش و وضعیت',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="درصد پوشش" value={companyForm.coverage_percentage} onChange={(v) => setCompanyForm((p) => ({ ...p, coverage_percentage: v }))} placeholder="مثال: 70" dir="ltr" />
                  <Input label="درصد تخفیف" value={companyForm.discount_percentage} onChange={(v) => setCompanyForm((p) => ({ ...p, discount_percentage: v }))} placeholder="مثال: 20" dir="ltr" />
                </div>
                <Select label="وضعیت" value={companyForm.is_active} onChange={(v) => setCompanyForm((p) => ({ ...p, is_active: v }))} options={[{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }]} />
              </>
            ),
          },
        ]}
      />

      {/* Claim Wizard */}
      <Wizard
        open={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        title={editingClaim ? 'ویرایش ادعا' : 'ادعای بیمه جدید'}
        step={claimWizardStep}
        onStepChange={setClaimWizardStep}
        onFinish={handleSaveClaim}
        finishLabel={editingClaim ? 'ذخیره' : 'افزودن'}
        saving={savingClaim}
        steps={[
          {
            label: 'بیمار و شرکت',
            content: (
              <>
                <Select label="بیمار" value={claimForm.patient_id} onChange={(v) => setClaimForm((p) => ({ ...p, patient_id: v }))} options={patients.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))} placeholder="انتخاب بیمار" />
                <Select label="شرکت بیمه" value={claimForm.company_id} onChange={(v) => setClaimForm((p) => ({ ...p, company_id: v }))} options={companies.map((c) => ({ value: c.id, label: c.name }))} placeholder="انتخاب شرکت" />
              </>
            ),
          },
          {
            label: 'مبلغ و وضعیت',
            content: (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="مبلغ ادعا" value={claimForm.amount} onChange={(v) => setClaimForm((p) => ({ ...p, amount: v }))} placeholder="مبلغ" dir="ltr" />
                  <Input label="مبلغ تایید شده" value={claimForm.approved_amount} onChange={(v) => setClaimForm((p) => ({ ...p, approved_amount: v }))} placeholder="مبلغ تایید شده" dir="ltr" />
                </div>
                <Select label="وضعیت" value={claimForm.status} onChange={(v) => setClaimForm((p) => ({ ...p, status: v }))} options={claimStatuses.map((s) => ({ value: s.value, label: s.label }))} />
              </>
            ),
          },
          {
            label: 'یادداشت',
            content: (
              <Textarea label="یادداشت" value={claimForm.notes} onChange={(v) => setClaimForm((p) => ({ ...p, notes: v }))} placeholder="یادداشت..." rows={3} />
            ),
          },
        ]}
      />

      {ConfirmActionModal}
    </div>
  )
}
