// PeriodontalChart.tsx — Professional 6-Point Periodontal Examination Chart
import React, { useState, useMemo } from 'react'
import { PerioExam, PerioToothData, Doctor } from '../types'
import {
  UPPER_PERIO_TEETH,
  LOWER_PERIO_TEETH,
  createEmptyPerioToothData,
  calculatePerioStatistics,
  computeCAL,
} from '../lib/periodontal'
import { toothLabel } from '../lib/toothLabel'
import { toPersianDigits, toJalaliStringPretty } from '../lib/persianDate'
import { Card, Button, Badge, showToast } from './ui'
import { Activity, AlertTriangle, Droplet, Plus, Save, Printer, CheckCircle } from 'lucide-react'
import { buildPrintDocument } from '../lib/printDocument'

interface PeriodontalChartProps {
  patientId: string
  patientName: string
  doctors: Doctor[]
  exam?: PerioExam | null
  onSave: (examData: Record<number, PerioToothData>, notes: string, doctorId: string | null) => Promise<void>
}

export function PeriodontalChart({ patientId, patientName, doctors, exam, onSave }: PeriodontalChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number>(16)
  const [teethData, setTeethData] = useState<Record<number, PerioToothData>>(() => {
    if (exam?.teeth_data && Object.keys(exam.teeth_data).length > 0) {
      return exam.teeth_data
    }
    const initial: Record<number, PerioToothData> = {}
    ;[...UPPER_PERIO_TEETH, ...LOWER_PERIO_TEETH].forEach((num) => {
      initial[num] = createEmptyPerioToothData(num)
    })
    return initial
  })

  const [notes, setNotes] = useState(exam?.notes || '')
  const [doctorId, setDoctorId] = useState<string>(exam?.doctor_id || (doctors[0]?.id || ''))
  const [saving, setSaving] = useState(false)

  const stats = useMemo(() => calculatePerioStatistics(teethData), [teethData])

  const currentToothData: PerioToothData = teethData[selectedTooth] || createEmptyPerioToothData(selectedTooth)

  const updateSite = (siteKey: 'db' | 'b' | 'mb' | 'dl' | 'l' | 'ml', field: 'pd' | 'bop' | 'suppuration' | 'gm', value: any) => {
    setTeethData((prev) => {
      const tooth = prev[selectedTooth] || createEmptyPerioToothData(selectedTooth)
      const currentSite = tooth[siteKey] || { pd: 2, bop: false, suppuration: false, gm: 0, cal: 2 }
      const updatedSite = { ...currentSite, [field]: value }
      if (field === 'pd' || field === 'gm') {
        updatedSite.cal = computeCAL(Number(updatedSite.pd) || 0, Number(updatedSite.gm) || 0)
      }
      return {
        ...prev,
        [selectedTooth]: {
          ...tooth,
          [siteKey]: updatedSite,
        },
      }
    })
  }

  const updateToothAttr = (field: 'mobility' | 'furcation', value: number) => {
    setTeethData((prev) => {
      const tooth = prev[selectedTooth] || createEmptyPerioToothData(selectedTooth)
      return {
        ...prev,
        [selectedTooth]: {
          ...tooth,
          [field]: value,
        },
      }
    })
  }

  const handleSaveExam = async () => {
    setSaving(true)
    try {
      await onSave(teethData, notes, doctorId || null)
      showToast('success', 'آزمون پریودنتال با موفقیت ذخیره شد')
    } catch {
      showToast('error', 'خطا در ذخیره چارت پریودنتال')
    } finally {
      setSaving(false)
    }
  }

  const handlePrintPerio = () => {
    const win = window.open('', '_blank', 'width=750,height=900')
    if (!win) return
    const styles = `
      body { font-family: Tahoma, Arial, sans-serif; padding: 24px; color: #1e293b; direction: rtl; }
      .header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 16px; }
      .title { color: #0d9488; font-size: 20px; font-weight: bold; margin: 0; }
      .stats-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 12px; }
      .diag { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px; margin-bottom: 20px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; }
      th, td { border: 1px solid #cbd5e1; padding: 4px; }
      th { background: #f1f5f9; }
      .deep { background: #fee2e2; color: #b91c1c; font-weight: bold; }
      .bop { color: #dc2626; font-weight: bold; }
    `
    const bodyHtml = `
      <div class="header">
        <h1 class="title">گزارش تخصصی چارت پریودنتال ۶ نقطه‌ای</h1>
        <p style="font-size: 13px; margin-top: 4px;">بیمار: <b>${patientName}</b> | تاریخ: ${toJalaliStringPretty(new Date().toISOString())}</p>
      </div>

      <div class="stats-box">
        <div>تعداد دندان‌های ثبت‌شده: <b>${toPersianDigits(stats.totalTeethExamined)}</b></div>
        <div>شاخص خونریزی (BOP): <b class="bop">${toPersianDigits(stats.bopPercentage)}٪</b></div>
        <div>پاکت‌های عمیق (≥4mm): <b class="deep">${toPersianDigits(stats.deepPocketsCount)}</b></div>
        <div>پاکت‌های شدید (≥6mm): <b class="deep">${toPersianDigits(stats.severePocketsCount)}</b></div>
      </div>

      <div class="diag">
        <b>تشخیص پریودنتال: ${stats.diagnosisGrade.title}</b>
        <p style="margin: 4px 0 0; color: #475569;">${stats.diagnosisGrade.description}</p>
      </div>

      <h3>یافته‌های پروبینگ دندان‌ها (DB, B, MB | DL, L, ML)</h3>
      <table>
        <thead>
          <tr>
            <th>دندان</th>
            <th>باکال (DB - B - MB)</th>
            <th>لینگوال (DL - L - ML)</th>
            <th>خونریزی (BOP)</th>
            <th>لقی</th>
            <th>فورکا</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(teethData)
            .map((t) => {
              const bopStr = [
                t.db.bop ? 'DB' : '',
                t.b.bop ? 'B' : '',
                t.mb.bop ? 'MB' : '',
                t.dl.bop ? 'DL' : '',
                t.l.bop ? 'L' : '',
                t.ml.bop ? 'ML' : '',
              ]
                .filter(Boolean)
                .join(', ')
              const isDeep = [t.db, t.b, t.mb, t.dl, t.l, t.ml].some((s) => (s?.pd || 0) >= 4)
              return `
              <tr class="${isDeep ? 'deep' : ''}">
                <td><b>${toPersianDigits(t.tooth_number)}</b></td>
                <td>${toPersianDigits(t.db.pd)} - ${toPersianDigits(t.b.pd)} - ${toPersianDigits(t.mb.pd)}</td>
                <td>${toPersianDigits(t.dl.pd)} - ${toPersianDigits(t.l.pd)} - ${toPersianDigits(t.ml.pd)}</td>
                <td class="${bopStr ? 'bop' : ''}">${bopStr || '—'}</td>
                <td>${t.mobility ? toPersianDigits(t.mobility) : '۰'}</td>
                <td>${t.furcation ? toPersianDigits(t.furcation) : '۰'}</td>
              </tr>
            `
            })
            .join('')}
        </tbody>
      </table>
    `
    win.document.write(buildPrintDocument({ title: 'گزارش چارت پریودنتال', styles, bodyHtml }))
    win.document.close()
    win.focus()
  }

  const renderToothPill = (num: number) => {
    const t = teethData[num]
    const hasDeep = t && [t.db, t.b, t.mb, t.dl, t.l, t.ml].some((s) => (s?.pd || 0) >= 4)
    const hasBop = t && [t.db, t.b, t.mb, t.dl, t.l, t.ml].some((s) => s?.bop)
    const isSelected = selectedTooth === num

    return (
      <button
        key={num}
        type="button"
        onClick={() => setSelectedTooth(num)}
        className={`w-9 h-11 rounded-xl flex flex-col items-center justify-center transition-all-smooth relative ${
          isSelected
            ? 'bg-primary-600 text-white font-bold ring-2 ring-primary-300 scale-105 shadow-md'
            : hasDeep
            ? 'bg-error-100 text-error-800 dark:bg-error-950/50 dark:text-error-300 font-bold border border-error-300'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
        }`}
      >
        <span className="text-xs">{toPersianDigits(num)}</span>
        {hasBop && (
          <span className="w-1.5 h-1.5 rounded-full bg-error-500 absolute top-1 right-1" />
        )}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header & Stats Banner */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity size={18} className="text-primary-600" />
              چارت پریودنتال تخصصی ۶ نقطه‌ای (Periodontal Probing Chart)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ثبت دقیق عمق پاکت‌ها، خونریزی حین پروب (BOP)، تحلیل لثه (Recession) و سطح اتصال بالینی (CAL)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrintPerio}>
              <Printer size={14} className="inline ml-1" /> چاپ گزارش
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveExam} disabled={saving}>
              <Save size={14} className="inline ml-1" /> {saving ? 'در حال ذخیره...' : 'ذخیره چارت'}
            </Button>
          </div>
        </div>

        {/* Diagnosis & Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
            <span className="text-[11px] text-slate-500 block mb-0.5">تشخیص پریودنتال</span>
            <Badge color={stats.diagnosisGrade.color}>{stats.diagnosisGrade.title}</Badge>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
            <span className="text-[11px] text-slate-500 block mb-0.5">شاخص خونریزی (BOP)</span>
            <span className={`text-base font-bold ${stats.bopPercentage >= 10 ? 'text-error-600' : 'text-success-600'}`}>
              {toPersianDigits(stats.bopPercentage)}٪
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
            <span className="text-[11px] text-slate-500 block mb-0.5">پاکت‌های فعال (≥۴mm)</span>
            <span className={`text-base font-bold ${stats.deepPocketsCount > 0 ? 'text-warning-600' : 'text-slate-700 dark:text-slate-200'}`}>
              {toPersianDigits(stats.deepPocketsCount)} سطح
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
            <span className="text-[11px] text-slate-500 block mb-0.5">پاکت‌های پیشرفته (≥۶mm)</span>
            <span className={`text-base font-bold ${stats.severePocketsCount > 0 ? 'text-error-600' : 'text-slate-700 dark:text-slate-200'}`}>
              {toPersianDigits(stats.severePocketsCount)} سطح
            </span>
          </div>
        </div>
      </Card>

      {/* Dental Arch Selector */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>قوس فک بالا (Maxilla)</span>
          <span className="text-[10px] text-slate-400">یک دندان را برای معاینه ۶ نقطه‌ای لمس کنید</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1">
          {UPPER_PERIO_TEETH.map(renderToothPill)}
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700">
          <span>قوس فک پایین (Mandible)</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1">
          {LOWER_PERIO_TEETH.map(renderToothPill)}
        </div>
      </Card>

      {/* Selected Tooth 6-Point Detailed Probing Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center text-sm">
              {toPersianDigits(selectedTooth)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                معاینه پریودنتال دندان {toothLabel(selectedTooth)}
              </h3>
              <p className="text-[11px] text-slate-400">۶ نقطه استاندارد پروبینگ (۳ نقطه باکال / بیرونی + ۳ نقطه لینگوال / داخلی)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="text-[11px] text-slate-500 block mb-0.5">لقی (Mobility)</label>
              <select
                value={currentToothData.mobility || 0}
                onChange={(e) => updateToothAttr('mobility', Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              >
                <option value={0}>درجه ۰ (طبیعی)</option>
                <option value={1}>درجه ۱ (افقی تا ۱mm)</option>
                <option value={2}>درجه ۲ (افقی بیش از ۱mm)</option>
                <option value={3}>درجه ۳ (عمودی و افقی)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-0.5">فورکا (Furcation)</label>
              <select
                value={currentToothData.furcation || 0}
                onChange={(e) => updateToothAttr('furcation', Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
              >
                <option value={0}>بدون درگیری</option>
                <option value={1}>کلاس I (ابتدایی)</option>
                <option value={2}>کلاس II (متوسط)</option>
                <option value={3}>کلاس III (کامل)</option>
                <option value={4}>کلاس IV (آشکار)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 6 Sites Probing Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buccal / Facial Aspect */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">سطح باکال / بیرونی (Facial)</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(['db', 'b', 'mb'] as const).map((key) => {
                const s = currentToothData[key] || { pd: 2, bop: false, suppuration: false, gm: 0, cal: 2 }
                const isDeep = s.pd >= 4
                const isSevere = s.pd >= 6
                const label = key === 'db' ? 'دیستوباکال (DB)' : key === 'b' ? 'میدباکال (B)' : 'مزیوباکال (MB)'
                return (
                  <div key={key} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] text-slate-500 block">{label}</span>
                    <div>
                      <span className="text-[10px] text-slate-400 block">عمق پروب (mm)</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={s.pd}
                        onChange={(e) => updateSite(key, 'pd', Number(e.target.value))}
                        className={`w-full text-center py-1 rounded-lg text-sm font-bold border ${
                          isSevere
                            ? 'bg-error-50 dark:bg-error-950/60 border-error-500 text-error-700 dark:text-error-300'
                            : isDeep
                            ? 'bg-warning-50 dark:bg-warning-950/60 border-warning-500 text-warning-700 dark:text-warning-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">تحلیل لثه (GM)</span>
                      <input
                        type="number"
                        min="-5"
                        max="10"
                        value={s.gm || 0}
                        onChange={(e) => updateSite(key, 'gm', Number(e.target.value))}
                        className="w-full text-center py-0.5 rounded text-xs border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      CAL: <b>{toPersianDigits(s.cal || s.pd)}mm</b>
                    </div>
                    <div className="flex justify-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => updateSite(key, 'bop', !s.bop)}
                        className={`p-1 rounded-md text-[10px] flex items-center gap-0.5 font-bold ${
                          s.bop ? 'bg-error-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}
                        title="خونریزی حین پروب (BOP)"
                      >
                        <Droplet size={10} /> BOP
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lingual / Palatal Aspect */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">سطح لینگوال / پالاتال / داخلی</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(['dl', 'l', 'ml'] as const).map((key) => {
                const s = currentToothData[key] || { pd: 2, bop: false, suppuration: false, gm: 0, cal: 2 }
                const isDeep = s.pd >= 4
                const isSevere = s.pd >= 6
                const label = key === 'dl' ? 'دیستولینگوال (DL)' : key === 'l' ? 'میدلینگوال (L)' : 'مزیولینگوال (ML)'
                return (
                  <div key={key} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] text-slate-500 block">{label}</span>
                    <div>
                      <span className="text-[10px] text-slate-400 block">عمق پروب (mm)</span>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={s.pd}
                        onChange={(e) => updateSite(key, 'pd', Number(e.target.value))}
                        className={`w-full text-center py-1 rounded-lg text-sm font-bold border ${
                          isSevere
                            ? 'bg-error-50 dark:bg-error-950/60 border-error-500 text-error-700 dark:text-error-300'
                            : isDeep
                            ? 'bg-warning-50 dark:bg-warning-950/60 border-warning-500 text-warning-700 dark:text-warning-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">تحلیل لثه (GM)</span>
                      <input
                        type="number"
                        min="-5"
                        max="10"
                        value={s.gm || 0}
                        onChange={(e) => updateSite(key, 'gm', Number(e.target.value))}
                        className="w-full text-center py-0.5 rounded text-xs border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      CAL: <b>{toPersianDigits(s.cal || s.pd)}mm</b>
                    </div>
                    <div className="flex justify-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => updateSite(key, 'bop', !s.bop)}
                        className={`p-1 rounded-md text-[10px] flex items-center gap-0.5 font-bold ${
                          s.bop ? 'bg-error-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}
                        title="خونریزی حین پروب (BOP)"
                      >
                        <Droplet size={10} /> BOP
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
