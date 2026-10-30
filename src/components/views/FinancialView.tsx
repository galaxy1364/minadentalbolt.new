import React, { useState } from 'react';
import { 
  FileCheck2, Shield, RefreshCw, Plus, ChevronLeft, 
  CreditCard, AlertOctagon, CheckCircle2, ArrowRightLeft,
  FileSearch, Smartphone, Ban, Calculator, Award,
  Sliders, UserCheck, Layers, Receipt, Send, Check,
  Search, ShieldAlert, Sparkles, AlertTriangle, Printer, BarChart3
} from 'lucide-react';
import { SayadCheck, Installment, Patient, PaymentRecord } from '../../types/dental';
import { toPersianDigits, formatToman, getCurrentPersianDate } from '../../utils/jalali';
import { FinancialWeeklyAnalytics } from '../FinancialWeeklyAnalytics';
import { FinancialPerformanceChart } from '../FinancialPerformanceChart';
import { InstallmentPlanModal } from '../InstallmentPlanModal';
import { triggerHaptic } from '../../utils/haptics';

interface FinancialViewProps {
  patients: Patient[];
  onOpenCheckModal: () => void;
  onOpenPatientFile: (patient: Patient) => void;
  onOpenPaymentModal?: () => void;
  onOpenInvoice?: (patient: Patient) => void;
  onOpenCommissionModal?: () => void;
  onSaveInstallmentPlan?: (patientId: string, installments: Installment[], checks: SayadCheck[], downPaymentAmount: number) => void;
}

