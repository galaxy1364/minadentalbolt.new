import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle2, Calendar, Phone, User, MessageSquare, ArrowRight, Copy, Check, Navigation, MapPin, Clock } from 'lucide-react'
import { MinadentLogo } from '../components/MinadentLogo'
import { PersianCalendar } from '../components/PersianCalendar'
import { toJalaliStringPretty, toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'

const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkxkihdibkmpryopbkkz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
// A separate, minimal client with NO session persistence — this page
// is public and unauthenticated by design, so it must never touch the
// staff app's own login session in localStorage.
const publicClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })

// مختصات کلینیک جهت مسیریابی (تهران، نمونه مطب مرکزی)
const CLINIC_LAT = '35.7219'
const CLINIC_LNG = '51.4056'
const CLINIC_PHONE = '02188001122'
const CLINIC_PHONE_DISPLAY = '۰۲۱-۸۸۰۰۱۱۲۲'
const CLINIC_ADDRESS = 'تهران، خیابان ولیعصر، نرسیده به میدان ونک، مجتمع پزشکان، طبقه ۳'

function normalizePhone(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/\s+/g, '')
    .trim()
}

export default function PublicBooking() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const timeSlots = ['۰۹:۰۰', '۱۰:۰۰', '۱۱:۰۰', '۱۲:۰۰', '۱۵:۰۰', '۱۶:۰۰', '۱۷:۰۰', '۱۸:۰۰']

  const handleCopyTrackingCode = () => {
    if (!trackingCode) return
    navigator.clipboard?.writeText(trackingCode)
    setCopied(true)
    h.tap()
    chimes.playSuccess()
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSubmit = async () => {
    setError('')
    const cleanPhone = normalizePhone(phone)
    if (!fullName.trim() || !cleanPhone) { 
      chimes.playWarning()
      setError('نام و شماره تماس الزامی است')
      return 
    }
    if (!/^09\d{9}$/.test(cleanPhone)) {
      chimes.playWarning()
      setError('شماره موبایل نامعتبر است (مثال: ۰۹۱۲۳۴۵۶۷۸۹)')
      return
    }
    setSubmitting(true)
    // تولید کد پیگیری منحصربه‌فرد برای مراجع
    const generatedCode = `MN-${Math.floor(10000 + Math.random() * 90000)}`
    try {
      const { error: insertError } = await publicClient.from('online_booking_requests').insert({
        clinic_id: CLINIC_ID,
        full_name: fullName.trim(),
        phone: cleanPhone,
        preferred_date: date || null,
        preferred_time: time || null,
        reason: (reason.trim() ? `${reason.trim()} [کد پیگیری: ${generatedCode}]` : `[کد پیگیری: ${generatedCode}]`),
        status: 'pending',
      })
      if (insertError) throw insertError
      h.success()
      chimes.playSuccess()
      setTrackingCode(generatedCode)
      setDone(true)
    } catch {
      chimes.playWarning()
      setError('خطا در ثبت درخواست — لطفاً دوباره تلاش کنید یا با مطب تماس بگیرید')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    h.tap()
    setFullName('')
    setPhone('')
    setDate('')
    setTime('')
    setReason('')
    setTrackingCode('')
    setDone(false)
    setError('')
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 p-4 sm:p-6" dir="rtl">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 text-center shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-bounce">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 mb-1">درخواست شما با موفقیت ثبت شد</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              همکاران ما در کلینیک دندانپزشکی مینا به‌زودی جهت هماهنگی نهایی با شماره <span className="font-mono font-bold text-primary-600 dir-ltr inline-block">{toPersianDigits(normalizePhone(phone))}</span> تماس خواهند گرفت.
            </p>
          </div>

          {/* کارت کد رهگیری */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">کد رهگیری نوبت:</span>
              <span className="font-mono font-black text-slate-800 text-base tracking-wider">{trackingCode}</span>
            </div>
            <button
              onClick={handleCopyTrackingCode}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'کپی شد' : 'کپی کد'}</span>
            </button>
          </div>

          {/* تماس سریع و ساعت کاری */}
          <div className="bg-primary-50/70 border border-primary-100 rounded-2xl p-3.5 text-right space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-primary-900">
                <Phone size={14} className="text-primary-600" />
                تلفن پذیرش کلینیک:
              </span>
              <a
                href={`tel:${CLINIC_PHONE}`}
                className="font-mono font-bold text-primary-700 hover:text-primary-800 underline dir-ltr"
              >
                {CLINIC_PHONE_DISPLAY}
              </a>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <Clock size={13} className="text-slate-400" />
              <span>شنبه تا چهارشنبه ۹:۰۰ الی ۲۰:۰۰ | پنجشنبه‌ها ۹:۰۰ الی ۱۴:۰۰</span>
            </div>
            <div className="flex items-start gap-1.5 text-slate-600 text-[11px] pt-1 border-t border-primary-100/60">
              <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{CLINIC_ADDRESS}</span>
            </div>
          </div>

          {/* دکمه‌های مسیریابی هوشمند */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <Navigation size={14} className="text-primary-600" />
              <span>مسیریابی سریع به کلینیک:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://nshn.ir/?lat=${CLINIC_LAT}&lng=${CLINIC_LNG}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors text-center border border-blue-200/60"
              >
                نقشه نشان
              </a>
              <a
                href={`https://balad.ir/location?latitude=${CLINIC_LAT}&longitude=${CLINIC_LNG}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors text-center border border-emerald-200/60"
              >
                نقشه بلد
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${CLINIC_LAT},${CLINIC_LNG}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors text-center border border-slate-200"
              >
                گوگل مپ
              </a>
            </div>
          </div>

          <button
            onClick={resetForm}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span>ثبت درخواست نوبت جدید</span>
            <ArrowRight size={14} className="rotate-180" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50" dir="rtl">
      <div className="max-w-md mx-auto px-5 py-8">
        <div className="flex flex-col items-center mb-6">
          <MinadentLogo size={56} />
          <h1 className="text-lg font-extrabold text-slate-800 mt-3">درخواست نوبت آنلاین</h1>
          <p className="text-xs text-slate-500 mt-1">فرم زیر را پر کنید تا همکاران ما با شما تماس بگیرند</p>
        </div>

        <div className="bg-white rounded-3xl shadow-ios p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5"><User size={13} /> نام و نام خانوادگی *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="نام کامل" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5"><Phone size={13} /> شماره تماس *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base text-left focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5"><Calendar size={13} /> تاریخ ترجیحی (اختیاری)</label>
            <PersianCalendar selectedDate={date || new Date().toISOString().slice(0, 10)} onDateSelect={setDate} />
            {date && <p className="text-xs text-primary-600 mt-1.5">انتخاب‌شده: {toJalaliStringPretty(date)}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5">بازه‌ی ساعت ترجیحی (اختیاری)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {timeSlots.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`py-2 rounded-xl text-xs font-bold ${time === t ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5"><MessageSquare size={13} /> دلیل مراجعه (اختیاری)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="مثلاً: درد دندان، مشاوره ایمپلنت..." className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>

          {error && <p className="text-xs text-error-600 bg-error-50 p-2.5 rounded-xl">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-primary-600 text-white font-bold text-sm disabled:opacity-60 hover:bg-primary-700 transition-colors shadow-sm"
          >
            {submitting ? 'در حال ارسال...' : 'ثبت درخواست نوبت'}
          </button>
          <p className="text-[11px] text-slate-400 text-center">این یک درخواست است، نوبت شما پس از تماس همکاران ما نهایی می‌شود.</p>
        </div>

        {/* اطلاعات تماس پذیرش در پایین صفحه */}
        <div className="mt-4 text-center space-y-1 text-xs text-slate-500">
          <p>
            نیاز به راهنمایی فوری دارید؟{' '}
            <a href={`tel:${CLINIC_PHONE}`} className="font-bold text-primary-600 hover:text-primary-700 underline">
              تماس با پذیرش کلینیک ({CLINIC_PHONE_DISPLAY})
            </a>
          </p>
          <p className="text-[11px] text-slate-400">ساعات پاسخگویی: شنبه تا چهارشنبه ۹ الی ۲۰ — پنجشنبه ۹ الی ۱۴</p>
        </div>
      </div>
    </div>
  )
}
