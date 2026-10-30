import React, { useState } from 'react';
import { X, Search, ChevronLeft, Headphones } from 'lucide-react';
import { FolderCard } from './FolderCard';
import { toPersianDigits } from '../utils/jalali';
import {
  Logo3DImplant,
  Logo3DLab,
  Logo3DSayadCheck,
  Logo3DInstallments,
  Logo3DAiGemini,
  Logo3DPatients,
  Logo3DTreatments,
  Logo3DAppointments,
  Logo3DInventory,
  Logo3DReminders,
  Logo3DXRay,
  Logo3DMarketing,
  Logo3DFinancial,
  Logo3DGridServices,
  Logo3DThumbZap,
  Logo3DPalmerChart,
  Logo3DGuaranteeCheck,
  Logo3DPosTerminal,
  Logo3DTreatmentPlans,
  Logo3DReports,
  Logo3DSettings,
  Logo3DCommissions,
  Logo3DCallerId,
  Logo3DInsurance,
  Logo3DSterilization,
  Logo3DOnlineBooking,
  Logo3DDigitalLabPortal,
  Logo3DSmsGateway,
  Logo3DClinicalAudit,
  Logo3DLiveSync,
  Logo3DMainDentalTooth
} from './ThreeDimensionalLogos';

interface ServicesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: any) => void;
  lowStockCount?: number;
}

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  themeColor: string;
  iconBg: string;
  iconColor: string;
  cardBg: string;
  icon: React.ReactNode;
}

