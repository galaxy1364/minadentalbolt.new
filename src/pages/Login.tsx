import { useState } from 'react'
import { Loader2, Mail, Phone, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui'
import { MinadentLogo } from '../components/MinadentLogo'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

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
  const { signIn, notice } = useAuth()
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
      if (!email.trim()) { setError('ایمیل را وارد کنید'); return }
      identifier = email.trim()
    } else {
      const normalized = normalizeIranPhone(phone)
      if (!normalized) { setError('شماره موبایل معتبر نیست (مثال: 0912xxxxxxx)'); return }
      identifier = normalized
    }
    if (!password) { setError('رمز عبور را وارد کنید'); return }

    setLoading(true)
    const { error: signInError } = await signIn(identifier, password)
    setLoading(false)
    if (signInError) setError(signInError)
  }

  const handleForgotPassword = async () => {
    setError('')
    if (mode === 'phone') {
      setError('بازیابی رمز فقط برای حساب‌های ایمیلی فعال است — برای شماره موبایل با مدیر کلینیک تماس بگیرید')
      return
    }
    if (!email.trim()) { setError('ابتدا ایمیل خود را وارد کنید'); return }
    setResetLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim())
    setResetLoading(false)
    if (resetError) setError('خطا در ارسال ایمیل بازیابی')
    else setResetSent(true)
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
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3 rounded-3xl p-[2px] bg-gradient-to-br from-violet-400 via-fuchsia-400 to-sky-400">
            <div className="bg-slate-950 rounded-[22px] p-2.5">
              <MinadentLogo size={44} />
            </div>
          </div>
          <h1 className="text-xl font-extrabold text-white">مینادنت</h1>
          <p className="text-sm text-slate-300">ورود به سیستم مدیریت کلینیک</p>
        </div>

        <div className="rounded-3xl p-[1.5px] bg-gradient-to-br from-violet-400/60 via-fuchsia-400/40 to-sky-400/60">
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-5">

            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              <button
                type="button"
                onClick={() => { setMode('email'); setError(''); setResetSent(false) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'email' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Mail size={15} /> ایمیل
              </button>
              <button
                type="button"
                onClick={() => { setMode('phone'); setError(''); setResetSent(false) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  mode === 'phone' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Phone size={15} /> موبایل ایران
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'email' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">ایمیل</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    dir="ltr"
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">شماره موبایل</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912xxxxxxx"
                    dir="ltr"
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">رمز عبور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {error && (
                <p className="text-sm text-error-600 bg-error-50 dark:bg-error-900/20 dark:text-error-400 rounded-lg px-3 py-2">{error}</p>
              )}
              {/* MOD-FIX-009: a session that ended for a reason other than
                  a bad password used to end in silence — the login screen
                  simply came back. Shown separately from `error` because
                  it survives across the sign-out that produced it. */}
              {notice && !error && (
                <p className="text-sm text-warning-700 bg-warning-50 dark:bg-warning-900/20 dark:text-warning-400 rounded-lg px-3 py-2">{notice}</p>
              )}
              {resetSent && (
                <p className="text-sm text-success-700 bg-success-50 dark:bg-success-900/20 dark:text-success-400 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> لینک بازیابی رمز به ایمیلتان ارسال شد
                </p>
              )}

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {resetLoading ? 'در حال ارسال...' : 'فراموشی رمز عبور؟'}
              </button>

              <Button type="submit" variant="primary" disabled={loading} className="w-full justify-center !bg-gradient-to-l !from-violet-600 !via-fuchsia-500 !to-sky-500 border-0">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>ورود <ArrowRight size={16} /></>}
              </Button>
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
