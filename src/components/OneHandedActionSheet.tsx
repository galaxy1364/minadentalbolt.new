import React from 'react';
import { 
  X, UserPlus, Calendar, CreditCard, Activity, Search, 
  Layers, FlaskConical, Bell, PhoneCall
} from 'lucide-react';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface OneHandedActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAdmission: () => void;
  onOpenAppointments: () => void;
  onOpenPaymentModal: () => void;
  onOpenClinicalHud: () => void;
  onOpenPalmerChart: () => void;
  onOpenLabOrders: () => void;
}

export const OneHandedActionSheet: React.FC<OneHandedActionSheetProps> = ({
  isOpen,
  onClose,
  onQuickAdmission,
  onOpenAppointments,
  onOpenPaymentModal,
  onOpenClinicalHud,
  onOpenPalmerChart,
  onOpenLabOrders
}) => {
  const { impactLight, selection } = useHapticFeedback();

  if (!isOpen) return null;

  const handleAction = (cb: () => void) => {
    impactLight();
    cb();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="منوی یک‌دستی شست"
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Thumb Cluster Sheet at Bottom */}
      <div className="relative w-full max-w-md bg-white rounded-t-[28px] p-4 shadow-2xl border-t border-slate-200 z-10 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200">
        
        {/* Pull Handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />

        {/* Title & Close */}
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-xs font-black text-slate-900 block">
              فرمان‌های سریع با یک‌دست (Thumb Zone)
            </span>
            <span className="text-[10px] text-slate-500 block">
              طراحی ارگونومیک برای دسترسی آسان با انگشت شست
            </span>
          </div>
          <button
            onClick={() => {
              impactLight();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumb Action Grid (Generous 48px+ Touch Targets) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          
          {/* 1. Quick Admission */}
          <button
            onClick={() => handleAction(onQuickAdmission)}
            className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs group"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <UserPlus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black">پذیرش فوری</span>
          </button>

          {/* 2. Today Appointments */}
          <button
            onClick={() => handleAction(onOpenAppointments)}
            className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black">نوبت‌های امروز</span>
          </button>

          {/* 3. Clinical HUD Drawer */}
          <button
            onClick={() => handleAction(onOpenClinicalHud)}
            className="p-3 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black">کنسول بالینی</span>
          </button>

          {/* 4. Palmer Chart */}
          <button
            onClick={() => handleAction(onOpenPalmerChart)}
            className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black">چارت پالمر</span>
          </button>

          {/* 5. Payment POS */}
          <button
            onClick={() => handleAction(onOpenPaymentModal)}
            className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black">دریافت وجه (POS)</span>
          </button>

          {/* 6. Lab Orders */}
          <button
            onClick={() => handleAction(onOpenLabOrders)}
            className="p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <FlaskConical className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black">پیگیری لابراتوار</span>
          </button>

        </div>

      </div>
    </div>
  );
};
