import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, X, User, Phone, FileText, Activity, 
  UserPlus, Sparkles, ChevronLeft, Calendar, 
  Layers, AlertCircle, CheckCircle2, ArrowUpRight,
  PhoneCall, Hash, Contact2, Filter
} from 'lucide-react';
import { Patient } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { triggerHaptic } from '../utils/haptics';

export interface DashboardPatientSearchProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onOpenPalmerChart?: (patient: Patient) => void;
  onOpenAppointment?: (patient: Patient) => void;
  onQuickAdmission?: (prefillQuery?: string) => void;
}

export type QuickFilter = 'all' | 'today' | 'debtors' | 'lab' | 'implant';
export type SearchScope = 'all' | 'name' | 'phone' | 'file';

/**
 * Normalizes Persian/Arabic characters and English/Persian digits for real-time fuzzy matching
 */
function normalizeQuery(str: string): string {
  if (!str) return '';
  const map: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    'ي': 'ی', 'ك': 'ک', 'آ': 'ا', 'إ': 'ا', 'أ': 'ا',
    'ة': 'ه', 'ئ': 'ی', 'ء': ''
  };
  return str
    .toLowerCase()
    .replace(/[۰-۹يكآإأةئء]/g, (ch) => map[ch] ?? ch)
    .replace(/[-_/\s]/g, '')
    .trim();
}

