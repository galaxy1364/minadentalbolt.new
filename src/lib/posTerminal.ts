// posTerminal.ts — POS Card Terminal Banking Integration, Shaparak RRN Validation & Reconciliation
import { Payment, Patient } from '../types'
import { toEnglishDigits, toPersianDigits, formatCurrency, toJalaliStringPretty } from './persianDate'

export interface PosBankInfo {
  name: string
  short: string
  code: string
}

export const POS_BANKS: Record<string, PosBankInfo> = {
  saman: { name: 'پرداخت الکترونیک سامان کیش (سپ)', short: 'سامان کیش', code: 'SEP' },
  mellat: { name: 'به‌پرداخت ملت', short: 'به‌پرداخت', code: 'BPM' },
  asan_pardakht: { name: 'آسان پرداخت (آپ)', short: 'آپ', code: 'AP' },
  sadad: { name: 'پرداخت الکترونیک سداد (بانک ملی)', short: 'سداد', code: 'SADAD' },
  pasargad: { name: 'پرداخت الکترونیک پاسارگاد (پپکو)', short: 'پاسارگاد', code: 'PEP' },
  parsian: { name: 'تجارت الکترونیک پارسیان (تاپ)', short: 'پارسیان', code: 'TOP' },
  irankish: { name: 'کارت اعتباری ایران کیش', short: 'ایران کیش', code: 'IRANKISH' },
  fanava: { name: 'فن‌آوا کارت', short: 'فن‌آوا', code: 'FANAVA' },
  other: { name: 'سایر پایانه‌های بانکی شاپرک', short: 'کارتخوان شاپرک', code: 'OTHER' },
}

/**
 * Validates a 12-digit Shaparak POS Retrieval Reference Number (RRN / کد مرجع تراکنش).
 */
export function validatePosRrn(rrn: string): { isValid: boolean; error?: string; cleanRrn: string } {
  if (!rrn) {
    return { isValid: false, error: 'شماره مرجع (RRN) نمی‌تواند خالی باشد', cleanRrn: '' }
  }

  const clean = toEnglishDigits(rrn).replace(/[\s\-_/]/g, '').trim()

  if (!/^\d+$/.test(clean)) {
    return { isValid: false, error: 'شماره مرجع فقط باید شامل ارقام عددی باشد', cleanRrn: clean }
  }

  if (clean.length !== 12) {
    return {
      isValid: false,
      error: `شماره مرجع شاپرک باید دقیقاً ۱۲ رقم باشد (تعداد واردشده: ${toPersianDigits(clean.length)})`,
      cleanRrn: clean,
    }
  }

  return { isValid: true, cleanRrn: clean }
}

/**
 * Validates an 8-digit POS Terminal ID (شماره پایانه کارتخوان).
 */
export function validatePosTerminalId(termId: string): { isValid: boolean; error?: string; cleanTermId: string } {
  if (!termId || termId.trim() === '') {
    return { isValid: true, cleanTermId: '' }
  }

  const clean = toEnglishDigits(termId).replace(/[\s\-_/]/g, '').trim()

  if (!/^\d+$/.test(clean)) {
    return { isValid: false, error: 'شماره پایانه کارتخوان فقط باید شامل ارقام باشد', cleanTermId: clean }
  }

  if (clean.length !== 8) {
    return {
      isValid: false,
      error: `شماره پایانه پوز معمولاً ۸ رقم است (تعداد واردشده: ${toPersianDigits(clean.length)})`,
      cleanTermId: clean,
    }
  }

  return { isValid: true, cleanTermId: clean }
}

/**
 * Validates the last 4 digits of the payer card (۴ رقم آخر کارت).
 */
export function validateCardLast4(card: string): { isValid: boolean; error?: string; cleanCard: string } {
  if (!card || card.trim() === '') {
    return { isValid: true, cleanCard: '' }
  }

  const clean = toEnglishDigits(card).replace(/[\s\-_*]/g, '').trim()

  if (!/^\d+$/.test(clean)) {
    return { isValid: false, error: 'چهار رقم آخر کارت باید فقط عدد باشد', cleanCard: clean }
  }

  if (clean.length !== 4) {
    return {
      isValid: false,
      error: `دقیقاً ۴ رقم آخر کارت را وارد نمایید (تعداد: ${toPersianDigits(clean.length)})`,
      cleanCard: clean,
    }
  }

  return { isValid: true, cleanCard: clean }
}

/**
 * Detects if a POS RRN is already used in an existing active payment (Duplicate RRN Prevention).
 */
export function detectDuplicatePosRrn(
  newRrn: string,
  payments: Payment[],
  currentPaymentId?: string
): { isDuplicate: boolean; matchedPayment?: Payment } {
  const { isValid, cleanRrn } = validatePosRrn(newRrn)
  if (!isValid || !cleanRrn) {
    return { isDuplicate: false }
  }

  const match = payments.find((p) => {
    if (currentPaymentId && p.id === currentPaymentId) return false
    if (p.status === 'cancelled') return false
    if (!p.pos_rrn && !p.reference) return false

    const pRrn = toEnglishDigits(p.pos_rrn || p.reference || '').replace(/[\s\-_/]/g, '').trim()
    return pRrn === cleanRrn
  })

  return {
    isDuplicate: Boolean(match),
    matchedPayment: match,
  }
}

export interface PosTerminalSummary {
  terminalId: string
  bankKey: string
  bankName: string
  totalAmount: number
  transactionCount: number
}

export interface DailyPosReconciliation {
  date: string
  totalPosAmount: number
  totalPosCount: number
  validRrnCount: number
  missingRrnCount: number
  discrepancies: string[]
  terminals: PosTerminalSummary[]
}

/**
 * Computes daily POS card terminal reconciliation report against physical end-of-day settlement slips.
 */
