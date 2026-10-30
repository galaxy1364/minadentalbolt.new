import React, { useState } from 'react';
import { 
  AlertTriangle, FlaskConical, FileCheck2, Clock, 
  Send, Phone, CheckCircle2, ChevronLeft, ChevronDown, 
  ChevronUp, BellRing, ShieldAlert, Sparkles
} from 'lucide-react';
import { Patient, Appointment, LabOrder, SayadCheck, Installment } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface ClinicUrgentAlarmsBannerProps {
  patients: Patient[];
  appointments: Appointment[];
  onOpenPatientFile: (patient: Patient, tab?: any) => void;
  onNavigate: (viewId: string) => void;
  onOpenLabSlip?: (order: LabOrder) => void;
}

export const ClinicUrgentAlarmsBanner: React.FC<ClinicUrgentAlarmsBannerProps> = ({
  patients,
  appointments,
  onOpenPatientFile,
  onNavigate,
  onOpenLabSlip
}) => {
  const { impactLight, impactHeavy, success } = useHapticFeedback();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Critical Lab Orders (Patients who have appointment tomorrow or work due soon but NOT ready)
  const allLabOrders = patients.flatMap(p => p.labOrders || []);
  const pendingLabOrders = allLabOrders.filter(
    o => o.status !== 'ready_for_clinic' && o.status !== 'delivered_cemented'
  );

  // 2. Sayad Checks Due in Next 3 Days
  const allChecks = patients.flatMap(p => p.sayadChecks || []);
  const dueChecks = allChecks.filter(
    c => !c.isGuarantee && c.status === 'in_collection'
  );

  // 3. Overdue Installments
  const allInstallments = patients.flatMap(p => p.installments || []);
  const overdueInstallments = allInstallments.filter(
    i => i.status === 'overdue' || (i.status === 'pending' && i.dueDate.includes('۰۸/۱۵'))
  );

  // 4. Unconfirmed Appointments for Tomorrow
  const tomorrowAppointments = appointments.filter(
    a => a.status === 'scheduled'
  );

  const totalUrgentCount = pendingLabOrders.length + dueChecks.length + overdueInstallments.length;

  if (totalUrgentCount === 0) return null;

  return (
    <div className="w-full relative select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-4 right-4 z-50 bg-emerald-600 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full bg-gradient-to-r from-red-50 via-amber-50/80 to-purple-50/50 rounded-[22px] p-3 border border-red-200/90 shadow-2xs space-y-2">
        
        {/* Header Bar */}
        <div 
          onClick={() => {
            impactLight();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-red-950">
                مرکز آلارم‌های حیاتی مطب
              </span>
              <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full font-mono">
                {toPersianDigits(totalUrgentCount)} مورد فوری
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10.5px] font-bold text-red-800">
            <span>{isExpanded ? 'بستن آلارم‌ها' : 'مشاهده و اقدام فوری'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Quick Tickers Preview (When Collapsed) */}
        {!isExpanded && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-[10.5px] pt-0.5">
            {pendingLabOrders.length > 0 && (
              <span className="flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 px-2.5 py-0.5 rounded-lg shrink-0 font-bold">
                <FlaskConical className="w-3 h-3 text-purple-700" />
                <span>{toPersianDigits(pendingLabOrders.length)} کار لابراتوار نیازمند پیگیری</span>
              </span>
            )}

            {dueChecks.length > 0 && (
              <span className="flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-lg shrink-0 font-bold">
                <FileCheck2 className="w-3 h-3 text-amber-700" />
                <span>{toPersianDigits(dueChecks.length)} چک سررسید نزدیک</span>
              </span>
            )}

            {overdueInstallments.length > 0 && (
              <span className="flex items-center gap-1 bg-red-100 text-red-900 border border-red-300 px-2.5 py-0.5 rounded-lg shrink-0 font-bold">
                <Clock className="w-3 h-3 text-red-700" />
                <span>{toPersianDigits(overdueInstallments.length)} قسط معوق</span>
              </span>
            )}
          </div>
        )}

        {/* Expanded Detailed Action Center */}
        {isExpanded && (
          <div className="pt-2 border-t border-red-200/80 space-y-2.5 animate-in fade-in duration-200">
            
            {/* 1. Pending Lab Orders */}
            {pendingLabOrders.length > 0 && (
              <div className="space-y-1.5 bg-white/90 p-2.5 rounded-xl border border-purple-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-black text-purple-950">
                  <span className="flex items-center gap-1">
                    <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                    <span>کارهای لابراتوار نیازمند پیگیری (جلوگیری از کنسلی نوبت):</span>
                  </span>
                  <button
                    onClick={() => onNavigate('lab')}
                    className="text-[10px] text-purple-700 hover:underline"
                  >
                    ماژول لابراتوار
                  </button>
                </div>

                <div className="space-y-1">
                  {pendingLabOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-purple-50/70 border border-purple-100">
                      <div>
                        <span className="font-bold text-slate-900">{order.patientName}</span>
                        <span className="text-slate-500 mr-2 font-mono">{order.toothNumber} · {order.workType}</span>
                        <span className="text-[10px] text-purple-800 block mt-0.5 font-bold">
                          لابراتوار: {order.labName} · موعد: {toPersianDigits(order.deliveryDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onOpenLabSlip && (
                          <button
                            onClick={() => onOpenLabSlip(order)}
                            className="py-1 px-2 rounded-lg bg-white hover:bg-slate-100 text-purple-800 text-[10px] font-bold border border-purple-200"
                          >
                            برگه سفارش
                          </button>
                        )}
                        <button
                          onClick={() => showToast(`تماس با پیک لابراتوار ${order.labName} برقرار شد.`)}
                          className="py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold active:scale-95 transition-all"
                        >
                          پیگیری پیک
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Due Checks Alert */}
            {dueChecks.length > 0 && (
              <div className="space-y-1.5 bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-black text-amber-950">
                  <span className="flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>چک‌های صیادی نزدیک سررسید (۳ روز آینده):</span>
                  </span>
                  <button
                    onClick={() => onNavigate('financial')}
                    className="text-[10px] text-amber-800 hover:underline"
                  >
                    مدیریت چک‌ها
                  </button>
                </div>

                <div className="space-y-1">
                  {dueChecks.map(check => (
                    <div key={check.id} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-amber-50/70 border border-amber-100">
                      <div>
                        <span className="font-bold text-slate-900">{check.patientName}</span>
                        <span className="text-amber-900 font-mono font-black mr-2">{formatToman(check.amount)}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                          بانک: {check.bankName} · سررسید: {toPersianDigits(check.dueDate)}
                        </span>
                      </div>

                      <button
                        onClick={() => showToast(`پیامک یادآوری موعد سررسید چک برای ${check.patientName} ارسال شد.`)}
                        className="py-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all shrink-0"
                      >
                        <Send className="w-3 h-3 -scale-x-100" />
                        <span>ارسال پیامک</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Overdue Installments */}
            {overdueInstallments.length > 0 && (
              <div className="space-y-1.5 bg-white/90 p-2.5 rounded-xl border border-red-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-black text-red-950">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-red-600" />
                    <span>اقساط معوق و نیازمند پیگیری مالی:</span>
                  </span>
                  <button
                    onClick={() => onNavigate('financial')}
                    className="text-[10px] text-red-800 hover:underline"
                  >
                    بخش اقساط
                  </button>
                </div>

                <div className="space-y-1">
                  {overdueInstallments.map(inst => (
                    <div key={inst.id} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-red-50/70 border border-red-100">
                      <div>
                        <span className="font-bold text-slate-900">{inst.patientName}</span>
                        <span className="text-red-700 font-mono font-black mr-2">{formatToman(inst.amount)}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          قسط {toPersianDigits(inst.installmentNumber)} از {toPersianDigits(inst.totalInstallments)} · {inst.treatmentName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => showToast(`پیامک اخطار تاخیر قسط برای ${inst.patientName} ارسال شد.`)}
                          className="py-1 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold active:scale-95 transition-all"
                        >
                          پیامک اخطار
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
