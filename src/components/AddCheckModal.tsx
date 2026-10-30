import React, { useState } from 'react';
import { X, FileCheck2, Shield, CheckCircle2, Send } from 'lucide-react';
import { Patient, SayadCheck } from '../types/dental';
import { formatToman, getRelativePersianDate } from '../utils/jalali';
import { clinicalSmsService } from '../services/smsService';

interface AddCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onAddCheck: (check: SayadCheck) => void;
}

export const AddCheckModal: React.FC<AddCheckModalProps> = ({
  isOpen,
  onClose,
  patients,
  onAddCheck
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [sayadId, setSayadId] = useState('۷۴۹۱۸۳۹۲۱۶۴۸۵۲۰۰');
  const [bankName, setBankName] = useState('بانک ملت');
  const [amount, setAmount] = useState(10000000);
  const [dueDate, setDueDate] = useState(getRelativePersianDate(30));
  const [drawerName, setDrawerName] = useState('');
  const [isGuarantee, setIsGuarantee] = useState(false);
  const [description, setDescription] = useState('قسط دوم درمان ایمپلنت');
  const [sendCheckSms, setSendCheckSms] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    const newCheck: SayadCheck = {
      id: `chk-${Date.now()}`,
      patientId: selectedPatientId,
      patientName: patient.fullName,
      sayadId: sayadId.replace(/\s+/g, ''),
      bankName,
      amount,
      dueDate,
      drawerName: drawerName || patient.fullName,
      status: 'in_collection',
      isGuarantee,
      description
    };

    onAddCheck(newCheck);

    if (sendCheckSms && patient.phone) {
      await clinicalSmsService.sendPatternSms(
        patient.phone,
        patient.fullName,
        'sayad_check_due',
        {
          amount: formatToman(amount),
          dueDate
        }
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-amber-950/20 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-amber-50/80 via-white to-orange-50/30 text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-amber-200/90 p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-2.5 border-b border-amber-200/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">ثبت چک صیادی و ضمانت درمانی</h3>
              <span className="text-[10px] text-amber-700 font-bold">مدیریت اعتبارات مالی کلینیک</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Patient select */}
          <div>
            <label className="text-slate-700 font-bold block mb-1">انتخاب بیمار</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-amber-500 shadow-2xs"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.fileNumber})</option>
              ))}
            </select>
          </div>

          {/* Guarantee Toggle */}
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <span className="text-amber-950 font-bold">آیا این چک، چک ضمانت امانی است؟</span>
            <button
              type="button"
              onClick={() => setIsGuarantee(!isGuarantee)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${isGuarantee ? 'bg-amber-600' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${isGuarantee ? '-translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Sayad ID */}
          <div>
            <label className="text-slate-700 font-bold block mb-1">شناسه ۱۶ رقمی صیاد</label>
            <input
              type="text"
              value={sayadId}
              onChange={(e) => setSayadId(e.target.value)}
              placeholder="شناسه ۱۶ رقمی چک صیاد بنفش"
              className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-700 font-bold block mb-1">بانک صادرکننده</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-white border border-amber-200 rounded-xl px-2 py-2 text-slate-900 font-medium focus:outline-none focus:border-amber-500 shadow-2xs"
              >
                {['بانک ملت', 'بانک ملی', 'بانک صادرات', 'بانک تجارت', 'بانک سپه', 'بانک پاسارگاد', 'بانک سامان'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">مبلغ چک (تومان)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 shadow-2xs"
                required
              />
            </div>
          </div>

          <div className="text-[10.5px] text-amber-800 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
            مبلغ به حروف: {formatToman(amount)}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-700 font-bold block mb-1">تاریخ سررسید (شمسی)</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder={getRelativePersianDate(30)}
                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">نام صاحب / صادرکننده</label>
              <input
                type="text"
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                placeholder="در صورت مغایرت با بیمار"
                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1">توضیحات و بابت</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثلاً قسط دوم ایمپلنت دندان ۶"
              className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={sendCheckSms}
              onChange={(e) => setSendCheckSms(e.target.checked)}
              className="rounded accent-amber-600 w-4 h-4"
            />
            <span className="text-[11px] font-bold">ارسال خودکار پیامک تایید دریافت چک صیادی و سررسید به بیمار</span>
          </label>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/25 active:scale-95 transition-all"
            >
              ثبت در کارتابل و پرونده
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