export function computeDailyPosReconciliation(
  payments: Payment[],
  dateStr: string,
  terminalFilter?: string
): DailyPosReconciliation {
  const dayPayments = payments.filter((p) => {
    if (p.status === 'cancelled') return false
    if (p.payment_method !== 'card') return false
    return p.payment_date === dateStr
  })

  let totalPosAmount = 0
  let validRrnCount = 0
  let missingRrnCount = 0
  const discrepancies: string[] = []
  const terminalMap = new Map<string, PosTerminalSummary>()

  dayPayments.forEach((p) => {
    const amount = Number(p.amount) || 0
    totalPosAmount += amount

    const rrnVal = p.pos_rrn || p.reference
    if (rrnVal && validatePosRrn(rrnVal).isValid) {
      validRrnCount++
    } else {
      missingRrnCount++
      discrepancies.push(`تراکنش به مبلغ ${formatCurrency(amount)} فاقد کد مرجع ۱۲ رقمی معتبر است.`)
    }

    const termKey = p.pos_terminal_id || 'نامشخص'
    if (terminalFilter && termKey !== terminalFilter) return

    const bankKey = p.pos_bank_name || 'other'
    const bankName = POS_BANKS[bankKey]?.name || 'پایانه شاپرک'

    if (!terminalMap.has(termKey)) {
      terminalMap.set(termKey, {
        terminalId: termKey,
        bankKey,
        bankName,
        totalAmount: 0,
        transactionCount: 0,
      })
    }

    const summary = terminalMap.get(termKey)!
    summary.totalAmount += amount
    summary.transactionCount++
  })

  return {
    date: dateStr,
    totalPosAmount,
    totalPosCount: dayPayments.length,
    validRrnCount,
    missingRrnCount,
    discrepancies,
    terminals: Array.from(terminalMap.values()),
  }
}

/**
 * Generates an 80mm thermal POS transaction voucher / receipt HTML for clinical accounting.
 */
export function generatePosReceiptHtml(
  payment: Payment,
  patient: Patient,
  clinicInfo?: { name?: string; phone?: string; address?: string }
): string {
  const rrn = payment.pos_rrn || payment.reference || '—'
  const termId = payment.pos_terminal_id || '—'
  const cardMasked = payment.card_last4 ? `****-****-****-${toPersianDigits(payment.card_last4)}` : '****-****-****-****'
  const bankName = payment.pos_bank_name && POS_BANKS[payment.pos_bank_name]
    ? POS_BANKS[payment.pos_bank_name].name
    : 'شبکه الکترونیکی پرداخت کارت (شاپرک)'

  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'بیمار محترم'
  const dateFormatted = toJalaliStringPretty(payment.payment_date || new Date().toISOString())
  const amountStr = formatCurrency(payment.amount)

  return `
    <div style="direction: rtl; font-family: Tahoma, 'IRANSans', Arial, sans-serif; width: 76mm; margin: 0 auto; padding: 12px 8px; font-size: 11px; line-height: 1.5; color: #000000; background: #ffffff;">
      <!-- Clinic Header -->
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 4px 0;">${clinicInfo?.name || 'کلینیک دندانپزشکی مینادنت'}</h2>
        <div style="font-size: 10px; color: #333;">رسید رسمی تراکنش کارتخوان (POS Slip)</div>
        ${clinicInfo?.phone ? `<div style="font-size: 9px; margin-top: 2px;">تلفن: ${toPersianDigits(clinicInfo.phone)}</div>` : ''}
      </div>

      <!-- Transaction Status Banner -->
      <div style="text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 8px; padding: 4px; border: 1px solid #000; border-radius: 4px;">
        تراکنش موفق (عملیات خرید)
      </div>

      <!-- Banking Meta -->
      <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px;">
        <tr>
          <td style="padding: 2px 0;">پذیرنده / پایانه:</td>
          <td style="text-align: left; font-family: monospace; font-weight: bold;">${toPersianDigits(termId)}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">شماره مرجع (RRN):</td>
          <td style="text-align: left; font-family: monospace; font-weight: bold;">${toPersianDigits(rrn)}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">شماره کارت:</td>
          <td style="text-align: left; font-family: monospace;" dir="ltr">${cardMasked}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">سامانه پرداخت:</td>
          <td style="text-align: left;">${bankName}</td>
        </tr>
      </table>

      <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

      <!-- Patient & Clinical Details -->
      <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px;">
        <tr>
          <td style="padding: 2px 0;">بیمار:</td>
          <td style="text-align: left; font-weight: bold;">${patientName}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">شماره پرونده:</td>
          <td style="text-align: left;">${patient.file_number ? toPersianDigits(patient.file_number) : '—'}</td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">تاریخ و زمان:</td>
          <td style="text-align: left;">${dateFormatted}</td>
        </tr>
        ${payment.notes ? `
        <tr>
          <td style="padding: 2px 0;">بابت:</td>
          <td style="text-align: left;">${payment.notes}</td>
        </tr>
        ` : ''}
      </table>

      <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

      <!-- Amount Section -->
      <div style="text-align: center; margin: 10px 0; padding: 6px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 10px; color: #555;">مبلغ تراکنش:</div>
        <div style="font-size: 16px; font-weight: 800; color: #000;">
          ${amountStr}
        </div>
      </div>

      <!-- Footer Stamp -->
      <div style="text-align: center; font-size: 9px; margin-top: 12px; color: #444;">
        <div>از اینکه کلینیک ما را انتخاب نموده‌اید سپاسگزاریم.</div>
        <div style="margin-top: 14px; border-top: 1px solid #ddd; padding-top: 4px;">
          امضا و مهر امور مالی درمانگاه
        </div>
      </div>
    </div>
  `
}
