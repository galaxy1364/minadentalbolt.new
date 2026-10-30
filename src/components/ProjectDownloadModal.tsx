import React, { useState } from 'react';
import { 
  X, Download, Copy, CheckCheck, FileArchive, 
  ExternalLink, AlertTriangle, ShieldCheck, HelpCircle,
  Smartphone, Apple, Terminal
} from 'lucide-react';
import { downloadProjectArchive, getProjectArchiveUrl } from '../utils/downloader';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface ProjectDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectDownloadModal: React.FC<ProjectDownloadModalProps> = ({
  isOpen,
  onClose
}) => {
  const { impactLight, impactHeavy, success, selection } = useHapticFeedback();
  const [activeTab, setActiveTab] = useState<'download' | 'mobile_guide'>('download');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const fullUrl = getProjectArchiveUrl();

  const handleCopyCommand = async (cmd: string, label: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cmd);
      }
      setCopiedCmd(label);
      impactLight();
      setTimeout(() => setCopiedCmd(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setStatusMsg('در حال بارگیری بسته زیپ پروژه...');
    impactHeavy();

    const ok = await downloadProjectArchive(
      () => {
        setDownloading(false);
        success();
        setStatusMsg('✅ فایل minadental-source-full.zip با موفقیت دریافت و در دانلودهای گوشی/سیستم ذخیره شد.');
      },
      (err) => {
        setDownloading(false);
        setStatusMsg(`خطا: ${err.message}. لطفا لینک کامل را کپی و در تب جدید باز فرمایید.`);
      }
    );

    if (!ok) {
      setDownloading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const input = document.createElement('input');
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      impactLight();
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[24px] border border-slate-200 p-4 sm:p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl text-slate-900 text-right" dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <FileArchive className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">سورس‌کد و بسته‌های نصبی مینادنتال</h3>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">نسخه رسمی نهایی · ۳۵۲ کیلوبایت · پشتیبانی بومی Capacitor</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => { selection(); setActiveTab('download'); }}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'download' ? 'bg-white text-slate-950 shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>دانلود سورس کامل (ZIP)</span>
          </button>
          <button
            type="button"
            onClick={() => { selection(); setActiveTab('mobile_guide'); }}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'mobile_guide' ? 'bg-purple-600 text-white shadow-xs font-black' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>ساخت فایل نصبی APK و IPA</span>
          </button>
        </div>

        {/* TAB 1: DIRECT DOWNLOAD */}
        {activeTab === 'download' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Root Cause Clarification Banner */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-black text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>دلیل خطای DNS_PROBE_FINISHED_NXDOMAIN در کروم:</span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                مرورگر کروم عبارت <span className="font-mono font-bold" dir="ltr">minadental-source-full.zip</span> را به جای نام فایل، به عنوان یک دامنه اینترنتی (به دلیل پسوند <span className="font-mono font-bold" dir="ltr">.zip</span>) تفسیر کرده و به اشتباه در جستجوی سایت آن در اینترنت برآمده است!
              </p>
              <p className="text-[11px] text-amber-900/90 leading-relaxed font-bold">
                راهکار: مستقیماً از دکمه سبز دانلود زیر استفاده فرمایید، یا لینک کامل دارای <span className="font-mono font-bold" dir="ltr">https://</span> را کپی نمایید.
              </p>
            </div>

            {/* Primary Direct Download Button */}
            <div className="space-y-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                <span>{downloading ? 'در حال آماده‌سازی و دانلود فایل...' : 'دانلود مستقیم فایل پروژه (minadental-source-full.zip)'}</span>
              </button>

              {statusMsg && (
                <p className="text-[11px] font-bold text-center text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {statusMsg}
                </p>
              )}
            </div>

            {/* Direct Link Copier (Full Absolute URL) */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-black text-slate-700 block">لینک کامل و رسمی دانلود اینترنتی:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={fullUrl}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-700 text-left focus:outline-none select-all"
                  dir="ltr"
                />
                <button
                  onClick={handleCopyUrl}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی لینک</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                با باز کردن این لینک کامل در مرورگر گوشی یا کامپیوتر، فایل زیپ فوراً ذخیره می‌گردد.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: MOBILE NATIVE APK & IPA BUILD GUIDE */}
        {activeTab === 'mobile_guide' && (
          <div className="space-y-3 text-xs animate-in fade-in">
            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-purple-900">
                <Smartphone className="w-4 h-4 text-purple-700" />
                <span>خروجی باینری مستقل با شناسه ir.minadental.app:</span>
              </div>
              <p className="text-[11px] text-purple-900/90 leading-relaxed">
                فایل <span className="font-mono font-bold">capacitor.config.ts</span> در ریشه پروژه قرار داده شده است. پس از استخراج فایل زیپ، با دستورات زیر روی سیستم خود فایل نصبی تولید فرمایید:
              </p>
            </div>

            {/* Android APK Box */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>تولید APK اندروید (تبلت‌های پذیرش و گوشی):</span>
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-md">
                  Android APK
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] ltr text-left flex items-center justify-between">
                <span>npm run build && npx cap add android && npx cap open android</span>
                <button
                  type="button"
                  onClick={() => handleCopyCommand('npm run build && npx cap add android && npx cap open android', 'apk')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] shrink-0 mr-2 cursor-pointer"
                >
                  {copiedCmd === 'apk' ? 'کپی شد' : 'کپی دستور'}
                </button>
              </div>
              <p className="text-[10.5px] text-slate-500">
                اندروید استودیو باز شده و با کلیک روی <span className="font-bold">Build &gt; Build APK</span> فایل <span className="font-mono font-bold">app-debug.apk</span> تحویل داده می‌شود.
              </p>
            </div>

            {/* iOS IPA Box */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <Apple className="w-4 h-4 text-slate-800" />
                  <span>تولید IPA آیفون (برای گوشی اپل پزشک):</span>
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-800 font-mono font-bold px-2 py-0.5 rounded-md">
                  iOS IPA
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 text-cyan-300 font-mono text-[11px] ltr text-left flex items-center justify-between">
                <span>npm run build && npx cap add ios && npx cap open ios</span>
                <button
                  type="button"
                  onClick={() => handleCopyCommand('npm run build && npx cap add ios && npx cap open ios', 'ipa')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] shrink-0 mr-2 cursor-pointer"
                >
                  {copiedCmd === 'ipa' ? 'کپی شد' : 'کپی دستور'}
                </button>
              </div>
              <p className="text-[10.5px] text-slate-500">
                محیط Xcode در سیستم‌عامل مک باز شده و از منوی <span className="font-bold">Product &gt; Archive</span> بسته IPA برای توزیع داخلی یا استور آماده می‌شود.
              </p>
            </div>
          </div>
        )}

        {/* Primary Direct Download Button */}
        <div className="space-y-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'در حال آماده‌سازی و دانلود فایل...' : 'دانلود مستقیم فایل پروژه (minadental-source-full.zip)'}</span>
          </button>

          {statusMsg && (
            <p className="text-[11px] font-bold text-center text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200">
              {statusMsg}
            </p>
          )}
        </div>

        {/* Direct Link Copier (Full Absolute URL) */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="text-[11px] font-black text-slate-700 block">لینک کامل و رسمی دانلود اینترنتی:</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-700 text-left focus:outline-none select-all"
              dir="ltr"
            />
            <button
              onClick={handleCopyUrl}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1 shrink-0 active:scale-95 transition-all"
            >
              {copied ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی لینک</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            با باز کردن این لینک کامل در مرورگر گوشی یا کامپیوتر، فایل زیپ فوراً ذخیره می‌گردد.
          </p>
        </div>

        {/* Export Formats Included */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-1">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-black text-slate-800">خروجی APK</span>
            <span className="text-[9.5px] text-slate-500 font-bold">اندروید با Capacitor</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-1">
            <Apple className="w-4 h-4 text-slate-800" />
            <span className="text-[11px] font-black text-slate-800">خروجی IPA</span>
            <span className="text-[9.5px] text-slate-500 font-bold">آیفون با Xcode</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-1">
            <Terminal className="w-4 h-4 text-purple-600" />
            <span className="text-[11px] font-black text-slate-800">نسخه PWA</span>
            <span className="text-[9.5px] text-slate-500 font-bold">نصب مستقیم در مرورگر</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            بستن پنجره
          </button>
        </div>

      </div>
    </div>
  );
};
