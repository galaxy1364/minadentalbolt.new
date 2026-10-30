import React, { useState } from 'react';
import { 
  Megaphone, Sparkles, Gift, Users, Send, 
  Search, Plus, CheckCircle2, Calendar, Percent, 
  Smartphone, Share2, Tag, Trophy, ArrowUpRight,
  SlidersHorizontal, Check, X, ChevronDown, ChevronUp,
  Heart, Copy, Eye, BarChart3, AlertCircle
} from 'lucide-react';
import { Patient } from '../../types/dental';
import { toPersianDigits, formatToman, getCurrentPersianDate, getRelativePersianDate, getCurrentPersianMonthName } from '../../utils/jalali';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface MarketingCampaignsViewProps {
  patients: Patient[];
  onOpenPatientFile?: (patient: Patient) => void;
}

interface Campaign {
  id: string;
  title: string;
  targetAudience: string;
  audienceCount: number;
  discountPercent: number;
  promoCode: string;
  smsText: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'ended';
  convertedCount: number;
  revenueGenerated: number;
}

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    title: 'جشنواره لبخند طلایی (کامپوزیت و لمینت زیبایی)',
    targetAudience: 'بیماران متقاضی زیبایی و ونیر',
    audienceCount: 340,
    discountPercent: 15,
    promoCode: 'MINA-SMILE',
    smsText: 'سلام [نام] عزیز؛ جشنواره زیبایی مینادنتال آغاز شد! تا پایان ماه با ۱۵٪ تخفیف ویژه روی کامپوزیت IPS و لمینت سرامیکی در خدمتتان هستیم. رزرو وقت: ۰۲۱۸۸۲۲۳۳۴۴',
    startDate: getRelativePersianDate(-15),
    endDate: getRelativePersianDate(15),
    status: 'active',
    convertedCount: 28,
    revenueGenerated: 84000000
  },
  {
    id: 'camp-2',
    title: `تبریک تولد بیماران متولد ${getCurrentPersianMonthName()}`,
    targetAudience: 'متولدین ماه جاری',
    audienceCount: 42,
    discountPercent: 25,
    promoCode: 'BDAY-GIFT',
    smsText: 'زادروزتان فرخنده باد! هدیه کلینیک دندانپزشکی مینادنتال به شما: جرم‌گیری و بروساژ رایگان یا ۲۵٪ تخفیف کلیه خدمات تا پایان ماه تولدتان.',
    startDate: getRelativePersianDate(-10),
    endDate: getRelativePersianDate(20),
    status: 'active',
    convertedCount: 16,
    revenueGenerated: 32000000
  },
  {
    id: 'camp-3',
    title: 'فراخوان بازگشت بیماران (چکاپ دوره‌ای ۶ ماهه)',
    targetAudience: 'بیماران بدون مراجعه بیش از ۶ ماه',
    audienceCount: 185,
    discountPercent: 20,
    promoCode: 'RECALL-20',
    smsText: 'سلام [نام] گرامی؛ بیش از ۶ ماه از آخرین ویزیت دندانپزشکی شما سپری شده است. جهت پیشگیری از پوسیدگی و معاینه دوره‌ای رایگان با ما تماس بگیرید. کلینیک مینادنتال',
    startDate: getRelativePersianDate(-45),
    endDate: getRelativePersianDate(-5),
    status: 'ended',
    convertedCount: 44,
    revenueGenerated: 58000000
  }
];

