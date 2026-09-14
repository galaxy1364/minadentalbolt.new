// OrthodonticChart.tsx — Professional Orthodontic & Occlusal Bite Analysis Chart
import React, { useState, useMemo } from 'react'
import {
  OrthoExam,
  OrthoExamInput,
  AngleMolarClass,
  AngleCanineClass,
  ArchDiscrepancyDegree,
  FacialProfileType,
  LipCompetenceType,
  TmjStatusType,
  OrthoTreatmentStage,
  OrthoApplianceType,
  Doctor,
  Patient,
} from '../types'
import {
  ANGLE_MOLAR_LABELS,
  ANGLE_CANINE_LABELS,
  ARCH_DISCREPANCY_LABELS,
  FACIAL_PROFILE_LABELS,
  LIP_COMPETENCE_LABELS,
  TMJ_STATUS_LABELS,
  HABIT_LABELS,
  TREATMENT_STAGE_LABELS,
  APPLIANCE_TYPE_LABELS,
  analyzeOverjet,
  analyzeOverbite,
  calculateOrthoComplexity,
  createEmptyOrthoExam,
  generateOrthoReportHtml,
} from '../lib/orthodontic'
import { toPersianDigits, toJalaliStringPretty } from '../lib/persianDate'
import { Card, Button, Badge, showToast } from './ui'
import {
  Sparkles,
  Save,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Stethoscope,
  Activity,
  Layers,
  Smile,
  ShieldCheck,
  FileCheck,
  Loader2,
} from 'lucide-react'
import { buildPrintDocument } from '../lib/printDocument'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'

interface OrthodonticChartProps {
  patientId: string
  patientName: string
  doctors: Doctor[]
  exam?: OrthoExam | null
  patient?: Patient | null
  onSave: (examData: OrthoExamInput) => Promise<void>
}

