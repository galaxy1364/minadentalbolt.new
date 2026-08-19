// PublicBooking.tsx — نوبت‌دهی آنلاین: a public form with NO login
// required, meant to be linked/embedded from the clinic's own website
// (e.g. minadent-clinic.com/book -> this app's #/book route). Writes
// directly to online_booking_requests via the anon key, which is only
// allowed to INSERT on this one table (see migration 018) — every
// other table in this app stays locked to authenticated-only.
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle2, Calendar, Phone, User, MessageSquare } from 'lucide-react'
import { MinadentLogo } from '../components/MinadentLogo'
import { PersianCalendar } from '../components/PersianCalendar'
import { toJalaliStringPretty } from '../lib/persianDate'
import { h } from '../lib/haptics'

const CLINIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkxkihdibkmpryopbkkz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
// A separate, minimal client with NO session persistence — this page
// is public and unauthenticated by design, so it must never touch the
// staff app's own login session in localStorage.
const publicClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })

export default function PublicBooking() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const timeSlots = ['۰۹:۰۰', '۱۰:۰۰', '۱۱:۰۰', '۱۲:۰۰', '۱۵:۰۰', '۱۶:۰۰', '۱۷:۰۰', '۱۸:۰۰']

  const handleSubmit = async () => {
    setError('')
    if (!fullName.trim() || !phone.trim()) { setError('نام و شماره تماس الزامی است'); return }
    setSubmitting(true)
    try {
      const { error: insertError } = await publicClient.from('online_booking_requests').insert({
        clinic_id: CLINIC_ID,
        full_name: fullName.trim(),
        phone: phone.trim(),
        preferred_date: date || null,
        preferred_time: time || null,
        reason: reason.trim() || null,
        status: 'pending',
      })
      if (insertError) throw insertError
      h.success()
      setDone(true)
    } catch {
      setError('خطا در ثبت درخواست — لطفاً دوباره تلاش کنید یا با مطب تماس بگیرید')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-6" dir="rtl">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-success-600" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-800 mb-2">درخواست شما ثبت شد</h1>
          <p className="text-sm text-slate-500">همکاران ما به‌زودی برای هماهنگی نهایی نوبت با شما تماس می‌گیرند.</p>
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
            className="w-full py-3 rounded-2xl bg-primary-600 text-white font-bold text-sm disabled:opacity-60"
          >
            {submitting ? 'در حال ارسال...' : 'ثبت درخواست نوبت'}
          </button>
          <p className="text-[11px] text-slate-400 text-center">این یک درخواست است، نوبت شما پس از تماس همکاران ما نهایی می‌شود.</p>
        </div>
      </div>
    </div>
  )
}
