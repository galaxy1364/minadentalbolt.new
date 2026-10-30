import React, { useState } from 'react';
import { 
  Users, Search, UserPlus, Phone, ChevronLeft, 
  AlertTriangle, FileCheck2, Calendar, ShieldCheck,
  Stethoscope, CreditCard, DollarSign, HeartPulse,
  Filter, Check, Clock, Edit3, X,
  FlaskConical, Activity, Layers, Printer, Pill,
  ChevronDown, ChevronUp, PenTool, CheckCircle2, Clock3
} from 'lucide-react';
import { Patient, ToothCondition } from '../../types/dental';
import { toPersianDigits, formatToman } from '../../utils/jalali';
import { getLatestFileNumber, getNextFileNumber, recordLastFileNumber } from '../../utils/fileNumber';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { autoSaveManager } from '../../utils/autoSaveManager';
import { DentalSkeletonLoader } from '../DentalSkeletonLoader';

interface PatientsListViewProps {
  patients: Patient[];
  onOpenPatientFile: (patient: Patient, tab?: 'treatments' | 'financial' | 'prescriptions' | 'consents' | 'lab' | 'implant' | 'xrays' | 'ai') => void;
  onAddNewPatient: (patient: Omit<Patient, 'id' | 'totalCost' | 'paidAmount' | 'balance' | 'activeTreatmentsCount' | 'lastVisit' | 'teethConditions' | 'sayadChecks' | 'installments' | 'labOrders' | 'implantCases' | 'payments'>) => void;
  onUpdateFileNumber?: (patientId: string, newFileNumber: string) => void;
  onOpenInvoice?: (patient: Patient) => void;
  onOpenPalmerChart?: (patient: Patient) => void;
}

