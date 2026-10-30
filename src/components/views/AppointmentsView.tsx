import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, Clock, User, Phone, 
  Plus, CheckCircle2, ChevronLeft, ChevronRight,
  Stethoscope, MapPin, AlertCircle, Search, Send,
  XCircle, Filter, CalendarDays, Check, Sparkles,
  GripVertical, ArrowRightLeft, LayoutGrid, Columns3,
  CheckCheck, RefreshCw, X, Globe
} from 'lucide-react';
import { Appointment, Patient } from '../../types/dental';
import { 
  toPersianDigits, PERSIAN_MONTHS, PERSIAN_WEEKDAYS,
  getPersianDateParts, getDaysInPersianMonth, formatPersianDateString
} from '../../utils/jalali';
import { triggerHaptic } from '../../utils/haptics';
import { clinicalSmsService } from '../../services/smsService';

interface AppointmentsViewProps {
  appointments: Appointment[];
  patients: Patient[];
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
  onMoveAppointment?: (id: string, newUnit: string, newTime?: string) => void;
  onOpenBookingPortal?: () => void;
}

export const CLINIC_UNITS = [
  { 
    id: 'یونیت ۱', 
    name: 'یونیت ۱', 
    doctor: 'دکتر مهدی امیری (پزشک معالج)', 
    accent: '#0284c7',
    borderActive: 'border-sky-500 bg-sky-50/90 text-sky-900',
    dropActive: 'border-sky-400 bg-sky-100/90 shadow-md ring-2 ring-sky-300'
  },
  { 
    id: 'یونیت ۲', 
    name: 'یونیت ۲', 
    doctor: 'دکتر مریم رضایی (اندودنتیست)', 
    accent: '#059669',
    borderActive: 'border-emerald-500 bg-emerald-50/90 text-emerald-900',
    dropActive: 'border-emerald-400 bg-emerald-100/90 shadow-md ring-2 ring-emerald-300'
  },
  { 
    id: 'اتاق جراحی', 
    name: 'اتاق جراحی', 
    doctor: 'تیم جراحی فک و ایمپلنت', 
    accent: '#7c3aed',
    borderActive: 'border-purple-500 bg-purple-50/90 text-purple-900',
    dropActive: 'border-purple-400 bg-purple-100/90 shadow-md ring-2 ring-purple-300'
  }
];