export const MarketingCampaignsView: React.FC<MarketingCampaignsViewProps> = ({
  patients,
  onOpenPatientFile
}) => {
  const { impactLight, impactHeavy, success, selection } = useHapticFeedback();

  // Chips: campaigns | birthday | recall | club | banners
  const [activeChip, setActiveChip] = useState<'campaigns' | 'birthday' | 'recall' | 'club' | 'banners'>('campaigns');

  const [campaigns, setCampaigns] = useState<Campaign[]>(DEFAULT_CAMPAIGNS);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [collapsedCampaigns, setCollapsedCampaigns] = useState<Record<string, boolean>>({});

  // Form states for new campaign
  const [formTitle, setFormTitle] = useState('');
  const [formAudience, setFormAudience] = useState('همه بیماران کلینیک');
  const [formDiscount, setFormDiscount] = useState<number>(15);
  const [formCode, setFormCode] = useState('');
  const [formSmsText, setFormSmsText] = useState('');
  const [formEndDate, setFormEndDate] = useState(getRelativePersianDate(30));

  // Loyalty club points state
  const [referralBonusToman, setReferralBonusToman] = useState<number>(500000);
  const [cashbackPercent, setCashbackPercent] = useState<number>(5);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const toggleCampaignCollapse = (id: string) => {
    selection();
    setCollapsedCampaigns(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;

    impactHeavy();
    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      title: formTitle,
      targetAudience: formAudience,
      audienceCount: Math.max(10, patients.length * 15),
      discountPercent: formDiscount,
      promoCode: formCode || `MINA-${Math.floor(1000 + Math.random() * 9000)}`,
      smsText: formSmsText || `سلام؛ تخفیف ویژه کلینیک دندانپزشکی مینادنتال برای شما به مناسبت ${formTitle}. کد: ${formCode}`,
      startDate: getCurrentPersianDate(),
      endDate: formEndDate,
      status: 'active',
      convertedCount: 0,
      revenueGenerated: 0
    };

    setCampaigns([newCamp, ...campaigns]);
    success();
    showToast(`کمپین تبلیغاتی "${formTitle}" با موفقیت ایجاد و فعال شد.`);
    setShowNewCampaignModal(false);
    setFormTitle('');
    setFormCode('');
    setFormSmsText('');
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (!searchQuery) return true;
    return c.title.includes(searchQuery) || c.promoCode.includes(searchQuery) || c.targetAudience.includes(searchQuery);
  });

  return (
    <div className="pb-28 space-y-3">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#24131e] border border-pink-400 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="w-6 h-6 rounded-full bg-pink-400 text-black flex items-center justify-center shrink-0">
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
              <div className="w-9 h-9 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
                <Megaphone className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-800">تبلیغات</h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Search Toggle */}
              <button
                onClick={() => {
                  selection();
                  setSearchOpen(!searchOpen);
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  searchOpen ? 'bg-pink-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="جستجوی کمپین"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  impactLight();
                  setShowNewCampaignModal(true);
                }}
                className="py-1.5 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>کمپین جدید</span>
              </button>
            </div>
          </div>

          {/* Animated Search Bar */}
          {searchOpen && (
            <div className="relative animate-in fade-in slide-in-from-top-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو در کمپین‌ها با عنوان یا کد تخفیف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-slate-50 border border-pink-200 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500 shadow-2xs"
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

          {/* Horizontal Scrollable Chips Navigation Bar (چیپ رونده چپ و راست با رنگ‌های اختصاصی) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => {
                selection();
                setActiveChip('campaigns');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'campaigns'
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>جشنواره‌های پیامکی ({toPersianDigits(campaigns.length)})</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('birthday');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'birthday'
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>هدیه تولد بیماران</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('recall');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'recall'
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>فراخوان بیماران غیرفعال</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('club');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'club'
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>باشگاه وفاداری و معرف</span>
            </button>

            <button
              onClick={() => {
                selection();
                setActiveChip('banners');
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === 'banners'
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>بنرهای اینستاگرام / استوری</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHIP 1: SMS CAMPAIGNS */}
      {activeChip === 'campaigns' && (
        <div className="mx-2 space-y-2.5">
          {filteredCampaigns.map(camp => {
            const isCollapsed = !!collapsedCampaigns[camp.id];

            return (
              <div
                key={camp.id}
                className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2 hover:shadow-sm transition-all"
              >
                {/* Collapsible Header */}
                <div
                  onClick={() => toggleCampaignCollapse(camp.id)}
                  className="flex items-start justify-between cursor-pointer select-none"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900">{camp.title}</h4>
                      <span className="text-[10px] font-mono font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-md">
                        {camp.promoCode}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      مخاطبان هدف: {camp.targetAudience} ({toPersianDigits(camp.audienceCount)} نفر)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      camp.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {camp.status === 'active' ? 'در حال اجرا' : 'خاتمه یافته'}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {/* Quick Performance Numbers */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[9px] font-sans">تخفیف جشنواره</span>
                    <span className="font-black text-pink-600">{toPersianDigits(camp.discountPercent)}٪</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-sans">بیماران جذب‌شده</span>
                    <span className="font-black text-emerald-700">{toPersianDigits(camp.convertedCount)} نفر</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-sans">درآمد حاصله</span>
                    <span className="font-black text-slate-800">{formatToman(camp.revenueGenerated)}</span>
                  </div>
                </div>

                {/* Collapsible Body */}
                {!isCollapsed && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-100 animate-in fade-in">
                    <div className="bg-pink-50/50 p-2.5 rounded-xl border border-pink-100 text-[11px] text-slate-700 leading-relaxed font-sans">
                      <span className="text-[10px] text-pink-700 font-bold block mb-1">متن پیامک ارسالی:</span>
                      {camp.smsText}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>مهلت اعتبار: <b className="font-mono text-slate-800">{toPersianDigits(camp.endDate)}</b></span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            impactLight();
                            navigator.clipboard?.writeText(camp.promoCode);
                            showToast(`کد تخفیف ${camp.promoCode} کپی شد.`);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>کپی کد</span>
                        </button>

                        <button
                          onClick={() => {
                            impactHeavy();
                            showToast(`پیامک کمپین برای ${toPersianDigits(camp.audienceCount)} مخاطب هدف با موفقیت صف‌بندی و ارسال شد.`);
                          }}
                          className="py-1.5 px-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                        >
                          <Send className="w-3 h-3 -scale-x-100" />
                          <span>ارسال گروهی پیامک</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CHIP 2: BIRTHDAY AUTOMATION */}
      {activeChip === 'birthday' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-pink-600" />
                <h4 className="text-xs font-black text-slate-800">سامانه خودکار تبریک تولد بیماران</h4>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                فعال و هوشمند
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              سیستم به صورت خودکار در ساعت ۱۰ صبح روز تولد هر بیمار، پیامک تبریک به همراه کوپن هدیه کلینیک مینادنتال ارسال می‌کند:
            </p>

            <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-pink-900">هدیه پیش‌فرض کلینیک:</span>
                <span className="font-bold text-pink-700">جرم‌گیری رایگان یا ۲۵٪ تخفیف</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                «[نام] عزیز؛ زادروزتان مبارک. کلینیک مینادنتال یک جلسه جرم‌گیری و بروساژ رایگان تا پایان ماه به عنوان هدیه برای شما در نظر گرفته است. رزرو نوبت: ۰۲۱۸۸۲۲۳۳۴۴»
              </p>
            </div>

            <div className="pt-1">
              <button
                onClick={() => {
                  impactHeavy();
                  showToast('پیامک‌های تبریک متولدین این هفته با موفقیت ارسال شدند.');
                }}
                className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs shadow-md shadow-pink-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>بررسی و ارسال برای متولدین امروز و این هفته</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHIP 3: RECALL & RE-ENGAGEMENT */}
      {activeChip === 'recall' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-600" />
                <h4 className="text-xs font-black text-slate-800">فراخوان هوشمند بازگشت بیماران (Recall)</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {toPersianDigits(185)} بیمار واجد شرایط
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] text-amber-800 block">عدم مراجعه ۶ تا ۱۲ ماه</span>
                <span className="text-sm font-black text-amber-900 font-mono mt-0.5 block">{toPersianDigits(112)} نفر</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] text-rose-800 block">بیش از ۱ سال بدون ویزیت</span>
                <span className="text-sm font-black text-rose-900 font-mono mt-0.5 block">{toPersianDigits(73)} نفر</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">مزیت فراخوان بیماران:</span>
              <p className="leading-relaxed">
                ارسال پیامک چکاپ دوره‌ای و یادآوری سلامت دندان‌ها نرخ بازگشت بیماران کلینیک را تا ۳۵٪ افزایش می‌دهد و پوسیدگی‌های زودهنگام را قبل از نیاز به عصب‌کشی مهار می‌کند.
              </p>
            </div>

            <button
              onClick={() => {
                impactHeavy();
                showToast(`پیامک فراخوان چکاپ برای ۱۸۵ بیمار غیرفعال با موفقیت ارسال شد.`);
              }}
              className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs shadow-md shadow-pink-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 -scale-x-100" />
              <span>ارسال سراسری پیامک فراخوان چکاپ رایگان</span>
            </button>
          </div>
        </div>
      )}

      {/* CHIP 4: LOYALTY CLUB & REFERRAL */}
      {activeChip === 'club' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-pink-600" />
                <h4 className="text-xs font-black text-slate-800">باشگاه وفاداری و معرفی دوستان (Referral)</h4>
              </div>
              <span className="text-[10px] bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md font-bold font-mono">
                کیف پول اعتباری
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">پاداش معرفی بیمار جدید:</span>
                  <span className="font-mono font-black text-pink-700">{formatToman(referralBonusToman)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[200000, 300000, 500000, 1000000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => {
                        selection();
                        setReferralBonusToman(amount);
                      }}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                        referralBonusToman === amount
                          ? 'bg-pink-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {formatToman(amount)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">کش‌بک نقدی به کیف پول بیمار:</span>
                  <span className="font-mono font-black text-pink-700">{toPersianDigits(cashbackPercent)}٪ از هر درمان</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[3, 5, 10, 15].map(pct => (
                    <button
                      key={pct}
                      onClick={() => {
                        selection();
                        setCashbackPercent(pct);
                      }}
                      className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        cashbackPercent === pct
                          ? 'bg-pink-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {toPersianDigits(pct)}٪
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                impactHeavy();
                showToast('قوانین باشگاه مشتریان و مبالغ هدیه معرفی ذخیره شد.');
              }}
              className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs shadow-md shadow-pink-600/25 active:scale-95 transition-all"
            >
              ذخیره و فعال‌سازی در سیستم پذیرش
            </button>
          </div>
        </div>
      )}

      {/* CHIP 5: INSTAGRAM & WHATSAPP SOCIAL BANNERS */}
      {activeChip === 'banners' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-pink-600" />
                <h4 className="text-xs font-black text-slate-800">بنرهای تبلیغاتی آماده استوری اینستاگرام</h4>
              </div>
              <span className="text-[10px] text-slate-400">سایز استاندارد 9:16</span>
            </div>

            {/* Banner Mockup */}
            <div className="rounded-3xl p-5 bg-gradient-to-br from-pink-600 via-rose-600 to-purple-800 text-white text-center space-y-3 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <div className="w-10 h-10 rounded-2xl bg-white/20 mx-auto flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>

              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">MINA DENTAL CLINIC</span>
                <h3 className="text-base font-black mt-1">جشنواره لبخند طلایی مینادنتال</h3>
                <p className="text-xs opacity-90 mt-1">تخفیف ویژه کامپوزیت زیبایی و لمینت سرامیکی</p>
              </div>

              <div className="inline-block bg-white text-pink-700 font-mono font-black text-xs px-4 py-1.5 rounded-full shadow-md">
                کد تخفیف: MINA-SMILE
              </div>

              <div className="text-[10px] opacity-75 pt-1">
                تلفن رزرو وقت: ۰۲۱-۸۸۲۲۳۳۴۴ · تهران، ونک
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  impactLight();
                  showToast('تصویر بنر استوری با کیفیت بالا دانلود شد.');
                }}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                دانلود تصویر استوری
              </button>
              <button
                onClick={() => {
                  impactHeavy();
                  showToast('بنر در کانال واتساپ و اینستاگرام کلینیک به اشتراک گذاشته شد.');
                }}
                className="flex-1 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black shadow-md shadow-pink-600/25 active:scale-95 transition-all"
              >
                اشتراک‌گذاری مستقیم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-pink-200 p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-pink-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-xs">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تعریف کمپین تبلیغاتی جدید</h3>
                  <span className="text-[10px] text-pink-700 font-bold">جشنواره و پیامک تخفیف کلینیک</span>
                </div>
              </div>
              <button 
                onClick={() => setShowNewCampaignModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">عنوان جشنواره یا مناسبت</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: جشنواره لبخند بهاری / روز دندانپزشک"
                  className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-pink-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">درصد تخفیف</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Number(e.target.value))}
                    className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-center focus:outline-none focus:border-pink-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">کد تخفیف (کوپن)</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="MINA-SPECIAL"
                    className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-center focus:outline-none focus:border-pink-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">مخاطبان هدف</label>
                <select
                  value={formAudience}
                  onChange={(e) => setFormAudience(e.target.value)}
                  className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-pink-500 shadow-2xs"
                >
                  <option value="همه بیماران کلینیک">همه بیماران کلینیک ({toPersianDigits(patients.length * 15)} مخاطب)</option>
                  <option value="بیماران متقاضی زیبایی و کامپوزیت">بیماران متقاضی زیبایی و ونیر</option>
                  <option value="بیماران ایمپلنت و جراحی">بیماران ایمپلنت و جراحی</option>
                  <option value="بیماران بدون مراجعه بیش از ۶ ماه">بیماران بدون مراجعه بیش از ۶ ماه (فراخوان)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">متن پیامک تبلیغاتی</label>
                <textarea
                  rows={3}
                  value={formSmsText}
                  onChange={(e) => setFormSmsText(e.target.value)}
                  placeholder="سلام [نام] گرامی؛ تخفیف ویژه کلینیک مینادنتال..."
                  className="w-full bg-white border border-pink-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-pink-500 shadow-2xs leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black shadow-md shadow-pink-600/25 active:scale-95 transition-all"
                >
                  ثبت و راه‌اندازی کمپین
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