/**
 * Normalizes Persian/Arabic characters and English/Persian digits for fuzzy robust search
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

export const PatientsListView: React.FC<PatientsListViewProps> = ({
  patients,
  onOpenPatientFile,
  onAddNewPatient,
  onUpdateFileNumber,
  onOpenInvoice,
  onOpenPalmerChart
}) => {
  const { selection, impactLight, impactHeavy, success } = useHapticFeedback();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'debtors' | 'active_treatment' | 'implants' | 'lab'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFileNumberPatientId, setEditingFileNumberPatientId] = useState<string | null>(null);
  const [tempFileNumber, setTempFileNumber] = useState('');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  // New patient form
  const [formFileNumber, setFormFileNumber] = useState('');
  const [formName, setFormName] = useState('');
  const [formNationalId, setFormNationalId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAge, setFormAge] = useState<number>(32);
  const [formGender, setFormGender] = useState<'مرد' | 'زن'>('مرد');
  const [formInsurance, setFormInsurance] = useState('آزاد');
  const [formMedicalAlerts, setFormMedicalAlerts] = useState<string[]>([]);
  const [formChiefComplaint, setFormChiefComplaint] = useState('');

  const medicalConditionOptions = [
    'دیابت قندی',
    'فشار خون بالا',
    'بیماری‌های قلبی عروقی',
    'حساسیت به پنی‌سیلین',
    'مصرف داروی ضدانعقاد (وارفارین/آسپیرین)',
    'بارداری',
    'هپاتیت / بیماری کبدی',
    'پوکی استخوان (مصرف بیفسفونات)'
  ];

  const toggleMedicalAlert = (cond: string) => {
    selection();
    if (formMedicalAlerts.includes(cond)) {
      setFormMedicalAlerts(formMedicalAlerts.filter(c => c !== cond));
    } else {
      setFormMedicalAlerts([...formMedicalAlerts, cond]);
    }
  };

  // Stats
  const totalCount = patients.length;
  const debtors = patients.filter(p => p.balance < 0);
  const totalDebt = debtors.reduce((sum, p) => sum + Math.abs(p.balance), 0);
  const activeTreatmentsTotal = patients.reduce((sum, p) => sum + p.activeTreatmentsCount, 0);

  const [searchScope, setSearchScope] = useState<'all' | 'name' | 'phone' | 'file'>('all');

  const normalizedSearch = normalizeQuery(searchQuery);

  const filtered = patients.filter(p => {
    if (normalizedSearch) {
      const normName = normalizeQuery(p.fullName);
      const normPhone = normalizeQuery(p.phone);
      const normFile = normalizeQuery(p.fileNumber);
      const normNatId = normalizeQuery(p.nationalId || '');

      let matchesSearch = false;
      if (searchScope === 'name') {
        matchesSearch = normName.includes(normalizedSearch);
      } else if (searchScope === 'phone') {
        matchesSearch = normPhone.includes(normalizedSearch);
      } else if (searchScope === 'file') {
        matchesSearch = normFile.includes(normalizedSearch);
      } else {
        matchesSearch = 
          normName.includes(normalizedSearch) ||
          normPhone.includes(normalizedSearch) ||
          normFile.includes(normalizedSearch) ||
          normNatId.includes(normalizedSearch);
      }

      if (!matchesSearch) return false;
    }

    if (activeFilter === 'debtors') return p.balance < 0;
    if (activeFilter === 'active_treatment') return p.activeTreatmentsCount > 0;
    if (activeFilter === 'implants') return Boolean(p.implantCases && p.implantCases.length > 0);
    if (activeFilter === 'lab') return Boolean(p.labOrders && p.labOrders.length > 0);

    return true;
  });

  const handleOpenAddModal = () => {
    impactHeavy();
    const nextNum = getNextFileNumber(getLatestFileNumber(patients));
    setFormFileNumber(nextNum);
    setShowAddModal(true);
  };

  // Auto-Save Draft Recovery on Modal Open
  React.useEffect(() => {
    if (showAddModal) {
      const draft = autoSaveManager.getDraft<{
        formName: string;
        formPhone: string;
        formNationalId: string;
        formAge: number;
        formGender: 'مرد' | 'زن';
        formInsurance: string;
        formMedicalAlerts: string[];
        formChiefComplaint: string;
      }>('new_patient_draft');
      if (draft && draft.data) {
        if (draft.data.formName && !formName) setFormName(draft.data.formName);
        if (draft.data.formPhone && !formPhone) setFormPhone(draft.data.formPhone);
        if (draft.data.formNationalId && !formNationalId) setFormNationalId(draft.data.formNationalId);
        if (draft.data.formAge) setFormAge(draft.data.formAge);
        if (draft.data.formGender) setFormGender(draft.data.formGender);
        if (draft.data.formInsurance) setFormInsurance(draft.data.formInsurance);
        if (draft.data.formMedicalAlerts) setFormMedicalAlerts(draft.data.formMedicalAlerts);
        if (draft.data.formChiefComplaint) setFormChiefComplaint(draft.data.formChiefComplaint);
      }
    }
  }, [showAddModal]);

  // Persist draft on user typing
  React.useEffect(() => {
    if (formName || formPhone || formNationalId || formChiefComplaint) {
      autoSaveManager.saveDraft('new_patient_draft', {
        formName, formPhone, formNationalId, formAge, formGender, formInsurance, formMedicalAlerts, formChiefComplaint
      }, 'پیش‌نویس پرونده بیمار جدید', 'patients');
    }
  }, [formName, formPhone, formNationalId, formAge, formGender, formInsurance, formMedicalAlerts, formChiefComplaint]);

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formName || !formPhone) return;

    success();
    autoSaveManager.clearDraft('new_patient_draft');
    const finalFileNumber = formFileNumber.trim() || getNextFileNumber(getLatestFileNumber(patients));
    recordLastFileNumber(finalFileNumber);

    onAddNewPatient({
      fullName: formName,
      fileNumber: finalFileNumber,
      nationalId: formNationalId || '۰۰۱۲۳۴۵۶۷۸',
      phone: formPhone,
      age: Number(formAge) || 30,
      gender: formGender,
      medicalHistory: formMedicalAlerts,
      notes: formChiefComplaint ? `علت مراجعه: ${formChiefComplaint} | بیمه: ${formInsurance}` : `بیمه: ${formInsurance}`
    });

    setShowAddModal(false);
    setFormName('');
    setFormPhone('');
    setFormNationalId('');
    setFormMedicalAlerts([]);
    setFormChiefComplaint('');
  };

  return (
    <div className="pb-28 space-y-3">
      {/* Top Search & Stats Card */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-sm border border-slate-100 space-y-3">
          {/* 1. Dedicated Search Input Field at the Top */}
          <div className="relative">
            <div className="absolute right-3 top-2.5 flex items-center gap-1.5 pointer-events-none">
              <Search className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type="text"
              placeholder={
                searchScope === 'name' ? 'فیلتر بر اساس نام بیمار (مثلاً: امیری، محمدی)...' :
                searchScope === 'phone' ? 'فیلتر بر اساس شماره تماس (مثلاً: ۰۹۱۲ یا ۹۸۷۶)...' :
                searchScope === 'file' ? 'فیلتر بر اساس شماره پرونده (مثلاً: ۱۰۲۴ یا ۵۶)...' :
                'جستجوی بلادرنگ بیمار بر اساس نام، شماره تماس، یا شماره پرونده...'
              }
              value={searchQuery}
              onChange={(e) => {
                selection();
                setSearchQuery(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-200/90 focus:border-emerald-500 rounded-2xl pr-9 pl-9 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  impactLight();
                  setSearchQuery('');
                }}
                className="absolute left-3 top-2.5 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
                title="پاک کردن جستجو"
              >
                <X className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            )}
          </div>

          {/* Real-Time Filter Scope Selector Bar (Name / Phone / File Number / All) */}
          <div className="flex items-center gap-1 -mt-1 pb-0.5 text-[10px]">
            <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-1">جستجو در:</span>
            <button
              type="button"
              onClick={() => {
                selection();
                setSearchScope('all');
              }}
              className={`px-2 py-0.5 rounded-md font-bold transition-all active:scale-95 ${
                searchScope === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه فیلدها
            </button>
            <button
              type="button"
              onClick={() => {
                selection();
                setSearchScope('name');
              }}
              className={`px-2 py-0.5 rounded-md font-bold transition-all active:scale-95 ${
                searchScope === 'name'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100'
              }`}
            >
              نام بیمار
            </button>
            <button
              type="button"
              onClick={() => {
                selection();
                setSearchScope('phone');
              }}
              className={`px-2 py-0.5 rounded-md font-bold transition-all active:scale-95 ${
                searchScope === 'phone'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-sky-50 text-sky-800 border border-sky-200/60 hover:bg-sky-100'
              }`}
            >
              شماره تماس
            </button>
            <button
              type="button"
              onClick={() => {
                selection();
                setSearchScope('file');
              }}
              className={`px-2 py-0.5 rounded-md font-bold transition-all active:scale-95 ${
                searchScope === 'file'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-800 border border-purple-200/60 hover:bg-purple-100'
              }`}
            >
              شماره پرونده
            </button>
          </div>

          {/* Search Result Status & Match Count */}
          {searchQuery && (
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-2.5 py-1.5 animate-in fade-in duration-150">
              <span className="font-bold text-emerald-800">
                نتایج فیلتر برای: <span className="font-mono text-emerald-950 font-black">«{searchQuery}»</span>
              </span>
              <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md shadow-2xs border border-emerald-300">
                {toPersianDigits(filtered.length)} پرونده
              </span>
            </div>
          )}

          {/* 2. Header & Action */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-slate-800 leading-none">پرونده بیماران</h3>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="py-1.5 px-3 rounded-xl bg-[#c8ff00] text-black font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[3]" />
              <span>تشکیل پرونده جدید</span>
            </button>
          </div>

          {/* Quick Stats Badges Bar */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] text-slate-400 block">کل پرونده‌ها</span>
              <span className="text-xs font-black text-slate-800 font-mono">{toPersianDigits(totalCount)}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] text-slate-400 block">درمان‌های جاری</span>
              <span className="text-xs font-black text-emerald-600 font-mono">{toPersianDigits(activeTreatmentsTotal)}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] text-slate-400 block">بدهکاران</span>
              <span className="text-xs font-black text-red-500 font-mono">{toPersianDigits(debtors.length)} نفر</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] text-slate-400 block">مانده مطالبات</span>
              <span className="text-[10px] font-black text-red-600 truncate block">{formatToman(totalDebt)}</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {[
              { id: 'all', label: `همه (${toPersianDigits(totalCount)})` },
              { id: 'debtors', label: `بدهکاران (${toPersianDigits(debtors.length)})` },
              { id: 'active_treatment', label: 'تحت درمان' },
              { id: 'implants', label: 'ایمپلنت' },
              { id: 'lab', label: 'لابراتوار' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  selection();
                  setActiveFilter(tab.id as any);
                }}
                className={`py-1 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="mx-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
            بیماری با این مشخصات یافت نشد.
          </div>
        ) : (
          filtered.map(patient => {
            const isExpanded = expandedPatientId === patient.id;
            const teethEntries = Object.entries(patient.teethConditions || {});
            const hasImplant = patient.implantCases && patient.implantCases.length > 0;
            const hasLab = patient.labOrders && patient.labOrders.length > 0;
            const activeImplant = hasImplant ? patient.implantCases[0] : null;
            const activeLab = hasLab ? patient.labOrders[0] : null;

            return (
              <div
                key={patient.id}
                className="bg-white rounded-[24px] p-3.5 shadow-2xs border border-slate-100/90 hover:shadow-sm hover:border-slate-200 transition-all space-y-2.5"
              >
                {/* 1. Card Header Row */}
                <div 
                  onClick={() => {
                    impactLight();
                    onOpenPatientFile(patient);
                  }}
                  className="flex items-start justify-between cursor-pointer"
                >
                  {/* Left: Financial Badge & Expand Arrow */}
                  <div className="flex flex-col items-start gap-1">
                    {patient.balance < 0 ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200/60 px-2.5 py-0.5 rounded-full font-mono">
                        بدهکار: {formatToman(Math.abs(patient.balance))}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                        تسویه کامل
                      </span>
                    )}

                    <span className="text-[9.5px] text-slate-400 font-mono">
                      آخرین مراجعه: {toPersianDigits(patient.lastVisit)}
                    </span>
                  </div>

                  {/* Right: Avatar, Name & Editable File Number */}
                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {editingFileNumberPatientId === patient.id ? (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-cyan-500 shadow-sm"
                          >
                            <input
                              type="text"
                              value={tempFileNumber}
                              onChange={(e) => setTempFileNumber(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const trimmed = tempFileNumber.trim();
                                  if (trimmed && onUpdateFileNumber) {
                                    onUpdateFileNumber(patient.id, trimmed);
                                    recordLastFileNumber(trimmed);
                                  }
                                  setEditingFileNumberPatientId(null);
                                }
                                if (e.key === 'Escape') setEditingFileNumberPatientId(null);
                              }}
                              className="w-20 px-1.5 py-0.5 text-[11px] font-mono font-bold text-cyan-800 bg-cyan-50 rounded outline-none border border-cyan-200"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const trimmed = tempFileNumber.trim();
                                if (trimmed && onUpdateFileNumber) {
                                  onUpdateFileNumber(patient.id, trimmed);
                                  recordLastFileNumber(trimmed);
                                }
                                setEditingFileNumberPatientId(null);
                              }}
                              className="p-1 rounded bg-[#c8ff00] text-black hover:opacity-90 active:scale-95"
                              title="ذخیره شماره پرونده"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFileNumberPatientId(null);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFileNumberPatientId(patient.id);
                              setTempFileNumber(patient.fileNumber || '');
                            }}
                            className="text-[11px] text-slate-600 hover:text-cyan-700 font-mono font-bold bg-slate-100 hover:bg-cyan-50 border border-slate-200/80 hover:border-cyan-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                            title="ویرایش دستی شماره پرونده"
                          >
                            <span>{patient.fileNumber}</span>
                            <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-cyan-600" />
                          </span>
                        )}
                        <h4 className="text-sm font-black text-slate-900">{patient.fullName}</h4>
                      </div>

                      <div className="flex items-center justify-end gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono">{toPersianDigits(patient.phone)}</span>
                        <span>·</span>
                        <span>{patient.gender}</span>
                        <span>·</span>
                        <span>{toPersianDigits(patient.age)} ساله</span>
                      </div>
                    </div>

                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 border border-emerald-300/80 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {patient.fullName.charAt(0)}
                    </div>
                  </div>
                </div>

                {/* Medical alert badge if exists */}
                {patient.medicalHistory.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10.5px] text-amber-900 bg-amber-50/90 px-2.5 py-1 rounded-xl border border-amber-200/70">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold shrink-0">سوابق پزشکی:</span>
                    <span className="truncate">{patient.medicalHistory.join('، ')}</span>
                  </div>
                )}

                {/* 2. Patient Action Chips Bar (نوار چیپ‌های دسترسی سریع) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-y border-slate-100">
                  {/* Chip 1: لابراتوار */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      impactLight();
                      onOpenPatientFile(patient, 'lab');
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 ${
                      hasLab 
                        ? 'bg-purple-100 text-purple-900 border border-purple-300' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                    title="مشاهده سفارشات لابراتوار بیمار"
                  >
                    <FlaskConical className="w-3 h-3 text-purple-600" />
                    <span>لابراتوار ({toPersianDigits(patient.labOrders?.length || 0)})</span>
                  </button>

                  {/* Chip 2: کیس ایمپلنت */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      impactLight();
                      onOpenPatientFile(patient, 'implant');
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 ${
                      hasImplant 
                        ? 'bg-cyan-100 text-cyan-900 border border-cyan-300' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                    title="مشاهده پرونده ایمپلنت بیمار"
                  >
                    <Activity className="w-3 h-3 text-cyan-600" />
                    <span>ایمپلنت ({toPersianDigits(patient.implantCases?.length || 0)})</span>
                  </button>

                  {/* Chip 3: چک و اقساط */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      impactLight();
                      onOpenPatientFile(patient, 'financial');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95"
                    title="چک صیادی و اقساط ماهانه"
                  >
                    <FileCheck2 className="w-3 h-3 text-amber-600" />
                    <span>چک و اقساط ({toPersianDigits(patient.sayadChecks?.length || 0)})</span>
                  </button>

                  {/* Chip 4: نسخه دارویی */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      impactLight();
                      onOpenPatientFile(patient, 'prescriptions');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95"
                    title="نسخه‌های دارویی بیمار"
                  >
                    <Pill className="w-3 h-3 text-emerald-600" />
                    <span>نسخه (Rx)</span>
                  </button>

                  {/* Chip 5: چارت پالمر */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      impactLight();
                      if (onOpenPalmerChart) onOpenPalmerChart(patient);
                      else onOpenPatientFile(patient, 'treatments');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95"
                    title="ثبت یا مشاهده چارت دندانی پالمر"
                  >
                    <Layers className="w-3 h-3 text-teal-600" />
                    <span>چارت پالمر</span>
                  </button>

                  {/* Chip 6: فاکتور رسمی */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      impactLight();
                      if (onOpenInvoice) onOpenInvoice(patient);
                      else onOpenPatientFile(patient, 'financial');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95"
                    title="چاپ فاکتور رسمی درمان"
                  >
                    <Printer className="w-3 h-3 text-sky-600" />
                    <span>فاکتور</span>
                  </button>
                </div>

                {/* 3. Collapsible Details: Live Clinical Timeline & Treatments List */}
                <div className="pt-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selection();
                      setExpandedPatientId(isExpanded ? null : patient.id);
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-[10.5px] font-bold flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{toPersianDigits(patient.activeTreatmentsCount)} درمان فعال · خط روند بالینی</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                      <span>{isExpanded ? 'بستن جزئیات' : 'مشاهده خط روند و درمان‌ها'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {/* Expanded Body: Live Stage Bar + Treatments List */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                      {/* Live Clinical Timeline Progress Line (خط روند بالینی بیمار) */}
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="font-black text-slate-800 flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5 text-cyan-600" />
                            <span>خط روند درمان بیمار (Live Clinical Timeline)</span>
                          </span>
                          <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded-full">
                            {hasImplant ? 'پروتکل ایمپلنت' : hasLab ? 'پروتکل لابراتوار' : 'درمان‌های کلینیکی'}
                          </span>
                        </div>

                        {/* Visual Step Indicator */}
                        {hasImplant ? (
                          <div className="grid grid-cols-5 gap-1 pt-1 text-center">
                            {[
                              { label: 'کاشت فیکسچر', step: 'fixture_placed' },
                              { label: 'هیلینگ کپ', step: 'healing_cap' },
                              { label: 'قالب‌گیری', step: 'impression' },
                              { label: 'فریم و اباتمنت', step: 'abutment_framework' },
                              { label: 'تحویل روکش', step: 'crown_delivered' }
                            ].map((st, i) => {
                              const stages = ['fixture_placed', 'healing_cap', 'impression', 'abutment_framework', 'crown_delivered'];
                              const currentIndex = stages.indexOf(activeImplant?.currentStage || 'fixture_placed');
                              const isPastOrCurrent = i <= currentIndex;
                              const isCurrent = i === currentIndex;

                              return (
                                <div key={i} className="flex flex-col items-center">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                    isCurrent 
                                      ? 'bg-cyan-600 text-white ring-2 ring-cyan-300 shadow-xs' 
                                      : isPastOrCurrent 
                                      ? 'bg-cyan-100 text-cyan-800' 
                                      : 'bg-slate-200 text-slate-400'
                                  }`}>
                                    {isPastOrCurrent ? <Check className="w-3 h-3 stroke-[3]" /> : toPersianDigits(i + 1)}
                                  </div>
                                  <span className={`text-[8.5px] leading-tight font-bold ${
                                    isCurrent ? 'text-cyan-900 font-black' : isPastOrCurrent ? 'text-slate-700' : 'text-slate-400'
                                  }`}>
                                    {st.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : hasLab ? (
                          <div className="grid grid-cols-5 gap-1 pt-1 text-center">
                            {[
                              { label: 'قالب‌گیری', step: 'ordered' },
                              { label: 'ارسال لابراتوار', step: 'in_progress' },
                              { label: 'در حال ساخت', step: 'in_progress' },
                              { label: 'آماده در کلینیک', step: 'ready_for_clinic' },
                              { label: 'تحویل و سمان', step: 'delivered_to_patient' }
                            ].map((st, i) => {
                              const stages = ['ordered', 'in_progress', 'ready_for_clinic', 'delivered_to_patient'];
                              const currentIndex = stages.indexOf(activeLab?.status || 'ordered');
                              const isPastOrCurrent = i <= currentIndex + 1;
                              const isCurrent = i === currentIndex + 1;

                              return (
                                <div key={i} className="flex flex-col items-center">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                    isCurrent 
                                      ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-xs' 
                                      : isPastOrCurrent 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-slate-200 text-slate-400'
                                  }`}>
                                    {isPastOrCurrent ? <Check className="w-3 h-3 stroke-[3]" /> : toPersianDigits(i + 1)}
                                  </div>
                                  <span className={`text-[8.5px] leading-tight font-bold ${
                                    isCurrent ? 'text-purple-900 font-black' : isPastOrCurrent ? 'text-slate-700' : 'text-slate-400'
                                  }`}>
                                    {st.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-1 pt-1 text-center">
                            {[
                              { label: 'پذیرش و تشکیل پرونده', done: true },
                              { label: 'معاینه و تشخیص', done: true },
                              { label: 'درمان فعال در یونیت', done: patient.activeTreatmentsCount > 0, current: patient.activeTreatmentsCount > 0 },
                              { label: 'تسویه و ترخیص', done: patient.balance >= 0 }
                            ].map((st, i) => (
                              <div key={i} className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 ${
                                  st.current 
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-xs' 
                                    : st.done 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-slate-200 text-slate-400'
                                }`}>
                                  {st.done ? <Check className="w-3 h-3 stroke-[3]" /> : toPersianDigits(i + 1)}
                                </div>
                                <span className={`text-[8.5px] leading-tight font-bold ${
                                  st.current ? 'text-emerald-900 font-black' : st.done ? 'text-slate-700' : 'text-slate-400'
                                }`}>
                                  {st.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Treatments List on the Patient Card */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-black text-slate-800 px-1">
                          <span>لیست درمان‌ها، شماره دندان و پزشک:</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            کل هزینه: {formatToman(patient.totalCost)}
                          </span>
                        </div>

                        {teethEntries.length === 0 ? (
                          <p className="text-[10px] text-slate-400 p-2 text-center bg-slate-50 rounded-xl border border-slate-100">
                            هنوز درمانی برای این بیمار ثبت نشده است.
                          </p>
                        ) : (
                          teethEntries.map(([toothKey, cond]) => {
                            const treatmentPersianName = 
                              cond.treatment === 'composite' ? 'ترمیم کامپوزیت همرنگ' :
                              cond.treatment === 'amalgam' ? 'ترمیم آمالگام سیلور' :
                              cond.treatment === 'endo' ? 'درمان ریشه (عصب‌کشی)' :
                              cond.treatment === 'crown_zirconia' ? 'روکش تمام زیرکونیا' :
                              cond.treatment === 'crown_pfm' ? 'روکش پرسلن متال PFM' :
                              cond.treatment === 'laminate' ? 'لمینت سرامیکی' :
                              cond.treatment === 'implant' ? 'کاشت فیکسچر ایمپلنت' :
                              cond.treatment === 'extraction' ? 'کشیدن دندان' :
                              cond.treatment === 'scaling' ? 'جرم‌گیری' : cond.treatment;

                            return (
                              <div 
                                key={toothKey}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 flex items-center justify-between text-xs transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {/* Tooth Quadrant and Number Badge */}
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono font-black text-[10px] flex flex-col items-center justify-center shrink-0">
                                    <span>{cond.quadrant}</span>
                                    <span>{cond.toothNumber}</span>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 text-[11px]">{treatmentPersianName}</span>
                                      {/* Freehand Clinical Annotation Badge */}
                                      {cond.annotations && (
                                        <span className="flex items-center gap-0.5 text-purple-700 bg-purple-100/90 border border-purple-300 px-1.5 py-0.2 rounded-md text-[8.5px] font-black" title="دارای ترسیم بالینی روی سطوح">
                                          <PenTool className="w-2.5 h-2.5" />
                                          <span>ترسیم بالینی</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                      <span>پزشک: {cond.doctorName || 'دکتر مهدی امیری'}</span>
                                      <span>·</span>
                                      <span>سطوح: {cond.surfaces.join(' + ').toUpperCase()}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-[11px] font-black font-mono text-slate-800 block">
                                    {formatToman(cond.cost || 2400000)}
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                    cond.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : cond.status === 'in_progress'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {cond.status === 'completed' ? 'تکمیل شده' : cond.status === 'in_progress' ? 'در حال انجام' : 'طرح درمان'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* New Patient Registration Modal (Themed to Fresh Emerald Patients Palette - Zero Black) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-emerald-950/20 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-emerald-50/80 via-white to-teal-50/40 text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-emerald-200/90 p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تشکیل پرونده بیمار جدید</h3>
                  <span className="text-[10px] text-emerald-700 font-bold">پذیرش و بایگانی کلینیک</span>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              {/* شماره پرونده (تولید خودکار یکی‌یکی بالا، قابل ویرایش دستی) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 block font-bold">شماره پرونده بالینی *</label>
                  <span className="text-[10px] text-emerald-700 font-bold font-sans">افزایشی خودکار (قابل ادیت دستی)</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formFileNumber}
                    onChange={(e) => setFormFileNumber(e.target.value)}
                    placeholder="مثال: D-1052"
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-emerald-800 font-mono font-black text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                  <span className="absolute left-3 top-2.5 text-[9.5px] text-emerald-600 font-mono">آخرین ادیت +۱</span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold">نام و نام خانوادگی کامل *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: سارا ابراهیمی"
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">کد ملی (۱۰ رقم)</label>
                  <input
                    type="text"
                    value={formNationalId}
                    onChange={(e) => setFormNationalId(e.target.value)}
                    placeholder="۰۰۱۲۳۴۵۶۷۸"
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-bold">شماره تماس همراه *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold">سن بیمار</label>
                  <input
                    type="number"
                    value={formAge}
                    onChange={(e) => setFormAge(Number(e.target.value))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-bold">جنسیت</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-2 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-500 shadow-2xs"
                  >
                    <option value="مرد">مرد</option>
                    <option value="زن">زن</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold">پوشش بیمه</label>
                <select
                  value={formInsurance}
                  onChange={(e) => setFormInsurance(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  <option value="آزاد">آزاد (بدون بیمه)</option>
                  <option value="تامین اجتماعی">تامین اجتماعی</option>
                  <option value="خدمات درمانی">خدمات درمانی / سلامت</option>
                  <option value="نیروهای مسلح">نیروهای مسلح</option>
                  <option value="بیمه تکمیلی">بیمه تکمیلی (ایران/دانا/آسیا)</option>
                </select>
              </div>

              {/* Medical History Checklist */}
              <div>
                <label className="text-slate-700 block mb-1.5 flex items-center justify-between font-bold">
                  <span>سوابق پزشکی و هشدارهای سلامتی:</span>
                  <span className="text-[10px] text-amber-600 font-bold">حیاتی جهت بیحسی و جراحی</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto no-scrollbar p-1.5 bg-slate-50 rounded-xl border border-emerald-100">
                  {medicalConditionOptions.map(cond => {
                    const isChecked = formMedicalAlerts.includes(cond);
                    return (
                      <button
                        type="button"
                        key={cond}
                        onClick={() => toggleMedicalAlert(cond)}
                        className={`text-right p-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          isChecked
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '} {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold">علت اصلی مراجعه (Chief Complaint)</label>
                <input
                  type="text"
                  value={formChiefComplaint}
                  onChange={(e) => setFormChiefComplaint(e.target.value)}
                  placeholder="مثلاً دندان‌درد شبانه، شکستگی دندان جلو، کاشت ایمپلنت..."
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
                >
                  تشکیل پرونده و صدور شماره
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
