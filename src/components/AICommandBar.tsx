// AICommandBar.tsx — Persian natural language command bar with voice input
// Recognizes colloquial Persian commands and routes to the right page or action
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X, ArrowRight, Mic, MicOff, Search } from 'lucide-react'
import { h } from '../lib/haptics'
import { db } from '../lib/db'
import { createPatient, createAppointment, fetchDoctors, fetchUnits } from '../lib/api'
import { toPersianDigits } from '../lib/persianDate'
import { CLINIC_ID } from '../lib/supabase'
import { showToast } from './ui'

interface CommandMatch {
  intent: string
  label: string
  route?: string
  action?: () => void
  icon?: string
}

// Rule-based Persian NLP parser — matches keywords in colloquial Persian
function parseCommand(
  input: string,
  navigate: (path: string) => void,
  setPendingAction: (action: (() => Promise<void>) | null) => void,
): CommandMatch | null {
  const text = input.trim().toLowerCase()

  // ── Navigation map ──
  const navMap: { keywords: string[]; route: string; label: string }[] = [
    { keywords: ['بیمار', 'patient', 'لیست بیمار'], route: '/patients', label: 'بیماران' },
    { keywords: ['نوبت', 'appointment', 'وقت'], route: '/appointments', label: 'نوبت‌ها' },
    { keywords: ['درمان', 'treatment', 'رویه'], route: '/treatments', label: 'درمان‌ها' },
    { keywords: ['پرداخت', 'صورتحساب', 'billing', 'فاکتور', 'قسط'], route: '/billing', label: 'مالی و پرداخت' },
    { keywords: ['رادیولوژی', 'رادیو', 'x-ray', 'تصویر'], route: '/radiology', label: 'رادیولوژی' },
    { keywords: ['نسخه', 'دارو', 'prescription'], route: '/prescriptions', label: 'نسخه‌ها' },
    { keywords: ['ایمپلنت', 'implant'], route: '/implants', label: 'ایمپلنت‌ها' },
    { keywords: ['انبار', 'موجودی', 'inventory', 'تجهیز'], route: '/inventory', label: 'انبار' },
    { keywords: ['آزمایشگاه', 'لابراتوار', 'lab', 'laboratory'], route: '/laboratory', label: 'آزمایشگاه' },
    { keywords: ['لیست انتظار', 'انتظار', 'waiting'], route: '/waiting-list', label: 'لیست انتظار' },
    { keywords: ['پرسنل', 'کارمند', 'staff'], route: '/staff', label: 'پرسنل' },
    { keywords: ['بیمه', 'insurance'], route: '/insurance', label: 'بیمه' },
    { keywords: ['گزارش', 'آمار', 'report', 'درآمد'], route: '/reports', label: 'گزارش‌ها' },
    { keywords: ['تنظیم', 'setting', 'config'], route: '/settings', label: 'تنظیمات' },
    { keywords: ['داشبورد', 'خانه', 'home', 'dashboard'], route: '/', label: 'داشبورد' },
  ]

  // ── Action: add new patient (real action, not just navigation) ──
  if (/(اضافه|جدید|ثبت|ساخ|create|add|new).*(بیمار|patient)/.test(text) ||
      /(بیمار|patient).*(اضافه|جدید|ثبت|ساخ)/.test(text)) {
    // Try to extract name from command
    const nameMatch = input.match(/(?:به نام|نام|آقای|خانم)\s+([\u0600-\u06FF\s]+)/)
    const phoneMatch = input.match(/(\d{4}[-\s]?\d{3}[-\s]?\d{4}|\d{11})/)
    return {
      intent: 'action',
      label: nameMatch ? `ثبت بیمار: ${nameMatch[1].trim()}` : 'افزودن بیمار جدید',
      route: '/patients',
      action: async () => {
        try {
          const name = nameMatch ? nameMatch[1].trim() : ''
          const phone = phoneMatch ? phoneMatch[1].replace(/\s/g, '') : ''
          if (name) {
            await createPatient({
              clinic_id: CLINIC_ID,
              first_name: name.split(' ')[0] || name,
              last_name: name.split(' ').slice(1).join(' ') || '',
              phone: phone || null,
              date_of_birth: null, gender: null, address: null, email: null,
              medical_history: null, allergies: null, medications: null,
              blood_group: null, emergency_contact: null, notes: null,
              primary_doctor_id: null, status: 'active',
            } as any)
            showToast('success', `بیمار ${name} ثبت شد`)
          }
        } catch { showToast('error', 'خطا در ثبت بیمار') }
      },
    }
  }

  // ── Action: add new appointment ──
  if (/(اضافه|جدید|ثبت|ساخ|create|add|new).*(نوبت|وقت|appointment)/.test(text) ||
      /(نوبت|وقت|appointment).*(اضافه|جدید|ثبت|ساخ)/.test(text)) {
    return {
      intent: 'nav',
      label: 'افزودن نوبت جدید',
      route: '/appointments',
    }
  }

  // ── Today's appointments ──
  if (/(نوبت|وقت).*(امروز|today)/.test(text) || /(امروز|today).*(نوبت|وقت)/.test(text)) {
    return { intent: 'nav', label: 'نوبت‌های امروز', route: '/appointments' }
  }

  // ── Revenue / financial ──
  if (/(درآمد|مالی|پول|هزینه|cost|revenue|finance|billing)/.test(text)) {
    return { intent: 'nav', label: 'گزارش مالی', route: '/reports' }
  }

  // ── General navigation ──
  for (const nav of navMap) {
    for (const kw of nav.keywords) {
      if (text.includes(kw)) {
        return { intent: 'nav', label: nav.label, route: nav.route }
      }
    }
  }

  // ── Search intent ──
  if (/(پیدا|جستجو|search|find|نمایش|نشون|بده|پیدا کن)/.test(text)) {
    const nameMatch = text.match(/(نام|به نام|آقای|خانم|اسمی)\s+([\u0600-\u06FF\s]+)/)
    if (nameMatch) {
      return { intent: 'search_patient', label: `جستجوی بیمار: ${nameMatch[2].trim()}`, route: '/patients' }
    }
    return { intent: 'search', label: 'جستجو در بیماران', route: '/patients' }
  }

  return null
}

