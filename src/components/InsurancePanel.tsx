// InsurancePanel.tsx — a patient's policies and, more importantly, how
// much ceiling they have left. A doctor quoting a covered price needs to
// know before the treatment whether the insurer will actually pay.
import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Plus, X, AlertTriangle } from 'lucide-react'
import { Card, Button, Input, Select, Badge, showToast } from './ui'
import { PersianDateInput } from './PersianDateInput'
import {
  fetchPatientPolicies, createPatientPolicy, archivePatientPolicy,
  fetchInsuranceClaims, fetchInsuranceCompanies,
} from '../lib/api'
import {
  usedCeiling, remainingCeiling, ceilingUsagePercent, isPolicyValidOn,
  validatePolicy, splitMultiTierCoverage,
} from '../lib/insurance'
import type { PatientPolicy } from '../lib/insurance'
import type { InsuranceClaim, InsuranceCompany } from '../types'
import { formatNumber, toPersianDigits, formatCurrency } from '../lib/persianDate'
import { chimes } from '../lib/chimes'
import { h } from '../lib/haptics'

interface Props {
  patientId: string
  /** Optional: when given, the panel also previews how this cost would
   * split under the best applicable policy — the number the doctor
   * actually needs before starting work. */
  previewCost?: number
}

const emptyForm = {
  company_id: '',
  policy_number: '',
  start_date: '',
  end_date: '',
  coverage_percentage: '60',
  ceiling_amount: '',
  tier: 'supplementary',
  deductible_percentage: '',
}

