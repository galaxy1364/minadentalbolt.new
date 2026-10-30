import React, { useEffect } from 'react';
import { 
  PhoneCall, PhoneIncoming, Calendar, UserPlus, 
  FileText, X, AlertCircle, CheckCircle2, Sparkles, PhoneOff 
} from 'lucide-react';
import { Patient, IncomingCallEvent } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { triggerHaptic } from '../utils/haptics';

interface IncomingCallBannerProps {
  call: IncomingCallEvent | null;
  onClose: () => void;
  onScheduleAppointment: (patientName?: string, phone?: string) => void;
  onOpenPatientFile: (patient: Patient) => void;
  onQuickAdmission: (phone?: string) => void;
}

export const IncomingCallBanner: React.FC<IncomingCallBannerProps> = ({
  call,
  onClose,
  onScheduleAppointment,
  onOpenPatientFile,
  onQuickAdmission
}) => {
  useEffect(() => {
    if (call) {
      triggerHaptic('warning');
    }
  }, [call?.id]);

  if (!call) return null;

  const patient = call.matchedPatient;
  const isExistingPatient = !!patient;
  const isDebtor = patient && patient.balance < 0;

  const handleSchedule = () => {
    triggerHaptic('medium');
    onClose();
    if (isExistingPatient) {
      onScheduleAppointment(patient.fullName, patient.phone);
    } else {
      onScheduleAppointment('بیمار جدید', call.phoneNumber);
    }
  };

  const handleOpenRecord = () => {
    triggerHaptic('medium');
    onClose();
    if (patient) {
      onOpenPatientFile(patient);
    } else {
      onQuickAdmission(call.phoneNumber);
    }
  };

  return (
    <div className="fixed top-2.5 inset-x-2 sm:inset-x-auto sm:right-4 sm:w-[420px] z-50 select-none animate-in slide-in-from-top-3 duration-300">
      <div className="bg-white/95 backdrop-blur-xl rounded-[24px] p-3.5 border-2 border-emerald-500/80 shadow-[0_12px_40px_rgba(5,150,105,0.28)] flex flex-col gap-2.5">
        
        {/* Top Header & Incoming Ringing Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Pulsing Phone Avatar */}
            <div className="relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <PhoneIncoming className="w-4 h-4 animate-bounce" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  کالر آی‌دی هوشمند مطب (Caller ID)
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                {isExistingPatient ? 'شناسایی خودکار پرونده بیمار' : 'تماس ورودی ناشناس (بیمار جدید)'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            title="بستن اعلان تماس"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Caller Information Card */}
        {isExistingPatient ? (
          /* Case A: Patient Has Existing Dental Record */
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                  {patient.fullName.slice(0, 1)}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">{patient.fullName}</h4>
                  <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{patient.phone}</span>
                </div>
              </div>

              <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full font-mono">
                پرونده #{toPersianDigits(patient.fileNumber || patient.id.replace('p', ''))}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10.5px]">
              <span className="text-slate-600">وضعیت حساب مالی:</span>
              <span className={`font-mono font-bold ${isDebtor ? 'text-rose-600' : 'text-emerald-700'}`}>
                {isDebtor ? `بدهی: ${formatToman(Math.abs(patient.balance))}` : 'تسویه حساب کامل'}
              </span>
            </div>
          </div>
        ) : (
          /* Case B: Patient Does NOT Have a Record */
          <div className="p-2.5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 font-mono" dir="ltr">
                {call.phoneNumber}
              </span>
              <span className="text-[9.5px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                بیمار جدید
              </span>
            </div>
            <p className="text-[10.5px] text-amber-800">
              این شماره فاقد سابقه پرونده قبلی در سیستم مینادنتال است.
            </p>
          </div>
        )}

        {/* Action Buttons: Suggested Scheduling & Record Inspection */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {/* Primary Action: Suggest Schedule Appointment */}
          <button
            onClick={handleSchedule}
            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>پیشنهاد تعیین نوبت</span>
          </button>

          {/* Secondary Action: Open Record or New File */}
          <button
            onClick={handleOpenRecord}
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-slate-200"
          >
            {isExistingPatient ? (
              <>
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>مشاهده پرونده</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                <span>تشکیل پرونده جدید</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