export const DashboardPatientSearch: React.FC<DashboardPatientSearchProps> = ({
  patients = [],
  onSelectPatient,
  onOpenPalmerChart,
  onOpenAppointment,
  onQuickAdmission,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K and custom focus event)
  useEffect(() => {
    const handleFocusSearch = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsFocused(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleFocusSearch();
      }
    };

    window.addEventListener('minadental:focus-patient-search', handleFocusSearch);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('minadental:focus-patient-search', handleFocusSearch);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Real-time filtering logic by name, phone number, or file number
  const filteredPatients = useMemo(() => {
    const normQ = normalizeQuery(query);

    return patients.filter((patient) => {
      // 1. Text Search Filtering (search-as-you-type)
      if (normQ.length > 0) {
        const normName = normalizeQuery(patient.fullName);
        const normFile = normalizeQuery(patient.fileNumber || '');
        const normPhone = normalizeQuery(patient.phone || '');
        const normNational = normalizeQuery(patient.nationalId || '');

        let matchesSearch = false;
        if (searchScope === 'name') {
          matchesSearch = normName.includes(normQ);
        } else if (searchScope === 'phone') {
          matchesSearch = normPhone.includes(normQ);
        } else if (searchScope === 'file') {
          matchesSearch = normFile.includes(normQ);
        } else {
          // 'all': matches name, phone, or file number (also fallback national ID)
          matchesSearch = 
            normName.includes(normQ) ||
            normPhone.includes(normQ) ||
            normFile.includes(normQ) ||
            normNational.includes(normQ);
        }

        if (!matchesSearch) return false;
      }

      // 2. Quick Category Filtering
      if (activeFilter === 'debtors') {
        return patient.balance < 0;
      }
      if (activeFilter === 'today') {
        return (
          patient.nextAppointment?.includes('۰۸/۱۵') ||
          patient.lastVisit?.includes('۰۸/۱۵')
        );
      }
      if (activeFilter === 'lab') {
        return Boolean(patient.labOrders && patient.labOrders.length > 0);
      }
      if (activeFilter === 'implant') {
        return Boolean(patient.implantCases && patient.implantCases.length > 0);
      }

      return true;
    });
  }, [patients, query, activeFilter, searchScope]);

  const handleClear = () => {
    triggerHaptic('light');
    setQuery('');
    setActiveFilter('all');
    inputRef.current?.focus();
  };

  const handlePatientClick = (patient: Patient) => {
    triggerHaptic('medium');
    setIsFocused(false);
    onSelectPatient(patient);
  };

  const handleFilterClick = (filter: QuickFilter) => {
    triggerHaptic('selection');
    if (activeFilter === filter && filter !== 'all') {
      setActiveFilter('all');
    } else {
      setActiveFilter(filter);
    }
    setIsFocused(true);
  };

  const handleScopeClick = (scope: SearchScope) => {
    triggerHaptic('selection');
    setSearchScope(scope);
    setIsFocused(true);
    inputRef.current?.focus();
  };

  const isDropdownOpen = isFocused && (query.trim().length > 0 || activeFilter !== 'all');

  return (
    <div ref={containerRef} className="relative w-full z-30 select-none">
      {/* Main Persistent Search Card - Patient Dashboard Header Search Bar */}
      <div className="w-full bg-white/95 backdrop-blur-md rounded-[22px] p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs transition-all duration-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
        
        {/* Input Bar with Embedded Quick Status */}
        <div className="relative flex items-center">
          {/* Search Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center justify-center">
            <Search className="w-4 h-4 text-emerald-600 stroke-[2.4]" />
          </div>

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => {
              triggerHaptic('light');
              setIsFocused(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsFocused(false);
              }
            }}
            placeholder={
              searchScope === 'name' ? 'فیلتر بر اساس نام بیمار (مثلاً: امیری، محمدی)...' :
              searchScope === 'phone' ? 'فیلتر بر اساس شماره تماس (مثلاً: ۰۹۱۲ یا ۹۸۷۶)...' :
              searchScope === 'file' ? 'فیلتر بر اساس شماره پرونده (مثلاً: ۱۰۲۴ یا ۵۶)...' :
              'جستجوی بلادرنگ بیمار بر اساس نام، شماره پرونده یا شماره تماس...'
            }
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-[13px] font-medium pr-9 pl-9 py-2 rounded-xl border border-slate-200/90 focus:border-emerald-500 focus:outline-none transition-all shadow-inner"
            dir="rtl"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Match counter badge when searching */}
          {query.trim().length > 0 && (
            <div className="absolute left-9 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-full font-mono border border-emerald-300">
                {toPersianDigits(filteredPatients.length)} پرونده
              </span>
            </div>
          )}

          {/* Clear Button */}
          {query.length > 0 && (
            <button
              onClick={handleClear}
              type="button"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors active:scale-95"
              title="پاک کردن جستجو"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Real-Time Filter Scope Selector Bar (Name / Phone / File Number / All) */}
        <div className="flex items-center gap-1 mt-1.5 pb-1 border-b border-slate-100 text-[10px]">
          <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-1 flex items-center gap-0.5">
            <Filter className="w-2.5 h-2.5" />
            فیلتر در:
          </span>

          {/* All Fields */}
          <button
            type="button"
            onClick={() => handleScopeClick('all')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all active:scale-95 ${
              searchScope === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه فیلدها
          </button>

          {/* By Name */}
          <button
            type="button"
            onClick={() => handleScopeClick('name')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all active:scale-95 flex items-center gap-0.5 ${
              searchScope === 'name'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100'
            }`}
          >
            <Contact2 className="w-2.5 h-2.5" />
            <span>نام بیمار</span>
          </button>

          {/* By Phone */}
          <button
            type="button"
            onClick={() => handleScopeClick('phone')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all active:scale-95 flex items-center gap-0.5 ${
              searchScope === 'phone'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-sky-50 text-sky-800 border border-sky-200/60 hover:bg-sky-100'
            }`}
          >
            <Phone className="w-2.5 h-2.5" />
            <span>شماره تماس</span>
          </button>

          {/* By File Number */}
          <button
            type="button"
            onClick={() => handleScopeClick('file')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all active:scale-95 flex items-center gap-0.5 ${
              searchScope === 'file'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200/60 hover:bg-purple-100'
            }`}
          >
            <Hash className="w-2.5 h-2.5" />
            <span>شماره پرونده</span>
          </button>
        </div>

        {/* Quick Filter Category Chips (1-tap access) */}
        <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar pt-0.5 text-[10.5px]">
          <button
            onClick={() => handleFilterClick('all')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all active:scale-95 ${
              activeFilter === 'all' && !query
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            کل پرونده‌ها ({toPersianDigits(patients.length)})
          </button>

          <button
            onClick={() => handleFilterClick('today')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1 ${
              activeFilter === 'today'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200/70 hover:bg-amber-100'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>نوبت امروز</span>
          </button>

          <button
            onClick={() => handleFilterClick('debtors')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1 ${
              activeFilter === 'debtors'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200/70 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>بدهکاران ({toPersianDigits(patients.filter(p => p.balance < 0).length)})</span>
          </button>

          <button
            onClick={() => handleFilterClick('lab')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1 ${
              activeFilter === 'lab'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-sky-50 text-sky-800 border border-sky-200/70 hover:bg-sky-100'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>لابراتوار فعال</span>
          </button>

          <button
            onClick={() => handleFilterClick('implant')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1 ${
              activeFilter === 'implant'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200/70 hover:bg-purple-100'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>جراحی ایمپلنت</span>
          </button>
        </div>
      </div>

      {/* Instant Search-as-You-Type Dropdown Results Panel */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-xl border border-emerald-300/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[380px] flex flex-col">
          
          {/* Header of results list */}
          <div className="px-3 py-2 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between text-xs">
            <span className="font-black text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>نتایج لحظه‌ای ({toPersianDigits(filteredPatients.length)} مورد):</span>
            </span>

            <button
              onClick={() => setIsFocused(false)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-bold"
            >
              بستن لیست
            </button>
          </div>

          {/* Results Scroll Area */}
          <div className="overflow-y-auto divide-y divide-slate-100 p-1 space-y-1">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => {
                const isDebtor = patient.balance < 0;
                const normQ = normalizeQuery(query);
                const matchesName = normQ && normalizeQuery(patient.fullName).includes(normQ);
                const matchesPhone = normQ && normalizeQuery(patient.phone).includes(normQ);
                const matchesFile = normQ && normalizeQuery(patient.fileNumber || '').includes(normQ);

                return (
                  <div
                    key={patient.id}
                    className="p-2 sm:p-2.5 rounded-xl hover:bg-emerald-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
                  >
                    {/* Patient Information & File Badge */}
                    <div 
                      onClick={() => handlePatientClick(patient)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {patient.fullName.slice(0, 1)}
                      </div>

                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                            {patient.fullName}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded font-mono border border-slate-200">
                            پرونده #{toPersianDigits(patient.fileNumber || patient.id.replace('p', ''))}
                          </span>

                          {/* Matching Reason Tag */}
                          {matchesName && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md">
                              تطابق نام
                            </span>
                          )}
                          {matchesPhone && (
                            <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded-md">
                              تطابق تماس
                            </span>
                          )}
                          {matchesFile && (
                            <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded-md">
                              تطابق پرونده
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-[10.5px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1 font-mono text-slate-700 font-bold" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {toPersianDigits(patient.phone)}
                          </span>
                          <span>•</span>
                          <span>{patient.gender} · {toPersianDigits(patient.age)} سال</span>
                          <span>•</span>
                          <span className={isDebtor ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                            {isDebtor ? `بدهی: ${formatToman(Math.abs(patient.balance))}` : 'تسویه کامل'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick 1-Tap Action Buttons */}
                    <div className="flex items-center gap-1 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                      {/* Direct Phone Call */}
                      <a
                        href={`tel:${patient.phone}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                        }}
                        className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-all active:scale-90"
                        title={`تماس با ${patient.fullName}`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>

                      {/* Palmer Chart */}
                      {onOpenPalmerChart && (
                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            setIsFocused(false);
                            onOpenPalmerChart(patient);
                          }}
                          className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-[10.5px] flex items-center gap-1 active:scale-95 transition-all"
                          title="باز کردن چارت دندانی پالمر"
                        >
                          <Activity className="w-3 h-3" />
                          <span>چارت پالمر</span>
                        </button>
                      )}

                      {/* Schedule Appointment */}
                      {onOpenAppointment && (
                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            setIsFocused(false);
                            onOpenAppointment(patient);
                          }}
                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[10.5px] flex items-center gap-1 active:scale-95 transition-all"
                          title="تعیین نوبت جدید"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>نوبت</span>
                        </button>
                      )}

                      {/* Full File Modal */}
                      <button
                        onClick={() => handlePatientClick(patient)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                        title="مشاهده پرونده کامل، مالی و درمان‌ها"
                      >
                        <FileText className="w-3 h-3" />
                        <span>پرونده کامل</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              /* No Results State with Quick Admission */
              <div className="p-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <User className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">
                    بیماری با مشخصات «{query}» در {searchScope === 'name' ? 'اسامی' : searchScope === 'phone' ? 'شماره‌های تماس' : searchScope === 'file' ? 'شماره‌های پرونده' : 'سیستم'} یافت نشد
                  </p>
                  <p className="text-[11px] text-slate-500">
                    می‌توانید فوراً پرونده جدید برای این شخص تشکیل دهید.
                  </p>
                </div>

                {onQuickAdmission && (
                  <button
                    onClick={() => {
                      triggerHaptic('heavy');
                      setIsFocused(false);
                      onQuickAdmission(query);
                    }}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>تشکیل پرونده جدید</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer note with keyboard shortcut */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>فیلتر بلادرنگ: نام • شماره پرونده • شماره تماس</span>
            <span className="font-mono">میانبر: Cmd + K / کلید Esc</span>
          </div>
        </div>
      )}
    </div>
  );
};
