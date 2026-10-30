import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Activity, FileCheck2, CreditCard, 
  Package, BellRing, Sparkles, Camera,
  UserPlus, CalendarDays, Zap, Clock, Megaphone,
  ShieldCheck, MessageSquare, Globe, Layers,
  TrendingUp, DollarSign, Wallet, RotateCcw,
  SlidersHorizontal, Trash2, X, GripVertical
} from 'lucide-react';
import { Reorder } from 'motion/react';
import { FramerTooltip } from '../FramerTooltip';
import { Patient, InventoryItem, Appointment, LabOrder, LabStatus } from '../../types/dental';
import { INITIAL_PATIENTS, INITIAL_APPOINTMENTS } from '../../data/mockData';
import { toPersianDigits, formatToman } from '../../utils/jalali';
import { ClinicHeroCard } from '../ClinicHeroCard';
import { FolderCard } from '../FolderCard';
import { DashboardPatientSearch } from '../DashboardPatientSearch';
import { ClinicUrgentAlarmsBanner } from '../ClinicUrgentAlarmsBanner';
import { LabPipelineFunnelWidget } from '../LabPipelineFunnelWidget';
import { LabOrderStatusVisualizer } from '../LabOrderStatusVisualizer';
import { QuickAdmissionModal } from '../QuickAdmissionModal';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import {
  Logo3DImplant,
  Logo3DLab,
  Logo3DSayadCheck,
  Logo3DInstallments,
  Logo3DAiGemini,
  Logo3DInventory,
  Logo3DReminders,
  Logo3DXRay,
  Logo3DMarketing
} from '../ThreeDimensionalLogos';

