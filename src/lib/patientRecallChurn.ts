// src/lib/patientRecallChurn.ts — Post-Op Checkups, Suture Removals, Hygiene Recalls & Patient Churn Prediction
import type { Patient, Treatment, AppointmentWithRelations, Encounter, Payment } from '../types'
import { toPersianDigits, formatCurrency } from './persianDate'
import { toothLabel } from './toothLabel'
import type { SmartReminder } from './smartReminders'

const MS_PER_DAY = 86400000

function daysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1).getTime()
  const d2 = new Date(dateStr2).getTime()
  return Math.floor((d1 - d2) / MS_PER_DAY)
}

function daysSince(dateStr: string, baseDate = new Date()): number {
  return Math.floor((baseDate.getTime() - new Date(dateStr).getTime()) / MS_PER_DAY)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Post-Operative Checkup Reminders (24 to 48 hours post surgery / extraction / endo)
// ─────────────────────────────────────────────────────────────────────────────

const SURGICAL_CATEGORIES = new Set(['surgery', 'extraction', 'implant', 'endo', 'periodontics'])

function isSurgicalOrInvasive(t: Treatment): boolean {
  if (t.procedure_category && SURGICAL_CATEGORIES.has(t.procedure_category.toLowerCase())) {
    return true
  }
  const name = (t.procedure_name || '').toLowerCase()
  return (
    name.includes('جراحی') ||
    name.includes('کشیدن') ||
    name.includes('عصب') ||
    name.includes('ایمپلنت') ||
    name.includes('پریو') ||
    name.includes('سینوس') ||
    name.includes('پیوند')
  )
}

/**
 * Identifies patients who underwent an invasive or surgical treatment 1 to 2 days ago (24-48 hours),
 * requiring a compassionate clinical follow-up call or SMS to assess pain, swelling, and bleeding.
 */
export function findPostOpCheckups(
  treatments: Treatment[],
  patients: Patient[],
  today: Date | string = new Date()
): SmartReminder[] {
  const todayObj = typeof today === 'string' ? new Date(today) : today
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const results: SmartReminder[] = []

  for (const t of treatments) {
    if (t.status !== 'completed' || !t.created_at) continue
    if (!isSurgicalOrInvasive(t)) continue

    const patient = patientMap.get(t.patient_id)
    if (!patient || !patient.is_active) continue

    const elapsedDays = daysSince(t.created_at, todayObj)
    // 24 to 48 hours window (1 to 2 days post-op)
    if (elapsedDays >= 1 && elapsedDays <= 2) {
      const toothStr = t.tooth_number ? `دندان ${toothLabel(t.tooth_number)}` : 'درمان انجام‌شده'
      const procName = t.procedure_name || 'جراحی دندانپزشکی'

      results.push({
        id: `postop-${t.id}`,
        category: 'post_op_checkup' as any,
        patient,
        patientName: `${patient.first_name} ${patient.last_name}`,
        title: `${patient.first_name} ${patient.last_name}`,
        detail: `پیگیری حال بیمار (${toPersianDigits(elapsedDays)} روز پس از ${procName} — ${toothStr})`,
        smsMessage: `سلام ${patient.first_name} عزیز، پیرو انجام ${procName} در کلینیک دندانپزشکی مینا، جویای حال شما هستیم. در صورت درد یا تورم نامتعارف فوراً با کلینیک در تماس باشید.`,
        priority: 110000 - elapsedDays * 1000,
        urgency: 'urgent',
        actionNeeded: 'تماس تلفنی یا پیامک پیگیری کنترل درد و خونریزی',
        actionPath: `/patients/${patient.id}`,
        extraInfo: procName,
      })
    }
  }

  return results.sort((a, b) => b.priority - a.priority)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Suture Removal Reminders (7 to 10 days post-surgery without booked appointment)
// ─────────────────────────────────────────────────────────────────────────────

function hasFutureAppointment(
  patientId: string,
  appointments: AppointmentWithRelations[],
  todayStr: string
): boolean {
  return appointments.some(
    (a) => a.patient_id === patientId && a.date >= todayStr && a.status !== 'cancelled'
  )
}

/**
 * Identifies patients whose surgical treatment occurred 7 to 10 days ago (suture removal window)
 * and have NO upcoming appointment scheduled in the clinic calendar.
 */
export function findSutureRemovalReminders(
  treatments: Treatment[],
  patients: Patient[],
  appointments: AppointmentWithRelations[] = [],
  today: Date | string = new Date()
): SmartReminder[] {
  const todayObj = typeof today === 'string' ? new Date(today) : today
  const todayStr = todayObj.toISOString().slice(0, 10)
  const patientMap = new Map(patients.map((p) => [p.id, p]))
  const results: SmartReminder[] = []

  for (const t of treatments) {
    if (t.status !== 'completed' || !t.created_at) continue
    const procName = (t.procedure_name || '').toLowerCase()
    const isSutureCandidate =
      (t.procedure_category && (t.procedure_category === 'surgery' || t.procedure_category === 'implant')) ||
      procName.includes('جراحی') ||
      procName.includes('ایمپلنت') ||
      procName.includes('عقل') ||
      procName.includes('سینوس') ||
      procName.includes('فلپ')

    if (!isSutureCandidate) continue

    const patient = patientMap.get(t.patient_id)
    if (!patient || !patient.is_active) continue

    const elapsedDays = daysSince(t.created_at, todayObj)
    if (elapsedDays >= 7 && elapsedDays <= 10) {
      if (hasFutureAppointment(patient.id, appointments, todayStr)) {
        continue // Already booked a follow-up appointment
      }

      const toothStr = t.tooth_number ? ` (دندان ${toothLabel(t.tooth_number)})` : ''
      results.push({
        id: `suture-${t.id}`,
        category: 'suture_removal' as any,
        patient,
        patientName: `${patient.first_name} ${patient.last_name}`,
        title: `${patient.first_name} ${patient.last_name}`,
        detail: `موعد کشیدن بخیه — ${toPersianDigits(elapsedDays)} روز از جراحی گذشته و نوبت ثبت نشده${toothStr}`,
        smsMessage: `${patient.first_name} عزیز، موعد کشیدن بخیه‌های جراحی دندان شما فرا رسیده است. لطفاً جهت تنظیم نوبت با کلینیک دندانپزشکی مینا تماس حاصل فرمایید.`,
        priority: 125000 + elapsedDays * 500,
        urgency: 'urgent',
        actionNeeded: 'تنظیم نوبت ویزیت و کشیدن بخیه',
        actionPath: `/appointments?patient_id=${patient.id}`,
        extraInfo: 'کشیدن بخیه',
      })
    }
  }

  return results.sort((a, b) => b.priority - a.priority)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Preventive Hygiene & Periodontal Recalls (6-month periodic checkup)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects active patients who have visited the clinic in the past but haven't had an
 * appointment or preventive checkup in 6 months (180 days) and have no future appointment.
 */
export function findHygieneRecalls(
  patients: Patient[],
  encounters: Encounter[],
  appointments: AppointmentWithRelations[] = [],
  recallDays = 180,
  today: Date | string = new Date()
): SmartReminder[] {
  const todayObj = typeof today === 'string' ? new Date(today) : today
  const todayStr = todayObj.toISOString().slice(0, 10)
  const patientMap = new Map(patients.map((p) => [p.id, p]))

  const lastVisitMap = new Map<string, string>()
  for (const e of encounters) {
    const prev = lastVisitMap.get(e.patient_id)
    if (!prev || e.encounter_date > prev) {
      lastVisitMap.set(e.patient_id, e.encounter_date)
    }
  }

  const results: SmartReminder[] = []

  for (const [patientId, lastVisit] of lastVisitMap) {
    const elapsed = daysSince(lastVisit, todayObj)
    if (elapsed < recallDays || elapsed > 400) continue // Between 6 months and ~13 months

    const patient = patientMap.get(patientId)
    if (!patient || !patient.is_active) continue

    if (hasFutureAppointment(patientId, appointments, todayStr)) continue

    const months = Math.floor(elapsed / 30)
    results.push({
      id: `recall-${patient.id}`,
      category: 'hygiene_recall' as any,
      patient,
      patientName: `${patient.first_name} ${patient.last_name}`,
      title: `${patient.first_name} ${patient.last_name}`,
      detail: `موعد چکاپ دوره‌ای ۶ ماهه و جرم‌گیری (${toPersianDigits(months)} ماه از آخرین ویزیت)`,
      smsMessage: `${patient.first_name} عزیز، موعد چکاپ دوره‌ای ۶ ماهه و بررسی سلامت دهان و دندان شما در کلینیک مینا فرا رسیده است. جهت تعیین وقت با ما تماس بگیرید.`,
      priority: 60000 + elapsed,
      urgency: 'medium',
      actionNeeded: 'ارسال پیامک یا تماس جهت نوبت چکاپ ۶ ماهه',
      actionPath: `/appointments?patient_id=${patient.id}`,
      extraInfo: 'چکاپ دوره‌ای ۶ ماهه',
    })
  }

  return results.sort((a, b) => b.priority - a.priority)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Patient Retention Scoring & Churn Risk Prediction
// ─────────────────────────────────────────────────────────────────────────────

export type ChurnRiskTier = 'loyal' | 'stable' | 'at_risk' | 'churned'

export interface PatientRetentionProfile {
  patientId: string
  score: number // 0 to 100
  tier: ChurnRiskTier
  tierLabel: string
  tierColor: 'success' | 'primary' | 'warning' | 'error'
  daysSinceLastVisit: number
  attendanceRate: number // 0 to 100
  abandonedTreatmentCount: number
  outstandingBalance: number
  riskFactors: string[]
  recommendedAction: string
}

export function computePatientRetentionProfile(params: {
  patient: Patient
  encounters?: Encounter[]
  appointments?: AppointmentWithRelations[]
  treatments?: Treatment[]
  payments?: Payment[]
  today?: Date | string
}): PatientRetentionProfile {
  const { patient, encounters = [], appointments = [], treatments = [], payments = [] } = params
  const todayObj = typeof params.today === 'string' ? new Date(params.today) : (params.today || new Date())

  const patientEncounters = encounters.filter((e) => e.patient_id === patient.id)
  const patientAppointments = appointments.filter((a) => a.patient_id === patient.id)
  const patientTreatments = treatments.filter((t) => t.patient_id === patient.id)
  const patientPayments = payments.filter((p) => p.patient_id === patient.id)

  // 1. Recency
  let lastVisitDate: string | null = null
  for (const e of patientEncounters) {
    if (!lastVisitDate || e.encounter_date > lastVisitDate) lastVisitDate = e.encounter_date
  }
  for (const a of patientAppointments) {
    if (a.status === 'completed' && (!lastVisitDate || a.date > lastVisitDate)) {
      lastVisitDate = a.date
    }
  }

  const daysSinceLastVisit = lastVisitDate ? daysSince(lastVisitDate, todayObj) : 999
  const riskFactors: string[] = []

  let recencyScore = 0
  if (daysSinceLastVisit <= 90) {
    recencyScore = 30 // within 3 months
  } else if (daysSinceLastVisit <= 180) {
    recencyScore = 22 // 3-6 months
  } else if (daysSinceLastVisit <= 365) {
    recencyScore = 12 // 6-12 months
    riskFactors.push('بیش از ۶ ماه از آخرین مراجعه می‌گذرد')
  } else {
    recencyScore = 0
    riskFactors.push('بیش از یک سال عدم مراجعه (ریزش احتمالی)')
  }

  // 2. Attendance reliability
  let attended = 0
  let noShows = 0
  let cancelled = 0

  for (const a of patientAppointments) {
    if (a.status === 'completed') attended++
    else if (a.status === 'no_show') noShows++
    else if (a.status === 'cancelled') cancelled++
  }

  const totalAppts = patientAppointments.length
  let attendanceRate = 100
  let attendanceScore = 30

  if (totalAppts > 0) {
    attendanceRate = Math.round((attended / totalAppts) * 100)
    if (attendanceRate >= 80) attendanceScore = 30
    else if (attendanceRate >= 60) attendanceScore = 20
    else if (attendanceRate >= 40) {
      attendanceScore = 10
      riskFactors.push('نرخ غیبت یا کنسلی بالا در نوبت‌ها')
    } else {
      attendanceScore = 0
      riskFactors.push('سابقه غیبت‌های مکرر و عدم حضور')
    }
  }

  // 3. Treatment continuity
  const abandonedTreatments = patientTreatments.filter((t) => t.status === 'in_progress' || t.status === 'planned')
  let treatmentScore = 20

  if (abandonedTreatments.length > 0 && daysSinceLastVisit > 60) {
    treatmentScore = 5
    riskFactors.push(`${toPersianDigits(abandonedTreatments.length)} درمان ناتمام بدون نوبت بعدی`)
  }

  // 4. Financial reliability
  let totalCost = 0
  for (const t of patientTreatments) {
    totalCost += t.total_price || 0
  }
  let totalPaid = 0
  for (const p of patientPayments) {
    totalPaid += p.amount || 0
  }
  const outstandingBalance = Math.max(0, totalCost - totalPaid)
  let financialScore = 20

  if (outstandingBalance > 2000000 && daysSinceLastVisit > 30) {
    financialScore = 0
    riskFactors.push(`بدهی معوق تسویه‌نشده (${formatCurrency(outstandingBalance)} تومان)`)
  } else if (outstandingBalance > 500000) {
    financialScore = 10
  }

  const totalScore = Math.min(100, Math.max(0, recencyScore + attendanceScore + treatmentScore + financialScore))

  let tier: ChurnRiskTier = 'stable'
  let tierLabel = 'عادی'
  let tierColor: 'success' | 'primary' | 'warning' | 'error' = 'primary'
  let recommendedAction = 'پیگیری طبق روال معمول کلینیک'

  if (totalScore >= 80) {
    tier = 'loyal'
    tierLabel = 'وفادار و پایدار'
    tierColor = 'success'
    recommendedAction = 'ارسال پیام تشکر و حفظ ارتباط صمیمانه'
  } else if (totalScore >= 60) {
    tier = 'stable'
    tierLabel = 'عادی و فعال'
    tierColor = 'primary'
    recommendedAction = 'اطلاع‌رسانی چکاپ‌های دوره‌ای'
  } else if (totalScore >= 40) {
    tier = 'at_risk'
    tierLabel = 'در معرض ریزش'
    tierColor = 'warning'
    recommendedAction = 'تماس تلفنی اختصاصی جهت بررسی علت تاخیر و ارائه نوبت منعطف'
  } else {
    tier = 'churned'
    tierLabel = 'ریزش‌کرده (نیازمند بازگشت)'
    tierColor = 'error'
    recommendedAction = 'اجرای کمپین بازگشت (Win-back) با پیشنهاد چکاپ رایگان یا تخفیف ویژه'
  }

  return {
    patientId: patient.id,
    score: totalScore,
    tier,
    tierLabel,
    tierColor,
    daysSinceLastVisit,
    attendanceRate,
    abandonedTreatmentCount: abandonedTreatments.length,
    outstandingBalance,
    riskFactors,
    recommendedAction,
  }
}

export interface ClinicRetentionSummary {
  totalPatients: number
  loyalCount: number
  stableCount: number
  atRiskCount: number
  churnedCount: number
  retentionRatePercent: number
  atRiskPatients: PatientRetentionProfile[]
}

/**
 * Computes clinic-wide retention metrics and returns ranked list of at-risk patients for CRM outreach.
 */
export function calculateClinicRetentionSummary(params: {
  patients: Patient[]
  encounters?: Encounter[]
  appointments?: AppointmentWithRelations[]
  treatments?: Treatment[]
  payments?: Payment[]
}): ClinicRetentionSummary {
  const activePatients = params.patients.filter((p) => p.is_active)
  const profiles: PatientRetentionProfile[] = []

  let loyal = 0
  let stable = 0
  let atRisk = 0
  let churned = 0

  for (const patient of activePatients) {
    const profile = computePatientRetentionProfile({
      patient,
      encounters: params.encounters,
      appointments: params.appointments,
      treatments: params.treatments,
      payments: params.payments,
    })

    profiles.push(profile)
    if (profile.tier === 'loyal') loyal++
    else if (profile.tier === 'stable') stable++
    else if (profile.tier === 'at_risk') atRisk++
    else churned++
  }

  const activeCount = activePatients.length
  const retentionRatePercent = activeCount > 0 ? Math.round(((loyal + stable) / activeCount) * 100) : 100

  // Filter at-risk and churned, sorted by score ascending (most critical first)
  const atRiskPatients = profiles
    .filter((p) => p.tier === 'at_risk' || p.tier === 'churned')
    .sort((a, b) => a.score - b.score)

  return {
    totalPatients: activeCount,
    loyalCount: loyal,
    stableCount: stable,
    atRiskCount: atRisk,
    churnedCount: churned,
    retentionRatePercent,
    atRiskPatients,
  }
}
