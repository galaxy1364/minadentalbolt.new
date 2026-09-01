import { useNavigate } from 'react-router-dom'
import { Wallet, CreditCard } from 'lucide-react'
import { formatCurrency } from '../lib/persianDate'
import { h } from '../lib/haptics'
import type { PatientBalance } from '../lib/finance'

/**
 * MOD-FEAT-027 | مانده‌ی بدهی، و راه رسیدن به پرداخت
 *
 * گزارش مهدی: «هرجا مانده بدهی رو نشون می‌ده، همون بالا گزینه داشته باشه
 * که میان‌بر بشه راحت پرداختش کرد.»
 *
 * Until now the debt was visible in three places — the patient list, the
 * patient record, the billing ledger — and reachable from none of them.
 * Seeing that someone owes five million and then having to navigate to a
 * different module, find them in a dropdown, and retype the amount is
 * three chances to pick the wrong patient or the wrong number.
 *
 * `Billing.tsx` has accepted `openPaymentForPatientId` and
 * `suggestedAmount` since MOD-FIX-008 — the receiving end was built and
 * nothing ever called it. This is the caller.
 *
 * One component rather than three placements written separately: the
 * amount shown and the amount prefilled must be the same number, and the
 * surest way to keep two numbers equal is to have only one.
 */

export interface PatientDebtBarProps {
  patientId: string
  balance: PatientBalance | undefined
  /** 'full' برای پرونده‌ی بیمار، 'compact' برای سطر فهرست. */
  variant?: 'full' | 'compact'
}

export function PatientDebtBar({ patientId, balance, variant = 'full' }: PatientDebtBarProps) {
  const navigate = useNavigate()
  const owed = balance?.balance ?? 0

  const goToPayment = (e: React.MouseEvent) => {
    // The row itself opens the patient; without this the shortcut would
    // do two things at once.
    e.stopPropagation()
    h.tap()
    navigate('/billing', {
      state: { openPaymentForPatientId: patientId, suggestedAmount: owed > 0 ? owed : undefined },
    })
  }

  // A settled patient gets no button. One that does nothing is worse than
  // none at all — it invites a payment nobody owes.
  if (owed <= 0) {
    if (variant === 'compact') return null
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success-50 dark:bg-success-900/20">
        <Wallet size={15} className="text-success-600 shrink-0" />
        <span className="text-xs font-medium text-success-700 dark:text-success-400">
          تسویه — مانده‌حساب صفر
        </span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={goToPayment}
        aria-label={`ثبت پرداخت — مانده ${formatCurrency(owed)} تومان`}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-[11px] font-bold shrink-0 press-scale"
      >
        <CreditCard size={12} />
        {formatCurrency(owed)} ت
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-error-50 dark:bg-error-900/20 border border-error-100 dark:border-error-800">
      <div className="min-w-0">
        <p className="text-[11px] text-error-600 dark:text-error-400">مانده‌حساب</p>
        <p className="text-sm font-bold text-error-700 dark:text-error-300">
          {formatCurrency(owed)} تومان
        </p>
        {/* The two halves of the balance, so the number above can be
            checked rather than trusted. */}
        {balance && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            هزینه {formatCurrency(balance.totalCost)} — پرداختی {formatCurrency(balance.paid)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={goToPayment}
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold press-scale"
      >
        <CreditCard size={14} />
        ثبت پرداخت
      </button>
    </div>
  )
}

export default PatientDebtBar
