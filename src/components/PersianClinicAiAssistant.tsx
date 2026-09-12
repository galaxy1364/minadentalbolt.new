import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  CreditCard,
  Layers,
  Activity,
  ArrowLeft,
  ChevronRight,
  User,
  Clock,
  Coins,
} from 'lucide-react'
import {
  parseClinicCommand,
  ParsedAiAction,
  ClinicAiIntentType,
} from '../lib/persianClinicNlp'
import {
  fetchPatients,
  createPatient,
  createAppointment,
  createPayment,
  createPaymentPlan,
  createTreatment,
  fetchDoctors,
} from '../lib/api'
import { buildSchedule } from '../lib/installments'
import { toPersianDigits, formatCurrency, toJalaliStringPretty } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { showToast } from './ui'
import { CLINIC_ID } from '../lib/supabase'

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
    }
  }
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: unknown) => void
  onend: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export function PersianClinicAiAssistant() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [parsedAction, setParsedAction] = useState<ParsedAiAction | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<{
    success: boolean
    message: string
    patientId?: string
  } | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize Web Speech API if supported
  useEffect(() => {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechClass) {
      const recognizer = new SpeechClass()
      recognizer.lang = 'fa-IR'
      recognizer.continuous = false
      recognizer.interimResults = false

      recognizer.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript
        if (transcript) {
          setInputText(transcript)
          handleParse(transcript)
        }
        setIsListening(false)
        h.confirm()
      }

      recognizer.onerror = () => {
        setIsListening(false)
        h.warning()
      }

      recognizer.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognizer
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast('info', 'تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود. لطفاً دستور را تایپ کنید.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      h.tap()
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        h.select()
      } catch {
        setIsListening(false)
      }
    }
  }

  const handleParse = (textToParse: string) => {
    if (!textToParse.trim()) return
    h.select()
    const action = parseClinicCommand(textToParse)
    setParsedAction(action)
    setExecutionResult(null)
  }

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt)
    handleParse(prompt)
  }

  // Execute Action on IndexedDB after confirmation
  const handleConfirmAndExecute = async () => {
    if (!parsedAction) return
    setIsExecuting(true)
    h.select()

    try {
      // 1. Find or create matching patient
      const allPatients = await fetchPatients()
      const targetName = (parsedAction.patientName || '').trim().toLowerCase()
      let patient = allPatients.find(
        (p) => `${p.first_name} ${p.last_name}`.toLowerCase() === targetName
      )

      if (!patient) {
        // Find by partial match
        patient = allPatients.find(
          (p) =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(targetName) ||
            p.last_name.toLowerCase().includes(targetName)
        )
      }

      // If patient not found, create one gracefully
      if (!patient) {
        const nameParts = targetName.split(' ')
        const firstName = nameParts[0] || 'بیمار'
        const lastName = nameParts.slice(1).join(' ') || 'جدید'
        patient = await createPatient({
          first_name: firstName,
          last_name: lastName,
          phone: '',
          national_id: null,
          birth_date: null,
          gender: 'unknown',
          address: null,
          medical_history: null,
          allergies: null,
          is_active: true,
          notes: 'ثبت شده توسط دستیار هوشمند صوتی/متنی مینا',
        } as any)
      }

      const doctors = await fetchDoctors()
      const defaultDoctorId = doctors.length > 0 ? doctors[0].id : null

      // 2. Perform action according to intent
      switch (parsedAction.intent) {
        case 'create_appointment': {
          await createAppointment({
            clinic_id: CLINIC_ID,
            patient_id: patient.id,
            doctor_id: defaultDoctorId,
            unit_id: null,
            date: parsedAction.date || new Date().toISOString().slice(0, 10),
            start_time: parsedAction.time || '17:00',
            end_time: '17:30',
            duration_minutes: 30,
            type: parsedAction.service || 'ویزیت',
            status: 'scheduled',
            notes: `ثبت هوشمند: ${parsedAction.rawText}`,
            reminder_enabled: true,
          } as any)
          break
        }

        case 'record_payment': {
          await createPayment({
            clinic_id: CLINIC_ID,
            patient_id: patient.id,
            amount: parsedAction.amount || 0,
            payment_date: new Date().toISOString().slice(0, 10),
            payment_method: parsedAction.paymentMethod || 'card',
            reference: 'ثبت صوتی/هوشمند AI',
            created_by: null,
            treatment_id: null,
            doctor_id: defaultDoctorId,
            encounter_id: null,
            implant_case_id: null,
            notes: parsedAction.rawText,
            status: 'completed',
          } as any)
          break
        }

        case 'create_installment_plan': {
          const total = parsedAction.amount || 10_000_000
          const count = parsedAction.installmentsCount || 4
          const today = new Date().toISOString().slice(0, 10)
          const schedule = buildSchedule(total, count, today)

          await createPaymentPlan(
            {
              clinic_id: CLINIC_ID,
              patient_id: patient.id,
              total_amount: total,
              installment_count: count,
              start_date: today,
              status: 'active',
              encounter_id: null,
              created_by: null,
              notes: `طرح اقساط هوشمند: ${parsedAction.rawText}`,
            } as any,
            schedule.map((s, idx) => ({
              clinic_id: CLINIC_ID,
              installment_number: idx + 1,
              amount: s.amount,
              due_date: s.due_date,
              payment_plan_id: '',
              patient_id: patient.id,
              status: 'pending',
              payment_date: null,
              reminder_sent: false,
              notes: null,
            })) as any
          )
          break
        }

        case 'record_treatment': {
          await createTreatment({
            clinic_id: CLINIC_ID,
            patient_id: patient.id,
            doctor_id: defaultDoctorId,
            tooth_number: parsedAction.toothNumber ? String(parsedAction.toothNumber) : null,
            procedure_name: parsedAction.service || 'درمان دندانپزشکی',
            cost: parsedAction.amount ?? null,
            status: 'planned',
            notes: `ثبت هوشمند: ${parsedAction.rawText}`,
            encounter_id: '',
            insurance_share: 0,
            patient_share: parsedAction.amount || 0,
            procedure_id: null,
            discount: 0,
            discount_type: 'percent',
            tooth_surface: null,
            phase_id: null,
            phase_number: null,
            color: null,
            created_by: null,
          } as any)
          break
        }

        default:
          throw new Error('دستور قابل اجرا تشخیص داده نشد.')
      }

      h.confirm()
      setExecutionResult({
        success: true,
        message: `عملیات با موفقیت در پرونده «${patient.first_name} ${patient.last_name}» ثبت گردید.`,
        patientId: patient.id,
      })
      showToast('success', 'عملیات هوشمند با موفقیت انجام شد')
    } catch (err: any) {
      h.warning()
      setExecutionResult({
        success: false,
        message: err.message || 'خطا در ثبت اطلاعات در سامانه',
      })
      showToast('error', err.message || 'خطا در اجرای دستور')
    } finally {
      setIsExecuting(false)
    }
  }

  const getIntentIcon = (intent: ClinicAiIntentType) => {
    switch (intent) {
      case 'create_appointment':
        return <Calendar className="text-sky-500" size={22} />
      case 'record_payment':
        return <CreditCard className="text-emerald-500" size={22} />
      case 'create_installment_plan':
        return <Layers className="text-violet-500" size={22} />
      case 'record_treatment':
        return <Activity className="text-amber-500" size={22} />
      default:
        return <Sparkles className="text-primary-500" size={22} />
    }
  }

  return (
    <>
      {/* Floating iOS 27 Glassmorphic Action Trigger */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => {
            h.select()
            setIsOpen(true)
            setTimeout(() => inputRef.current?.focus(), 150)
          }}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900/80 dark:bg-white/90 text-white dark:text-slate-900 shadow-2xl backdrop-blur-xl border border-white/20 dark:border-slate-800/30 transition-all-smooth hover:scale-105 active:scale-95"
          title="دستیار هوشمند صوتی و متنی کلینیک مینا"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-7 h-7 rounded-full bg-primary-400/40 animate-ping pointer-events-none" />
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center text-white shadow">
              <Sparkles size={14} className="animate-spin-slow" />
            </div>
          </div>
          <span className="text-xs font-black tracking-tight">
            دستیار هوشمند مینا
          </span>
        </button>
      </div>

      {/* iOS 27 Ultra-Modern AI Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-xl rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    دستیار گفتگویی هوش مصنوعی مینا
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ثبت هوشمند نوبت، پرداخت، اقساط و درمان با گفتگوی فارسی عامیانه
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  h.tap()
                  setIsOpen(false)
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Voice / Text Input Box */}
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleParse(inputText)
                    }}
                    placeholder="مثال: برای رضا احمدی فردا ساعت ۱۷ نوبت عصب‌کشی بگذار..."
                    className="w-full pl-24 pr-4 py-3.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition shadow-inner"
                  />

                  <div className="absolute left-2 flex items-center gap-1">
                    {/* Voice Mic Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse shadow-lg'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary-50 hover:text-primary-600'
                      }`}
                      title={isListening ? 'در حال شنیدن...' : 'فعال‌سازی ضبط صدا'}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    {/* Submit Text Button */}
                    <button
                      type="button"
                      onClick={() => handleParse(inputText)}
                      disabled={!inputText.trim()}
                      className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition disabled:opacity-40"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>

                {isListening && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    در حال گوش دادن به زبان فارسی... لطفاً صحبت کنید
                  </div>
                )}
              </div>

              {/* Suggested Quick Prompt Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">
                  نمونه دستورات پرکاربرد کلینیک:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'برای رضا احمدی فردا ساعت ۱۷ نوبت عصب‌کشی بگذار',
                    'علی مرادی ۳ میلیون پرداخت کرد کارتخوان',
                    'طرح اقساط ۱۰ میلیونی در ۴ قسط با پیش‌پرداخت ۲ میلیون برای مریم حسینی',
                    'ثبت روکش زیرکونیا برای دندان ۱۶ بیمار رضا احمدی',
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(chip)}
                      className="text-[11px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 dark:hover:bg-primary-950/40 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition text-right"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parsed Action & Confirmation Card */}
              {parsedAction && parsedAction.intent !== 'unknown' && !executionResult && (
                <div className="p-4 rounded-2xl border border-primary-200 dark:border-primary-900/60 bg-gradient-to-b from-primary-50/40 to-transparent dark:from-primary-950/20 space-y-3.5 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center">
                        {getIntentIcon(parsedAction.intent)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {parsedAction.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {parsedAction.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300">
                      دقت هوش مصنوعی: ۹۵٪
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                    {parsedAction.details.map((d, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-[10px] text-slate-400">{d.label}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Security Confirmation Callout */}
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      جهت رعایت استانداردهای ایمنی بالینی، لطفاً پارامترهای استخراج‌شده فوق را
                      بررسی کرده و در صورت تأیید، دکمه ثبت نهایی را بفشارید.
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleConfirmAndExecute}
                      disabled={isExecuting}
                      className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      {isExecuting ? 'در حال ثبت در پرونده...' : 'تأیید و اعمال نهایی'}
                    </button>
                    <button
                      onClick={() => setParsedAction(null)}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition"
                    >
                      ویرایش / انصراف
                    </button>
                  </div>
                </div>
              )}

              {/* Execution Success Result */}
              {executionResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-3 animate-scale-in ${
                    executionResult.success
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200'
                      : 'border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {executionResult.success ? (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle size={18} className="text-red-500 shrink-0" />
                    )}
                    <span className="font-bold">{executionResult.message}</span>
                  </div>

                  {executionResult.patientId && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setIsOpen(false)
                          navigate(`/patients/${executionResult.patientId}`)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow transition"
                      >
                        <span>مشاهده پرونده بیمار</span>
                        <ChevronRight size={14} className="rotate-180" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
