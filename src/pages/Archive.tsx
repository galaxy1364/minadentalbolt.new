import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive as ArchiveIcon, Search, Users, IdCard, RotateCcw, User, Building2 } from 'lucide-react'
import { fetchPatients, fetchStaff, updatePatient, updateStaff, fetchInsuranceCompanies, updateInsuranceCompany } from '../lib/api'
import { toJalaliStringPretty, toPersianDigits } from '../lib/persianDate'
import type { Patient, Staff as StaffType, InsuranceCompany } from '../types'
import { Card, Button, Spinner, EmptyState, Tabs, showToast, HighlightText } from '../components/ui'
import { ModuleHeader } from '../components/ModuleHeader'
import { useConfirmAction } from '../components/ConfirmAction'
import { scoreFields } from '../lib/fuzzySearch'
import { h } from '../lib/haptics'

export default function Archive() {
  const navigate = useNavigate()
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  const [tab, setTab] = useState<'patients' | 'staff' | 'insurance'>('patients')
  const [patients, setPatients] = useState<Patient[]>([])
  const [staff, setStaff] = useState<StaffType[]>([])
  const [companies, setCompanies] = useState<InsuranceCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [pats, st, comps] = await Promise.all([fetchPatients(), fetchStaff(), fetchInsuranceCompanies()])
      setPatients(pats.filter((p) => !p.is_active))
      setStaff(st.filter((s) => !s.is_active))
      setCompanies(comps.filter((c) => !c.is_active))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients
    return patients
      .map((p) => ({ p, score: scoreFields(search, [{ value: `${p.first_name} ${p.last_name}`, weight: 1.2 }, { value: p.phone || '' }, { value: p.file_number || '' }]) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .map((r) => r.p)
  }, [patients, search])

  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staff
    return staff
      .map((s) => ({ s, score: scoreFields(search, [{ value: s.full_name, weight: 1.2 }, { value: s.phone || '' }]) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .map((r) => r.s)
  }, [staff, search])

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies
    return companies
      .map((c) => ({ c, score: scoreFields(search, [{ value: c.name, weight: 1.2 }]) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .map((r) => r.c)
  }, [companies, search])

  const handleRestorePatient = (p: Patient) => {
    h.tap()
    confirmAction({
      type: 'status',
      title: 'بازگردانی بیمار',
      fields: [{ label: 'نام', value: `${p.first_name} ${p.last_name}`, icon: <User size={16} />, highlight: true }],
      confirmLabel: 'بازگردانی به لیست فعال',
      onConfirm: async () => {
        await updatePatient(p.id, { is_active: true })
        showToast('success', 'بیمار بازگردانی شد')
        loadData()
      },
    })
  }

  const handleRestoreStaff = (s: StaffType) => {
    h.tap()
    confirmAction({
      type: 'status',
      title: 'بازگردانی پرسنل',
      fields: [{ label: 'نام', value: s.full_name, icon: <User size={16} />, highlight: true }],
      confirmLabel: 'بازگردانی به لیست فعال',
      onConfirm: async () => {
        await updateStaff(s.id, { is_active: true })
        showToast('success', 'پرسنل بازگردانی شد')
        loadData()
      },
    })
  }

  const handleRestoreCompany = (c: InsuranceCompany) => {
    h.tap()
    confirmAction({
      type: 'status',
      title: 'بازگردانی شرکت بیمه',
      fields: [{ label: 'نام', value: c.name, icon: <Building2 size={16} />, highlight: true }],
      confirmLabel: 'بازگردانی به لیست فعال',
      onConfirm: async () => {
        await updateInsuranceCompany(c.id, { is_active: true })
        showToast('success', 'شرکت بیمه بازگردانی شد')
        loadData()
      },
    })
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-12 rounded-xl" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ModuleHeader
        moduleKey="archive"
        title="بایگانی"
        subtitle={`${toPersianDigits(patients.length + staff.length + companies.length)} مورد غیرفعال‌شده`}
      />

      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در بایگانی..."
          aria-label="جستجو در بایگانی"
          className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>

      <Tabs
        tabs={[
          { key: 'patients', label: 'بیماران', icon: <Users size={16} /> },
          { key: 'staff', label: 'پرسنل', icon: <IdCard size={16} /> },
          { key: 'insurance', label: 'بیمه', icon: <Building2 size={16} /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as 'patients' | 'staff' | 'insurance')}
      />

      {tab === 'patients' && (
        filteredPatients.length === 0 ? (
          <EmptyState icon={<ArchiveIcon size={40} />} title="بایگانی بیماران خالی است" description="بیماران غیرفعال‌شده اینجا نمایش داده می‌شوند" />
        ) : (
          <div className="space-y-2">
            {filteredPatients.map((p) => (
              <Card key={p.id} className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm shrink-0">
                  {p.first_name[0]}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    <HighlightText text={`${p.first_name} ${p.last_name}`} query={search} />
                  </p>
                  <p className="text-[11px] text-slate-400">{p.file_number || 'بدون پرونده'} — غیرفعال از {toJalaliStringPretty(p.updated_at)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRestorePatient(p)}>
                  <RotateCcw size={14} className="inline ml-1" /> بازگردانی
                </Button>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'staff' && (
        filteredStaff.length === 0 ? (
          <EmptyState icon={<ArchiveIcon size={40} />} title="بایگانی پرسنل خالی است" description="پرسنل غیرفعال‌شده اینجا نمایش داده می‌شوند" />
        ) : (
          <div className="space-y-2">
            {filteredStaff.map((s) => (
              <Card key={s.id} className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-sm shrink-0">
                  {s.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    <HighlightText text={s.full_name} query={search} />
                  </p>
                  <p className="text-[11px] text-slate-400">غیرفعال از {toJalaliStringPretty(s.updated_at)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRestoreStaff(s)}>
                  <RotateCcw size={14} className="inline ml-1" /> بازگردانی
                </Button>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'insurance' && (
        filteredCompanies.length === 0 ? (
          <EmptyState icon={<ArchiveIcon size={40} />} title="بایگانی بیمه خالی است" description="شرکت‌های بیمه‌ی غیرفعال‌شده اینجا نمایش داده می‌شوند" />
        ) : (
          <div className="space-y-2">
            {filteredCompanies.map((c) => (
              <Card key={c.id} className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    <HighlightText text={c.name} query={search} />
                  </p>
                  <p className="text-[11px] text-slate-400">غیرفعال از {toJalaliStringPretty(c.updated_at)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRestoreCompany(c)}>
                  <RotateCcw size={14} className="inline ml-1" /> بازگردانی
                </Button>
              </Card>
            ))}
          </div>
        )
      )}

      {ConfirmActionModal}
    </div>
  )
}
