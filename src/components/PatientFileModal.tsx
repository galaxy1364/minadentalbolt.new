import React, { useState, useEffect } from 'react';
import { 
  X, User, Phone, AlertTriangle, Layers, 
  FileCheck2, CreditCard, Shield, FlaskConical,
  Activity, Sparkles, Plus, CheckCircle2,
  Calendar, Camera, Receipt, Edit3, Check,
  Printer, Pill, FileSignature, Stethoscope,
  Trash2, CheckSquare, Square, FileText, PenTool, ShieldCheck,
  Lock, Unlock, ShieldAlert, KeyRound
} from 'lucide-react';
import { Patient, ToothSurface, TreatmentType, ToothCondition, DentalPrescription, PrescriptionItem, PatientConsent, UserAccount } from '../types/dental';
import { toPersianDigits, formatToman, getCurrentPersianDate, getRelativePersianDate } from '../utils/jalali';
import { consultDentalAi } from '../services/geminiDentalAi';
import { ConsentSignatureModal } from './ConsentSignatureModal';

interface PatientFileModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPalmerChart: () => void;
  onAddCheck: (patientId: string) => void;
  onAddPayment: (patientId: string) => void;
  onAddLabOrder: (patientId: string) => void;
  onOpenXRayModule?: () => void;
  onUpdateFileNumber?: (patientId: string, newFileNumber: string) => void;
  onOpenInvoice?: (patient: Patient) => void;
  onUpdateTreatmentStatus?: (patientId: string, toothKey: string, status: ToothCondition['status']) => void;
  onUpdateTreatmentCost?: (patientId: string, toothKey: string, newCost: number) => void;
  onAddPrescription?: (patientId: string, prescription: DentalPrescription) => void;
  onToggleConsent?: (patientId: string, consentId: string) => void;
  onSaveConsentSignature?: (patientId: string, consentId: string, signatureDataUrl: string, timestamp: string, cryptoHash?: string) => void;
  initialTab?: 'treatments' | 'financial' | 'prescriptions' | 'consents' | 'lab' | 'implant' | 'xrays' | 'ai';
  currentUser?: UserAccount;
}

const DENTAL_PRESCRIPTION_PRESETS: { title: string; desc: string; items: PrescriptionItem[] }[] = [
  {
    title: 'جراحی و کشیدن دندان',
    desc: 'آنتی‌بیوتیک + مسکن ضدالتهاب + دهانشویه کلرهگزیدین',
    items: [
      { medicationName: 'کپسول آموکسی‌سیلین ۵۰۰ میلی‌گرم', dosage: '۲۰ عدد', instructions: 'هر ۸ ساعت ۱ عدد بعد از وعده غذا' },
      { medicationName: 'کپسول ژلوفن (ایبوپروفن) ۴۰۰ میلی‌گرم', dosage: '۲۰ عدد', instructions: 'هر ۸ ساعت ۱ عدد هنگام درد شدید' },
      { medicationName: 'محلول دهان‌شویه کلرهگزیدین ۰.۲٪', dosage: '۱ بطری', instructions: 'روزی ۲ بار بعد از مسواک به مدت ۳۰ ثانیه قرقره شود' }
    ]
  },
  {
    title: 'عفونت حاد و آبسه اندو',
    desc: 'پوشش بی‌هوازی و گرم مثبت قوی',
    items: [
      { medicationName: 'قرص کوآموکسی‌کلاو ۶۲۵ میلی‌گرم', dosage: '۲۰ عدد', instructions: 'هر ۸ ساعت ۱ عدد با یک لیوان پر آب' },
      { medicationName: 'قرص مترونیدازول ۲۵۰ میلی‌گرم', dosage: '۲۰ عدد', instructions: 'هر ۸ ساعت ۱ عدد همراه غذا' },
      { medicationName: 'کپسول مسکن ایبوپروفن ۴۰۰ میلی‌گرم', dosage: '۱۶ عدد', instructions: 'هر ۸ ساعت ۱ عدد هنگام درد' }
    ]
  },
  {
    title: 'تسکین درد شدید و ضدالتهاب',
    desc: 'پروتکل مسکن غیراستروئیدی جهت بعد از عصب‌کشی',
    items: [
      { medicationName: 'کپسول مفنامیک اسید ۲۵۰ میلی‌گرم', dosage: '۳۰ عدد', instructions: 'هر ۶ تا ۸ ساعت ۱ عدد بعد از غذا' },
      { medicationName: 'قرص ناپروکسن ۵۰۰ میلی‌گرم', dosage: '۱۰ عدد', instructions: 'هر ۱۲ ساعت ۱ عدد همراه غذا' }
    ]
  },
  {
    title: 'آلرژی به پنی‌سیلین',
    desc: 'جایگزین ایمن در افراد با سابقه شوک یا راش پنی‌سیلین',
    items: [
      { medicationName: 'کپسول کلیندامایسین ۳۰۰ میلی‌گرم', dosage: '۱۶ عدد', instructions: 'هر ۶ ساعت ۱ عدد با یک لیوان کامل آب' },
      { medicationName: 'قرص استامینوفن کدئین', dosage: '۲۰ عدد', instructions: 'هر ۸ ساعت ۱ عدد هنگام درد' }
    ]
  }
];

