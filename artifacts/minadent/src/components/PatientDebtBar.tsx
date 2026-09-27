import { useNavigate } from 'react-router-dom'
import { Wallet, CreditCard, Banknote, ShieldAlert } from 'lucide-react'
import { formatCurrency, toPersianDigits } from '../lib/persianDate'
import { h } from '../lib/haptics'
import { chimes } from '../lib/chimes'
import type { PatientBalance } from '../lib/finance'
import { summariseCheques, type ChequeLike } from '../lib/chequeSummary'
import { toJalaliStringPretty } from '../lib/persianDate'

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
  familyBalance?: PatientBalance | undefined
  /** 'full' برای پرونده‌ی بیمار، 'compact' برای سطر فهرست. */
  variant?: 'full' | 'compact'
  /**
   * چک‌های بیمار، اگر صفحه آن‌ها را دارد.
   *
   * A balance of five million means something very different when two
   * million of it is sitting in a cheque dated next month. The number
   * alone cannot say that, so the cheques are shown beside it rather
   * than folded into it — the arithmetic stays exactly as it was.
   */
  cheques?: ChequeLike[]
}

export function PatientDebtBar({ patientId, balance, familyBalance, variant = 'full', cheques }: PatientDebtBarProps) {
  const navigate = useNavigate()
  const owed = balance?.balance ?? 0
  const familyOwed = familyBalance?.balance ?? 0
  const chq = cheques ? summariseCheques(cheques, patientId) : null

  const goToPayment = (e: React.MouseEvent) => {
    // The row itself opens the patient; without this the shortcut would
    // do two things at once.
    e.stopPropagation()
    chimes.playPop()
    h.tap()
    navigate('/billing', {
      state: { openPaymentForPatientId: patientId, suggestedAmount: owed > 0 ? owed : undefined },
    })
  }

  // A settled patient gets no button. One that does nothing is worse than
  // none at all — it invites a payment nobody owes.
  if (owed <= 0 && familyOwed <= 0) {
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
        className="flex flex-col items-end gap-0.5 px-2 py-1 rounded-lg bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 text-[11px] font-bold shrink-0 press-scale"
      >
        <div className="flex items-center gap-1">
          <CreditCard size={12} />
          {formatCurrency(owed)} ت
        </div>
        {familyOwed > 0 && familyOwed !== owed && (
          <span className="text-[9px] text-error-500 opacity-80 font-normal">خانواده: {formatCurrency(familyOwed)} ت</span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {owed > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-error-50 dark:bg-error-900/20 border border-error-100 dark:border-error-800">
          <div className="min-w-0">
            <p className="text-[11px] text-error-600 dark:text-error-400">مانده‌حساب شخصی</p>
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
      )}
      
      {familyOwed > 0 && familyOwed !== owed && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-100 dark:border-warning-800">
          <div className="min-w-0">
            <p className="text-[11px] text-warning-700 dark:text-warning-400">مانده‌حساب خانواده</p>
            <p className="text-sm font-bold text-warning-800 dark:text-warning-300">
              {formatCurrency(familyOwed)} تومان
            </p>
            {familyBalance && (
              <p className="text-[10px] text-warning-600/80 mt-0.5">
                مجموع هزینه {formatCurrency(familyBalance.totalCost)} — مجموع پرداختی {formatCurrency(familyBalance.paid)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * چک‌های بیمار — بدون دست زدن به عدد مانده.
 *
 * Shown as separate rows rather than merged into the balance because a
 * cheque that has not cleared is still debt, exactly as Mehdi defined
 * it. What changes is that the person looking can now see *why* the
 * number is what it is, and when it is likely to move.
 */
export function PatientChequeRows({ patientId, cheques }: { patientId: string; cheques: ChequeLike[] }) {
  const navigate = useNavigate()
  const s = summariseCheques(cheques, patientId)
  if (!s.hasAny) return null

  const open = () => {
    chimes.playPop()
    h.tap()
    navigate('/billing', { state: { openChequesForPatientId: patientId } })
  }

  return (
    <div className="mt-2 space-y-1.5">
      {s.inFlight.count > 0 && (
        <button type="button" onClick={open} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-warning-50 dark:bg-warning-900/20 text-right press-scale">
          <Banknote size={14} className="text-warning-600 shrink-0" />
          <span className="text-[11px] text-warning-800 dark:text-warning-300">
            {toPersianDigits(s.inFlight.count)} چک در جریان — {formatCurrency(s.inFlight.total)} ت
            {s.inFlight.nextDue && ` · نزدیک‌ترین سررسید ${toJalaliStringPretty(s.inFlight.nextDue)}`}
          </span>
        </button>
      )}

      {s.guarantee.count > 0 && (
        <button type="button" onClick={open} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-right press-scale">
          <ShieldAlert size={14} className="text-slate-500 shrink-0" />
          <span className="text-[11px] text-slate-700 dark:text-slate-300">
            {toPersianDigits(s.guarantee.count)} چک ضمانت — {formatCurrency(s.guarantee.total)} ت
            {/* Collateral with no schedule behind it is collateral nobody
                is collecting on. Taking the cheque is only half the act. */}
            {s.guaranteeWithoutPlan > 0 && ' · بدون طرح قسطی'}
          </span>
        </button>
      )}

      {s.bounced.count > 0 && (
        <button type="button" onClick={open} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-error-100 dark:bg-error-900/30 text-right press-scale">
          <ShieldAlert size={14} className="text-error-600 shrink-0" />
          <span className="text-[11px] font-bold text-error-700 dark:text-error-300">
            {toPersianDigits(s.bounced.count)} چک برگشتی — {formatCurrency(s.bounced.total)} ت
          </span>
        </button>
      )}
    </div>
  )
}

export default PatientDebtBar
