// AppLockScreen.tsx — shown when the app-lock feature is enabled and
// the session is currently locked (on load, and after the app has
// been backgrounded). Tries biometric first if registered, always
// offers PIN as a working fallback.
import { useState, useEffect, useRef } from 'react'
import { Fingerprint, Delete } from 'lucide-react'
import { MinadentLogo } from './MinadentLogo'
import { verifyAppLockPin, hasBiometricRegistered, verifyBiometric } from '../lib/appLock'
import { h } from '../lib/haptics'

export function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [tryingBiometric, setTryingBiometric] = useState(false)
  const attemptedAutoBiometric = useRef(false)

  const tryBiometric = async () => {
    setTryingBiometric(true)
    const ok = await verifyBiometric()
    setTryingBiometric(false)
    if (ok) { h.success(); onUnlock() }
  }

  useEffect(() => {
    if (hasBiometricRegistered() && !attemptedAutoBiometric.current) {
      attemptedAutoBiometric.current = true
      tryBiometric()
    }
  }, [])

  useEffect(() => {
    if (pin.length !== 4) return
    verifyAppLockPin(pin).then((ok) => {
      if (ok) { h.success(); onUnlock() }
      else { h.error(); setError(true); setTimeout(() => { setPin(''); setError(false) }, 500) }
    })
  }, [pin])

  const press = (d: string) => { h.tap(); if (pin.length < 4) setPin((p) => p + d) }
  const backspace = () => { h.tap(); setPin((p) => p.slice(0, -1)) }

  return (
    <div className="fixed inset-0 z-[300] bg-white dark:bg-slate-900 flex flex-col items-center justify-center px-6" dir="rtl">
      <MinadentLogo size={56} />
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-4 mb-1">مینادنت قفل است</p>
      <p className="text-xs text-slate-400 mb-6">رمز ۴ رقمی را وارد کنید</p>

      <div className={`flex gap-3 mb-8 ${error ? 'animate-pulse' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 ${i < pin.length ? (error ? 'bg-error-500 border-error-500' : 'bg-primary-600 border-primary-600') : 'border-slate-300'}`} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)} className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-xl font-bold text-slate-700 dark:text-slate-200 mx-auto press-scale">{d}</button>
        ))}
        {hasBiometricRegistered() ? (
          <button onClick={tryBiometric} disabled={tryingBiometric} className="w-16 h-16 rounded-full flex items-center justify-center text-primary-600 mx-auto press-scale">
            <Fingerprint size={26} />
          </button>
        ) : <div />}
        <button onClick={() => press('0')} className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-xl font-bold text-slate-700 dark:text-slate-200 mx-auto press-scale">0</button>
        <button onClick={backspace} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400 mx-auto press-scale">
          <Delete size={22} />
        </button>
      </div>
    </div>
  )
}
