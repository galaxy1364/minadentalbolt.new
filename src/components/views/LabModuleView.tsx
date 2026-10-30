import React, { useState } from 'react';
import { 
  FlaskConical, Plus, CheckCircle2, Clock, 
  AlertTriangle, Bell, Calendar, ChevronLeft,
  Truck, Sparkles, Shield, Send, Check, Search,
  Palette, FileText, Phone, Building2, Layers,
  DollarSign, ArrowUpRight, X, Settings2, SlidersHorizontal, Printer
} from 'lucide-react';
import { LabOrder, LabStatus, Patient } from '../../types/dental';
import { toPersianDigits, formatToman } from '../../utils/jalali';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { LabPrescriptionModal } from '../LabPrescriptionModal';

interface LabModuleViewProps {
  patients: Patient[];
  onOpenPatientFile: (patient: Patient) => void;
  onAddLabOrder: () => void;
  onUpdateStatus: (orderId: string, status: LabStatus) => void;
  onOpenDigitalLabPortal?: () => void;
}

interface PartnerLab {
  id: string;
  name: string;
  type: 'fixed' | 'removable' | 'both';
  typeTitle: string;
  phone: string;
  manager: string;
  address: string;
  avgTurnaroundDays: number;
  activeOrdersCount: number;
  unsettledBalance: number;
}

const DEFAULT_LABS: PartnerLab[] = [
  {
    id: 'lab-1',
    name: 'لابراتوار دیجیتال پیشرو (دکتر کمالی)',
    type: 'fixed',
    typeTitle: 'پروتز ثابت (زیرکونیا، PFM، ایمپلنت)',
    phone: '۰۲۱-۸۸۲۲۳۳۴۴',
    manager: 'مهندس کمالی',
    address: 'تهران، خیابان ولیعصر، بالاتر از ونک',
    avgTurnaroundDays: 5,
    activeOrdersCount: 4,
    unsettledBalance: 12500000
  },
  {
    id: 'lab-2',
    name: 'لابراتوار پروتز پویا (تخصصی متحرک)',
    type: 'removable',
    typeTitle: 'پروتز متحرک (دست‌دندان کامل، پارسیل، کروم کبالت، نایت‌گارد)',
    phone: '۰۲۱-۲۲۳۳۴۴۵۵',
    manager: 'استاد فراهانی',
    address: 'تهران، شریعتی، بالاتر از پل رومی',
    avgTurnaroundDays: 7,
    activeOrdersCount: 2,
    unsettledBalance: 8200000
  },
  {
    id: 'lab-3',
    name: 'لابراتوار زیبایی آریا E-Max',
    type: 'fixed',
    typeTitle: 'پروتز ثابت و زیبایی (لمینت سرامیکی، اینله/آنله)',
    phone: '۰۲۱-۸۸۷۷۶۶۵۵',
    manager: 'آقای صادقی',
    address: 'تهران، ملاصدرا، بعد از بیمارستان بقیه‌الله',
    avgTurnaroundDays: 4,
    activeOrdersCount: 1,
    unsettledBalance: 4500000
  }
];

