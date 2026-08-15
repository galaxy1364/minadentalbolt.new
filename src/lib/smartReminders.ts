import type { Patient, Encounter, Payment, Installment, AppointmentWithRelations, Treatment } from '../types'
import { toPersianDigits } from './persianDate'
import { calcAllPatientBalances } from './finance'

export type ReminderCategory = 'birthday' | 'debtor' | 'lapsed' | 'installment_due' | 'no_show' | 'unfinished_treatment'

export interface SmartReminder {
  category: ReminderCategory
  patient: Patient
  title: string
  detail: string
  smsMessage: string
  priority: number // higher = more urgent, for sorting within a category
}

const MS_PER_DAY = 86400000

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY)
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
  minBalance = 500000,
): SmartReminder[] {
  const { byPatient } = calcAllPatientBalances(payments, treatments)
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
  today = new Date(),
): SmartReminder[] {
  const todayStr = today.toISOString().slice(0, 10)
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const result: SmartReminder[] = []
  for (const i of installments) {
    if (i.status === 'paid' || i.due_date > todayStr) continue
    const p = patientMap.get(i.patient_id)
    if (!p) continue
    const overdueDays = daysSince(i.due_date)
    result.push({
      category: 'installment_due',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: overdueDays > 0 ? `قسط ${overdueDays} روز عقب افتاده — ${i.amount.toLocaleString('fa-IR')} ت` : `قسط امروز — ${i.amount.toLocaleString('fa-IR')} ت`,
      smsMessage: `${p.first_name} عزیز، قسط ${i.amount.toLocaleString('fa-IR')} تومانی شما نزد کلینیک مینادنت سررسید شده است.`,
      priority: overdueDays,
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
      category: 'no_show',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: `غیبت در ${noShowAppt.date} — رزرو مجدد نشده`,
      smsMessage: `${p.first_name} عزیز، در نوبت اخیرتان در کلینیک مینادنت حضور نداشتید. لطفاً برای رزرو مجدد تماس بگیرید.`,
      priority: daysSince(noShowAppt.date),
    })
  }
  return result.sort((a, b) => b.priority - a.priority)
}
