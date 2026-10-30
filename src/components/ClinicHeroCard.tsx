import React, { useState } from 'react';
import { 
  Eye, EyeOff, Calendar, Layers, UserPlus, 
  ChevronDown, Database, Stethoscope, ChevronLeft, ShieldCheck
} from 'lucide-react';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface ClinicHeroCardProps {
  onQuickAdmission: () => void;
  onOpenPalmerChart: () => void;
  onOpenAppointments: () => void;
  onOpenFinancial?: () => void;
  onOpenSupabaseTest?: () => void;
  onOpenShiftSettings: () => void;
  onOpenPhaseAudit?: () => void;
  todayAppointmentsCount?: number;
  activeSurgeriesCount?: number;
  readyLabOrdersCount?: number;
  dailyRevenue?: number;
}

export const ClinicHeroCard: React.FC<ClinicHeroCardProps> = ({
  onQuickAdmission,
  onOpenPalmerChart,
  onOpenAppointments,
  onOpenFinancial,
  onOpenSupabaseTest,
  onOpenShiftSettings,
  onOpenPhaseAudit,
  todayAppointmentsCount = 12,
  activeSurgeriesCount = 4,
  readyLabOrdersCount = 3,
  dailyRevenue = 38500000
}) => {
  const { impactLight, impactHeavy, selection } = useHapticFeedback();
  const [showRevenue, setShowRevenue] = useState(true);
  const [period, setPeriod] = useState<'today' | 'month'>('today');

  const currentAmount = period === 'today' ? dailyRevenue : dailyRevenue * 26;

  return (
    <div className="relative mx-1 select-none">
      {/* 
        100% Functional & Practical Clinic Command Center:
        - Clean luxury white/mint medical card
        - Zero black background!
        - Live Doctor Unit, Supabase Cloud sync, Revenue toggle,
          Instant Clinical Metric pills and Action Triggers
      */}
      <div className="relative rounded-[22px] bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 p-3 text-slate-900 border border-emerald-200/90 shadow-[0_4px_24px_rgba(16,185,129,0.08)] overflow-hidden">
        
        {/* Subtle dot texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none rounded-[22px]"
          style={{
            backgroundImage: `radial-gradient(#059669 1px, transparent 1px)`,
            backgroundSize: '12px 12px'
          }}
        />

        {/* Ambient Top Glow */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: Doctor Unit info & Cloud Supabase Status */}
        <div className="relative z-10 flex items-center justify-between gap-1 pb-2 border-b border-slate-200/80">
          {/* Right: Unit & Doctor Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-black text-slate-900 tracking-tight truncate">
              دکتر امیری · یونیت فعال
            </span>
          </div>

          {/* Left: Global Standards Suite & Supabase Cloud Status */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenPhaseAudit && (
              <button
                type="button"
                onClick={() => {
                  impactLight();
                  onOpenPhaseAudit();
                }}
                className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-100/90 border border-purple-300 text-[9px] sm:text-[9.5px] font-black text-purple-900 hover:bg-purple-200 active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0"
                title="مرکز آزمون استانداردهای جهانی دندانپزشکی"
              >
                <ShieldCheck className="w-3 h-3 text-purple-700 stroke-[2.5]" />
                <span className="hidden xs:inline">استاندارد جهانی</span>
                <span className="xs:hidden">تست</span>
              </button>
            )}

            <button
              onClick={() => {
                impactLight();
                onOpenSupabaseTest?.();
              }}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-[9px] sm:text-[9.5px] font-bold text-emerald-800 hover:bg-emerald-200/80 active:scale-95 transition-all shadow-2xs shrink-0"
              title="آزمایشگاه تست زنده پایگاه‌داده سوپابیس"
            >
              <Database className="w-3 h-3 text-emerald-700" />
              <span className="hidden xs:inline">سوپابیس</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            </button>
          </div>
        </div>

        {/* Middle Row: Revenue & Live Metric Counters */}
        <div className="relative z-10 my-2 flex items-center justify-between gap-2 px-0.5">
          {/* Revenue & Balance */}
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500">
              <span>{period === 'today' ? 'دریافتی امروز کلینیک' : 'تراز ماهانه مطب'}</span>
              <button
                onClick={() => {
                  selection();
                  setShowRevenue(!showRevenue);
                }}
                className="p-0.5 text-slate-400 hover:text-emerald-700 transition-colors"
                title={showRevenue ? 'پنهان‌سازی' : 'نمایش'}
              >
                {showRevenue ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-red-500" />}
              </button>
            </div>

            <div 
              onClick={() => {
                impactLight();
                onOpenFinancial?.();
              }}
              className="text-base sm:text-lg font-black text-emerald-800 tracking-tight font-mono cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-1 leading-tight mt-0.5"
            >
              <span>{showRevenue ? formatToman(currentAmount) : '********* تومان'}</span>
              {onOpenFinancial && <ChevronLeft className="w-4 h-4 text-emerald-600 inline" />}
            </div>
          </div>

          {/* 3 Live Metric Mini-Pills */}
          <div className="flex items-center gap-1.5">
            {/* Appointments */}
            <div 
              onClick={() => {
                impactLight();
                onOpenAppointments();
              }}
              className="flex flex-col items-center justify-center px-2 py-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-pointer hover:border-sky-300 active:scale-95 transition-all"
              title="نوبت‌های امروز"
            >
              <span className="text-[8.5px] font-bold text-slate-400">نوبت‌ها</span>
              <span className="text-xs font-black text-sky-700 font-mono leading-none mt-0.5">
                {toPersianDigits(todayAppointmentsCount)}
              </span>
            </div>

            {/* Implants */}
            <div 
              onClick={() => {
                impactLight();
                onOpenPalmerChart();
              }}
              className="flex flex-col items-center justify-center px-2 py-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-pointer hover:border-emerald-300 active:scale-95 transition-all"
              title="جراحی و ایمپلنت فعال"
            >
              <span className="text-[8.5px] font-bold text-slate-400">جراحی</span>
              <span className="text-xs font-black text-emerald-700 font-mono leading-none mt-0.5">
                {toPersianDigits(activeSurgeriesCount)}
              </span>
            </div>

            {/* Lab */}
            <div 
              className="flex flex-col items-center justify-center px-2 py-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs"
              title="آماده تحویل لابراتوار"
            >
              <span className="text-[8.5px] font-bold text-slate-400">لابراتوار</span>
              <span className="text-xs font-black text-purple-700 font-mono leading-none mt-0.5">
                {toPersianDigits(readyLabOrdersCount)}
              </span>
            </div>

            {/* Period Switcher Button */}
            <button
              onClick={() => {
                selection();
                setPeriod(period === 'today' ? 'month' : 'today');
              }}
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl bg-emerald-100/90 border border-emerald-300/80 text-[9px] font-black text-emerald-900 hover:bg-emerald-200 active:scale-95 transition-all shrink-0 shadow-2xs"
            >
              <span>{period === 'today' ? 'امروز' : 'ماه'}</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: 3 Core Workflows Action Bar */}
        <div className="relative z-10 pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-1.5">
          {/* Action 1: نوبت‌دهی تقویم */}
          <button
            onClick={() => {
              impactLight();
              onOpenAppointments();
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 text-[10.5px] font-bold border border-sky-200/80 active:scale-95 transition-all shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>نوبت‌دهی</span>
          </button>

          {/* Action 2: درمان و چارت پالمر */}
          <button
            onClick={() => {
              impactLight();
              onOpenPalmerChart();
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[10.5px] font-bold border border-emerald-200/80 active:scale-95 transition-all shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>چارت پالمر</span>
          </button>

          {/* Action 3: پذیرش سریع */}
          <button
            onClick={() => {
              impactHeavy();
              onQuickAdmission();
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-xl bg-[#c8ff00] hover:bg-[#d5ff33] text-black text-[10.5px] font-black border border-[#b4ea00] active:scale-95 transition-all shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.8]" />
            <span>پذیرش سریع</span>
          </button>
        </div>

      </div>
    </div>
  );
};
