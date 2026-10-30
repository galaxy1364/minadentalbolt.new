import React, { useState } from 'react';
import { 
  FileCheck2, Shield, Plus, CheckCircle2, 
  Printer, Download, Search, Filter, Sparkles, 
  ChevronLeft, Award, FileText, Check, AlertCircle,
  Building2, Hash, DollarSign, QrCode
} from 'lucide-react';
import { InsuranceClaim, Patient } from '../../types/dental';
import { toPersianDigits, formatToman, getCurrentPersianDate, getPersianDateParts } from '../../utils/jalali';
import { triggerHaptic } from '../../utils/haptics';

interface InsuranceClaimsViewProps {
  patients: Patient[];
  onOpenPatientFile?: (patient: Patient) => void;
}

export const InsuranceClaimsView: React.FC<InsuranceClaimsViewProps> = ({
  patients,
  onOpenPatientFile
}) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'tariffs' | 'diskette'>('claims');
  const [selectedCompany, setSelectedCompany] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [printedClaim, setPrintedClaim] = useState<InsuranceClaim | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const insuranceCompanies = [
    'همه', 'بیمه دانا', 'بیمه ایران', 'بیمه آسیا', 'بیمه البرز', 'تامین اجتماعی', 'نیروهای مسلح'
  ];

  // Official Dental Relative Value Tariff Book (کتابچه ارزش نسبی خدمات سلامت دندانپزشکی)
  const tariffCodes = [
    { code: '900100', title: 'ویزیت و معاینه تخصصی دندانپزشک', k: 1.5, fee: 180000, baseShare: 126000, patientShare: 54000 },
    { code: '900210', title: 'جرم‌گیری کامل دو فک و بروساژ', k: 4.0, fee: 850000, baseShare: 595000, patientShare: 255000 },
    { code: '900320', title: 'ترمیم کامپوزیت ۲ سطحی خلفی', k: 6.5, fee: 1950000, baseShare: 1365000, patientShare: 585000 },
    { code: '900330', title: 'ترمیم کامپوزیت ۳ سطحی (MOD)', k: 8.0, fee: 2400000, baseShare: 1680000, patientShare: 720000 },
    { code: '900410', title: 'درمان ریشه دندان ۳ کاناله (اندو)', k: 12.0, fee: 3800000, baseShare: 2660000, patientShare: 1140000 },
    { code: '900550', title: 'کشیدن دندان قدامی و خلفی', k: 3.5, fee: 750000, baseShare: 525000, patientShare: 225000 },
    { code: '900720', title: 'پالپوتومی دندان شیری اطفال', k: 5.5, fee: 1450000, baseShare: 1015000, patientShare: 435000 },
  ];

  const curPersianYear = getPersianDateParts().year;

  const [claims, setClaims] = useState<InsuranceClaim[]>(() => [
    {
      id: 'clm-1',
      claimNumber: `CLM-${curPersianYear}-891`,
      patientId: 'pat-1',
      patientName: 'علی مرادی',
      nationalCode: '۰۰۱۸۳۷۴۶۲۱',
      baseInsurance: 'تامین اجتماعی',
      supplementaryInsurance: 'بیمه دانا',
      policyNumber: 'DAN-984210',
      date: getCurrentPersianDate(),
      doctorName: 'دکتر مهدی امیری',
      doctorMedicalCode: '۹۸۴۷۲-نظام پزشکی',
      items: [
        { code: '900330', description: 'ترمیم کامپوزیت ۳ سطحی MOD', toothNumber: 'دندان ۶ بالا راست', totalFee: 2400000, baseShare: 720000, supplementaryShare: 1440000, patientShare: 240000 },
        { code: '900210', description: 'جرم‌گیری کامل دو فک', toothNumber: 'هر دو فک', totalFee: 850000, baseShare: 255000, supplementaryShare: 510000, patientShare: 85000 },
      ],
      totalAmount: 3250000,
      totalInsurancePayable: 2925000,
      status: 'approved',
      trackingBarcode: 'BAR-INS-89102'
    },
    {
      id: 'clm-2',
      claimNumber: `CLM-${curPersianYear}-892`,
      patientId: 'pat-2',
      patientName: 'سارا رضایی',
      nationalCode: '۰۴۵۱۸۲۹۳۰۱',
      baseInsurance: 'بیمه سلامت ایرانیان',
      supplementaryInsurance: 'بیمه ایران',
      policyNumber: 'IRN-104928',
      date: getPersianDateParts(new Date(Date.now() - 86400000)).formatted,
      doctorName: 'دکتر مهدی امیری',
      doctorMedicalCode: '۹۸۴۷۲',
      items: [
        { code: '900410', description: 'عصب‌کشی ۳ کانال', toothNumber: 'دندان ۶ پایین چپ', totalFee: 3800000, baseShare: 1140000, supplementaryShare: 2280000, patientShare: 380000 }
      ],
      totalAmount: 3800000,
      totalInsurancePayable: 3420000,
      status: 'sent_to_insurer',
      trackingBarcode: 'BAR-INS-89204'
    }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredClaims = claims.filter(c => {
    const matchesComp = selectedCompany === 'همه' || c.supplementaryInsurance.includes(selectedCompany) || c.baseInsurance.includes(selectedCompany);
    const matchesSearch = c.patientName.includes(searchQuery) || c.claimNumber.includes(searchQuery);
    return matchesComp && matchesSearch;
  });

  const totalClaimsAmount = claims.reduce((s, c) => s + c.totalAmount, 0);
  const totalInsurancePayable = claims.reduce((s, c) => s + c.totalInsurancePayable, 0);

  return (
    <div className="pb-28 space-y-3">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#0f1b13] border border-blue-400 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-[#c8ff00] stroke-[3]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-xs border border-slate-100 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-800">
                  بیمه
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('medium');
                setShowNewClaimModal(true);
              }}
              className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>ثبت پرونده بیمه</span>
            </button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="text-[10px] text-slate-500 block">کل مطالبات ارسالی به بیمه:</span>
              <span className="font-mono font-black text-sm text-blue-900">{formatToman(totalInsurancePayable)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 block">تعداد اسناد خسارت:</span>
              <span className="font-mono font-black text-sm text-slate-800">{toPersianDigits(claims.length)} پرونده</span>
            </div>
          </div>

          {/* Segmented Chips */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('claims');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'claims' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              پرونده‌های خسارت ({toPersianDigits(claims.length)})
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('tariffs');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'tariffs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              کتابچه کدهای تعرفه ملی
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('diskette');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'diskette' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              خروجی دیسکت و اکسل
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: CLAIMS LIST */}
      {activeTab === 'claims' && (
        <div className="mx-2 space-y-2.5">
          {/* Insurance Company Filter */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {insuranceCompanies.map(comp => (
              <button
                key={comp}
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedCompany(comp);
                }}
                className={`py-1 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedCompany === comp 
                    ? 'bg-blue-600 text-white shadow-2xs' 
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {comp}
              </button>
            ))}
          </div>

          {filteredClaims.map(claim => (
            <div
              key={claim.id}
              className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900">{claim.patientName}</h4>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-mono px-2 py-0.5 rounded-md font-bold">
                      کد ملی: {toPersianDigits(claim.nationalCode)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold mt-0.5 block">
                    {claim.supplementaryInsurance} · شماره بیمه‌نامه: {claim.policyNumber}
                  </span>
                </div>

                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                  claim.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  claim.status === 'sent_to_insurer' ? 'bg-blue-100 text-blue-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {claim.status === 'approved' ? 'تایید و تسویه‌شده' : 'ارسال به بیمه تکمیلی'}
                </span>
              </div>

              {/* Items Table */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                {claim.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-slate-800">{item.description}</span>
                      <span className="text-[10px] text-slate-400 font-mono mr-1">({item.toothNumber})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-700">{formatToman(item.totalFee)}</span>
                  </div>
                ))}
              </div>

              {/* Financial Calculation: Total, Insurer Share, Franchise */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">سهم قابل دریافت از بیمه تکمیلی:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {formatToman(claim.totalInsurancePayable)}
                  </span>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('selection');
                    setPrintedClaim(claim);
                  }}
                  className="py-1 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[11px] flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ گواهی رسمی خسارت</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: TARIFF CODES BOOK */}
      {activeTab === 'tariffs' && (
        <div className="mx-2 space-y-2.5">
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs space-y-1">
            <span className="font-black text-blue-900 block">کتابچه رسمی ارزش نسبی تعرفه خدمات دندانپزشکی (K):</span>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              تمامی خدمات ثبت‌شده در چارت بالینی بیمار با کدهای استاندارد ملی وزارت بهداشت تطبیق یافته و برای دریافت خسارت به بیمه‌های پایه و تکمیلی ارائه می‌شود.
            </p>
          </div>

          <div className="bg-white rounded-[22px] p-3 border border-slate-100 space-y-2">
            {tariffCodes.map(t => (
              <div
                key={t.code}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-blue-700 text-xs">{t.code}</span>
                    <span className="font-bold text-slate-800">{t.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    ضریب K: {toPersianDigits(t.k)} · سهم بیمه: ۷۰٪ · فرانشیز: ۳۰٪
                  </span>
                </div>

                <div className="text-left font-mono font-black text-slate-900 text-xs">
                  {formatToman(t.fee)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DISKETTE & EXCEL EXPORT */}
      {activeTab === 'diskette' && (
        <div className="mx-2 space-y-3">
          <div className="bg-white p-4 rounded-[22px] border border-slate-100 space-y-3 text-xs">
            <h4 className="font-black text-slate-900">تولید فایل دیسکت و اکسل سازمان‌های بیمه‌گر:</h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              خروجی استاندارد با فرمت استاندارد XML/Excel جهت بارگذاری در سامانه تایید اسناد بیمه دانا، پورتال رسا بیمه ایران، و وب‌سرویس وزارت بهداشت.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  triggerHaptic('success');
                  showToast('فایل اکسل اسناد بیمه با موفقیت دانلود شد.');
                }}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>دانلود فایل اکسل خسارت بیمه تکمیلی</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('success');
                  showToast('دیسکت استاندارد تامین اجتماعی با کد پیگیری تولید شد.');
                }}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>تولید دیسکت الکترونیک بیمه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE CLAIM FORM MODAL */}
      {printedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[26px] p-5 space-y-4 shadow-2xl text-slate-900 border-2 border-slate-200">
            {/* Form Header */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 text-xs">
              <div className="text-center flex-1">
                <span className="font-black text-sm block">گواهی رسمی انجام خدمات دندانپزشکی</span>
                <span className="text-[10px] text-slate-500">جهت ارائه به سازمان بیمه‌گر / بیمه تکمیلی</span>
              </div>
              <button onClick={() => setPrintedClaim(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {/* Patient & Doctor Meta */}
            <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[9.5px]">بیمار محترم:</span>
                <span className="font-black text-slate-900">{printedClaim.patientName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px]">کد ملی:</span>
                <span className="font-mono font-bold text-slate-800">{toPersianDigits(printedClaim.nationalCode)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px]">بیمه تکمیلی:</span>
                <span className="font-bold text-blue-800">{printedClaim.supplementaryInsurance}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px]">تاریخ و شماره پرونده:</span>
                <span className="font-mono text-slate-700">{printedClaim.date} · {printedClaim.claimNumber}</span>
              </div>
            </div>

            {/* Treatments Breakdown */}
            <div className="space-y-1 text-xs border border-slate-200 rounded-xl p-2.5">
              <span className="font-black text-slate-800 block text-[11px] mb-1">شرح اقدامات بالینی انجام‌شده:</span>
              {printedClaim.items.map((it, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-slate-100 last:border-0 text-[11px]">
                  <span>{it.description} ({it.toothNumber})</span>
                  <span className="font-mono font-bold">{formatToman(it.totalFee)}</span>
                </div>
              ))}
            </div>

            {/* Seal & Barcode Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <QrCode className="w-8 h-8 text-slate-800" />
                <div>
                  <span className="text-[9.5px] text-slate-500 block">شناسه دیجیتال یکتا:</span>
                  <span className="font-mono font-black text-[10px] text-blue-900">{printedClaim.trackingBarcode}</span>
                </div>
              </div>

              <div className="text-center border-2 border-emerald-600 rounded-xl p-2 text-[9px] font-bold text-emerald-800 rotate-[-4deg]">
                <span>ممهور به امضای پزشک معالج</span>
                <span className="block font-black">{printedClaim.doctorName}</span>
              </div>
            </div>

            <button
              onClick={() => {
                showToast('دستور چاپ مستقیم به پرینتر ارسال شد.');
                setPrintedClaim(null);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فرم روی سربرگ مطب</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
