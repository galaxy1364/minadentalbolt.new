import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, X, User, Phone, Layers, Calendar, 
  CreditCard, FlaskConical, Activity, Sparkles, 
  Settings, Camera, ShieldCheck, FileCheck2, 
  Package, BellRing, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { Patient } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onSelectPatient: (p: Patient) => void;
  onOpenPalmerChart: (p: Patient) => void;
  onNavigate: (viewId: string) => void;
  onQuickAdmission: () => void;
  onOpenPaymentModal: () => void;
  onOpenClinicalHud: () => void;
  onOpenAccessibility: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'بیمار' | 'ماژول' | 'عملیات بالینی';
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

function normalize(str: string): string {
  if (!str) return '';
  const map: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    'ي': 'ی', 'ك': 'ک', 'آ': 'ا', 'إ': 'ا', 'أ': 'ا',
    'ة': 'ه', 'ئ': 'ی', 'ء': ''
  };
  return str.toLowerCase().replace(/[۰-۹يكآإأةئء]/g, ch => map[ch] ?? ch).replace(/[-_/\s]/g, '').trim();
}

export const GlobalCommandPalette: React.FC<GlobalCommandPaletteProps> = ({
  isOpen,
  onClose,
  patients,
  onSelectPatient,
  onOpenPalmerChart,
  onNavigate,
  onQuickAdmission,
  onOpenPaymentModal,
  onOpenClinicalHud,
  onOpenAccessibility
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selection, impactLight } = useHapticFeedback();

  // Reset query and focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static module items
  const moduleItems: CommandItem[] = useMemo(() => [
    {
      id: 'cmd-hud',
      title: 'کنسول بالینی شناور (Clinical HUD)',
      category: 'عملیات بالینی',
      subtitle: 'تلمتری آلرژی، درمان و کارهای لابراتوار',
      icon: <Activity className="w-4 h-4 text-teal-400" />,
      action: onOpenClinicalHud
    },
    {
      id: 'cmd-admission',
      title: 'پذیرش فوری و تشکیل پرونده',
      category: 'عملیات بالینی',
      subtitle: 'ثبت سریع اطلاعات بیمار و کاردکس',
      icon: <User className="w-4 h-4 text-sky-400" />,
      action: onQuickAdmission
    },
    {
      id: 'cmd-payment',
      title: 'ثبت دریافت وجه و فیش POS',
      category: 'عملیات بالینی',
      subtitle: 'دستگاه کارتخوان و تسویه درمان',
      icon: <CreditCard className="w-4 h-4 text-amber-400" />,
      action: onOpenPaymentModal
    },
    {
      id: 'cmd-implant',
      title: 'ماژول کاشت ایمپلنت',
      category: 'ماژول',
      subtitle: 'مراحل جراحی، فیکسچر، هیلینگ و اباتمنت',
      icon: <Activity className="w-4 h-4 text-cyan-400" />,
      action: () => onNavigate('implant')
    },
    {
      id: 'cmd-lab',
      title: 'لابراتوار پروتز و روکش',
      category: 'ماژول',
      subtitle: 'ارسال قالب، زیرکونیا، PFM و تحویل',
      icon: <FlaskConical className="w-4 h-4 text-purple-400" />,
      action: () => onNavigate('lab')
    },
    {
      id: 'cmd-sterilization',
      title: 'استریلیزاسیون و اتوکلاو',
      category: 'ماژول',
      subtitle: 'پک‌های استریل، لاگ سیکل و بارکد چسبی',
      icon: <ShieldCheck className="w-4 h-4 text-teal-400" />,
      action: () => onNavigate('sterilization')
    },
    {
      id: 'cmd-insurance',
      title: 'بیمه پایه و تعرفه‌های درمانی',
      category: 'ماژول',
      subtitle: 'تامین اجتماعی، سلامت، بیمه تکمیلی',
      icon: <FileCheck2 className="w-4 h-4 text-blue-400" />,
      action: () => onNavigate('insurance_claims')
    },
    {
      id: 'cmd-xrays',
      title: 'رادیولوژی و تصاویر OPG / PA',
      category: 'ماژول',
      subtitle: 'آرشیو تصاویر فک و دندان و هوش مصنوعی',
      icon: <Camera className="w-4 h-4 text-teal-400" />,
      action: () => onNavigate('xrays')
    },
    {
      id: 'cmd-financial',
      title: 'مدیریت مالی، چک صیادی و اقساط',
      category: 'ماژول',
      subtitle: 'ثبت چک، استعلام، سررسید و تسویه',
      icon: <CreditCard className="w-4 h-4 text-pink-400" />,
      action: () => onNavigate('financial')
    },
    {
      id: 'cmd-appointments',
      title: 'نوبت‌دهی تقویم ایرانی',
      category: 'ماژول',
      subtitle: 'مدیریت یونیت‌ها، پزشکان و نوبت بیماران',
      icon: <Calendar className="w-4 h-4 text-blue-400" />,
      action: () => onNavigate('appointments')
    },
    {
      id: 'cmd-inventory',
      title: 'انبارداری و کنترل متریال',
      category: 'ماژول',
      subtitle: 'کنترل موجودی، هشدار کسری و بارکدخوان',
      icon: <Package className="w-4 h-4 text-emerald-400" />,
      action: () => onNavigate('inventory')
    },
    {
      id: 'cmd-reminders',
      title: 'سامانه پیامک و یادآوری',
      category: 'ماژول',
      subtitle: 'ارسال خودکار پیامک نوبت، چک و تبریک',
      icon: <BellRing className="w-4 h-4 text-rose-400" />,
      action: () => onNavigate('reminders')
    },
    {
      id: 'cmd-accessibility',
      title: 'دسترسی‌پذیری، کنتراست چراغ و سایز قلم',
      category: 'عملیات بالینی',
      subtitle: 'حالت تاریک جراحی، حالت دستکش و کنتراست بالا',
      icon: <Settings className="w-4 h-4 text-yellow-400" />,
      action: onOpenAccessibility
    }
  ], [onOpenClinicalHud, onQuickAdmission, onOpenPaymentModal, onNavigate, onOpenAccessibility]);

  // Filter commands and patients based on query
  const filteredItems = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      return moduleItems.slice(0, 8);
    }

    // 1. Matched patients
    const patientMatches: CommandItem[] = patients
      .filter(p => {
        const nName = normalize(p.fullName);
        const nFile = normalize(p.fileNumber);
        const nPhone = normalize(p.phone);
        return nName.includes(q) || nFile.includes(q) || nPhone.includes(q);
      })
      .slice(0, 6)
      .map(p => ({
        id: `pat-${p.id}`,
        title: p.fullName,
        category: 'بیمار' as const,
        subtitle: `پرونده: ${toPersianDigits(p.fileNumber)} · ${toPersianDigits(p.phone)} · مانده: ${formatToman(Math.abs(p.balance))}`,
        icon: <User className="w-4 h-4 text-emerald-400" />,
        action: () => onSelectPatient(p)
      }));

    // 2. Matched modules/actions
    const actionMatches = moduleItems.filter(m => {
      const nTitle = normalize(m.title);
      const nSub = normalize(m.subtitle || '');
      return nTitle.includes(q) || nSub.includes(q);
    });

    return [...patientMatches, ...actionMatches];
  }, [query, patients, moduleItems, onSelectPatient]);

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selection();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selection();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        impactLight();
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/65 backdrop-blur-sm select-none animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="فرمان صوتی و جستجوی جامع مینادنتال"
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-white"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-emerald-400 ml-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="جستجوی همه‌جانبه بیمار، ماژول، درمان، یا فرمان (مثلاً: محمدی، ایمپلنت، چک)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => {
                impactLight();
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 font-mono shrink-0 mr-1">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              موردی مطابق با «{query}» یافت نشد.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    impactLight();
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-slate-800 border border-slate-600 shadow-md text-white' 
                      : 'hover:bg-slate-850/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black truncate">{item.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <span className="text-[10.5px] text-slate-400 font-medium block truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-slate-500">
                    {isSelected && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-bold">
                        <span>انتخاب</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ برای جابجایی</span>
            <span>↵ برای باز کردن</span>
          </div>
          <span>میانبر کیبورد: Cmd + K / Ctrl + K</span>
        </div>

      </div>
    </div>
  );
};
