import React, { useState } from 'react';
import { 
  X, Award, DollarSign, Calculator, Percent, 
  FlaskConical, Stethoscope, CheckCircle2, ChevronLeft, 
  FileText, ArrowDownRight, Sparkles, UserCheck, ShieldCheck
} from 'lucide-react';
import { Patient, CommissionModel, DoctorCommissionRule } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { triggerHaptic } from '../utils/haptics';

interface DoctorCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
}

export const DoctorCommissionModal: React.FC<DoctorCommissionModalProps> = ({
  isOpen,
  onClose,
  patients
}) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('doc_mehdi');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Doctors list with customizable commission rules
  const [doctorRules, setDoctorRules] = useState<DoctorCommissionRule[]>([
    {
      doctorId: 'doc_mehdi',
      doctorName: 'دکتر مهدی امیری',
      specialty: 'مدیر کلینیک · جراح فک و صورت و ایمپلنتولوژیست',
      isManager: true,
      defaultModel: 'percentage',
      percentageRate: 100,
      fixedWagePerTreatment: 5000000,
      totalGrossWork: 145000000,
      totalLabDeductions: 18500000,
      netPayable: 126500000
    },
    {
      doctorId: 'doc_sara',
      doctorName: 'دکتر سارا رضوانی',
      specialty: 'متخصص ارتودنسی و ناهنجاری‌های فک و زیبایی',
      isManager: false,
      defaultModel: 'lab_split_half',
      percentageRate: 50,
      fixedWagePerTreatment: 3500000,
      totalGrossWork: 78000000,
      totalLabDeductions: 14000000,
      netPayable: 32000000 // (78M - 14M) / 2 = 32M
    },
    {
      doctorId: 'doc_ali',
      doctorName: 'دکتر علی مرادی',
      specialty: 'متخصص اندودانتیکس و درمان ریشه',
      isManager: false,
      defaultModel: 'fixed_wage',
      percentageRate: 45,
      fixedWagePerTreatment: 2800000,
      totalGrossWork: 52000000,
      totalLabDeductions: 0,
      netPayable: 33600000 // 12 treatments * 2.8M = 33.6M
    }
  ]);

  if (!isOpen) return null;

  const currentDoctor = doctorRules.find(d => d.doctorId === selectedDoctorId) || doctorRules[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getDoctorTreatmentCount = (docName: string): number => {
    let count = 0;
    patients.forEach(p => {
      if (p.teethConditions) {
        Object.values(p.teethConditions).forEach(cond => {
          if (cond.doctorName === docName || (!cond.doctorName && docName.includes('امیری'))) {
            count++;
          }
        });
      }
      if (p.treatments) {
        p.treatments.forEach(t => {
          if (t.doctorName === docName || (!t.doctorName && docName.includes('امیری'))) {
            count++;
          }
        });
      }
      if (p.implantCases && docName.includes('امیری')) {
        count += p.implantCases.length;
      }
    });
    return count > 0 ? count : 12; // Dynamic count from real patient charts with default fallback
  };

  const handleModelChange = (model: CommissionModel) => {
    triggerHaptic('selection');
    setDoctorRules(prev => prev.map(d => {
      if (d.doctorId !== selectedDoctorId) return d;
      let newNet = d.netPayable;
      const count = getDoctorTreatmentCount(d.doctorName);
      if (model === 'lab_split_half') {
        newNet = Math.max(0, Math.round((d.totalGrossWork - d.totalLabDeductions) / 2));
      } else if (model === 'fixed_wage') {
        newNet = count * d.fixedWagePerTreatment;
      } else if (model === 'percentage') {
        // Net base = Gross minus lab deductions
        const netBase = Math.max(0, d.totalGrossWork - d.totalLabDeductions);
        newNet = Math.round((netBase * d.percentageRate) / 100);
      }
      return {
        ...d,
        defaultModel: model,
        netPayable: newNet
      };
    }));
  };

  const handlePercentageChange = (rate: number) => {
    setDoctorRules(prev => prev.map(d => {
      if (d.doctorId !== selectedDoctorId) return d;
      const netBase = Math.max(0, d.totalGrossWork - d.totalLabDeductions);
      return {
        ...d,
        percentageRate: rate,
        netPayable: Math.round((netBase * rate) / 100)
      };
    }));
  };

  const handleFixedWageChange = (wage: number) => {
    setDoctorRules(prev => prev.map(d => {
      if (d.doctorId !== selectedDoctorId) return d;
      const count = getDoctorTreatmentCount(d.doctorName);
      return {
        ...d,
        fixedWagePerTreatment: wage,
        netPayable: count * wage
      };
    }));
  };

  const handleSave = () => {
    triggerHaptic('success');
    showToast(`تنظیمات سهم‌بندی ${currentDoctor.doctorName} با موفقیت ثبت گردید.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-emerald-950/20 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-2xl bg-white rounded-[26px] border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                سیستم هوشمند سهم‌بندی پزشکان و دستمزد درمانی
              </h3>
              <p className="text-[10px] text-emerald-800 font-bold mt-0.5">
                محاسبه خودکار خالص کارکرد منهای لابراتوار، دستمزد ثابت و درصدی
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="m-3 p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Doctor Selector Tabs */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <span className="text-[10px] text-slate-500 font-bold block mb-1.5">انتخاب پزشک معالج:</span>
          <div className="grid grid-cols-3 gap-1.5">
            {doctorRules.map(doc => {
              const isSelected = doc.doctorId === selectedDoctorId;
              return (
                <button
                  key={doc.doctorId}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedDoctorId(doc.doctorId);
                  }}
                  className={`p-2 rounded-xl text-right transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black truncate block">{doc.doctorName}</span>
                    {doc.isManager && (
                      <span className={`text-[8.5px] px-1 rounded-full font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        مدیر
                      </span>
                    )}
                  </div>
                  <span className={`text-[9.5px] truncate block mt-0.5 ${
                    isSelected ? 'text-white/80' : 'text-slate-500'
                  }`}>
                    {doc.isManager ? 'مدیریت و کلینیک' : 'متخصص درمانگر'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3.5 text-xs">
          
          {/* Active Doctor Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-emerald-700" />
                <span className="font-black text-sm text-slate-900">{currentDoctor.doctorName}</span>
                {currentDoctor.isManager && (
                  <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                    موسس و مدیر کلینیک
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{currentDoctor.specialty}</p>
            </div>

            <div className="text-left bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[9.5px] text-slate-500 block font-bold">خالص کارکرد سهم پزشک:</span>
              <span className="font-mono font-black text-sm sm:text-base text-emerald-700 block" dir="ltr">
                {formatToman(currentDoctor.netPayable)}
              </span>
            </div>
          </div>

          {/* 3 Calculation Models Selection */}
          <div className="space-y-2">
            <span className="font-black text-slate-800 block text-xs">
              تعیین روش محاسبه سهم و دستمزد (۳ الگوی کلینیکی):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Model 1: (Gross - Lab) / 2 */}
              <div
                onClick={() => handleModelChange('lab_split_half')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  currentDoctor.defaultModel === 'lab_split_half'
                    ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/20 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <FlaskConical className="w-3.5 h-3.5" />
                  </div>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    currentDoctor.defaultModel === 'lab_split_half'
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-slate-300'
                  }`}>
                    {currentDoctor.defaultModel === 'lab_split_half' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </span>
                </div>
                <h4 className="font-black text-xs text-slate-900">سهم ۵۰٪ پس از کسر لابراتوار</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  (کل کارکرد درمان − کل هزینه لابراتوار) ÷ ۲
                </p>
              </div>

              {/* Model 2: Fixed Wage */}
              <div
                onClick={() => handleModelChange('fixed_wage')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  currentDoctor.defaultModel === 'fixed_wage'
                    ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-400/20 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    currentDoctor.defaultModel === 'fixed_wage'
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-300'
                  }`}>
                    {currentDoctor.defaultModel === 'fixed_wage' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </span>
                </div>
                <h4 className="font-black text-xs text-slate-900">دستمزد ثابت هر جراحی</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  مبلغ دستی و توافقی به ازای هر عمل/کاشت
                </p>
              </div>

              {/* Model 3: Percentage */}
              <div
                onClick={() => handleModelChange('percentage')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  currentDoctor.defaultModel === 'percentage'
                    ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    currentDoctor.defaultModel === 'percentage'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300'
                  }`}>
                    {currentDoctor.defaultModel === 'percentage' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </span>
                </div>
                <h4 className="font-black text-xs text-slate-900">درصدی فوق‌پیشرفته</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  تعیین درصد آزاد اختصاصی (۴۰٪ تا ۱۰۰٪)
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Inputs based on active model */}
          {currentDoctor.defaultModel === 'percentage' && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">درصد مشارکت در درمان‌ها:</span>
                <span className="font-mono font-black text-sm text-emerald-700">
                  {toPersianDigits(currentDoctor.percentageRate)}٪
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                step="5"
                value={currentDoctor.percentageRate}
                onChange={(e) => handlePercentageChange(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9.5px] text-slate-400 font-mono">
                <span>۳۰٪ (دستیار)</span>
                <span>۵۰٪ (متخصص عمومی)</span>
                <span>۷۰٪ (فوق‌تخصص)</span>
                <span>۱۰۰٪ (مدیر کلینیک)</span>
              </div>
            </div>
          )}

          {currentDoctor.defaultModel === 'fixed_wage' && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 block">
                  مبلغ دستمزد ثابت به ازای هر واحد جراحی / درمان:
                </label>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                  تعداد کارکرد پرونده‌ها: {toPersianDigits(getDoctorTreatmentCount(currentDoctor.doctorName))} درمان
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="500000"
                  value={currentDoctor.fixedWagePerTreatment}
                  onChange={(e) => handleFixedWageChange(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono text-left focus:outline-none focus:border-sky-500 font-bold"
                />
                <span className="text-[11px] text-slate-500 shrink-0">تومان</span>
              </div>
            </div>
          )}

          {/* Financial Breakdown Table */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="font-black text-slate-800 block text-xs">
              ریز محاسبات مالی دوره جاری برای {currentDoctor.doctorName}:
            </span>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">کل کارکرد ناخالص درمان‌ها:</span>
                <span className="font-mono font-bold text-slate-900">{formatToman(currentDoctor.totalGrossWork)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200 text-rose-700">
                <span className="flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  کسر هزینه لابراتوار پروتز:
                </span>
                <span className="font-mono font-bold">− {formatToman(currentDoctor.totalLabDeductions)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">مبنای خالص محاسبه:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatToman(currentDoctor.totalGrossWork - currentDoctor.totalLabDeductions)}
                </span>
              </div>

              <div className="flex justify-between pt-1 font-black text-xs text-emerald-800">
                <span>مبلغ نهایی قابل تسویه به پزشک:</span>
                <span className="font-mono text-sm">{formatToman(currentDoctor.netPayable)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => {
              triggerHaptic('success');
              showToast(`فیش تسویه حساب مالی ${currentDoctor.doctorName} آماده چاپ گردید.`);
            }}
            className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>چاپ فیش تسویه پزشک</span>
          </button>

          <button
            onClick={handleSave}
            className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ثبت و تأیید سهم‌بندی</span>
          </button>
        </div>

      </div>
    </div>
  );
};