export function InsurancePanel({ patientId, previewCost }: Props) {
  const [policies, setPolicies] = useState<PatientPolicy[]>([])
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [companies, setCompanies] = useState<InsuranceCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    try {
      const [pols, cls, cos] = await Promise.all([
        fetchPatientPolicies(patientId),
        fetchInsuranceClaims(),
        fetchInsuranceCompanies(),
      ])
      setPolicies(pols)
      setClaims(cls.filter((c) => c.patient_id === patientId))
      setCompanies(cos)
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [patientId])

  const today = new Date().toISOString().slice(0, 10)
  const active = useMemo(() => policies.filter((p) => p.is_active), [policies])

  const draft: Partial<PatientPolicy> = {
    coverage_percentage: Number(form.coverage_percentage),
    ceiling_amount: form.ceiling_amount === '' ? null : Number(form.ceiling_amount),
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    tier: (form.tier as 'primary' | 'supplementary') || null,
    deductible_percentage: form.deductible_percentage === '' ? null : Number(form.deductible_percentage),
  }
  const errors = validatePolicy(draft)

  const preview = useMemo(() => {
    if (previewCost === undefined || active.length === 0) return null
    return splitMultiTierCoverage(previewCost, active, claims, today, companies)
  }, [previewCost, active, claims, today, companies])

  const save = async () => {
    if (errors.length) {
      chimes.playWarning()
      h.warning()
      return
    }
    await createPatientPolicy({
      patient_id: patientId,
      company_id: form.company_id || null,
      policy_number: form.policy_number || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      coverage_percentage: Number(form.coverage_percentage),
      ceiling_amount: form.ceiling_amount === '' ? null : Number(form.ceiling_amount),
      tier: (form.tier as 'primary' | 'supplementary') || null,
      deductible_percentage: form.deductible_percentage === '' ? null : Number(form.deductible_percentage),
      is_active: true,
      notes: null,
    })
    chimes.playSuccess()
    h.confirm()
    showToast('success', 'بیمه ثبت شد')
    setForm(emptyForm)
    setAdding(false)
    await load()
  }

  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name || 'بیمه‌گر نامشخص'

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">بیمه‌های بیمار</h3>
            <Badge color="slate">{toPersianDigits(active.length)} فعال</Badge>
          </div>
          <Button
            className="press-scale"
            onClick={() => {
              chimes.playPop()
              h.tap()
              setAdding((v) => !v)
            }}
          >
            {adding ? <><X size={16} /> بستن</> : <><Plus size={16} /> بیمه جدید</>}
          </Button>
        </div>

        {preview && (
          <div className={`mt-3 rounded-lg p-3 text-sm ${(preview.primaryCapped || preview.supplementaryCapped) ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
            <div className="font-semibold text-xs text-slate-500 mb-2">پیش‌نمایش تفکیک هزینه دو لایه بیمه:</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              <span>هزینه کل: <b>{formatNumber(previewCost!)}</b></span>
              {preview.primaryShare > 0 && (
                <span>سهم بیمه پایه: <b className="text-blue-700">{formatNumber(preview.primaryShare)}</b></span>
              )}
              {preview.supplementaryShare > 0 && (
                <span>سهم بیمه تکمیلی: <b className="text-emerald-700">{formatNumber(preview.supplementaryShare)}</b></span>
              )}
              {preview.franchiseAmount > 0 && (
                <span>فرانشیز: <b className="text-amber-700">{formatNumber(preview.franchiseAmount)}</b></span>
              )}
              <span>سهم نهایی بیمار: <b className="text-slate-900 font-extrabold">{formatNumber(preview.patientShare)}</b></span>
            </div>
            {preview.warning && (
              <p className="mt-2 flex items-start gap-1.5 text-amber-800">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {preview.warning}
              </p>
            )}
          </div>
        )}
      </Card>

      {adding && (
        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="بیمه‌گر"
              value={form.company_id}
              onChange={(v) => {
                const selectedCo = companies.find((c) => c.id === v)
                setForm((f) => ({
                  ...f,
                  company_id: v,
                  tier: selectedCo?.tier || f.tier,
                }))
              }}
              options={[{ value: '', label: 'انتخاب کنید' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <Select
              label="نوع بیمه"
              value={form.tier}
              onChange={(v) => setForm((f) => ({ ...f, tier: v }))}
              options={[
                { value: 'supplementary', label: 'بیمه تکمیلی (ایران، دانا، البرز و...)' },
                { value: 'primary', label: 'بیمه پایه (تامین اجتماعی، سلامت، نیروهای مسلح)' },
              ]}
            />
            <Input label="شماره بیمه‌نامه" value={form.policy_number} onChange={(v) => setForm((f) => ({ ...f, policy_number: v }))} dir="ltr" />
            <PersianDateInput label="تاریخ شروع" value={form.start_date} onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} />
            <PersianDateInput label="تاریخ پایان" value={form.end_date} onChange={(v) => setForm((f) => ({ ...f, end_date: v }))} />
            <Input label="درصد پوشش" value={form.coverage_percentage} onChange={(v) => setForm((f) => ({ ...f, coverage_percentage: v }))} dir="ltr" />
            <Input label="درصد فرانشیز (خالی = صفر)" value={form.deductible_percentage} onChange={(v) => setForm((f) => ({ ...f, deductible_percentage: v }))} dir="ltr" placeholder="مثلاً ۱۰ یا ۲۰" />
            <Input label="سقف تعهد (خالی = نامحدود)" value={form.ceiling_amount} onChange={(v) => setForm((f) => ({ ...f, ceiling_amount: v }))} dir="ltr" />
          </div>
          {errors.length > 0 && (
            <ul className="mt-3 text-xs text-red-600 list-disc pr-5 space-y-0.5">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          <Button className="mt-3 press-scale" onClick={save} disabled={errors.length > 0}>ثبت بیمه</Button>
        </Card>
      )}

      {loading ? (
        <Card className="p-4"><p className="text-sm text-slate-500">در حال بارگذاری…</p></Card>
      ) : active.length === 0 ? (
        <Card className="p-4"><p className="text-sm text-slate-500">بیمه‌ای برای این بیمار ثبت نشده است.</p></Card>
      ) : (
        active.map((p) => {
          const used = usedCeiling(claims, p.company_id)
          const left = remainingCeiling(p, claims)
          const pct = ceilingUsagePercent(p, claims)
          const valid = isPolicyValidOn(p, today)
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{companyName(p.company_id)}</span>
                    <Badge color={p.tier === 'primary' ? 'accent' : 'primary'}>
                      {p.tier === 'primary' ? 'بیمه پایه' : 'بیمه تکمیلی'}
                    </Badge>
                    <Badge color={valid ? 'success' : 'error'}>{valid ? 'معتبر' : 'منقضی'}</Badge>
                    <Badge color="slate">پوشش {toPersianDigits(p.coverage_percentage)}٪</Badge>
                    {p.deductible_percentage ? (
                      <Badge color="warning">فرانشیز {toPersianDigits(p.deductible_percentage)}٪</Badge>
                    ) : null}
                  </div>
                  {p.policy_number && <p className="text-xs text-slate-500 mt-0.5" dir="ltr">{p.policy_number}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="press-scale"
                  onClick={async () => {
                    chimes.playPop()
                    h.delete()
                    await archivePatientPolicy(p.id)
                    await load()
                  }}
                >
                  غیرفعال کردن
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <Stat label="سقف تعهد" value={p.ceiling_amount === null ? 'نامحدود' : formatNumber(p.ceiling_amount)} />
                <Stat label="استفاده تا کنون" value={formatNumber(used)} />
                <Stat label="مانده" value={left === null ? 'نامحدود' : formatNumber(left)} />
              </div>

              {pct !== null && (
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{toPersianDigits(pct)}٪ از سقف مصرف شده</p>
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <span className="block text-xs text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  )
}
