/**
 * electronicPrescription.ts — Electronic Dental Prescription Standard (E-Rx)
 *
 * Implements official Iranian Ministry of Health (MOH) and Health Insurance
 * (Tamin ep.tamin.ir & Salamat eservices.ihio.gov.ir) electronic prescription standards.
 *
 * Features:
 * - Tracking code validation (کد رهگیری سامانه نسخه الکترونیک)
 * - FHIR / Iran MOH MedicationRequest JSON payload export
 * - Formatted text token generation for direct portal clipboard insertion
 * - Patient SMS notification generation with tracking code
 */

import { Prescription, Patient, Doctor } from '../types'
import { toPersianDigits, toJalaliStringPretty } from './persianDate'
import { escapeHtml } from './printDocument'

export type InsuranceSystemType = 'tamin' | 'salamat' | 'armed_forces' | 'other'

export interface InsuranceSystemMeta {
  key: InsuranceSystemType
  label: string
  portalUrl: string
  codePrefix: string
}

export const INSURANCE_SYSTEMS: Record<InsuranceSystemType, InsuranceSystemMeta> = {
  tamin: {
    key: 'tamin',
    label: 'تأمین اجتماعی (ep.tamin.ir)',
    portalUrl: 'https://ep.tamin.ir',
    codePrefix: 'TMN',
  },
  salamat: {
    key: 'salamat',
    label: 'بیمه سلامت ایران (IHIO)',
    portalUrl: 'https://eservices.ihio.gov.ir',
    codePrefix: 'SLM',
  },
  armed_forces: {
    key: 'armed_forces',
    label: 'نیروهای مسلح (ساتا)',
    portalUrl: 'https://esata.ir',
    codePrefix: 'SAT',
  },
  other: {
    key: 'other',
    label: 'سایر / نسخه آزاد',
    portalUrl: '',
    codePrefix: 'RX',
  },
}

export const INSURANCE_SYSTEM_OPTIONS: { value: InsuranceSystemType; label: string }[] = Object.values(INSURANCE_SYSTEMS).map((s) => ({
  value: s.key,
  label: s.label,
}))

export interface ParsedMedicationItem {
  drugName: string
  dosage: string
  frequency: string
  instructions: string
  quantity?: number
  durationDays?: number
  form?: string
}

/**
 * Parses raw newline-delimited prescription text into structured items.
 * Lines can be in format: "نام دارو | دوز | تکرار و دستور"
 */
export function parseMedicationsText(text: string): ParsedMedicationItem[] {
  if (!text || !text.trim()) return []

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim())
      if (parts.length >= 3) {
        return {
          drugName: parts[0],
          dosage: parts[1],
          frequency: parts[2],
          instructions: parts.slice(3).join(' - ') || parts[2],
        }
      }
      if (parts.length === 2) {
        return {
          drugName: parts[0],
          dosage: parts[1],
          frequency: 'طبق دستور پزشک',
          instructions: 'طبق دستور',
        }
      }
      return {
        drugName: line,
        dosage: '-',
        frequency: 'طبق دستور پزشک',
        instructions: 'طبق دستور',
      }
    })
}

/**
 * Validates electronic prescription tracking code.
 * Standard Iranian E-Rx tracking code is 4 to 16 alphanumeric digits.
 */
export function validateElectronicTrackingCode(code: string | null | undefined): {
  isValid: boolean
  error: string | null
} {
  if (!code || !code.trim()) {
    return { isValid: false, error: 'کد رهگیری نمی‌تواند خالی باشد.' }
  }

  const clean = code.trim().toUpperCase()
  if (clean.length < 4 || clean.length > 16) {
    return { isValid: false, error: 'کد رهگیری باید بین ۴ تا ۱۶ کاراکتر باشد.' }
  }

  // Alphanumeric with optional dashes
  if (!/^[A-Z0-9-]+$/i.test(clean)) {
    return { isValid: false, error: 'کد رهگیری فقط شامل حروف انگلیسی، اعداد و خط تیره می‌باشد.' }
  }

  return { isValid: true, error: null }
}

export interface ElectronicPrescriptionExportPayload {
  resourceType: 'MedicationRequest'
  id: string
  insuranceSystem: InsuranceSystemType
  trackingCode: string | null
  status: string
  authoredOn: string
  authoredOnJalali: string
  subject: {
    id: string
    fullName: string
    nationalId: string | null
    phone: string | null
    insuranceNumber: string | null
  }
  requester: {
    id: string | null
    name: string | null
    medicalCouncilNumber: string | null
    specialty: string
  }
  medications: ParsedMedicationItem[]
  notes: string | null
}

