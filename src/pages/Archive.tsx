import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive as ArchiveIcon, Search, Users, IdCard, RotateCcw, User, Building2, Syringe, FlaskConical, Settings2 } from 'lucide-react'
import { fetchPatients, fetchStaff, updatePatient, updateStaff, fetchInsuranceCompanies, updateInsuranceCompany, fetchImplantCases, updateImplantCase, fetchLabs, updateLab,
  fetchDoctors, updateDoctor, fetchUnits, updateUnit, fetchProcedures, updateProcedure,
  fetchInventoryItems, updateInventoryItem, fetchTreatmentPackages, updateTreatmentPackage,
  fetchSmsTemplates, updateSmsTemplate } from '../lib/api'
import { toJalaliStringPretty, toPersianDigits, formatCurrency } from '../lib/persianDate'
import type { Patient, Staff as StaffType, InsuranceCompany, ImplantCaseWithRelations, Laboratory } from '../types'
import { Card, Button, Spinner, EmptyState, Tabs, showToast, HighlightText } from '../components/ui'
import { ModuleHeader } from '../components/ModuleHeader'
import { useConfirmAction } from '../components/ConfirmAction'
import { scoreFields } from '../lib/fuzzySearch'
import { h } from '../lib/haptics'

export default function Archive() {
  const navigate = useNavigate()
  const { confirmAction, ConfirmActionModal } = useConfirmAction()
  const [tab, setTab] = useState<'patients' | 'staff' | 'insurance' | 'implants' | 'labs' | 'config'>('patients')
  const [patients, setPatients] = useState<Patient[]>([])
  const [staff, setStaff] = useState<StaffType[]>([])
  const [companies, setCompanies] = useState<InsuranceCompany[]>([])
  const [implantCases, setImplantCases] = useState<ImplantCaseWithRelations[]>([])
  const [labs, setLabs] = useState<Laboratory[]>([])
  /** Everything deactivated in Settings. Migration 026 stopped these
   * being deleted, which left them one-way: you could retire a procedure
   * or a doctor and had no way to bring it back except through the
   * database. That is not a safe thing to ship. */
  const [configRows, setConfigRows] = useState<{ kind: string; label: string; id: string; name: string; restore: (id: string) => Promise<unknown> }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [pats, st, comps, cases, labList] = await Promise.all([fetchPatients(), fetchStaff(), fetchInsuranceCompanies(), fetchImplantCases(), fetchLabs()])
      setPatients(pats.filter((p) => !p.is_active))
      setStaff(st.filter((s) => !s.is_active))
      setCompanies(comps.filter((c) => !c.is_active))
      setImplantCases(cases.filter((c) => c.is_active === false))
      setLabs(labList.filter((l) => !l.is_active))

      const [docs, units, procs, inv, packs, tmpl] = await Promise.all([
        fetchDoctors().catch(() => []), fetchUnits().catch(() => []),
        fetchProcedures().catch(() => []), fetchInventoryItems().catch(() => []),
        fetchTreatmentPackages().catch(() => []), fetchSmsTemplates().catch(() => []),
      ])
      const inactive = <T extends { id: string; is_active?: boolean | null }>(
        rows: T[], kind: string, label: string,
        name: (r: T) => string, restore: (id: string) => Promise<unknown>,
      ) => rows.filter((r) => r.is_active === false)
        .map((r) => ({ kind, label, id: r.id, name: name(r), restore }))

      setConfigRows([
        ...inactive(docs as any[], 'doctor', 'پزشک', (d: any) => `دکتر ${d.name || ''}`, (id) => updateDoctor(id, { is_active: true } as never)),
        ...inactive(units as any[], 'unit', 'یونیت', (u: any) => u.name || '', (id) => updateUnit(id, { is_active: true } as never)),
        ...inactive(procs as any[], 'procedure', 'رویه', (p: any) => `${p.name || ''} (${p.code || ''})`, (id) => updateProcedure(id, { is_active: true } as never)),
        ...inactive(inv as any[], 'inventory', 'کالا', (i: any) => i.name || '', (id) => updateInventoryItem(id, { is_active: true } as never)),
        ...inactive(packs as any[], 'package', 'پکیج', (p: any) => p.name || '', (id) => updateTreatmentPackage(id, { is_active: true } as never)),
        ...inactive(tmpl as any[], 'template', 'قالب پیامک', (t: any) => t.name || '', (id) => updateSmsTemplate(id, { is_active: true } as never)),
      ])
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

  const filteredImplantCases = useMemo(() => {
    if (!search.trim()) return implantCases
    return implantCases
      .map((c) => ({ c, score: scoreFields(search, [{ value: c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : '', weight: 1.2 }, { value: c.brand || '' }]) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .map((r) => r.c)
  }, [implantCases, search])

  const filteredLabs = useMemo(() => {
    if (!search.trim()) return labs
    return labs
      .map((l) => ({ l, score: scoreFields(search, [{ value: l.name, weight: 1.2 }]) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .map((r) => r.l)
  }, [labs, search])

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

  const handleRestoreImplantCase = (c: ImplantCaseWithRelations) => {
    h.tap()
    confirmAction({
      type: 'status',
      title: 'بازگردانی مورد ایمپلنت',
      fields: [{ label: 'بیمار', value: c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : '-', icon: <User size={16} />, highlight: true }],
      confirmLabel: 'بازگردانی به لیست فعال',
      onConfirm: async () => {
        await updateImplantCase(c.id, { is_active: true } as any)
        showToast('success', 'مورد ایمپلنت بازگردانی شد')
        loadData()
      },
    })
  }

  const handleRestoreLab = (l: Laboratory) => {
    h.tap()
    confirmAction({
      type: 'status',
      title: 'بازگردانی لابراتوار',
      fields: [{ label: 'نام', value: l.name, icon: <Building2 size={16} />, highlight: true }],
      confirmLabel: 'بازگردانی به لیست فعال',
      onConfirm: async () => {
        await updateLab(l.id, { is_active: true } as any)
        showToast('success', 'لابراتوار بازگردانی شد')
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
        subtitle={`${toPersianDigits(patients.length + staff.length + companies.length + implantCases.length + labs.length)} مورد غیرفعال‌شده`}
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
          { key: 'implants', label: 'ایمپلنت', icon: <Syringe size={16} /> },
          { key: 'labs', label: 'لابراتوار', icon: <FlaskConical size={16} /> },
          { key: 'config', label: 'تنظیمات', icon: <Settings2 size={16} /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
      />

      {tab === 'config' && (
        configRows.length === 0 ? (
          <EmptyState icon={<Settings2 size={40} />} title="مورد غیرفعالی نیست" description="پزشک، یونیت، رویه، کالا، پکیج و قالب پیامکِ غیرفعال‌شده اینجا برمی‌گردند" />
        ) : (
          <div className="space-y-2">
            {configRows.map((r) => (
              <Card key={`${r.kind}:${r.id}`} className="p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.label}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    h.tap()
                    confirmAction({
                      type: 'status',
                      title: 'فعال‌سازی دوباره',
                      fields: [{ label: r.label, value: r.name, highlight: true }],
                      confirmLabel: 'فعال کن',
                      onConfirm: async () => {
                        await r.restore(r.id)
                        showToast('success', 'فعال شد')
                        await loadData()
                      },
                    })
                  }}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <RotateCcw size={14} /> فعال‌سازی
                </Button>
              </Card>
            ))}
          </div>
        )
      )}

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

      {tab === 'implants' && (
        filteredImplantCases.length === 0 ? (
          <EmptyState icon={<ArchiveIcon size={40} />} title="بایگانی ایمپلنت خالی است" description="موارد ایمپلنت آرشیوشده اینجا نمایش داده می‌شوند" />
        ) : (
          <div className="space-y-2">
            {filteredImplantCases.map((c) => (
              <Card key={c.id} className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  <Syringe size={18} />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/patients/${c.patient_id}`)}>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    <HighlightText text={c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'بیمار حذف‌شده'} query={search} />
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {c.brand || 'بدون برند'} — دندان {toPersianDigits(c.tooth_number || '-')} — {formatCurrency(c.total_cost || 0)} ت — آرشیو از {toJalaliStringPretty(c.updated_at)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRestoreImplantCase(c)}>
                  <RotateCcw size={14} className="inline ml-1" /> بازگردانی
                </Button>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'labs' && (
        filteredLabs.length === 0 ? (
          <EmptyState icon={<ArchiveIcon size={40} />} title="بایگانی لابراتوار خالی است" description="لابراتوارهای غیرفعال‌شده اینجا نمایش داده می‌شوند" />
        ) : (
          <div className="space-y-2">
            {filteredLabs.map((l) => (
              <Card key={l.id} className="p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  <FlaskConical size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    <HighlightText text={l.name} query={search} />
                  </p>
                  <p className="text-[11px] text-slate-400">غیرفعال از {toJalaliStringPretty(l.updated_at)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRestoreLab(l)}>
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
