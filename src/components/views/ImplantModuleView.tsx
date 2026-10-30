import React, { useState } from 'react';
import { 
  Activity, Plus, Clock, CheckCircle2, 
  AlertCircle, ShieldCheck, ChevronRight, Layers,
  Calendar, Stethoscope, Search, Sparkles, Check,
  Send, Award, ChevronDown, ChevronUp, Bell,
  SlidersHorizontal, Smartphone, FlaskConical, FileText,
  X, CheckSquare, Zap, Info
} from 'lucide-react';
import { ImplantCase, ImplantStage, Patient } from '../../types/dental';
import { toPersianDigits, formatToman, getCurrentPersianDate, getRelativePersianDate } from '../../utils/jalali';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface ImplantModuleViewProps {
  patients: Patient[];
  onOpenPatientFile: (patient: Patient) => void;
  onAdvanceStage: (caseId: string, nextStage: ImplantStage) => void;
  onAddImplantCase?: (newCase: any) => void;
}

interface ImplantBrandSpec {
  brand: string;
  country: string;
  connection: string;
  hexType: string;
  recommendedTorque: string;
  healingPeriodMonths: number;
  color: string;
}

const BRAND_SPECS: ImplantBrandSpec[] = [
  {
    brand: 'اشترومن Straumann (BLX/SLA)',
    country: 'سوئیس',
    connection: 'Internal TorcFit / SynOcta',
    hexType: 'Conical Matrix',
    recommendedTorque: '۳۵ تا ۴۵ N/cm',
    healingPeriodMonths: 2,
    color: 'from-amber-500 to-amber-700'
  },
  {
    brand: 'اوستم Osstem (TSIII SA)',
    country: 'کره جنوبی',
    connection: 'Internal Hex 11° Morph',
    hexType: '1.2mm Hex Drive',
    recommendedTorque: '۳۰ تا ۴۰ N/cm',
    healingPeriodMonths: 3,
    color: 'from-blue-600 to-sky-700'
  },
  {
    brand: 'دنتیوم Dentium (SuperLine)',
    country: 'کره جنوبی',
    connection: 'Internal Hex 11° Conical',
    hexType: '1.27mm Hex Drive',
    recommendedTorque: '۳۰ تا ۳۵ N/cm',
    healingPeriodMonths: 3,
    color: 'from-emerald-600 to-teal-700'
  },
  {
    brand: 'مگاژن Megagen (AnyRidge)',
    country: 'کره جنوبی',
    connection: 'Knife Thread / 5° Morse Taper',
    hexType: '1.2mm Hex Drive',
    recommendedTorque: '۴۰ تا ۵۰ N/cm',
    healingPeriodMonths: 2.5,
    color: 'from-purple-600 to-indigo-700'
  },
  {
    brand: 'نئودنت Neodent (Grand Morse)',
    country: 'برزیل / سوئیس',
    connection: 'Grand Morse 16° Cone',
    hexType: 'Neo Hex Drive',
    recommendedTorque: '۳۵ تا ۴۵ N/cm',
    healingPeriodMonths: 2,
    color: 'from-rose-600 to-red-700'
  },
  {
    brand: 'دیو DIO (SM/UFII)',
    country: 'کره جنوبی',
    connection: 'Internal Hex 11° Conical',
    hexType: '1.2mm Hex Drive',
    recommendedTorque: '۳۰ تا ۴۰ N/cm',
    healingPeriodMonths: 3,
    color: 'from-cyan-600 to-blue-700'
  }
];

