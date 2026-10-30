import React from 'react';
import { RotateCcw, LayoutGrid, Sparkles, Layers, PlusCircle } from 'lucide-react';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface DashboardEmptyStateProps {
  onResetLayout: () => void;
  className?: string;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onResetLayout,
  className = ''
}) => {
  const { impactHeavy } = useHapticFeedback();

  const handleReset = () => {
    impactHeavy();
    onResetLayout();
  };

  return (
    <div
      data-testid="empty-dashboard-grid"
      className={`col-span-full w-full py-10 px-4 sm:px-6 rounded-[28px] bg-gradient-to-b from-slate-50 via-white to-slate-50/80 border-2 border-dashed border-slate-200/90 flex flex-col items-center justify-center text-center shadow-xs transition-all ${className}`}
    >
      {/* Icon Emblem */}
      <div className="relative mb-3.5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/15 to-cyan-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-700 shadow-inner">
          <LayoutGrid className="w-8 h-8 stroke-[1.8]" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#c8ff00] text-black border-2 border-white flex items-center justify-center shadow-xs">
          <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </div>

      {/* Persian Title */}
      <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mb-1">
        هیچ کاشی در داشبورد فعال نیست
      </h3>

      {/* Description */}
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-5">
        تمامی کاشی‌های ماژول‌های کلینیک پنهان شده‌اند. برای مشاهده مجدد بخش‌های جراحی ایمپلنت، لابراتوار، امور مالی و نوبت‌دهی، چیدمان را بازنشانی فرمایید.
      </p>

      {/* Primary Reset CTA */}
      <button
        type="button"
        onClick={handleReset}
        className="group relative inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
        title="بازنشانی چیدمان کاشی‌ها به حالت پیش‌فرض اولیه"
      >
        <RotateCcw className="w-4 h-4 transition-transform group-hover:-rotate-90 duration-300" />
        <span>بازنشانی به چیدمان پیش‌فرض (Reset to Default Layout)</span>
      </button>

      {/* Feature Hint */}
      <span className="text-[10px] text-slate-400 font-medium mt-3">
        قابلیت جابجایی (Drag & Drop) و شخصی‌سازی چیدمان کاشی‌ها در مینادنتال
      </span>
    </div>
  );
};
