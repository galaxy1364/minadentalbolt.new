import { useState } from 'react'
import { Loader2, Mail, Phone, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui'
import { MinadentLogo } from '../components/MinadentLogo'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'

type Mode = 'email' | 'phone'

/** Normalizes an Iranian mobile number (09xxxxxxxxx) to E.164 (+989xxxxxxxxx). */
function normalizeIranPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '')
  if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`
  if (/^989\d{9}$/.test(digits)) return `+${digits}`
  if (/^\+989\d{9}$/.test(raw)) return raw
  return null
}

export default function Login() {
  const { signIn, notice, isOffline, signInOffline, profile } = useAuth()
  const [mode, setMode] = useState<Mode>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResetSent(false)

    let identifier = ''
    if (mode === 'email') {
      if (!email.trim()) { setError('ایمیل را وارد کنید'); chimes.playWarning(); return }
      identifier = email.trim().toLowerCase()
    } else {
      const normalized = normalizeIranPhone(phone)
      if (!normalized) { setError('شماره موبایل معتبر نیست (مثال: 0912xxxxxxx)'); chimes.playWarning(); return }
      identifier = normalized
    }
    if (!password) { setError('رمز عبور را وارد کنید'); chimes.playWarning(); return }

    setLoading(true)
    const { error: signInError } = await signIn(identifier, password)
    setLoading(false)
    if (signInError) {
      setError(signInError)
      h.error()
      chimes.playWarning()
    } else {
      h.success()
      chimes.playSuccess()
    }
  }

  const handleForgotPassword = async () => {
    setError('')
    if (mode === 'phone') {
      setError('بازیابی رمز فقط برای حساب‌های ایمیلی فعال است — برای شماره موبایل با مدیر کلینیک تماس بگیرید')
      chimes.playWarning()
      return
    }
    if (!email.trim()) { setError('ابتدا ایمیل خود را وارد کنید'); chimes.playWarning(); return }
    setResetLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
    setResetLoading(false)
    if (resetError) {
      setError('خطا در ارسال ایمیل بازیابی')
      h.error()
      chimes.playWarning()
    } else {
      setResetSent(true)
      h.success()
      chimes.playSuccess()
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-slate-950" dir="rtl">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />
        <div className="login-blob login-blob-4" />
        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-4">
          <div className="mb-2.5 rounded-3xl p-[2px] bg-gradient-to-br from-violet-400 via-fuchsia-400 to-sky-400 shadow-lg shadow-violet-500/20">
            <div className="bg-slate-950 rounded-[22px] p-2">
              <MinadentLogo size={42} />
            </div>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">مینادنت</h1>
          <p className="text-xs text-slate-300 font-medium">سیستم جامع مدیریت کلینیک دندانپزشکی</p>
        </div>

        <div className="rounded-3xl p-[1.5px] bg-gradient-to-br from-violet-400/60 via-fuchsia-400/40 to-sky-400/60 shadow-2xl">
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-4 sm:p-5">

            {/* ورود سریع مدیریت کلینیک (تک لمسی بدون گیر کردن پشت سرور) */}
            <button
              type="button"
              onClick={() => {
                h.confirm()
                chimes.playSuccess()
                signInOffline('owner', 'مصطفی حسن‌وند', 'mostafa.hasanvand@gmail.com')
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 mb-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-violet-500/10 to-sky-500/15 border border-amber-500/35 hover:border-amber-500/60 transition-all press-scale shadow-sm text-right group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-bold shadow-inner group-hover:scale-105 transition-transform">
                  👑
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    ورود سریع مدیر (مصطفی حسن‌وند)
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">آنی</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono" dir="ltr">mostafa.hasanvand@gmail.com</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3.5">
              <button
                type="button"
                onClick={() => { h.tap(); chimes.playPop(); setMode('email'); setError(''); setResetSent(false) }}
                className={`flex-1 flex items-center justify-center gap-1.5 min-h-[40px] py-1.5 rounded-xl text-xs font-bold transition-all press-scale ${
                  mode === 'email' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Mail size={14} /> ورود با ایمیل
              </button>
              <button
                type="button"
                onClick={() => { h.tap(); chimes.playPop(); setMode('phone'); setError(''); setResetSent(false) }}
                className={`flex-1 flex items-center justify-center gap-1.5 min-h-[40px] py-1.5 rounded-xl text-xs font-bold transition-all press-scale ${
                  mode === 'phone' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Phone size={14} /> موبایل ایران
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'email' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">ایمیل کاربر</label>
                    <button
                      type="button"
                      onClick={() => {
                        h.tap()
                        setEmail('mostafa.hasanvand@gmail.com')
                      }}
                      className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-mono"
                    >
                      mostafa.hasanvand@gmail.com ⚡
                    </button>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mostafa.hasanvand@gmail.com"
                    dir="ltr"
                    autoFocus
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">شماره موبایل</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912xxxxxxx"
                    dir="ltr"
                    autoFocus
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">رمز عبور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {error && (
                <div className="rounded-xl p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800/40 text-error-700 dark:text-error-300 space-y-2">
                  <p className="text-xs font-medium leading-relaxed">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      h.confirm()
                      chimes.playSuccess()
                      signInOffline('owner', 'مصطفی حسن‌وند', email.trim().toLowerCase() || 'mostafa.hasanvand@gmail.com')
                    }}
                    className="w-full min-h-[40px] py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 transition-all flex items-center justify-center gap-1.5"
                  >
                    ⚡ ورود اضطراری به حساب مدیریت (بدون معطلی)
                  </button>
                </div>
              )}

              {notice && !error && (
                <p className="text-xs text-warning-700 bg-warning-50 dark:bg-warning-900/20 dark:text-warning-400 rounded-xl px-3 py-2 leading-relaxed">{notice}</p>
              )}
              {resetSent && (
                <p className="text-xs text-success-700 bg-success-50 dark:bg-success-900/20 dark:text-success-400 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> لینک بازیابی رمز به ایمیلتان ارسال شد
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline"
                >
                  {resetLoading ? 'در حال ارسال...' : 'فراموشی رمز عبور؟'}
                </button>
              </div>

              <Button type="submit" variant="primary" disabled={loading} className="w-full min-h-[44px] justify-center !bg-gradient-to-l !from-violet-600 !via-fuchsia-500 !to-sky-500 border-0 font-bold text-sm shadow-md shadow-violet-500/20">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>ورود به کلینیک <ArrowRight size={16} /></>}
              </Button>

              {/* بخش ورود محلی و آفلاین بر اساس نقش پرسنل */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {isOffline ? '🌐 اتصال آنلاین نیست — ورود محلی با نقش سازمانی:' : '⚡ ورود سریع پرسنل (دسترسی مستقیم):'}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { h.confirm(); signInOffline('owner', 'مصطفی حسن‌وند', 'mostafa.hasanvand@gmail.com') }}
                    className="min-h-[44px] p-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-all press-scale flex items-center justify-center gap-1.5"
                  >
                    👑 مدیر کلینیک
                  </button>
                  <button
                    type="button"
                    onClick={() => { h.confirm(); signInOffline('doctor', 'پزشک کلینیک') }}
                    className="min-h-[44px] p-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 transition-all press-scale flex items-center justify-center gap-1.5"
                  >
                    🩺 پزشک کلینیک
                  </button>
                  <button
                    type="button"
                    onClick={() => { h.confirm(); signInOffline('receptionist', 'پذیرش و منشی') }}
                    className="min-h-[44px] p-2 rounded-xl text-xs font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/30 transition-all press-scale flex items-center justify-center gap-1.5"
                  >
                    📋 پذیرش و منشی
                  </button>
                  <button
                    type="button"
                    onClick={() => { h.confirm(); signInOffline('assistant', 'دستیار دندانپزشک') }}
                    className="min-h-[44px] p-2 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30 transition-all press-scale flex items-center justify-center gap-1.5"
                  >
                    🥼 دستیار دندانپزشک
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">
          دسترسی نداری؟ با مدیر کلینیک تماس بگیر تا برایت حساب کاربری بسازد.
        </p>
      </div>
    </div>
  )
}
