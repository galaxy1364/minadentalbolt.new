import React from 'react';
import { 
  Logo3DHome, 
  Logo3DPatients, 
  Logo3DTreatments, 
  Logo3DFinancial, 
  Logo3DAppointments, 
  Logo3DGridServices, 
  Logo3DThumbZap 
} from './ThreeDimensionalLogos';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

export type NavTab = 'home' | 'patients' | 'treatments' | 'financial' | 'appointments';

interface BottomDockProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenServicesMenu: () => void;
  onOpenThumbZone?: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeTab,
  onTabChange,
  onOpenServicesMenu,
  onOpenThumbZone
}) => {
  const { selection, impactMedium } = useHapticFeedback();

  const handleTab = (tab: NavTab) => {
    selection();
    onTabChange(tab);
  };

  return (
    <nav 
      aria-label="ناوبری اصلی داک مینادنتال"
      className="fixed inset-x-0 z-50 flex justify-center px-1.5 sm:px-3 pointer-events-none"
      style={{ bottom: 'max(0.55rem, env(safe-area-inset-bottom, 0.55rem))' }}
    >
      <div className="pointer-events-auto flex items-center justify-between gap-0.5 sm:gap-1.5 p-1 sm:p-1.5 rounded-[26px] sm:rounded-full bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.18)] max-w-lg w-full">
        
        {/* Left side: Grid All Services Button with 3D Embossed Multi-Color Icon + Title Underneath */}
        <button
          onClick={() => {
            impactMedium();
            onOpenServicesMenu();
          }}
          className="flex flex-col items-center justify-center py-1 px-1.5 min-w-[46px] sm:min-w-[54px] rounded-2xl hover:bg-purple-50/80 text-slate-600 hover:text-purple-700 transition-all active:translate-y-1 active:scale-90 shrink-0 group cursor-pointer"
          title="منوی کلیه خدمات کلینیک"
          aria-label="کلیه خدمات کلینیک"
        >
          <Logo3DGridServices size={26} className="group-hover:rotate-12 group-hover:scale-110 transition-transform" />
          <span className="text-[9.5px] sm:text-[10px] font-black text-slate-600 group-hover:text-purple-700 mt-0.5 leading-tight select-none">
            خدمات
          </span>
        </button>

        {/* Separator Line */}
        <div className="h-7 w-[1px] bg-slate-200/80 shrink-0" />

        {/* Navigation Tabs with 3D Embossed Multi-Color Logos + Names Underneath */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-around min-w-0">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => handleTab('home')}
            className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 min-w-[48px] sm:min-w-[58px] rounded-2xl transition-all duration-200 active:translate-y-1 active:scale-95 cursor-pointer ${
              activeTab === 'home'
                ? 'bg-emerald-50 text-emerald-700 font-black shadow-xs border border-emerald-200/70 scale-102'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-bold'
            }`}
            title="داشبورد کلینیک"
          >
            <Logo3DHome size={26} className={activeTab === 'home' ? 'scale-110 drop-shadow-[0_4px_8px_rgba(16,185,129,0.4)]' : 'opacity-85 hover:opacity-100'} />
            <span className={`text-[9.5px] sm:text-[10px] mt-0.5 leading-tight select-none ${activeTab === 'home' ? 'text-emerald-800 font-black' : 'text-slate-600'}`}>
              داشبورد
            </span>
          </button>

          {/* Patients Tab */}
          <button
            onClick={() => handleTab('patients')}
            className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 min-w-[48px] sm:min-w-[58px] rounded-2xl transition-all duration-200 active:translate-y-1 active:scale-95 cursor-pointer ${
              activeTab === 'patients'
                ? 'bg-sky-50 text-sky-700 font-black shadow-xs border border-sky-200/70 scale-102'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-bold'
            }`}
            title="پرونده بیماران"
          >
            <Logo3DPatients size={26} className={activeTab === 'patients' ? 'scale-110 drop-shadow-[0_4px_8px_rgba(2,132,199,0.4)]' : 'opacity-85 hover:opacity-100'} />
            <span className={`text-[9.5px] sm:text-[10px] mt-0.5 leading-tight select-none ${activeTab === 'patients' ? 'text-sky-800 font-black' : 'text-slate-600'}`}>
              بیماران
            </span>
          </button>

          {/* Treatments / Palmer Chart Tab */}
          <button
            onClick={() => handleTab('treatments')}
            className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 min-w-[48px] sm:min-w-[58px] rounded-2xl transition-all duration-200 active:translate-y-1 active:scale-95 cursor-pointer ${
              activeTab === 'treatments'
                ? 'bg-teal-50 text-teal-700 font-black shadow-xs border border-teal-200/70 scale-102'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-bold'
            }`}
            title="درمان و چارت پالمر"
          >
            <Logo3DTreatments size={26} className={activeTab === 'treatments' ? 'scale-110 drop-shadow-[0_4px_8px_rgba(20,184,166,0.4)]' : 'opacity-85 hover:opacity-100'} />
            <span className={`text-[9.5px] sm:text-[10px] mt-0.5 leading-tight select-none ${activeTab === 'treatments' ? 'text-teal-800 font-black' : 'text-slate-600'}`}>
              درمان
            </span>
          </button>

          {/* Financial / Checks Tab */}
          <button
            onClick={() => handleTab('financial')}
            className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 min-w-[48px] sm:min-w-[58px] rounded-2xl transition-all duration-200 active:translate-y-1 active:scale-95 cursor-pointer ${
              activeTab === 'financial'
                ? 'bg-amber-50 text-amber-700 font-black shadow-xs border border-amber-200/70 scale-102'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-bold'
            }`}
            title="امور مالی و چک صیادی"
          >
            <Logo3DFinancial size={26} className={activeTab === 'financial' ? 'scale-110 drop-shadow-[0_4px_8px_rgba(217,119,6,0.4)]' : 'opacity-85 hover:opacity-100'} />
            <span className={`text-[9.5px] sm:text-[10px] mt-0.5 leading-tight select-none ${activeTab === 'financial' ? 'text-amber-800 font-black' : 'text-slate-600'}`}>
              مالی
            </span>
          </button>

          {/* Appointments / Calendar Tab */}
          <button
            onClick={() => handleTab('appointments')}
            className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 min-w-[48px] sm:min-w-[58px] rounded-2xl transition-all duration-200 active:translate-y-1 active:scale-95 cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-blue-50 text-blue-700 font-black shadow-xs border border-blue-200/70 scale-102'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 font-bold'
            }`}
            title="نوبت‌دهی و تقویم ایرانی"
          >
            <Logo3DAppointments size={26} className={activeTab === 'appointments' ? 'scale-110 drop-shadow-[0_4px_8px_rgba(37,99,235,0.4)]' : 'opacity-85 hover:opacity-100'} />
            <span className={`text-[9.5px] sm:text-[10px] mt-0.5 leading-tight select-none ${activeTab === 'appointments' ? 'text-blue-800 font-black' : 'text-slate-600'}`}>
              نوبت‌ها
            </span>
          </button>
        </div>

        {/* Separator Line */}
        {onOpenThumbZone && <div className="h-7 w-[1px] bg-slate-200/80 shrink-0" />}

        {/* Right side: Thumb Zone Quick Actions Trigger with 3D Embossed Electric Zap + Name Underneath */}
        {onOpenThumbZone && (
          <button
            onClick={() => {
              impactMedium();
              onOpenThumbZone();
            }}
            className="flex flex-col items-center justify-center py-1 px-1.5 min-w-[46px] sm:min-w-[54px] rounded-2xl hover:bg-[#c8ff00]/15 text-slate-600 hover:text-lime-700 transition-all active:translate-y-1 active:scale-90 shrink-0 group cursor-pointer"
            title="فرمان‌های سریع با یک دست (Thumb Zone)"
            aria-label="فرمان‌های سریع با یک دست"
          >
            <Logo3DThumbZap size={26} className="group-hover:scale-115 transition-transform" />
            <span className="text-[9.5px] sm:text-[10px] font-black text-slate-600 group-hover:text-lime-800 mt-0.5 leading-tight select-none">
              سریع
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
