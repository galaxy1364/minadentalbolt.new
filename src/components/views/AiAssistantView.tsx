import React, { useState } from 'react';
import { Sparkles, Send, Stethoscope, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { consultDentalAi } from '../../services/geminiDentalAi';

export const AiAssistantView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'طرح درمان کامل برای بیمار با دندان ۶ بالا راست عفونی با دیابت نوع ۲ و مصرف متفورمین',
    'پروتکل تراش و انتخاب سمان رزینی مناسب برای لمینت‌های سرامیکی فک بالا',
    'بررسی گشتاور تورک و پروتکل جراحی فیکسچر در استخوان تیپ ۴ خلف ماگزیلا',
    'راهنمای نسخه نویسی آنتی‌بیوتیک بعد از جراحی ایمپلنت همراه با آگمنتیشن استخوان'
  ];

  const handleAsk = async (queryText?: string) => {
    const q = queryText || prompt;
    if (!q) return;
    setLoading(true);
    try {
      const res = await consultDentalAi(q);
      setResponse(res);
    } catch (e) {
      console.error(e);
      setResponse('خطایی رخ داد، لطفاً مجدداً امتحان نمایید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-28 space-y-4">
      {/* Header Banner */}
      <div className="mx-4 mt-2">
        <div className="bg-gradient-to-r from-indigo-50/90 via-white to-cyan-50/50 rounded-[26px] p-5 text-slate-900 border border-indigo-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">هوش مصنوعی</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="mx-4 space-y-2">
        <span className="text-xs font-bold text-slate-800 block px-1">پرسش‌های بالینی پرتکرار:</span>
        <div className="space-y-1.5">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(p);
                handleAsk(p);
              }}
              className="w-full text-right bg-white p-3 rounded-2xl border border-slate-200 text-xs text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all shadow-2xs leading-relaxed font-medium"
            >
              ⚡ {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="mx-4">
        <div className="bg-white rounded-[26px] p-3 shadow-sm border border-indigo-100 flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="پرسش تشخیصی، دارویی یا طرح درمان..."
            className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-xs px-2 focus:outline-none"
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading}
            className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50 transition-all shadow-xs"
          >
            {loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 -scale-x-100" />}
          </button>
        </div>
      </div>

      {/* Response Box */}
      {response && (
        <div className="mx-4">
          <div className="bg-white rounded-[26px] p-5 shadow-sm border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">پاسخ تشخیصی و راهنمای بالینی</span>
            </div>
            <div className="text-xs text-slate-700 leading-loose whitespace-pre-line">
              {response}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
