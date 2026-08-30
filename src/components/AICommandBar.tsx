// AICommandBar.tsx — Persian natural language command bar with voice input
// Recognizes colloquial Persian commands and routes to the right page or action
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, X, ArrowRight, Mic, MicOff, Search } from 'lucide-react'
import { h } from '../lib/haptics'
import { db } from '../lib/db'
import { createPatient, createAppointment, fetchDoctors, fetchUnits } from '../lib/api'
import { toPersianDigits } from '../lib/persianDate'
import { CLINIC_ID } from '../lib/supabase'
import { showToast } from './ui'
import { rankResults, parseQuery, groupByKind, flattenGroups, KIND_LABELS } from '../lib/globalSearch'
import type { GlobalResult, SearchableRecord } from '../lib/globalSearch'

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
  const [listening, setListening] = useState(false)
  const [executing, setExecuting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const navigate = useNavigate()
  const [records, setRecords] = useState<SearchableRecord[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Ctrl/Cmd+K from anywhere. Bound on the window rather than a wrapper
  // so it works no matter which page or field currently has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        h.tap()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Build the searchable index when the bar opens, not on mount: this
  // reads several tables and most sessions never open the bar at all.
  //
  // Rebuilt on every open rather than cached for the session. Caching
  // meant a patient registered five minutes ago could not be found until
  // the page was reloaded — a search that silently misses a record is
  // worse than a search that takes an extra 100ms. The previous list is
  // left in place while the rebuild runs, so results stay usable.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      const [patients, appointments, treatments, labOrders] = await Promise.all([
        db.patients.toArray(), db.appointments.toArray(),
        db.treatments.toArray(), db.lab_orders.toArray(),
      ])
      if (cancelled) return
      const nameOf = (pid: string) => {
        const p = patients.find((x) => x.id === pid)
        return p ? `${p.first_name} ${p.last_name}` : 'بیمار نامشخص'
      }
      const idx: SearchableRecord[] = [
        ...patients.filter((p) => p.is_active !== false).map((p) => ({
          kind: 'patient' as const, id: p.id,
          title: `${p.first_name} ${p.last_name}`,
          subtitle: p.phone || p.national_id || null,
          route: `/patients/${p.id}`,
          keywords: [p.national_id, p.phone, p.file_number != null ? String(p.file_number) : null],
        })),
        ...appointments.map((a) => ({
          kind: 'appointment' as const, id: a.id,
          title: nameOf(a.patient_id),
          subtitle: a.date ? `${a.date} ${a.start_time || ''}`.trim() : null,
          route: '/appointments',
        })),
        ...treatments.map((t) => ({
          kind: 'treatment' as const, id: t.id,
          title: t.procedure_name || 'درمان',
          subtitle: nameOf(t.patient_id),
          route: '/treatments',
          keywords: [t.tooth_number],
        })),
        ...labOrders.map((l) => ({
          kind: 'labOrder' as const, id: l.id,
          title: l.work_type || 'کار لابراتوار',
          subtitle: nameOf(l.patient_id),
          route: '/laboratory',
        })),
      ]
      setRecords(idx)
    })()
    return () => { cancelled = true }
  }, [open])

  // Ranking is derived, never stored. Storing it meant a query typed
  // while the index was still loading stayed stuck on "no match" after
  // the records arrived, because nothing re-ran the ranking.
  const groups = useMemo(() => {
    const { kind, text } = parseQuery(input)
    if (!text) return []
    return groupByKind(rankResults(text, records, { kind }))
  }, [input, records])

  // Arrow keys must walk the painted order, not the raw score order —
  // see flattenGroups for why those two differ.
  const displayResults = useMemo(() => flattenGroups(groups), [groups])

  const noMatch = input.trim().length > 0 && !result && displayResults.length === 0

  const handleParse = useCallback((text: string) => {
    setInput(text)
    setActiveIndex(0)
    if (!text.trim()) { setResult(null); return }
    // A command still wins when one is recognised — "بیمار جدید اضافه کن"
    // is an instruction, not a search for a patient named "جدید". An
    // explicit "بیمار:" prefix means the user asked for a search, so no
    // command is attempted in that case.
    const { kind } = parseQuery(text)
    setResult(kind ? null : parseCommand(text, navigate, () => {}))
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
    }
  }

  const openResult = (r: GlobalResult) => {
    h.confirm()
    navigate(r.route)
    setOpen(false)
    // Clearing the input is enough to clear the list — it is derived.
    setInput('')
    setResult(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow keys walk the result list. Guarded on length so the keys keep
    // their normal caret behaviour when there is nothing to walk.
    if (displayResults.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setActiveIndex((i) => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1
        return (next + displayResults.length) % displayResults.length
      })
      return
    }
    if (e.key === 'Enter') {
      // Fall back to the first row: the list can shrink under the cursor
      // when a background index rebuild lands mid-typing, and Enter on a
      // stale index must never open nothing.
      const target = displayResults[activeIndex] ?? displayResults[0]
      if (target) { openResult(target); return }
      if (result) handleExecute()
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setInput('')
      setResult(null)
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
        className="fixed bottom-24 left-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-teal-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all-smooth press-scale"
        aria-label="دستیار هوشمند"
      >
        <Sparkles size={16} className="animate-pulse" />
        جستجو و دستیار
        {/* A shortcut nobody knows about does not exist, so it is shown
            on the trigger. Hidden on touch, where there is no keyboard. */}
        <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">Ctrl K</kbd>
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
              placeholder="جستجو یا دستور… مثلا: احمدی — یا — بیمار جدید اضافه کن"
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
              onClick={() => { h.cancel(); setOpen(false); setInput(''); setResult(null) }}
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

            {/* Record results — sectioned by kind so a patient and a
                treatment with the same name stay distinguishable. */}
            {displayResults.length > 0 && (
              <div className="max-h-[45vh] overflow-y-auto">
                {groups.map((group) => (
                  <div key={group.kind}>
                    <div className="px-4 py-1.5 text-xs font-medium text-slate-400 bg-slate-50">
                      {KIND_LABELS[group.kind]}
                    </div>
                    {group.items.map((r) => {
                      const active = displayResults[activeIndex]
                      const isActive = active?.id === r.id && active?.kind === r.kind
                      return (
                        <button
                          key={`${r.kind}-${r.id}`}
                          onClick={() => openResult(r)}
                          onMouseEnter={() => setActiveIndex(displayResults.indexOf(r))}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-right transition-all-smooth ${isActive ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                            {r.subtitle && <p className="text-xs text-slate-500 truncate">{r.subtitle}</p>}
                          </div>
                          <ArrowRight size={16} className="text-slate-300 flex-shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* No match */}
            {noMatch && (
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