export const ServicesSheet: React.FC<ServicesSheetProps> = ({
  isOpen,
  onClose,
  onNavigate,
  lowStockCount = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // 16 Complete Modules with 3D Embossed Multi-Color Logos
  const services: ServiceItem[] = [
    {
      id: 'implant',
      title: 'کاشت ایمپلنت',
      category: 'جراحی',
      themeColor: 'sky',
      iconBg: 'bg-sky-100 border-sky-300',
      iconColor: 'text-sky-600',
      cardBg: 'from-white via-[#f0f9ff] to-[#e0f2fe]',
      icon: <Logo3DImplant size={44} />
    },
    {
      id: 'lab',
      title: 'لابراتوار پروتز',
      category: 'پروتز',
      themeColor: 'purple',
      iconBg: 'bg-purple-100 border-purple-300',
      iconColor: 'text-purple-600',
      cardBg: 'from-white via-[#faf5ff] to-[#f3e8ff]',
      icon: <Logo3DLab size={44} />
    },
    {
      id: 'sayad_checks',
      title: 'چک صیادی',
      category: 'مالی',
      themeColor: 'pink',
      iconBg: 'bg-pink-100 border-pink-300',
      iconColor: 'text-pink-600',
      cardBg: 'from-white via-[#fff1f2] to-[#fce7f3]',
      icon: <Logo3DSayadCheck size={44} />
    },
    {
      id: 'installments',
      title: 'اقساط درمانی',
      category: 'مالی',
      themeColor: 'amber',
      iconBg: 'bg-amber-100 border-amber-300',
      iconColor: 'text-amber-600',
      cardBg: 'from-white via-[#fffbeb] to-[#fef3c7]',
      icon: <Logo3DInstallments size={44} />
    },
    {
      id: 'ai_assistant',
      title: 'هوش مصنوعی جمنای',
      category: 'هوشمند',
      themeColor: 'gemini',
      iconBg: 'bg-indigo-100 border-indigo-300',
      iconColor: 'text-indigo-600',
      cardBg: 'from-white via-[#f0f9ff] to-[#fdf4ff]',
      icon: <Logo3DAiGemini size={44} />
    },
    {
      id: 'patients',
      title: 'پرونده بیماران',
      category: 'پذیرش',
      themeColor: 'indigo',
      iconBg: 'bg-blue-100 border-blue-300',
      iconColor: 'text-blue-600',
      cardBg: 'from-white via-[#eef2ff] to-[#e0e7ff]',
      icon: <Logo3DPatients size={44} />
    },
    {
      id: 'appointments',
      title: 'نوبت‌دهی و تقویم',
      category: 'پذیرش',
      themeColor: 'emerald',
      iconBg: 'bg-emerald-100 border-emerald-300',
      iconColor: 'text-emerald-600',
      cardBg: 'from-white via-[#f0fdf4] to-[#dcfce7]',
      icon: <Logo3DAppointments size={44} />
    },
    {
      id: 'palmer',
      title: 'چارت دندانی پالمر',
      category: 'درمان',
      themeColor: 'teal',
      iconBg: 'bg-teal-100 border-teal-300',
      iconColor: 'text-teal-600',
      cardBg: 'from-white via-[#f0fdfa] to-[#ccfbf1]',
      icon: <Logo3DPalmerChart size={44} />
    },
    {
      id: 'guarantee_checks',
      title: 'چک ضمانت',
      category: 'مالی',
      themeColor: 'rose',
      iconBg: 'bg-rose-100 border-rose-300',
      iconColor: 'text-rose-600',
      cardBg: 'from-white via-[#fff1f2] to-[#ffe4e6]',
      icon: <Logo3DGuaranteeCheck size={44} />
    },
    {
      id: 'pos_payments',
      title: 'کارتخوان و POS',
      category: 'مالی',
      themeColor: 'lime',
      iconBg: 'bg-lime-100 border-lime-300',
      iconColor: 'text-lime-700',
      cardBg: 'from-white via-[#f7fee7] to-[#ecfccb]',
      icon: <Logo3DPosTerminal size={44} />
    },
    {
      id: 'inventory',
      title: 'انبار و متریال',
      category: 'مدیریت',
      themeColor: 'green',
      iconBg: 'bg-emerald-100 border-emerald-300',
      iconColor: 'text-emerald-700',
      cardBg: 'from-white via-[#f0fdf4] to-[#bbf7d0]',
      icon: <Logo3DInventory size={44} />
    },
    {
      id: 'reminders',
      title: 'پیامک و یادآوری',
      category: 'ارتباطات',
      themeColor: 'orange',
      iconBg: 'bg-orange-100 border-orange-300',
      iconColor: 'text-orange-600',
      cardBg: 'from-white via-[#fff7ed] to-[#ffedd5]',
      icon: <Logo3DReminders size={44} />
    },
    {
      id: 'xrays',
      title: 'رادیولوژی OPG',
      category: 'تشخیص',
      themeColor: 'cyan',
      iconBg: 'bg-cyan-100 border-cyan-300',
      iconColor: 'text-cyan-600',
      cardBg: 'from-white via-[#ecfeff] to-[#cffafe]',
      icon: <Logo3DXRay size={44} />
    },
    {
      id: 'treatment_plans',
      title: 'طرح درمان جامع',
      category: 'درمان',
      themeColor: 'magenta',
      iconBg: 'bg-fuchsia-100 border-fuchsia-300',
      iconColor: 'text-fuchsia-600',
      cardBg: 'from-white via-[#fdf4ff] to-[#fae8ff]',
      icon: <Logo3DTreatmentPlans size={44} />
    },
    {
      id: 'marketing',
      title: 'تبلیغات و کمپین‌ها',
      category: 'بازاریابی',
      themeColor: 'pink',
      iconBg: 'bg-pink-100 border-pink-300',
      iconColor: 'text-pink-600',
      cardBg: 'from-white via-[#fff1f2] to-[#ffe4e6]',
      icon: <Logo3DMarketing size={44} />
    },
    {
      id: 'reports',
      title: 'گزارشات آماری',
      category: 'مدیریت',
      themeColor: 'purple',
      iconBg: 'bg-purple-100 border-purple-300',
      iconColor: 'text-purple-600',
      cardBg: 'from-white via-[#f5f3ff] to-[#ede9fe]',
      icon: <Logo3DReports size={44} />
    },
    {
      id: 'settings',
      title: 'تنظیمات کلینیک',
      category: 'مدیریت',
      themeColor: 'slate',
      iconBg: 'bg-slate-100 border-slate-300',
      iconColor: 'text-slate-600',
      cardBg: 'from-white via-[#f8fafc] to-[#f1f5f9]',
      icon: <Logo3DSettings size={44} />
    },
    {
      id: 'doctor_commissions',
      title: 'سهم‌بندی پزشکان',
      category: 'مالی',
      themeColor: 'emerald',
      iconBg: 'bg-emerald-100 border-emerald-300',
      iconColor: 'text-emerald-700',
      cardBg: 'from-white via-[#f0fdf4] to-[#dcfce7]',
      icon: <Logo3DCommissions size={44} />
    },
    {
      id: 'incoming_call_test',
      title: 'کالر آی‌دی تماس بیمار',
      category: 'ارتباطات',
      themeColor: 'sky',
      iconBg: 'bg-sky-100 border-sky-300',
      iconColor: 'text-sky-600',
      cardBg: 'from-white via-[#f0f9ff] to-[#e0f2fe]',
      icon: <Logo3DCallerId size={44} />
    },
    {
      id: 'insurance_claims',
      title: 'بیمه پایه و تکمیلی',
      category: 'مالی',
      themeColor: 'blue',
      iconBg: 'bg-blue-100 border-blue-300',
      iconColor: 'text-blue-600',
      cardBg: 'from-white via-[#eff6ff] to-[#dbeafe]',
      icon: <Logo3DInsurance size={44} />
    },
    {
      id: 'sterilization',
      title: 'استریلیزاسیون و اتوکلاو',
      category: 'جراحی',
      themeColor: 'teal',
      iconBg: 'bg-teal-100 border-teal-300',
      iconColor: 'text-teal-600',
      cardBg: 'from-white via-[#f0fdfa] to-[#ccfbf1]',
      icon: <Logo3DSterilization size={44} />
    },
    {
      id: 'online_booking',
      title: 'نوبت‌دهی آنلاین بیمار',
      category: 'پذیرش',
      themeColor: 'emerald',
      iconBg: 'bg-emerald-100 border-emerald-300',
      iconColor: 'text-emerald-600',
      cardBg: 'from-white via-[#ecfdf5] to-[#d1fae5]',
      icon: <Logo3DOnlineBooking size={44} />
    },
    {
      id: 'digital_lab',
      title: 'پورتال همکار لابراتوار',
      category: 'پروتز',
      themeColor: 'purple',
      iconBg: 'bg-purple-100 border-purple-300',
      iconColor: 'text-purple-600',
      cardBg: 'from-white via-[#faf5ff] to-[#f3e8ff]',
      icon: <Logo3DDigitalLabPortal size={44} />
    },
    {
      id: 'sms_gateway',
      title: 'تنظیمات پیامک خدماتی',
      category: 'ارتباطات',
      themeColor: 'sky',
      iconBg: 'bg-sky-100 border-sky-300',
      iconColor: 'text-sky-600',
      cardBg: 'from-white via-[#f0f9ff] to-[#e0f2fe]',
      icon: <Logo3DSmsGateway size={44} />
    },
    {
      id: 'audit_suite',
      title: 'تست ۴۶گانه بالینی',
      category: 'آزمون و ارزیابی',
      themeColor: 'purple',
      iconBg: 'bg-purple-100 border-purple-300',
      iconColor: 'text-purple-600',
      cardBg: 'from-white via-[#faf5ff] to-[#f3e8ff]',
      icon: <Logo3DClinicalAudit size={44} />
    },
    {
      id: 'live_sync_simulator',
      title: 'شبیه‌ساز زنده پزشک / منشی',
      category: 'همگام‌سازی ابری',
      themeColor: 'amber',
      iconBg: 'bg-amber-100 border-amber-300',
      iconColor: 'text-amber-600',
      cardBg: 'from-white via-[#fffbeb] to-[#fef3c7]',
      icon: <Logo3DLiveSync size={44} />
    }
  ];

  const filteredServices = services.filter(s =>
    s.title.includes(searchQuery) || s.category.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col justify-between overflow-hidden animate-in fade-in duration-200 select-none">
      
      {/* Top Header - Pure Clean White with Emerald Accent */}
      <div className="relative px-5 pt-3 pb-3 flex items-center justify-between z-20 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        {/* Right: Modern 3D Embossed Multi-Color Dental Tooth Logo with Purple Accents */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-cyan-500/15 border border-purple-300/60 flex items-center justify-center shadow-xs p-0.5 overflow-hidden">
            <Logo3DMainDentalTooth size={36} />
          </div>
          <div>
            <span className="text-base font-black text-slate-800 tracking-tight block">مینادنتال</span>
            <span className="text-[10px] text-slate-500 font-medium">کلیه ماژول‌ها و خدمات تخصصی کلینیک</span>
          </div>
        </div>

        {/* Left: Close button and Headset support button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95"
            aria-label="بستن منو"
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>
          <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Headphones className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Services Container - Light Background with Curved Cutout Tiles */}
      <div className="flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-50 px-3 pt-5 pb-2 overflow-y-auto no-scrollbar">
        
        {/* 2-Column Grid of High-Precision Q-Bank Notched Cards */}
        <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto pb-6">
          {filteredServices.map((service) => (
            <FolderCard
              key={service.id}
              title={service.title}
              subtitle={service.category}
              icon={service.icon}
              badge={service.id === 'inventory' && lowStockCount > 0 ? `${toPersianDigits(lowStockCount)} قلم کسری` : undefined}
              badgeAlert={service.id === 'inventory' && lowStockCount > 0}
              alertDot={service.id === 'inventory' && lowStockCount > 0}
              theme={
                service.themeColor === 'sky' ? 'cyan' :
                service.themeColor === 'purple' ? 'purple' :
                service.themeColor === 'pink' || service.themeColor === 'magenta' ? 'pink' :
                service.themeColor === 'amber' || service.themeColor === 'yellow' ? 'amber' :
                service.themeColor === 'gemini' || service.themeColor === 'indigo' ? 'gemini' :
                service.themeColor === 'emerald' || service.themeColor === 'green' || service.themeColor === 'lime' ? 'emerald' :
                service.themeColor === 'rose' || service.themeColor === 'orange' ? 'rose' : 'teal'
              }
              onClick={() => {
                onNavigate(service.id);
                onClose();
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Bar: Search Input & Circular Back Button */}
      <div className="bg-white px-4 pb-5 pt-2 border-t border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          {/* Back Circular Button */}
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all"
            aria-label="بازگشت"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Pill Search Input */}
          <div className="flex-1 h-11 rounded-full bg-slate-50 border border-slate-200 flex items-center px-4 gap-2 shadow-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="جستجو در بخش‌ها، خدمات و ابزارها..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-xs focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