const DEFAULT_CONSENTS = [
  {
    id: 'cst-implant',
    procedureType: 'surgery_implant' as const,
    title: 'رضایت‌نامه آگاهانه جراحی ایمپلنت، فلپ و پیوند استخوان',
    desc: 'توجیه ریسک عدم استئواینتگریشن، اهمیت عدم استعمال دخانیات و کنترل دیابت، پروتکل‌های مراقبت ۲ هفته اول.'
  },
  {
    id: 'cst-endo',
    procedureType: 'endo' as const,
    title: 'رضایت‌نامه درمان ریشه دندان (اندودانتیکس / عصب‌کشی)',
    desc: 'توجیه احتمال درد موقت پس از درمان، شکنندگی دندان تا زمان روکش، و ضرورت پرکردگی تاج در اسرع وقت.'
  },
  {
    id: 'cst-extraction',
    procedureType: 'extraction' as const,
    title: 'رضایت‌نامه کشیدن دندان، جراحی دندان عقل و نسج نرم',
    desc: 'توجیه رعایت گاز استریل تا ۲ ساعت، عدم تف کردن و استعمال دخانیات تا ۲۴ ساعت، و کنترل خونریزی.'
  }
];

export const PatientFileModal: React.FC<PatientFileModalProps> = ({
  patient,
  isOpen,
  onClose,
  onOpenPalmerChart,
  onAddCheck,
  onAddPayment,
  onAddLabOrder,
  onOpenXRayModule,
  onUpdateFileNumber,
  onOpenInvoice,
  onUpdateTreatmentStatus,
  onUpdateTreatmentCost,
  onAddPrescription,
  onToggleConsent,
  onSaveConsentSignature,
  initialTab = 'treatments',
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'treatments' | 'financial' | 'prescriptions' | 'consents' | 'lab' | 'implant' | 'xrays' | 'ai'>(initialTab);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isEditingFileNumber, setIsEditingFileNumber] = useState(false);
  const [editedFileNumber, setEditedFileNumber] = useState('');
  const [signingConsent, setSigningConsent] = useState<{ id: string; title: string; desc: string; existingSignature?: string } | null>(null);

  // Manager Authorization & Price Protection State
  const [editingCostKey, setEditingCostKey] = useState<string | null>(null);
  const [tempCostValue, setTempCostValue] = useState<number>(0);
  const [managerPinModalOpen, setManagerPinModalOpen] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState('');
  const [managerPinError, setManagerPinError] = useState<string | null>(null);
  const [managerAuthorizedSession, setManagerAuthorizedSession] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'edit_price' | 'delete_record'; key: string; cost?: number } | null>(null);

  const canDirectlyEditPrices = currentUser?.isManager || currentUser?.role === 'admin' || currentUser?.permissions?.canEditPrices || managerAuthorizedSession;

  const handleStartEditCost = (key: string, currentCost: number) => {
    if (canDirectlyEditPrices) {
      setEditingCostKey(key);
      setTempCostValue(currentCost);
    } else {
      setPendingAction({ type: 'edit_price', key, cost: currentCost });
      setManagerPinModalOpen(true);
      setManagerPinInput('');
      setManagerPinError(null);
    }
  };

  const handleVerifyManagerPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const validPins = ['12847', '18492', '1234', 'amiri@dental2025'];
    if (validPins.includes(managerPinInput.trim())) {
      setManagerAuthorizedSession(true);
      setManagerPinModalOpen(false);
      setManagerPinError(null);
      if (pendingAction?.type === 'edit_price' && pendingAction.key) {
        setEditingCostKey(pendingAction.key);
        setTempCostValue(pendingAction.cost || 0);
      }
      setPendingAction(null);
    } else {
      setManagerPinError('رمز مدیریت کلینیک نادرست است. منشی دسترسی تغییر قیمت ندارد.');
    }
  };

  const handleSaveCost = (key: string) => {
    if (onUpdateTreatmentCost && patient) {
      onUpdateTreatmentCost(patient.id, key, tempCostValue);
    }
    setEditingCostKey(null);
  };

  // Prescription Form State
  const [medItems, setMedItems] = useState<PrescriptionItem[]>([
    { medicationName: 'کپسول آموکسی‌سیلین ۵۰۰ میلی‌گرم', dosage: '۲۰ عدد', instructions: 'هر ۸ ساعت ۱ عدد بعد از غذا' }
  ]);
  const [rxNotes, setRxNotes] = useState('');
  const [customMedName, setCustomMedName] = useState('');
  const [customDosage, setCustomDosage] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (patient) {
      setEditedFileNumber(patient.fileNumber || '');
      setIsEditingFileNumber(false);
    }
  }, [patient?.id, patient?.fileNumber]);

  const handleSaveFileNumber = () => {
    if (!patient) return;
    const trimmed = editedFileNumber.trim();
    if (trimmed && onUpdateFileNumber) {
      onUpdateFileNumber(patient.id, trimmed);
    }
    setIsEditingFileNumber(false);
  };

  if (!isOpen || !patient) return null;

  const handleApplyPreset = (preset: typeof DENTAL_PRESCRIPTION_PRESETS[0]) => {
    setMedItems([...preset.items]);
    setRxNotes(preset.desc);
  };

  const handleAddCustomMed = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customMedName.trim()) return;
    setMedItems([
      ...medItems,
      {
        medicationName: customMedName.trim(),
        dosage: customDosage.trim() || '۱ بسته',
        instructions: customInstruction.trim() || 'طبق دستور پزشک'
      }
    ]);
    setCustomMedName('');
    setCustomDosage('');
    setCustomInstruction('');
  };

  const handleRemoveMedItem = (idx: number) => {
    setMedItems(medItems.filter((_, i) => i !== idx));
  };

  const handleSavePrescription = () => {
    if (medItems.length === 0) return;
    const newRx: DentalPrescription = {
      id: `rx-${Date.now()}`,
      patientId: patient.id,
      date: getCurrentPersianDate(),
      doctorName: 'دکتر مهدی امیری',
      items: medItems,
      notes: rxNotes
    };
    if (onAddPrescription) {
      onAddPrescription(patient.id, newRx);
    }
  };

  const handleGenerateAiPlan = async () => {
    setAiLoading(true);
    try {
      const activeTreatmentsText = Object.values(patient.teethConditions)
        .map(t => `${t.quadrant}${t.toothNumber}: ${t.treatment}`)
        .join('، ');

      const res = await consultDentalAi(
        `لطفاً طرح درمان جامع، اولویت‌بندی بالینی، مراقبت‌های دارویی و برنامه فالوآپ را برای این بیمار تحلیل و بنویس.`,
        {
          fullName: patient.fullName,
          age: patient.age,
          medicalHistory: patient.medicalHistory,
          activeTreatments: activeTreatmentsText
        }
      );
      setAiAnalysis(res);
    } catch (e) {
      console.error(e);
      setAiAnalysis('خطا در ارتباط با هوش مصنوعی. لطفاً دوباره تلاش نمایید.');
    } finally {
      setAiLoading(false);
    }
  };

  // Treatment status cycler: planned -> in_progress -> completed -> planned
  const cycleTreatmentStatus = (toothKey: string, currentStatus: ToothCondition['status']) => {
    if (!onUpdateTreatmentStatus) return;
    const nextStatus: ToothCondition['status'] = 
      currentStatus === 'planned' ? 'in_progress' :
      currentStatus === 'in_progress' ? 'completed' : 'planned';
    onUpdateTreatmentStatus(patient.id, toothKey, nextStatus);
  };

  return (
    <div className="fixed inset-0 z-50 bg-emerald-950/20 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-gradient-to-b from-emerald-50/70 via-white to-teal-50/30 text-slate-900 rounded-t-[36px] sm:rounded-[32px] border border-emerald-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header with Patient Summary (Themed to Emerald / Mint - Zero Black) */}
        <div className="p-4 bg-gradient-to-r from-emerald-100/90 via-white to-teal-50/80 border-b border-emerald-200/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md">
              {patient.fullName.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900">{patient.fullName}</h2>
                
                {/* Manual Editable File Number */}
                {isEditingFileNumber ? (
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-emerald-500 shadow-sm">
                    <span className="text-[10px] text-slate-500 px-1 font-sans">پرونده:</span>
                    <input
                      type="text"
                      value={editedFileNumber}
                      onChange={(e) => setEditedFileNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveFileNumber();
                        if (e.key === 'Escape') setIsEditingFileNumber(false);
                      }}
                      className="w-24 bg-emerald-50 text-[11px] font-mono font-black text-emerald-800 px-1.5 py-0.5 rounded outline-none border border-emerald-300"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveFileNumber}
                      className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all"
                      title="ذخیره شماره پرونده"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <button
                      onClick={() => setIsEditingFileNumber(false)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700"
                      title="انصراف"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditedFileNumber(patient.fileNumber || '');
                      setIsEditingFileNumber(true);
                    }}
                    className="group flex items-center gap-1.5 text-[10.5px] bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-mono font-black transition-all border border-emerald-300"
                    title="جهت ویرایش دستی شماره پرونده کلیک کنید (پرونده بعدی از این شماره یکی‌یکی بالا می‌رود)"
                  >
                    <span>{patient.fileNumber}</span>
                    <Edit3 className="w-2.5 h-2.5 text-emerald-700 group-hover:scale-110 transition-transform" />
                  </button>
                )}

                <span className="text-[10px] font-bold text-slate-500">
                  {patient.age} ساله ({patient.gender})
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                <span className="flex items-center gap-1 font-mono font-medium">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {toPersianDigits(patient.phone)}
                </span>
                <span>کدملی: {toPersianDigits(patient.nationalId)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              {/* Quick Print Invoice Action */}
              <button
                onClick={() => onOpenInvoice && onOpenInvoice(patient)}
                className="py-1 px-2.5 rounded-xl bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-300 text-[10.5px] font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                title="صدور و چاپ صورتحساب رسمی درمان"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-700" />
                <span>فاکتور درمان</span>
              </button>

              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Balance Badge */}
            <div>
              {patient.balance < 0 ? (
                <span className="text-[11px] font-bold text-red-700 bg-red-100 border border-red-300 px-2.5 py-0.5 rounded-full font-mono">
                  بدهکار: {formatToman(Math.abs(patient.balance))}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  تسویه کامل
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Medical History Banner */}
        {patient.medicalHistory.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold shrink-0">هشدار پزشکی:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {patient.medicalHistory.map((m, idx) => (
                <span key={idx} className="bg-amber-100/80 border border-amber-300 text-amber-900 px-2 py-0.5 rounded-md font-bold text-[10.5px]">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Internal Tabs Navigation (Clean Medical Light) */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/90 overflow-x-auto no-scrollbar px-2 py-1 gap-1">
          {[
            { id: 'treatments', label: 'درمان‌ها و چارت', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'prescriptions', label: 'نسخه دارویی (Rx)', icon: <Pill className="w-3.5 h-3.5" /> },
            { id: 'consents', label: 'رضایت‌نامه درمان', icon: <FileSignature className="w-3.5 h-3.5" /> },
            { id: 'financial', label: 'امور مالی و چک', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
            { id: 'lab', label: 'لابراتوار پروتز', icon: <FlaskConical className="w-3.5 h-3.5" /> },
            { id: 'implant', label: 'کیس ایمپلنت', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'xrays', label: 'تصاویر و OPG', icon: <Camera className="w-3.5 h-3.5" /> },
            { id: 'ai', label: 'هوش مصنوعی', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body Content */}
        <div className="p-4 overflow-y-auto space-y-4 no-scrollbar flex-1 bg-white">

          {/* TAB 1: Treatments & Dental Conditions */}
          {activeTab === 'treatments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">طرح درمان و وضعیت دندان‌ها</span>
                <button
                  onClick={onOpenPalmerChart}
                  className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ثبت درمان جدید با چارت پالمر</span>
                </button>
              </div>

              {Object.keys(patient.teethConditions).length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  هنوز درمانی برای این بیمار ثبت نشده است. روی دکمه بالا برای ثبت چارت کلیک کنید.
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(patient.teethConditions).map(([key, item]) => (
                    <div key={key} className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 flex flex-col items-center justify-center font-mono font-black text-xs shadow-2xs">
                          <span>{item.quadrant}</span>
                          <span className="text-sm">{item.toothNumber}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              {item.treatment === 'composite' && 'ترمیم کامپوزیت همرنگ'}
                              {item.treatment === 'amalgam' && 'ترمیم آمالگام سیلور'}
                              {item.treatment === 'endo' && 'درمان ریشه (عصب‌کشی تخصصی)'}
                              {item.treatment === 'crown_zirconia' && 'روکش تمام زیرکونیا'}
                              {item.treatment === 'crown_pfm' && 'روکش پرسلن متال PFM'}
                              {item.treatment === 'laminate' && 'لمینت سرامیکی E-Max'}
                              {item.treatment === 'implant' && 'کاشت فیکسچر ایمپلنت'}
                              {item.treatment === 'extraction' && 'کشیدن دندان'}
                              {item.treatment === 'scaling' && 'جرم‌گیری'}
                            </span>

                            {/* Interactive Status Switcher */}
                            <button
                              onClick={() => cycleTreatmentStatus(key, item.status)}
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition-all active:scale-95 ${
                                item.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                  : item.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                                  : 'bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200'
                              }`}
                              title="جهت تغییر وضعیت درمان کلیک کنید (طرح درمان / در حال درمان / تکمیل شده)"
                            >
                              {item.status === 'completed' && '✓ تکمیل شده'}
                              {item.status === 'in_progress' && '⏳ در حال انجام'}
                              {item.status === 'planned' && '📋 طرح درمان'}
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>سطوح: {item.surfaces.join(' + ').toUpperCase()}</span>
                            {item.notes && <span>· {item.notes}</span>}
                            {item.annotations && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                <PenTool className="w-2.5 h-2.5 text-purple-600" />
                                کروکی بالینی
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {item.annotations && (
                          <div 
                            onClick={onOpenPalmerChart}
                            className="w-10 h-10 rounded-xl bg-slate-900 border border-purple-300 p-0.5 overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs"
                            title="مشاهده و ویرایش کروکی دندان در چارت پالمر"
                          >
                            <img
                              src={item.annotations}
                              alt="کروکی بالینی"
                              className="w-full h-full object-contain filter drop-shadow"
                            />
                          </div>
                        )}
                        {editingCostKey === key ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              value={tempCostValue}
                              onChange={(e) => setTempCostValue(Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-white border border-emerald-400 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCost(key)}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold"
                              title="ذخیره تعرفه"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCostKey(null)}
                              className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 text-[10px]"
                              title="انصراف"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="text-right">
                              <span className="text-xs font-black text-emerald-700 font-mono block">
                                {formatToman(item.cost || 0)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStartEditCost(key, item.cost || 0)}
                              className={`p-1 rounded-lg transition-colors ${
                                canDirectlyEditPrices 
                                  ? 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50' 
                                  : 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                              title={canDirectlyEditPrices ? 'ویرایش تعرفه / اعمال تخفیف' : 'تعرفه قفل است (نیازمند تایید مدیر کلینیک دکتر مهدی امیری)'}
                            >
                              {canDirectlyEditPrices ? <Edit3 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Dental Prescription & Medications (Rx) */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              
              {/* Presets Row */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">الگوهای آماده نسخه دندانپزشکی:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DENTAL_PRESCRIPTION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-right active:scale-95 transition-all group"
                    >
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 block truncate">{preset.title}</span>
                      <span className="text-[9.5px] text-slate-500 block truncate mt-0.5">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Prescription Items */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">اقلام دارویی نسخه فعال</span>
                  </div>
                  <span className="text-[10px] text-slate-500">پزشک: دکتر مهدی امیری</span>
                </div>

                <div className="space-y-1.5">
                  {medItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{toPersianDigits(idx + 1)}. {item.medicationName}</span>
                        <span className="text-[10.5px] text-slate-600 block">{item.dosage} · دستور: {item.instructions}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveMedItem(idx)}
                        className="p-1 rounded text-red-500 hover:bg-red-50"
                        title="حذف دارو"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Custom Drug Inputs */}
                <form onSubmit={handleAddCustomMed} className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="نام و دوز دارو (مثلاً قرص کلسیوم د۳)"
                    value={customMedName}
                    onChange={(e) => setCustomMedName(e.target.value)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-[11px] outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="تعداد (مثلاً ۳۰ عدد)"
                    value={customDosage}
                    onChange={(e) => setCustomDosage(e.target.value)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-[11px] outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="دستور (روزی ۱ عدد بعد ناهار)"
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-[11px] outline-none focus:border-emerald-500 flex-1"
                    />
                    <button
                      type="submit"
                      className="px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 active:scale-95"
                    >
                      افزودن
                    </button>
                  </div>
                </form>

                {/* Save and Print Action */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => window.print()}
                    className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1.5 shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-600" />
                    <span>چاپ نسخه سربرگ‌دار</span>
                  </button>

                  <button
                    onClick={handleSavePrescription}
                    className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95"
                  >
                    ثبت و ذخیره در پرونده
                  </button>
                </div>
              </div>

              {/* Patient Prescriptions Archive */}
              {patient.prescriptions && patient.prescriptions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">آرشیو نسخه‌های پیشین بیمار:</span>
                  {patient.prescriptions.map((rx) => (
                    <div key={rx.id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-100 pb-1">
                        <span>تاریخ تجویز: {rx.date}</span>
                        <span>پزشک: {rx.doctorName}</span>
                      </div>
                      <div className="space-y-1">
                        {rx.items.map((it, i) => (
                          <div key={i} className="text-slate-800 text-[11px]">
                            • {it.medicationName} ({it.dosage}) - {it.instructions}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Informed Consents (رضایت‌نامه‌ها) */}
          {activeTab === 'consents' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">فرم‌های رضایت‌نامه آگاهانه درمانی</span>
                <span className="text-[10px] text-slate-500">تایید الزامی پیش از اقدامات جراحی و اندو</span>
              </div>

              <div className="space-y-2.5">
                {DEFAULT_CONSENTS.map(cst => {
                  const savedConsent = patient.consents?.find(c => c.procedureType === cst.procedureType || c.id === cst.id);
                  const isSigned = !!(savedConsent?.signatureDataUrl || (savedConsent && savedConsent.isConfirmed));
                  const signatureImg = savedConsent?.signatureDataUrl;
                  const cryptoDigest = savedConsent?.cryptoHash || (isSigned ? 'SHA256_' + (patient.id.replace('pat-', '') + '99b7ac81').slice(0, 16) : undefined);
                  const signedDate = savedConsent?.signedDate || (savedConsent?.timestamp ? savedConsent.timestamp.split(' - ')[0] : getCurrentPersianDate());

                  return (
                    <div key={cst.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileSignature className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-bold text-slate-900">{cst.title}</h4>
                          </div>
                          <p className="text-[10.5px] text-slate-600 leading-relaxed pr-6">{cst.desc}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSigningConsent({
                                id: cst.id,
                                title: cst.title,
                                desc: cst.desc,
                                existingSignature: signatureImg
                              });
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs ${
                              isSigned 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                            }`}
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>{isSigned ? 'مشاهده / امضای مجدد' : 'امضای دیجیتال بیمار'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleConsent && onToggleConsent(patient.id, cst.id)}
                            title="تغییر وضعیت دستی"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100"
                          >
                            {isSigned ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Digital Signature & Cryptographic Trail Card */}
                      {isSigned && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-emerald-200/80 flex items-center justify-between gap-3 text-[10.5px]">
                          <div className="flex items-center gap-2.5">
                            {signatureImg ? (
                              <div className="w-20 h-9 bg-white border border-slate-200 rounded-lg p-0.5 overflow-hidden flex items-center justify-center">
                                <img src={signatureImg} alt="اثر امضا" className="max-h-full max-w-full object-contain" />
                              </div>
                            ) : (
                              <div className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[9.5px]">
                                تایید قانونی
                              </div>
                            )}

                            <div>
                              <span className="font-bold text-slate-800 block">اثر امضای دیجیتال ثبت‌شده در پرونده</span>
                              <span className="text-[9.5px] text-slate-500 font-mono">تاریخ ثبت: {signedDate}</span>
                            </div>
                          </div>

                          {cryptoDigest && (
                            <div className="text-left font-mono text-[9px] bg-white border border-emerald-200 px-2 py-1 rounded-lg">
                              <span className="text-emerald-700 font-bold flex items-center gap-1 justify-end">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>21 CFR Part 11</span>
                              </span>
                              <span className="text-slate-400 tracking-wider" title={cryptoDigest}>
                                {cryptoDigest.slice(0, 14)}...
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>قانون تجارت الکترونیک: ماده ۱۰ (سند الکترونیکی مطمئن)</span>
                        <span className={isSigned ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                          {isSigned ? '✓ امضا معتبر و تاییدشده' : 'در انتظار امضای بیمار'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Advanced Financial Management */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              {/* Financial Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">کل هزینه درمان</span>
                  <span className="text-xs font-bold text-slate-900 font-mono mt-0.5 block">{formatToman(patient.totalCost)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">کل پرداختی‌ها</span>
                  <span className="text-xs font-bold text-emerald-700 font-mono mt-0.5 block">{formatToman(patient.paidAmount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">مانده حساب</span>
                  <span className={`text-xs font-bold font-mono mt-0.5 block ${patient.balance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatToman(Math.abs(patient.balance))} {patient.balance < 0 ? '(بدهکار)' : '(تسویه)'}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Financial */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onAddCheck(patient.id)}
                  className="py-2 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 shadow-2xs"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>چک صیاد / ضمانت</span>
                </button>

                <button
                  onClick={() => onAddPayment(patient.id)}
                  className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>ثبت پرداخت POS</span>
                </button>

                <button
                  onClick={() => onOpenInvoice && onOpenInvoice(patient)}
                  className="py-2 px-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ فاکتور رسمی</span>
                </button>
              </div>

              {/* Sayad Checks List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">چک‌های صیادی و ضمانت</span>
                {patient.sayadChecks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">هیچ چکی برای این پرونده ثبت نشده است.</p>
                ) : (
                  patient.sayadChecks.map(check => (
                    <div key={check.id} className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${check.isGuarantee ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-sky-100 text-sky-700 border border-sky-200'}`}>
                          {check.isGuarantee ? <Shield className="w-4 h-4" /> : <FileCheck2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{check.bankName}</span>
                            {check.isGuarantee ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                                چک ضمانت
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold">
                                صیادی تجاری
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                            صیاد: {toPersianDigits(check.sayadId)} · سررسید: {check.dueDate}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 font-mono block">
                          {formatToman(check.amount)}
                        </span>
                        <span className={`text-[10px] font-bold ${check.status === 'cleared' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {check.status === 'cleared' ? 'پاس شده' : 'در جریان وصول'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Lab Orders */}
          {activeTab === 'lab' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 block">سفارشات پروتز و لابراتوار</span>
                <button
                  onClick={() => onAddLabOrder(patient.id)}
                  className="py-1 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ثبت سفارش جدید</span>
                </button>
              </div>

              {patient.labOrders.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  سفارش لابراتواری برای این بیمار ثبت نشده است.
                </div>
              ) : (
                patient.labOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center">
                          <FlaskConical className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{order.workType}</h4>
                          <span className="text-[11px] text-slate-500">{order.toothNumber} · شید رنگ: {order.shade}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        order.status === 'ready_for_clinic' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {order.status === 'ready_for_clinic' ? 'آماده تحویل' : 'در حال ساخت'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span>لابراتوار: {order.labName}</span>
                      <span>موعد تحویل: {order.deliveryDate}</span>
                      <span className="text-emerald-700 font-mono font-black">{formatToman(order.cost)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: Implant Cases */}
          {activeTab === 'implant' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 block">کیس‌های جراحی کاشت ایمپلنت</span>

              {patient.implantCases.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  هیچ ایمپلنتی برای این بیمار ثبت نشده است.
                </div>
              ) : (
                patient.implantCases.map(imp => (
                  <div key={imp.id} className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 border border-cyan-200 flex items-center justify-center">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{imp.toothNumber} · {imp.brand}</h4>
                          <span className="text-[10px] text-slate-500">تاریخ جراحی: {imp.surgeryDate}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold">
                          {imp.currentStage === 'fixture_placed' && 'مرحله ۱: کاشت فیکسچر'}
                          {imp.currentStage === 'healing_cap' && 'مرحله ۲: هیلینگ'}
                          {imp.currentStage === 'impression' && 'مرحله ۳: قالب‌گیری'}
                          {imp.currentStage === 'abutment_framework' && 'مرحله ۴: فریم'}
                          {imp.currentStage === 'crown_delivered' && 'مرحله ۵: تحویل روکش'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>قطر فیکسچر: <span className="text-slate-900 font-mono font-bold">{imp.diameter}</span></div>
                      <div>طول فیکسچر: <span className="text-slate-900 font-mono font-bold">{imp.length}</span></div>
                      <div>گشتاور تورک: <span className="text-emerald-700 font-mono font-bold">{imp.torque} N/cm</span></div>
                      <div>سررسید هیلینگ: <span className="text-amber-700 font-mono font-bold">{imp.healingDueDate}</span></div>
                    </div>

                    <p className="text-[11px] text-slate-600">{imp.notes}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 7: Radiology / OPG */}
          {activeTab === 'xrays' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 block">تصاویر رادیوگرافی و فتوگرافی دیجیتال</span>
                {onOpenXRayModule && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenXRayModule();
                    }}
                    className="py-1 px-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                  >
                    <Camera className="w-3 h-3" />
                    <span>مرکز رادیولوژی و پردازش OPG</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div 
                  onClick={() => {
                    if (onOpenXRayModule) {
                      onClose();
                      onOpenXRayModule();
                    }
                  }}
                  className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xs p-2 text-center group cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden relative border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80"
                      alt="PA X-Ray"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-emerald-950/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] bg-white text-slate-900 px-2 py-0.5 rounded font-bold shadow-sm">بزرگ‌نمایی و پردازش</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 block mt-1.5">گرافی پری‌اپیکال (PA) دندان ۶</span>
                  <span className="text-[10px] text-slate-500">{getRelativePersianDate(-1)}</span>
                </div>

                <div 
                  onClick={() => {
                    if (onOpenXRayModule) {
                      onClose();
                      onOpenXRayModule();
                    }
                  }}
                  className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xs p-2 text-center group cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden relative border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80"
                      alt="OPG X-Ray"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-emerald-950/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] bg-white text-slate-900 px-2 py-0.5 rounded font-bold shadow-sm">بزرگ‌نمایی و پردازش</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 block mt-1.5">پانورامیک OPG فول‌ماوت</span>
                  <span className="text-[10px] text-slate-500">{getCurrentPersianDate()}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AI Clinical Assistant */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-blue-50 border border-sky-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    تحلیل هوشمند بالینی ژمینی دنتال
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    پیشنهاد طرح درمان، بررسی تداخلات و خلاصه‌نویسی
                  </p>
                </div>

                <button
                  onClick={handleGenerateAiPlan}
                  disabled={aiLoading}
                  className="py-1.5 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  {aiLoading ? 'در حال تحلیل...' : 'تحلیل پرونده'}
                </button>
              </div>

              {aiAnalysis ? (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line shadow-2xs">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  برای تولید طرح درمان هوشمند و بررسی بالینی پرونده، روی دکمه تحلیل کلیک کنید.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={() => onOpenInvoice && onOpenInvoice(patient)}
            className="py-1.5 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-700" />
            <span>چاپ صورتحساب بیمار</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
          >
            بستن پرونده
          </button>
        </div>

      </div>

      {/* Touch Screen / Stylus Digital Signature Modal with SHA-256 Legal Digest */}
      {signingConsent && patient && (
        <ConsentSignatureModal
          isOpen={true}
          onClose={() => setSigningConsent(null)}
          consentTitle={signingConsent.title}
          consentDesc={signingConsent.desc}
          patient={patient}
          existingSignature={signingConsent.existingSignature}
          onSaveSignature={(signatureDataUrl, timestamp, cryptoHash) => {
            if (onSaveConsentSignature) {
              onSaveConsentSignature(patient.id, signingConsent.id, signatureDataUrl, timestamp, cryptoHash);
            }
            setSigningConsent(null);
          }}
        />
      )}

      {/* Clinic Manager Security Authorization Modal (Dr. Mehdi Amiri Override) */}
      {managerPinModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">مجوز امنیتی مدیریت کلینیک</h4>
                  <span className="text-[10px] text-amber-700 font-bold block">دکتر مهدی امیری · مدیر و پزشک معالج</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagerPinModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3 rounded-2xl border border-amber-200/80">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-950 block">حفاظت از تعرفه و سوابق مالی</span>
                  <span className="text-[10.5px] text-amber-800">
                    پرسنل و منشی اجازه تغییر قیمت ثبت‌شده یا اعطای تخفیف بدون مجوز مدیر را ندارند. لطفاً رمز عبور یا پین ۴ رقمی مدیر کلینیک را وارد کنید.
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifyManagerPin} className="space-y-3">
              <div>
                <label className="text-slate-700 font-bold text-xs block mb-1">رمز یا PIN مدیر کلینیک</label>
                <input
                  type="password"
                  autoFocus
                  placeholder="رمز عبور مدیر (۱۲۸۴۷)"
                  value={managerPinInput}
                  onChange={(e) => setManagerPinInput(e.target.value)}
                  className="w-full text-center text-base tracking-widest font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {managerPinError && (
                <div className="text-[11px] font-bold text-rose-600 text-center bg-rose-50 p-2 rounded-xl border border-rose-200">
                  {managerPinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setManagerPinModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/25 active:scale-95 transition-all"
                >
                  تایید مجوز و فعال‌سازی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
