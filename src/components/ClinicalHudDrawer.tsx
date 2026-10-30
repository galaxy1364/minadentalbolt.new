import React, { useState } from 'react';
import { 
  X, AlertTriangle, HeartPulse, Activity, Phone, CreditCard, 
  FileText, Layers, FlaskConical, ChevronLeft, User, ShieldAlert,
  Calendar, CheckCircle2, Clock
} from 'lucide-react';
import { Patient } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface ClinicalHudDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  patients: Patient[];
  onSelectPatient: (p: Patient) => void;
  onOpenPatientFile: (p: Patient) => void;
  onOpenPalmerChart: (p: Patient) => void;
  onOpenPaymentModal: (p: Patient) => void;
  onOpenAppointmentModal?: (p: Patient) => void;
}

export const ClinicalHudDrawer: React.FC<ClinicalHudDrawerProps> = ({
  isOpen,
  onClose,
  patient,
  patients,
  onSelectPatient,
  onOpenPatientFile,
  onOpenPalmerChart,
  onOpenPaymentModal,
  onOpenAppointmentModal
}) => {
  const { impactLight, selection } = useHapticFeedback();
  const [patientSelectorOpen, setPatientSelectorOpen] = useState(false);

  if (!isOpen) return null;

  // Active patient or default to first patient
  const activePatient = patient || patients[0] || null;

  if (!activePatient) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
        <div className="w-full max-w-sm bg-white h-full p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="font-black text-sm">کنسول بالینی شناور</span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-slate-500 text-xs">بیماری جهت نمایش بالینی انتخاب نشده است.</p>
        </div>
      </div>
    );
  }

  // Detect critical medical alerts
  const criticalAllergies = activePatient.medicalHistory.filter(h => 
    h.includes('حساسیت') || h.includes('آلرژی') || h.includes('پنی‌سیلین') || h.includes('لاتکس')
  );
  const systemicAlerts = activePatient.medicalHistory.filter(h => 
    !h.includes('حساسیت') && !h.includes('آلرژی') && !h.includes('پنی‌سیلین') && !h.includes('لاتکس')
  );

  // Active teeth under treatment
  const ongoingTeeth = Object.entries(activePatient.teethConditions || {}).filter(
    ([_, c]) => c.status === 'in_progress' || c.status === 'planned'
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 select-none">
      {/* Backdrop Click Dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Main Slide-Over HUD Drawer */}
      <div 
        className="relative w-full max-w-md bg-white text-slate-900 h-full flex flex-col shadow-2xl border-r border-slate-200 overflow-hidden animate-in slide-in-from-right duration-250"
        role="dialog"
        aria-modal="true"
        aria-label="کنسول بالینی شناور"
      >
        {/* Top Header */}
        <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#c8ff00] text-black flex items-center justify-center font-bold shadow-xs">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-white block">
                کنسول بالینی شناور (Clinical HUD)
              </span>
              <span className="text-[10px] text-slate-300 font-medium block">
                دسترسی فوری بدون ترک صفحه درمان
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              impactLight();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
            aria-label="بستن کنسول"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Patient Switcher Bar */}
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              {activePatient.fullName.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 truncate">
                  {activePatient.fullName}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (پرونده: {toPersianDigits(activePatient.fileNumber)})
                </span>
              </div>
              <span className="text-[10.5px] text-slate-500 font-mono">
                {toPersianDigits(activePatient.phone)}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              selection();
              setPatientSelectorOpen(!patientSelectorOpen);
            }}
            className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg border border-teal-200 active:scale-95 transition-all shrink-0"
          >
            تغییر بیمار
          </button>
        </div>

        {/* Quick Patient Selector Dropdown */}
        {patientSelectorOpen && (
          <div className="max-h-48 overflow-y-auto bg-slate-100 border-b border-slate-300 p-1.5 space-y-1">
            {patients.map(p => (
              <div
                key={p.id}
                onClick={() => {
                  selection();
                  onSelectPatient(p);
                  setPatientSelectorOpen(false);
                }}
                className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                  p.id === activePatient.id 
                    ? 'bg-teal-600 text-white font-bold' 
                    : 'bg-white hover:bg-slate-200 text-slate-800'
                }`}
              >
                <span>{p.fullName}</span>
                <span className="text-[10px] font-mono">{toPersianDigits(p.fileNumber)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          
          {/* 1. Critical Red Medical Alerts & Allergies (Priority One) */}
          {(criticalAllergies.length > 0 || systemicAlerts.length > 0) ? (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-300/80 text-red-950 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 text-red-700">
                <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
                <span className="text-xs font-black">هشدار حیاتی و حساسیت‌های دارویی</span>
              </div>
              
              {criticalAllergies.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {criticalAllergies.map((allergy, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 rounded-md bg-red-600 text-white font-bold text-[10.5px] flex items-center gap-1 shadow-xs"
                    >
                      <AlertTriangle className="w-3 h-3 stroke-[3]" />
                      {allergy}
                    </span>
                  ))}
                </div>
              )}

              {systemicAlerts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {systemicAlerts.map((med, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] flex items-center gap-1"
                    >
                      <HeartPulse className="w-3 h-3 text-amber-700" />
                      {med}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">بدون سابقه آلرژی یا بیماری سیستمیک ثبت‌شده</span>
            </div>
          )}

          {/* 2. Live Financial Status & Balance */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                وضعیت مالی و مانده حساب
              </span>
              <span className={`font-black text-xs px-2 py-0.5 rounded-full ${
                activePatient.balance < 0 
                  ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {activePatient.balance < 0 ? 'بدهکار' : 'تسویه / بستانکار'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[9px] text-slate-500 font-sans block">کل درمان</span>
                <span className="text-[11px] font-black text-slate-900">
                  {formatToman(activePatient.totalCost)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[9px] text-slate-500 font-sans block">پرداختی</span>
                <span className="text-[11px] font-black text-emerald-700">
                  {formatToman(activePatient.paidAmount)}
                </span>
              </div>
              <div className={`p-2 rounded-xl border ${activePatient.balance < 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[9px] text-slate-500 font-sans block">مانده بدهی</span>
                <span className={`text-[11px] font-black ${activePatient.balance < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {formatToman(Math.abs(activePatient.balance))}
                </span>
              </div>
            </div>

            {/* Pending Sayad Checks or Installments Alert */}
            {activePatient.sayadChecks && activePatient.sayadChecks.length > 0 && (
              <div className="text-[10.5px] text-slate-600 bg-amber-50/70 p-2 rounded-xl border border-amber-200/80 flex items-center justify-between">
                <span>چک‌های صیادی در جریان:</span>
                <span className="font-bold text-amber-900">
                  {toPersianDigits(activePatient.sayadChecks.filter(c => c.status === 'in_collection').length)} فقره
                </span>
              </div>
            )}
          </div>

          {/* 3. Active Teeth Under Treatment (Mini Palmer) */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                دندان‌های در دست اقدام ({toPersianDigits(ongoingTeeth.length)})
              </span>
              <button
                onClick={() => {
                  impactLight();
                  onOpenPalmerChart(activePatient);
                }}
                className="text-[10px] text-teal-700 font-bold hover:underline"
              >
                چارت کامل
              </button>
            </div>

            {ongoingTeeth.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {ongoingTeeth.map(([key, cond]) => (
                  <div 
                    key={key} 
                    className="p-1.5 px-2.5 rounded-xl bg-white border border-teal-200 flex items-center gap-2 shadow-2xs"
                  >
                    <span className="text-xs font-black text-teal-900">
                      دندان {toPersianDigits(cond.toothNumber)} {cond.quadrant}
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {cond.treatment}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">درمان فعالی برای این بیمار در جریان نیست.</p>
            )}
          </div>

          {/* 4. Active Lab Orders */}
          {activePatient.labOrders && activePatient.labOrders.length > 0 && (
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-purple-900 font-bold">
                <span className="flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                  سفارش لابراتوار فعال
                </span>
                <span className="text-[10px] text-purple-700">
                  {toPersianDigits(activePatient.labOrders.length)} مورد
                </span>
              </div>
              {activePatient.labOrders.map(order => (
                <div key={order.id} className="p-2 rounded-xl bg-white border border-purple-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">{order.workType}</span>
                    <span className="text-[10px] text-slate-500">رنگ: {order.shade} · دندان {order.toothNumber}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    {order.status === 'ready_for_clinic' ? 'آماده تحویل' : 'در دست ساخت'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 5. Active Implant Cases */}
          {activePatient.implantCases && activePatient.implantCases.length > 0 && (
            <div className="p-3 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-cyan-950 font-bold">
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-700" />
                  مراحل کاشت ایمپلنت
                </span>
                <span className="text-[10px] text-cyan-700">
                  {toPersianDigits(activePatient.implantCases.length)} واحد
                </span>
              </div>
              {activePatient.implantCases.map(imp => (
                <div key={imp.id} className="p-2 rounded-xl bg-white border border-cyan-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">
                      دندان {toPersianDigits(imp.toothNumber)} · {imp.brand}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {imp.diameter}x{imp.length}mm
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                    {imp.currentStage === 'fixture_placed' ? 'کاشت فیکسچر' : 
                     imp.currentStage === 'healing_cap' ? 'هیلینگ' : 
                     imp.currentStage === 'impression' ? 'قالب‌گیری' : 'آماده روکش'}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Bottom Quick-Action Buttons (Glove-Friendly Large Touch Targets) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-2">
          {/* Quick Payment POS */}
          <button
            onClick={() => {
              impactLight();
              onOpenPaymentModal(activePatient);
            }}
            className="py-2.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-xs"
          >
            <CreditCard className="w-4 h-4" />
            <span>ثبت دریافت</span>
          </button>

          {/* Open Palmer Chart */}
          <button
            onClick={() => {
              impactLight();
              onOpenPalmerChart(activePatient);
            }}
            className="py-2.5 px-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>چارت پالمر</span>
          </button>

          {/* Full Patient File */}
          <button
            onClick={() => {
              impactLight();
              onOpenPatientFile(activePatient);
            }}
            className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>پرونده کامل</span>
          </button>
        </div>

      </div>
    </div>
  );
};
