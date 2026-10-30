import React, { useState } from 'react';
import { 
  BellRing, Send, CheckCircle2, MessageSquare, Clock, 
  ShieldCheck, HeartPulse, Sparkles, Plus, Check,
  Smartphone, User, RefreshCw, SlidersHorizontal, Search,
  X, Calendar, ChevronDown, ChevronUp, AlertCircle, FileCheck2,
  Clock3, ShieldAlert, CheckSquare, Zap, Filter
} from 'lucide-react';
import { toPersianDigits, getRelativePersianDate } from '../../utils/jalali';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { clinicalSmsService } from '../../services/smsService';

interface RemindersViewProps {
  onOpenSmsGatewaySettings?: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ onOpenSmsGatewaySettings }) => {
  const { impactLight, impactHeavy, success, selection } = useHapticFeedback();
  
  // Chip navigation: active | config | composer | logs
  const [activeChip, setActiveChip] = useState<'active' | 'config' | 'composer' | 'logs'>('active');

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentAlert, setSentAlert] = useState<string | null>(null);

  // Advance Days Settings State with persistent storage (تنظیم چند روز قبل یادآوری کند)
  const [checkAdvanceDays, setCheckAdvanceDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('minadental_check_advance_days');
      if (saved) return Number(saved);
    } catch {}
    return 3; // ۳ روز قبل از سررسید چک صیادی
  });

  const [installmentAdvanceDays, setInstallmentAdvanceDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('minadental_installment_advance_days');
      if (saved) return Number(saved);
    } catch {}
    return 2; // ۲ روز قبل از سررسید قسط
  });

  const [appointmentAdvanceHours, setAppointmentAdvanceHours] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('minadental_appointment_advance_hours');
      if (saved) return Number(saved);
    } catch {}
    return 24; // ۲۴ ساعت قبل از نوبت
  });

  const [postOpFollowupDays, setPostOpFollowupDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('minadental_postop_advance_days');
      if (saved) return Number(saved);
    } catch {}
    return 2; // ۲ روز بعد از جراحی / عصب‌کشی
  });

  const [labDeliveryAdvanceDays, setLabDeliveryAdvanceDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('minadental_lab_advance_days');
      if (saved) return Number(saved);
    } catch {}
    return 2; // ۲ روز قبل از موعد کار لابراتوار
  });

  const [periodicRecallMonths, setPeriodicRecallMonths] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('minadental_periodic_recall_months');
      if (saved) return Number(saved);
    } catch {}
    return 6; // ۶ ماه بعد برای چکاپ دوره‌ای
  });

  const [autoSendSms, setAutoSendSms] = useState<boolean>(true);

  const saveAdvanceSetting = (key: string, value: number, setter: (val: number) => void) => {
    selection();
    setter(value);
    try {
      localStorage.setItem(key, value.toString());
    } catch {}
    setSentAlert('تنظیم زمان یادآوری ذخیره شد.');
    setTimeout(() => setSentAlert(null), 2500);
  };

  // Custom SMS composer states
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [smsText, setSmsText] = useState('سلام؛ نوبت دندانپزشکی شما فردا ساعت ۱۷:۰۰ در کلینیک دندانپزشکی مینادنتال رزرو شده است. لطفاً در صورت عدم حضور ۱۰ ساعت قبل اطلاع دهید.');

  // Collapsible cards state
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  const [logs, setLogs] = useState([
    { id: 'l1', to: 'علی مرادی', phone: '۰۹۱۲۳۴۵۶۷۸۹', text: 'روکش زیرکونیا دندان ۶ آماده تحویل در کلینیک است.', time: 'امروز ۱۰:۱۵', status: 'تحویل شده' },
    { id: 'l2', to: 'سارا رضایی', phone: '۰۹۱۹۸۷۶۵۴۳۲', text: 'یادآوری سررسید چک صیادی تاریخ ۲۵ آبان به مبلغ ۱۰ میلیون تومان.', time: 'دیروز ۱۸:۳۰', status: 'تحویل شده' },
    { id: 'l3', to: 'محمد حسینی', phone: '۰۹۳۵۱۱۱۱۱۱۱', text: 'دستورات پس از جراحی ایمپلنت: کمپرس سرد و مصرف آنتی‌بیوتیک.', time: getRelativePersianDate(-1), status: 'تحویل شده' },
  ]);

  const [remindersList, setRemindersList] = useState([
    {
      id: 'r1',
      title: 'یادآوری تحویل کار لابراتوار (UR5 علی مرادی)',
      subtitle: 'نوبت بیمار فردا ساعت ۱۶:۳۰ است. روکش زیرکونیا آماده و در مطب دریافت شده است.',
      type: 'lab',
      time: 'امروز ساعت ۱۴:۰۰',
      actionText: 'ارسال پیامک آماده بودن روکش',
      patientName: 'علی مرادی',
      phone: '۰۹۱۲۳۴۵۶۷۸۹',
      status: 'pending'
    },
    {
      id: 'r2',
      title: 'یادآوری سررسید چک صیادی (۱۰ میلیون تومان)',
      subtitle: `چک صیادی شماره ۷۳۰۱۸۴۹۲۱۶۴۸۵۲۱۰ در تاریخ ۲۵ آبان سررسید می‌شود (${checkAdvanceDays} روز قبل طبق تنظیمات).`,
      type: 'financial',
      time: `${checkAdvanceDays} روز دیگر`,
      actionText: 'ارسال پیامک یادآوری چک',
      patientName: 'سارا رضایی',
      phone: '۰۹۱۹۸۷۶۵۴۳۲',
      status: 'pending'
    },
    {
      id: 'r3',
      title: 'پیگیری پس از جراحی ایمپلنت دندان ۶',
      subtitle: 'ارسال دستورات پس از جراحی، شستشو با کلرهگزیدین و استعلام وضعیت درد و خونریزی بیمار.',
      type: 'post_op',
      time: 'ساعت ۱۸:۰۰',
      actionText: 'ارسال پیامک مراقبت جراحی',
      patientName: 'محمد حسینی',
      phone: '۰۹۳۵۱۱۱۱۱۱۱',
      status: 'pending'
    },
    {
      id: 'r4',
      title: 'یادآوری دوره استئواینتگریشن فیکسچر',
      subtitle: 'موعد بررسی رادیوگرافی و بستن هیلینگ کپ (Healing Abutment) در تاریخ ۱۵ آذرماه.',
      type: 'implant',
      time: '۱۵ آذر',
      actionText: 'ثبت در تقویم نوبت‌دهی',
      patientName: 'کامران بهرامی',
      phone: '۰۹۱۲۵۵۵۶۶۷۷',
      status: 'pending'
    },
    {
      id: 'r5',
      title: 'سررسید قسط دوم ارتودنسی (۵ میلیون تومان)',
      subtitle: `قسط درمانی بیمار در تاریخ ۳۰ آبان سررسید می‌شود (${installmentAdvanceDays} روز قبل طبق تنظیمات).`,
      type: 'financial',
      time: '۳۰ آبان',
      actionText: 'ارسال پیامک یادآوری قسط',
      patientName: 'فاطمه ابراهیمی',
      phone: '۰۹۱۲۹۹۹۸۸۷۷',
      status: 'pending'
    }
  ]);

  const templates = [
    { title: 'تایید و یادآوری نوبت', text: 'سلام؛ نوبت ویزیت و درمان شما در کلینیک دندانپزشکی مینادنتال فردا ساعت [ساعت] ثبت شده است. در صورت نیاز به تغییر ساعت اطلاع دهید.' },
    { title: 'مراقبت‌های بعد جراحی / کشیدن', text: 'بیمار گرامی کلینیک مینادنتال؛ لطفاً گاز استریل را تا ۱ ساعت روی موضع فشرده و از شستشوی دهان تا ۲۴ ساعت خودداری فرمایید.' },
    { title: 'آماده بودن روکش / لابراتوار', text: 'بیمار گرامی؛ روکش/پروتز دندان شما از لابراتوار واصل شده است. لطفاً جهت تحویل و سمان با کلینیک مینادنتال تماس حاصل فرمایید.' },
    { title: 'سررسید چک صیادی', text: 'احتراماً یادآوری می‌شود موعد سررسید چک صیادی شما در تاریخ [تاریخ] نزدیک است. با تشکر از خوش‌حسابی شما - کلینیک مینادنتال' },
    { title: 'سررسید قسط درمان', text: 'بیمار گرامی؛ موعد پرداخت قسط درمان دندانپزشکی شما فرارسیده است. لطفاً جهت واریز یا هماهنگی اقدام فرمایید.' },
    { title: 'چکاپ دوره‌ای ۶ ماهه', text: 'سلام؛ ۶ ماه از آخرین چکاپ دندانپزشکی شما سپری شده است. جهت رزرو وقت معاینه دوره‌ای رایگان با ما تماس بگیرید.' }
  ];

  const toggleCollapse = (id: string) => {
    selection();
    setCollapsedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSend = async (title: string, phone = '۰۹۱۲۰۰۰۰۰۰۰', recipient = 'بیمار', reminderType: string = 'appointment_reminder') => {
    impactHeavy();
    
    // Map reminder type to pattern
    let pType: 'appointment_reminder' | 'sayad_check_due' | 'installment_due' | 'lab_ready' | 'implant_healing_recall' = 'appointment_reminder';
    if (reminderType.includes('چک') || title.includes('چک')) pType = 'sayad_check_due';
    else if (reminderType.includes('قسط') || title.includes('قسط')) pType = 'installment_due';
    else if (reminderType.includes('لابراتوار') || title.includes('روکش')) pType = 'lab_ready';
    else if (reminderType.includes('ایمپلنت') || title.includes('ایمپلنت')) pType = 'implant_healing_recall';

    const res = await clinicalSmsService.sendPatternSms(
      phone,
      recipient,
      pType,
      {
        date: getRelativePersianDate(1),
        time: '۱۷:۰۰',
        amount: '۱۰٬۰۰۰٬۰۰۰',
        dueDate: getRelativePersianDate(checkAdvanceDays)
      }
    );

    setSentAlert(`پیامک خدماتی (کد پیگیری: ${res.refId}) به ${recipient} (${phone}) با موفقیت مخابره شد.`);
    setTimeout(() => setSentAlert(null), 3500);

    setLogs(prev => [
      { id: `l-${Date.now()}`, to: recipient, phone: phone, text: title, time: 'هم‌اکنون', status: 'تحویل شده (خدماتی)' },
      ...prev
    ]);
  };

  const handleMarkDone = (id: string) => {
    impactLight();
    setRemindersList(prev => prev.filter(r => r.id !== id));
    setSentAlert('یادآوری با موفقیت انجام شد و از لیست هشدارهای فعال حذف گردید.');
    setTimeout(() => setSentAlert(null), 3000);
  };

  const handleSendCustomSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsText) return;
    handleSend(smsText, recipientPhone || '۰۹۱۲۰۰۰۰۰۰۰', recipientName || 'بیمار');
    setRecipientName('');
    setRecipientPhone('');
  };

  const filteredReminders = remindersList.filter(item => {
    if (!searchQuery) return true;
    return item.title.includes(searchQuery) ||
      item.subtitle.includes(searchQuery) ||
      item.patientName.includes(searchQuery);
  });

  return (
    <div className="pb-28 space-y-3">
      {/* Toast Alert */}
      {sentAlert && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#162719] border border-emerald-400 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="w-6 h-6 rounded-full bg-emerald-400 text-black flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-xs font-bold leading-tight">{sentAlert}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <BellRing className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-800">یادآوری‌ها</h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Animated Search Button */}
              <button
                onClick={() => {
                  selection();
                  setSearchOpen(!searchOpen);
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  searchOpen ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="جستجوی یادآوری"
              >
                <Search className="w-4 h-4" />
              </button>

              {onOpenSmsGatewaySettings && (
                <button
                  onClick={() => {
                    impactLight();
                    onOpenSmsGatewaySettings();
                  }}
                  className="py-1 px-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-[11px] flex items-center gap-1 transition-all"
                  title="تنظیمات وب‌سرویس پیامک (فراز اس‌ام‌اس، کاوه‌نگار، ملی‌پیامک)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">درگاه پیامک</span>
                </button>
              )}

              <div className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-mono font-bold">
                <span>شارژ: ۳,۸۵۰</span>
              </div>
            </div>
          </div>

          {/* Animated Search Input */}
          {searchOpen && (
            <div className="relative animate-in fade-in slide-in-from-top-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو در هشدارها با نام بیمار یا موضوع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-slate-50 border border-amber-200 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
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

          {/* Horizontal Scrollable Chips Navigation Bar (چیپ رونده چپ و راست با تمام بخش‌های ماژول) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => {
                selection();
                setActiveChip('active');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'active'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>آلارم‌های هوشمند ({toPersianDigits(remindersList.length)})</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('config');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'config'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>تنظیم روزهای پیش‌فرض یادآوری</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('composer');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'composer'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5 -scale-x-100" />
              <span>ارسال پیامک و الگوها</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('logs');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'logs'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>گزارش ارسال‌ها</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHIP 1: ACTIVE SMART ALARMS */}
      {activeChip === 'active' && (
        <div className="mx-2 space-y-2.5">
          {filteredReminders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
              هیچ یادآوری معوقه‌ای در حال حاضر وجود ندارد.
            </div>
          ) : (
            filteredReminders.map(item => {
              const isCollapsed = !!collapsedItems[item.id];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2 hover:shadow-sm transition-all"
                >
                  {/* Collapsible Card Header */}
                  <div
                    onClick={() => toggleCollapse(item.id)}
                    className="flex items-start justify-between cursor-pointer select-none"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{item.title}</h4>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.patientName}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-700 font-bold block font-mono">
                        موعد: {toPersianDigits(item.time)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700">
                        {item.type === 'lab' && <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />}
                        {item.type === 'financial' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                        {item.type === 'post_op' && <HeartPulse className="w-3.5 h-3.5 text-rose-600" />}
                        {item.type === 'implant' && <Clock className="w-3.5 h-3.5 text-sky-600" />}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Body (Collapsible) */}
                  {!isCollapsed && (
                    <div className="space-y-2 pt-1 border-t border-slate-100 animate-in fade-in">
                      <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {item.subtitle}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleMarkDone(item.id)}
                          className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>انجام شد</span>
                        </button>

                        <button
                          onClick={() => handleSend(item.title, item.phone, item.patientName)}
                          className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                        >
                          <Send className="w-3.5 h-3.5 -scale-x-100" />
                          <span>{item.actionText}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CHIP 2: ADVANCE DAYS CONFIGURATION (بخش یادآوری قابل تعیین چند روز قبل) */}
      {activeChip === 'config' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-black text-slate-800">تعیین زمان‌بندی یادآوری‌های پیش‌فرض</h4>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-mono font-bold">
                تنظیم روزها قبل از سررسید
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              مشخص کنید سیستم هوشمند مینادنتال چند روز پیش از فرارسیدن موعد چک، قسط، نوبت و پیگیری، هشدارها را ایجاد کند:
            </p>

            {/* Config Item 1: Sayad Checks */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">سررسید چک‌های صیادی</span>
                  <span className="text-[10px] text-slate-400">ارسال هشدار به پزشک و پیامک خوش‌حسابی به بیمار</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                  {toPersianDigits(checkAdvanceDays)} روز قبل
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 5, 7].map(days => (
                  <button
                    key={days}
                    onClick={() => saveAdvanceSetting('minadental_check_advance_days', days, setCheckAdvanceDays)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      checkAdvanceDays === days
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {toPersianDigits(days)} روز
                  </button>
                ))}
              </div>
            </div>

            {/* Config Item 2: Installments */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">اقساط درمانی معوقه</span>
                  <span className="text-[10px] text-slate-400">یادآوری سررسید قسط ارتودنسی، ایمپلنت و کامپوزیت</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                  {toPersianDigits(installmentAdvanceDays)} روز قبل
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 7].map(days => (
                  <button
                    key={days}
                    onClick={() => saveAdvanceSetting('minadental_installment_advance_days', days, setInstallmentAdvanceDays)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      installmentAdvanceDays === days
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {toPersianDigits(days)} روز
                  </button>
                ))}
              </div>
            </div>

            {/* Config Item 3: Appointment Reminders */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">پیامک یادآوری نوبت ویزیت</span>
                  <span className="text-[10px] text-slate-400">ارسال خودکار ساعت حضور و آدرس کلینیک</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                  {toPersianDigits(appointmentAdvanceHours)} ساعت قبل
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[12, 24, 48].map(hours => (
                  <button
                    key={hours}
                    onClick={() => saveAdvanceSetting('minadental_appointment_advance_hours', hours, setAppointmentAdvanceHours)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      appointmentAdvanceHours === hours
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {toPersianDigits(hours)} ساعت
                  </button>
                ))}
              </div>
            </div>

            {/* Config Item 4: Post-Op Care */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">پیگیری پس از جراحی / عصب‌کشی</span>
                  <span className="text-[10px] text-slate-400">استعلام حال عمومی بیمار و کنترل عفونت یا درد</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                  {toPersianDigits(postOpFollowupDays)} روز بعد
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 5].map(days => (
                  <button
                    key={days}
                    onClick={() => saveAdvanceSetting('minadental_postop_advance_days', days, setPostOpFollowupDays)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      postOpFollowupDays === days
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {toPersianDigits(days)} روز بعد
                  </button>
                ))}
              </div>
            </div>

            {/* Config Item 5: Lab Orders Delivery */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">پیگیری موعد دریافت کار لابراتوار</span>
                  <span className="text-[10px] text-slate-400">هشدار تماس با پیک یا مسئول لابراتوار</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                  {toPersianDigits(labDeliveryAdvanceDays)} روز قبل
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3].map(days => (
                  <button
                    key={days}
                    onClick={() => saveAdvanceSetting('minadental_lab_advance_days', days, setLabDeliveryAdvanceDays)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      labDeliveryAdvanceDays === days
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {toPersianDigits(days)} روز قبل
                  </button>
                ))}
              </div>
            </div>

            {/* Save & Apply Button */}
            <button
              onClick={() => {
                impactHeavy();
                setSentAlert('تنظیمات زمان‌بندی یادآوری‌های هوشمند با موفقیت ذخیره و فعال شد.');
                setTimeout(() => setSentAlert(null), 3500);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all"
            >
              ذخیره و اعمال در سامانه آلارم‌های کلینیک
            </button>
          </div>
        </div>
      )}

      {/* CHIP 3: CUSTOM SMS COMPOSER */}
      {activeChip === 'composer' && (
        <div className="mx-2 space-y-2.5">
          {/* Quick template buttons */}
          <div className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2">
            <span className="text-xs font-black text-slate-800 block">الگوهای بالینی آماده و استاندارد:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    selection();
                    setSmsText(tpl.text);
                  }}
                  className="text-right p-2 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200/80 text-[11px] font-bold text-slate-700 hover:text-amber-900 transition-all"
                >
                  ⚡ {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Composer Box */}
          <div className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-3">
            <span className="text-xs font-black text-slate-800 block">متن و گیرنده پیامک:</span>

            <form onSubmit={handleSendCustomSms} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-bold block mb-1">نام مخاطب</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="مثلاً: علی مرادی"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-bold block mb-1">شماره موبایل *</label>
                  <input
                    type="text"
                    required
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1 flex items-center justify-between">
                  <span>متن پیامک</span>
                  <span className="text-[10px] text-slate-400 font-mono">{toPersianDigits(smsText.length)} کاراکتر (۱ پیامک فارسی)</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4 -scale-x-100" />
                <span>ارسال فوری پیامک از طریق خط خدماتی اختصاصی</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CHIP 4: LOGS & HISTORY */}
      {activeChip === 'logs' && (
        <div className="mx-2 space-y-2">
          {logs.map(log => (
            <div
              key={log.id}
              className="bg-white rounded-[20px] p-3 shadow-2xs border border-slate-100 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">{log.to}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({log.phone})</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {log.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg">
                {log.text}
              </p>
              <span className="text-[9px] text-slate-400 block text-left font-mono">{toPersianDigits(log.time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
