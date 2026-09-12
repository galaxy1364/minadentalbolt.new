import { useMemo } from 'react'
import {
  CreditCard,
  Banknote,
  ShieldAlert,
  CalendarClock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  Lock,
} from 'lucide-react'
import { formatCurrency, toJalaliStringPretty, toPersianDigits } from '../lib/persianDate'
import { calcPatientBalance } from '../lib/finance'
import { resolveAttribution } from '../lib/paymentAttribution'
import { summariseCheques, type ChequeLike } from '../lib/chequeSummary'
import { PatientDebtBar } from './PatientDebtBar'
import { h } from '../lib/haptics'
import { useOptionalAuth } from '../lib/auth'
import { canEditFinancialPrice } from '../lib/permissions'
import type { Payment, Treatment, Doctor, ImplantCase, PaymentPlan, Installment } from '../types'

export interface PatientFinanceOverviewProps {
  patientId: string
  patientName: string
  payments: Payment[]
  treatments: Treatment[]
  doctors: Doctor[]
  implantCases?: ImplantCase[]
  cheques?: ChequeLike[]
  paymentPlans?: PaymentPlan[]
  installments?: Installment[]
  userRole?: string | null
  onAddPayment?: () => void
  onAddCheque?: () => void
  onAddPlan?: () => void
  onPayInstallment?: (installment: Installment, plan: PaymentPlan) => void
  onClearCheque?: (cheque: ChequeLike) => void
  onBounceCheque?: (cheque: ChequeLike) => void
}