interface DashboardViewProps {
  patients?: Patient[];
  appointments?: Appointment[];
  onSelectPatient?: (patient: Patient) => void;
  onOpenPalmerForPatient?: (patient: Patient) => void;
  onOpenAppointmentForPatient?: (patient: Patient) => void;
  onNavigate: (viewId: string) => void;
  onOpenPalmerChart: () => void;
  onQuickAdmission: () => void;
  onAddNewPatient?: (patient: Patient) => void;
  onOpenSupabaseTest?: () => void;
  onOpenPhaseAudit?: () => void;
  onOpenLabSlip?: (order: LabOrder) => void;
  onUpdateLabStatus?: (orderId: string, status: LabStatus) => void;
  todayAppointmentsCount: number;
  activeSurgeriesCount: number;
  readyLabOrdersCount: number;
  dailyRevenue: number;
  inventory?: InventoryItem[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  patients = INITIAL_PATIENTS,
  appointments = INITIAL_APPOINTMENTS,
  onSelectPatient,
  onOpenPalmerForPatient,
  onOpenAppointmentForPatient,
  onNavigate,
  onOpenPalmerChart,
  onQuickAdmission,
  onAddNewPatient,
  onOpenSupabaseTest,
  onOpenPhaseAudit,
  onOpenLabSlip,
  onUpdateLabStatus,
  todayAppointmentsCount,
  activeSurgeriesCount,
  readyLabOrdersCount,
  dailyRevenue,
  inventory = []
}) => {
  const [cardLayout, setCardLayout] = useState<'full' | 'grid'>('full');
  const [quickAdmissionOpen, setQuickAdmissionOpen] = useState(false);
  const { impactLight, impactHeavy, selection } = useHapticFeedback();

  // Drag-and-drop tile personalization & persistence
  const DEFAULT_TILE_IDS = [
    'implant',
    'lab',
    'sayad_checks',
    'installments',
    'ai_assistant',
    'inventory',
    'reminders',
    'xrays',
    'marketing'
  ];

  const STORAGE_TILES_KEY = 'minadental_dashboard_tiles_order_v2';

  const [tileOrder, setTileOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TILES_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => DEFAULT_TILE_IDS.includes(id));
        }
      }
    } catch (e) {
      console.warn('Error reading dashboard tile order:', e);
    }
    return DEFAULT_TILE_IDS;
  });

  const [isCustomizing, setIsCustomizing] = useState(false);

  const handleReorder = (newOrder: string[]) => {
    setTileOrder(newOrder);
    try {
      localStorage.setItem(STORAGE_TILES_KEY, JSON.stringify(newOrder));
    } catch (e) {
      console.warn('Error saving tile order:', e);
    }
  };

  const handleRemoveTile = (id: string) => {
    impactLight();
    const updated = tileOrder.filter(t => t !== id);
    setTileOrder(updated);
    try {
      localStorage.setItem(STORAGE_TILES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving tile order:', e);
    }
  };

  const handleClearAllTiles = () => {
    impactHeavy();
    setTileOrder([]);
    try {
      localStorage.setItem(STORAGE_TILES_KEY, JSON.stringify([]));
    } catch (e) {
      console.warn('Error saving tile order:', e);
    }
  };

  const handleResetLayout = () => {
    impactHeavy();
    setTileOrder(DEFAULT_TILE_IDS);
    try {
      localStorage.setItem(STORAGE_TILES_KEY, JSON.stringify(DEFAULT_TILE_IDS));
    } catch (e) {
      console.warn('Error saving tile order:', e);
    }
  };

  const lowStockItems = inventory.filter(i => i.stock <= i.minAlert);
  const lowStockCount = lowStockItems.length;
  const lowStockSummary = lowStockItems.map(i => i.name.split(' ').slice(0, 2).join(' ')).slice(0, 3).join('، ');

  // Calculate today's revenue from completed payments
  const paymentsTotal = patients
    .flatMap(p => p.payments || [])
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidInstallmentsTotal = patients
    .flatMap(p => p.installments || [])
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const calculatedTodayRevenue = paymentsTotal + paidInstallmentsTotal;
  const effectiveDailyRevenue = calculatedTodayRevenue > 0 ? calculatedTodayRevenue : dailyRevenue;

  // Extract all clinic lab orders for the real-time status visualizer within the grid
  const allLabOrders: LabOrder[] = patients.flatMap(p => p.labOrders || []);

  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 15);
    return () => clearTimeout(timer);
  }, []);

  // Render content of each modular card
  const renderTileContent = (tileId: string) => {
    switch (tileId) {
      case 'implant':
        return (
          <FolderCard
            title="کاشت ایمپلنت"
            subtitle="مراحل جراحی و پذیرش سریع"
            icon={<Logo3DImplant size={46} />}
            badge={`${activeSurgeriesCount} فعال`}
            theme="cyan"
            className="tile"
            actionTooltip="ورود به ماژول جراحی، مراحل ۵گانه کاشت و لاگ ایمپلنت"
            onClick={() => onNavigate('implant')}
            extraAction={
              <FramerTooltip content="پذیرش سریع بیمار جدید بدون خروج از داشبورد" position="top">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    impactHeavy();
                    setQuickAdmissionOpen(true);
                  }}
                  className="quick-admission-btn py-1 px-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-[10px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                  title="پذیرش سریع بیمار (Quick Admission) بدون نیاز به باز کردن لیست کامل بیماران"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>پذیرش سریع (Quick Admission)</span>
                </button>
              </FramerTooltip>
            }
          />
        );

      case 'lab':
        return (
          <FolderCard
            title="لابراتوار پروتز"
            subtitle="ارسال و تحویل روکش"
            icon={<Logo3DLab size={46} />}
            badge={`${readyLabOrdersCount} آماده`}
            theme="purple"
            className="tile"
            actionTooltip="پیگیری سفارشات، مراحل ساخت روکش و شید رنگ ویتا"
            onClick={() => onNavigate('lab')}
            summaryWidget={
              <LabOrderStatusVisualizer
                orders={allLabOrders}
                onUpdateStatus={onUpdateLabStatus}
              />
            }
          />
        );

      case 'sayad_checks':
        return (
          <FolderCard
            title="چک صیادی"
            subtitle="استعلام و ثبت صیاد"
            icon={<Logo3DSayadCheck size={46} />}
            badge="۲ در جریان"
            theme="pink"
            className="tile"
            actionTooltip="استعلام ۱۶ رقمی، ثبت و پیگیری وصول چک‌های صیادی بنفش"
            onClick={() => onNavigate('financial')}
          />
        );

      case 'installments':
        return (
          <FolderCard
            title="اقساط و تسویه"
            subtitle="سررسید ماهانه بیماران"
            icon={<Logo3DInstallments size={46} />}
            badge="وصول به‌موقع"
            theme="amber"
            className="tile"
            actionTooltip="مشاهده جدول استهلاک اقساط، سررسید و تسویه‌حساب"
            onClick={() => onNavigate('financial')}
            summaryWidget={
              <div className="today-revenue-widget flex items-center justify-between p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-slate-800 text-[11px] font-bold">
                <div className="flex items-center gap-1.5 text-amber-900">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-700 stroke-[2.5]" />
                  <span className="text-[10px] font-black">درآمد کل امروز (Today's Total Revenue):</span>
                </div>
                <span className="font-mono font-black text-xs text-amber-950">
                  {formatToman(effectiveDailyRevenue)}
                </span>
              </div>
            }
          />
        );

      case 'ai_assistant':
        return (
          <FolderCard
            title="هوش مصنوعی"
            subtitle="تحلیل OPG و طرح درمان"
            icon={<Logo3DAiGemini size={46} />}
            badge="دستیار فعال"
            theme="gemini"
            className="tile"
            actionTooltip="دستیار هوشمند بالینی: تحلیل گرافی OPG و طرح درمان"
            onClick={() => onNavigate('ai_assistant')}
          />
        );

      case 'inventory':
        return (
          <FolderCard
            title="انبار و متریال"
            subtitle={lowStockCount > 0 ? `کسری: ${lowStockSummary}` : "کنترل موجودی و متریال"}
            icon={<Logo3DInventory size={46} />}
            badge={lowStockCount > 0 ? `${toPersianDigits(lowStockCount)} قلم کسری` : 'موجودی کامل'}
            badgeAlert={lowStockCount > 0}
            alertDot={lowStockCount > 0}
            theme="emerald"
            className="tile"
            actionTooltip="مدیریت انبار، هشدار کسری کالا و ردیابی بارکد TTAC"
            onClick={() => onNavigate('inventory')}
          />
        );

      case 'reminders':
        return (
          <FolderCard
            title="پیامک و یادآوری"
            subtitle="اطلاع‌رسانی خودکار"
            icon={<Logo3DReminders size={46} />}
            badge="ارسال خودکار"
            theme="rose"
            className="tile"
            actionTooltip="سامانه هوشمند پیامک، یادآوری نوبت و تبریک تولد"
            onClick={() => onNavigate('reminders')}
          />
        );

      case 'xrays':
        return (
          <FolderCard
            title="رادیولوژی"
            subtitle="آرشیو تصاویر فک و دندان"
            icon={<Logo3DXRay size={46} />}
            badge="PA & OPG"
            theme="teal"
            className="tile"
            actionTooltip="آرشیو رادیولوژی دیجیتال DICOM، سنسور RVG و OPG"
            onClick={() => onNavigate('xrays')}
          />
        );

      case 'marketing':
        return (
          <FolderCard
            title="تبلیغات و کمپین‌ها"
            subtitle="جشنواره‌ها، تولد و باشگاه مشتریان"
            icon={<Logo3DMarketing size={46} />}
            badge="۳ کمپین فعال"
            theme="pink"
            className="tile"
            actionTooltip="باشگاه مشتریان، کمپین‌های درمانی و تخفیف‌های مطب"
            onClick={() => onNavigate('marketing')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`dashboard-view ${isLoaded ? 'is-loaded' : 'is-loading'} w-full pb-16 pt-0 space-y-2.5 select-none px-1 sm:px-1.5`}>
      
      {/* 
        0. Persistent Search-As-You-Type Patient Filter:
        Instant search by name, file number, phone, and 1-tap quick filter chips
      */}
      <DashboardPatientSearch
        patients={patients}
        onSelectPatient={(p) => {
          if (onSelectPatient) {
            onSelectPatient(p);
          } else {
            onNavigate('patients');
          }
        }}
        onOpenPalmerChart={(p) => {
          if (onOpenPalmerForPatient) {
            onOpenPalmerForPatient(p);
          } else {
            onOpenPalmerChart();
          }
        }}
        onOpenAppointment={(p) => {
          if (onOpenAppointmentForPatient) {
            onOpenAppointmentForPatient(p);
          } else {
            onNavigate('appointments');
          }
        }}
        onQuickAdmission={onQuickAdmission}
      />
      
      {/* 
        1. 100% Practical Clinic Command Center:
        Compact height embedding live doctor unit, today revenue, 
        live clinical metrics, and instant action triggers.
      */}
      <ClinicHeroCard
        onQuickAdmission={onQuickAdmission}
        onOpenPalmerChart={onOpenPalmerChart}
        onOpenAppointments={() => onNavigate('appointments')}
        onOpenFinancial={() => onNavigate('financial')}
        onOpenSupabaseTest={onOpenSupabaseTest}
        onOpenPhaseAudit={onOpenPhaseAudit}
        onOpenShiftSettings={() => onNavigate('settings')}
        todayAppointmentsCount={todayAppointmentsCount}
        activeSurgeriesCount={activeSurgeriesCount}
        readyLabOrdersCount={readyLabOrdersCount}
        dailyRevenue={dailyRevenue}
      />

      {/* 
        2. بخش دسترسی سریع (Quick Access Section):
        Direct 1-tap rapid actions:
        1. نوبت‌دهی (Appointments)
        2. تشکیل پرونده (New Patient File / Admission)
        3. مالی (Financial / Invoices)
        4. لابراتوار (Dental Prosthetics Lab)
        5. ایمپلنت (Implant Operations)
        6. تقویم (Calendar / Schedule)
      */}
      <div className="w-full bg-white/95 backdrop-blur-md rounded-[20px] p-2 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-[11px] font-black text-slate-800 tracking-tight">دسترسی سریع</span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
          {/* 1. نوبت‌دهی */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('appointments');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-amber-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="نوبت‌دهی سریع بیماران"
          >
            <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Clock className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">نوبت‌دهی</span>
          </button>

          {/* 2. تشکیل پرونده */}
          <button
            onClick={() => {
              impactHeavy();
              onQuickAdmission();
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 group active:scale-95 transition-all shadow-xs"
            title="تشکیل پرونده و پذیرش بیمار جدید"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <UserPlus className="w-3.5 h-3.5 stroke-[2.8]" />
            </div>
            <span className="text-[8.5px] font-black text-white leading-none truncate max-w-full">تشکیل پرونده</span>
          </button>

          {/* 3. مالی */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('financial');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-pink-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="امور مالی، چک صیادی و اقساط"
          >
            <div className="w-6 h-6 rounded-full bg-pink-500/15 text-pink-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <CreditCard className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">مالی</span>
          </button>

          {/* 4. لابراتوار */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('lab');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-purple-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="سفارشات و وضعیت لابراتوار پروتز"
          >
            <div className="w-6 h-6 rounded-full bg-purple-500/15 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <FlaskConical className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">لابراتوار</span>
          </button>

          {/* 5. ایمپلنت */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('implant');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-sky-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="جراحی‌ها و مراحل کاشت ایمپلنت"
          >
            <div className="w-6 h-6 rounded-full bg-sky-500/15 text-sky-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Activity className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">ایمپلنت</span>
          </button>

          {/* 6. تقویم */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('appointments');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-indigo-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="تقویم شمسی و زمان‌بندی یونیت‌ها"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">تقویم</span>
          </button>
        </div>

        {/* Second Row: Advanced World-Class Modules */}
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 mt-1.5 pt-1.5 border-t border-slate-100">
          {/* 1. استریلیزاسیون */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('sterilization');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-teal-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="لاگ اتوکلاو و بارکد پک‌های استریل"
          >
            <div className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">استریلیزاسیون</span>
          </button>

          {/* 2. بیمه و تعرفه */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('insurance');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-cyan-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="محاسبه سهم بیمه پایه، تکمیلی و تعرفه سلامت"
          >
            <div className="w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">بیمه و تعرفه</span>
          </button>

          {/* 3. هوش مصنوعی */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('ai_assistant');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-purple-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="دستیار هوشمند طرح درمان و تحلیل OPG"
          >
            <div className="w-6 h-6 rounded-full bg-purple-500/15 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Sparkles className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">هوش مصنوعی</span>
          </button>

          {/* 4. نوبت‌دهی آنلاین */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('online_booking');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-emerald-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="پورتال رزرو نوبت و بیعانه آنلاین بیمار"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Globe className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">رزرو اینترنتی</span>
          </button>

          {/* 5. پنل پیامک و مپ */}
          <button
            onClick={() => {
              impactLight();
              onNavigate('sms_gateway');
            }}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[13px] bg-slate-50 hover:bg-sky-50 text-slate-800 border border-slate-200/80 group active:scale-95 transition-all shadow-2xs"
            title="تنظیمات سامانه پیامک و لینک‌های نقشه"
          >
            <div className="w-6 h-6 rounded-full bg-sky-500/15 text-sky-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-3 h-3 stroke-[2.4]" />
            </div>
            <span className="text-[8.5px] font-bold text-slate-700 leading-none truncate max-w-full">پنل پیامک</span>
          </button>
        </div>
      </div>

      {/* Real-Time Urgent Clinic Alarms Center (Lab Work, Checks, Installments) */}
      <ClinicUrgentAlarmsBanner
        patients={patients}
        appointments={appointments}
        onOpenPatientFile={(p, tab) => onSelectPatient?.(p)}
        onNavigate={onNavigate}
        onOpenLabSlip={onOpenLabSlip}
      />

      {/* Lab Order Pipeline Funnel Chart Widget (Recharts) */}
      <LabPipelineFunnelWidget
        patients={patients}
        onNavigate={onNavigate}
      />

      {/* Visual Low Stock Warning Indicator Banner on Dashboard */}
      {lowStockCount > 0 && (
        <div 
          onClick={() => {
            impactLight();
            onNavigate('inventory');
          }}
          className="w-full p-2.5 rounded-[18px] bg-gradient-to-r from-rose-50 via-rose-100/70 to-red-50 border border-rose-300/90 text-rose-950 flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-all shadow-2xs group"
          title="مشاهده و تامین اقلام دارای کسری موجودی"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
              <span className="text-[11px] font-black leading-tight">
                هشدار کسری انبار: {toPersianDigits(lowStockCount)} قلم کالا زیر حد نصاب موجودی!
              </span>
              {lowStockSummary && (
                <span className="text-[10px] text-rose-700/80 font-medium truncate max-w-[200px]">
                  ({lowStockSummary})
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] font-black text-rose-700 bg-white/90 px-2 py-0.5 rounded-lg border border-rose-200 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
            بررسی کسری‌ها
          </span>
        </div>
      )}

      {/* 
        3. Q-Bank Notched Module Cards Grid with Drag-and-Drop Reordering:
        - CSS Selector: .dashboard-view .grid
        - Features Reorder.Group from motion/react
        - Persisted to localStorage
        - Empty State placeholder with 'Reset to Default Layout' button
      */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-1 pt-1 pb-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-[11px] font-black text-slate-800">ماژول‌های کلینیک</span>
          <span className="text-[9.5px] font-bold text-slate-400 font-mono">
            ({toPersianDigits(tileOrder.length)} ماژول)
          </span>
        </div>
        
        <div className="flex items-center gap-1 flex-wrap">
          {/* Customization & Clear tools with FramerTooltip */}
          <FramerTooltip content={isCustomizing ? 'خروج از حالت ویرایش و تثبیت چیدمان' : 'شخصی‌سازی و جابجایی ترتیب کاشی‌ها'} position="bottom">
            <button
              type="button"
              onClick={() => {
                selection();
                setIsCustomizing(!isCustomizing);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                isCustomizing
                  ? 'bg-purple-100 border-purple-300 text-purple-900 shadow-2xs'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 text-purple-600" />
              <span>{isCustomizing ? 'اتمام شخصی‌سازی' : 'شخصی‌سازی'}</span>
            </button>
          </FramerTooltip>

          {isCustomizing && tileOrder.length > 0 && (
            <FramerTooltip content="پاکسازی تمام کاشی‌ها جهت تست حالت خالی" position="bottom">
              <button
                type="button"
                onClick={handleClearAllTiles}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>پاکسازی همه</span>
              </button>
            </FramerTooltip>
          )}

          {tileOrder.length < DEFAULT_TILE_IDS.length && (
            <FramerTooltip content="بازگرداندن تمام کاشی‌های پیش‌فرض کلینیک" position="bottom">
              <button
                type="button"
                onClick={handleResetLayout}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-all flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-emerald-600" />
                <span>بازنشانی</span>
              </button>
            </FramerTooltip>
          )}

          {/* Layout Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
            <FramerTooltip content="نمایش کشیده و یکپارچه کاشی‌های تمام‌عرض" position="bottom">
              <button
                type="button"
                onClick={() => {
                  selection();
                  setCardLayout('full');
                }}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  cardLayout === 'full' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                تمام‌عرض
              </button>
            </FramerTooltip>
            <FramerTooltip content="نمایش فشرده دو ستونه کاشی‌های کیوبانک" position="bottom">
              <button
                type="button"
                onClick={() => {
                  selection();
                  setCardLayout('grid');
                }}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  cardLayout === 'grid' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ۲ ستونه
              </button>
            </FramerTooltip>
          </div>
        </div>
      </div>

      {/* 
        The main grid container: matches CSS selector .dashboard-view .grid
        Uses Reorder.Group for drag-and-drop reordering with persistence,
        and renders DashboardEmptyState when all tiles are cleared.
      */}
      {/* 
        The main grid container: matches CSS selector .dashboard-view .grid
        In standard browsing mode: renders native HTML div grid (100% stable, zero layout shift, smooth vertical scrolling).
        In customize mode: enables Reorder.Group with deliberate drag handles.
      */}
      {isCustomizing ? (
        <Reorder.Group
          as="div"
          axis={cardLayout === 'full' ? 'y' : undefined}
          values={tileOrder}
          onReorder={handleReorder}
          className={`grid ${cardLayout === 'full' ? 'grid-cols-1 gap-2.5' : 'grid-cols-2 gap-1.5 sm:gap-2'} w-full`}
        >
          {tileOrder.length === 0 ? (
            <DashboardEmptyState onResetLayout={handleResetLayout} />
          ) : (
            tileOrder.map((tileId) => (
              <Reorder.Item
                as="div"
                key={tileId}
                value={tileId}
                className="tile relative select-none group/reorder touch-none cursor-grab active:cursor-grabbing ring-2 ring-purple-400/60 rounded-3xl"
                whileDrag={{ scale: 1.02, zIndex: 40, opacity: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              >
                {/* Overlay controls in customize mode */}
                <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl border border-purple-200 shadow-md animate-in fade-in zoom-in-95">
                  <div className="cursor-grab active:cursor-grabbing text-purple-700 p-0.5 flex items-center gap-1 text-[10px] font-bold" title="بکشید برای جابجایی">
                    <GripVertical className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>جابجایی</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTile(tileId);
                    }}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف این کاشی"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {renderTileContent(tileId)}
              </Reorder.Item>
            ))
          )}
        </Reorder.Group>
      ) : (
        <div className={`grid ${cardLayout === 'full' ? 'grid-cols-1 gap-2.5' : 'grid-cols-2 gap-1.5 sm:gap-2'} w-full`}>
          {tileOrder.length === 0 ? (
            <DashboardEmptyState onResetLayout={handleResetLayout} />
          ) : (
            tileOrder.map((tileId) => (
              <div key={tileId} className="tile relative select-none">
                {renderTileContent(tileId)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Rapid Quick Admission Modal triggered directly from the tile */}
      <QuickAdmissionModal
        isOpen={quickAdmissionOpen}
        onClose={() => setQuickAdmissionOpen(false)}
        onPatientAdmitted={(newPatient) => {
          if (onAddNewPatient) {
            onAddNewPatient(newPatient);
          }
          setQuickAdmissionOpen(false);
        }}
        onOpenPalmerChart={(patient) => {
          setQuickAdmissionOpen(false);
          if (onOpenPalmerForPatient) {
            onOpenPalmerForPatient(patient);
          } else {
            onOpenPalmerChart();
          }
        }}
      />

    </div>
  );
};