// Suggested commands shown when bar is opened
const SUGGESTIONS = [
  'بیمار جدید اضافه کن',
  'نوبت‌های امروز رو نشون بده',
  'درآمد این ماه چنده؟',
  'آقای احمدی رو پیدا کن',
  'لیست انتظار رو باز کن',
  'نسخه جدید بنویس',
  'موجودی انبار رو چک کن',
  'گزارش مالی رو نشون بده',
]

export default function AICommandBar() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<CommandMatch | null>(null)
  const [noMatch, setNoMatch] = useState(false)
  const [listening, setListening] = useState(false)
  const [executing, setExecuting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleParse = useCallback((text: string) => {
    setInput(text)
    if (!text.trim()) { setResult(null); setNoMatch(false); return }
    const match = parseCommand(text, navigate, () => {})
    if (match) { setResult(match); setNoMatch(false) }
    else { setResult(null); setNoMatch(true) }
  }, [navigate])

  const handleExecute = async () => {
    if (!result) return
    h.confirm()
    setExecuting(true)
    try {
      if (result.action) {
        await (result.action as any)()
      }
      if (result.route) {
        navigate(result.route)
      }
    } catch { showToast('error', 'خطا در اجرای دستور') }
    finally {
      setExecuting(false)
      setOpen(false)
      setInput('')
      setResult(null)
      setNoMatch(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (result) handleExecute()
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setInput('')
      setResult(null)
      setNoMatch(false)
    }
  }

  // ── Voice input (Web Speech API) ──
  const toggleVoice = () => {
    h.tap()

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      showToast('error', 'مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'fa-IR'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      handleParse(transcript)
    }

    recognition.onerror = () => {
      setListening(false)
      showToast('error', 'خطا در تشخیص صدا')
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  if (!open) {
    return (
      <button
        onClick={() => { h.tap(); setOpen(true) }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-teal-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all-smooth press-scale"
        aria-label="دستیار هوشمند"
      >
        <Sparkles size={16} className="animate-pulse" />
        دستیار هوشمند
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={() => { h.cancel(); setOpen(false) }}
      />

      {/* Command panel */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl mt-[5vh] px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden modal-in">
          {/* Input row */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center text-white flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => handleParse(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="چه کاری انجام دهم؟ مثلا: بیمار جدید اضافه کن..."
              className="flex-1 text-sm font-medium text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
            />
            {/* Voice button */}
            <button
              onClick={toggleVoice}
              className={`p-2 rounded-lg transition-all-smooth press-scale ${listening ? 'bg-error-100 text-error-600 animate-pulse' : 'text-slate-400 hover:text-primary-600 hover:bg-primary-50'}`}
              aria-label="ورودی صوتی"
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              onClick={() => { h.cancel(); setOpen(false); setInput(''); setResult(null); setNoMatch(false) }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all-smooth"
            >
              <X size={18} />
            </button>
          </div>

          {/* Voice status indicator */}
          {listening && (
            <div className="px-4 py-2 bg-error-50 border-b border-error-100 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-error-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-4 bg-error-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-4 bg-error-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-error-700 font-medium">در حال شنیدن...</span>
            </div>
          )}

          {/* Results / Suggestions */}
          <div className="p-4 max-h-[50vh] overflow-y-auto">
            {/* Matched result */}
            {result && (
              <button
                onClick={handleExecute}
                disabled={executing}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-primary-50 hover:bg-primary-100 transition-all-smooth press-scale text-right disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700">
                    {executing ? <SpinnerSmall /> : <ArrowRight size={16} className="rotate-180" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{result.label}</p>
                    <p className="text-[11px] text-slate-500">برای اجرا کلیک کنید یا Enter بزنید</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-primary-600" />
              </button>
            )}

            {/* No match */}
            {noMatch && !result && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 mb-2">دستور شما را متوجه نشدم</p>
                <p className="text-xs text-slate-400">از پیشنهادهای زیر استفاده کنید:</p>
              </div>
            )}

            {/* Suggestions (when no input) */}
            {!input && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
                  <Mic size={12} /> پیشنهادها (می‌توانید با صدا بگویید)
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { h.tap(); handleParse(s) }}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all-smooth text-right text-sm text-slate-700"
                    >
                      <Sparkles size={14} className="text-primary-400 flex-shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function SpinnerSmall() {
  return (
    <svg className="animate-spin h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