export function PatientFinanceOverview({
  patientId,
  patientName,
  payments,
  treatments,
  doctors,
  implantCases = [],
  cheques = [],
  paymentPlans = [],
  installments = [],
  userRole,
  onAddPayment,
  onAddCheque,
  onAddPlan,
  onPayInstallment,
  onClearCheque,
  onBounceCheque,
}: PatientFinanceOverviewProps) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const mine = useMemo(
    () =>
      payments
        .filter((p) => p.patient_id === patientId)
        .sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date))),
    [payments, patientId],
  )

  const balance = useMemo(
    () =>
      calcPatientBalance(
        payments.filter((p) => p.patient_id === patientId),
        treatments.filter((t) => t.patient_id === patientId),
        implantCases.filter((c) => c.patient_id === patientId),
      ),
    [payments, treatments, implantCases, patientId],
  )

  const chq = useMemo(() => summariseCheques(cheques, patientId), [cheques, patientId])
  const myCheques = useMemo(
    () => cheques.filter((c) => c.patient_id === patientId),
    [cheques, patientId],
  )

  const myPlans = useMemo(
    () => paymentPlans.filter((p) => p.patient_id === patientId),
    [paymentPlans, patientId],
  )

  const myInstallments = useMemo(
    () =>
      installments
        .filter((i) => i.patient_id === patientId)
        .sort((a, b) => a.installment_number - b.installment_number),
    [installments, patientId],
  )

  const auth = useOptionalAuth()
  const activeRole = userRole !== undefined ? userRole : auth?.profile?.role
  const canEdit = canEditFinancialPrice(activeRole)

  return (
    <div className="space-y-4" dir="rtl">
      {/* ── Header & Quick Action Buttons ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{patientName}</p>
            <p className="text-[11px] text-slate-500">مدیریت مالی، چک‌ها و طرح اقساط</p>
          </div>
          {!canEdit && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/60"
              title="تعرفه‌ها و مبالغ ثبت‌شده فقط توسط مدیر کلینیک قابل تغییر و ویرایش هستند."
            >
              <Lock size={11} />
              <span>ویرایش قیمت: فقط مدیر</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {onAddPayment && (
            <button
              onClick={() => {
                h.tap()
                onAddPayment()
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all-smooth shadow-sm"
            >
              <Plus size={13} />
              <span>ثبت پرداخت</span>
            </button>
          )}

          {onAddCheque && (
            <button
              onClick={() => {
                h.tap()
                onAddCheque()
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all-smooth shadow-sm"
            >
              <Banknote size={13} />
              <span>ثبت چک</span>
            </button>
          )}

          {onAddPlan && (
            <button
              onClick={() => {
                h.tap()
                onAddPlan()
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-bold transition-all-smooth shadow-sm"
            >
              <CalendarClock size={13} />
              <span>طرح اقساط</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Balance / Debt Bar ──────────────────────────────────── */}
      <PatientDebtBar patientId={patientId} balance={balance} />

      {/* ── طرح‌های اقساط بیمار (Installment Plans) ────────────────── */}
      {myPlans.length > 0 && (
        <section className="space-y-2.5">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            <CalendarClock size={14} className="text-violet-500" />
            <span>طرح‌های اقساط فعال ({toPersianDigits(myPlans.length)})</span>
          </h4>

          {myPlans.map((plan) => {
            const planInsts = myInstallments.filter((i) => i.payment_plan_id === plan.id)
            const paidCount = planInsts.filter((i) => i.status === 'paid').length
            const totalCount = planInsts.length || plan.installment_count
            const percentPaid = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0
            const isAllPaid = paidCount === totalCount && totalCount > 0

            return (
              <div
                key={plan.id}
                className="p-3.5 rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/30 dark:bg-violet-950/20 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        مبلغ کل: {formatCurrency(plan.total_amount)} ت
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isAllPaid
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                        }`}
                      >
                        {isAllPaid ? 'تسویه کامل' : 'در حال پرداخت'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      شروع: {toJalaliStringPretty(plan.start_date)} · {toPersianDigits(totalCount)} قسط
                    </p>
                  </div>

                  <div className="text-left">
                    <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
                      {toPersianDigits(paidCount)} از {toPersianDigits(totalCount)} قسط
                    </span>
                    <p className="text-[10px] text-slate-400">({toPersianDigits(percentPaid)}٪ پرداخت شده)</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-violet-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentPaid}%` }}
                  />
                </div>

                {/* Installments Table / List */}
                <div className="space-y-1.5 pt-1">
                  {planInsts.map((inst) => {
                    const isPaid = inst.status === 'paid'
                    const isOverdue = !isPaid && inst.due_date < todayStr
                    const isDueToday = !isPaid && inst.due_date === todayStr

                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                          isPaid
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-300'
                            : isOverdue
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-900/40'
                            : isDueToday
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/40'
                            : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-[11px] shrink-0">
                            قسط {toPersianDigits(inst.installment_number)}:
                          </span>
                          <span className="font-bold">{formatCurrency(inst.amount)} ت</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            (سررسید: {toJalaliStringPretty(inst.due_date)})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPaid ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={12} />
                              پرداخت شده
                            </span>
                          ) : (
                            <>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  isOverdue
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200'
                                    : isDueToday
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {isOverdue ? 'معوق' : isDueToday ? 'سررسید امروز' : 'در انتظار'}
                              </span>

                              {onPayInstallment && (
                                <button
                                  onClick={() => {
                                    h.tap()
                                    onPayInstallment(inst, plan)
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-600 hover:bg-violet-700 active:scale-95 text-white transition-all-smooth shadow-sm"
                                >
                                  ثبت پرداخت
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* ── چک‌ها (Cheques) ─────────────────────────────────────── */}
      {myCheques.length > 0 && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Banknote size={14} className="text-amber-500" />
            <span>چک‌های بیمار ({toPersianDigits(myCheques.length)})</span>
          </h4>

          <div className="space-y-1.5">
            {myCheques.map((c) => {
              const isBounced = c.status === 'bounced'
              const isCleared = c.status === 'cleared'
              const isOverdue = !isCleared && !isBounced && c.due_date < todayStr
              const isDueToday = !isCleared && !isBounced && c.due_date === todayStr

              return (
                <div
                  key={c.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-2xl border transition-colors ${
                    isBounced
                      ? 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
                      : isCleared
                      ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60'
                      : isOverdue
                      ? 'bg-amber-50/40 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {formatCurrency(c.amount)} ت
                      </p>
                      {c.purpose === 'guarantee' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-medium">
                          ضمانت
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isBounced
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                            : isCleared
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : isOverdue
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                        }`}
                      >
                        {isBounced
                          ? 'برگشتی'
                          : isCleared
                          ? 'وصول شد'
                          : isOverdue
                          ? 'سررسید گذشته'
                          : isDueToday
                          ? 'سررسید امروز'
                          : 'در انتظار وصول'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {c.bank_name ? `${c.bank_name} · ` : ''}
                      {c.cheque_number ? `شماره ${c.cheque_number} · ` : ''}
                      سررسید: {toJalaliStringPretty(c.due_date)}
                      {c.purpose === 'guarantee' && !c.payment_plan_id && ' · بدون طرح قسطی'}
                    </p>
                  </div>

                  {/* Actions on Cheque */}
                  {!isCleared && (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {onClearCheque && (
                        <button
                          onClick={() => {
                            h.confirm()
                            onClearCheque(c)
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all-smooth shadow-sm"
                        >
                          ثبت وصول
                        </button>
                      )}

                      {!isBounced && onBounceCheque && (
                        <button
                          onClick={() => {
                            h.error()
                            onBounceCheque(c)
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-300 transition-colors"
                        >
                          برگشت
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── تاریخچه‌ی پرداخت (Payments History) ──────────────────── */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
          <CreditCard size={14} className="text-emerald-500" />
          <span>تاریخچه‌ی پرداخت‌ها ({toPersianDigits(mine.length)})</span>
        </h4>

        {mine.length === 0 ? (
          <p className="text-xs text-slate-500 px-3 py-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            هنوز پرداختی ثبت نشده
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5">
            {mine.map((p) => {
              const a = resolveAttribution(p as never, treatments as never, doctors as never)
              return (
                <div key={p.id} className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {formatCurrency(p.amount)} ت
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                        p.status === 'cancelled'
                          ? 'bg-slate-200 text-slate-500'
                          : p.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {p.status === 'cancelled' ? 'لغو شده' : p.status === 'completed' ? 'تکمیل شده' : 'در انتظار'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {toJalaliStringPretty(p.payment_date)}
                    {p.payment_method && ` · ${p.payment_method === 'cash' ? 'نقدی' : p.payment_method === 'card' ? 'کارتخوان' : p.payment_method === 'cheque' ? 'چک' : p.payment_method}`}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{a.label}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Warnings & Notes ──────────────────────────────────── */}
      {mine.some((p) => p.status === 'pending') && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
          <Clock size={13} className="shrink-0 mt-0.5" />
          <span>پرداخت «در انتظار» هنوز تکمیل نشده و در مانده‌حساب بیمار اثر دارد.</span>
        </p>
      )}

      {chq.guaranteeWithoutPlan > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] text-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <ShieldAlert size={13} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            {toPersianDigits(chq.guaranteeWithoutPlan)} چک ضمانت بدون طرح قسطی ثبت شده است — تا اقساط
            تعریف نشود، برنامه‌ی وصولی ندارد.
          </span>
        </p>
      )}
    </div>
  )
}

export default PatientFinanceOverview
