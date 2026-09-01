import { useMemo } from 'react'
import { CreditCard, Banknote, ShieldAlert, CalendarClock } from 'lucide-react'
import { formatCurrency, toJalaliStringPretty, toPersianDigits } from '../lib/persianDate'
import { calcPatientBalance } from '../lib/finance'
import { resolveAttribution } from '../lib/paymentAttribution'
import { summariseCheques, type ChequeLike } from '../lib/chequeSummary'
import { PatientDebtBar } from './PatientDebtBar'
import type { Payment, Treatment, Doctor, ImplantCase } from '../types'

/**
 * MOD-FEAT-031 | نمای کلی مالی یک بیمار
 *
 * گزارش مهدی: «وقتی کلیک کنیم، کل پرداختی‌ها، تاریخش، بابت چه دندونی،
 * کدوم دکتر — همه اونا تو تاریخچه‌ی این قسمت وجود داشته باشه. نمای کلی
 * کل پرداخت‌ها و چک‌هاشون هم نشون بده.»
 *
 * The pieces all existed and none of them were ever shown together.
 * `calcPatientBalance` knew the balance, `resolveAttribution` knew which
 * tooth and which doctor a payment was for, `summariseCheques` knew what
 * was in flight — but a receptionist holding a patient's money had to
 * visit three screens and hold the total in their head.
 *
 * Assembled from those same functions rather than recomputed. A second
 * calculation of a balance is a second number that can disagree with the
 * first, and in this app the first one is already on screen a few pixels
 * above.
 */

export interface PatientFinanceOverviewProps {
  patientId: string
  patientName: string
  payments: Payment[]
  treatments: Treatment[]
  doctors: Doctor[]
  implantCases?: ImplantCase[]
  cheques?: ChequeLike[]
}

export function PatientFinanceOverview({
  patientId, patientName, payments, treatments, doctors, implantCases = [], cheques = [],
}: PatientFinanceOverviewProps) {
  const mine = useMemo(
    () => payments
      .filter((p) => p.patient_id === patientId)
      // Newest first: the question being asked is almost always about the
      // most recent payment, not the oldest.
      .sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date))),
    [payments, patientId],
  )

  const balance = useMemo(
    () => calcPatientBalance(
      payments.filter((p) => p.patient_id === patientId),
      treatments.filter((t) => t.patient_id === patientId),
      implantCases.filter((c) => c.patient_id === patientId),
    ),
    [payments, treatments, implantCases, patientId],
  )

  const chq = useMemo(() => summariseCheques(cheques, patientId), [cheques, patientId])
  const myCheques = useMemo(() => cheques.filter((c) => c.patient_id === patientId), [cheques, patientId])

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{patientName}</p>
        <p className="text-[11px] text-slate-500">نمای کلی مالی</p>
      </div>

      <PatientDebtBar patientId={patientId} balance={balance} />

      {/* ── چک‌ها ─────────────────────────────────────────────── */}
      {chq.hasAny && (
        <section>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
            <Banknote size={14} /> چک‌ها ({toPersianDigits(myCheques.length)})
          </h4>
          <div className="space-y-1.5">
            {myCheques.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {formatCurrency(c.amount)} ت
                    {c.purpose === 'guarantee' && (
                      <span className="mr-1.5 text-[10px] font-normal text-slate-500">ضمانت</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    سررسید {toJalaliStringPretty(c.due_date)}
                    {/* Collateral with no schedule is collateral nobody is
                        collecting on — worth saying here too, not only in
                        the summary row. */}
                    {c.purpose === 'guarantee' && !c.payment_plan_id && ' · بدون طرح قسطی'}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                  c.status === 'bounced' ? 'bg-error-100 text-error-700'
                    : c.status === 'cleared' ? 'bg-success-100 text-success-700'
                    : 'bg-warning-100 text-warning-700'
                }`}>
                  {c.status === 'bounced' ? 'برگشتی' : c.status === 'cleared' ? 'پاس شد' : 'در جریان'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── تاریخچه‌ی پرداخت ──────────────────────────────────── */}
      <section>
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
          <CreditCard size={14} /> تاریخچه‌ی پرداخت ({toPersianDigits(mine.length)})
        </h4>

        {mine.length === 0 ? (
          <p className="text-xs text-slate-500 px-3 py-4 text-center">هنوز پرداختی ثبت نشده</p>
        ) : (
          <div className="space-y-1.5">
            {mine.map((p) => {
              // The tooth and the doctor come from the same resolver the
              // payment list and the receipt use, so all three agree.
              const a = resolveAttribution(p as never, treatments as never, doctors as never)
              return (
                <div key={p.id} className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {formatCurrency(p.amount)} ت
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                      p.status === 'cancelled' ? 'bg-slate-200 text-slate-500'
                        : p.status === 'completed' ? 'bg-success-100 text-success-700'
                        : 'bg-warning-100 text-warning-700'
                    }`}>
                      {p.status === 'cancelled' ? 'لغو شده' : p.status === 'completed' ? 'تکمیل شده' : 'در انتظار'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {toJalaliStringPretty(p.payment_date)}
                    {p.payment_method && ` · ${p.payment_method}`}
                  </p>
                  {/* «بابت مشخص نشده» is information, not noise: it marks
                      exactly which rows still need a human to say what they
                      were for. */}
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{a.label}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {mine.some((p) => p.status === 'pending') && (
        <p className="flex items-start gap-1.5 text-[11px] text-warning-700 bg-warning-50 px-2.5 py-2 rounded-lg">
          <CalendarClock size={12} className="shrink-0 mt-0.5" />
          <span>پرداخت «در انتظار» هنوز تکمیل نشده و در مانده‌حساب اثر دارد.</span>
        </p>
      )}

      {chq.guaranteeWithoutPlan > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] text-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-2 rounded-lg">
          <ShieldAlert size={12} className="shrink-0 mt-0.5" />
          <span>{toPersianDigits(chq.guaranteeWithoutPlan)} چک ضمانت بدون طرح قسطی — تا اقساط تعریف نشود، برنامه‌ی وصولی ندارد.</span>
        </p>
      )}
    </div>
  )
}

export default PatientFinanceOverview
