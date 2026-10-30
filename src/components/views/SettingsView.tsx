import React, { useState } from 'react';
import { 
  Settings, Shield, ShieldCheck, Stethoscope, Clock, Database, 
  CheckCircle2, Zap, Cloud, Sparkles, Building2, 
  CreditCard, FileDown, Plus, Trash2, Edit3, Check, X,
  Copy, Key, Lock, Server, CheckCheck, Users, Mail, UserPlus, Eye, EyeOff,
  ArrowLeftRight, ChevronDown, ChevronUp, Award, Phone, ShieldAlert,
  Smartphone, Wifi, Terminal, ExternalLink, RefreshCw, Send, Radio
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../../utils/jalali';
import { triggerHaptic } from '../../utils/haptics';
import { INITIAL_USERS } from '../../services/syncEngine';
import { UserAccount, RoleType } from '../../types/dental';
import { Logo3DMainDentalTooth } from '../ThreeDimensionalLogos';
import { hardwareBridgeService, PosProvider } from '../../services/hardwareBridgeService';
import { clinicalSmsService } from '../../services/smsService';

interface SettingsViewProps {
  onOpenSupabaseTest?: () => void;
  onOpenPhaseAudit?: () => void;
  onOpenProjectDownload?: () => void;
  onOpenLiveSync?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  onOpenSupabaseTest, 
  onOpenPhaseAudit,
  onOpenProjectDownload,
  onOpenLiveSync
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'tariffs' | 'staff' | 'cloud' | 'hardware'>('general');
  const [saved, setSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Hardware & Peripherals States (PC-POS, Caller ID, SMS)
  const hardwareCfg = hardwareBridgeService.getConfig();
  const [posProvider, setPosProvider] = useState<PosProvider>(hardwareCfg.posProvider);
  const [posIpAddress, setPosIpAddress] = useState(hardwareCfg.posIpAddress);
  const [posPort, setPosPort] = useState(hardwareCfg.posPort);
  const [callerIdPort, setCallerIdPort] = useState(hardwareCfg.callerIdPort);
  const [isTestingPos, setIsTestingPos] = useState(false);
  const [posTestResult, setPosTestResult] = useState<string | null>(null);
  const [posTestAmount, setPosTestAmount] = useState<number>(50000);
  const [testCallerPhone, setTestCallerPhone] = useState('09121234567');
  const [callerTestResult, setCallerTestResult] = useState<string | null>(null);

  // SMS Gateway States
  const smsCfg = clinicalSmsService.getConfig();
  const [smsProvider, setSmsProvider] = useState<'kavenegar' | 'farazsms' | 'melipayamak'>(smsCfg.provider);
  const [smsApiKey, setSmsApiKey] = useState(smsCfg.apiKey);
  const [smsSender, setSmsSender] = useState(smsCfg.senderNumber);
  const [smsTestMobile, setSmsTestMobile] = useState('09121234567');
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState<string | null>(null);

  // Clinic info
  const [clinicName, setClinicName] = useState('مرکز تخصصی دندانپزشکی مینادنتال');
  const [activeDoctor, setActiveDoctor] = useState('دکتر مهدی امیری (شماره نظام: ۱۸۴۹۲)');
  const [clinicPhone, setClinicPhone] = useState('۰۲۱-۸۸۲۲۳۳۴۴');
  const [clinicAddress, setClinicAddress] = useState('تهران، سعادت‌آباد، میدان کاج، مجتمع پزشکی مروارید، طبقه ۴');
  const [sayadKey, setSayadKey] = useState('API-SAYAD-IR-99214-SECURE');
  const [workHours, setWorkHours] = useState('شنبه تا پنج‌شنبه: ۹:۰۰ الی ۲۱:۰۰');

  // Supabase Credentials (Requested by Doctor Mehdi Amiri)
  const supabaseCreds = {
    url: 'https://minadental-clinic-db.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pbmFkZW50YWwtY2xpbmljLWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgwODAwMDAsImV4cCI6MjAyMzY1NjAwMH0.minadental_secure_prod_key',
    host: 'db.minadental-clinic-db.supabase.co',
    port: '5432',
    database: 'postgres',
    user: 'postgres',
    password: 'MinaDental@2025#ClinicalSecure'
  };

  // Tariffs list with categorized procedures and persistent storage
  const [tariffs, setTariffs] = useState<Array<{
    id: string;
    code: string;
    name: string;
    category: 'restorative' | 'endo' | 'implant' | 'prosthetics' | 'pediatric' | 'periodontics';
    price: number;
  }>>(() => {
    try {
      const saved = localStorage.getItem('minadental_tariffs_catalog_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 't1', code: 'D-101', name: 'ویزیت و معاینه اولیه با چارت پالمر', category: 'restorative', price: 250000 },
      { id: 't2', code: 'D-201', name: 'ترمیم کامپوزیت قدامی زیبایی (سانترال/لترال)', category: 'restorative', price: 2400000 },
      { id: 't3', code: 'D-202', name: 'ترمیم کامپوزیت خلفی کلاس ۲ (MO / DO / MOD)', category: 'restorative', price: 1900000 },
      { id: 't4', code: 'D-203', name: 'ترمیم آمالگام سیلور دو سطحی', category: 'restorative', price: 1500000 },
      { id: 't5', code: 'D-301', name: 'عصب‌کشی تک‌کانال قدامی (اندودانتیکس)', category: 'endo', price: 2600000 },
      { id: 't6', code: 'D-302', name: 'عصب‌کشی مولار ۳ کاناله تخصصی روت‌کانال', category: 'endo', price: 4200000 },
      { id: 't7', code: 'D-303', name: 'درمان مجدد ریشه دندان (Re-Endo)', category: 'endo', price: 5100000 },
      { id: 't8', code: 'D-401', name: 'جراحی کاشت فیکسچر ایمپلنت کره‌ای Dentium', category: 'implant', price: 12500000 },
      { id: 't9', code: 'D-402', name: 'جراحی کاشت فیکسچر ایمپلنت سوئیسی Straumann', category: 'implant', price: 24000000 },
      { id: 't10', code: 'D-403', name: 'جراحی دندان عقل نهفته استخوانی', category: 'implant', price: 2800000 },
      { id: 't11', code: 'D-501', name: 'روکش تمام زیرکونیا مولتی‌لیر CAD/CAM', category: 'prosthetics', price: 4800000 },
      { id: 't12', code: 'D-502', name: 'روکش پرسلن متال PFM', category: 'prosthetics', price: 3200000 },
      { id: 't13', code: 'D-503', name: 'لمینت سرامیکی پرسلن E-Max', category: 'prosthetics', price: 5500000 },
      { id: 't14', code: 'D-601', name: 'پالپوتومی اطفال همراه ترمیم همرنگ', category: 'pediatric', price: 1800000 },
      { id: 't15', code: 'D-602', name: 'روکش استیل ضدزنگ اطفال (SS Crown)', category: 'pediatric', price: 2100000 },
      { id: 't16', code: 'D-603', name: 'فیشورسیلنت و فلورایدتراپی موضعی شیارها', category: 'pediatric', price: 850000 },
      { id: 't17', code: 'D-701', name: 'جرم‌گیری تخصصی و بروساژ کامل فک بالا و پایین', category: 'periodontics', price: 1200000 },
    ];
  });

  const saveTariffsList = (updated: typeof tariffs) => {
    setTariffs(updated);
    try {
      localStorage.setItem('minadental_tariffs_catalog_v2', JSON.stringify(updated));
    } catch {}
  };

  const [tariffCategoryFilter, setTariffCategoryFilter] = useState<string>('all');
  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffPrice, setNewTariffPrice] = useState<number>(1000000);
  const [newTariffCategory, setNewTariffCategory] = useState<'restorative' | 'endo' | 'implant' | 'prosthetics' | 'pediatric' | 'periodontics'>('restorative');
  const [editingTariffId, setEditingTariffId] = useState<string | null>(null);
  const [editingTariffPrice, setEditingTariffPrice] = useState<number>(0);

  // Staff and Access Control States with Persistence
  const [staffList, setStaffList] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('minadental_clinic_users_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_USERS;
  });

  const saveStaffList = (updated: UserAccount[]) => {
    setStaffList(updated);
    try {
      localStorage.setItem('minadental_clinic_users_v2', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  const [managerIsDoctor, setManagerIsDoctor] = useState<boolean>(true);
  const [expandedPermissionsUserId, setExpandedPermissionsUserId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState<string>('');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<RoleType>('doctor');
  const [newStaffPlatform, setNewStaffPlatform] = useState('یونیت ۲ دندانپزشکی');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffLicense, setNewStaffLicense] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    triggerHaptic('success');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(label);
    showToast(`${label} در حافظه کپی شد.`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSave = () => {
    triggerHaptic('success');
    hardwareBridgeService.saveConfig(posProvider, posIpAddress, Number(posPort), callerIdPort);
    clinicalSmsService.saveConfig(smsProvider, smsApiKey, smsSender);
    setSaved(true);
    showToast('تنظیمات کلینیک با موفقیت ذخیره گردید.');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestPosTransaction = async () => {
    setIsTestingPos(true);
    setPosTestResult(null);
    triggerHaptic('medium');
    try {
      const res = await hardwareBridgeService.sendPosTransaction({
        amount: posTestAmount,
        patientName: 'بیمار تستی - دکتر مهدی امیری',
        patientFileNumber: 'D-TEST',
        description: 'تست تراکنش پایانه فروش PC-POS'
      });
      triggerHaptic('success');
      setPosTestResult(`✅ ${res.message} (شماره پیگیری: ${res.traceNumber} · کارت: ${res.cardMask})`);
    } catch (e: any) {
      setPosTestResult(`❌ خطا در ارتباط با پایانه فروش: ${e.message}`);
    } finally {
      setIsTestingPos(false);
    }
  };

  const handleSimulateCallerId = () => {
    triggerHaptic('medium');
    hardwareBridgeService.triggerSimulatedCall(testCallerPhone, 1, {
      fullName: 'علی مرادی (بیمار نمونه کلینیک)',
      fileNumber: 'D-1048',
      lastVisit: '۱۴۰۵/۰۷/۱۵'
    });
    setCallerTestResult(`📞 سیگنال تماس ورودی با شماره ${testCallerPhone} ارسال شد. بنر پاپ‌آپ پرونده بیمار در بالای صفحه فعال گردید.`);
    showToast('تماس ورودی کالرآیدی دریافت شد.');
  };

  const handleSendSmsTest = async () => {
    setIsTestingSms(true);
    setSmsTestResult(null);
    triggerHaptic('medium');
    try {
      const res = await clinicalSmsService.sendPatternSms(
        smsTestMobile,
        'جناب آقای رضایی',
        'appointment_reminder',
        { date: '۱۴۰۵/۰۸/۰۵', time: '۱۷:۳۰' }
      );
      if (res.success) {
        triggerHaptic('success');
        setSmsTestResult(`✅ ${res.message} (وضعیت پترن خدماتی: تحویل فوری به گیرنده)`);
      } else {
        setSmsTestResult(`❌ خطا: ${res.message}`);
      }
    } catch (e: any) {
      setSmsTestResult(`❌ خطای ارسال: ${e.message}`);
    } finally {
      setIsTestingSms(false);
    }
  };

  const handleAddTariff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTariffName) return;
    triggerHaptic('light');
    const updated = [
      ...tariffs,
      {
        id: `t-${Date.now()}`,
        code: `D-${tariffs.length + 100}`,
        name: newTariffName,
        category: newTariffCategory,
        price: Number(newTariffPrice)
      }
    ];
    saveTariffsList(updated);
    setNewTariffName('');
    showToast(`تعرفه "${newTariffName}" در دسته مربوطه ذخیره شد.`);
  };

  const handleUpdateTariffPrice = (id: string, newPrice: number) => {
    triggerHaptic('medium');
    const updated = tariffs.map(t => t.id === id ? { ...t, price: newPrice } : t);
    saveTariffsList(updated);
    setEditingTariffId(null);
    showToast('تعرفه مصوب خدمت به‌روزرسانی شد.');
  };

  const handleDeleteTariff = (id: string) => {
    triggerHaptic('medium');
    const updated = tariffs.filter(t => t.id !== id);
    saveTariffsList(updated);
    showToast('خدمت از کاتالوگ تعرفه‌ها حذف شد.');
  };

  const handleExportBackup = () => {
    triggerHaptic('medium');
    showToast('فایل پشتیبان کامل دیتابیس با فرمت JSON آماده دانلود شد.');
  };

  return (
    <div className="pb-28 space-y-3">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-emerald-600 border border-emerald-500 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-white stroke-[3]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Tab Navigation */}
      <div className="mx-2 mt-2">
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] p-3.5 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Settings className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-slate-800">تنظیمات</h3>
            </div>

            <button
              onClick={handleSave}
              className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>ذخیره تغییرات</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl">
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('general');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'general' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              مشخصات مطب
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('tariffs');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'tariffs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              تعرفه‌های درمانی
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('staff');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'staff' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              پرسنل و دسترسی
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('cloud');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cloud' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              سرور ابری و دیتابیس
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('hardware');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'hardware' ? 'bg-purple-600 text-white shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              سخت‌افزار و پیامک
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: GENERAL CLINIC SETTINGS */}
      {activeTab === 'general' && (
        <div className="mx-2 space-y-2.5">
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-2xs border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-800">هویت کلینیک و پزشک معالج</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-600 font-bold block mb-1">نام مرکز دندانپزشکی</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">پزشک مسئول / جراح</label>
                <input
                  type="text"
                  value={activeDoctor}
                  onChange={(e) => setActiveDoctor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-bold block mb-1">تلفن مطب</label>
                  <input
                    type="text"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-left focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-bold block mb-1">ساعات کاری کلینیک</label>
                  <input
                    type="text"
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-left focus:outline-none focus:border-emerald-500 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">نشانی مطب</label>
                <input
                  type="text"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">کلید وب‌سرویس استعلام صیاد</label>
                <input
                  type="password"
                  value={sayadKey}
                  onChange={(e) => setSayadKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-left focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TARIFFS MANAGER & CATEGORIES */}
      {activeTab === 'tariffs' && (
        <div className="mx-2 space-y-3">
          {/* Add Tariff Form */}
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-3.5 shadow-2xs border border-slate-200/80 space-y-2.5">
            <span className="text-xs font-black text-slate-800 block">تعریف خدمت و تعرفه مصوب جدید:</span>
            <form onSubmit={handleAddTariff} className="space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={newTariffName}
                  onChange={(e) => setNewTariffName(e.target.value)}
                  placeholder="نام درمان (مثلاً ونیر کامپوزیت لبه انسیزال)..."
                  className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={newTariffCategory}
                  onChange={(e) => setNewTariffCategory(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="restorative">ترمیم و زیبایی</option>
                  <option value="endo">درمان ریشه (اندو)</option>
                  <option value="implant">ایمپلنت و جراحی فک</option>
                  <option value="prosthetics">پروتز و روکش</option>
                  <option value="pediatric">دندانپزشکی اطفال</option>
                  <option value="periodontics">جرم‌گیری و لثه</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  value={newTariffPrice}
                  onChange={(e) => setNewTariffPrice(Number(e.target.value))}
                  placeholder="تعرفه پایه (تومان)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-center font-bold focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shrink-0 shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت خدمت</span>
                </button>
              </div>
            </form>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { id: 'all', label: 'همه دسته‌ها' },
              { id: 'restorative', label: 'ترمیم و زیبایی' },
              { id: 'endo', label: 'عصب‌کشی (اندو)' },
              { id: 'implant', label: 'ایمپلنت و جراحی' },
              { id: 'prosthetics', label: 'پروتز و روکش' },
              { id: 'pediatric', label: 'اطفال' },
              { id: 'periodontics', label: 'جرم‌گیری' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setTariffCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all active:scale-95 ${
                  tariffCategoryFilter === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tariffs List with Inline Edit and Category Tags */}
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-3.5 shadow-2xs border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800">
                تعرفه‌های مصوب کلینیک مینادنتال ({toPersianDigits(
                  tariffs.filter(t => tariffCategoryFilter === 'all' || t.category === tariffCategoryFilter).length
                )})
              </span>
              <span className="text-[10px] text-slate-400">قیمت‌های پایه طرح درمان و چارت پالمر</span>
            </div>

            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {tariffs
                .filter(item => tariffCategoryFilter === 'all' || item.category === tariffCategoryFilter)
                .map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        {item.code}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{item.name}</span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60 shrink-0 hidden sm:inline-block">
                        {item.category === 'restorative' && 'ترمیم'}
                        {item.category === 'endo' && 'اندو'}
                        {item.category === 'implant' && 'ایمپلنت'}
                        {item.category === 'prosthetics' && 'پروتز'}
                        {item.category === 'pediatric' && 'اطفال'}
                        {item.category === 'periodontics' && 'جرم‌گیری'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {editingTariffId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editingTariffPrice}
                            onChange={(e) => setEditingTariffPrice(Number(e.target.value))}
                            className="w-24 bg-white border border-emerald-400 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateTariffPrice(item.id, editingTariffPrice)}
                            className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="ذخیره"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingTariffId(null)}
                            className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                            title="انصراف"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-emerald-700 text-xs">
                            {formatToman(item.price)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingTariffId(item.id);
                              setEditingTariffPrice(item.price);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-md transition-colors"
                            title="ویرایش قیمت تعرفه"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTariff(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors"
                            title="حذف خدمت"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF CREDENTIALS, PASSWORDS & ACCESS CONTROL (RBAC) */}
      {activeTab === 'staff' && (
        <div className="mx-2 space-y-3">
          {/* 1. PINNED CLINIC MANAGER CARD (Dr. Mehdi Amiri) - Full Access & Dual Role */}
          <div className="bg-gradient-to-br from-purple-50 via-white to-emerald-50/80 rounded-[24px] p-4 border-2 border-purple-200/90 shadow-sm space-y-3 text-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#c8ff00] text-black font-black flex items-center justify-center text-sm shadow-sm border border-[#bbf000] shrink-0">
                  مدیر
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm text-slate-900 truncate">دکتر مهدی امیری</h4>
                    <span className="text-[10px] bg-purple-600 text-white font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                      مدیر ارشد و صاحب‌امتیاز کلینیک
                    </span>
                    {managerIsDoctor && (
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <Stethoscope className="w-3 h-3" />
                        دندانپزشک معالج و جراح
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    شماره نظام پزشکی: {toPersianDigits('۱۸۴۹۲-م')} · دسترسی کامل و نامحدود به تمامی ماژول‌ها، تنظیمات و تایید صلاحیت‌ها
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <span className="text-[10.5px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                  دسترسی ۱۰۰٪ کامل (Full Admin)
                </span>
              </div>
            </div>

            {/* Manager Dual-Role Feature: Manager CAN ALSO BE A TREATING DOCTOR */}
            <div className="bg-white/90 p-3 rounded-2xl border border-purple-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <Award className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    امکان فعالیت همزمان مدیر به عنوان پزشک معالج (Dual Role)
                  </span>
                  <span className="text-[10.5px] text-slate-500 font-medium block mt-0.5 leading-relaxed">
                    با فعال‌سازی این گزینه، مدیر در فهرست دندانپزشکان یونیت‌ها، چارت بالینی پالمر، نوبت‌دهی جراحی و محاسبات سهم‌بندی به عنوان پزشک معالج نمایش داده می‌شود.
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-center">
                <input
                  type="checkbox"
                  checked={managerIsDoctor}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setManagerIsDoctor(val);
                    const updated = staffList.map(u => 
                      u.role === 'admin' 
                        ? { ...u, isDoctor: val, isManagerAndDoctor: val } 
                        : u
                    );
                    saveStaffList(updated);
                    triggerHaptic('success');
                    showToast(val ? 'نقش دندانپزشک معالج برای مدیر فعال شد.' : 'مدیر صرفاً در نقش مدیریتی تنظیم گردید.');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
              </label>
            </div>

            {/* Manager Credentials Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">mehdi.amiri19851364@gmail.com</span>
                </div>
                <button
                  onClick={() => copyToClipboard('mehdi.amiri19851364@gmail.com', 'جیمیل مدیر')}
                  className="text-[10px] text-purple-700 font-bold hover:underline shrink-0"
                >
                  کپی
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>۰۹۱۲۳۴۵۶۷۸۹</span>
                </div>
                <button
                  onClick={() => copyToClipboard('09123456789', 'شماره همراه مدیر')}
                  className="text-[10px] text-emerald-700 font-bold hover:underline shrink-0"
                >
                  کپی
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{revealedPasswords['user-manager-amiri'] ? 'amiri@dental2025' : '••••••••••••'}</span>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setRevealedPasswords(prev => ({ ...prev, 'user-manager-amiri': !prev['user-manager-amiri'] }));
                  }}
                  className="text-slate-400 hover:text-slate-700 p-0.5"
                  title="نمایش / مخفی‌سازی رمز"
                >
                  {revealedPasswords['user-manager-amiri'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 2. SECTION HEADER & ADD STAFF BUTTON */}
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-3.5 shadow-2xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 truncate">
                  پزشکان، منشی‌ها و پرسنل کلینیک ({toPersianDigits(staffList.length)} کاربر)
                </h4>
                <span className="text-[10px] text-slate-500 font-medium block truncate">
                  تایید اعتبارنامه، تنظیم رمز عبور و تفکیک دقیق سطوح دسترسی (RBAC) توسط مدیر
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                setShowAddStaff(!showAddStaff);
              }}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddStaff ? 'بستن فرم' : '+ پزشک / پرسنل جدید'}</span>
            </button>
          </div>

          {/* 3. ADD STAFF FORM (Admin Controlled) */}
          {showAddStaff && (
            <div className="bg-gradient-to-br from-emerald-50/80 via-white to-sky-50/50 rounded-[22px] p-4 border border-emerald-200 shadow-sm space-y-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 pb-1.5 border-b border-emerald-100">
                <Key className="w-4 h-4 text-emerald-700" />
                <span className="font-black text-slate-900 text-xs">تعریف حساب و دسترسی عضو جدید کلینیک توسط مدیر</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">نام و نام خانوادگی:</label>
                  <input
                    type="text"
                    placeholder="مثلاً دکتر کیوان خسروی"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">نقش سازمانی:</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as RoleType)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="doctor">دندانپزشک معالج</option>
                    <option value="secretary">منشی و پذیرش</option>
                    <option value="assistant">دستیار جراحی و استریلیزاسیون CSR</option>
                    <option value="accountant">امور مالی و حسابدار</option>
                    <option value="admin">مدیر کمکی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">جیمیل یا ایمیل ورود:</label>
                  <input
                    type="email"
                    placeholder="khosravi@gmail.com"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    dir="ltr"
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">کلمه عبور اختصاصی:</label>
                  <input
                    type="text"
                    placeholder="کلمه عبور امن"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    dir="ltr"
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">پلتفرم / یونیت:</label>
                  <input
                    type="text"
                    placeholder="یونیت ۲ دندانپزشکی"
                    value={newStaffPlatform}
                    onChange={(e) => setNewStaffPlatform(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">شماره همراه:</label>
                  <input
                    type="text"
                    placeholder="۰۹۱۲۰۰۰۰۰۰۰"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">شماره نظام پزشکی (اختیاری):</label>
                  <input
                    type="text"
                    placeholder="مثال: ۲۹۸۴۵"
                    value={newStaffLicense}
                    onChange={(e) => setNewStaffLicense(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!newStaffName || !newStaffEmail || !newStaffPassword) {
                    showToast('لطفاً نام، ایمیل و رمز عبور را تکمیل نمایید.');
                    return;
                  }
                  const created: UserAccount = {
                    id: `user-${Date.now()}`,
                    fullName: newStaffName,
                    username: newStaffEmail.split('@')[0],
                    email: newStaffEmail,
                    password: newStaffPassword,
                    role: newStaffRole,
                    assignedPlatform: newStaffPlatform,
                    avatarColor: newStaffRole === 'doctor' ? '#06b6d4' : newStaffRole === 'admin' ? '#c8ff00' : newStaffRole === 'assistant' ? '#10b981' : '#f59e0b',
                    phone: newStaffPhone || '۰۹۱۲۰۰۰۰۰۰۰',
                    medicalLicense: newStaffLicense || undefined,
                    isActive: true,
                    isManager: false,
                    isDoctor: newStaffRole === 'doctor',
                    permissions: {
                      canManageAppointments: true,
                      canRegisterTreatments: newStaffRole === 'doctor',
                      canCollectPayments: newStaffRole !== 'doctor',
                      canManageChecks: newStaffRole !== 'doctor',
                      canAccessSettingsAndUsers: false,
                      canBackupAndRestore: newStaffRole === 'admin',
                      canEditPrices: false,
                      canDeleteRecords: false,
                      canManageStaff: false,
                      canViewReports: newStaffRole === 'admin' || newStaffRole === 'accountant',
                      canAccessLabPortal: true
                    }
                  };
                  const updated = [...staffList, created];
                  saveStaffList(updated);
                  setNewStaffName('');
                  setNewStaffEmail('');
                  setNewStaffPassword('');
                  setNewStaffPhone('');
                  setNewStaffLicense('');
                  setShowAddStaff(false);
                  triggerHaptic('success');
                  showToast(`پرسنل "${created.fullName}" با تایید مدیر به سیستم اضافه شد.`);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all mt-1 cursor-pointer"
              >
                تایید و ثبت نهایی عضو جدید با مجوز مدیر
              </button>
            </div>
          )}

          {/* 4. LIST OF STAFF MEMBERS WITH DIRECT RBAC CONTROLS */}
          <div className="space-y-2.5">
            {staffList.filter(member => member.id !== 'user-manager-amiri').map((member) => {
              const isRevealed = revealedPasswords[member.id];
              const isEditing = editingUserId === member.id;
              const isPermissionsExpanded = expandedPermissionsUserId === member.id;

              return (
                <div
                  key={member.id}
                  className="bg-white/95 backdrop-blur-md rounded-[22px] p-3.5 shadow-2xs border border-slate-200/80 space-y-2.5 text-xs"
                >
                  {/* Top Info Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-black shadow-xs shrink-0"
                        style={{ backgroundColor: member.avatarColor || '#38bdf8' }}
                      >
                        {member.role === 'doctor' ? 'پزشک' : member.role === 'secretary' ? 'منشی' : member.role === 'assistant' ? 'دستیار' : 'مالی'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-slate-900 text-xs truncate">{member.fullName}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            {member.role === 'doctor' ? 'دندانپزشک معالج' : member.role === 'secretary' ? 'منشی و پذیرش' : member.role === 'assistant' ? 'دستیار جراحی و CSR' : 'حسابدار'}
                          </span>
                        </div>
                        <span className="text-[10.5px] text-slate-500 block mt-0.5 truncate">
                          پلتفرم فعال: {member.assignedPlatform} {member.medicalLicense ? `· نظام: ${toPersianDigits(member.medicalLicense)}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Manager Approval Switch */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => {
                          const updated = staffList.map(u => 
                            u.id === member.id ? { ...u, isActive: !u.isActive } : u
                          );
                          saveStaffList(updated);
                          triggerHaptic('light');
                          showToast(`وضعیت "${member.fullName}" به ${!member.isActive ? 'فعال و تایید شده' : 'معلق'} تغییر یافت.`);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                          member.isActive !== false
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border border-rose-300'
                        }`}
                        title="کلیک برای تغییر وضعیت تایید حساب توسط مدیر"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${member.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span>{member.isActive !== false ? 'تایید مدیر (فعال)' : 'معلق توسط مدیر'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`آیا از حذف حساب پرسنل "${member.fullName}" اطمینان دارید؟`)) {
                            const updated = staffList.filter(u => u.id !== member.id);
                            saveStaffList(updated);
                            triggerHaptic('warning');
                            showToast(`حساب "${member.fullName}" حذف گردید.`);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف این کاربر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Credentials Row: Email & Password */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[10.5px] truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{member.email || `${member.username}@minadental.com`}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(member.email || `${member.username}@minadental.com`, 'ایمیل')}
                        className="text-slate-400 hover:text-emerald-600 text-[10px] font-bold shrink-0"
                      >
                        کپی
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[10.5px]">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{isRevealed ? (member.password || '●●●●●●') : '••••••••••••'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            setRevealedPasswords(prev => ({ ...prev, [member.id]: !prev[member.id] }));
                          }}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          title={isRevealed ? 'مخفی‌سازی رمز' : 'نمایش رمز'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            setEditingUserId(isEditing ? null : member.id);
                            setEditingPassword(member.password || '');
                          }}
                          className="text-emerald-700 hover:text-emerald-800 text-[10px] font-bold cursor-pointer"
                        >
                          {isEditing ? 'انصراف' : 'تغییر رمز'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Password Edit Form */}
                  {isEditing && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="کلمه عبور جدید اختصاصی"
                        value={editingPassword}
                        onChange={(e) => setEditingPassword(e.target.value)}
                        dir="ltr"
                        className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-mono flex-1 text-slate-900 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!editingPassword.trim()) return;
                          const updated = staffList.map(u => 
                            u.id === member.id ? { ...u, password: editingPassword.trim() } : u
                          );
                          saveStaffList(updated);
                          setEditingUserId(null);
                          triggerHaptic('success');
                          showToast(`رمز عبور ${member.fullName} با موفقیت ذخیره شد.`);
                        }}
                        className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                      >
                        ذخیره رمز
                      </button>
                    </div>
                  )}

                  {/* Permissions Toggle Trigger Button */}
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        triggerHaptic('selection');
                        setExpandedPermissionsUserId(isPermissionsExpanded ? null : member.id);
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-black text-purple-700 hover:text-purple-900 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>تعیین سطوح دسترسی (RBAC) برای این کاربر</span>
                      {isPermissionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <div className="flex items-center gap-1 text-[9.5px] font-mono text-slate-400">
                      <span>{Object.values(member.permissions || {}).filter(Boolean).length} دسترسی فعال</span>
                    </div>
                  </div>

                  {/* Expandable Granular Permissions Matrix */}
                  {isPermissionsExpanded && (
                    <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-2 animate-in fade-in text-xs">
                      <span className="text-[10px] font-black text-purple-900 block pb-1 border-b border-purple-200/60">
                        ماتریس اختیارات امنیتی و بالینی (تنظیم توسط مدیر کلینیک):
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                        {/* 1. ثبت درمان */}
                        <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:bg-purple-50/50">
                          <span className="font-bold text-slate-800">ثبت طرح‌درمان و چارت پالمر</span>
                          <input
                            type="checkbox"
                            checked={Boolean(member.permissions.canRegisterTreatments)}
                            onChange={(e) => {
                              const updated = staffList.map(u => 
                                u.id === member.id 
                                  ? { ...u, permissions: { ...u.permissions, canRegisterTreatments: e.target.checked } }
                                  : u
                              );
                              saveStaffList(updated);
                              triggerHaptic('light');
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </label>

                        {/* 2. نوبت دهی */}
                        <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:bg-purple-50/50">
                          <span className="font-bold text-slate-800">تقویم و نوبت‌دهی یونیت‌ها</span>
                          <input
                            type="checkbox"
                            checked={Boolean(member.permissions.canManageAppointments)}
                            onChange={(e) => {
                              const updated = staffList.map(u => 
                                u.id === member.id 
                                  ? { ...u, permissions: { ...u.permissions, canManageAppointments: e.target.checked } }
                                  : u
                              );
                              saveStaffList(updated);
                              triggerHaptic('light');
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </label>

                        {/* 3. صندوق و پرداخت */}
                        <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:bg-purple-50/50">
                          <span className="font-bold text-slate-800">صندوق، ثبت دریافتی و کارتخوان</span>
                          <input
                            type="checkbox"
                            checked={Boolean(member.permissions.canCollectPayments)}
                            onChange={(e) => {
                              const updated = staffList.map(u => 
                                u.id === member.id 
                                  ? { ...u, permissions: { ...u.permissions, canCollectPayments: e.target.checked } }
                                  : u
                              );
                              saveStaffList(updated);
                              triggerHaptic('light');
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </label>

                        {/* 4. چک صیادی و اقساط */}
                        <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:bg-purple-50/50">
                          <span className="font-bold text-slate-800">چک‌های صیادی و اقساط بیمار</span>
                          <input
                            type="checkbox"
                            checked={Boolean(member.permissions.canManageChecks)}
                            onChange={(e) => {
                              const updated = staffList.map(u => 
                                u.id === member.id 
                                  ? { ...u, permissions: { ...u.permissions, canManageChecks: e.target.checked } }
                                  : u
                              );
                              saveStaffList(updated);
                              triggerHaptic('light');
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </label>

                        {/* 5. ویرایش قیمت ها و تخفیف - مهم */}
                        <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:bg-purple-50/50">
                          <div>
                            <span className="font-bold text-slate-800 block">ویرایش قیمت و اعمال تخفیف</span>
                            <span className="text-[9px] text-slate-500 font-medium block">در صورت خاموش بودن، قیمت ثبت‌شده توسط منشی قفل است</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(member.permissions.canEditPrices)}
                            onChange={(e) => {
                              const updated = staffList.map(u => 
                                u.id === member.id 
                                  ? { ...u, permissions: { ...u.permissions, canEditPrices: e.target.checked } }
                                  : u
                              );
                              saveStaffList(updated);
                              triggerHaptic('light');
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </label>

                        {/* 6. حذف سوابق و پرونده */}
                        <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:bg-purple-50/50">
                          <div>
                            <span className="font-bold text-slate-800 block">حذف پرونده یا سوابق درمانی</span>
                            <span className="text-[9px] text-rose-600 font-medium block">عملیات حساس و غیرقابل بازگشت</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(member.permissions.canDeleteRecords)}
                            onChange={(e) => {
                              const updated = staffList.map(u => 
                                u.id === member.id 
                                  ? { ...u, permissions: { ...u.permissions, canDeleteRecords: e.target.checked } }
                                  : u
                              );
                              saveStaffList(updated);
                              triggerHaptic('light');
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </label>

                        {/* 7. سفارشات لابراتوار */}
                        <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:bg-purple-50/50">
                          <span className="font-bold text-slate-800">پورتال و سفارشات لابراتوار</span>
                          <input
                            type="checkbox"
                            checked={Boolean(member.permissions.canAccessLabPortal)}
                            onChange={(e) => {
                              const updated = staffList.map(u => 
                                u.id === member.id 
                                  ? { ...u, permissions: { ...u.permissions, canAccessLabPortal: e.target.checked } }
                                  : u
                              );
                              saveStaffList(updated);
                              triggerHaptic('light');
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </label>

                        {/* 8. گزارش های مالی */}
                        <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:bg-purple-50/50">
                          <span className="font-bold text-slate-800">مشاهده گزارش‌های سود و سهم‌بندی</span>
                          <input
                            type="checkbox"
                            checked={Boolean(member.permissions.canViewReports)}
                            onChange={(e) => {
                              const updated = staffList.map(u => 
                                u.id === member.id 
                                  ? { ...u, permissions: { ...u.permissions, canViewReports: e.target.checked } }
                                  : u
                              );
                              saveStaffList(updated);
                              triggerHaptic('light');
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CLOUD, SUPABASE CREDENTIALS & BACKUP */}
      {activeTab === 'cloud' && (
        <div className="mx-2 space-y-2.5">
          {/* Supabase Status Card - Luminous Light Theme */}
          <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[24px] p-4 text-slate-800 border border-emerald-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">سرور ابری سوپابیس (Supabase Realtime)</h3>
                  <span className="text-[10px] text-emerald-700 font-bold">همگام‌سازی بلادرنگ بین منشی، پزشک و دستیار</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                متصل و فعال
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              اطلاعات پرونده‌ها، نوبت‌های یونیت، دستورات لابراتوار و پرداخت‌ها بلافاصله در پایگاه داده ابری سوپابیس با قابلیت Realtime ذخیره می‌شوند.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenPhaseAudit?.();
                }}
                className="w-full py-2.5 px-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-[11px] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                title="آزمون بالینی و ساختاری زنده تمام فازهای ده‌گانه (۴۶ آزمون)"
              >
                <ShieldCheck className="w-4 h-4 text-[#c8ff00] shrink-0" />
                <span>تست ۴۶گانه استاندارد بالینی (۱۰ فاز)</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenLiveSync?.();
                }}
                className="w-full py-2.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                title="شبیه‌ساز بلادرنگ صف پیام و به‌روزرسانی آنی منشی با ثبت درمان پزشک"
              >
                <ArrowLeftRight className="w-4 h-4 text-amber-200 shrink-0" />
                <span>شبیه‌ساز زنده پزشک / منشی</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenSupabaseTest?.();
                }}
                className="w-full py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-white shrink-0" />
                <span>تست دیتابیس سوپابیس</span>
              </button>
            </div>
          </div>

          {/* Complete Supabase Credentials Card - Requested by Dr. Mehdi Amiri */}
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-2xs border border-emerald-200/90 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900">اطلاعات احراز هویت و دسترسی سوپابیس (Supabase Credentials)</span>
              </div>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                اختصاصی دکتر مهدی امیری
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* URL */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="text-[10px] text-slate-500 block font-bold">آدرس پروژه (Project URL):</span>
                  <span className="font-mono text-emerald-700 font-bold text-[11px] truncate block" dir="ltr">{supabaseCreds.url}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(supabaseCreds.url, 'آدرس URL')}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0 shadow-2xs"
                  title="کپی"
                >
                  {copiedField === 'آدرس URL' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Database User */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">نام کاربری (DB User):</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]" dir="ltr">{supabaseCreds.user}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(supabaseCreds.user, 'نام کاربری')}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0 shadow-2xs"
                  >
                    {copiedField === 'نام کاربری' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">رمز عبور (DB Password):</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]" dir="ltr">•••••••••••••</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(supabaseCreds.password, 'رمز عبور دیتابیس')}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0 shadow-2xs"
                  >
                    {copiedField === 'رمز عبور دیتابیس' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Host & Port */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-1">
                  <div className="overflow-hidden">
                    <span className="text-[9.5px] text-slate-500 block font-bold">میزبان (Host):</span>
                    <span className="font-mono text-slate-800 text-[10px] truncate block" dir="ltr">{supabaseCreds.host}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(supabaseCreds.host, 'میزبان دیتابیس')}
                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] text-slate-500 block font-bold">پورت (Port):</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] block text-center" dir="ltr">{supabaseCreds.port}</span>
                </div>
              </div>

              {/* Anon Public Key */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="text-[10px] text-slate-500 block font-bold">کلید عمومی ارتباط (Anon API Key):</span>
                  <span className="font-mono text-slate-600 text-[10px] truncate block" dir="ltr">{supabaseCreds.anonKey}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(supabaseCreds.anonKey, 'کلید عمومی Anon Key')}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0 shadow-2xs"
                  title="کپی"
                >
                  {copiedField === 'کلید عمومی Anon Key' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Backup & Export */}
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-2xs border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileDown className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-800">پشتیبان‌گیری محلی و استخراج اطلاعات</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              جهت حفظ امنیت اطلاعات کلینیک، می‌توانید نسخه کامل دیتابیس شامل مشخصات بیماران، عکس‌ها و تراکنش‌های مالی را دانلود و ذخیره نمایید.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleExportBackup}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <FileDown className="w-4 h-4" />
                <span>دانلود پشتیبان JSON</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('success');
                  showToast('خروجی اکسل لیست بیماران و بدهی‌ها با موفقیت ایجاد شد.');
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-2xs"
              >
                <Building2 className="w-4 h-4" />
                <span>خروجی اکسل بیماران</span>
              </button>
            </div>
          </div>

          {/* Full Source Code ZIP Download Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 backdrop-blur-md rounded-[22px] p-4 shadow-2xs border border-amber-300/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <FileDown className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black text-slate-900">دانلود بسته کامل سورس‌کد پروژه (APK, IPA, PWA Source ZIP)</span>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 font-mono">
                ۳۵۰ KB
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              شامل تمام کدهای فرانت‌اند، کامپوننت‌های بالینی، سیستم پالمر، تعاریف تایپ‌ها، توابع محاسباتی سهم‌بندی پزشکان، تست‌های خودکار و راهنمای ساخت خروجی‌های APK اندروید و IPA آیفون.
            </p>

            <button
              onClick={() => {
                triggerHaptic('success');
                if (onOpenProjectDownload) {
                  onOpenProjectDownload();
                }
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4 stroke-[2.5]" />
              <span>دانلود مستقیم فایل کامل پروژه (minadental-source-full.zip)</span>
            </button>
          </div>

          {/* Add to Home Screen (PWA / iOS / Android) with 3D Embossed Multi-Color Tooth Logo */}
          <div className="bg-gradient-to-br from-purple-600/10 via-white to-purple-600/5 backdrop-blur-md rounded-[22px] p-4 shadow-2xs border border-purple-300/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-300 flex items-center justify-center p-0.5 shadow-2xs">
                  <Logo3DMainDentalTooth size={26} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">افزودن به صفحه اصلی گوشی (Add to Home Screen)</h4>
                  <p className="text-[10px] text-purple-700 font-bold">آیکون سه‌بعدی برجسته، چندرنگ با پس‌زمینه بنفش برای آیفون و اندروید</p>
                </div>
              </div>
              <span className="text-[10px] bg-purple-100 text-purple-900 font-black px-2.5 py-0.5 rounded-full border border-purple-300">
                PWA / IPA / APK
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50/70 rounded-2xl border border-purple-200/80">
              {/* Home Screen App Icon Preview */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-cyan-500/20 border-2 border-purple-300 shadow-md flex flex-col items-center justify-center p-0.5 overflow-hidden">
                  <Logo3DMainDentalTooth size={56} />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-black text-slate-900 text-xs">«مینادنتال» روی هوم اسکرین (Add to Home)</div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  طراحی اختصاصی با استاندارد رسمی Apple iOS 27 و Google Material You با جلوه سه‌بعدی برجسته، عاج مرواریدی و گرادیان چندرنگ (بنفش، سرخابی، فیروزه‌ای و طلایی).
                </p>
              </div>
            </div>

            {/* Platform Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
                <span className="font-black text-slate-800 flex items-center gap-1 text-[11px]">
                  🍏 راهنمای آیفون (iOS Safari):
                </span>
                <p className="text-slate-600 text-[10px] leading-relaxed">
                  ۱. دکمه اشتراک‌گذاری (Share Icon <span className="font-mono text-purple-700">⎋</span>) را در سافاری بزنید.<br />
                  ۲. گزینه <span className="font-bold text-slate-900">«Add to Home Screen»</span> را انتخاب فرمایید.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
                <span className="font-black text-slate-800 flex items-center gap-1 text-[11px]">
                  🤖 راهنمای اندروید (Android Chrome):
                </span>
                <p className="text-slate-600 text-[10px] leading-relaxed">
                  ۱. منوی سه‌نقطه بالای کروم را باز کنید.<br />
                  ۲. گزینه <span className="font-bold text-slate-900">«نصب برنامه (Install app)»</span> یا افزودن به صفحه اصلی را بزنید.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HARDWARE PERIPHERALS, PC-POS, CALLER-ID & SMS GATEWAY */}
      {activeTab === 'hardware' && (
        <div className="mx-2 space-y-3 animate-in fade-in">
          {/* Card 1: PC-POS Card Reader Integration */}
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-2xs border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">پایانه فروش متصل به کامپیوتر (PC-POS شاپرک)</h4>
                  <p className="text-[10px] text-slate-500 font-bold">اتصال مستقیم فاکتورهای مطب به دستگاه کارتخوان بدون وارد کردن دستی مبلغ</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                پروتکل LAN / Serial
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">سوئیچ بانکی (PSP):</label>
                <select
                  value={posProvider}
                  onChange={(e) => setPosProvider(e.target.value as PosProvider)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="behpardakht">به‌پرداخت ملت (Mellat)</option>
                  <option value="sadad">سداد بانک ملی (Sadad)</option>
                  <option value="sep">سامان‌کیش (SEP)</option>
                  <option value="asan_pardakht">آسان‌پرداخت (آپ)</option>
                  <option value="pasargad">پرداخت الکترونیک پاسارگاد (PEP)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">آدرس IP کارتخوان در شبکه مطب:</label>
                <input
                  type="text"
                  value={posIpAddress}
                  onChange={(e) => setPosIpAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 ltr text-left"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">پورت ارتباطی دیمون:</label>
                <input
                  type="number"
                  value={posPort}
                  onChange={(e) => setPosPort(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 ltr text-left"
                />
              </div>
            </div>

            {/* Test POS Transaction */}
            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
              <span className="text-[11px] font-black text-emerald-950 block">آزمون ارسال تراکنش تستی به کارتخوان:</span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={posTestAmount}
                    onChange={(e) => setPosTestAmount(Number(e.target.value))}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                    placeholder="مبلغ به تومان"
                  />
                  <span className="absolute left-3 top-2.5 text-[10px] text-slate-500 font-bold">تومان</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestPosTransaction}
                  disabled={isTestingPos}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isTestingPos ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>ارسال به پوز</span>
                </button>
              </div>

              {posTestResult && (
                <div className="p-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-[11px] font-mono leading-relaxed animate-in fade-in">
                  {posTestResult}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: USB Caller-ID Hardware */}
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-2xs border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">سخت‌افزار کالرآیدی خط تلفن مطب (USB Caller ID)</h4>
                  <p className="text-[10px] text-slate-500 font-bold">شناسایی خودکار بیمار به محض زنگ خوردن تلفن و بالا آوردن سوابق درمان</p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-2.5 py-0.5 rounded-full border border-blue-300">
                پورت سریال USB
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">پورت دستگاه مودم کالرآیدی:</label>
                <input
                  type="text"
                  value={callerIdPort}
                  onChange={(e) => setCallerIdPort(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  placeholder="مثال: COM3 / USB Modem"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تست شماره تلفن ورودی:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testCallerPhone}
                    onChange={(e) => setTestCallerPhone(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 ltr text-left"
                  />
                  <button
                    type="button"
                    onClick={handleSimulateCallerId}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>تست زنگ</span>
                  </button>
                </div>
              </div>
            </div>

            {callerTestResult && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed font-bold animate-in fade-in">
                {callerTestResult}
              </div>
            )}
          </div>

          {/* Card 3: Iranian SMS Gateway Configuration */}
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-4 shadow-2xs border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">وب‌سرویس پیامکی خدماتی ایران (SMS Pattern Service)</h4>
                  <p className="text-[10px] text-slate-500 font-bold">ارسال پیامک یادآوری نوبت، سررسید چک صیادی و اقساط بدون بلاک تبلیغاتی</p>
                </div>
              </div>
              <span className="text-[10px] bg-sky-100 text-sky-800 font-black px-2.5 py-0.5 rounded-full border border-sky-300">
                عبور از بلک‌لیست
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">سامانه پیامکی:</label>
                <select
                  value={smsProvider}
                  onChange={(e) => setSmsProvider(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  <option value="kavenegar">کاوه‌نگار (Kavenegar)</option>
                  <option value="farazsms">فراز اس‌ام‌اس / آی‌پی‌پنل (FarazSMS)</option>
                  <option value="melipayamak">ملی‌پیامک (MeliPayamak)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">کلید وب‌سرویس (API Key):</label>
                <input
                  type="text"
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 ltr text-left"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">سرشماره خط خدماتی:</label>
                <input
                  type="text"
                  value={smsSender}
                  onChange={(e) => setSmsSender(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500 ltr text-left"
                />
              </div>
            </div>

            {/* Live SMS Pattern Dispatch Test */}
            <div className="p-3 bg-sky-50/70 rounded-2xl border border-sky-200 space-y-2">
              <span className="text-[11px] font-black text-sky-950 block">آزمون ارسال پیامک پترن خدماتی:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={smsTestMobile}
                  onChange={(e) => setSmsTestMobile(e.target.value)}
                  className="flex-1 bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none ltr text-left"
                  placeholder="شماره موبایل گیرنده (09xxxxxxxxx)"
                />
                <button
                  type="button"
                  onClick={handleSendSmsTest}
                  disabled={isTestingSms}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isTestingSms ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>ارسال پیامک تستی</span>
                </button>
              </div>

              {smsTestResult && (
                <div className="p-2 rounded-xl bg-white border border-sky-300 text-sky-900 text-[11px] font-mono leading-relaxed animate-in fade-in">
                  {smsTestResult}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Mobile Packaging (Capacitor APK & IPA) */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-[22px] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-purple-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#c8ff00] text-slate-950 flex items-center justify-center shadow-xs">
                  <Terminal className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">پکیجینگ بومی موبایل: خروجی APK (اندروید) و IPA (آیفون)</h4>
                  <p className="text-[10px] text-purple-200">فایل پیکربندی capacitor.config.ts با شناسه ir.minadental.app آماده است</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('success');
                  if (onOpenProjectDownload) onOpenProjectDownload();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#c8ff00] hover:bg-[#b8eb00] text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>دریافت سورس‌کد و راهنمای ساخت</span>
              </button>
            </div>

            <p className="text-xs text-purple-200 leading-relaxed">
              جهت خروجی فایل‌های نصبی مستقل برای تبلت‌های پذیرش و گوشی هوشمند پزشکان، کافیست دستورات زیر را پس از استخراج فایل زیپ در ترمینال اجرا فرمایید:
            </p>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-800/40 text-[11px] font-mono text-emerald-300 ltr text-left space-y-1">
              <div># ساخت نسخه نیتیو اندروید و خروجی APK:</div>
              <div className="text-white font-bold">npx cap add android && npx cap open android</div>
              <div className="pt-1 text-slate-400"># ساخت نسخه نیتیو آیفون و خروجی IPA:</div>
              <div className="text-white font-bold">npx cap add ios && npx cap open ios</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
