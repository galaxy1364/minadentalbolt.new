import React, { useState, useEffect } from 'react';
import { 
  Bell, Cloud, RefreshCw, Wifi, WifiOff, ChevronRight, Database, PhoneIncoming,
  Eye, Activity, Search, ShieldCheck, User
} from 'lucide-react';
import { UserAccount } from '../types/dental';
import { toPersianDigits } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { Logo3DMainDentalTooth } from './ThreeDimensionalLogos';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  currentUser?: UserAccount;
  unreadRemindersCount?: number;
  onBack?: () => void;
  onOpenProfile?: () => void;
  onOpenReminders?: () => void;
  onTriggerSync?: () => Promise<boolean>;
  onOpenSupabaseTest?: () => void;
  onSimulateIncomingCall?: () => void;
  onOpenAccessibility?: () => void;
  onOpenClinicalHud?: () => void;
  onOpenSearch?: () => void;
  onOpenPhaseAudit?: () => void;
  onOpenProjectDownload?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  currentUser,
  unreadRemindersCount = 2,
  onBack,
  onOpenProfile,
  onOpenReminders,
  onTriggerSync,
  onOpenSupabaseTest,
  onSimulateIncomingCall,
  onOpenAccessibility,
  onOpenClinicalHud,
  onOpenSearch,
  onOpenPhaseAudit,
  onOpenProjectDownload
}) => {
  const { impactLight, impactMedium, selection } = useHapticFeedback();

  // Live clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [toolsMenuOpen, setToolsMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      setCurrentTime(timeStr);
    };

    updateClock();
    const clockTimer = setInterval(updateClock, 1000);

    // Online / Offline listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(clockTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      if (!isOnline) {
        throw new Error('دستگاه به اینترنت متصل نیست');
      }

      let success = true;
      if (onTriggerSync) {
        success = await onTriggerSync();
      } else {
        await new Promise(res => setTimeout(res, 800));
      }

      if (success) {
        setSyncStatus('success');
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3500);
    }
  };

  return (
    <header className="relative w-full px-2.5 py-2 flex items-center justify-between z-30 select-none border-b border-slate-200/80 bg-white/95 backdrop-blur-md text-slate-800">
      
      {/* Right Side (RTL Start): Logo + MinaDental Title + Compact User Avatar */}
      <div className="flex items-center gap-1.5 shrink-0 min-w-0">
        {showBack && (
          <button
            onClick={() => {
              impactLight();
              onBack?.();
            }}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer"
            aria-label="بازگشت"
            title="بازگشت به داشبورد"
          >
            <ChevronRight className="w-4 h-4 text-slate-700" />
          </button>
        )}

        {/* Dental Tooth Logo Mark - Realistic 3D Embossed Multi-Color Tooth */}
        <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-cyan-500/15 border border-purple-300/60 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
          <Logo3DMainDentalTooth size={30} />
        </div>

        {/* App Title */}
        <span className="text-sm font-black text-slate-900 tracking-tight shrink-0">
          مینادنتال
        </span>

        {/* User Account Avatar Button: 1-click profile view, switch user, logout, add user */}
        {currentUser && (
          <button
            onClick={() => {
              selection();
              onOpenProfile?.();
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200/90 text-purple-900 active:scale-95 transition-all shadow-2xs shrink-0 cursor-pointer"
            title={`کاربر: ${currentUser.fullName} (${currentUser.role}) · کلیک برای پروفایل، سوئیچ یا خروج`}
          >
            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[9px] shadow-2xs shrink-0">
              <User className="w-3 h-3 stroke-[2.6]" />
            </div>
            <span className="text-[10px] font-black truncate max-w-[70px] hidden xs:inline text-purple-950">
              {currentUser.fullName.split(' ')[0]}
            </span>
          </button>
        )}

        {/* Active View Badge (Crisp, Non-intrusive) */}
        {title && (
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 truncate max-w-[90px] hidden sm:inline">
            {title}
          </span>
        )}
      </div>

      {/* Left Side: Live Clock + Cloud Sync + Notification Bell + Consolidated Tools Menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        
        {/* Live Clock Pill */}
        <div className="text-[11px] font-bold text-slate-700 font-mono tracking-tight px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 shrink-0">
          {currentTime || '۱۲:۰۰'}
        </div>

        {/* Cloud Sync Refresh Pill */}
        <button
          onClick={() => {
            impactMedium();
            handleManualSync();
          }}
          disabled={isSyncing}
          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer ${
            syncStatus === 'error'
              ? 'bg-red-50 border-red-300 text-red-600'
              : syncStatus === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
              : 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
          title={isOnline ? 'ابری: متصل (کلیک برای همگام‌سازی)' : 'آفلاین - ذخیره محلی'}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : isOnline ? (
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          )}
        </button>

        {/* Colorful Reminder Bell with Realistic Left-to-Right Pendulum Swing */}
        <button
          onClick={() => {
            impactLight();
            onOpenReminders?.();
          }}
          className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-[1.5px] hover:scale-105 active:scale-90 transition-all shrink-0 shadow-sm shadow-purple-500/25 cursor-pointer"
          title="مرکز یادآوری‌ها و هشدارها"
          aria-label="نوتیفیکیشن‌ها و یادآوری‌ها"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-amber-300">
            <Bell className={`w-4 h-4 stroke-[2.4] text-amber-300 ${unreadRemindersCount > 0 ? 'animate-bell-ring' : 'hover:rotate-12 transition-transform'}`} />
          </div>
          {unreadRemindersCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-rose-600 text-white font-black text-[8.5px] rounded-full flex items-center justify-center border-2 border-white font-mono shadow-md animate-pulse">
              {toPersianDigits(unreadRemindersCount)}
            </span>
          )}
        </button>

        {/* Consolidated System Tools Popover Trigger (Clean & Responsive for all Screen Sizes) */}
        <div className="relative">
          <button
            onClick={() => {
              selection();
              setToolsMenuOpen(!toolsMenuOpen);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer shadow-2xs ${
              toolsMenuOpen
                ? 'bg-purple-600 border-purple-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="ابزارهای مهندسی و بالینی کلینیک"
            aria-label="منوی ابزارهای پیشرفته"
          >
            <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          {/* Tools Glass Popover Dropdown */}
          {toolsMenuOpen && (
            <>
              {/* Invisible Backdrop to dismiss */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setToolsMenuOpen(false)}
              />

              <div className="absolute left-0 top-10 z-50 w-64 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 space-y-1 text-slate-800">
                <div className="px-2 py-1 text-[10px] font-black text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>ابزارهای پیشرفته و تست بالینی</span>
                  <span className="text-[9px] text-purple-600 font-mono">v3.8</span>
                </div>

                {/* 1. Global Patient Search */}
                <button
                  onClick={() => {
                    impactLight();
                    setToolsMenuOpen(false);
                    if (onOpenSearch) onOpenSearch();
                    else window.dispatchEvent(new CustomEvent('minadental:focus-patient-search'));
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-100 text-slate-700 transition-colors text-right"
                >
                  <Search className="w-3.5 h-3.5 text-emerald-600 stroke-[2.4]" />
                  <span>جستجوی بلادرنگ پرونده بیمار</span>
                </button>

                {/* 2. Supabase Cloud DB Test */}
                <button
                  onClick={() => {
                    impactLight();
                    setToolsMenuOpen(false);
                    onOpenSupabaseTest?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-50 text-emerald-800 transition-colors text-right"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>اتصال و تست زنده دیتابیس سوپابیس</span>
                </button>

                {/* 3. Phase Audit Tests */}
                {onOpenPhaseAudit && (
                  <button
                    onClick={() => {
                      impactLight();
                      setToolsMenuOpen(false);
                      onOpenPhaseAudit();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-purple-50 text-purple-800 transition-colors text-right"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 stroke-[2.5]" />
                    <span>آزمون ۶۲ گانه استانداردهای بالینی</span>
                  </button>
                )}

                {/* 4. Clinical Floating HUD */}
                {onOpenClinicalHud && (
                  <button
                    onClick={() => {
                      impactLight();
                      setToolsMenuOpen(false);
                      onOpenClinicalHud();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-teal-50 text-teal-800 transition-colors text-right"
                  >
                    <Activity className="w-3.5 h-3.5 text-teal-600 stroke-[2.4]" />
                    <span>کنسول بالینی شناور (Clinical HUD)</span>
                  </button>
                )}

                {/* 5. Incoming Call Simulator */}
                {onSimulateIncomingCall && (
                  <button
                    onClick={() => {
                      impactMedium();
                      setToolsMenuOpen(false);
                      onSimulateIncomingCall();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-sky-50 text-sky-800 transition-colors text-right"
                  >
                    <PhoneIncoming className="w-3.5 h-3.5 text-sky-600" />
                    <span>شبیه‌ساز تماس ورودی بیمار (Caller ID)</span>
                  </button>
                )}

                {/* 6. Accessibility & Contrast */}
                {onOpenAccessibility && (
                  <button
                    onClick={() => {
                      impactLight();
                      setToolsMenuOpen(false);
                      onOpenAccessibility();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-50 text-amber-800 transition-colors text-right"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>ارگونومی، کنتراست جراحی و سایز متون</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