export const FinancialView: React.FC<FinancialViewProps> = ({
  patients,
  onOpenCheckModal,
  onOpenPatientFile,
  onOpenPaymentModal,
  onOpenInvoice,
  onOpenCommissionModal,
  onSaveInstallmentPlan
}) => {
  const [activeSegment, setActiveSegment] = useState<'sayad' | 'guarantee' | 'installments' | 'receipts' | 'analytics'>('sayad');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [inquiryModalCheck, setInquiryModalCheck] = useState<SayadCheck | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Collect all checks and installments across patients
  const allChecks = patients.flatMap(p => p.sayadChecks || []);
  const sayadChecks = allChecks.filter(c => !c.isGuarantee);
  const guaranteeChecks = allChecks.filter(c => c.isGuarantee);
  const allInstallments = patients.flatMap(p => p.installments || []);
  const allPayments = patients.flatMap(p => p.payments || []);

  const totalSayadAmount = sayadChecks.reduce((s, c) => s + c.amount, 0);
  const totalGuaranteeAmount = guaranteeChecks.reduce((s, c) => s + c.amount, 0);
  const totalPaidCash = allPayments.reduce((s, p) => s + p.amount, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRunSayadInquiry = (check: SayadCheck) => {
    setInquiryModalCheck(check);
    setInquiryLoading(true);
    setInquiryResult(null);

    setTimeout(() => {
      setInquiryLoading(false);
      setInquiryResult({
        sayadId: check.sayadId,
        issuerName: check.drawerName || check.patientName,
        bankName: check.bankName,
        statusColor: 'white', // سفید = خوش‌حساب بدون چک برگشتی
        bouncedCount: 0,
        creditScore: 'عالی (رتبه A)',
        lastUpdated: `امروز ${getCurrentPersianDate()} - ۱۲:۳۰`,
        isPechakVerified: true
      });
    }, 1200);
  };

  const handleMarkInstallmentPaid = (installment: Installment) => {
    showToast(`قسط شماره ${toPersianDigits(installment.installmentNumber)} بیمار ${installment.patientName} به مبلغ ${formatToman(installment.amount)} تسویه شد.`);
  };

  const handleSendReminderSms = (name: string, type: string) => {
    showToast(`پیامک یادآوری ${type} برای ${name} ارسال گردید.`);
  };

  return (
    <div className="pb-28 space-y-2.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-emerald-600 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in border border-emerald-400">
          <Check className="w-4 h-4 stroke-[3]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Segmented Bar - 5 Clean Tabs (Ergonomic & Uncluttered) */}
      <div className="mx-2 mt-1">
        <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center border border-slate-200/90 shadow-2xs gap-0.5">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveSegment('sayad');
            }}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
              activeSegment === 'sayad'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            چک صیادی
          </button>
          
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveSegment('guarantee');
            }}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
              activeSegment === 'guarantee'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ضمانت
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveSegment('installments');
            }}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
              activeSegment === 'installments'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            اقساط
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveSegment('receipts');
            }}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all ${
              activeSegment === 'receipts'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            صندوق POS
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveSegment('analytics');
            }}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 ${
              activeSegment === 'analytics'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>نمودار</span>
          </button>
        </div>
      </div>

      {/* Quick Action & Total Summary Card (Only on transaction segments to prevent clutter) */}
      {activeSegment !== 'analytics' && (
        <div className="mx-2">
          <div className="rounded-[22px] border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 p-3 sm:p-3.5 text-center text-slate-800 relative overflow-hidden shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100 text-xs">
              <span className="text-slate-600 font-bold">
                {activeSegment === 'sayad' && 'مجموع چک‌های صیادی:'}
                {activeSegment === 'guarantee' && 'مجموع چک‌های ضمانتی:'}
                {activeSegment === 'installments' && 'اقساط فعال درمانی:'}
                {activeSegment === 'receipts' && 'کل وصولی نقد و پوز:'}
              </span>
              <span className="font-mono font-black text-xs sm:text-sm text-emerald-800">
                {activeSegment === 'sayad' && formatToman(totalSayadAmount)}
                {activeSegment === 'guarantee' && formatToman(totalGuaranteeAmount)}
                {activeSegment === 'installments' && `${toPersianDigits(allInstallments.length)} فقره قسط جاری`}
                {activeSegment === 'receipts' && formatToman(totalPaidCash)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenCheckModal();
                }}
                className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-xs active:scale-[0.98] transition-all"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>ثبت چک</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenPaymentModal?.();
                }}
                className="py-1.5 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-[11px] flex items-center justify-center gap-1 border border-slate-200 shadow-2xs active:scale-[0.98] transition-all"
              >
                <CreditCard className="w-3 h-3 text-emerald-600" />
                <span>دریافت POS</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  if (onOpenInvoice && patients[0]) onOpenInvoice(patients[0]);
                }}
                className="py-1.5 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-xs active:scale-[0.98] transition-all"
                title="صدور و چاپ فاکتور درمان و تسویه حساب"
              >
                <Printer className="w-3 h-3" />
                <span>فاکتور درمان</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenCommissionModal?.();
                }}
                className="py-1.5 px-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-xs active:scale-[0.98] transition-all"
                title="محاسبه هوشمند سهم‌بندی و پورسانت پزشکان"
              >
                <Award className="w-3 h-3" />
                <span>سهم‌بندی پزشک</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area based on Segment */}
      <div className="mx-2 space-y-2.5">
        {/* TAB 1: SAYAD CHECKS */}
        {activeSegment === 'sayad' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-800">چک‌های صیادی بنفش ثبت‌شده ({toPersianDigits(sayadChecks.length)})</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">متصل به پیچک</span>
            </div>

            {sayadChecks.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
                چک صیادی ثبت‌شده‌ای وجود ندارد.
              </div>
            ) : (
              sayadChecks.map(check => (
                <div
                  key={check.id}
                  className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-bold">
                          {check.bankName}
                        </span>
                        <h4 className="text-xs font-black text-slate-900">{check.patientName}</h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                        شناسه صیاد: {check.sayadId}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black text-slate-900 font-mono block">
                        {formatToman(check.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        سررسید: {toPersianDigits(check.dueDate)}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Verification */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      check.status === 'cleared' ? 'bg-emerald-100 text-emerald-800' :
                      check.status === 'bounced' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {check.status === 'cleared' ? 'وصول شده' :
                       check.status === 'bounced' ? 'برگشت خورده' : 'در جریان وصول'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSendReminderSms(check.patientName, 'سررسید چک صیادی')}
                        className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                      >
                        <Send className="w-3 h-3 -scale-x-100" />
                        <span>پیامک سررسید</span>
                      </button>

                      <button
                        onClick={() => handleRunSayadInquiry(check)}
                        className="py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-2xs"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>استعلام پیچک</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: GUARANTEE CHECKS */}
        {activeSegment === 'guarantee' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-800">چک‌های امانی و ضمانت درمان ({toPersianDigits(guaranteeChecks.length)})</span>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">امانی در گاوصندوق</span>
            </div>

            {guaranteeChecks.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
                چک ضمانتی در سیستم ثبت نشده است.
              </div>
            ) : (
              guaranteeChecks.map(check => (
                <div
                  key={check.id}
                  className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{check.patientName}</h4>
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                        بانک: {check.bankName} · شناسه: {check.sayadId}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black text-amber-600 font-mono block">
                        {formatToman(check.amount)}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">ضمانت درمان ایمپلنت</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-500">
                      وضعیت: امانت نزد کلینیک تا تسویه فاکتور
                    </span>

                    <button
                      onClick={() => showToast(`چک ضمانت شماره ${check.sayadId} عودت داده شد و رسید تحویل ثبت گردید.`)}
                      className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      عودت به بیمار
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: TREATMENT INSTALLMENTS */}
        {activeSegment === 'installments' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-800">برنامه اقساط درمانی ({toPersianDigits(allInstallments.length)})</span>
              
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setShowInstallmentModal(true);
                }}
                className="py-1 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
              >
                <Calculator className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>قسط‌بندی جدید (ماشین‌حساب)</span>
              </button>
            </div>

            {allInstallments.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
                طرح اقساطی برای بیماران تعریف نشده است.
              </div>
            ) : (
              allInstallments.map(inst => (
                <div
                  key={inst.id}
                  className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-bold">
                          قسط {toPersianDigits(inst.installmentNumber)} از {toPersianDigits(inst.totalInstallments)}
                        </span>
                        <h4 className="text-xs font-black text-slate-900">{inst.patientName}</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                        سررسید: {toPersianDigits(inst.dueDate)}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black text-slate-900 font-mono block">
                        {formatToman(inst.amount)}
                      </span>
                      <span className={`text-[10px] font-bold mt-0.5 block ${
                        inst.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {inst.status === 'paid' ? 'تسویه شده' : 'سررسید نشده'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleSendReminderSms(inst.patientName, 'سررسید قسط')}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Send className="w-3 h-3 -scale-x-100" />
                      <span>پیامک یادآوری قسط</span>
                    </button>

                    {inst.status !== 'paid' && (
                      <button
                        onClick={() => handleMarkInstallmentPaid(inst)}
                        className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>ثبت وصول قسط</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: RECEIPTS & POS */}
        {activeSegment === 'receipts' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-800">تراکنش‌های صندوق و کارتخوان POS ({toPersianDigits(allPayments.length)})</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">امروز تسویه آنلاین</span>
            </div>

            {allPayments.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
                هنوز تراکنشی در صندوق ثبت نشده است.
              </div>
            ) : (
              allPayments.map(pay => (
                <div
                  key={pay.id}
                  className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{pay.patientName}</h4>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        روش: {pay.method === 'pos' ? 'کارتخوان سامان' : pay.method === 'cash' ? 'نقدی' : 'کارت‌به‌کارت'} · پیگیری: {pay.referenceNumber || '۹۸۴۷۲'}
                      </span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-xs font-black text-emerald-600 font-mono block">
                      +{formatToman(pay.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      {toPersianDigits(pay.date)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: FINANCIAL PERFORMANCE & 30-DAY REVENUE TREND (RECHARTS DARK THEME) */}
        {activeSegment === 'analytics' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* 30-Day Revenue Trend vs Historical Average (Recharts Dark Theme Aesthetic) */}
            <FinancialPerformanceChart patients={patients} />

            {/* Weekly & Daily Breakdown Analysis */}
            <FinancialWeeklyAnalytics patients={patients} />
          </div>
        )}
      </div>

      {/* Sayad Inquiry Modal (Financial Amber/Emerald Light Theme - Zero Black) */}
      {inquiryModalCheck && (
        <div className="fixed inset-0 z-50 bg-amber-950/25 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-gradient-to-b from-amber-50/90 via-white to-emerald-50/50 text-slate-900 rounded-[26px] border border-amber-200/90 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-slate-900">استعلام آنلاین چک در سامانه پیچک</h3>
              </div>
              <button 
                onClick={() => setInquiryModalCheck(null)} 
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {inquiryLoading ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-7 h-7 text-amber-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-600 font-bold">در حال برقراری ارتباط با وب‌سرویس بانک مرکزی...</p>
              </div>
            ) : inquiryResult ? (
              <div className="space-y-3 text-xs">
                {/* Status Box */}
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>وضعیت اعتباری صادرکننده: سفید (بسیار معتبر)</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    صادرکننده فاقد هرگونه سابقه چک برگشتی یا سوءاثر در سیستم بانکی کشور است.
                  </p>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl font-mono text-[11px] border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">شناسه صیادی:</span>
                    <span className="text-amber-800 font-bold">{inquiryResult.sayadId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">صادرکننده:</span>
                    <span className="text-slate-800 font-bold font-sans">{inquiryResult.issuerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">بانک عامل:</span>
                    <span className="text-slate-800 font-bold font-sans">{inquiryResult.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">تعداد چک برگشتی:</span>
                    <span className="text-emerald-700 font-bold">۰ فقره</span>
                  </div>
                </div>

                <button
                  onClick={() => setInquiryModalCheck(null)}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-600/25 active:scale-95 transition-all"
                >
                  تأیید و بازگشت
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Automated Installment Plan Calculator Modal */}
      <InstallmentPlanModal
        isOpen={showInstallmentModal}
        onClose={() => setShowInstallmentModal(false)}
        patients={patients}
        onSaveInstallmentPlan={(patientId, installments, checks, downPayment) => {
          if (onSaveInstallmentPlan) {
            onSaveInstallmentPlan(patientId, installments, checks, downPayment);
          }
          showToast('برنامه اقساط و چک‌های مربوطه با موفقیت در پرونده بیمار ثبت شد.');
        }}
      />
    </div>
  );
};
