import type { Patient, Encounter, Payment, Installment } from '../types'

export type ReminderCategory = 'birthday' | 'debtor' | 'lapsed' | 'installment_due'

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
  encounters: Encounter[],
  minBalance = 500000,
): SmartReminder[] {
  const balanceByPatient = new Map<string, number>()
  for (const e of encounters) {
    const owed = Math.max(0, (e.total_amount ?? 0) - (e.paid_amount ?? 0))
    if (owed > 0) balanceByPatient.set(e.patient_id, (balanceByPatient.get(e.patient_id) ?? 0) + owed)
  }
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const result: SmartReminder[] = []
  for (const [patientId, balance] of balanceByPatient) {
    if (balance < minBalance) continue
    const p = patientMap.get(patientId)
    if (!p || !p.is_active) continue
    result.push({
      category: 'debtor',
      patient: p,
      title: `${p.first_name} ${p.last_name}`,
      detail: `${balance.toLocaleString('fa-IR')} تومان بدهی`,
      smsMessage: `${p.first_name} عزیز، مانده حساب شما نزد کلینیک مینادنت ${balance.toLocaleString('fa-IR')} تومان است. لطفاً برای تسویه اقدام فرمایید.`,
      priority: balance,
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
}
