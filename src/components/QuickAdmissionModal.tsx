import React, { useState, useEffect } from 'react';
import { 
  X, UserPlus, Phone, CreditCard, Stethoscope, 
  FileText, Check, AlertCircle, Sparkles, User, 
  Calendar, Clock, ShieldCheck, HeartPulse
} from 'lucide-react';
import { Patient } from '../types/dental';
import { toPersianDigits, getCurrentPersianDate } from '../utils/jalali';
import { getNextFileNumber, recordLastFileNumber } from '../utils/fileNumber';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface QuickAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientAdmitted: (newPatient: Patient) => void;
  onOpenPalmerChart?: (patient: Patient) => void;
}

export const QuickAdmissionModal: React.FC<QuickAdmissionModalProps> = ({
  isOpen,
  onClose,
  onPatientAdmitted,
  onOpenPalmerChart
}) => {
  const { impactLight, impactHeavy, success } = useHapticFeedback();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('معاینه اولیه و چکاپ');
  const [selectedDoctor, setSelectedDoctor] = useState('دکتر مهدی امیری');
  const [priority, setPriority] = useState<'normal' | 'emergency' | 'vip'>('normal');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [allergyAlert, setAllergyAlert] = useState('');

  // Auto-generate next file number on open
  useEffect(() => {
    if (isOpen) {
      const nextNum = getNextFileNumber();
      setFileNumber(nextNum);
      setFullName('');
      setPhone('');
      setNationalId('');
      setChiefComplaint('معاینه اولیه و چکاپ');
      setMedicalNotes('');
      setAllergyAlert('');
      setPriority('normal');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (openPalmerAfter: boolean = false) => {
    if (!fullName.trim()) return;
    impactHeavy();

    const cleanFileNumber = fileNumber.trim() || getNextFileNumber();
    recordLastFileNumber(cleanFileNumber);

    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      fileNumber: cleanFileNumber,
      fullName: fullName.trim(),
      phone: phone.trim() || '۰۹۱۲۰۰۰۰۰۰۰',
      nationalId: nationalId.trim() || '۰۰۰۰۰۰۰۰۰۰',
      medicalHistory: allergyAlert ? [allergyAlert, medicalNotes].filter(Boolean) : [medicalNotes].filter(Boolean),
      teethConditions: {},
      treatments: [
        {
          id: `trt-adm-${Date.now()}`,
          tooth: 'فک کامل',
          treatment: chiefComplaint || 'پذیرش سریع و تشکیل پرونده',
          cost: 250000,
          date: getCurrentPersianDate(),
          status: 'planned',
          doctorName: selectedDoctor
        }
      ],
      age: 32,
      gender: 'مرد',
      totalCost: 0,
      paidAmount: 0,
      balance: 0,
      activeTreatmentsCount: 1,
      lastVisit: getCurrentPersianDate(),
      notes: medicalNotes || 'پذیرش سریع کلینیک',
      sayadChecks: [],
      installments: [],
      payments: [],
      labOrders: [],
      implantCases: [],
      prescriptions: [],
      consents: [],
      createdAt: getCurrentPersianDate()
    };

    onPatientAdmitted(newPatient);
    success();

    if (openPalmerAfter && onOpenPalmerChart) {
      onClose();
      onOpenPalmerChart(newPatient);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[28px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-md">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">پذیرش سریع و تشکیل پرونده بیمار</h3>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono font-bold">
                  داشبورد مستقیم
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                ثبت آنی مشخصات و تخصیص شماره پرونده بدون نیاز به ورود به لیست کامل بیماران
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              impactLight();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
          
          {/* File Number & Priority Banner */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-bold">شماره پرونده سیستمی:</span>
              <input
                type="text"
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                className="w-24 text-center font-mono font-black text-emerald-800 bg-white border border-emerald-300 rounded-lg py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-emerald-200 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`px-2 py-1 rounded-lg transition-all ${priority === 'normal' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
              >
                عادی
              </button>
              <button
                type="button"
                onClick={() => setPriority('emergency')}
                className={`px-2 py-1 rounded-lg transition-all ${priority === 'emergency' ? 'bg-rose-600 text-white font-black' : 'text-rose-600'}`}
              >
                اورژانس
              </button>
              <button
                type="button"
                onClick={() => setPriority('vip')}
                className={`px-2 py-1 rounded-lg transition-all ${priority === 'vip' ? 'bg-amber-500 text-white font-black' : 'text-amber-600'}`}
              >
                VIP
              </button>
            </div>
          </div>

          {/* Name & Phone (Primary Fields) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">
                نام و نام خانوادگی بیمار <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="مثال: مریم کریمی"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">شماره همراه بیمار</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* National Code & Attending Doctor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">کد ملی (جهت استعلام بیمه و صیاد)</label>
              <input
                type="text"
                placeholder="۰۰۱۸۳۷۴۶۲۱"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">پزشک معالج انتخابی</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              >
                <option value="دکتر مهدی امیری">دکتر مهدی امیری (مدیر · جراح فک و ایمپلنت)</option>
                <option value="دکتر سارا رضوانی">دکتر سارا رضوانی (ارتودنسی و زیبایی)</option>
                <option value="دکتر علی مرادی">دکتر علی مرادی (درمان ریشه اندو)</option>
              </select>
            </div>
          </div>

          {/* Chief Complaint / Treatment */}
          <div>
            <label className="text-slate-700 font-bold block mb-1">علت مراجعه / خدمت درخواستی</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
              {[
                'معاینه اولیه و چکاپ',
                'دندان‌درد حاد / عصب‌کشی',
                'مشاوره کاشت ایمپلنت',
                'ترمیم و جرم‌گیری'
              ].map(opt => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setChiefComplaint(opt)}
                  className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold text-center transition-all ${
                    chiefComplaint === opt
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="یا به صورت دستی وارد کنید..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Allergy / Medical Alert */}
          <div>
            <label className="text-slate-700 font-bold block mb-1 flex items-center justify-between">
              <span>هشدار پزشکی / آلرژی دارویی</span>
              <span className="text-[10px] text-amber-600 font-normal">اختیاری</span>
            </label>
            <input
              type="text"
              placeholder="مثال: حساسیت به پنی‌سیلین، فشار خون بالا، مصرف آسپرین..."
              value={allergyAlert}
              onChange={(e) => setAllergyAlert(e.target.value)}
              className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={!fullName.trim()}
            className="w-full sm:w-auto py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Stethoscope className="w-4 h-4" />
            <span>ثبت و باز کردن چارت پالمر</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={!fullName.trim()}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>ثبت آنی و تشکیل پرونده</span>
          </button>
        </div>

      </div>
    </div>
  );
};
