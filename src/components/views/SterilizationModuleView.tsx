import React, { useState } from 'react';
import { 
  ShieldCheck, AlertCircle, Plus, CheckCircle2, 
  Clock, Calendar, QrCode, Sparkles, Filter, 
  Search, Printer, Check, X, RefreshCw, AlertTriangle,
  Flame, Thermometer, Gauge, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { AutoclaveCycle } from '../../types/dental';
import { toPersianDigits, toEnglishDigits, formatToman, getCurrentPersianDate, getPersianDateParts, getRelativePersianDate } from '../../utils/jalali';
import { triggerHaptic } from '../../utils/haptics';

interface SterilizationModuleViewProps {
  onLinkPackToPatient?: (barcode: string) => void;
}

export const SterilizationModuleView: React.FC<SterilizationModuleViewProps> = ({
  onLinkPackToPatient
}) => {
  const [activeTab, setActiveTab] = useState<'cycles' | 'spore' | 'packs'>('cycles');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCycleModal, setShowAddCycleModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for new cycle
  const [deviceModel, setDeviceModel] = useState('اتوکلاو کلاس B وکیوم یوروکلاو ۲۴ لیتری');
  const [cycleType, setCycleType] = useState<AutoclaveCycle['cycleType']>('134_prion');
  const [operatorName, setOperatorName] = useState('دستیار کلینیک (فاطمه راد)');
  const [packsCount, setPacksCount] = useState<number>(14);

  // Initial cycles complying with strict Ministry of Health & JCI sterilization audit standards
  const [cycles, setCycles] = useState<AutoclaveCycle[]>(() => {
    const todayStr = getCurrentPersianDate();
    const yesterdayStr = getRelativePersianDate(-1);
    const todayDigits = toEnglishDigits(todayStr).replace(/\//g, '');
    const yesterdayDigits = toEnglishDigits(yesterdayStr).replace(/\//g, '');

    return [
      {
        id: 'cyc-101',
        cycleNumber: 1042,
        date: todayStr,
        time: '۰۹:۱۵',
        deviceModel: 'اتوکلاو کلاس B وکیوم یوروکلاو ۲۴ لیتری',
        cycleType: '134_prion',
        temperature: 134,
        pressure: 2.15,
        durationMinutes: 18,
        operatorName: 'فاطمه راد (دستیار جراحی)',
        bowieDickPassed: true,
        sporeTestResult: 'negative_pass',
        packsCount: 16,
        lotBarcode: `LOT-${todayDigits}-01`,
        notes: 'ست‌های جراحی فک و ایمپلنت و توربین‌ها بدون خطا استریل شدند.'
      },
      {
        id: 'cyc-102',
        cycleNumber: 1043,
        date: todayStr,
        time: '۱۲:۳۰',
        deviceModel: 'اتوکلاو کلاس B وکیوم یوروکلاو ۲۴ لیتری',
        cycleType: '134_hollow',
        temperature: 134,
        pressure: 2.10,
        durationMinutes: 15,
        operatorName: 'فاطمه راد',
        bowieDickPassed: true,
        sporeTestResult: 'pending',
        packsCount: 12,
        lotBarcode: `LOT-${todayDigits}-02`,
        notes: 'ست‌های روتاری و آبچوراتور عصب‌کشی اندو'
      },
      {
        id: 'cyc-103',
        cycleNumber: 1040,
        date: yesterdayStr,
        time: '۱۷:۰۰',
        deviceModel: 'اتوکلاو کلاس B وکیوم ۲۴ لیتری',
        cycleType: 'bowie_dick',
        temperature: 134,
        pressure: 2.12,
        durationMinutes: 4,
        operatorName: 'مریم حسینی',
        bowieDickPassed: true,
        sporeTestResult: 'negative_pass',
        packsCount: 1,
        lotBarcode: `LOT-${yesterdayDigits}-BD`,
        notes: 'تست کنترل نشتی پمپ وکیوم و نفوذ بخار بوی‌دیک تایید شد.'
      }
    ];
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateCycle = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    const newCycle: AutoclaveCycle = {
      id: `cyc-${Date.now()}`,
      cycleNumber: cycles.length + 1043,
      date: getCurrentPersianDate(),
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      deviceModel,
      cycleType,
      temperature: 134,
      pressure: 2.14,
      durationMinutes: cycleType === '134_prion' ? 18 : 15,
      operatorName,
      bowieDickPassed: true,
      sporeTestResult: 'pending',
      packsCount,
      lotBarcode: `LOT-${toEnglishDigits(getCurrentPersianDate()).replace(/\//g, '')}-${String(cycles.length + 1).padStart(2, '0')}`,
      notes: 'سیکل جدید توسط سیستم ثبت و لیبل‌های بارکد پک‌ها صادر شد.'
    };

    setCycles([newCycle, ...cycles]);
    setShowAddCycleModal(false);
    showToast(`سیکل شماره ${toPersianDigits(newCycle.cycleNumber)} با موفقیت ثبت شد.`);
  };

  const filteredCycles = cycles.filter(c => 
    c.deviceModel.includes(searchQuery) || 
    c.operatorName.includes(searchQuery) ||
    c.lotBarcode.includes(searchQuery)
  );

  return (
    <div className="pb-28 space-y-3">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#0f1b13] border border-emerald-400 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-xs border border-slate-100 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-800">
                  استریلیزاسیون
                </h3>
              </div>
            </div>

            <button
              onClick={() => setShowAddCycleModal(true)}
              className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>ثبت سیکل اتوکلاو</span>
            </button>
          </div>

          {/* Segmented Chips */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('cycles');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'cycles' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              سیکل‌های اتوکلاو ({toPersianDigits(cycles.length)})
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('spore');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'spore' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تست بیولوژیک اسپور
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('packs');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'packs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              بارکد پک‌های استریل
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: AUTOCLAVE CYCLES LIST */}
      {activeTab === 'cycles' && (
        <div className="mx-2 space-y-2.5">
          <div className="flex items-center justify-between px-2 text-xs">
            <span className="font-black text-slate-800">لاگ فرایند استریلیزاسیون فیزیکی و شیمیایی</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
              کالیبراسیون فعال
            </span>
          </div>

          {filteredCycles.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-[22px] p-3.5 shadow-2xs border border-slate-100 space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex flex-col items-center justify-center font-mono font-black text-xs shrink-0">
                    <span>{toPersianDigits(c.cycleNumber)}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{c.deviceModel}</h4>
                    <span className="text-[10.5px] text-slate-500 font-mono mt-0.5 block">
                      پارت: {c.lotBarcode} · مسئول: {c.operatorName}
                    </span>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <span className="text-xs font-black text-emerald-600 block">{toPersianDigits(c.time)}</span>
                  <span className="text-[10px] text-slate-400 block">{toPersianDigits(c.date)}</span>
                </div>
              </div>

              {/* Physical Parameters: Temp, Pressure, Duration */}
              <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-center font-mono font-bold">
                <div className="flex items-center justify-center gap-1 text-slate-700">
                  <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                  <span>{toPersianDigits(c.temperature)}°C</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-slate-700">
                  <Gauge className="w-3.5 h-3.5 text-sky-500" />
                  <span>{toPersianDigits(c.pressure)} Bar</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{toPersianDigits(c.durationMinutes)} دقیقه</span>
                </div>
              </div>

              {/* Status Indicators: Bowie-Dick & Spore Test */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>تست بوی‌دیک: تایید</span>
                  </span>

                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                    c.sporeTestResult === 'negative_pass'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>اسپور: {c.sporeTestResult === 'negative_pass' ? 'منفی (استریل قطعی)' : 'در حال انکوباسیون (۲۴ ساعته)'}</span>
                  </span>
                </div>

                <span className="text-[11px] font-mono font-black text-slate-700">
                  {toPersianDigits(c.packsCount)} پک استریل
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: BIOLOGICAL SPORE TEST TRACKING */}
      {activeTab === 'spore' && (
        <div className="mx-2 space-y-3">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-black text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>پایش بیولوژیک با باسیل استئاروترموفیلوس (Geobacillus stearothermophilus):</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              تست اسپور هفته‌ای دو بار در پرچالش‌ترین نقطه محفظه اتوکلاو قرار گرفته و پس از انکوباسیون ۵۶ درجه به مدت ۲۴ الی ۴۸ ساعت، عدم تغییر رنگ نشانه استریل قطعی و سلامت میکروبی ابزارهاست.
            </p>
          </div>

          <div className="bg-white rounded-[22px] p-4 border border-slate-100 space-y-3">
            <h4 className="text-xs font-black text-slate-900">آخرین نتایج پایش اسپور اتوکلاو:</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">ویال بیولوژیک شماره SP-984</span>
                  <span className="text-[10px] text-slate-400 font-mono">تاریخ انکوباسیون: {getRelativePersianDate(-1)}</span>
                </div>
                <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  منفی (فاقد رشد میکروبی - PASS)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">ویال بیولوژیک شماره SP-985</span>
                  <span className="text-[10px] text-slate-400 font-mono">تاریخ انکوباسیون: {getCurrentPersianDate()} (امروز)</span>
                </div>
                <span className="text-[10.5px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                  در حال انکوباتور (۱۸ ساعت مانده)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STERILE PACK LABELS & BARCODES */}
      {activeTab === 'packs' && (
        <div className="mx-2 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-black text-slate-800">لیبل‌های بارکد پک‌های استریل آماده مصرف</span>
            <button
              onClick={() => showToast('دستور چاپ لیبل‌های بارکد به پرینتر ارسال شد.')}
              className="py-1 px-2.5 rounded-xl bg-teal-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs"
            >
              <Printer className="w-3 h-3" />
              <span>چاپ کلیه لیبل‌ها</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { name: 'ست جراحی ایمپلنت و کیت تورک', code: 'PCK-IMP-841', expiry: getRelativePersianDate(30), status: 'استریل معتبر' },
              { name: 'ست جراحی کشیدن و فورسپس', code: 'PCK-EXT-109', expiry: getRelativePersianDate(29), status: 'استریل معتبر' },
              { name: 'ست معاینه و قلم‌های کامپوزیت', code: 'PCK-RES-330', expiry: getRelativePersianDate(30), status: 'استریل معتبر' },
              { name: 'سرآنگل‌ها و توربین‌های یونیت ۱', code: 'PCK-TUR-012', expiry: getRelativePersianDate(30), status: 'استریل معتبر' },
            ].map(pack => (
              <div
                key={pack.code}
                className="bg-white p-3 rounded-2xl border-2 border-dashed border-teal-200 space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-black text-slate-900 text-xs">{pack.name}</h5>
                    <span className="text-[10px] text-teal-700 font-mono font-bold mt-0.5 block">{pack.code}</span>
                  </div>
                  <span className="text-[9.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    {pack.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                  <span>انقضا: {pack.expiry} (۳۰ روزه)</span>
                  <button
                    onClick={() => {
                      showToast(`پک ${pack.code} به پرونده بیمار متصل شد.`);
                      onLinkPackToPatient?.(pack.code);
                    }}
                    className="text-teal-700 font-bold hover:underline"
                  >
                    الصاق به پرونده بیمار
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Autoclave Cycle Modal */}
      {showAddCycleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[26px] border border-slate-200 p-5 space-y-3.5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-900">ثبت سیکل استریلیزاسیون جدید اتوکلاو</h4>
              <button onClick={() => setShowAddCycleModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateCycle} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">دستگاه اتوکلاو</label>
                <input
                  type="text"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">نوع برنامه اتوکلاو</label>
                <select
                  value={cycleType}
                  onChange={(e) => setCycleType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-800"
                >
                  <option value="134_prion">پریون ۱۳۴ درجه (۱۸ دقیقه - ایمن‌ترین جراحی)</option>
                  <option value="134_hollow">هالو ۱۳۴ درجه (۱۵ دقیقه - ابزار سوراخ‌دار)</option>
                  <option value="121_porous">پوروس ۱۲۱ درجه (۳۰ دقیقه - پلاستیک/حساس)</option>
                  <option value="bowie_dick">تست بوی‌دیک (کنترل نشت پمپ وکیوم)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">تعداد پک‌ها</label>
                  <input
                    type="number"
                    value={packsCount}
                    onChange={(e) => setPacksCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">اپراتور مسئول</label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCycleModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-md shadow-teal-600/25"
                >
                  ثبت قطعی و صدور بارکد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
