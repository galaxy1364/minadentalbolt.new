import React, { useState, useEffect } from 'react';
import { 
  X, Eye, Sun, Moon, Sparkles, Volume2, VolumeX, 
  HandMetal, Check, RefreshCw, ShieldCheck, Type, Contrast
} from 'lucide-react';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { setAcousticFeedbackEnabled, getAcousticFeedbackEnabled } from '../utils/haptics';
import { autoSaveManager } from '../utils/autoSaveManager';

export type DisplayTheme = 'light' | 'dark' | 'high-contrast';
export type FontScale = 'normal' | 'large' | 'xlarge';

interface AccessibilityControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange?: (theme: DisplayTheme) => void;
  onFontScaleChange?: (scale: FontScale) => void;
  onGloveModeToggle?: (enabled: boolean) => void;
}

export const AccessibilityControlsModal: React.FC<AccessibilityControlsModalProps> = ({
  isOpen,
  onClose,
  onThemeChange,
  onFontScaleChange,
  onGloveModeToggle
}) => {
  const { impactLight, selection } = useHapticFeedback();

  const [theme, setTheme] = useState<DisplayTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('minadental_theme') as DisplayTheme) || 'light';
    }
    return 'light';
  });

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('minadental_font_scale') as FontScale) || 'normal';
    }
    return 'normal';
  });

  const [gloveMode, setGloveMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('minadental_glove_mode') === 'true';
    }
    return false;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(getAcousticFeedbackEnabled());
  const [draftsCount, setDraftsCount] = useState<number>(0);

  useEffect(() => {
    setDraftsCount(autoSaveManager.getAllDrafts().length);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSetTheme = (newTheme: DisplayTheme) => {
    selection();
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('minadental_theme', newTheme);
      document.documentElement.classList.remove('theme-dark', 'theme-high-contrast');
      if (newTheme === 'dark') document.documentElement.classList.add('theme-dark');
      if (newTheme === 'high-contrast') document.documentElement.classList.add('theme-high-contrast');
    }
    onThemeChange?.(newTheme);
  };

  const handleSetFontScale = (scale: FontScale) => {
    selection();
    setFontScale(scale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('minadental_font_scale', scale);
      document.documentElement.classList.remove('font-scale-large', 'font-scale-xlarge');
      if (scale === 'large') document.documentElement.classList.add('font-scale-large');
      if (scale === 'xlarge') document.documentElement.classList.add('font-scale-xlarge');
    }
    onFontScaleChange?.(scale);
  };

  const handleToggleGloveMode = () => {
    impactLight();
    const next = !gloveMode;
    setGloveMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('minadental_glove_mode', next ? 'true' : 'false');
      if (next) document.documentElement.classList.add('glove-mode');
      else document.documentElement.classList.remove('glove-mode');
    }
    onGloveModeToggle?.(next);
  };

  const handleToggleSound = () => {
    impactLight();
    const next = !soundEnabled;
    setSoundEnabled(next);
    setAcousticFeedbackEnabled(next);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="تنظیمات دسترسی‌پذیری و ارگونومی بالینی"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col gap-4 overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/15 text-teal-700 flex items-center justify-center">
              <Eye className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">دسترسی‌پذیری و ارگونومی مطب</h3>
              <p className="text-[11px] text-slate-500">کنتراست چراغ جراحی، سایز متون و لمس دستکش</p>
            </div>
          </div>
          <button
            onClick={() => {
              impactLight();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-95 transition-all"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Theme Mode: Light / Dark / Surgical High-Contrast */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <Contrast className="w-3.5 h-3.5 text-teal-600" />
            حالت نوری صفحه (نمایشگر بالای یونیت)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Light */}
            <button
              onClick={() => handleSetTheme('light')}
              className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 transition-all ${
                theme === 'light'
                  ? 'border-teal-500 bg-teal-50 text-teal-900 font-black shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-[11px]">روز استاندارد</span>
            </button>

            {/* Dark Surgical */}
            <button
              onClick={() => handleSetTheme('dark')}
              className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 transition-all ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-slate-900 text-white font-black shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px]">تاریک جراحی</span>
            </button>

            {/* Surgical Anti-Glare High-Contrast */}
            <button
              onClick={() => handleSetTheme('high-contrast')}
              className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 transition-all ${
                theme === 'high-contrast'
                  ? 'border-black bg-black text-[#c8ff00] font-black shadow-md'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-[11px]">ضد انعکاس چراغ</span>
            </button>
          </div>
        </div>

        {/* 2. Dynamic Type Scale Control */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-teal-600" />
            سایز متون و ارقام (خوانایی از فاصله دور)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSetFontScale('normal')}
              className={`py-2 px-3 rounded-2xl border text-center active:scale-95 transition-all ${
                fontScale === 'normal'
                  ? 'border-teal-500 bg-teal-50 text-teal-900 font-black shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-xs block">استاندارد (۱۰۰٪)</span>
            </button>

            <button
              onClick={() => handleSetFontScale('large')}
              className={`py-2 px-3 rounded-2xl border text-center active:scale-95 transition-all ${
                fontScale === 'large'
                  ? 'border-teal-500 bg-teal-50 text-teal-900 font-black shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-xs font-bold block">بزرگ (۱۱۵٪)</span>
            </button>

            <button
              onClick={() => handleSetFontScale('xlarge')}
              className={`py-2 px-3 rounded-2xl border text-center active:scale-95 transition-all ${
                fontScale === 'xlarge'
                  ? 'border-teal-500 bg-teal-50 text-teal-900 font-black shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-xs font-black block">فوق‌بزرگ (۱۳۰٪)</span>
            </button>
          </div>
        </div>

        {/* 3. Toggles: Glove Touch Mode & Acoustic Sensory Click */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          {/* Sterile Glove Touch Friendly Mode */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-sky-500/15 text-sky-700 flex items-center justify-center">
                <HandMetal className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">ارگونومی لمس با دستکش</span>
                <span className="text-[10px] text-slate-500 block">بزرگ‌نمایی دکمه‌ها و اهداف کلیک به ۴۸px+</span>
              </div>
            </div>
            <button
              onClick={handleToggleGloveMode}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${gloveMode ? 'bg-sky-600' : 'bg-slate-300'}`}
              aria-label="تغییر حالت دستکش"
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${gloveMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Subtle Acoustic Sensory Feedback */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-700 flex items-center justify-center">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">صدای کلیک حسی ملایم</span>
                <span className="text-[10px] text-slate-500 block">فیدبک صوتی آرام همراه با لرزش هپتیک</span>
              </div>
            </div>
            <button
              onClick={handleToggleSound}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${soundEnabled ? 'bg-purple-600' : 'bg-slate-300'}`}
              aria-label="تغییر صدای کلیک"
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* 4. Zero-Data-Loss Crash Protection Badge */}
        <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block">محافظت خودکار در برابر قطعی و کرش</span>
              <span className="text-[10px] text-emerald-700">پیش‌نویس‌ها در حافظه محلی ایمن نگهداری می‌شوند</span>
            </div>
          </div>
          <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
            فعال
          </span>
        </div>

        {/* Footer Close */}
        <button
          onClick={() => {
            impactLight();
            onClose();
          }}
          className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs active:scale-95 transition-all shadow-md"
        >
          ذخیره و اعمال تنظیمات
        </button>

      </div>
    </div>
  );
};
