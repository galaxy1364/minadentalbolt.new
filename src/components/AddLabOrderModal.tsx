import React, { useState } from 'react';
import { X, FlaskConical } from 'lucide-react';
import { Patient, LabOrder } from '../types/dental';
import { formatToman, getCurrentPersianDate, getPersianDateParts } from '../utils/jalali';

interface AddLabOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onAddOrder: (order: LabOrder) => void;
}

export const AddLabOrderModal: React.FC<AddLabOrderModalProps> = ({
  isOpen,
  onClose,
  patients,
  onAddOrder
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [workType, setWorkType] = useState('روکش تمام زیرکونیا');
  const [toothNumber, setToothNumber] = useState('دندان ۶ بالا راست (UR6)');
  const [labName, setLabName] = useState('لابراتوار دیجیتال پیشرو');
  const [shade, setShade] = useState('A2');
  const [sendDate, setSendDate] = useState(() => getCurrentPersianDate());
  const [deliveryDate, setDeliveryDate] = useState(() => getPersianDateParts(new Date(Date.now() + 7 * 86400000)).formatted);
  const [appointmentDate, setAppointmentDate] = useState(() => getPersianDateParts(new Date(Date.now() + 8 * 86400000)).formatted);
  const [cost, setCost] = useState(2500000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    const newOrder: LabOrder = {
      id: `lab-${Date.now()}`,
      patientId: selectedPatientId,
      patientName: patient.fullName,
      toothNumber,
      workType,
      labName,
      shade,
      sendDate,
      deliveryDate,
      appointmentDate,
      status: 'sent',
      cost,
      reminderNotice: `کار در تاریخ ${deliveryDate} آماده و قبل از نوبت بیمار پیگیری شود.`
    };

    onAddOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-purple-950/20 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-purple-50/80 via-white to-fuchsia-50/30 text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-purple-200/90 p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-2.5 border-b border-purple-200/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">ثبت سفارش لابراتوار پروتز</h3>
              <span className="text-[10px] text-purple-700 font-bold">پروتزهای دندانی و دیجیتال</span>
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
          <div>
            <label className="text-slate-700 font-bold block mb-1">انتخاب بیمار</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-purple-500 shadow-2xs"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.fileNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1">نوع کار پروتزی</label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-purple-500 shadow-2xs"
            >
              <option value="روکش تمام زیرکونیا">روکش تمام زیرکونیا</option>
              <option value="روکش متال‌سرامیک (PFM)">روکش متال‌سرامیک (PFM)</option>
              <option value="لمینت E-Max">لمینت E-Max</option>
              <option value="اباتمنت و کرون ایمپلنت">اباتمنت و کرون ایمپلنت</option>
              <option value="پروتز متحرک کامل">پروتز متحرک کامل</option>
              <option value="پلاک شفاف ارتودنسی">پلاک شفاف ارتودنسی</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-700 font-bold block mb-1">دندان / موقعیت</label>
              <input
                type="text"
                value={toothNumber}
                onChange={(e) => setToothNumber(e.target.value)}
                className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-purple-500 shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">شید و رنگ (Shade)</label>
              <input
                type="text"
                value={shade}
                onChange={(e) => setShade(e.target.value)}
                placeholder="A2, BL2, ..."
                className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-purple-500 shadow-2xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-700 font-bold block mb-1">لابراتوار همکار</label>
              <select
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full bg-white border border-purple-200 rounded-xl px-2 py-2 text-slate-900 font-medium focus:outline-none focus:border-purple-500 shadow-2xs"
              >
                <option value="لابراتوار دیجیتال پیشرو">لابراتوار دیجیتال پیشرو</option>
                <option value="لابراتوار تخصصی رویال دنت">لابراتوار تخصصی رویال دنت</option>
                <option value="لابراتوار دندان‌تکنیک">لابراتوار دندان‌تکنیک</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">تاریخ مقرر تحویل</label>
              <input
                type="text"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-purple-500 shadow-2xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1">هزینه لابراتوار (تومان)</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-500 shadow-2xs"
            />
            <span className="text-[10.5px] text-purple-700 font-bold mt-1 block">معادل: {formatToman(cost)}</span>
          </div>

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
              className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md shadow-purple-600/25 active:scale-95 transition-all"
            >
              ثبت و ارسال به لابراتوار
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