export function OrthodonticChart({
  patientId,
  patientName,
  doctors,
  exam,
  patient,
  onSave,
}: OrthodonticChartProps) {
  // Initialize form state
  const [formData, setFormData] = useState<OrthoExamInput>(() => {
    if (exam) {
      const { id, created_at, updated_at, ...rest } = exam
      return rest
    }
    return createEmptyOrthoExam(patientId)
  })

  const [saving, setSaving] = useState(false)

  // Real-time analysis metrics
  const ojAnalysis = useMemo(() => analyzeOverjet(formData.overjet_mm), [formData.overjet_mm])
  const obAnalysis = useMemo(() => analyzeOverbite(formData.overbite_percent), [formData.overbite_percent])
  const complexity = useMemo(() => calculateOrthoComplexity(formData, patient), [formData, patient])

  const currentDoctor = useMemo(() => {
    return doctors.find((d) => d.id === formData.doctor_id) || null
  }, [doctors, formData.doctor_id])

  const updateField = <K extends keyof OrthoExamInput>(field: K, value: OrthoExamInput[K]) => {
    h.tap()
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleHabit = (habitKey: string) => {
    h.tap()
    setFormData((prev) => {
      const current = prev.habits || []
      const updated = current.includes(habitKey)
        ? current.filter((h) => h !== habitKey)
        : [...current, habitKey]
      return { ...prev, habits: updated }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
      h.confirm()
      chimes.playSuccess()
      showToast('success', 'آنالیز ارتودنسی و روابط بایت با موفقیت ثبت شد')
    } catch {
      h.warning()
      chimes.playWarning()
      showToast('error', 'خطا در ذخیره‌سازی ارزیابی ارتودنسی')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    h.tap()
    chimes.playPop()
    const win = window.open('', '_blank', 'width=850,height=950')
    if (!win) return

    const examObj: OrthoExam = {
      ...formData,
      id: exam?.id || 'temp',
      clinic_id: 'default',
      created_at: exam?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const reportHtml = generateOrthoReportHtml(examObj, patient || ({ id: patientId, first_name: patientName, last_name: '' } as any), currentDoctor)

    const styles = `
      body { font-family: Tahoma, 'IRANSans', Arial, sans-serif; margin: 0; padding: 0; background: #ffffff; }
      @media print {
        body { padding: 0; }
        @page { size: A4; margin: 12mm; }
      }
    `

    win.document.write(
      buildPrintDocument({
        title: `گزارش آنالیز ارتودنسی - ${patientName}`,
        styles,
        bodyHtml: reportHtml,
      })
    )
    win.document.close()
    win.focus()
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Top Header & Hero Card ── */}
      <Card className="p-5 bg-gradient-to-l from-indigo-50/70 via-white to-sky-50/50 dark:from-slate-850 dark:via-slate-800 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                آنالیز جامع ارتودنسی و ثبت روابط اکلوزال (Angle Malocclusion)
                <Badge color="primary">
                  ADA {complexity.primaryCdtCode}
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ارزیابی سه‌بعدی روابط فک و دندان‌ها، شاخص ناهنجاری، راهنمای کانین و طرح درمان اختصاصی
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrint}
              className="min-h-[44px]"
            >
              <span className="flex items-center gap-1.5">
                <Printer className="w-4 h-4" />
                چاپ گزارش بالینی / ارجاع
              </span>
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={saving}
              onClick={handleSave}
              className="min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <span className="flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ذخیره آنالیز ارتودنسی
              </span>
            </Button>
          </div>
        </div>

        {/* Dynamic Severity & Complexity Banner */}
        <div className="mt-5 pt-4 border-t border-indigo-100/80 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium">شاخص پیچیدگی درمان (OCS)</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-bold text-indigo-700 dark:text-indigo-400">
                {toPersianDigits(complexity.score)} / ۱۰۰
              </span>
              <Badge
                color={
                  complexity.color === 'error'
                    ? 'error'
                    : complexity.color === 'warning'
                    ? 'warning'
                    : complexity.color === 'info'
                    ? 'accent'
                    : 'success'
                }
              >
                {complexity.tierLabel}
              </Badge>
            </div>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium">طول دوره تخمینی</span>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                {toPersianDigits(formData.estimated_duration_months || complexity.recommendedDurationMonths)} ماه
              </span>
            </div>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium">پزشک معالج / متخصص</span>
            <div className="flex items-center gap-2 mt-1">
              <Stethoscope className="w-4 h-4 text-indigo-600" />
              <select
                value={formData.doctor_id || ''}
                onChange={(e) => updateField('doctor_id', e.target.value || null)}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="">(انتخاب پزشک ارتودنتیست)</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name ? `دکتر ${d.name}` : 'پزشک'} ({d.specialty || 'دندانپزشک'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium">مرحله بالینی درمان</span>
            <div className="flex items-center gap-2 mt-1">
              <Layers className="w-4 h-4 text-sky-600" />
              <select
                value={formData.treatment_stage}
                onChange={(e) => updateField('treatment_stage', e.target.value as OrthoTreatmentStage)}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                {Object.entries(TREATMENT_STAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 1: Angle's Classification of Malocclusion ── */}
      <Card className="p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-750">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            ۱. طبقه‌بندی روابط مولار و کانین (Angle's Molar & Canine Relationships)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Right Molar */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
              <span>مولار اول سمت راست (Right First Molar):</span>
              <span className="text-[11px] text-indigo-600 font-mono">
                {ANGLE_MOLAR_LABELS[formData.molar_class_right]?.short}
              </span>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {(['class_1', 'class_2_div_1', 'class_2_div_2', 'class_3', 'not_applicable'] as AngleMolarClass[]).map(
                (cls) => {
                  const selected = formData.molar_class_right === cls
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => updateField('molar_class_right', cls)}
                      className={`text-right px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[44px] flex items-center justify-between ${
                        selected
                          ? 'bg-indigo-600 text-white shadow-sm font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{ANGLE_MOLAR_LABELS[cls].label}</span>
                      {selected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    </button>
                  )
                }
              )}
            </div>
          </div>

          {/* Left Molar */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
              <span>مولار اول سمت چپ (Left First Molar):</span>
              <span className="text-[11px] text-indigo-600 font-mono">
                {ANGLE_MOLAR_LABELS[formData.molar_class_left]?.short}
              </span>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {(['class_1', 'class_2_div_1', 'class_2_div_2', 'class_3', 'not_applicable'] as AngleMolarClass[]).map(
                (cls) => {
                  const selected = formData.molar_class_left === cls
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => updateField('molar_class_left', cls)}
                      className={`text-right px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[44px] flex items-center justify-between ${
                        selected
                          ? 'bg-indigo-600 text-white shadow-sm font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{ANGLE_MOLAR_LABELS[cls].label}</span>
                      {selected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    </button>
                  )
                }
              )}
            </div>
          </div>

          {/* Right Canine */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              دندان نیش راست (Right Canine):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['class_1', 'class_2', 'class_3', 'not_applicable'] as AngleCanineClass[]).map((cls) => {
                const selected = formData.canine_class_right === cls
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => updateField('canine_class_right', cls)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[44px] flex items-center justify-center text-center ${
                      selected
                        ? 'bg-violet-600 text-white font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {ANGLE_CANINE_LABELS[cls].label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Left Canine */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              دندان نیش چپ (Left Canine):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['class_1', 'class_2', 'class_3', 'not_applicable'] as AngleCanineClass[]).map((cls) => {
                const selected = formData.canine_class_left === cls
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => updateField('canine_class_left', cls)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[44px] flex items-center justify-center text-center ${
                      selected
                        ? 'bg-violet-600 text-white font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {ANGLE_CANINE_LABELS[cls].label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 2: Sagittal & Vertical Analysis (Overjet & Overbite) ── */}
      <Card className="p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-750">
          <Smile className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            ۲. ارزیابی ساژیتال و عمودی (اورجت افقی، اوربایت عمودی و خط میانی)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Overjet Slider & Input */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                اورجت افقی (Overjet)
              </label>
              <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600">
                {formData.overjet_mm} mm
              </span>
            </div>

            <input
              type="range"
              min={-6}
              max={14}
              step={0.5}
              value={formData.overjet_mm}
              onChange={(e) => updateField('overjet_mm', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-6mm (معکوس)</span>
              <span>0 (Edge)</span>
              <span>+2mm (نرمال)</span>
              <span>+14mm</span>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200">
              {ojAnalysis.label}
            </div>
          </div>

          {/* Overbite Slider & Input */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                اوربایت عمودی (Overbite)
              </label>
              <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600">
                {formData.overbite_percent} %
              </span>
            </div>

            <input
              type="range"
              min={-50}
              max={100}
              step={5}
              value={formData.overbite_percent}
              onChange={(e) => updateField('overbite_percent', parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-50% (اپن بایت)</span>
              <span>0%</span>
              <span>25% (نرمال)</span>
              <span>100% (دیپ)</span>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200">
              {obAnalysis.label}
            </div>
          </div>

          {/* Midline Shifts */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              انحراف خط میانی دندان‌ها (Midline Shift)
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">فک بالا (mm):</span>
                <input
                  type="number"
                  step={0.5}
                  value={formData.midline_shift_upper_mm}
                  onChange={(e) => updateField('midline_shift_upper_mm', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-center font-mono"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">فک پایین (mm):</span>
                <input
                  type="number"
                  step={0.5}
                  value={formData.midline_shift_lower_mm}
                  onChange={(e) => updateField('midline_shift_lower_mm', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-center font-mono"
                />
              </div>

              <div className="text-[11px] text-slate-400 mt-1">
                {formData.midline_shift_upper_mm === 0 && formData.midline_shift_lower_mm === 0
                  ? 'خطوط میانی کاملاً منطبق (Coincident)'
                  : 'دارای شیفت خط میانی نسبت به پلن صورتی'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 3: Transverse Discrepancies & Arch Crowding/Spacing ── */}
      <Card className="p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-750">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            ۳. ناهماهنگی‌های عرضی و فضایی (Crossbites, Crowding & Spacing)
          </h3>
        </div>

        {/* Crossbites toggles */}
        <div className="mb-5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-2">
            کراس‌بایت‌ها (Crossbites):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'crossbite_anterior', label: 'کراس‌بایت قدامی (Anterior Crossbite)' },
              { key: 'crossbite_posterior_right', label: 'کراس‌بایت خلفی راست (Posterior Right)' },
              { key: 'crossbite_posterior_left', label: 'کراس‌بایت خلفی چپ (Posterior Left)' },
            ].map(({ key, label }) => {
              const active = formData[key as keyof OrthoExamInput] as boolean
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateField(key as any, !active)}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all min-h-[48px] flex items-center justify-between ${
                    active
                      ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{label}</span>
                  {active ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <span className="text-[10px] text-slate-400">ندارد</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Crowding & Spacing grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Crowding */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              کراودینگ و کمبود فضا (Crowding)
            </span>
            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">فک بالا (Maxillary):</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['none', 'mild', 'moderate', 'severe'] as ArchDiscrepancyDegree[]).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => updateField('crowding_upper', deg)}
                      className={`py-1.5 px-2 rounded text-xs font-medium text-center transition-all ${
                        formData.crowding_upper === deg
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {ARCH_DISCREPANCY_LABELS[deg].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">فک پایین (Mandibular):</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['none', 'mild', 'moderate', 'severe'] as ArchDiscrepancyDegree[]).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => updateField('crowding_lower', deg)}
                      className={`py-1.5 px-2 rounded text-xs font-medium text-center transition-all ${
                        formData.crowding_lower === deg
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {ARCH_DISCREPANCY_LABELS[deg].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Spacing & Diastema */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              فاصله‌داری و دیاستم (Spacing & Diastema)
            </span>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">دیاستم خط میانی سنترال‌ها (mm):</span>
                <input
                  type="number"
                  min={0}
                  max={12}
                  step={0.5}
                  value={formData.diastema_mm}
                  onChange={(e) => updateField('diastema_mm', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs text-center font-mono"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">اسپیسینگ فک بالا:</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['none', 'mild', 'moderate', 'severe'] as ArchDiscrepancyDegree[]).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => updateField('spacing_upper', deg)}
                      className={`py-1.5 px-2 rounded text-xs font-medium text-center transition-all ${
                        formData.spacing_upper === deg
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {ARCH_DISCREPANCY_LABELS[deg].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">اسپیسینگ فک پایین:</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['none', 'mild', 'moderate', 'severe'] as ArchDiscrepancyDegree[]).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => updateField('spacing_lower', deg)}
                      className={`py-1.5 px-2 rounded text-xs font-medium text-center transition-all ${
                        formData.spacing_lower === deg
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {ARCH_DISCREPANCY_LABELS[deg].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 4: Facial Profile, Lip Competence & TMJ ── */}
      <Card className="p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-750">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            ۴. ارزیابی اسکلتال پروفایل صورت، بافت نرم و مفصل فکی گیجگاهی (TMJ)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Facial Profile */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              پروفایل بافت نرم صورت:
            </label>
            <div className="space-y-1.5">
              {(['straight', 'convex', 'concave'] as FacialProfileType[]).map((prof) => (
                <button
                  key={prof}
                  type="button"
                  onClick={() => updateField('facial_profile', prof)}
                  className={`w-full text-right p-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px] flex items-center justify-between ${
                    formData.facial_profile === prof
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{FACIAL_PROFILE_LABELS[prof].label}</span>
                  {formData.facial_profile === prof && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Lip Competence */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              وضعیت قرارگیری لب‌ها (Lip Competence):
            </label>
            <div className="space-y-1.5">
              {(['competent', 'incompetent', 'potentially_competent'] as LipCompetenceType[]).map((lip) => (
                <button
                  key={lip}
                  type="button"
                  onClick={() => updateField('lip_competence', lip)}
                  className={`w-full text-right p-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px] flex items-center justify-between ${
                    formData.lip_competence === lip
                      ? 'bg-violet-600 text-white font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{LIP_COMPETENCE_LABELS[lip]}</span>
                  {formData.lip_competence === lip && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* TMJ Status */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              معاینه مفصل گیجگاهی فکی (TMJ):
            </label>
            <select
              value={formData.tmj_status}
              onChange={(e) => updateField('tmj_status', e.target.value as TmjStatusType)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 min-h-[44px]"
            >
              {Object.entries(TMJ_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              بررسی انحراف مندیبل در باز کردن، کلیک، کریپتاسیون و تندرنس تریگوئید لترال
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 5: Oral Habits & Appliance Selection ── */}
      <Card className="p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-750">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            ۵. عادات دهانی مخرب، سیستم دستگاه ارتودنسی و یادداشت‌های بالینی
          </h3>
        </div>

        {/* Oral Habits Multi-select */}
        <div className="mb-5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-2">
            عادات دهانی ثبت‌شده (Deleterious Oral Habits):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(HABIT_LABELS).map(([key, label]) => {
              const selected = (formData.habits || []).includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleHabit(key)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all min-h-[48px] flex items-center justify-between text-right ${
                    selected
                      ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200 font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{label}</span>
                  {selected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Appliance & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
              دستگاه درمانی انتخابی (Appliance):
            </label>
            <select
              value={formData.appliance_type}
              onChange={(e) => updateField('appliance_type', e.target.value as OrthoApplianceType)}
              className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 min-h-[44px]"
            >
              {Object.entries(APPLIANCE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
              مدت زمان تخمینی دوره فعال (ماه):
            </label>
            <input
              type="number"
              min={3}
              max={48}
              value={formData.estimated_duration_months || 18}
              onChange={(e) => updateField('estimated_duration_months', parseInt(e.target.value, 10) || null)}
              className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 min-h-[44px]"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              یادداشت‌های اختصاصی و پلن بیومکانیک:
            </label>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              الگوهای آماده بالینی:
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            {[
              'سیم اولیه 0.014 NiTi و الاینمنت',
              'تسطیح قوس با سیم 0.016×0.022 SS',
              'الاستیک کلاس ۲ دوطرفه (3/16 inch, 4.5 oz)',
              'کشیدن پرمولرهای اول جهت رفع کراودینگ شدید',
              'تعبیه مینی‌اسکرو (TAD) در باکال بین ۵ و ۶',
              'استریپینگ بین دندانی (IPR) دندان‌های پیشین پایین',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  h.tap()
                  chimes.playPop()
                  updateField('notes', formData.notes ? `${formData.notes}\n• ${preset}` : `• ${preset}`)
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800 transition-all press-scale"
              >
                + {preset}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="ثبت اهداف درمان، توالی سیم‌ها، نیاز به کشیدن دندان (Extraction)، مینی‌اسکرو (TADs) یا الاستیک‌های بین‌فکی..."
            className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </Card>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="text-xs text-slate-500">
          آخرین تاریخ معاینه:{' '}
          <b className="text-slate-800 dark:text-slate-200">
            {toJalaliStringPretty(formData.exam_date || new Date().toISOString())}
          </b>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handlePrint}
            className="min-h-[48px]"
          >
            <span className="flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              پیش‌نمایش چاپ و ارجاع
            </span>
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={handleSave}
            className="min-h-[48px] px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <span className="flex items-center gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              ثبت نهایی آنالیز ارتودنسی
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
