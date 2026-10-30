import React, { useState } from 'react';
import { 
  X, Calculator, Calendar, DollarSign, CheckCircle2, 
  CreditCard, FileCheck2, User, ChevronLeft, ArrowDown,
  Sparkles, ShieldCheck
} from 'lucide-react';
import { Patient, Installment, SayadCheck } from '../types/dental';
import { toPersianDigits, formatToman, getPersianDateParts, PERSIAN_MONTHS } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface InstallmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  defaultPatientId?: string;
  onSaveInstallmentPlan: (patientId: string, installments: Installment[], checks: SayadCheck[], downPaymentAmount: number) => void;
}

export const InstallmentPlanModal: React.FC<InstallmentPlanModalProps> = ({
  isOpen,
  onClose,
  patients,
  defaultPatientId,
  onSaveInstallmentPlan
}) => {
  const { impactLight, impactHeavy, success } = useHapticFeedback();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    defaultPatientId || patients[0]?.id || ''
  );

  const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  const curDate = getPersianDateParts();
  const currentYear = curDate.year;

  const [treatmentName, setTreatmentName] = useState<string>('کاشت ایمپلنت و پروتز زیرکونیا');
  const [totalCost, setTotalCost] = useState<number>(36000000);
  const [downPayment, setDownPayment] = useState<number>(12000000);
  const [numInstallments, setNumInstallments] = useState<number>(4);
  const [startMonth, setStartMonth] = useState<number>(curDate.month);
  const [startDay, setStartDay] = useState<number>(Math.min(25, curDate.day));
  const [useSayadChecks, setUseSayadChecks] = useState<boolean>(true);
  const [bankName, setBankName] = useState<string>('بانک ملی');

  // Sayad check IDs state per installment
  const [sayadIds, setSayadIds] = useState<Record<number, string>>({
    1: '۷۴۰۱۲۳۹۸۴۵۲۱۱۰۹۱',
    2: '۷۴۰۱۲۳۹۸۴۵۲۱۱۰۹۲',
    3: '۷۴۰۱۲۳۹۸۴۵۲۱۱۰۹۳',
    4: '۷۴۰۱۲۳۹۸۴۵۲۱۱۰۹۴'
  });

  if (!isOpen) return null;

  const remainingAmount = Math.max(0, totalCost - downPayment);
  const installmentAmount = numInstallments > 0 ? Math.round(remainingAmount / numInstallments) : 0;

  // Generate generated installments preview
  const generatedPlan = Array.from({ length: numInstallments }, (_, idx) => {
    const instNum = idx + 1;
    const totalMonthIdx = (startMonth - 1) + idx;
    const monthNum = (totalMonthIdx % 12) + 1;
    const yearOffset = Math.floor(totalMonthIdx / 12);
    const year = currentYear + yearOffset;
    const formattedMonth = monthNum < 10 ? `۰${monthNum}` : `${monthNum}`;
    const formattedDay = startDay < 10 ? `۰${startDay}` : `${startDay}`;
    const dueDate = `${toPersianDigits(year)}/${toPersianDigits(formattedMonth)}/${toPersianDigits(formattedDay)}`;

    return {
      installmentNumber: instNum,
      amount: installmentAmount,
      dueDate,
      sayadId: sayadIds[instNum] || `۷۴۰۱۸۸${instNum}۹۹${Date.now().toString().slice(-6)}`
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    impactHeavy();

    const createdInstallments: Installment[] = generatedPlan.map(item => ({
      id: `inst-${Date.now()}-${item.installmentNumber}`,
      patientId: activePatient.id,
      patientName: activePatient.fullName,
      treatmentName,
      installmentNumber: item.installmentNumber,
      totalInstallments: numInstallments,
      amount: item.amount,
      dueDate: item.dueDate,
      status: 'pending',
      paymentMethod: useSayadChecks ? 'check' : 'pos'
    }));

    const createdChecks: SayadCheck[] = useSayadChecks ? generatedPlan.map(item => ({
      id: `chk-${Date.now()}-${item.installmentNumber}`,
      patientId: activePatient.id,
      patientName: activePatient.fullName,
      sayadId: item.sayadId,
      bankName,
      amount: item.amount,
      dueDate: item.dueDate,
      drawerName: activePatient.fullName,
      status: 'in_collection',
      isGuarantee: false,
      description: `قسط شماره ${toPersianDigits(item.installmentNumber)} بابت ${treatmentName}`
    })) : [];

    onSaveInstallmentPlan(activePatient.id, createdInstallments, createdChecks, downPayment);
    success();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-white text-slate-900 rounded-[28px] border border-slate-200 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">ماشین‌حساب و صدور برنامه اقساط درمان</h3>
              <span className="text-[10.5px] text-amber-800 font-bold">قسط‌بندی خودکار ماهانه با ثبت چک صیادی</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-sans">
          
          {/* Patient Selection & Treatment Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">بیمار متقاضی تقسیط</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.fullName} (پرونده: {p.fileNumber})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">عنوان درمان</label>
              <input
                type="text"
                value={treatmentName}
                onChange={(e) => setTreatmentName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                placeholder="مثلاً کاشت ۳ واحد ایمپلنت"
              />
            </div>
          </div>

          {/* Cost & Down payment calculation */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">هزینه کل درمان (تومان)</label>
              <input
                type="number"
                step="500000"
                value={totalCost}
                onChange={(e) => setTotalCost(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-bold text-slate-900 text-xs"
              />
              <span className="text-[9.5px] text-slate-400 mt-0.5 block">{formatToman(totalCost)}</span>
            </div>

            <div>
              <label className="text-[10px] text-emerald-700 font-bold block mb-1">پیش‌پرداخت نقدی / POS</label>
              <input
                type="number"
                step="500000"
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 font-mono font-bold text-emerald-800 text-xs"
              />
              <span className="text-[9.5px] text-emerald-600 mt-0.5 block">{formatToman(downPayment)}</span>
            </div>

            <div>
              <label className="text-[10px] text-amber-700 font-bold block mb-1">مبلغ باقیمانده اقساط</label>
              <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200 font-mono font-black text-amber-900 text-xs">
                {formatToman(remainingAmount)}
              </div>
              <span className="text-[9.5px] text-amber-700 mt-0.5 block">تقسیم به اقساط</span>
            </div>
          </div>

          {/* Installments count and start date */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-slate-700 font-bold block mb-1">تعداد اقساط ماهانه</label>
              <select
                value={numInstallments}
                onChange={(e) => setNumInstallments(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
              >
                <option value={2}>۲ قسط (۲ ماهه)</option>
                <option value={3}>۳ قسط (۳ ماهه)</option>
                <option value={4}>۴ قسط (۴ ماهه)</option>
                <option value={5}>۵ قسط (۵ ماهه)</option>
                <option value={6}>۶ قسط (۶ ماهه)</option>
                <option value={8}>۸ قسط (۸ ماهه)</option>
                <option value={10}>۱۰ قسط (۱۰ ماهه)</option>
                <option value={12}>۱۲ قسط (۱ ساله)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">ماه اولین سررسید</label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-bold focus:outline-none focus:border-amber-500 text-xs"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const mIndex = (curDate.month - 1 + i) % 12;
                  const yOffset = Math.floor((curDate.month - 1 + i) / 12);
                  const optYear = currentYear + yOffset;
                  return (
                    <option key={i} value={mIndex + 1}>
                      {PERSIAN_MONTHS[mIndex]} {toPersianDigits(optYear)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">روز سررسید هر ماه</label>
              <select
                value={startDay}
                onChange={(e) => setStartDay(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-bold focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value={1}>یکم هر ماه</option>
                <option value={5}>پنجم هر ماه</option>
                <option value={10}>دهم هر ماه</option>
                <option value={15}>پانزدهم هر ماه</option>
                <option value={20}>بیستم هر ماه</option>
                <option value={25}>بیست و پنجم هر ماه</option>
                <option value={30}>آخر هر ماه</option>
              </select>
            </div>
          </div>

          {/* Sayad Check Option */}
          <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSayadChecks}
                  onChange={(e) => setUseSayadChecks(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="font-black text-xs text-purple-900">
                  صدور همزمان چک صیادی برای هر قسط
                </span>
              </label>

              {useSayadChecks && (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-purple-800 font-medium">بانک صادرکننده:</span>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-24 bg-white border border-purple-300 rounded px-1.5 py-0.5 text-slate-800 text-xs font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Generated Plan Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="font-black text-slate-800 text-xs">جدول زمان‌بندی اقساط محاسبه‌شده:</span>
              <span className="text-[10px] text-slate-500 font-mono">
                مبلغ هر قسط: <strong className="text-slate-900">{formatToman(installmentAmount)}</strong>
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {generatedPlan.map(item => (
                <div 
                  key={item.installmentNumber}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-900 font-black text-xs flex items-center justify-center font-mono">
                      {item.installmentNumber}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">قسط {toPersianDigits(item.installmentNumber)}</span>
                      <span className="text-[10px] text-slate-500 font-mono">موعد: {item.dueDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {useSayadChecks && (
                      <div className="flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                        <input
                          type="text"
                          value={sayadIds[item.installmentNumber] || ''}
                          onChange={(e) => setSayadIds({ ...sayadIds, [item.installmentNumber]: e.target.value })}
                          placeholder="شناسه ۱۶ رقمی صیاد"
                          className="w-28 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-800"
                        />
                      </div>
                    )}

                    <span className="font-black font-mono text-slate-900">
                      {formatToman(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>تایید و ثبت برنامه اقساط در پرونده</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
