import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, Button, Input } from '../components/ui'
import { MinadentLogo } from '../components/MinadentLogo'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('ایمیل و رمز عبور را وارد کنید')
      return
    }
    setError('')
    setLoading(true)
    const { error: signInError } = await signIn(email.trim(), password)
    setLoading(false)
    if (signInError) setError(signInError)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <MinadentLogo size={56} className="mb-3" />
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">مینادنت</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">ورود به سیستم مدیریت کلینیک</p>
        </div>

        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="ایمیل" type="email" value={email} onChange={setEmail} placeholder="you@example.com" dir="ltr" />
            <Input label="رمز عبور" type="password" value={password} onChange={setPassword} placeholder="••••••••" dir="ltr" />

            {error && (
              <p className="text-sm text-error-600 bg-error-50 dark:bg-error-900/20 dark:text-error-400 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" variant="primary" disabled={loading} className="w-full justify-center">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'ورود'}
            </Button>
          </form>
        </Card>

        <p className="text-xs text-slate-400 text-center mt-4">
          دسترسی نداری؟ با مدیر کلینیک تماس بگیر تا برایت حساب کاربری بسازد.
        </p>
      </div>
    </div>
  )
}
