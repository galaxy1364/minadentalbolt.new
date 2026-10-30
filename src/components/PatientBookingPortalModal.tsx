import React, { useState } from 'react';
import { 
  X, Check, Calendar, Clock, User, Phone, 
  CreditCard, ShieldCheck, AlertCircle, Heart, 
  MapPin, QrCode, Sparkles, CheckCircle2, ChevronLeft,
  ChevronRight, Stethoscope, Share2, Printer
} from 'lucide-react';
import { OnlineBookingRequest } from '../types/dental';
import { toPersianDigits, formatToman, PERSIAN_MONTHS, getPersianDateParts, getCurrentPersianDate, getCurrentPersianMonthName } from '../utils/jalali';
import { triggerHaptic } from '../utils/haptics';

interface PatientBookingPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirmed?: (booking: OnlineBookingRequest) => void;
}

export const PatientBookingPortalModal: React.FC<PatientBookingPortalModalProps> = ({
  isOpen,
  onClose,
  onBookingConfirmed
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Dynamic upcoming clinical days
  const upcomingDays = React.useMemo(() => {
    return Array.from({ length: 5 }, (_, idx) => {
      const d = new Date(Date.now() + (idx + 1) * 86400000);
      const parts = getPersianDateParts(d);
      return {
        day: parts.day,
        weekday: parts.dayName,
        dateStr: parts.formatted
      };
    });
  }, []);

  // Form states
  const [selectedService, setSelectedService] = useState('معاینه و طرح درمان تخصصی');
  const [selectedDoctor, setSelectedDoctor] = useState('دکتر مهدی امیری (جراح دندانپزشک)');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return getPersianDateParts(d).formatted;
  });
  const [selectedTime, setSelectedTime] = useState('۱۷:۱۵');

  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalCode, setNationalCode] = useState('');

  // Medical Health Questionnaire
  const [hasHighBloodPressure, setHasHighBloodPressure] = useState(false);
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [hasHeartDisease, setHasHeartDisease] = useState(false);
  const [hasDrugAllergy, setHasDrugAllergy] = useState(false);
  const [allergyDetails, setAllergyDetails] = useState('');
  const [isPregnant, setIsPregnant] = useState(false);
  const [takesBloodThinners, setTakesBloodThinners] = useState(false);

  // Completed booking confirmation
  const [confirmedBooking, setConfirmedBooking] = useState<OnlineBookingRequest | null>(null);

  if (!isOpen) return null;

  const servicesList = [
    { id: '1', title: 'معاینه و طرح درمان تخصصی', duration: '۳۰ دقیقه', fee: 200000, desc: 'چکاپ کامل با دوربین داخل دهانی و چارت پالمر' },
    { id: '2', title: 'جرم‌گیری و بروساژ دو فک', duration: '۴۵ دقیقه', fee: 250000, desc: 'حذف پلاک و جرم دندانی با دستگاه اولتراسونیک' },
    { id: '3', title: 'ترمیم کامپوزیت همرنگ', duration: '۴۵ دقیقه', fee: 300000, desc: 'ترمیم پوسیدگی با کامپوزیت نانوهیبرید' },
    { id: '4', title: 'مشاوره و ارزیابی ایمپلنت', duration: '۳۰ دقیقه', fee: 200000, desc: 'بررسی تصاویر CBCT و اسکن سه‌بعدی استخوان' },
    { id: '5', title: 'درمان ریشه تخصصی (اندو)', duration: '۶۰ دقیقه', fee: 350000, desc: 'عصب‌کشی با روتاری دیجیتال و اپکس لوکیتور' },
    { id: '6', title: 'دندانپزشکی اطفال', duration: '۳۰ دقیقه', fee: 200000, desc: 'پالپوتومی، فلورایدتراپی و روکش SS' },
  ];

  const doctorsList = [
    { id: 'dr-1', name: 'دکتر مهدی امیری', specialty: 'جراح دندانپزشک و فلوشیپ ایمپلنت', unit: 'یونیت ۱' },
    { id: 'dr-2', name: 'دکتر مریم رضایی', specialty: 'متخصص درمان ریشه (اندودنتیست)', unit: 'یونیت ۲' }
  ];

  const timeSlots = ['۱۶:۳۰', '۱۷:۱۵', '۱۸:۰۰', '۱۸:۴۵', '۱۹:۳۰', '۲۰:۱۵'];

  const handleConfirmPaymentAndBook = () => {
    triggerHaptic('success');
    const trackingCode = `MD-${Math.floor(10000 + Math.random() * 90000)}`;
    const newBooking: OnlineBookingRequest = {
      id: `book-${Date.now()}`,
      trackingCode,
      patientName: patientName || 'بیمار محترم کلینیک',
      phone: phone || '۰۹۱۲۰۰۰۰۰۰۰',
      nationalCode: nationalCode || '۰۰۱۸۳۷۴۶۲۱',
      serviceTitle: selectedService,
      doctorName: selectedDoctor,
      date: selectedDate,
      time: selectedTime,
      depositAmount: 200000,
      paymentRefNumber: `SHP-${Date.now().toString().slice(-8)}`,
      healthIntake: {
        hasHighBloodPressure,
        hasDiabetes,
        hasHeartDisease,
        hasDrugAllergy,
        isPregnant,
        takesBloodThinners,
        allergyDetails: hasDrugAllergy ? allergyDetails : undefined
      },
      status: 'confirmed',
      createdAt: `امروز ${getCurrentPersianDate()}`
    };

    setConfirmedBooking(newBooking);
    onBookingConfirmed?.(newBooking);
    setCurrentStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-white text-slate-900 rounded-t-[32px] sm:rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">پورتال نوبت‌دهی آنلاین اختصاصی بیمار</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-[#c8ff00] font-bold">
                  Self-Booking
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">کلینیک دندانپزشکی مینادنتال · رزرو سریع ۲۴ ساعته</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator (Only during booking steps 1-3) */}
        {currentStep < 4 && (
          <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200/80 flex items-center justify-between text-xs">
            {[
              { step: 1, title: 'خدمت و پزشک' },
              { step: 2, title: 'زمان نوبت' },
              { step: 3, title: 'سوابق سلامت و بیعانه' }
            ].map(item => (
              <div 
                key={item.step} 
                className={`flex items-center gap-1.5 font-bold ${
                  currentStep === item.step 
                    ? 'text-emerald-700 font-black' 
                    : currentStep > item.step 
                    ? 'text-slate-400' 
                    : 'text-slate-300'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
                  currentStep === item.step 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : currentStep > item.step 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {currentStep > item.step ? '✓' : toPersianDigits(item.step)}
                </span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 no-scrollbar flex-1 bg-slate-50/50">
          
          {/* STEP 1: SERVICE & DOCTOR SELECTION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">۱. انتخاب نوع خدمت درمانی:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {servicesList.map(s => {
                    const isSelected = selectedService === s.title;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedService(s.title);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-1">
                            <span className="text-xs font-black text-slate-900">{s.title}</span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                          </div>
                          <p className="text-[10.5px] text-slate-500">{s.desc}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono text-slate-600">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            {s.duration}
                          </span>
                          <span className="font-bold text-emerald-700">بیعانه: {formatToman(s.fee)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Doctor selection */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="text-xs font-black text-slate-800 block">۲. انتخاب دندانپزشک معالج:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {doctorsList.map(doc => {
                    const isSelected = selectedDoctor.includes(doc.name);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedDoctor(`${doc.name} (${doc.specialty})`);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block">{doc.name}</span>
                            <span className="text-[10px] text-slate-500 block">{doc.specialty}</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-md">
                          {doc.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DATE & TIME SELECTION */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-bold">{selectedService}</span>
                <span className="text-emerald-700 font-medium">{selectedDoctor.split('(')[0]}</span>
              </div>

              {/* Day selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">انتخاب روز ویزیت در ماه {getCurrentPersianMonthName()}:</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {upcomingDays.map(d => {
                    const isSelected = selectedDate === d.dateStr;
                    return (
                      <button
                        key={d.day}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedDate(d.dateStr);
                        }}
                        className={`p-2 rounded-2xl border transition-all flex flex-col items-center justify-center ${
                          isSelected 
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-[9.5px] opacity-75">{d.weekday}</span>
                        <span className="text-sm font-black font-mono mt-0.5">{toPersianDigits(d.day)}</span>
                        <span className="text-[8.5px] opacity-60">آبان</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hour / Time slot selection */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="text-xs font-black text-slate-800 block">انتخاب ساعت خالی در شیفت بعدازظهر:</label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedTime(time);
                        }}
                        className={`py-2 px-3 rounded-xl font-mono text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                          isSelected 
                            ? 'bg-[#0f1b13] text-[#c8ff00] border-[#c8ff00] shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 opacity-60" />
                        <span>{toPersianDigits(time)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PATIENT CONTACT & MEDICAL HEALTH QUESTIONNAIRE */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in text-xs">
              {/* Contact Inputs */}
              <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="font-black text-slate-900 block text-xs">مشخصات هویتی و تماس بیمار:</span>
                
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">نام و نام خانوادگی بیمار *</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="مثال: کیان رادفر"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">شماره همراه (جهت پیامک نوبت) *</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">کد ملی (جهت پرونده بیمه)</label>
                    <input
                      type="text"
                      value={nationalCode}
                      onChange={(e) => setNationalCode(e.target.value)}
                      placeholder="۰۰۱۲۳۴۵۶۷۸"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Health Self-Declaration Questionnaire */}
              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-amber-900 font-black">
                  <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                  <span>پرسشنامه خوداظهاری سلامت عمومی (الزام پزشکی قبل از درمان):</span>
                </div>

                <p className="text-[10.5px] text-amber-800 leading-relaxed">
                  لطفاً در صورت داشتن هر یک از موارد زیر حتماً علامت بزنید تا تمهیدات لازم حین بی‌حسی و درمان اتخاذ شود:
                </p>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasHighBloodPressure}
                      onChange={(e) => setHasHighBloodPressure(e.target.checked)}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span className="font-bold text-slate-800">سابقه فشار خون بالا (Hypertension)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDiabetes}
                      onChange={(e) => setHasDiabetes(e.target.checked)}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span className="font-bold text-slate-800">ابتلا به دیابت یا مصرف انسولین</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasHeartDisease}
                      onChange={(e) => setHasHeartDisease(e.target.checked)}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span className="font-bold text-slate-800">بیماری قلبی، آنژیوپلاستی یا سابقه فنر عروق</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={takesBloodThinners}
                      onChange={(e) => setTakesBloodThinners(e.target.checked)}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span className="font-bold text-slate-800">مصرف داروهای رقیق‌کننده خون (وارفارین، آسپیرین، پلاویکس)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDrugAllergy}
                      onChange={(e) => setHasDrugAllergy(e.target.checked)}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span className="font-bold text-rose-700">حساسیت به دارو (پنی‌سیلین، لیدوکائین بی‌حسی، ایبوپروفن)</span>
                  </label>

                  {hasDrugAllergy && (
                    <input
                      type="text"
                      value={allergyDetails}
                      onChange={(e) => setAllergyDetails(e.target.value)}
                      placeholder="نام دقیق داروی حساسیت‌زا را بنویسید..."
                      className="w-full bg-white border border-rose-300 rounded-xl px-3 py-1.5 text-xs text-rose-900 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Deposit Payment Box */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">مبلغ بیعانه ثبت قطعی نوبت:</span>
                  <span className="text-sm font-black text-[#c8ff00] font-mono">{formatToman(200000)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>درگاه امن بانکی شاپرک</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMED BOOKING SLIP & QR BARCODE */}
          {currentStep === 4 && confirmedBooking && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200 text-slate-900">
              {/* Success Badge */}
              <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-300 text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="font-black text-sm text-emerald-950 mt-1">نوبت شما با موفقیت رزرو و تایید گردید!</h4>
                <p className="text-[11px] text-emerald-800 font-medium">
                  پیامک تایید حاوی لینک نقشه کلینیک به شماره {toPersianDigits(confirmedBooking.phone)} ارسال شد.
                </p>
              </div>

              {/* Digital Admission Slip Card with Barcode */}
              <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-emerald-300 shadow-md space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">کلینیک دندانپزشکی مینادنتال</span>
                    <span className="text-[10px] text-slate-400">برگه الکترونیک پذیرش بیمار</span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[10px] text-slate-400 block">کد رهگیری:</span>
                    <span className="text-xs font-black text-emerald-700">{confirmedBooking.trackingCode}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">بیمار:</span>
                    <span className="font-black text-slate-800">{confirmedBooking.patientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">پزشک معالج:</span>
                    <span className="font-bold text-slate-800">{confirmedBooking.doctorName.split('(')[0]}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">تاریخ نوبت:</span>
                    <span className="font-mono font-bold text-slate-800">{confirmedBooking.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ساعت حضور:</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">{toPersianDigits(confirmedBooking.time)}</span>
                  </div>
                </div>

                {/* QR Code Graphic for Fast Gate Check-in */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-8 h-8 text-slate-800" />
                    <div>
                      <span className="text-[11px] font-black text-slate-900 block">بارکد پذیرش سریع در کلینیک</span>
                      <span className="text-[9.5px] text-slate-500">هنگام ورود به منشی یا اسکنر کانتر نشان دهید</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-xl border text-slate-700">
                    {confirmedBooking.paymentRefNumber}
                  </span>
                </div>

                {/* GPS Location Buttons */}
                <div className="pt-1 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>مسیریابی مطب در نشان و بلد:</span>
                  </span>
                  <div className="flex items-center gap-1 font-bold">
                    <button 
                      onClick={() => alert('لینک مسیریاب نشان باز شد.')} 
                      className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200"
                    >
                      نشان
                    </button>
                    <button 
                      onClick={() => alert('لینک مسیریاب بلد باز شد.')} 
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      بلد
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
          {currentStep === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setCurrentStep(2);
                }}
                className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <span>مرحله بعد: انتخاب روز و ساعت</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                بازگشت
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setCurrentStep(3);
                }}
                className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <span>مرحله بعد: سوابق سلامت و بیعانه</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}

          {currentStep === 3 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                بازگشت
              </button>
              <button
                type="button"
                onClick={handleConfirmPaymentAndBook}
                className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>پرداخت بیعانه و ثبت نهایی نوبت</span>
              </button>
            </>
          )}

          {currentStep === 4 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            >
              بستن و اتمام
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
