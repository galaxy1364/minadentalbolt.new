import React, { useState, useEffect } from 'react';
import { 
  X, Database, Play, CheckCircle2, AlertTriangle, 
  RefreshCw, Server, ShieldCheck, Copy, Check, Sparkles,
  Zap, Code2
} from 'lucide-react';
import { supabaseService, SupabaseTestResult } from '../services/supabaseService';
import { toPersianDigits } from '../utils/jalali';

interface SupabaseTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseTestModal: React.FC<SupabaseTestModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'config' | 'schema'>('tests');
  const [testResults, setTestResults] = useState<SupabaseTestResult[]>([]);
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [config, setConfig] = useState(supabaseService.getConfig());
  const [inputUrl, setInputUrl] = useState(config.url);
  const [inputKey, setInputKey] = useState(config.anonKey);
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = supabaseService.getConfig();
      setConfig(cfg);
      setInputUrl(cfg.url);
      setInputKey(cfg.anonKey);
      
      // Auto run tests on first open if empty
      if (testResults.length === 0) {
        handleRunAllTests();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunAllTests = async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    try {
      const results = await supabaseService.runAllModuleTests();
      setTestResults(results);
    } catch {
      // ignore
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleCopySql = () => {
    const sql = supabaseService.getSqlSchema();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveConfig = () => {
    supabaseService.updateConfig(inputUrl, inputKey);
    setConfig(supabaseService.getConfig());
    handleRunAllTests();
  };

  const handleResetConfig = () => {
    supabaseService.resetToDefaultConfig();
    const cfg = supabaseService.getConfig();
    setConfig(cfg);
    setInputUrl(cfg.url);
    setInputKey(cfg.anonKey);
    handleRunAllTests();
  };

  const totalSuccess = testResults.filter(r => r.status === 'success').length;
  const totalCount = testResults.length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-emerald-950/25 backdrop-blur-xs animate-fade-in"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-emerald-50/90 via-white to-teal-50/50 border border-emerald-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-100 bg-gradient-to-l from-emerald-100/80 via-white to-teal-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  اتصال و تست زنده سوپابیس (Supabase)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Realtime Cloud DB
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                تأیید صحت عملکرد و تست پایگاه‌داده بلادرنگ تمام ماژول‌های مینادنتال
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pt-3 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'tests'
                ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            تست‌های زنده ماژول‌ها
            {testResults.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                {toPersianDigits(totalSuccess)}/{toPersianDigits(totalCount)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            تنظیمات اتصال سرور
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'schema'
                ? 'bg-white text-emerald-700 border-t-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            اسکریپت SQL جداول
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-white">
          
          {/* TAB 1: LIVE TESTS */}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              
              {/* Action Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    تست خودکار و سنجش سلامت ۸ ماژول کلینیک
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    درج، استعلام، به‌روزرسانی و وب‌سوکت بلادرنگ کلیه ماژول‌ها با ثبت تأخیر (ms) آزمایش می‌شوند.
                  </p>
                </div>

                <button
                  onClick={handleRunAllTests}
                  disabled={isRunningAll}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25 disabled:opacity-50 shrink-0"
                >
                  {isRunningAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      در حال اجرای تست‌ها...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      اجرای تست کامل ماژول‌ها
                    </>
                  )}
                </button>
              </div>

              {/* Test Items List */}
              {testResults.length === 0 && !isRunningAll ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <Database className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
                  <p className="text-sm text-slate-800 font-bold">هیچ تستی هنوز اجرا نشده است</p>
                  <p className="text-xs text-slate-500 mt-1">
                    برای شروع روی دکمه «اجرای تست کامل ماژول‌ها» در بالا کلیک کنید.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {testResults.map((test) => (
                    <div 
                      key={test.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {test.status === 'running' && (
                            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                          )}
                          {test.status === 'success' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          {test.status === 'warning' && (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          {test.status === 'error' && (
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {test.title}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-bold">
                                {test.moduleName}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                              {test.message}
                            </p>
                          </div>
                        </div>

                        {test.latencyMs !== undefined && (
                          <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold shrink-0">
                            {toPersianDigits(test.latencyMs)} ms
                          </div>
                        )}
                      </div>

                      {/* Sample Payload Inspector */}
                      {test.payloadSample && (
                        <div className="mt-1 pt-2 border-t border-slate-200">
                          <button
                            onClick={() => setExpandedPayloadId(expandedPayloadId === test.id ? null : test.id)}
                            className="text-[10px] text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-bold"
                          >
                            <Sparkles className="w-3 h-3" />
                            {expandedPayloadId === test.id ? 'بستن مشخصات داده تستی' : 'مشاهده داده‌های بالینی ارسال شده (JSON)'}
                          </button>

                          {expandedPayloadId === test.id && (
                            <pre className="mt-2 p-2.5 rounded-xl bg-emerald-50 text-[10px] font-mono text-emerald-950 overflow-x-auto border border-emerald-300" dir="ltr">
                              {JSON.stringify(test.payloadSample, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SERVER CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">آدرس و کلید عمومی سوپابیس (Supabase API)</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      اطلاعات پروژه اختصاصی سوپابیس خود را در اینجا وارد یا تست نمایید.
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    config.isCustom 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {config.isCustom ? 'پروژه اختصاصی شما' : 'محیط سندباکس کلینیک'}
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supabase Project URL:
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supabase Anon / Public Key:
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    {config.isCustom && (
                      <button
                        onClick={handleResetConfig}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all"
                      >
                        بازگشت به پیش‌فرض
                      </button>
                    )}
                    <button
                      onClick={handleSaveConfig}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs transition-all shadow-md shadow-emerald-600/25"
                    >
                      ذخیره و اعمال تنظیمات
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SQL SCHEMA */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">اسکیمای کامل پایگاه‌داده دندانپزشکی</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    جداول، کلیدها، امنیت RLS و کانال‌های بلادرنگ آماده برای اجرا در SQL Editor سوپابیس
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      کپی شد!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      کپی کدهای SQL
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-2xl bg-emerald-50 border border-emerald-300 p-3 overflow-hidden shadow-inner">
                <pre className="text-[11px] font-mono text-emerald-950 overflow-x-auto max-h-[360px] p-1" dir="ltr">
                  {supabaseService.getSqlSchema()}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>پایگاه‌داده فعال و آماده همگام‌سازی ابری</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-all active:scale-95"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