export const ImplantModuleView: React.FC<ImplantModuleViewProps> = ({
  patients,
  onOpenPatientFile,
  onAdvanceStage,
  onAddImplantCase
}) => {
  const { impactLight, impactHeavy, success, selection } = useHapticFeedback();

  // Top Chip Navigation: cases | reminders | prosthetics | catalog | biomechanics
  const [activeChip, setActiveChip] = useState<'cases' | 'reminders' | 'prosthetics' | 'catalog' | 'biomechanics'>('cases');

  // Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('همه');
  const [stageFilter, setStageFilter] = useState<string>('all');

  // Biomechanics Engine States (All-on-4 / All-on-6, A-P Spread, Misch Cantilever)
  const [bioArch, setBioArch] = useState<'mandible' | 'maxilla'>('mandible');
  const [bioConfig, setBioConfig] = useState<'all_on_4' | 'all_on_6'>('all_on_4');
  const [apSpreadMm, setApSpreadMm] = useState<number>(14);
  const [plannedCantileverMm, setPlannedCantileverMm] = useState<number>(16);
  const [bioTorques, setBioTorques] = useState<number[]>([45, 40, 45, 50]);

  // Collapsed state for cards: Set of collapsed implant IDs
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Modals & Feedback
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedWarrantyCase, setSelectedWarrantyCase] = useState<ImplantCase | null>(null);

  // Form states for new implant
  const [formPatientId, setFormPatientId] = useState(patients[0]?.id || '');
  const [formTooth, setFormTooth] = useState('دندان ۶ پایین راست (LR6)');
  const [formBrand, setFormBrand] = useState('اشترومن Straumann (BLX/SLA)');
  const [formDiameter, setFormDiameter] = useState('۴.۲');
  const [formLength, setFormLength] = useState('۱۰');
  const [formTorque, setFormTorque] = useState(45);
  const [formBoneDensity, setFormBoneDensity] = useState<'D1' | 'D2' | 'D3' | 'D4'>('D2');
  const [formBoneGraft, setFormBoneGraft] = useState(false);
  const [formMembrane, setFormMembrane] = useState(false);
  const [formSurgeryDate, setFormSurgeryDate] = useState(getCurrentPersianDate());
  const [formHealingMonths, setFormHealingMonths] = useState(3);
  const [formDoctor, setFormDoctor] = useState('دکتر مهدی امیری');

  const allImplants = patients.flatMap(p => p.implantCases || []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const toggleCardCollapse = (id: string) => {
    selection();
    setCollapsedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStageTitle = (stage: ImplantStage) => {
    switch (stage) {
      case 'fixture_placed': return 'مرحله ۱: کاشت فیکسچر';
      case 'healing_cap': return 'مرحله ۲: بستن هیلینگ کپ';
      case 'impression': return 'مرحله ۳: قالب‌گیری پروتز';
      case 'abutment_framework': return 'مرحله ۴: تست اباتمنت و فریم';
      case 'crown_delivered': return 'مرحله ۵: تحویل نهایی روکش';
    }
  };

  const getNextStage = (stage: ImplantStage): ImplantStage => {
    switch (stage) {
      case 'fixture_placed': return 'healing_cap';
      case 'healing_cap': return 'impression';
      case 'impression': return 'abutment_framework';
      case 'abutment_framework': return 'crown_delivered';
      case 'crown_delivered': return 'crown_delivered';
    }
  };

  const getNextStageButtonText = (stage: ImplantStage): string => {
    switch (stage) {
      case 'fixture_placed': return 'ارتقا به: بستن هیلینگ کپ';
      case 'healing_cap': return 'ارتقا به: قالب‌گیری ایمپلنت';
      case 'impression': return 'ارتقا به: تست فریم و اباتمنت';
      case 'abutment_framework': return 'ثبت تحویل نهایی روکش';
      case 'crown_delivered': return 'درمان تکمیل شد';
    }
  };

  const filteredImplants = allImplants.filter(imp => {
    const matchesBrand = selectedBrand === 'همه' || imp.brand.includes(selectedBrand);
    const matchesStage = stageFilter === 'all' || imp.currentStage === stageFilter;
    const matchesSearch = !searchQuery || 
      imp.patientName.includes(searchQuery) ||
      imp.toothNumber.includes(searchQuery) ||
      imp.brand.includes(searchQuery);
    return matchesBrand && matchesStage && matchesSearch;
  });

  const handleCreateImplant = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === formPatientId);
    if (!patient) return;

    impactHeavy();

    const newCase: ImplantCase = {
      id: `imp-${Date.now()}`,
      patientId: formPatientId,
      patientName: patient.fullName,
      toothNumber: formTooth,
      brand: formBrand,
      diameter: formDiameter,
      length: formLength,
      torque: Number(formTorque),
      boneGraft: formBoneGraft,
      membrane: formMembrane,
      surgeryDate: formSurgeryDate,
      healingDueDate: getRelativePersianDate(formHealingMonths * 30),
      currentStage: 'fixture_placed',
      notes: `جراحی توسط ${formDoctor} با گشتاور تورک ${formTorque} N/cm در استخوان تیپ ${formBoneDensity} انجام شد.`
    };

    if (onAddImplantCase) {
      onAddImplantCase(newCase);
    } else {
      patient.implantCases = [newCase, ...(patient.implantCases || [])];
    }

    success();
    showToast(`کیس جراحی ایمپلنت ${newCase.brand} برای ${patient.fullName} با موفقیت ثبت شد.`);
    setShowAddModal(false);
  };

  return (
    <div className="pb-28 space-y-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#122329] border border-cyan-400 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-xs font-bold leading-tight">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-sm text-slate-800 leading-none">ایمپلنت</h3>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Animated Search Toggle */}
              <button
                onClick={() => {
                  selection();
                  setSearchOpen(!searchOpen);
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  searchOpen ? 'bg-cyan-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="جستجوی کیس"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  impactLight();
                  setShowAddModal(true);
                }}
                className="py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>جراحی جدید</span>
              </button>
            </div>
          </div>

          {/* Animated Expandable Search Bar */}
          {searchOpen && (
            <div className="relative animate-in fade-in slide-in-from-top-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو با نام بیمار، شماره دندان یا برند..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-slate-50 border border-cyan-200 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Horizontal Chip Navigation Bar (چیپ رونده چپ و راست با تمام بخش‌های ماژول) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => {
                selection();
                setActiveChip('cases');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'cases'
                  ? 'bg-cyan-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>کیس‌های جراحی و روند ({toPersianDigits(allImplants.length)})</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('reminders');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'reminders'
                  ? 'bg-cyan-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>تقویم و یادآوری مراحل</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('prosthetics');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'prosthetics'
                  ? 'bg-cyan-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>پروتز و لابراتوار روکش</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('catalog');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'catalog'
                  ? 'bg-cyan-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>کاتالوگ سیستم‌ها و قطعات</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('biomechanics');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'biomechanics'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>موتور بیومکانیک فول‌آرک (All-on-4/6 & Misch)</span>
            </button>
          </div>

          {/* Sub-Filters for Cases Chip */}
          {activeChip === 'cases' && (
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1">
                {['همه', 'Straumann', 'Osstem', 'Dentium', 'Megagen', 'Neodent', 'DIO'].map(brand => (
                  <button
                    key={brand}
                    onClick={() => {
                      selection();
                      setSelectedBrand(brand);
                    }}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                      selectedBrand === brand
                        ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {brand === 'همه' ? 'همه برندها' : brand}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHIP 1: CASES & PROGRESS TIMELINE */}
      {activeChip === 'cases' && (
        <div className="mx-2 space-y-2.5">
          {filteredImplants.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
              کیس ایمپلنتی با این فیلتر یا نام یافت نشد.
            </div>
          ) : (
            filteredImplants.map(imp => {
              const isCollapsed = !!collapsedCards[imp.id];
              const patient = patients.find(p => p.id === imp.patientId);

              return (
                <div
                  key={imp.id}
                  className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2.5 transition-all"
                >
                  {/* Card Header (Collapsible Toggle) */}
                  <div 
                    onClick={() => toggleCardCollapse(imp.id)}
                    className="flex items-start justify-between cursor-pointer select-none"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900">{imp.patientName}</h4>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          {imp.toothNumber}
                        </span>
                        <span className="text-[10px] text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md font-mono font-bold">
                          Ø{imp.diameter}×{imp.length}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 mt-1 block">
                        سیستم: {imp.brand}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-cyan-100 text-cyan-800 border border-cyan-300 font-black px-2.5 py-1 rounded-full shadow-2xs">
                        {getStageTitle(imp.currentStage)}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* 5-Step Process Timeline Tracker (Always visible for quick glance) */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-5 gap-1 text-center text-[9px] font-bold">
                      <div className={`p-1 rounded-lg transition-all ${imp.currentStage === 'fixture_placed' ? 'bg-cyan-600 text-white shadow-2xs' : 'bg-emerald-100 text-emerald-800'}`}>
                        ۱. فیکسچر
                      </div>
                      <div className={`p-1 rounded-lg transition-all ${imp.currentStage === 'healing_cap' ? 'bg-cyan-600 text-white shadow-2xs' : imp.currentStage === 'fixture_placed' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}>
                        ۲. هیلینگ
                      </div>
                      <div className={`p-1 rounded-lg transition-all ${imp.currentStage === 'impression' ? 'bg-cyan-600 text-white shadow-2xs' : ['fixture_placed', 'healing_cap'].includes(imp.currentStage) ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}>
                        ۳. قالب‌گیری
                      </div>
                      <div className={`p-1 rounded-lg transition-all ${imp.currentStage === 'abutment_framework' ? 'bg-cyan-600 text-white shadow-2xs' : ['fixture_placed', 'healing_cap', 'impression'].includes(imp.currentStage) ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}>
                        ۴. اباتمنت
                      </div>
                      <div className={`p-1 rounded-lg transition-all ${imp.currentStage === 'crown_delivered' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'}`}>
                        ۵. روکش
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Deep Details */}
                  {!isCollapsed && (
                    <div className="space-y-2.5 pt-1 border-t border-slate-100 animate-in fade-in">
                      {/* Surgical Details Grid */}
                      <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[9px]">ابعاد فیکسچر</span>
                          <span className="font-bold text-slate-800 font-mono">Ø {imp.diameter} × {imp.length}mm</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9px]">تورک اولیه</span>
                          <span className="font-black text-emerald-600 font-mono">{toPersianDigits(imp.torque)} N/cm</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[9px]">تاریخ جراحی</span>
                          <span className="text-slate-700 font-mono">{toPersianDigits(imp.surgeryDate)}</span>
                        </div>
                      </div>

                      {/* Clinical Notes & Grafts */}
                      <div className="flex items-center justify-between text-[11px] bg-cyan-50/50 p-2 rounded-xl border border-cyan-100">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${imp.boneGraft ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                            {imp.boneGraft ? 'پودر استخوان (Graft)' : 'بدون پودر استخوان'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${imp.membrane ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                            {imp.membrane ? 'ممبرین کلاژن' : 'بدون ممبرین'}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-500 font-mono">
                          موعد هیلینگ: {toPersianDigits(imp.healingDueDate || getRelativePersianDate(60))}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedWarrantyCase(imp)}
                            className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>شناسنامه و گارانتی</span>
                          </button>

                          {patient && (
                            <button
                              onClick={() => onOpenPatientFile(patient)}
                              className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>پرونده کامل</span>
                            </button>
                          )}
                        </div>

                        {imp.currentStage !== 'crown_delivered' ? (
                          <button
                            onClick={() => {
                              impactHeavy();
                              const next = getNextStage(imp.currentStage);
                              onAdvanceStage(imp.id, next);
                              showToast(`مرحله ایمپلنت با موفقیت ارتقا یافت.`);
                            }}
                            className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-black text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{getNextStageButtonText(imp.currentStage)}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>پروتز با موفقیت تحویل شد</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CHIP 2: STAGES & REMINDER CALENDAR */}
      {activeChip === 'reminders' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-600" />
                <h4 className="text-xs font-black text-slate-800">یادآوری‌های هوشمند دوره‌های استئواینتگریشن</h4>
              </div>
              <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md font-mono font-bold">
                محاسبه خودکار بر اساس تراکم استخوان
              </span>
            </div>

            <div className="space-y-2">
              {allImplants.map(imp => {
                const daysRemaining = imp.currentStage === 'fixture_placed' ? 45 : imp.currentStage === 'healing_cap' ? 14 : 0;
                return (
                  <div key={imp.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-slate-900 block">{imp.patientName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {imp.toothNumber} · {imp.brand}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {imp.currentStage === 'fixture_placed' ? 'موعد بستن هیلینگ' : imp.currentStage === 'healing_cap' ? 'موعد قالب‌گیری' : 'در حال ساخت روکش'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                      <span className="text-[10px] text-slate-600">
                        تاریخ موعد: <b className="font-mono text-cyan-800">{toPersianDigits(imp.healingDueDate || getRelativePersianDate(60))}</b> ({toPersianDigits(daysRemaining)} روز دیگر)
                      </span>

                      <button
                        onClick={() => {
                          impactLight();
                          showToast(`پیامک یادآوری موعد هیلینگ برای ${imp.patientName} ارسال شد.`);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-cyan-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs hover:bg-cyan-700 active:scale-95 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>ارسال پیامک یادآوری</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CHIP 3: PROSTHETICS & IMPLANT LAB */}
      {activeChip === 'prosthetics' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-cyan-600" />
                <h4 className="text-xs font-black text-slate-800">کارهای پروتزی و لابراتوار ایمپلنت</h4>
              </div>
              <span className="text-[10px] text-slate-400">سفارش و تحویل روکش‌های ایمپلنت</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-100">
                <span className="text-[10px] text-cyan-700 block">روکش‌های پیچی (Screw-Retained)</span>
                <span className="text-base font-black text-cyan-900 font-mono mt-1 block">۸ واحد</span>
              </div>
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-100">
                <span className="text-[10px] text-teal-700 block">روکش‌های سمانته (Cement-Retained)</span>
                <span className="text-base font-black text-teal-900 font-mono mt-1 block">۴ واحد</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h5 className="text-[11px] font-black text-slate-700">اقلام مصرفی پروتز ایمپلنت:</h5>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700">
                  اسکن بادی (Scan Body)
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700">
                  تیتانیوم بیس (Ti-Base)
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-700">
                  اباتمنت زاویه‌دار ۱۵° و ۲۵°
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHIP 4: CATALOG & BRAND SPECS */}
      {activeChip === 'catalog' && (
        <div className="mx-2 space-y-2.5">
          {BRAND_SPECS.map(spec => (
            <div key={spec.brand} className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${spec.color}`} />
                  <h4 className="text-xs font-black text-slate-900">{spec.brand}</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  ساخت {spec.country}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[9px]">نوع اتصال (Connection)</span>
                  <span className="font-bold text-slate-800">{spec.connection}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">تورک پیشنهادی</span>
                  <span className="font-bold text-emerald-600 font-mono">{spec.recommendedTorque}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">دوره هیلینگ</span>
                  <span className="font-bold text-cyan-700 font-mono">{toPersianDigits(spec.healingPeriodMonths)} ماه</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CHIP 5: ALL-ON-4 / ALL-ON-6 BIOMECHANICS & MISCH CANTILEVER ENGINE */}
      {activeChip === 'biomechanics' && (() => {
        const mischMultiplier = bioArch === 'mandible' ? 1.5 : 1.0;
        const maxCantileverMm = Math.round((apSpreadMm * mischMultiplier) * 10) / 10;
        const isCantileverSafe = plannedCantileverMm <= maxCantileverMm;
        const cumulativeTorque = bioTorques.reduce((sum, t) => sum + t, 0);
        const minTorque = Math.min(...bioTorques);
        const isImmediateLoadingSafe = isCantileverSafe && cumulativeTorque >= 120 && minTorque >= 35;
        const leverRatio = Math.round((plannedCantileverMm / apSpreadMm) * 100) / 100;

        return (
          <div className="mx-2 space-y-3">
            {/* Engine Overview Card */}
            <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-[24px] p-4 text-white shadow-xl border border-teal-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/40 flex items-center justify-center font-black">
                    <Zap className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-2">
                      موتور بیومکانیک فول‌آرک (All-on-4 / All-on-6)
                      <span className="text-[9px] bg-teal-500/30 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded-full font-mono">
                        Misch Guideline
                      </span>
                    </h4>
                    <p className="text-[10.5px] text-teal-200/80 mt-0.5">
                      محاسبه A-P Spread، حد کانتلیور مجاز و احراز صلاحیت بارگذاری فوری (Immediate Loading)
                    </p>
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-xl border text-center ${
                  isImmediateLoadingSafe 
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                    : 'bg-rose-500/20 border-rose-400 text-rose-300'
                }`}>
                  <span className="text-[9px] block font-bold">وضعیت بارگذاری فوری</span>
                  <span className="text-xs font-black">
                    {isImmediateLoadingSafe ? '✓ تایید و ایمن' : '⚠️ غیرمجاز / پرخطر'}
                  </span>
                </div>
              </div>

              {/* Arch & Setup Toggle */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-teal-800/60">
                <div className="bg-slate-800/80 p-2 rounded-xl border border-teal-800/50">
                  <label className="text-[10px] text-teal-300 font-bold block mb-1">فک جراحی:</label>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        selection();
                        setBioArch('mandible');
                      }}
                      className={`py-1 rounded-lg transition-all ${
                        bioArch === 'mandible' ? 'bg-teal-500 text-black font-black' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      مندیبل (پایین ×1.5)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selection();
                        setBioArch('maxilla');
                      }}
                      className={`py-1 rounded-lg transition-all ${
                        bioArch === 'maxilla' ? 'bg-teal-500 text-black font-black' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ماگزیلا (بالا ×1.0)
                    </button>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-2 rounded-xl border border-teal-800/50">
                  <label className="text-[10px] text-teal-300 font-bold block mb-1">آرایش فیکسچرها:</label>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        selection();
                        setBioConfig('all_on_4');
                        setBioTorques([45, 40, 45, 50]);
                      }}
                      className={`py-1 rounded-lg transition-all ${
                        bioConfig === 'all_on_4' ? 'bg-teal-500 text-black font-black' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      All-on-4 (۴ فیکسچر)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selection();
                        setBioConfig('all_on_6');
                        setBioTorques([45, 40, 40, 45, 45, 50]);
                      }}
                      className={`py-1 rounded-lg transition-all ${
                        bioConfig === 'all_on_6' ? 'bg-teal-500 text-black font-black' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      All-on-6 (۶ فیکسچر)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations & Sliders Card */}
            <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 space-y-3.5">
              <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
                <span>پارامترهای هندسی و بیومکانیک کانتلیور پروتز:</span>
              </h5>

              {/* A-P Spread Slider */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    فاصله قدامی-خلفی فیکسچرها (A-P Spread):
                  </span>
                  <span className="font-mono font-black text-sm text-teal-700">
                    {toPersianDigits(apSpreadMm)} میلی‌متر
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="24"
                  step="0.5"
                  value={apSpreadMm}
                  onChange={(e) => setApSpreadMm(parseFloat(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">
                  فاصله بین خط متصل‌کننده لبه مزیال قدامی‌ترین فیکسچر تا خط دیستال خلفی‌ترین فیکسچر
                </span>
              </div>

              {/* Planned Cantilever Slider */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    طول کانتلیور طراحی‌شده پروتز نهایی:
                  </span>
                  <span className={`font-mono font-black text-sm ${
                    isCantileverSafe ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {toPersianDigits(plannedCantileverMm)} میلی‌متر
                  </span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="28"
                  step="0.5"
                  value={plannedCantileverMm}
                  onChange={(e) => setPlannedCantileverMm(parseFloat(e.target.value))}
                  className={`w-full cursor-pointer ${isCantileverSafe ? 'accent-emerald-600' : 'accent-rose-600'}`}
                />
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">
                    حداکثر طول مجاز کانتلیور طبق معیار Misch: <strong>{toPersianDigits(maxCantileverMm)} میلی‌متر</strong>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-full ${
                    isCantileverSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isCantileverSafe ? '✓ در محدوده ایمن Misch' : '⚠️ فراتر از حد مجاز اهرم'}
                  </span>
                </div>
              </div>

              {/* Insertion Torque Inputs */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">گشتاور استقرار فیکسچرها (Insertion Torque):</span>
                  <span className="font-mono text-xs text-slate-600">
                    مجموع گشتاور: <strong className="text-teal-800 text-sm">{toPersianDigits(cumulativeTorque)} N/cm</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {bioTorques.map((t, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500 block mb-1">فیکسچر #{toPersianDigits(idx + 1)}</span>
                      <div className="flex items-center justify-center gap-1 font-mono">
                        <input
                          type="number"
                          min="20"
                          max="70"
                          step="5"
                          value={t}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 35;
                            setBioTorques(prev => prev.map((old, i) => i === idx ? val : old));
                          }}
                          className="w-14 text-center font-black text-sm border border-slate-300 rounded-lg p-1 text-slate-800 focus:outline-none focus:border-teal-500"
                        />
                        <span className="text-[9px] text-slate-400">N/cm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Biomechanical Summary Metric Cards */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-2xl bg-teal-50/80 border border-teal-200">
                  <span className="text-[9.5px] text-teal-800 block font-bold">ضریب اهرم Misch</span>
                  <span className="font-mono font-black text-sm text-teal-900 mt-0.5 block">
                    {toPersianDigits(leverRatio)}×
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-cyan-50/80 border border-cyan-200">
                  <span className="text-[9.5px] text-cyan-800 block font-bold">حد مجاز کانتلیور</span>
                  <span className="font-mono font-black text-sm text-cyan-900 mt-0.5 block">
                    {toPersianDigits(maxCantileverMm)} mm
                  </span>
                </div>
                <div className={`p-2.5 rounded-2xl border ${
                  isImmediateLoadingSafe ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <span className="text-[9.5px] block font-bold">ایمنی بارگذاری</span>
                  <span className="font-mono font-black text-sm mt-0.5 block">
                    {isImmediateLoadingSafe ? '۱۰۰٪ ایمن' : 'هشدار اهرم'}
                  </span>
                </div>
              </div>

              {/* Clinical Advisory Alert */}
              {!isCantileverSafe && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="block font-black">هشدار شکست اهرم بیومکانیکی (Misch Overhang):</strong>
                    <p className="text-[11px] leading-relaxed">
                      طول کانتلیور انتخابی ({toPersianDigits(plannedCantileverMm)} mm) فراتر از حد مجاز ({toPersianDigits(maxCantileverMm)} mm) است. این امر گشتاور چرخشی و نیروی اهرمی مخرب ایجاد کرده و احتمال شل شدن پیچ اباتمنت، شکست فریم‌ورک و تحلیل استخوان کرستال فیکسچر خلفی را به شدت بالا می‌برد.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {selectedWarrantyCase && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border-2 border-amber-300 shadow-2xl space-y-3.5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500" />
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center text-amber-600">
              <Award className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-900">شناسنامه و گارانتی اصالت ایمپلنت</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">کلینیک دندانپزشکی تخصصی مینادنتال</p>
            </div>

            <div className="bg-amber-50/60 rounded-2xl p-3 border border-amber-100 text-right space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">نام بیمار:</span>
                <span className="font-black text-slate-900">{selectedWarrantyCase.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">موقعیت دندان:</span>
                <span className="font-bold text-slate-900 font-mono">{selectedWarrantyCase.toothNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">برند فیکسچر:</span>
                <span className="font-bold text-slate-900">{selectedWarrantyCase.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">قطر و طول:</span>
                <span className="font-mono font-bold text-slate-900">Ø {selectedWarrantyCase.diameter} × {selectedWarrantyCase.length}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تورک اولیه:</span>
                <span className="font-mono font-bold text-emerald-600">{toPersianDigits(selectedWarrantyCase.torque)} N/cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">تاریخ کاشت:</span>
                <span className="font-mono font-bold text-slate-900">{toPersianDigits(selectedWarrantyCase.surgeryDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">گارانتی:</span>
                <span className="font-bold text-emerald-700">مادام‌العمر (Lifetime Guarantee)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setSelectedWarrantyCase(null)}
                className="w-1/2 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                بستن
              </button>
              <button
                onClick={() => {
                  showToast('شناسنامه به پرینتر کلینیک ارسال گردید.');
                  setSelectedWarrantyCase(null);
                }}
                className="w-1/2 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/25 active:scale-95 transition-all"
              >
                چاپ شناسنامه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Implant Surgical Case Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-cyan-50/90 via-white to-slate-50 text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-cyan-200/90 p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-cyan-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">ثبت جراحی کاشت ایمپلنت جدید</h3>
                  <span className="text-[10px] text-cyan-700 font-bold">پرونده جراحی و فیکسچر</span>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateImplant} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">انتخاب بیمار</label>
                <select
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-cyan-500 shadow-2xs"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} ({p.fileNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">دندان هدف جراحی (سیستم پالمر)</label>
                <input
                  type="text"
                  value={formTooth}
                  onChange={(e) => setFormTooth(e.target.value)}
                  placeholder="مثال: دندان ۶ پایین راست (LR6)"
                  className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">سیستم ایمپلنت</label>
                <select
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-cyan-500 shadow-2xs"
                >
                  <option value="اشترومن Straumann (BLX/SLA)">اشترومن (Straumann BLX)</option>
                  <option value="اوستم Osstem (TSIII SA)">اوستم (Osstem TSIII)</option>
                  <option value="دنتیوم Dentium (SuperLine)">دنتیوم (Dentium SuperLine)</option>
                  <option value="مگاژن Megagen (AnyRidge)">مگاژن (Megagen AnyRidge)</option>
                  <option value="نئودنت Neodent (Grand Morse)">نئودنت (Neodent Grand Morse)</option>
                  <option value="دیو DIO (SM/UFII)">دیو (DIO SM)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">قطر فیکسچر (mm)</label>
                  <input
                    type="text"
                    value={formDiameter}
                    onChange={(e) => setFormDiameter(e.target.value)}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-2 py-2 text-slate-900 text-center font-mono focus:outline-none focus:border-cyan-500 shadow-2xs"
                    placeholder="۴.۲"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">طول فیکسچر (mm)</label>
                  <input
                    type="text"
                    value={formLength}
                    onChange={(e) => setFormLength(e.target.value)}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-2 py-2 text-slate-900 text-center font-mono focus:outline-none focus:border-cyan-500 shadow-2xs"
                    placeholder="۱۰"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">تورک اولیه (N/cm)</label>
                  <input
                    type="number"
                    value={formTorque}
                    onChange={(e) => setFormTorque(Number(e.target.value))}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-2 py-2 text-slate-900 text-center font-mono focus:outline-none focus:border-cyan-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">کیفیت استخوان (Density)</label>
                  <select
                    value={formBoneDensity}
                    onChange={(e) => setFormBoneDensity(e.target.value as any)}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-2 py-2 text-slate-900 font-medium focus:outline-none focus:border-cyan-500 shadow-2xs"
                  >
                    <option value="D1">D1 (بسیار متراکم - کورتیکال)</option>
                    <option value="D2">D2 (ایده‌آل - ترابکولار فشرده)</option>
                    <option value="D3">D3 (تراکم متوسط)</option>
                    <option value="D4">D4 (اسفنجی نرم - ماگزیلا)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">طول دوره هیلینگ</label>
                  <select
                    value={formHealingMonths}
                    onChange={(e) => setFormHealingMonths(Number(e.target.value))}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-2 py-2 text-slate-900 font-medium focus:outline-none focus:border-cyan-500 shadow-2xs"
                  >
                    <option value={2}>۲ ماه (فوری / استخوان D1-D2)</option>
                    <option value={3}>۳ ماه (استاندارد)</option>
                    <option value={4}>۴ ماه (همراه پیوند استخوان)</option>
                    <option value={6}>۶ ماه (سینوس لیفت باز)</option>
                  </select>
                </div>
              </div>

              {/* Grafts Checkboxes */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-cyan-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formBoneGraft}
                    onChange={(e) => setFormBoneGraft(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="font-bold text-slate-800">پیوند پودر استخوان (Bone Graft)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formMembrane}
                    onChange={(e) => setFormMembrane(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="font-bold text-slate-800">ممبرین کلاژن</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">تاریخ کاشت</label>
                  <input
                    type="text"
                    value={formSurgeryDate}
                    onChange={(e) => setFormSurgeryDate(e.target.value)}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-cyan-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">جراح معالج</label>
                  <input
                    type="text"
                    value={formDoctor}
                    onChange={(e) => setFormDoctor(e.target.value)}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs"
                  />
                </div>
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
                  className="w-2/3 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black shadow-md shadow-cyan-600/25 active:scale-95 transition-all"
                >
                  ثبت پرونده جراحی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