export const LabModuleView: React.FC<LabModuleViewProps> = ({
  patients,
  onOpenPatientFile,
  onAddLabOrder,
  onUpdateStatus,
  onOpenDigitalLabPortal
}) => {
  const { impactLight, impactHeavy, success, selection } = useHapticFeedback();

  // Active Chip Tab: orders | labs | reminders | settlements
  const [activeChip, setActiveChip] = useState<'orders' | 'labs' | 'reminders' | 'settlements'>('orders');

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLab, setFilterLab] = useState<string>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<LabOrder | null>(null);

  // Partner labs list & add modal
  const [partnerLabs, setPartnerLabs] = useState<PartnerLab[]>(DEFAULT_LABS);
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabType, setNewLabType] = useState<'fixed' | 'removable' | 'both'>('fixed');
  const [newLabPhone, setNewLabPhone] = useState('');
  const [newLabManager, setNewLabManager] = useState('');

  // Reminder settings state
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(2);
  const [autoSmsToPatient, setAutoSmsToPatient] = useState<boolean>(true);
  const [labAlarmNotice, setLabAlarmNotice] = useState<boolean>(true);

  const allLabOrders = patients.flatMap(p => p.labOrders || []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getNextStatus = (current: LabStatus): LabStatus => {
    switch (current) {
      case 'sent': return 'fabrication';
      case 'fabrication': return 'frame_try_in';
      case 'frame_try_in': return 'ready_for_clinic';
      case 'ready_for_clinic': return 'delivered_cemented';
      case 'delivered_cemented': return 'delivered_cemented';
    }
  };

  const getNextStatusLabel = (current: LabStatus): string => {
    switch (current) {
      case 'sent': return 'ارتقا به: تراش CAD/CAM';
      case 'fabrication': return 'ارتقا به: امتحان فریم';
      case 'frame_try_in': return 'ثبت وصول کار در مطب';
      case 'ready_for_clinic': return 'سمان نهایی و تحویل';
      case 'delivered_cemented': return 'پایان یافته';
    }
  };

  const getStatusBadge = (status: LabStatus) => {
    switch (status) {
      case 'sent':
        return <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-sky-300">۱. ارسال به لابراتوار</span>;
      case 'fabrication':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300">۲. تراش CAD/CAM و کوره</span>;
      case 'frame_try_in':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-300">۳. امتحان فریم در دهان</span>;
      case 'ready_for_clinic':
        return <span className="bg-[#c8ff00] text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs border border-[#b8f000] animate-pulse">۴. آماده در مطب</span>;
      case 'delivered_cemented':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">۵. سمان و تحویل بیمار</span>;
    }
  };

  const filteredOrders = allLabOrders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesLab = filterLab === 'all' || order.labName.includes(filterLab);
    const matchesSearch = !searchQuery || 
      order.patientName.includes(searchQuery) ||
      order.workType.includes(searchQuery) ||
      order.toothNumber.includes(searchQuery);
    return matchesStatus && matchesLab && matchesSearch;
  });

  const totalCost = allLabOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
  const readyCount = allLabOrders.filter(o => o.status === 'ready_for_clinic').length;
  const inFabricationCount = allLabOrders.filter(o => o.status === 'sent' || o.status === 'fabrication' || o.status === 'frame_try_in').length;

  const handleAddPartnerLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName) return;
    success();
    const newLab: PartnerLab = {
      id: `lab-${Date.now()}`,
      name: newLabName,
      type: newLabType,
      typeTitle: newLabType === 'fixed' ? 'پروتز ثابت' : newLabType === 'removable' ? 'پروتز متحرک' : 'ثابت و متحرک',
      phone: newLabPhone || '۰۲۱-۸۸۰۰۰۰۰۰',
      manager: newLabManager || 'مدیریت لابراتوار',
      address: 'تهران',
      avgTurnaroundDays: newLabType === 'fixed' ? 5 : 7,
      activeOrdersCount: 0,
      unsettledBalance: 0
    };
    setPartnerLabs([...partnerLabs, newLab]);
    setShowAddLabModal(false);
    setNewLabName('');
    setNewLabPhone('');
    setNewLabManager('');
    showToast(`لابراتوار همکار «${newLab.name}» با موفقیت افزوده شد.`);
  };

  return (
    <div className="pb-28 space-y-3">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#162719] border border-[#c8ff00]/60 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-[#c8ff00] stroke-[3]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-sm border border-slate-100 space-y-3">
          
          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <FlaskConical className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-slate-900 leading-none">لابراتوار</h3>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Animated Search Toggle */}
              <button
                onClick={() => {
                  selection();
                  setSearchOpen(!searchOpen);
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  searchOpen ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="جستجو در سفارشات"
              >
                <Search className="w-4 h-4" />
              </button>

              {onOpenDigitalLabPortal && (
                <button
                  onClick={() => {
                    impactLight();
                    onOpenDigitalLabPortal();
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-xs flex items-center gap-1 transition-all"
                  title="ورود به پورتال تکنسین دندانسازی"
                >
                  <Building2 className="w-3.5 h-3.5 text-purple-700" />
                  <span className="hidden sm:inline">پورتال تکنسین</span>
                </button>
              )}

              <button
                onClick={() => {
                  impactHeavy();
                  onAddLabOrder();
                }}
                className="py-1.5 px-3 rounded-xl bg-[#c8ff00] text-black font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>سفارش جدید</span>
              </button>
            </div>
          </div>

          {/* Animated Expandable Search Input */}
          {searchOpen && (
            <div className="relative animate-in slide-in-from-top-2 duration-150">
              <Search className="w-3.5 h-3.5 text-purple-600 absolute right-3 top-2.5" />
              <input
                type="text"
                autoFocus
                placeholder="جستجو با نام بیمار، شماره دندان، نوع روکش یا نام لابراتوار..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-purple-50/60 border border-purple-200 rounded-xl pr-9 pl-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
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

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] text-slate-400 block">در حال ساخت</span>
              <span className="text-xs font-black text-amber-600 font-mono">{toPersianDigits(inFabricationCount)} مورد</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[9px] text-emerald-600 block">آماده تحویل در مطب</span>
              <span className="text-xs font-black text-emerald-700 font-mono">{toPersianDigits(readyCount)} کار</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] text-slate-400 block">مانده بدهی لابراتوارها</span>
              <span className="text-[10px] font-black text-purple-700 truncate block font-mono">
                {formatToman(partnerLabs.reduce((sum, l) => sum + l.unsettledBalance, 0))}
              </span>
            </div>
          </div>

          {/* 
            CHIP NAVIGATION BAR:
            1. سفارشات و خط روند (کارهای ارسالی و دریافتی)
            2. تعریف لابراتوارها (ثابت و متحرک)
            3. تنظیم یادآوری و آلارم وصول
            4. گزارش مالی و تسویه‌حساب
          */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
            {[
              { id: 'orders', label: `کارهای ارسالی و دریافتی (${toPersianDigits(allLabOrders.length)})`, icon: FlaskConical },
              { id: 'labs', label: `تعریف لابراتوارها (${toPersianDigits(partnerLabs.length)})`, icon: Building2 },
              { id: 'reminders', label: 'تنظیم یادآوری و آلارم', icon: Bell },
              { id: 'settlements', label: 'تسویه‌حساب مالی', icon: DollarSign }
            ].map(chip => {
              const IconComp = chip.icon;
              const isActive = activeChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => {
                    selection();
                    setActiveChip(chip.id as any);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-purple-600 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* TAB 1: ORDERS & 5-STAGE PROGRESS STEPPER */}
      {activeChip === 'orders' && (
        <div className="space-y-3">
          {/* Status Filter Badges */}
          <div className="mx-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'همه وضعیت‌ها' },
              { id: 'sent', label: 'ارسال شده' },
              { id: 'fabrication', label: 'تراش/کوره' },
              { id: 'frame_try_in', label: 'امتحان فریم' },
              { id: 'ready_for_clinic', label: 'آماده در مطب' },
              { id: 'delivered_cemented', label: 'تحویل نهایی' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  selection();
                  setFilterStatus(tab.id);
                }}
                className={`py-1 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  filterStatus === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders List */}
          <div className="mx-2 space-y-2.5">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
                سفارشی با این مشخصات یافت نشد.
              </div>
            ) : (
              filteredOrders.map(order => {
                const stages: LabStatus[] = ['sent', 'fabrication', 'frame_try_in', 'ready_for_clinic', 'delivered_cemented'];
                const currentStageIndex = stages.indexOf(order.status);

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-[24px] p-3.5 shadow-2xs border border-slate-100 space-y-3 hover:shadow-sm transition-all"
                  >
                    {/* Top Row: Patient, Tooth, Status Badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">{order.patientName}</h4>
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                            {order.toothNumber}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 mt-1 block">
                          {order.workType} · رنگ: <strong className="text-purple-700 font-mono">{order.shade || 'A2'}</strong>
                        </span>
                      </div>

                      <div>{getStatusBadge(order.status)}</div>
                    </div>

                    {/* LIVE 5-STAGE PROGRESS STEPPER LINE */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                      <span className="text-[9px] font-bold text-slate-500 block mb-2">خط روند پیشرفت کار پروتزی:</span>
                      
                      <div className="relative flex items-center justify-between" dir="rtl">
                        {/* Connecting background bar */}
                        <div className="absolute top-2.5 right-2 left-2 h-0.5 bg-slate-200 -z-0" />
                        
                        {[
                          { key: 'sent', label: 'ارسال' },
                          { key: 'fabrication', label: 'تراش' },
                          { key: 'frame_try_in', label: 'فریم' },
                          { key: 'ready_for_clinic', label: 'وصول مطب' },
                          { key: 'delivered_cemented', label: 'تحویل' }
                        ].map((st, idx) => {
                          const isDone = idx < currentStageIndex;
                          const isCurrent = idx === currentStageIndex;

                          return (
                            <div 
                              key={st.key} 
                              onClick={() => {
                                impactLight();
                                onUpdateStatus(order.id, st.key as LabStatus);
                                showToast(`وضعیت سفارش به «${st.label}» تغییر یافت.`);
                              }}
                              className="flex flex-col items-center z-10 cursor-pointer group"
                              title={`تغییر سریع به مرحله ${st.label}`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isCurrent 
                                  ? 'bg-[#c8ff00] text-black ring-4 ring-[#c8ff00]/30 font-black scale-110 shadow-xs' 
                                  : isDone 
                                  ? 'bg-purple-600 text-white' 
                                  : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-purple-400'
                              }`}>
                                {isDone ? '✓' : toPersianDigits(idx + 1)}
                              </div>
                              <span className={`text-[8.5px] mt-1 font-bold whitespace-nowrap ${
                                isCurrent ? 'text-purple-900 font-black' : isDone ? 'text-slate-700' : 'text-slate-400'
                              }`}>
                                {st.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lab & Timing Details */}
                    <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px]">لابراتوار همکار</span>
                        <span className="font-bold text-slate-800 truncate block">{order.labName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">موعد تحویل</span>
                        <span className="font-mono font-bold text-slate-800">{toPersianDigits(order.deliveryDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">هزینه لابراتوار</span>
                        <span className="font-mono font-bold text-purple-700">{formatToman(order.cost || 2500000)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            impactLight();
                            showToast(`پیامک اطلاع‌رسانی آماده بودن کار پروتزی برای ${order.patientName} ارسال شد.`);
                          }}
                          className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <Send className="w-3 h-3 -scale-x-100 text-slate-500" />
                          <span>پیامک</span>
                        </button>

                        <button
                          onClick={() => {
                            impactLight();
                            setSelectedOrderForSlip(order);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all"
                          title="چاپ برگه رسمی اعزام کار به همراه پیک"
                        >
                          <Printer className="w-3 h-3 text-purple-600" />
                          <span>برگه سفارش (Slip)</span>
                        </button>
                      </div>

                      {order.status !== 'delivered_cemented' ? (
                        <button
                          onClick={() => {
                            impactHeavy();
                            const next = getNextStatus(order.status);
                            onUpdateStatus(order.id, next);
                            showToast(`وضعیت سفارش ${order.workType} با موفقیت ارتقا یافت.`);
                          }}
                          className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{getNextStatusLabel(order.status)}</span>
                        </button>
                      ) : (
                        <span className="text-[10.5px] font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          <span>تحویل و سمان نهایی شد</span>
                        </span>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PARTNER LABS DIRECTORY (ثابت و متحرک) */}
      {activeChip === 'labs' && (
        <div className="mx-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">فهرست لابراتوارهای طرف قرارداد کلینیک:</span>
            <button
              onClick={() => setShowAddLabModal(true)}
              className="py-1 px-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن لابراتوار همکار</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {partnerLabs.map(lab => (
              <div
                key={lab.id}
                className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      lab.type === 'fixed' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {lab.type === 'fixed' ? 'ثابت' : 'متحرک'}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{lab.name}</h4>
                      <span className="text-[10px] text-slate-500 font-bold block">{lab.typeTitle}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    میانگین تحویل: {toPersianDigits(lab.avgTurnaroundDays)} روز
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-xl text-center">
                  <div>
                    <span className="text-slate-400 block text-[9px]">تلفن تماس</span>
                    <span className="font-mono font-bold text-slate-800 text-[10px]">{lab.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">سفارشات جاری</span>
                    <span className="font-mono font-black text-purple-700">{toPersianDigits(lab.activeOrdersCount)} مورد</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">مانده بستانکاری</span>
                    <span className="font-mono font-black text-emerald-700 text-[10px]">{formatToman(lab.unsettledBalance)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="truncate">مسئول فنی: {lab.manager}</span>
                  <button
                    onClick={() => showToast(`شماره ${lab.phone} برای تماس مستقیم آماده شد.`)}
                    className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>تماس فوری</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REMINDERS & ALARM SETTINGS */}
      {activeChip === 'reminders' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Bell className="w-4 h-4 text-purple-600" />
              <h4 className="font-black text-xs text-slate-900">تنظیمات هوشمند پیگیری و یادآوری تحویل لابراتوار</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  هشدار وصول کار چند روز قبل از نوبت بیمار فعال شود؟
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(days => (
                    <button
                      key={days}
                      onClick={() => {
                        selection();
                        setReminderDaysBefore(days);
                      }}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                        reminderDaysBefore === days 
                          ? 'bg-purple-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {toPersianDigits(days)} روز قبل
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">پیامک خودکار آمادگی به بیمار</span>
                  <span className="text-[10px] text-slate-400">به محض اعلام وصول در مطب، پیامک نوبت سمان به بیمار ارسال شود.</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoSmsToPatient}
                  onChange={(e) => setAutoSmsToPatient(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">آلارم صوتی و لرزشی هپتیک تأخیر لابراتوار</span>
                  <span className="text-[10px] text-slate-400">در صورت گذشت از موعد تحویل و عدم وصول، اعلان فوری به منشی داده شود.</span>
                </div>
                <input
                  type="checkbox"
                  checked={labAlarmNotice}
                  onChange={(e) => setLabAlarmNotice(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </div>
            </div>

            <button
              onClick={() => {
                success();
                showToast('تنظیمات یادآوری لابراتوار با موفقیت ذخیره شد.');
              }}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all"
            >
              ذخیره تنظیمات یادآوری
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SETTLEMENTS & FINANCIAL INVOICES */}
      {activeChip === 'settlements' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h4 className="font-black text-xs text-slate-900">تسویه‌حساب و فاکتورهای لابراتوار</h4>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                جمع کل بستانکاری: {formatToman(partnerLabs.reduce((sum, l) => sum + l.unsettledBalance, 0))}
              </span>
            </div>

            <div className="space-y-2">
              {partnerLabs.map(lab => (
                <div key={lab.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-black text-xs text-slate-900 block">{lab.name}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                      بدهی تسویه نشده: <strong className="text-purple-700">{formatToman(lab.unsettledBalance)}</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      success();
                      showToast(`رسید پرداخت و تسویه‌حساب ۵,۰۰۰,۰۰۰ تومان برای ${lab.name} ثبت شد.`);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 shadow-2xs transition-all"
                  >
                    ثبت پرداخت علی‌الحساب
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PARTNER LAB */}
      {showAddLabModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[28px] border border-slate-200 p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-xs text-slate-900">تعریف لابراتوار همکار جدید</h4>
              <button onClick={() => setShowAddLabModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPartnerLab} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">نام لابراتوار</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً لابراتوار دیجیتال پارس..."
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">نوع تخصص پروتز</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'fixed', label: 'پروتز ثابت' },
                    { id: 'removable', label: 'پروتز متحرک' },
                    { id: 'both', label: 'هردو' }
                  ].map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setNewLabType(t.id as any)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        newLabType === t.id ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">شماره تلفن تماس</label>
                <input
                  type="text"
                  placeholder="۰۲۱-۸۸۰۰۰۰۰۰"
                  value={newLabPhone}
                  onChange={(e) => setNewLabPhone(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">نام مسئول فنی / مدیر</label>
                <input
                  type="text"
                  placeholder="دکتر / آقای ..."
                  value={newLabManager}
                  onChange={(e) => setNewLabManager(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLabModal(false)}
                  className="w-1/3 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-purple-600 text-white font-black shadow-xs active:scale-95"
                >
                  ثبت لابراتوار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Dental Lab Prescription Slip Print Modal */}
      <LabPrescriptionModal
        isOpen={!!selectedOrderForSlip}
        onClose={() => setSelectedOrderForSlip(null)}
        order={selectedOrderForSlip}
        patient={patients.find(p => p.id === selectedOrderForSlip?.patientId) || null}
      />

    </div>
  );
};
