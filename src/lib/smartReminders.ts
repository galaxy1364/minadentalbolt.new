import type { Patient, Encounter, Payment, Installment, AppointmentWithRelations, Treatment, Cheque, ImplantCase, LabOrder } from '../types'
import { toPersianDigits, formatCurrency } from './persianDate'
import { calcAllPatientBalances } from './finance'
import { nextImplantAction } from './implantMilestones'
import { daysUntilDue } from './labClinicMilestones'

export type ReminderCategory =
  | 'birthday'
  | 'debtor'
  | 'lapsed'
  | 'installment_due'
  | 'no_show'
  | 'unfinished_treatment'
  | 'unresolved_appointment'
  | 'cheque_due'
  | 'implant_stage_due'
  | 'lab_overdue'

export interface SmartReminder {
  id?: string
  category: ReminderCategory
  patient: Patient
  title: string
  detail: string
  smsMessage: string
  priority: number // higher = more urgent, for sorting within a category
  actionPath?: string
  extraInfo?: string
  dueDate?: string
  patientName?: string
  actionNeeded?: string
  urgency?: 'urgent' | 'high' | 'medium' | 'low'
}

const MS_PER_DAY = 86400000

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY)
}

export function toIsoDate(d: Date | string = new Date()): string {
  if (typeof d === 'string') {
    return d.slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

export function toDateObj(d: Date | string = new Date()): Date {
  if (d instanceof Date) return d
  return new Date(d)
}

/** Patients whose birthday (month + day) is today. */
export function findBirthdays(patients: Patient[], today = new Date()): SmartReminder[] {
  const m = today.getMonth()
  const d = today.getDate()
  return patients
    .filter((p) => p.is_active && p.birth_date)
    .filter((p) => {
      const bd = new Date(p.birth_date as string)
      return bd.getMonth() === m && bd.getDate() === d
    })
    .map((p) => ({
      category: 'birthday' as const,
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: 'امروز تولد این بیمار است 🎂',
      smsMessage: `${p.first_name} عزیز، تولدتان مبارک! کلینیک مینادنت 🎉`,
      priority: 1,
    }))
}

/**
 * Patients with an outstanding balance above `minBalance`, sorted by
 * amount owed (largest debtor first).
 */
export function findDebtors(
  patients: Patient[],
  treatments: Treatment[],
  payments: Payment[],
  implantCases: { patient_id: string; total_cost: number | null; paid_amount: number | null }[] = [],
  minBalance = 500000,
): SmartReminder[] {
  const { byPatient } = calcAllPatientBalances(payments, treatments, implantCases)
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const result: SmartReminder[] = []
  for (const [patientId, fin] of byPatient) {
    if (fin.balance < minBalance) continue
    const p = patientMap.get(patientId)
    if (!p || !p.is_active) continue
    result.push({
      category: 'debtor',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: `${fin.balance.toLocaleString('fa-IR')} تومان بدهی`,
      smsMessage: `${p.first_name} عزیز، مانده حساب شما نزد کلینیک مینادنت ${fin.balance.toLocaleString('fa-IR')} تومان است. لطفاً برای تسویه اقدام فرمایید.`,
      priority: fin.balance,
    })
  }
  return result.sort((a, b) => b.priority - a.priority)
}

/**
 * Patients who haven't had an encounter in `lapsedDays` (default ~6 months)
 * but have visited before — good recall/win-back candidates.
 */
export function findLapsedPatients(
  patients: Patient[],
  encounters: Encounter[],
  lapsedDays = 180,
): SmartReminder[] {
  const lastVisitByPatient = new Map<string, string>()
  for (const e of encounters) {
    const prev = lastVisitByPatient.get(e.patient_id)
    if (!prev || e.encounter_date > prev) lastVisitByPatient.set(e.patient_id, e.encounter_date)
  }
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const result: SmartReminder[] = []
  for (const [patientId, lastVisit] of lastVisitByPatient) {
    const days = daysSince(lastVisit)
    if (days < lapsedDays) continue
    const p = patientMap.get(patientId)
    if (!p || !p.is_active) continue
    result.push({
      category: 'lapsed',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: `${Math.floor(days / 30)} ماه است مراجعه نکرده`,
      smsMessage: `${p.first_name} عزیز، مدتی است به کلینیک مینادنت مراجعه نکرده‌اید. برای وقت ویزیت با ما تماس بگیرید.`,
      priority: days,
    })
  }
  return result.sort((a, b) => b.priority - a.priority)
}

/** Installments due today or overdue. */
export function findDueInstallments(
  installments: Installment[],
  patients: Patient[],
  today: Date | string = new Date(),
): SmartReminder[] {
  const todayStr = toIsoDate(today)
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const result: SmartReminder[] = []
  for (const i of installments) {
    if (i.status === 'paid' || i.due_date > todayStr) continue
    const p = patientMap.get(i.patient_id)
    if (!p) continue
    const overdueDays = daysSince(i.due_date)
    result.push({
      id: `installment-${i.id}`,
      category: 'installment_due',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: overdueDays > 0 ? `قسط ${toPersianDigits(overdueDays)} روز عقب افتاده — ${formatCurrency(i.amount)} ت` : `قسط امروز — ${formatCurrency(i.amount)} ت`,
      smsMessage: `${p.first_name} عزیز، قسط ${formatCurrency(i.amount)} تومانی شما نزد کلینیک مینادنت سررسید شده است.`,
      priority: overdueDays > 0 ? 120000 + (overdueDays * 1000) : 95000,
      actionPath: '/billing',
      dueDate: i.due_date,
    })
  }
  return result.sort((a, b) => b.priority - a.priority)
}

export const REMINDER_CATEGORY_META: Record<ReminderCategory, { label: string; icon: string; color: string }> = {
  birthday: { label: 'تولد امروز', icon: '🎂', color: '#ec4899' },
  debtor: { label: 'بدهکاران', icon: '💰', color: '#ef4444' },
  lapsed: { label: 'مراجعه‌نکرده‌ها', icon: '⏰', color: '#f59e0b' },
  installment_due: { label: 'اقساط سررسید', icon: '📅', color: '#8b5cf6' },
  no_show: { label: 'غیبت از نوبت', icon: '🚫', color: '#dc2626' },
  unfinished_treatment: { label: 'درمان ناتمام بدون نوبت بعدی', icon: '🦷', color: '#0891b2' },
  unresolved_appointment: { label: 'نوبت بدون وضعیت نهایی', icon: '❓', color: '#64748b' },
  cheque_due: { label: 'چک سررسید و برگشتی', icon: '🧾', color: '#ea580c' },
  implant_stage_due: { label: 'مرحله ایمپلنت', icon: '🔩', color: '#0284c7' },
  lab_overdue: { label: 'سفارش لابراتوار', icon: '🔬', color: '#9333ea' },
}

/**
 * Appointments whose time has already passed but are still sitting on
 * 'scheduled'/'confirmed' — nobody closed them out (تکمیل/غیبت/لغو).
 * This matters beyond tidiness: findNoShows() only works if a missed
 * visit actually gets marked 'no_show', and an unclosed slot also
 * silently blocks that time from ever being correctly reported as
 * free or attended in any statistics.
 */
export function findUnresolvedPastAppointments(
  appointments: AppointmentWithRelations[],
  patients: Patient[],
  today = new Date(),
): SmartReminder[] {
  const todayStr = today.toISOString().slice(0, 10)
  const nowTime = today.toTimeString().slice(0, 5)
  const patientMap = new Map(patients.map((p) => [p.id, p]))

  const result: SmartReminder[] = []
  for (const a of appointments) {
    const isPast = a.date < todayStr || (a.date === todayStr && a.end_time < nowTime)
    if (!isPast) continue
    if (a.status !== 'scheduled' && a.status !== 'confirmed') continue
    const p = patientMap.get(a.patient_id) || a.patient
    if (!p || !p.is_active) continue
    result.push({
      category: 'unresolved_appointment',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: a.date === todayStr ? `نوبت امروز ساعت ${a.start_time} هنوز بسته نشده` : `نوبت گذشته (${a.date}) هنوز بسته نشده`,
      smsMessage: '',
      priority: daysSince(a.date),
    })
  }
  return result.sort((a, b) => b.priority - a.priority)
}

/**
 * The clinical continuity gap: a patient is mid-treatment-plan (a
 * treatment row is 'planned' or 'in_progress' — root canal not finished,
 * crown not seated yet, etc.) but has no future appointment booked. This
 * is exactly how patients silently fall through the cracks in a real
 * practice — the file just goes quiet with an open clinical obligation.
 */
export function findUnfinishedTreatmentFollowups(
  treatments: Treatment[],
  appointments: AppointmentWithRelations[],
  patients: Patient[],
  today = new Date(),
): SmartReminder[] {
  const todayStr = today.toISOString().slice(0, 10)
  const patientMap = new Map(patients.map((p) => [p.id, p]))

  const hasFutureAppt = new Set<string>()
  for (const a of appointments) {
    if (a.date >= todayStr && a.status !== 'cancelled') hasFutureAppt.add(a.patient_id)
  }

  const openByPatient = new Map<string, { count: number; latest: string }>()
  for (const t of treatments) {
    if (t.status !== 'planned' && t.status !== 'in_progress') continue
    const prev = openByPatient.get(t.patient_id)
    const entry = { count: (prev?.count ?? 0) + 1, latest: t.updated_at > (prev?.latest ?? '') ? t.updated_at : (prev?.latest ?? t.updated_at) }
    openByPatient.set(t.patient_id, entry)
  }

  const result: SmartReminder[] = []
  for (const [patientId, info] of openByPatient) {
    if (hasFutureAppt.has(patientId)) continue
    const p = patientMap.get(patientId)
    if (!p || !p.is_active) continue
    result.push({
      category: 'unfinished_treatment',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: `${toPersianDigits(info.count)} مرحله‌ی درمان ناتمام — نوبت بعدی رزرو نشده`,
      smsMessage: `${p.first_name} عزیز، طرح درمان شما در کلینیک مینادنت هنوز کامل نشده. برای هماهنگی نوبت بعدی تماس بگیرید.`,
      priority: daysSince(info.latest),
    })
  }
  return result.sort((a, b) => b.priority - a.priority)
}

/**
 * Patients who missed a recent appointment (status = 'no_show') without a
 * follow-up booking after it — a Labkhand-style "غیبت‌کننده‌ها" list, so
 * staff can proactively call and rebook instead of silently losing the
 * patient.
 */
export function findNoShows(
  appointments: AppointmentWithRelations[],
  patients: Patient[],
  lookbackDays = 30,
): SmartReminder[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - lookbackDays)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const patientMap = new Map(patients.map((p) => [p.id, p]))

  // Only the most recent no_show per patient, and only if they have no
  // appointment booked after it (i.e. genuinely un-rebooked).
  const latestNoShowByPatient = new Map<string, AppointmentWithRelations>()
  const latestApptByPatient = new Map<string, string>()
  for (const a of appointments) {
    const prevLatest = latestApptByPatient.get(a.patient_id)
    if (!prevLatest || a.date > prevLatest) latestApptByPatient.set(a.patient_id, a.date)
    if (a.status === 'no_show' && a.date >= cutoffStr) {
      const prev = latestNoShowByPatient.get(a.patient_id)
      if (!prev || a.date > prev.date) latestNoShowByPatient.set(a.patient_id, a)
    }
  }

  const result: SmartReminder[] = []
  for (const [patientId, noShowAppt] of latestNoShowByPatient) {
    const latestApptDate = latestApptByPatient.get(patientId)
    if (latestApptDate && latestApptDate > noShowAppt.date) continue // already rebooked after the miss
    const p = patientMap.get(patientId)
    if (!p || !p.is_active) continue
    result.push({
      id: `no-show-${noShowAppt.id}`,
      category: 'no_show',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: `غیبت در ${noShowAppt.date} — رزرو مجدد نشده`,
      smsMessage: `${p.first_name} عزیز، در نوبت اخیرتان در کلینیک مینادنت حضور نداشتید. لطفاً برای رزرو مجدد تماس بگیرید.`,
      priority: daysSince(noShowAppt.date),
      actionPath: '/appointments',
    })
  }
  return result.sort((a, b) => b.priority - a.priority)
}

/**
 * Cheques that are bounced, due today, or overdue.
 */
export function findDueCheques(
  cheques: Cheque[],
  patients: Patient[],
  today: Date | string = new Date(),
): SmartReminder[] {
  const todayStr = toIsoDate(today)
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const result: SmartReminder[] = []

  for (const c of cheques) {
    if (c.status === 'cleared' || c.status === 'cancelled') continue
    const p = patientMap.get(c.patient_id)
    if (!p) continue

    const isBounced = c.status === 'bounced'
    const isOverdue = c.due_date < todayStr
    const isDueToday = c.due_date === todayStr

    if (!isBounced && !isOverdue && !isDueToday) continue

    const overdueDays = isOverdue ? daysSince(c.due_date) : 0
    let detail = ''
    let priority = 0

    if (isBounced) {
      detail = `چک برگشتی به مبلغ ${formatCurrency(c.amount)} ت — شماره ${c.cheque_number || 'نامشخص'}`
      priority = 200000 + Math.floor(c.amount / 10000)
    } else if (isDueToday) {
      detail = `چک سررسید امروز — ${formatCurrency(c.amount)} ت (${c.bank_name || 'بانک'})`
      priority = 110000 + Math.floor(c.amount / 10000)
    } else {
      detail = `چک ${toPersianDigits(overdueDays)} روز گذشته از موعد (معوق) — ${formatCurrency(c.amount)} ت (${c.bank_name || 'بانک'})`
      priority = 150000 + (overdueDays * 1000) + Math.floor(c.amount / 10000)
    }

    const smsMessage = isBounced
      ? `${p.first_name} عزیز، چک شماره ${c.cheque_number || ''} شما برگشت خورده است. لطفاً جهت تعیین تکلیف با کلینیک مینادنت تماس بگیرید.`
      : `${p.first_name} عزیز، چک شما به مبلغ ${formatCurrency(c.amount)} تومان سررسید شده است. کلینیک مینادنت`

    result.push({
      id: `cheque-${c.id}`,
      category: 'cheque_due',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      patientName: `${p.first_name} ${p.last_name}`,
      detail,
      actionNeeded: detail,
      smsMessage,
      priority,
      urgency: 'urgent',
      actionPath: '/billing',
      dueDate: c.due_date,
      extraInfo: c.bank_name ? `${c.bank_name} - چک ${c.cheque_number || ''}` : undefined,
    })
  }

  return result.sort((a, b) => b.priority - a.priority)
}

/**
 * Implant cases needing next clinical action (healing complete, OPG needed, impression, lab order, crown delivery).
 */
export function findPendingImplantStages(
  implants: ImplantCase[],
  patients: Patient[],
  today: Date | string = new Date(),
): SmartReminder[] {
  const todayStr = toIsoDate(today)
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const result: SmartReminder[] = []

  for (const im of implants) {
    if (im.is_active === false || im.success_status === 'failed') continue
    if (
      (im as any).status === 'completed' ||
      (im as any).stage === 'completed' ||
      !!(im as any).crown_delivered_at ||
      !!(im as any).crown_delivery_date
    ) {
      continue
    }
    const p = patientMap.get(im.patient_id)
    if (!p) continue

    const action = nextImplantAction(im as any, todayStr)
    if (!action) continue

    // A normal waiting period is not an urgent unblocked clinical alarm
    if (action.key === 'wait' || action.key === 'surgery') continue

    let priority = 50
    if (action.key === 'delivered') priority = 90
    else if (action.key === 'lab') priority = 80
    else if (action.key === 'impression') priority = 70
    else if (action.key === 'opg') priority = 60

    const detail = `ایمپلنت دندان ${im.tooth_number ? toPersianDigits(im.tooth_number) : ''}: ${action.label}`

    result.push({
      id: `implant-${im.id}`,
      category: 'implant_stage_due',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      patientName: `${p.first_name} ${p.last_name}`,
      detail,
      actionNeeded: detail,
      smsMessage: `${p.first_name} عزیز، موعد مرحله‌ی بعدی درمان ایمپلنت شما فرارسیده است. لطفاً جهت هماهنگی نوبت با کلینیک مینادنت تماس بگیرید.`,
      priority,
      urgency: 'urgent',
      actionPath: '/implants',
      extraInfo: im.brand ? `برند ${im.brand}` : undefined,
    })
  }

  return result.sort((a, b) => b.priority - a.priority)
}

/**
 * Lab orders that are overdue or arrived at clinic without a delivery appointment.
 */
export function findOverdueLabOrders(
  labOrders: LabOrder[],
  patients: Patient[],
  today: Date | string = new Date(),
): SmartReminder[] {
  const todayStr = toIsoDate(today)
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const result: SmartReminder[] = []

  for (const o of labOrders) {
    if (o.status === 'cancelled' || o.status === 'delivered' || (o as any).delivered) continue
    const p = patientMap.get(o.patient_id)
    if (!p) continue

    const deadline = o.deadline || (o as any).expected_delivery_date
    const receivedAt = o.received_at || (o as any).delivery_date
    const normalizedOrder = {
      ...o,
      deadline,
      received_at: receivedAt,
    }

    const days = daysUntilDue(normalizedOrder as any, todayStr)
    const isLate = days !== null && days < 0
    const arrivedNoAppt = !!receivedAt && !o.delivery_appointment_id

    if (!isLate && !arrivedNoAppt) continue

    let detail = ''
    let priority = 0

    if (isLate) {
      const lateDays = Math.abs(days!)
      detail = `تأخیر تحویل لابراتوار — ${toPersianDigits(lateDays)} روز از موعد گذشته (${o.work_type || 'پروتز'})`
      priority = 80000 + (lateDays * 1000)
    } else if (arrivedNoAppt) {
      detail = `کار لابراتوار رسیده — آماده تحویل به بیمار (نوبت تحویل ثبت نشده)`
      priority = 90000
    }

    result.push({
      id: `lab-${o.id}`,
      category: 'lab_overdue',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      patientName: `${p.first_name} ${p.last_name}`,
      detail,
      actionNeeded: detail,
      smsMessage: arrivedNoAppt
        ? `${p.first_name} عزیز، کار پروتز دندان شما به کلینیک مینادنت رسیده است. لطفاً برای تعیین وقت تحویل تماس بگیرید.`
        : '',
      priority,
      urgency: 'urgent',
      actionPath: '/laboratory',
      dueDate: deadline || undefined,
      extraInfo: o.work_type || undefined,
    })
  }

  return result.sort((a, b) => b.priority - a.priority)
}

export interface ClinicAlarmBundle {
  all: SmartReminder[]
  counts: Record<ReminderCategory, number>
  total: number
  hasUrgentFinancial: boolean
  hasUrgentClinical: boolean
  totalUrgentCount: number
  countsByCategory: Record<ReminderCategory, number>
  hasCriticalItems: boolean
}

export function getUrgentClinicAlarms(data: {
  patients: Patient[]
  cheques?: Cheque[]
  installments?: Installment[]
  labOrders?: LabOrder[]
  implantCases?: ImplantCase[]
  implants?: ImplantCase[]
  appointments?: AppointmentWithRelations[]
  treatments?: Treatment[]
  payments?: Payment[]
  encounters?: Encounter[]
  today?: Date | string
}): ClinicAlarmBundle {
  const todayObj = toDateObj(data.today)
  const todayStr = toIsoDate(data.today)
  const patients = data.patients || []

  const chequesDue = data.cheques ? findDueCheques(data.cheques, patients, todayStr) : []
  const installmentsDue = data.installments ? findDueInstallments(data.installments, patients, todayStr) : []
  const labOverdue = data.labOrders ? findOverdueLabOrders(data.labOrders, patients, todayStr) : []
  const rawImplants = data.implantCases || data.implants
  const implantDue = rawImplants ? findPendingImplantStages(rawImplants, patients, todayStr) : []
  const birthdays = findBirthdays(patients, todayObj)
  const debtors = data.treatments && data.payments ? findDebtors(patients, data.treatments, data.payments, data.implantCases) : []
  const lapsed = data.encounters ? findLapsedPatients(patients, data.encounters) : []
  const noShows = data.appointments ? findNoShows(data.appointments, patients) : []
  const unresolvedAppts = data.appointments ? findUnresolvedPastAppointments(data.appointments, patients, todayObj) : []
  const unfinishedTreatments = data.treatments && data.appointments ? findUnfinishedTreatmentFollowups(data.treatments, data.appointments, patients, todayObj) : []

  const counts: Record<ReminderCategory, number> = {
    cheque_due: chequesDue.length,
    installment_due: installmentsDue.length,
    lab_overdue: labOverdue.length,
    implant_stage_due: implantDue.length,
    birthday: birthdays.length,
    debtor: debtors.length,
    lapsed: lapsed.length,
    no_show: noShows.length,
    unresolved_appointment: unresolvedAppts.length,
    unfinished_treatment: unfinishedTreatments.length,
  }

  const all: SmartReminder[] = [
    ...chequesDue,
    ...installmentsDue,
    ...labOverdue,
    ...implantDue,
    ...noShows,
    ...debtors.slice(0, 15),
    ...unfinishedTreatments.slice(0, 15),
    ...unresolvedAppts.slice(0, 15),
    ...birthdays,
    ...lapsed.slice(0, 10),
  ].sort((a, b) => b.priority - a.priority)

  const total =
    chequesDue.length +
    installmentsDue.length +
    labOverdue.length +
    implantDue.length +
    noShows.length +
    unresolvedAppts.length

  const hasUrgentFinancial = chequesDue.length > 0 || installmentsDue.length > 0
  const hasUrgentClinical = labOverdue.length > 0 || implantDue.length > 0
  const hasCriticalItems = hasUrgentFinancial || hasUrgentClinical

  return {
    all,
    counts,
    total,
    hasUrgentFinancial,
    hasUrgentClinical,
    totalUrgentCount: total,
    countsByCategory: counts,
    hasCriticalItems,
  }
}