/**
 * Generates an HL7 FHIR / Iran MOH compatible JSON export payload.
 */
export function exportElectronicPrescriptionPayload(
  rx: Prescription,
  patient: Patient,
  doctor?: Doctor | null,
): ElectronicPrescriptionExportPayload {
  const medsText = (rx.medications as any)?.text || (typeof rx.medications === 'string' ? rx.medications : '')
  const parsedMeds = parseMedicationsText(medsText)
  const system = (rx.insurance_system as InsuranceSystemType) || 'tamin'

  return {
    resourceType: 'MedicationRequest',
    id: rx.id,
    insuranceSystem: system,
    trackingCode: rx.electronic_tracking_code || null,
    status: rx.status || 'active',
    authoredOn: rx.created_at,
    authoredOnJalali: toJalaliStringPretty(rx.created_at),
    subject: {
      id: patient.id,
      fullName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'نامشخص',
      nationalId: patient.national_id || null,
      phone: patient.phone || null,
      insuranceNumber: patient.insurance_number || null,
    },
    requester: {
      id: doctor?.id || null,
      name: doctor?.name ? `دکتر ${doctor.name}` : null,
      medicalCouncilNumber: doctor?.medical_council_number || doctor?.license_number || null,
      specialty: doctor?.specialty || 'دندانپزشک',
    },
    medications: parsedMeds,
    notes: rx.notes || null,
  }
}

/**
 * Formats a clipboard text summary for quick copy-pasting into insurer web portals (Tamin / Salamat).
 */
export function formatPrescriptionForInsurancePortal(
  rx: Prescription,
  patient: Patient,
  doctor?: Doctor | null,
): string {
  const medsText = (rx.medications as any)?.text || (typeof rx.medications === 'string' ? rx.medications : '')
  const parsedMeds = parseMedicationsText(medsText)
  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
  const systemMeta = INSURANCE_SYSTEMS[(rx.insurance_system as InsuranceSystemType) || 'tamin']

  const lines: string[] = [
    `=== نسخه الکترونیک دندانپزشکی (${systemMeta.label}) ===`,
    `کد رهگیری: ${rx.electronic_tracking_code || 'ثبت‌نشده'}`,
    `نام بیمار: ${patientName} | کد ملی: ${patient.national_id || '-'}`,
    `شماره بیمه: ${patient.insurance_number || '-'}`,
    `پزشک معالج: ${doctor?.name ? `دکتر ${doctor.name}` : '-'} | نظام‌پزشکی: ${doctor?.medical_council_number || doctor?.license_number || '-'}`,
    `تاریخ: ${toJalaliStringPretty(rx.created_at)}`,
    '--- اقلام دارویی ---',
  ]

  parsedMeds.forEach((m, idx) => {
    lines.push(`${idx + 1}. ${m.drugName} | ${m.dosage} | ${m.frequency}`)
  })

  if (rx.notes) {
    lines.push(`توضیحات: ${rx.notes}`)
  }

  return lines.join('\n')
}

/**
 * Formats an official SMS text message with tracking code to send to the patient.
 */
export function formatPrescriptionPatientSms(
  rx: Prescription,
  patient: Patient,
  clinicName = 'کلینیک دندانپزشکی مینا',
): string {
  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'مراجع گرامی'
  const trackingCode = rx.electronic_tracking_code ? toPersianDigits(rx.electronic_tracking_code) : '-'
  const systemMeta = INSURANCE_SYSTEMS[(rx.insurance_system as InsuranceSystemType) || 'tamin']

  return `${patientName} عزیز،
نسخه دارویی شما در سامانه ${systemMeta.label} با موفقیت ثبت شد.
کد رهگیری نسخه: ${trackingCode}
با ارائه این کد رهگیری و کارت ملی به کلیه داروخانه‌ها، می‌توانید داروی خود را دریافت نمایید.
${clinicName}`
}

/**
 * Generates an HTML badge string representing electronic tracking status.
 */
export function renderElectronicTrackingBadgeHtml(rx: Prescription): string {
  if (!rx.electronic_tracking_code) {
    return ''
  }

  const systemMeta = INSURANCE_SYSTEMS[(rx.insurance_system as InsuranceSystemType) || 'tamin']
  const code = escapeHtml(toPersianDigits(rx.electronic_tracking_code))

  return `
    <div style="display: inline-flex; align-items: center; gap: 6px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 4px 10px; font-size: 11px; color: #065f46; font-weight: bold;">
      <span>کد رهگیری نسخه الکترونیک (${escapeHtml(systemMeta.label)}):</span>
      <span style="font-family: monospace; font-size: 13px; letter-spacing: 1px; color: #047857;">${code}</span>
    </div>
  `
}