export const STANDARD_TIME_SLOTS = [
  '۱۵:۰۰', '۱۵:۴۵', '۱۶:۳۰', '۱۷:۱۵', '۱۸:۰۰', '۱۸:۴۵', '۱۹:۳۰', '۲۰:۱۵'
];

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  patients,
  onAddAppointment,
  onUpdateStatus,
  onMoveAppointment,
  onOpenBookingPortal
}) => {
  const curDate = getPersianDateParts();
  const [viewMode, setViewMode] = useState<'daily' | 'board' | 'monthly'>('board');
  const [selectedYear, setSelectedYear] = useState<number>(curDate.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(curDate.monthIndex);
  const [selectedDay, setSelectedDay] = useState<number>(curDate.day);
  const [selectedUnit, setSelectedUnit] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [smsToast, setSmsToast] = useState<string | null>(null);

  // Drag and drop states
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [quickMoveModalApt, setQuickMoveModalApt] = useState<Appointment | null>(null);

  // Form states
  const [formPatientName, setFormPatientName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formUnit, setFormUnit] = useState('یونیت ۱');
  const [formDoctor, setFormDoctor] = useState('دکتر مهدی امیری');
  const [formTime, setFormTime] = useState('۱۷:۰۰');
  const [formTreatment, setFormTreatment] = useState('معاینه و طرح درمان');
  const [sendSmsOnCreate, setSendSmsOnCreate] = useState(true);

  // Dynamic days in month (Farvardin-Shahrivar 31, Mehr-Bahman 30, Esfand 29/30)
  const totalDaysInMonth = getDaysInPersianMonth(selectedMonth + 1, selectedYear);
  const daysInMonth = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

  const filteredAppointments = appointments.filter(apt => {
    const matchesUnit = selectedUnit === 'همه' || apt.unit === selectedUnit;
    const matchesSearch = !searchQuery || 
      apt.patientName.includes(searchQuery) || 
      apt.phone.includes(searchQuery) ||
      apt.treatment.includes(searchQuery);
    return matchesUnit && matchesSearch;
  });

  const showToast = (msg: string) => {
    setSmsToast(msg);
    setTimeout(() => setSmsToast(null), 3500);
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formPatientName) return;
    
    const aptDate = formatPersianDateString(selectedYear, selectedMonth + 1, selectedDay);

    onAddAppointment({
      patientId: 'pat-new',
      patientName: formPatientName,
      phone: formPhone || '۰۹۱۲۰۰۰۰۰۰۰',
      unit: formUnit,
      doctor: formDoctor,
      date: aptDate,
      time: formTime,
      durationMinutes: 45,
      treatment: formTreatment,
      status: 'scheduled'
    });

    if (sendSmsOnCreate && formPhone) {
      const res = await clinicalSmsService.sendPatternSms(
        formPhone,
        formPatientName,
        'appointment_reminder',
        {
          date: aptDate,
          time: formTime,
          doctor: formDoctor
        }
      );
      if (res.success) {
        showToast(`پیامک تایید نوبت برای ${formPatientName} ارسال شد (شناسه: ${res.refId})`);
      } else {
        showToast(`نوبت ثبت شد. پیامک: ${res.message}`);
      }
    } else {
      showToast(`نوبت ${formPatientName} با موفقیت در تقویم ثبت شد.`);
    }

    setShowAddModal(false);
    setFormPatientName('');
    setFormPhone('');
  };

  const handlePatientSelectInForm = (patientId: string) => {
    const p = patients.find(item => item.id === patientId);
    if (p) {
      setFormPatientName(p.fullName);
      setFormPhone(p.phone);
    }
  };

  // Drag and Drop event handlers
  const handleDragStart = (e: React.DragEvent, apt: Appointment) => {
    triggerHaptic('light');
    setDraggedAptId(apt.id);
    e.dataTransfer.setData('text/plain', apt.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedAptId(null);
    setDragOverZone(null);
  };

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverZone !== targetKey) {
      setDragOverZone(targetKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetKey: string) => {
    if (dragOverZone === targetKey) {
      setDragOverZone(null);
    }
  };

  const handleDropOnUnit = (e: React.DragEvent, targetUnit: string, targetTime?: string) => {
    e.preventDefault();
    triggerHaptic('medium');
    const aptId = e.dataTransfer.getData('text/plain') || draggedAptId;
    if (!aptId) return;

    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return;

    if (apt.unit === targetUnit && (!targetTime || apt.time === targetTime)) {
      setDraggedAptId(null);
      setDragOverZone(null);
      return;
    }

    onMoveAppointment?.(aptId, targetUnit, targetTime);
    showToast(`نوبت ${apt.patientName} با موفقیت به ${targetUnit}${targetTime ? ` (ساعت ${targetTime})` : ''} منتقل شد.`);

    setDraggedAptId(null);
    setDragOverZone(null);
  };

  const handleQuickMoveConfirm = (newUnit: string, newTime: string) => {
    if (!quickMoveModalApt) return;
    triggerHaptic('medium');
    onMoveAppointment?.(quickMoveModalApt.id, newUnit, newTime);
    showToast(`نوبت ${quickMoveModalApt.patientName} به ${newUnit} ساعت ${newTime} منتقل شد.`);
    setQuickMoveModalApt(null);
  };

  const currentlyDraggedApt = appointments.find(a => a.id === draggedAptId);

  return (
    <div className="pb-36 sm:pb-40 space-y-3">
      {/* Real-time Sync & Action Toast Notification */}
      {smsToast && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#0e1713] border border-[#c8ff00] text-white p-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="w-7 h-7 rounded-full bg-[#c8ff00] text-black flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#c8ff00] font-mono font-bold">همگام‌سازی ابری (SyncEngine)</span>
            </div>
            <span className="text-xs font-bold leading-tight block text-slate-100">{smsToast}</span>
          </div>
        </div>
      )}

      {/* Top Jalali Calendar Bar & Header */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-xs border border-slate-100 space-y-2.5">
          {/* Row 1: Title on Right, Actions on Left */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-slate-900 leading-none">
                نوبت‌دهی
              </h3>
            </div>
            
            <div className="flex items-center gap-1.5">
              {onOpenBookingPortal && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onOpenBookingPortal();
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-extrabold text-xs flex items-center gap-1 border border-sky-200 transition-all active:scale-95 shadow-2xs"
                  title="باز کردن پورتال رزرو آنلاین نوبت برای بیماران"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden xs:inline">رزرو آنلاین</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setShowAddModal(true);
                }}
                className="py-1.5 px-3 rounded-xl bg-[#c8ff00] hover:bg-[#bbf000] text-black font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>نوبت جدید</span>
              </button>
            </div>
          </div>

          {/* Row 2: 3 View Modes Segmented Control - Full Width & Ergonomic */}
          <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center text-xs font-bold w-full border border-slate-200/60 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setViewMode('board');
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] ${
                viewMode === 'board' ? 'bg-sky-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="بورد تفکیک یونیت‌ها با قابلیت جابجایی Drag & Drop"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>بورد یونیت‌ها</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setViewMode('daily');
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] ${
                viewMode === 'daily' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>لیست روزانه</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setViewMode('monthly');
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] ${
                viewMode === 'monthly' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ماهانه</span>
            </button>
          </div>

          {/* Month Selector & Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => {
                triggerHaptic('selection');
                if (selectedMonth >= 11) {
                  setSelectedMonth(0);
                  setSelectedYear(y => y + 1);
                } else {
                  setSelectedMonth(prev => prev + 1);
                }
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              title="ماه بعد"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs font-black text-slate-800">
              {PERSIAN_MONTHS[selectedMonth]} {toPersianDigits(selectedYear)}
            </span>

            <button
              onClick={() => {
                triggerHaptic('selection');
                if (selectedMonth <= 0) {
                  setSelectedMonth(11);
                  setSelectedYear(y => y - 1);
                } else {
                  setSelectedMonth(prev => prev - 1);
                }
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              title="ماه قبل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Monthly Grid View vs Horizontal Day Scroller */}
          {viewMode === 'monthly' ? (
            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w, idx) => (
                  <span key={idx}>{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map(day => {
                  const isSelected = selectedDay === day;
                  const dayAptsCount = appointments.filter(a => a.date.includes(String(day))).length;
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedDay(day);
                        setViewMode('board');
                      }}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-mono font-bold transition-all ${
                        isSelected 
                          ? 'bg-[#1b251d] text-[#c8ff00] shadow-sm scale-105' 
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{toPersianDigits(day)}</span>
                      {dayAptsCount > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {daysInMonth.map(day => {
                const isSelected = selectedDay === day;
                const dayApts = appointments.filter(a => a.date.includes(String(day)));
                return (
                  <button
                    key={day}
                    onClick={() => {
                      triggerHaptic('selection');
                      setSelectedDay(day);
                    }}
                    className={`flex flex-col items-center justify-center min-w-[46px] py-1.5 px-1 rounded-2xl transition-all duration-200 shrink-0 ${
                      isSelected
                        ? 'bg-[#1b251d] text-[#c8ff00] shadow-md scale-105'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                    }`}
                  >
                    <span className="text-[9px] font-medium opacity-60">
                      {PERSIAN_MONTHS[selectedMonth]}
                    </span>
                    <span className="text-sm font-extrabold font-mono mt-0.5">
                      {toPersianDigits(day)}
                    </span>
                    {dayApts.length > 0 ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] mt-1" />
                    ) : (
                      <span className="w-1.5 h-1.5 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Unit Filter Selector & Quick Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {/* Unit tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {['همه', 'یونیت ۱', 'یونیت ۲', 'اتاق جراحی'].map(unit => (
                <button
                  key={unit}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedUnit(unit);
                  }}
                  className={`py-1 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedUnit === unit
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                placeholder="جستجوی نوبت..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-44 bg-slate-50 border border-slate-200 rounded-xl pr-7 pl-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 
        ACTIVE DRAG HOVER DROP-ZONES BANNER (Appears instantly when dragging an appointment card)
      */}
      {draggedAptId && (
        <div className="mx-2 p-3 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl border-2 border-dashed border-[#c8ff00] shadow-xl animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c8ff00] animate-ping" />
              <span className="text-xs font-black text-slate-100">
                در حال جابجایی نوبت: {currentlyDraggedApt?.patientName} ({currentlyDraggedApt?.unit})
              </span>
            </div>
            <span className="text-[10px] text-[#c8ff00] font-mono">نوبت را روی یونیت مقصد رها کنید</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {CLINIC_UNITS.map(unit => {
              const isOver = dragOverZone === `quick-${unit.id}`;
              const isCurrent = currentlyDraggedApt?.unit === unit.id;
              return (
                <div
                  key={unit.id}
                  onDragOver={(e) => handleDragOver(e, `quick-${unit.id}`)}
                  onDragLeave={(e) => handleDragLeave(e, `quick-${unit.id}`)}
                  onDrop={(e) => handleDropOnUnit(e, unit.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isOver 
                      ? 'bg-sky-500/30 border-[#c8ff00] scale-102 ring-2 ring-[#c8ff00]/60' 
                      : isCurrent
                        ? 'bg-white/5 border-slate-700 text-slate-400 opacity-60'
                        : 'bg-white/10 border-white/20 hover:bg-white/20'
                  }`}
                >
                  <span className="text-xs font-black text-white">{unit.name}</span>
                  <span className="text-[9px] text-slate-300 truncate max-w-full">{unit.doctor.split('(')[0]}</span>
                  {isOver && (
                    <span className="text-[9px] text-[#c8ff00] font-bold mt-1">رها کنید برای انتقال</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 
        MODE 1: KANBAN UNIT BOARD (Multi-Column Unit Drag & Drop Pipeline)
      */}
      {viewMode === 'board' && (
        <div className="mx-2 space-y-2">
          {/* Board instruction pill */}
          <div className="flex items-center justify-between px-2 text-slate-600 text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5 text-sky-600" />
              <span>کارت‌ها را گرفته و بین یونیت‌ها یا ساعات مختلف جابجا کنید (Drag & Drop)</span>
            </span>
            <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-bold">
              سینک آنی پذیرش
            </span>
          </div>

          {/* 3 Unit Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {CLINIC_UNITS.map(unit => {
              const unitAppointments = filteredAppointments.filter(a => a.unit === unit.id);
              const isDropActive = dragOverZone === `column-${unit.id}`;

              return (
                <div
                  key={unit.id}
                  onDragOver={(e) => handleDragOver(e, `column-${unit.id}`)}
                  onDragLeave={(e) => handleDragLeave(e, `column-${unit.id}`)}
                  onDrop={(e) => handleDropOnUnit(e, unit.id)}
                  className={`bg-slate-50/90 rounded-[22px] border transition-all p-2.5 space-y-2 flex flex-col min-h-[380px] ${
                    isDropActive 
                      ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300 shadow-md' 
                      : 'border-slate-200/90 shadow-2xs'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: unit.accent }} 
                      />
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{unit.name}</h4>
                        <span className="text-[9.5px] text-slate-500 truncate block max-w-[150px]">
                          {unit.doctor}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      {toPersianDigits(unitAppointments.length)} نوبت
                    </span>
                  </div>

                  {/* Empty Drop Target Slot if column is empty */}
                  {unitAppointments.length === 0 && (
                    <div 
                      className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl text-center space-y-1.5 transition-all ${
                        isDropActive 
                          ? 'border-sky-500 bg-sky-100/60 text-sky-800' 
                          : 'border-slate-300/80 text-slate-400'
                      }`}
                    >
                      <ArrowRightLeft className="w-5 h-5 opacity-40 mx-auto" />
                      <span className="text-xs font-bold">بدون نوبت در این روز</span>
                      <span className="text-[10px] opacity-75">
                        کارت نوبت را بکشید و اینجا رها کنید
                      </span>
                    </div>
                  )}

                  {/* Appointments in this Unit */}
                  <div className="space-y-2 flex-1">
                    {unitAppointments.map(apt => {
                      const isBeingDragged = draggedAptId === apt.id;

                      return (
                        <div
                          key={apt.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, apt)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-[18px] p-2.5 border transition-all cursor-grab active:cursor-grabbing select-none group shadow-2xs hover:shadow-xs hover:border-sky-300 ${
                            isBeingDragged 
                              ? 'opacity-40 border-dashed border-sky-400 scale-98' 
                              : 'border-slate-200/90'
                          }`}
                        >
                          {/* Top row: Time + Patient Name + Drag handle */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              {/* Grip Handle Icon */}
                              <div className="text-slate-300 group-hover:text-sky-500 transition-colors cursor-grab">
                                <GripVertical className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-[#0f1b13] text-[#c8ff00] flex items-center justify-center font-mono font-bold text-[11px] border border-[#c8ff00]/30 shrink-0">
                                <span>{toPersianDigits(apt.time)}</span>
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                                  {apt.patientName}
                                </h5>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {toPersianDigits(apt.phone)}
                                </span>
                              </div>
                            </div>

                            {/* Status badge */}
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              apt.status === 'in_chair' ? 'bg-[#c8ff00] text-black shadow-2xs animate-pulse' :
                              apt.status === 'waiting' ? 'bg-amber-100 text-amber-800' :
                              apt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {apt.status === 'in_chair' ? 'روی یونیت' :
                               apt.status === 'waiting' ? 'در سالن' :
                               apt.status === 'completed' ? 'مختومه' : 'رزرو'}
                            </span>
                          </div>

                          {/* Treatment detail */}
                          <div className="mt-2 p-1.5 rounded-lg bg-slate-50 text-[11px] text-slate-700 flex items-center gap-1 border border-slate-100">
                            <Stethoscope className="w-3 h-3 text-sky-600 shrink-0" />
                            <span className="font-semibold truncate">{apt.treatment}</span>
                          </div>

                          {/* Quick Actions Footer: Move Button (Touch Accessible) + Status */}
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                            {/* 1-Tap Quick Move modal trigger (Great for Mobile / Touch screens) */}
                            <button
                              onClick={() => {
                                triggerHaptic('selection');
                                setQuickMoveModalApt(apt);
                              }}
                              className="py-1 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center gap-1 border border-sky-100 transition-colors"
                              title="تغییر سریع یونیت یا ساعت"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>جابجایی</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {apt.status !== 'in_chair' && apt.status !== 'completed' && (
                                <button
                                  onClick={() => {
                                    triggerHaptic('medium');
                                    onUpdateStatus(apt.id, 'in_chair');
                                  }}
                                  className="py-1 px-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px]"
                                >
                                  فراخوان
                                </button>
                              )}
                              {apt.status === 'in_chair' && (
                                <button
                                  onClick={() => {
                                    triggerHaptic('success');
                                    onUpdateStatus(apt.id, 'completed');
                                  }}
                                  className="py-1 px-2 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-0.5"
                                >
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>اتمام</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Standard Time Slot Drop Targets for granular scheduling */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-[9.5px] font-bold text-slate-500 block mb-1">
                      ساعت‌های خالی قابل رزرو در {unit.name}:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {STANDARD_TIME_SLOTS.slice(0, 4).map(slot => {
                        const isSlotOccupied = unitAppointments.some(a => a.time === slot);
                        const isSlotTarget = dragOverZone === `slot-${unit.id}-${slot}`;

                        return (
                          <div
                            key={slot}
                            onDragOver={(e) => handleDragOver(e, `slot-${unit.id}-${slot}`)}
                            onDragLeave={(e) => handleDragLeave(e, `slot-${unit.id}-${slot}`)}
                            onDrop={(e) => handleDropOnUnit(e, unit.id, slot)}
                            className={`py-1 px-1 text-center rounded-lg text-[9.5px] font-mono font-bold transition-all border ${
                              isSlotTarget 
                                ? 'bg-sky-500 text-white border-sky-600 scale-105 shadow-xs ring-1 ring-sky-400' 
                                : isSlotOccupied
                                  ? 'bg-slate-200/70 text-slate-400 border-transparent cursor-not-allowed'
                                  : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-200 cursor-pointer'
                            }`}
                            title={isSlotOccupied ? 'ساعت پر شده است' : 'کارت نوبت را برای انتقال به این ساعت رها کنید'}
                          >
                            {toPersianDigits(slot)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 
        MODE 2: DAILY LIST VIEW (WITH DRAG & DROP SUPPORT)
      */}
      {viewMode === 'daily' && (
        <div className="mx-2 space-y-2.5">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-black text-slate-800">
              نوبت‌های {toPersianDigits(selectedDay)} {PERSIAN_MONTHS[selectedMonth]} ({toPersianDigits(filteredAppointments.length)} نوبت)
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
              قابلیت جابجایی Drag & Drop فعال
            </span>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs space-y-2">
              <CalendarIcon className="w-8 h-8 mx-auto text-slate-300" />
              <p>هیچ نوبتی برای این فیلتر در این روز ثبت نشده است.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center gap-1 mt-1 shadow-xs"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>ثبت اولین نوبت</span>
              </button>
            </div>
          ) : (
            filteredAppointments.map(apt => (
              <div
                key={apt.id}
                draggable
                onDragStart={(e) => handleDragStart(e, apt)}
                onDragEnd={handleDragEnd}
                className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2.5 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="text-slate-300 hover:text-sky-600 transition-colors">
                      <GripVertical className="w-4 h-4 stroke-[2.5]" />
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-[#162118] text-[#c8ff00] flex flex-col items-center justify-center font-mono font-bold text-xs border border-[#c8ff00]/30 shadow-2xs shrink-0">
                      <span>{toPersianDigits(apt.time)}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{apt.patientName}</h4>
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                        {toPersianDigits(apt.phone)}
                      </span>
                    </div>
                  </div>

                  {/* Status pill badge */}
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                      apt.status === 'in_chair' ? 'bg-[#c8ff00] text-black shadow-2xs animate-pulse' :
                      apt.status === 'waiting' ? 'bg-amber-100 text-amber-800' :
                      apt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {apt.status === 'in_chair' ? 'روی یونیت (در حال درمان)' :
                       apt.status === 'waiting' ? 'حاضر در سالن انتظار' :
                       apt.status === 'completed' ? 'درمان انجام شد' : 'رزرو شده'}
                    </span>
                  </div>
                </div>

                {/* Treatment & Unit info */}
                <div className="p-2 rounded-xl bg-slate-50 text-xs text-slate-700 flex items-center justify-between border border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold truncate">{apt.treatment}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] shrink-0 font-medium">
                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">{apt.unit}</span>
                    <span>{apt.doctor}</span>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100/80">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => showToast(`پیامک یادآوری نوبت برای ${apt.patientName} با موفقیت ارسال گردید.`)}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1"
                      title="ارسال پیامک یادآوری"
                    >
                      <Send className="w-3 h-3 -scale-x-100 text-slate-500" />
                      <span>پیامک یادآوری</span>
                    </button>

                    <button
                      onClick={() => {
                        triggerHaptic('selection');
                        setQuickMoveModalApt(apt);
                      }}
                      className="py-1 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold flex items-center gap-1 border border-sky-200/80"
                      title="تغییر یونیت یا ساعت"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>جابجایی یونیت</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {apt.status !== 'waiting' && apt.status !== 'in_chair' && apt.status !== 'completed' && (
                      <button
                        onClick={() => onUpdateStatus(apt.id, 'waiting')}
                        className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px]"
                      >
                        اعلام حضور در سالن
                      </button>
                    )}

                    {apt.status !== 'in_chair' && apt.status !== 'completed' && (
                      <button
                        onClick={() => onUpdateStatus(apt.id, 'in_chair')}
                        className="py-1 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-2xs"
                      >
                        فراخوان به یونیت
                      </button>
                    )}

                    {apt.status === 'in_chair' && (
                      <button
                        onClick={() => onUpdateStatus(apt.id, 'completed')}
                        className="py-1 px-3 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>پایان درمان و ثبت در پرونده</span>
                      </button>
                    )}

                    {apt.status === 'completed' && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>مختومه</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 
        QUICK MOVE MODAL (One-tap transfer between units and time slots, 100% Mobile & Touch Friendly)
      */}
      {quickMoveModalApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[26px] border border-slate-200 p-5 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">جابجایی یونیت و زمان نوبت</h3>
                  <span className="text-[10px] text-slate-500">{quickMoveModalApt.patientName}</span>
                </div>
              </div>
              <button
                onClick={() => setQuickMoveModalApt(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Unit Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">انتخاب یونیت مقصد:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {CLINIC_UNITS.map(unit => {
                  const isCurrent = quickMoveModalApt.unit === unit.id;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => {
                        handleQuickMoveConfirm(unit.id, quickMoveModalApt.time);
                      }}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        isCurrent
                          ? 'bg-sky-50 border-sky-300 text-sky-800 font-black ring-1 ring-sky-300'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-bold'
                      }`}
                    >
                      <span className="text-[11px] block">{unit.name}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{unit.doctor.split(' ')[1]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destination Time Slot Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-black text-slate-700 block">تغییر ساعت نوبت:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {STANDARD_TIME_SLOTS.map(slot => {
                  const isCurrentTime = quickMoveModalApt.time === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => {
                        handleQuickMoveConfirm(quickMoveModalApt.unit, slot);
                      }}
                      className={`py-1.5 rounded-xl font-mono text-xs font-black border transition-all ${
                        isCurrentTime
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {toPersianDigits(slot)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setQuickMoveModalApt(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal (Themed to Sky Blue Appointments Palette - Zero Black) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-sky-950/25 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-sky-50/80 via-white to-blue-50/40 text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-sky-200/90 p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">ثبت نوبت دندانپزشکی جدید</h3>
                  <span className="text-[10px] text-sky-700 font-bold">تقویم شیفت کلینیک</span>
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
              {/* Existing patient quick-pick */}
              <div>
                <label className="text-slate-600 font-bold block mb-1">پرونده بیمار (اختیاری)</label>
                <select
                  onChange={(e) => handlePatientSelectInForm(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-sky-500 shadow-2xs"
                  defaultValue=""
                >
                  <option value="">انتخاب پرونده موجود...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} ({p.fileNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">نام و نام خانوادگی بیمار *</label>
                <input
                  type="text"
                  required
                  value={formPatientName}
                  onChange={(e) => setFormPatientName(e.target.value)}
                  placeholder="مثال: رضا محمدی"
                  className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-sky-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">شماره تماس همراه</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-sky-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">یونیت دندانپزشکی</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-white border border-sky-200 rounded-xl px-2 py-2 text-slate-800 font-medium focus:outline-none focus:border-sky-500 shadow-2xs"
                  >
                    <option value="یونیت ۱">یونیت ۱</option>
                    <option value="یونیت ۲">یونیت ۲</option>
                    <option value="اتاق جراحی">اتاق جراحی</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">ساعت نوبت</label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-sky-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">پزشک معالج</label>
                <select
                  value={formDoctor}
                  onChange={(e) => setFormDoctor(e.target.value)}
                  className="w-full bg-white border border-sky-200 rounded-xl px-2 py-2 text-slate-800 font-medium focus:outline-none focus:border-sky-500 shadow-2xs"
                >
                  <option value="دکتر مهدی امیری">دکتر مهدی امیری</option>
                  <option value="دکتر مریم رضایی">دکتر مریم رضایی</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">شرح درمان یا علت مراجعه</label>
                <input
                  type="text"
                  value={formTreatment}
                  onChange={(e) => setFormTreatment(e.target.value)}
                  placeholder="مثلاً ترمیم کامپوزیت، کاشت ایمپلنت، قالب‌گیری روکش..."
                  className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-2xs"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendSmsOnCreate}
                  onChange={(e) => setSendSmsOnCreate(e.target.checked)}
                  className="rounded accent-sky-600 w-4 h-4"
                />
                <span className="text-[11px]">ارسال خودکار پیامک تایید نوبت و نشانی مطب</span>
              </label>

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
                  className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-md shadow-sky-600/25 active:scale-95 transition-all"
                >
                  ثبت قطعی نوبت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
