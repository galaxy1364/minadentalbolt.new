import React, { useRef } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, DollarSign, Calendar, User, FileText } from 'lucide-react';
import { Patient, ToothCondition } from '../types/dental';
import { toPersianDigits, formatToman, getCurrentPersianDate } from '../utils/jalali';

interface TreatmentInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

const TREATMENT_TITLES: Record<string, string> = {
  composite: 'ترمیم کامپوزیت زیبایی / بیلداپ',
  amalgam: 'ترمیم آمالگام تخصصی',
  endo: 'درمان ریشه (عصب‌کشی تخصصی روت‌کانال)',
  crown_zirconia: 'روکش تمام زیرکونیا مولتی‌لیر',
  crown_pfm: 'روکش پرسلن فلز (PFM)',
  laminate: 'لمینت سرامیکی پرسلن',
  implant: 'جراحی کاشت فیکسچر ایمپلنت دندان',
  extraction: 'کشیدن / جراحی دندان',
  scaling: 'جرم‌گیری و بروساژ کامل دو فک',
  bleaching: 'بلیچینگ آفیس دندان‌ها'
};

export const TreatmentInvoiceModal: React.FC<TreatmentInvoiceModalProps> = ({
  isOpen,
  onClose,
  patient
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !patient) return null;

  const treatments = Object.entries(patient.teethConditions || {}).map(([key, item]) => ({
    key,
    tooth: `${item.quadrant}${item.toothNumber}`,
    title: TREATMENT_TITLES[item.treatment] || item.treatment,
    cost: item.cost || 0,
    status: item.status,
    date: item.date || getCurrentPersianDate()
  }));

  const payments = patient.payments || [];
  const checks = patient.sayadChecks || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-cyan-950/20 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-cyan-100 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Bar (Hidden on print) */}
        <div className="p-3 bg-cyan-50/70 border-b border-cyan-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800">صدور و چاپ صورتحساب رسمی درمان</h3>
              <span className="text-[10px] text-slate-500">جهت ارائه به بیمار و بیمه‌های تکمیلی</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ فیش (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div ref={printAreaRef} className="p-6 overflow-y-auto print:overflow-visible space-y-4 text-slate-900 bg-white">
          
          {/* Clinic Header */}
          <div className="flex items-start justify-between border-b-2 border-cyan-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-700 text-white font-black flex items-center justify-center text-xs shadow-xs">
                  MD
                </div>
                <div>
                  <h1 className="text-base font-black text-slate-900">کلینیک تخصصی دندانپزشکی مینادنتال</h1>
                  <span className="text-[11px] font-bold text-slate-600 block">دکتر مهدی امیری · جراح و دندانپزشک (ن.پ: ۱۲۸۴۷)</span>
                </div>
              </div>
            </div>

            <div className="text-left font-mono text-[11px] space-y-0.5">
              <div><span className="font-sans text-slate-500">شماره قبض: </span><span className="font-bold text-slate-900">{toPersianDigits(Date.now().toString().slice(-6))}</span></div>
              <div><span className="font-sans text-slate-500">تاریخ صدور: </span><span className="font-bold text-slate-900">{getCurrentPersianDate()}</span></div>
            </div>
          </div>

          {/* Patient Info Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">نام بیمار</span>
              <span className="font-extrabold text-slate-900">{patient.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">شماره پرونده</span>
              <span className="font-black text-cyan-700 font-mono text-sm">{patient.fileNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">کد ملی</span>
              <span className="font-mono text-slate-700">{patient.nationalId || '---'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">شماره تماس</span>
              <span className="font-mono text-slate-700">{patient.phone}</span>
            </div>
          </div>

          {/* Treatments Table */}
          <div>
            <h4 className="text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-600" />
              <span>ریز خدمات و درمان‌های انجام‌شده</span>
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2 w-8 text-center">#</th>
                    <th className="p-2">دندان</th>
                    <th className="p-2">شرح خدمت دندانپزشکی</th>
                    <th className="p-2 text-center">وضعیت</th>
                    <th className="p-2 text-left">تعرفه (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {treatments.length > 0 ? (
                    treatments.map((t, idx) => (
                      <tr key={t.key} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                        <td className="p-2 font-mono font-bold text-slate-800">{t.tooth}</td>
                        <td className="p-2 font-bold text-slate-900">{t.title}</td>
                        <td className="p-2 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status === 'completed' ? 'تکمیل شده' : 'در حال درمان'}
                          </span>
                        </td>
                        <td className="p-2 text-left font-mono font-black text-slate-900">
                          {formatToman(t.cost)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        درمانی ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Checks summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Payments List */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">پرداختی‌ها و رسید کارتخوان:</span>
              <div className="space-y-1">
                {payments.length > 0 ? (
                  payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-[11px] text-slate-600">
                      <span>{p.forTreatment || 'پرداخت صندوق'} ({p.date})</span>
                      <span className="font-mono font-bold text-emerald-700">{formatToman(p.amount)}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-[10px]">پرداخت ثبت‌شده‌ای یافت نشد.</span>
                )}
                {checks.length > 0 && (
                  <div className="pt-1 border-t border-slate-200 text-[10px] text-slate-500">
                    {toPersianDigits(checks.length)} فقره چک صیادی به مبلغ {formatToman(checks.reduce((s, c) => s + c.amount, 0))} نزد کلینیک
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="border border-cyan-200 rounded-2xl p-4 bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-700 text-white space-y-2 flex flex-col justify-between shadow-md">
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-100">مجموع هزینه‌های درمانی:</span>
                <span className="font-mono font-bold text-white">{formatToman(patient.totalCost)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-100">مجموع دریافتی کلینیک:</span>
                <span className="font-mono font-bold text-emerald-200">{formatToman(patient.paidAmount)}</span>
              </div>
              <div className="pt-2 border-t border-white/20 flex justify-between items-center text-sm font-black">
                <span>{patient.balance < 0 ? 'مانده بدهی بیمار:' : 'تراز حساب (تسویه):'}</span>
                <span className={`font-mono ${patient.balance < 0 ? 'text-amber-200' : 'text-emerald-200'}`}>
                  {patient.balance === 0 ? 'تسویه کامل' : formatToman(Math.abs(patient.balance))}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Signature & Stamp Box */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-600">
            <div className="space-y-1 text-[10px] text-slate-500">
              <p>این صورتحساب توسط سامانه یکپارچه بالینی مینادنتال صادر گردیده و معتبر است.</p>
              <p>آدرس: تهران، سعادت‌آباد، خیابان علامه شمالی، پلاک ۴۲ · تلفن: ۰۲۱-۲۲۱۴۵۶۷۸</p>
            </div>

            <div className="text-center w-36">
              <div className="h-14 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 mb-1">
                محل امضا و مهر پزشک
              </div>
              <span className="text-[10px] font-bold text-slate-700">دکتر مهدی امیری</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
